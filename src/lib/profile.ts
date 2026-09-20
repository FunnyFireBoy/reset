import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  user_id: string;
  display_name: string;
  gems: number;
  xp: number;
  level: number;
  addiction_type: string | null;
  triggers: string | null;
  years_addicted: string | null;
  frequency: string | null;
  onboarded: boolean;
  active_character: string | null;
};

export type Goal = {
  id: string;
  title: string;
  description: string | null;
  kind: string;
  xp_reward: number;
  gem_reward: number;
  completed: boolean;
  completed_at: string | null;
  scheduled_at: string | null;
  quest_date: string | null;
};

export type DailyCheckin = {
  checkin_date: string;
  stayed_addiction_free: boolean;
  streak_after: number;
  xp_awarded: number;
  message: string;
};

export type RecoveryEvent = {
  id: string;
  event_type: "quit" | "relapse";
  event_date: string;
  note: string | null;
  created_at: string;
};

export function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function useLatestCheckin(userId?: string) {
  return useQuery({
    queryKey: ["daily-checkin", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return null;
      const { error: rewardError } = await supabase.rpc("claim_level_rewards");
      if (rewardError) throw rewardError;
      const { data, error } = await supabase
        .from("daily_checkins")
        .select("checkin_date, stayed_addiction_free, streak_after, xp_awarded, message")
        .eq("user_id", userId)
        .order("checkin_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as DailyCheckin | null;
    },
  });
}

export function useRecoveryEvents(userId?: string) {
  return useQuery({
    queryKey: ["recovery-events", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("recovery_events")
        .select("id, event_type, event_date, note, created_at")
        .eq("user_id", userId)
        .order("event_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RecoveryEvent[];
    },
  });
}

export function useProfile(userId?: string) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

export function useGoals(userId?: string) {
  const today = localDateString();
  return useQuery({
    queryKey: ["goals", userId, today],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", userId)
        .eq("quest_date", today)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Goal[];
    },
  });
}

export function useCompleteGoal(userId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (goal: Goal) => {
      if (!userId) throw new Error("Sign in to complete a goal");
      const { data, error } = await supabase.rpc("complete_goal", { _goal_id: goal.id });
      if (error) throw error;
      const result = data as { xp: number; gems: number; leveled_up: boolean; already_completed: boolean };
      return { xp: result.xp, gems: result.gems, leveledUp: result.leveled_up, alreadyCompleted: result.already_completed };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
