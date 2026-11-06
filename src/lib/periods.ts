export type Frequency = "once" | "daily" | "weekly" | "monthly" | "yearly";

const pad = (n: number) => String(n).padStart(2, "0");

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isoWeek(d: Date): { year: number; week: number } {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: t.getUTCFullYear(), week };
}

/** Key of the current period: a new key means the chore resets for a new run. */
export function periodKey(freq: Frequency, now: Date = new Date()): string {
  switch (freq) {
    case "once":
      return "once";
    case "daily":
      return isoDate(now);
    case "weekly": {
      const { year, week } = isoWeek(now);
      return `${year}-W${pad(week)}`;
    }
    case "monthly":
      return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    case "yearly":
      return String(now.getFullYear());
  }
}

export function isChoreActive(
  c: { start_date: string; end_date: string | null },
  now: Date = new Date(),
): boolean {
  const today = isoDate(now);
  return c.start_date <= today && (!c.end_date || c.end_date >= today);
}

export const isValidPin = (pin: string) => /^[0-9]{6}$/.test(pin);

export const frequencyLabel: Record<Frequency, string> = {
  once: "Enkratno",
  daily: "Dnevno",
  weekly: "Tedensko",
  monthly: "Mesečno",
  yearly: "Letno",
};
