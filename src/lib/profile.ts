import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { levelFromXp } from "./game";

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
};

export type DailyCheckin = {
  checkin_date: string;
  stayed_addiction_free: boolean;
  streak_after: number;
  xp_awarded: number;
  message: string;
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

export function useProfile(userId?: string) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

export function useGoals(userId?: string) {
  return useQuery({
    queryKey: ["goals", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", userId!)
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
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("xp, gems")
        .eq("user_id", userId!)
        .single();
      if (pErr) throw pErr;

      const xp = profile.xp + goal.xp_reward;
      const gems = profile.gems + goal.gem_reward;

      const { error: gErr } = await supabase
        .from("goals")
        .update({ completed: true, completed_at: new Date().toISOString() })
        .eq("id", goal.id);
      if (gErr) throw gErr;

      const { error: uErr } = await supabase
        .from("profiles")
        .update({ xp, gems, level: levelFromXp(xp) })
        .eq("user_id", userId!);
      if (uErr) throw uErr;

      return { xp, gems, leveledUp: levelFromXp(xp) > levelFromXp(profile.xp) };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
