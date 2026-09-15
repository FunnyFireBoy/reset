import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PlanInput = z.object({
  addictionType: z.string().min(1),
  triggers: z.string().min(1),
  yearsAddicted: z.string().min(1),
  frequency: z.string().min(1),
  localDate: z.string().date(),
});

const DailyPlanInput = z.object({
  localDate: z.string().date(),
  timezoneOffsetMinutes: z.number().int().min(-840).max(840),
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

function safeItems(items: PlanItem[], userId: string, questDate: string, limit = 8) {
  return items.slice(0, limit).map((item) => ({
    user_id: userId,
    quest_date: questDate,
    title: String(item.title).slice(0, 120),
    description: String(item.description ?? "").slice(0, 400),
    kind: item.kind === "goal" ? "goal" : "activity",
    xp_reward: Math.max(5, Math.min(80, Number(item.xp_reward) || 15)),
    gem_reward: Math.max(10, Math.min(400, Number(item.gem_reward) || 50)),
  }));
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

    const items = safeItems(parsed.items ?? [], context.userId, data.localDate);

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

export const ensureDailyQuests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => DailyPlanInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("daily_quest_batches")
      .select("status")
      .eq("user_id", context.userId)
      .eq("quest_date", data.localDate)
      .maybeSingle();
    if (existing) return { status: existing.status, created: false };

    const { error: claimError } = await context.supabase.from("daily_quest_batches").insert({
      user_id: context.userId,
      quest_date: data.localDate,
      status: "generating",
    });
    if (claimError) {
      if (claimError.code === "23505") return { status: "generating", created: false };
      throw new Error(claimError.message);
    }

    try {
      const apiKey = process.env["LOVABLE_API_KEY"];
      if (!apiKey) throw new Error("AI is not configured yet.");
      const { data: profile, error: profileError } = await context.supabase
        .from("profiles")
        .select("addiction_type, triggers, years_addicted, frequency, onboarded")
        .eq("user_id", context.userId)
        .single();
      if (profileError) throw new Error(profileError.message);
      if (!profile.onboarded) return { status: "needs_onboarding", created: false };

      const raw = await callGateway(
        [
          `Today is ${data.localDate} (UTC offset ${data.timezoneOffsetMinutes} minutes).`,
          `Addiction: ${profile.addiction_type ?? "not specified"}`,
          `Triggers: ${profile.triggers ?? "not specified"}`,
          `Addicted for: ${profile.years_addicted ?? "not specified"}`,
          `Frequency: ${profile.frequency ?? "not specified"}`,
          "Create a fresh set for today. Do not rely on yesterday's progress. Return the plan as json.",
        ].join("\n"),
        apiKey,
      );
      const parsed = JSON.parse(raw) as { items?: PlanItem[] };
      const items = safeItems(parsed.items ?? [], context.userId, data.localDate, 8);
      if (items.length === 0) throw new Error("No daily quests were generated.");
      const { error: insertError } = await context.supabase.from("goals").insert(items);
      if (insertError) throw new Error(insertError.message);
      const { error: readyError } = await context.supabase
        .from("daily_quest_batches")
        .update({ status: "ready", updated_at: new Date().toISOString() })
        .eq("user_id", context.userId)
        .eq("quest_date", data.localDate);
      if (readyError) throw new Error(readyError.message);
      return { status: "ready", created: true };
    } catch (error) {
      await context.supabase
        .from("daily_quest_batches")
        .delete()
        .eq("user_id", context.userId)
        .eq("quest_date", data.localDate);
      throw error;
    }
  });
