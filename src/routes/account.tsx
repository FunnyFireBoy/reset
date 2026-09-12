import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell, GemPill } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { useProfile } from "@/lib/profile";
import { levelFromXp, levelProgress, xpIntoLevel, XP_PER_LEVEL } from "@/lib/game";
import { Input } from "@/components/ui/input";

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
  const [name, setName] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (profile) setName(profile.display_name);
  }, [profile]);

  const { data: collection } = useQuery({
    queryKey: ["collection", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select("item_id, shop_items(name, emoji, kind)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function saveName() {
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name.trim() || "Recruit" })
      .eq("user_id", user!.id);
    if (error) return toast.error("Could not save your name");
    qc.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Saved");
  }

  const xp = profile?.xp ?? 0;

  return (
    <AppShell header={<GemPill gems={profile?.gems ?? 0} name={profile?.display_name} />}>
      <h1 className="mb-4 font-hand text-4xl">Account</h1>

      <div className="cloud-card mb-5 p-4">
        <p className="font-hand text-3xl">Level {levelFromXp(xp)}</p>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-accent" style={{ width: `${levelProgress(xp)}%` }} />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {xpIntoLevel(xp)}/{XP_PER_LEVEL} xp to the next level · {profile?.gems ?? 0} gems
        </p>
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
        {collection && collection.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {collection.map((c) => {
              const item = c.shop_items as unknown as { name: string; emoji: string } | null;
              return (
                <div key={c.item_id} className="w-20 text-center">
                  <div className="text-4xl">{item?.emoji}</div>
                  <div className="text-xs font-bold">{item?.name}</div>
                </div>
              );
            })}
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
