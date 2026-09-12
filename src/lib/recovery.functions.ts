import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const localActionInput = z.object({
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezoneOffsetMinutes: z.number().int().min(-840).max(840),
});

const relapseInput = localActionInput.extend({
  note: z.string().trim().max(500).optional(),
});

export type StartRecoveryResult = {
  active: boolean;
  quit_date: string;
  days_addiction_free: number;
};

export type RelapseResult = {
  active: boolean;
  relapse_date: string;
  attempt_days: number;
  xp_removed: number;
  message: string;
};

function isStartResult(value: unknown): value is StartRecoveryResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  return typeof result["active"] === "boolean" &&
    typeof result["quit_date"] === "string" &&
    typeof result["days_addiction_free"] === "number";
}

function isRelapseResult(value: unknown): value is RelapseResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  return typeof result["active"] === "boolean" &&
    typeof result["relapse_date"] === "string" &&
    typeof result["attempt_days"] === "number" &&
    typeof result["xp_removed"] === "number" &&
    typeof result["message"] === "string";
}

export const startRecoveryAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => localActionInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("start_recovery_attempt", {
      _user_id: context.userId,
      _quit_date: data.localDate,
      _timezone_offset_minutes: data.timezoneOffsetMinutes,
    });
    if (error) throw new Error("Your quit date could not be saved. Please try again.");
    if (!isStartResult(result)) throw new Error("Your recovery start returned an unexpected result.");
    return result;
  });

export const logRecoveryRelapse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => relapseInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("log_recovery_relapse", {
      _user_id: context.userId,
      _relapse_date: data.localDate,
      _timezone_offset_minutes: data.timezoneOffsetMinutes,
      ...(data.note ? { _note: data.note } : {}),
    });
    if (error) throw new Error("Your relapse could not be logged. Please try again.");
    if (!isRelapseResult(result)) throw new Error("Your relapse log returned an unexpected result.");
    return result;
  });