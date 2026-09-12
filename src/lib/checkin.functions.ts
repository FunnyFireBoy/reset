import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const checkinInput = z.object({
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezoneOffsetMinutes: z.number().int().min(-840).max(840),
  stayedAddictionFree: z.boolean(),
});

export type CheckinResult = {
  already_checked_in: boolean;
  streak: number;
  xp_awarded: number;
  message: string;
  stayed_addiction_free: boolean;
};

function isCheckinResult(value: unknown): value is CheckinResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  return (
    typeof result.already_checked_in === "boolean" &&
    typeof result.streak === "number" &&
    typeof result.xp_awarded === "number" &&
    typeof result.message === "string" &&
    typeof result.stayed_addiction_free === "boolean"
  );
}

export const recordDailyCheckin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => checkinInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("record_daily_checkin", {
      _user_id: context.userId,
      _checkin_date: data.localDate,
      _timezone_offset_minutes: data.timezoneOffsetMinutes,
      _stayed_addiction_free: data.stayedAddictionFree,
    });

    if (error) throw new Error("Your check-in could not be saved. Please try again.");
    if (!isCheckinResult(result)) throw new Error("Your check-in returned an unexpected result.");
    return result;
  });