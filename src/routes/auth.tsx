import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-6 fill-current" aria-hidden="true">
      <path d="M18.71 12.71c.02-2.14 1.75-3.17 1.83-3.22a3.94 3.94 0 0 0-3.1-1.68c-1.3-.14-2.56.78-3.22.78-.67 0-1.69-.76-2.79-.74a4.1 4.1 0 0 0-3.45 2.1c-1.49 2.58-.38 6.38 1.05 8.46.72 1.02 1.56 2.15 2.66 2.11 1.08-.04 1.48-.68 2.78-.68 1.29 0 1.67.68 2.8.65 1.16-.02 1.89-1.02 2.58-2.05a8.4 8.4 0 0 0 1.18-2.42 3.7 3.7 0 0 1-2.32-3.31ZM16.59 6.43a3.78 3.78 0 0 0 .87-2.71 3.85 3.85 0 0 0-2.5 1.29 3.61 3.61 0 0 0-.9 2.61 3.2 3.2 0 0 0 2.53-1.19Z" />
    </svg>
  );
}

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
  const [awaitingVerification, setAwaitingVerification] = useState(false);

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
          setAwaitingVerification(true);
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

  async function resendVerification() {
    if (!email) {
      toast.error("Enter your email address first.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      toast.success("Verification email resent. Check spam or junk too.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not resend the verification email");
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

  async function apple() {
    const result = await lovable.auth.signInWithOAuth("apple", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Apple sign-in failed. Try email instead.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
  }

  return (
    <div className="page-enter mx-auto flex min-h-screen max-w-md flex-col px-6 pt-16 pb-10">
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

        <Button onClick={apple} className="h-14 w-full rounded-full bg-foreground text-lg font-semibold text-background shadow-[var(--shadow-float)] hover:bg-foreground/90">
          <AppleMark />
          Sign in with Apple
        </Button>

        {awaitingVerification ? (
          <div className="cloud-card space-y-3 p-5 text-center">
            <p className="font-hand text-3xl">Check your inbox</p>
            <p className="text-sm text-muted-foreground">We sent a verification link to {email}. Check spam or junk if it is missing.</p>
            <Button className="btn-glossy w-full" disabled={busy} onClick={resendVerification}>
              {busy ? "Sending…" : "Resend verification email"}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setAwaitingVerification(false)}>
              Use another email
            </Button>
          </div>
        ) : mode === "none" ? (
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
