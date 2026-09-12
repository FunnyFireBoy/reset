import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PlanInput = z.object({
  addictionType: z.string().min(1),
  triggers: z.string().min(1),
  yearsAddicted: z.string().min(1),
  frequency: z.string().min(1),
});

type PlanItem = {
  title: string;
  description: string;
  kind: "goal" | "activity";
  xp_reward: number;
  gem_reward: number;
};

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "items"],
  properties: {
    summary: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "description", "kind", "xp_reward", "gem_reward"],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          kind: { type: "string", enum: ["goal", "activity"] },
          xp_reward: { type: "integer" },
          gem_reward: { type: "integer" },
        },
      },
    },
  },
};

async function callGateway(prompt: string, apiKey: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      reasoning: { effort: "low" },
      instructions:
        "You are a compassionate, evidence-informed addiction recovery coach. " +
        "Design a tailored, gamified starter plan. Mix 4 concrete goals (milestones, e.g. '3 smoke-free evenings') " +
        "with 4 short activities (30 minutes or less, doable today) that directly counter the person's stated triggers. " +
        "Rewards: activities 10-25 xp and 25-75 gems; goals 30-60 xp and 100-300 gems. " +
        "Never shame the user. Never give medical advice or suggest abrupt withdrawal from alcohol or benzodiazepines without medical help. " +
        "Keep each title under 60 characters.",
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: "recovery_plan",
          strict: true,
          schema,
        },
      },
    }),
  });

  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    throw new Error(`AI request failed [${res.status}]: ${body}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const evt = JSON.parse(payload);
        if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
          text += evt.delta;
        } else if (evt.type === "response.completed" && evt.response?.output_text) {
          if (!text) text = evt.response.output_text;
        }
      } catch {
        /* ignore partial frames */
      }
    }
  }

  return text;
}

export const generatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => PlanInput.parse(data))
  .handler(async ({ data, context }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured yet.");

    const prompt = [
      `Addiction: ${data.addictionType}`,
      `Triggers: ${data.triggers}`,
      `Addicted for: ${data.yearsAddicted}`,
      `Frequency: ${data.frequency}`,
      "Return the plan as json.",
    ].join("\n");

    const raw = await callGateway(prompt, apiKey);
    let parsed: { summary: string; items: PlanItem[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("The coach returned an unreadable plan. Please try again.");
    }

    const items = (parsed.items ?? []).slice(0, 10).map((i) => ({
      user_id: context.userId,
      title: String(i.title).slice(0, 120),
      description: String(i.description ?? "").slice(0, 400),
      kind: i.kind === "goal" ? "goal" : "activity",
      xp_reward: Math.max(5, Math.min(80, Number(i.xp_reward) || 15)),
      gem_reward: Math.max(10, Math.min(400, Number(i.gem_reward) || 50)),
    }));

    if (items.length === 0) throw new Error("No plan was generated. Please try again.");

    await context.supabase
      .from("goals")
      .delete()
      .eq("user_id", context.userId)
      .eq("completed", false);

    const { error } = await context.supabase.from("goals").insert(items);
    if (error) throw new Error(error.message);

    const { error: pErr } = await context.supabase
      .from("profiles")
      .update({
        addiction_type: data.addictionType,
        triggers: data.triggers,
        years_addicted: data.yearsAddicted,
        frequency: data.frequency,
        onboarded: true,
      })
      .eq("user_id", context.userId);
    if (pErr) throw new Error(pErr.message);

    return { summary: parsed.summary ?? "", count: items.length };
  });
