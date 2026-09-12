import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { ShoppingBag, LifeBuoy } from "lucide-react";
import { AppShell, GemPill } from "@/components/AppShell";
import { useAuth } from "@/lib/useAuth";
import { useGoals, useProfile } from "@/lib/profile";
import { levelFromXp, levelProgress, xpIntoLevel, XP_PER_LEVEL } from "@/lib/game";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RESET — Quit your addiction, level by level" },
      {
        name: "description",
        content:
          "RESET turns quitting into a game: an AI-built plan from your own triggers, daily quests, XP, gems, characters and badges.",
      },
      { property: "og:title", content: "RESET — Quit your addiction, level by level" },
      {
        property: "og:description",
        content: "An AI-built recovery plan, daily quests, XP and gems. Free to start.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const LEVELS = Array.from({ length: 10 }, (_, i) => i + 1);

function rewardFor(level: number) {
  return `${level * 50} gems\n${level * 15} xp`;
}

function Home() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { data: profile, isLoading } = useProfile(user?.id);
  const { data: goals } = useGoals(user?.id);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (profile && !profile.onboarded) navigate({ to: "/onboarding" });
  }, [profile, navigate]);

  const xp = profile?.xp ?? 0;
  const level = levelFromXp(xp);
  const openQuests = (goals ?? []).filter((g) => !g.completed).length;

  return (
    <AppShell header={<GemPill gems={profile?.gems ?? 0} name={profile?.display_name} />}>
      <div className="mb-4 flex items-center gap-2">
        <Link
          to="/shop"
          className="cloud-card flex items-center gap-2 px-4 py-2 text-sm font-bold"
        >
          <ShoppingBag className="size-4" /> Shop
        </Link>
        <Link
          to="/help"
          className="cloud-card flex items-center gap-2 px-4 py-2 text-sm font-bold"
        >
          <LifeBuoy className="size-4" /> Get help
        </Link>
      </div>

      <div className="cloud-card mb-6 p-4">
        <div className="flex items-baseline justify-between">
          <p className="font-hand text-3xl">Level {level}</p>
          <p className="text-sm font-bold text-muted-foreground">
            {xpIntoLevel(xp)}/{XP_PER_LEVEL} xp
          </p>
        </div>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-accent" style={{ width: `${levelProgress(xp)}%` }} />
        </div>
        <p className="mt-2 text-sm">
          {isLoading
            ? "Loading your path…"
            : openQuests > 0
              ? `${openQuests} quest${openQuests > 1 ? "s" : ""} waiting on the Quests tab.`
              : "All quests cleared. Build a fresh plan from your Account."}
        </p>
      </div>

      {/* The path: climbs upward, level 1 at the bottom */}
      <div className="relative pt-6 pb-10">
        <div className="absolute inset-y-0 left-1/2 w-2.5 -translate-x-1/2 rounded-full bg-accent" />
        <ul className="relative flex flex-col-reverse gap-24">
          {LEVELS.map((lvl) => {
            const reached = level >= lvl;
            const left = lvl % 2 === 1;
            return (
              <li key={lvl} className="relative flex items-center justify-center">
                <span
                  className={`absolute w-32 font-hand text-xl leading-tight whitespace-pre-line ${
                    left ? "right-1/2 mr-16 text-right" : "left-1/2 ml-16 text-left"
                  } ${reached ? "" : "opacity-60"}`}
                >
                  {rewardFor(lvl)}
                </span>
                <span
                  className={`grid size-24 rotate-45 place-items-center rounded-[6px] ${
                    reached ? "bg-accent" : "bg-accent/45"
                  }`}
                >
                  <span className="-rotate-45 font-hand text-2xl text-accent-foreground">
                    Lvl {lvl}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </AppShell>
  );
}
