import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, LockKeyhole, Sparkles, Trophy } from "lucide-react";
import { toast } from "sonner";
import { AppShell, GemPill } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { useProfile, useRecoveryEvents } from "@/lib/profile";
import { levelFromXp, levelProgress, levelReward, xpIntoLevel, XP_PER_LEVEL } from "@/lib/game";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cancelDailyReminder, isNative, scheduleDailyReminder } from "@/lib/native-bridge";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Your account — RESET" },
      {
        name: "description",
        content:
          "See your level, gems, collected characters and badges, update your quit profile or rebuild your plan.",
      },
      { property: "og:title", content: "Your account — RESET" },
      {
        property: "og:description",
        content: "Level, gems, collection and recovery profile in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Account,
});

function Account() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, loading } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: recoveryEvents } = useRecoveryEvents(user?.id);
  const [name, setName] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("09:00");
  const currentLevel = levelFromXp(profile?.xp ?? 0);
  const [levelStart, setLevelStart] = useState(1);
  const [selectedLevel, setSelectedLevel] = useState(1);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (profile) setName(profile.display_name);
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    const nextStart = Math.max(1, currentLevel - 2);
    setLevelStart(nextStart);
    setSelectedLevel(currentLevel);
  }, [currentLevel, profile]);

  useEffect(() => {
    setReminderEnabled(window.localStorage.getItem("reset-daily-reminder") === "on");
    setReminderTime(window.localStorage.getItem("reset-daily-reminder-time") ?? "09:00");
  }, []);

  const { data: collection } = useQuery({
    queryKey: ["collection", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("purchases")
        .select("item_id, shop_items(name, emoji, kind)")
        .eq("user_id", user.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: earnedRewards } = useQuery({
    queryKey: ["level-rewards", user?.id],
    enabled: !!user?.id && !!profile,
    queryFn: async () => {
      if (!user) return [];
      const { data: claimData, error: claimError } = await supabase.rpc("claim_level_rewards");
      if (claimError) throw claimError;
      const claim = claimData as { claimed_levels?: number; gems_awarded?: number };
      if ((claim.claimed_levels ?? 0) > 0) {
        qc.invalidateQueries({ queryKey: ["profile", user.id] });
        toast.success(`${claim.claimed_levels} level rewards collected!`, {
          description: `+${claim.gems_awarded ?? 0} gems and milestone rewards were added to your profile.`,
        });
      }
      const { data, error } = await supabase
        .from("level_reward_claims")
        .select("level, gems_awarded, reward_kind, reward_name, reward_emoji")
        .eq("user_id", user.id)
        .not("reward_kind", "is", null)
        .order("level", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function saveName() {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name.trim() || "Recruit" })
        .eq("user_id", user.id);
    if (error) {
      toast.error("Could not save your name");
      return;
    }
    qc.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Saved");
  }

  async function updateReminder(enabled: boolean, time = reminderTime) {
    if (!isNative) {
      toast.message("Daily phone reminders are available in the Android app.");
      return;
    }
    if (!enabled) {
      await cancelDailyReminder();
      setReminderEnabled(false);
      window.localStorage.setItem("reset-daily-reminder", "off");
      toast.success("Daily reminder turned off.");
      return;
    }
    const [hour, minute] = time.split(":").map(Number);
    const scheduled = await scheduleDailyReminder(hour || 9, minute || 0);
    if (!scheduled) {
      toast.error("Notification permission is needed for daily reminders.");
      return;
    }
    setReminderEnabled(true);
    window.localStorage.setItem("reset-daily-reminder", "on");
    window.localStorage.setItem("reset-daily-reminder-time", time);
    toast.success(`Daily reminder set for ${time}.`);
  }

  const xp = profile?.xp ?? 0;
  const selectedReward = levelReward(selectedLevel);
  const levels = Array.from({ length: 10 }, (_, index) => levelStart + index);
  const purchasedCollection = (collection ?? []).flatMap((entry) => {
    const item = entry.shop_items as unknown as { name: string; emoji: string; kind: string } | null;
    return item ? [{ key: entry.item_id, ...item, source: "Shop" }] : [];
  });
  const levelCollection = (earnedRewards ?? []).flatMap((reward) =>
    reward.reward_name && reward.reward_emoji && reward.reward_kind
      ? [{ key: `level-${reward.level}`, name: reward.reward_name, emoji: reward.reward_emoji, kind: reward.reward_kind, source: `Level ${reward.level}` }]
      : [],
  );
  const fullCollection = [...levelCollection, ...purchasedCollection];

  return (
    <AppShell header={<GemPill gems={profile?.gems ?? 0} name={profile?.display_name} />}>
      <h1 className="mb-4 font-hand text-4xl">Account</h1>

      <div className="cloud-card mb-5 overflow-hidden p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-xs uppercase text-muted-foreground">Progression path</p>
            <p className="font-hand text-3xl">Level {currentLevel}</p>
          </div>
          <Trophy className="reward-pulse size-8 text-xp" aria-hidden="true" />
        </div>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-muted">
          <div className="progress-charge h-full bg-accent" style={{ width: `${levelProgress(xp)}%` }} />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {xpIntoLevel(xp)}/{XP_PER_LEVEL} xp to the next level · {profile?.gems ?? 0} gems
        </p>

        <div className="mt-5 flex items-center gap-2">
          <Button
            size="icon"
            variant="secondary"
            aria-label="Earlier levels"
            onClick={() => setLevelStart((value) => Math.max(1, value - 5))}
            disabled={levelStart === 1}
          >
            <ChevronLeft />
          </Button>
          <div className="flex min-w-0 flex-1 snap-x gap-2 overflow-x-auto py-2">
            {levels.map((level) => {
              const reward = levelReward(level);
              const selected = selectedLevel === level;
              const earned = level <= currentLevel;
              return (
                <Button
                  key={level}
                  variant={selected ? "default" : "secondary"}
                  onClick={() => setSelectedLevel(level)}
                  className={`h-16 min-w-14 snap-center flex-col gap-0 font-black ${selected ? "soft-pop ring-2 ring-ring" : ""}`}
                  aria-label={`Level ${level}${earned ? ", earned" : ", locked"}`}
                >
                  <span className="text-lg">{reward.emoji ?? (earned ? "✓" : "🔒")}</span>
                  <span>LVL {level}</span>
                </Button>
              );
            })}
          </div>
          <Button
            size="icon"
            variant="secondary"
            aria-label="Later levels"
            onClick={() => setLevelStart((value) => value + 5)}
          >
            <ChevronRight />
          </Button>
        </div>

        <div className="mt-3 rounded-md border border-border bg-secondary p-3" key={selectedLevel}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-xs uppercase">Level {selectedLevel}</p>
              <p className="font-black">{selectedLevel * XP_PER_LEVEL - XP_PER_LEVEL} total XP</p>
            </div>
            {selectedLevel <= currentLevel ? <Sparkles className="size-5 text-xp" /> : <LockKeyhole className="size-5 text-muted-foreground" />}
          </div>
          <p className="mt-2 text-sm font-bold">+{selectedReward.gems} gems</p>
          {selectedReward.name ? (
            <p className="mt-1 text-sm">{selectedReward.emoji} {selectedReward.name} · {selectedReward.kind}</p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">Gem reward level</p>
          )}
          <p className="mt-2 text-xs font-bold text-muted-foreground">
            {selectedLevel <= currentLevel ? "Earned and added to your profile" : selectedLevel === currentLevel + 1 ? "Up next" : "Locked"}
          </p>
        </div>
      </div>

      <div className="cloud-card mb-5 space-y-3 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-bold">Daily recovery reminder</p>
            <p className="text-xs text-muted-foreground">A supportive prompt to check in and view fresh quests.</p>
          </div>
          <Switch checked={reminderEnabled} onCheckedChange={updateReminder} aria-label="Daily recovery reminder" />
        </div>
        <Input
          type="time"
          value={reminderTime}
          onChange={(event) => setReminderTime(event.target.value)}
          onBlur={() => reminderEnabled && updateReminder(true, reminderTime)}
          disabled={!reminderEnabled}
        />
      </div>

      <div className="cloud-card mb-5 space-y-3 p-4">
        <p className="font-bold">Display name</p>
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
          <button onClick={saveName} className="btn-glossy px-4 text-sm font-bold">
            Save
          </button>
        </div>
      </div>

      <div className="cloud-card mb-5 p-4">
        <p className="mb-2 font-bold">Your collection</p>
        {fullCollection.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {fullCollection.map((item, index) => (
              <div key={item.key} className="soft-pop rounded-md bg-secondary p-2 text-center" style={{ animationDelay: `${index * 55}ms` }}>
                <div className="text-4xl">{item.emoji}</div>
                <div className="mt-1 text-xs font-black">{item.name}</div>
                <div className="text-[10px] uppercase text-muted-foreground">{item.source}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nothing yet — earn gems from quests and visit the shop.
          </p>
        )}
        <Link to="/shop" className="btn-glossy mt-4 inline-block px-4 py-2 text-sm font-bold">
          Open shop
        </Link>
      </div>

      <div className="cloud-card mb-5 space-y-2 p-4 text-sm">
        <p className="font-bold">Your quit profile</p>
        <p>Focus: {profile?.addiction_type ?? "—"}</p>
        <p>Frequency: {profile?.frequency ?? "—"}</p>
        <p>Duration: {profile?.years_addicted ?? "—"}</p>
        <p>Triggers: {profile?.triggers ?? "—"}</p>
        <Link
          to="/onboarding"
          className="btn-glossy mt-3 inline-block px-4 py-2 text-sm font-bold"
        >
          Rebuild my plan
        </Link>
      </div>

      <div className="cloud-card mb-5 p-4">
        <p className="font-bold">Recovery history</p>
        <p className="mt-1 text-xs text-muted-foreground">Your attempts stay here so a relapse never erases your honest progress.</p>
        {recoveryEvents && recoveryEvents.length > 0 ? (
          <ol className="mt-4 space-y-3">
            {recoveryEvents.map((event) => (
              <li key={event.id} className="border-l-2 border-accent pl-3">
                <p className="text-sm font-black">{event.event_type === "quit" ? "Quit started" : "Relapse logged"}</p>
                <p className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${event.event_date}T12:00:00`))}
                </p>
                {event.note ? <p className="mt-1 text-sm">{event.note}</p> : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">No recovery attempt logged yet.</p>
        )}
      </div>

      <Link to="/help" className="cloud-card mb-5 block p-4 text-sm font-bold">
        Not working for you? Find real-world help →
      </Link>

      <button
        onClick={async () => {
          await supabase.auth.signOut();
          navigate({ to: "/auth" });
        }}
        className="w-full py-3 text-sm font-bold text-muted-foreground underline"
      >
        Sign out
      </button>
    </AppShell>
  );
}
