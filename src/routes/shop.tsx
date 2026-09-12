import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell, GemPill } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { useProfile } from "@/lib/profile";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop — spend your gems | RESET" },
      {
        name: "description",
        content:
          "Spend the gems you earned in recovery on collectable characters and badges for your profile.",
      },
      { property: "og:title", content: "Shop — spend your gems | RESET" },
      {
        property: "og:description",
        content: "Characters and badges unlocked by real progress.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Shop,
});

type Item = {
  id: string;
  name: string;
  kind: string;
  emoji: string;
  price_gems: number;
  min_level: number;
  blurb: string | null;
};

function Shop() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, loading } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const [tab, setTab] = useState<"character" | "badge">("character");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data: items } = useQuery({
    queryKey: ["shop"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_items")
        .select("*")
        .order("price_gems", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Item[];
    },
  });

  const { data: owned } = useQuery({
    queryKey: ["purchases", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select("item_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return new Set((data ?? []).map((p) => p.item_id));
    },
  });

  const buy = useMutation({
    mutationFn: async (item: Item) => {
      if (!profile) throw new Error("Profile not ready");
      if (profile.level < item.min_level) throw new Error(`Reach level ${item.min_level} first`);
      if (profile.gems < item.price_gems) throw new Error("Not enough gems yet");
      const { error } = await supabase
        .from("purchases")
        .insert({ user_id: user!.id, item_id: item.id });
      if (error) throw error;
      const { error: uErr } = await supabase
        .from("profiles")
        .update({ gems: profile.gems - item.price_gems })
        .eq("user_id", user!.id);
      if (uErr) throw uErr;
    },
    onSuccess: () => {
      toast.success("Unlocked!");
      qc.invalidateQueries({ queryKey: ["purchases"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Purchase failed"),
  });

  const shown = (items ?? []).filter((i) => i.kind === tab);

  return (
    <AppShell header={<GemPill gems={profile?.gems ?? 0} name={profile?.display_name} />}>
      <h1 className="mb-3 font-hand text-4xl">Shop</h1>

      <div className="mb-5 flex gap-2">
        {(["character", "badge"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-full px-5 py-2 text-sm font-bold ${
              tab === k ? "bg-accent text-accent-foreground" : "bg-cloud text-foreground"
            }`}
          >
            {k === "character" ? "Characters" : "Badges"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {shown.map((item) => {
          const isOwned = owned?.has(item.id);
          const locked = (profile?.level ?? 1) < item.min_level;
          return (
            <div key={item.id} className="cloud-card flex flex-col p-4">
              <div className="text-center text-5xl">{item.emoji}</div>
              <p className="mt-2 text-center font-bold">{item.name}</p>
              <p className="mt-1 flex-1 text-center text-xs text-muted-foreground">{item.blurb}</p>
              <button
                disabled={isOwned || buy.isPending}
                onClick={() => buy.mutate(item)}
                className={`mt-3 rounded-md px-3 py-2 text-sm font-bold ${
                  isOwned
                    ? "bg-primary text-primary-foreground"
                    : locked
                      ? "bg-muted text-muted-foreground"
                      : "btn-glossy"
                }`}
              >
                {isOwned ? "Owned" : locked ? `Lvl ${item.min_level}` : `${item.price_gems} 💎`}
              </button>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
