import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Find real-world help — RESET" },
      {
        name: "description",
        content:
          "If the app isn't enough, find nearby rehab centres, addiction recovery services and therapists, plus 24/7 helplines.",
      },
      { property: "og:title", content: "Find real-world help — RESET" },
      {
        property: "og:description",
        content: "Nearby rehab, recovery services, therapists and 24/7 helplines.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Help,
});

const SEARCHES = [
  { label: "Rehab centres near me", q: "rehab centre near me" },
  { label: "Addiction recovery services", q: "addiction recovery service near me" },
  { label: "Therapists & counsellors", q: "addiction therapist near me" },
  { label: "Support groups", q: "addiction support group meeting near me" },
];

function Help() {
  const [place, setPlace] = useState("");

  return (
    <AppShell>
      <h1 className="mt-4 mb-2 font-hand text-4xl">You deserve real support</h1>
      <p className="mb-6 text-sm">
        Quests help with habits, not with everything. If cravings are winning, if you are using
        more than before, or if you feel unsafe, please reach out to a person today.
      </p>

      <div className="cloud-card mb-5 space-y-3 p-4">
        <p className="font-bold">In immediate danger?</p>
        <p className="text-sm">
          Call your local emergency number right away. Withdrawal from alcohol or sedatives can be
          dangerous — never stop abruptly without medical advice.
        </p>
      </div>

      <label className="mb-2 block text-sm font-bold">Your city or area</label>
      <input
        value={place}
        onChange={(e) => setPlace(e.target.value)}
        placeholder="e.g. Hyderabad"
        className="mb-4 w-full rounded-md border border-border bg-cloud px-3 py-2"
      />

      <div className="space-y-3">
        {SEARCHES.map((s) => (
          <a
            key={s.q}
            href={`https://www.google.com/maps/search/${encodeURIComponent(`${s.q} ${place}`)}`}
            target="_blank"
            rel="noreferrer"
            className="btn-glossy block px-4 py-3 text-center font-bold"
          >
            {s.label}
          </a>
        ))}
      </div>

      <div className="cloud-card mt-6 space-y-2 p-4 text-sm">
        <p className="font-bold">Free helplines</p>
        <p>India — Tele-MANAS mental health: 14416</p>
        <p>US — SAMHSA National Helpline: 1-800-662-4357</p>
        <p>UK — Frank drug helpline: 0300 123 6600</p>
        <p className="text-muted-foreground">
          Elsewhere, search for your national addiction helpline; most are free and confidential.
        </p>
      </div>
    </AppShell>
  );
}
