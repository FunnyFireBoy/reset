import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, LoaderCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { generatePlan } from "@/lib/plan.functions";
import { useAuth } from "@/lib/useAuth";
import { ADDICTIONS, DURATIONS, FREQUENCIES } from "@/lib/game";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Build your quit plan — RESET" },
      {
        name: "description",
        content:
          "Tell RESET your triggers, how long you've been addicted and how often, and get a tailored plan of goals and activities.",
      },
      { property: "og:title", content: "Build your quit plan — RESET" },
      {
        property: "og:description",
        content: "A tailored, gamified recovery plan built from your own triggers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const run = useServerFn(generatePlan);
  const [step, setStep] = useState(0);
  const [addictionType, setAddictionType] = useState("");
  const [yearsAddicted, setYears] = useState("");
  const [frequency, setFrequency] = useState("");
  const [triggers, setTriggers] = useState("");
  const [busy, setBusy] = useState(false);
  const [planReady, setPlanReady] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  async function finish() {
    setBusy(true);
    try {
      await run({ data: { addictionType, triggers, yearsAddicted, frequency } });
      setPlanReady(true);
      await new Promise((resolve) => window.setTimeout(resolve, 900));
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not build your plan");
    } finally {
      setBusy(false);
    }
  }

  const steps = [
    {
      q: "What are you resetting?",
      body: (
        <div className="grid grid-cols-2 gap-3">
          {ADDICTIONS.map((a) => (
            <button
              key={a.value}
              onClick={() => {
                setAddictionType(a.label);
                setStep(1);
              }}
              className={`cloud-card p-4 text-left ${
                addictionType === a.label ? "ring-4 ring-accent" : ""
              }`}
            >
              <div className="text-3xl">{a.emoji}</div>
              <div className="mt-1 text-sm font-bold">{a.label}</div>
            </button>
          ))}
        </div>
      ),
    },
    {
      q: "How long has it been part of your life?",
      body: (
        <div className="space-y-3">
          {DURATIONS.map((d) => (
            <button
              key={d}
              onClick={() => {
                setYears(d);
                setStep(2);
              }}
              className={`cloud-card w-full p-4 text-left font-bold ${
                yearsAddicted === d ? "ring-4 ring-accent" : ""
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      ),
    },
    {
      q: "How often does it happen?",
      body: (
        <div className="space-y-3">
          {FREQUENCIES.map((f) => (
            <button
              key={f}
              onClick={() => {
                setFrequency(f);
                setStep(3);
              }}
              className={`cloud-card w-full p-4 text-left font-bold ${
                frequency === f ? "ring-4 ring-accent" : ""
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      ),
    },
    {
      q: "What sets it off?",
      body: (
        <div className="space-y-4">
          <Textarea
            rows={6}
            placeholder="Stress after work, drinking with friends, boredom at night, scrolling in bed…"
            value={triggers}
            onChange={(e) => setTriggers(e.target.value)}
            className="bg-cloud"
          />
          <button
            disabled={busy || triggers.trim().length < 3}
            onClick={finish}
            className="btn-glossy w-full py-3 font-hand text-2xl disabled:opacity-60"
          >
            {busy ? "Building your plan…" : "Build my plan"}
          </button>
        </div>
      ),
    },
  ];

  const current = steps[Math.min(step, steps.length - 1)];

  if (busy) {
    return (
      <main className="mx-auto grid min-h-screen max-w-md place-items-center px-8 text-center">
        <div aria-live="polite">
          <div className="mx-auto grid size-24 place-items-center rounded-full bg-cloud shadow-[var(--shadow-float)]">
            {planReady ? (
              <CheckCircle2 className="size-12 text-primary" />
            ) : (
              <LoaderCircle className="size-12 animate-spin text-accent" />
            )}
          </div>
          <Sparkles className="mx-auto mt-7 size-6 animate-pulse text-xp" />
          <h1 className="mt-3 font-hand text-4xl">
            {planReady ? "Your plan is ready!" : "Building your recovery path…"}
          </h1>
          <p className="mt-3 text-sm font-bold text-muted-foreground">
            {planReady
              ? "Your first quests are waiting."
              : "Your answers are being shaped into small, achievable goals made for you."}
          </p>
          {!planReady ? (
            <div className="mx-auto mt-6 h-2 w-48 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-accent" />
            </div>
          ) : null}
        </div>
      </main>
    );
  }

  if (!current) return null;

  return (
    <div className="mx-auto min-h-screen max-w-md px-5 pt-10 pb-16">
      <p className="font-hand text-xl text-foreground/70">Step {step + 1} of 4</p>
      <h1 className="mb-6 font-hand text-4xl leading-tight">{current.q}</h1>
      {current.body}
      {step > 0 && (
        <button
          onClick={() => setStep(step - 1)}
          className="mt-6 w-full text-sm text-muted-foreground underline"
        >
          Back
        </button>
      )}
    </div>
  );
}
