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
