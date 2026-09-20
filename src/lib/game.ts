export const XP_PER_LEVEL = 100;

export function levelFromXp(xp: number) {
  return Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);
}

export function xpIntoLevel(xp: number) {
  return xp % XP_PER_LEVEL;
}

export function levelProgress(xp: number) {
  return Math.min(100, Math.round((xpIntoLevel(xp) / XP_PER_LEVEL) * 100));
}

export const ADDICTIONS = [
  { value: "smoking", label: "Smoking / Vaping", emoji: "🚬" },
  { value: "alcohol", label: "Alcohol", emoji: "🍺" },
  { value: "binge_eating", label: "Binge eating", emoji: "🍩" },
  { value: "sexual", label: "Sexual / pornography", emoji: "💔" },
  { value: "gaming", label: "Gaming / screens", emoji: "🎮" },
  { value: "other", label: "Something else", emoji: "🌀" },
] as const;

export const FREQUENCIES = [
  "A few times a month",
  "Weekly",
  "A few times a week",
  "Daily",
  "Many times a day",
];

export const DURATIONS = [
  "Less than 6 months",
  "6–12 months",
  "1–3 years",
  "3–10 years",
  "More than 10 years",
];

export function toIcsDataUrl(title: string, description: string, start: Date, minutes = 30) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const end = new Date(start.getTime() + minutes * 60000);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//RESET//EN",
    "BEGIN:VEVENT",
    `UID:${crypto.randomUUID()}`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${title.replace(/\n/g, " ")}`,
    `DESCRIPTION:${(description || "").replace(/\n/g, " ")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);
}

export function googleCalendarUrl(
  title: string,
  description: string,
  start: Date,
  minutes = 30,
) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const end = new Date(start.getTime() + minutes * 60000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    details: description || "",
    dates: `${fmt(start)}/${fmt(end)}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function levelReward(level: number) {
  const milestone = level % 10 === 0;
  const gems = 40 + level * 12 + (milestone ? level * 8 : 0);
  const badgeNames = ["Clarity Crest", "Momentum Medal", "Resolve Emblem", "Streak Star", "Victory Sigil", "Reset Legend"];
  const badgeEmojis = ["🔷", "🏅", "💠", "⭐", "🏆", "💎"];
  const characterNames = ["Nova Scout", "Pulse Ranger", "Sky Sentinel", "Comet Keeper", "Aurora Guardian", "Zenith Voyager"];
  const characterEmojis = ["🧑‍🚀", "🦸", "🪽", "☄️", "🛡️", "🌠"];
  if (milestone) {
    const index = (level / 10 - 1) % badgeNames.length;
    return { gems, kind: "badge" as const, name: `${badgeNames[index]} ${level}`, emoji: badgeEmojis[index] };
  }
  if (level % 5 === 0) {
    const index = (level / 5 - 1) % characterNames.length;
    return { gems, kind: "character" as const, name: `${characterNames[index]} ${level}`, emoji: characterEmojis[index] };
  }
  return { gems, kind: null, name: null, emoji: null };
}

export function levelWindow(currentLevel: number, count = 8) {
  const start = Math.max(1, currentLevel - 2);
  return Array.from({ length: count }, (_, index) => start + index);
}

export type ItemRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export const RARITY_LABELS: Record<ItemRarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

const RARITY_WEIGHTS: Record<ItemRarity, number> = {
  common: 10,
  uncommon: 6,
  rare: 3,
  epic: 1.2,
  legendary: 0.35,
};

function seededUnit(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) + 1) / 4294967297;
}

export function dailyShopItems<T extends { id: string; kind: string; rarity: string }>(items: T[], date: string, perKind = 3) {
  const score = (item: T) => {
    const rarity = item.rarity in RARITY_WEIGHTS ? item.rarity as ItemRarity : "common";
    return -Math.log(seededUnit(`${date}:${item.id}`)) / RARITY_WEIGHTS[rarity];
  };
  return ["character", "badge"].flatMap((kind) =>
    items.filter((item) => item.kind === kind).sort((a, b) => score(a) - score(b)).slice(0, perKind),
  );
}
