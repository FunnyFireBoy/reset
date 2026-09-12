import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, GemPill } from "@/components/AppShell";
import { useAuth } from "@/lib/useAuth";
import { useCompleteGoal, useGoals, useProfile, type Goal } from "@/lib/profile";
import { googleCalendarUrl, toIcsDataUrl } from "@/lib/game";

export const Route = createFileRoute("/quests")({
  head: () => ({
    meta: [
      { title: "Quests — RESET" },
      {
        name: "description",
        content:
          "Complete today's recovery quests, earn gems and XP, and schedule focus time in your calendar.",
      },
      { property: "og:title", content: "Quests — RESET" },
      {
        property: "og:description",
        content: "Daily goals and activities built around your triggers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Quests,
});

function Scroll({
  goal,
  onComplete,
  onSchedule,
}: {
  goal: Goal;
  onComplete: () => void;
  onSchedule: () => void;
}) {
  return (
    <article className="relative">
      <div className="parchment relative mx-3 px-6 py-6">
        <div className="absolute inset-y-0 -left-3 w-6 rounded-full bg-parchment-edge" />
        <div className="absolute inset-y-0 -right-3 w-6 rounded-full bg-parchment-edge" />
        <h3 className="text-center text-lg font-black tracking-wide uppercase">{goal.title}</h3>
        {goal.description ? (
          <p className="mt-1 text-center text-sm opacity-80">{goal.description}</p>
        ) : null}
        <div className="mt-3 flex items-center justify-center gap-2 text-2xl font-black">
          {goal.gem_reward} <span>💎</span>
          <span className="text-base font-bold opacity-70">+{goal.xp_reward} xp</span>
        </div>
        <div className="mt-4 flex justify-center gap-2">
          {goal.completed ? (
            <span className="rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground">
              Completed ✓
            </span>
          ) : (
            <>
              <button
                onClick={onComplete}
                className="btn-glossy px-5 py-2 text-sm font-bold active:btn-glossy-press"
              >
                Complete
              </button>
              <button
                onClick={onSchedule}
                className="rounded-md border-2 border-parchment-edge px-4 py-2 text-sm font-bold"
              >
                Schedule
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function Quests() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: goals } = useGoals(user?.id);
  const complete = useCompleteGoal(user?.id);
  const [scheduling, setScheduling] = useState<Goal | null>(null);
  const [when, setWhen] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const open = (goals ?? []).filter((g) => !g.completed);
  const done = (goals ?? []).filter((g) => g.completed);

  return (
    <AppShell header={<GemPill gems={profile?.gems ?? 0} name={profile?.display_name} />}>
      <h1 className="mb-4 font-hand text-4xl">Quests</h1>

      {open.length === 0 && done.length === 0 ? (
        <div className="cloud-card p-6 text-center">
          <p className="font-hand text-2xl">No quests yet.</p>
          <Link to="/onboarding" className="btn-glossy mt-4 inline-block px-5 py-2 font-bold">
            Build my plan
          </Link>
        </div>
      ) : null}

      <div className="space-y-7">
        {open.map((g) => (
          <Scroll
            key={g.id}
            goal={g}
            onComplete={() =>
              complete.mutate(g, {
                onSuccess: (r) =>
                  toast.success(
                    r.leveledUp
                      ? `Level up! +${g.xp_reward} xp, +${g.gem_reward} 💎`
                      : `+${g.xp_reward} xp, +${g.gem_reward} 💎`,
                  ),
                onError: () => toast.error("Could not save that. Try again."),
              })
            }
            onSchedule={() => {
              setScheduling(g);
              setWhen("");
            }}
          />
        ))}
      </div>

      {done.length > 0 && (
        <>
          <h2 className="mt-10 mb-3 font-hand text-3xl opacity-70">Completed</h2>
          <div className="space-y-7 opacity-70">
            {done.map((g) => (
              <Scroll key={g.id} goal={g} onComplete={() => {}} onSchedule={() => {}} />
            ))}
          </div>
        </>
      )}

      {scheduling && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/40 p-4">
          <div className="cloud-card w-full max-w-md space-y-3 p-5">
            <p className="font-hand text-2xl">Focus time for “{scheduling.title}”</p>
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2"
            />
            <div className="grid grid-cols-2 gap-2">
              <a
                href={
                  when
                    ? googleCalendarUrl(
                        scheduling.title,
                        scheduling.description ?? "",
                        new Date(when),
                      )
                    : "#"
                }
                target="_blank"
                rel="noreferrer"
                className={`btn-glossy py-2 text-center text-sm font-bold ${when ? "" : "pointer-events-none opacity-50"}`}
              >
                Google Calendar
              </a>
              <a
                href={
                  when
                    ? toIcsDataUrl(scheduling.title, scheduling.description ?? "", new Date(when))
                    : "#"
                }
                download="reset-quest.ics"
                className={`rounded-md border-2 border-border bg-cloud py-2 text-center text-sm font-bold ${when ? "" : "pointer-events-none opacity-50"}`}
              >
                Apple / other
              </a>
            </div>
            <button
              onClick={() => setScheduling(null)}
              className="w-full text-sm text-muted-foreground underline"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
