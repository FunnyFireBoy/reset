import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/useAuth";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in to RESET — Quit your addiction, level by level" },
      {
        name: "description",
        content:
          "Create your RESET account to get an AI-built quit plan, daily quests, XP, gems and rewards.",
      },
      { property: "og:title", content: "Sign in to RESET" },
      {
        property: "og:description",
        content: "Your gamified path out of addiction. Sign in to start your plan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"none" | "signin" | "signup">("none");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/" });
  }, [loading, session, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Check your email to confirm your account.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Try email instead.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 pt-16 pb-10">
      <h1 className="text-center font-display text-6xl font-bold text-cloud">RESET</h1>

      <div className="flex flex-1 items-center justify-center py-8">
        <svg viewBox="0 0 200 120" className="w-56" aria-hidden="true">
          <path
            d="M40 100 Q10 100 12 78 Q14 58 38 60 Q42 28 74 28 Q104 22 112 52 Q140 44 152 64 Q180 62 180 82 Q180 100 156 100 Z"
            fill="var(--cloud)"
          />
        </svg>
      </div>

      <div className="space-y-4">
        <button
          onClick={google}
          className="flex w-full items-center justify-center gap-3 rounded-full border border-border bg-cloud px-6 py-3 text-base font-bold text-foreground shadow-[var(--shadow-float)] active:translate-y-0.5"
        >
          <span className="text-xl font-black">
            <span style={{ color: "#4285F4" }}>G</span>
            <span style={{ color: "#EA4335" }}>o</span>
            <span style={{ color: "#FBBC05" }}>o</span>
            <span style={{ color: "#4285F4" }}>g</span>
            <span style={{ color: "#34A853" }}>l</span>
            <span style={{ color: "#EA4335" }}>e</span>
          </span>
          Sign in with Google
        </button>

        {mode === "none" ? (
          <>
            <button
              onClick={() => setMode("signin")}
              className="btn-glossy w-full py-3 font-hand text-2xl"
            >
              Sign in with E-mail
            </button>
            <button
              onClick={() => setMode("signup")}
              className="btn-glossy w-full py-3 font-hand text-2xl"
            >
              Sign up with E-mail
            </button>
          </>
        ) : (
          <form onSubmit={submit} className="cloud-card space-y-3 p-5">
            <p className="font-hand text-2xl">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </p>
            <Input
              type="email"
              required
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type="password"
              required
              minLength={6}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button disabled={busy} className="btn-glossy w-full py-2.5 font-hand text-2xl">
              {busy ? "One moment…" : mode === "signup" ? "Sign up" : "Sign in"}
            </button>
            <button
              type="button"
              onClick={() => setMode("none")}
              className="w-full text-sm text-muted-foreground underline"
            >
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
