import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock3, LockKeyhole, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell, GemPill } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { useProfile } from "@/lib/profile";
import { dailyShopItems, RARITY_LABELS, type ItemRarity } from "@/lib/game";

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
  rarity: ItemRarity;
};

function localShopDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function untilReset(now = new Date()) {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  const seconds = Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000));
  return `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function Shop() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, loading } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const [tab, setTab] = useState<"character" | "badge">("character");
  const [shopDate, setShopDate] = useState(() => localShopDate());
  const [resetIn, setResetIn] = useState(() => untilReset());

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const nextDate = localShopDate();
      setResetIn(untilReset());
      setShopDate(nextDate);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

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
      const { data, error } = await supabase.rpc("buy_shop_item", { _item_id: item.id });
      if (error) throw error;
      return data as { already_owned: boolean; item_name?: string };
    },
    onSuccess: (result) => {
      toast.success(result.already_owned ? "Already in your collection" : "Reward unlocked!", {
        description: result.item_name ? `${result.item_name} is now in your profile.` : undefined,
      });
      qc.invalidateQueries({ queryKey: ["purchases"] });
      qc.invalidateQueries({ queryKey: ["collection"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Purchase failed"),
  });

  const rotation = dailyShopItems(items ?? [], shopDate);
  const shown = rotation.filter((item) => item.kind === tab);

  return (
    <AppShell header={<GemPill gems={profile?.gems ?? 0} name={profile?.display_name} />}>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="font-display text-xs uppercase text-muted-foreground">Daily drop</p>
          <h1 className="font-hand text-4xl">Item Shop</h1>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border bg-cloud px-2 py-1 font-display text-xs">
          <Clock3 className="size-3" aria-hidden="true" />
          <span>{resetIn}</span>
        </div>
      </div>

      <div className="cloud-card rarity-shimmer mb-5 flex items-center gap-3 border-l-4 border-rarity-legendary p-3">
        <Sparkles className="size-5 shrink-0 text-rarity-legendary" aria-hidden="true" />
        <p className="text-sm"><span className="font-black">Fresh every day.</span> Rare rewards return, but Legendary drops do not appear often.</p>
      </div>

      <div className="mb-5 flex gap-2">
        {(["character", "badge"] as const).map((k) => (
          <Button
            key={k}
            onClick={() => setTab(k)}
            variant={tab === k ? "default" : "secondary"}
            className="h-10 flex-1 font-black"
          >
            {k === "character" ? "Characters" : "Badges"}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {shown.map((item) => {
          const isOwned = owned?.has(item.id);
          const locked = (profile?.level ?? 1) < item.min_level;
          return (
            <div
              key={item.id}
              className={`cloud-card soft-pop group flex min-h-64 flex-col border-t-4 p-4 rarity-${item.rarity}`}
              style={{ animationDelay: `${shown.indexOf(item) * 80}ms` }}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className={`rounded-sm bg-rarity-${item.rarity} px-2 py-1 text-[10px] font-black uppercase text-primary-foreground`}>
                  {RARITY_LABELS[item.rarity]}
                </span>
                {locked ? <LockKeyhole className="size-4 text-muted-foreground" aria-label="Level locked" /> : null}
              </div>
              <div className={`reward-pulse my-2 text-center text-6xl ${item.rarity === "common" ? "[animation:none]" : ""}`}>{item.emoji}</div>
              <p className="mt-2 text-center font-bold">{item.name}</p>
              <p className="mt-1 flex-1 text-center text-xs text-muted-foreground">{item.blurb}</p>
              <Button
                disabled={isOwned || locked || buy.isPending}
                onClick={() => buy.mutate(item)}
                variant={isOwned ? "secondary" : locked ? "outline" : "default"}
                className="mt-3 h-10 w-full font-black"
              >
                {isOwned ? "Owned" : locked ? `Lvl ${item.min_level}` : `${item.price_gems} 💎`}
              </Button>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
