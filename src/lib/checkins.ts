// Check-in rules. Pure: no database, no clock of its own. Tested in checkins.test.ts.
//
// Each question has a date in the calendar month (10th, 14th, 15th, 25th, 28th).
// Its answer window opens 2 days before and closes 3 days after that date.
// Days are plain "YYYY-MM-DD" text so that time zones cannot shift them.

export type Day = string;
export const KEYS = ["earn", "ppv", "plan", "signup", "paid"] as const;
export type Key = (typeof KEYS)[number];

export const OPEN_BEFORE = 2;
export const CLOSE_AFTER = 3;

export const CI: Record<Key, { d: number; day: string; title: string; subject: string; body: string }> = {
  earn: { d: 10, day: "10th", title: "Earnings and orders", subject: "How much have you made this month?", body: "Tell us your earnings, your active orders, the orders delivered and accepted, and when your money drops." },
  ppv: { d: 14, day: "14th", title: "PPV and QPV", subject: "Your affirmation plan: PPV and QPV", body: "How many PPV will you finish this month? How much QPV is your team building?" },
  plan: { d: 15, day: "15th", title: "New-month plan", subject: "Your new-month plan starts today", body: 'Write what you will do next month. Every goal starts with "I will" or "I must".' },
  signup: { d: 25, day: "25th", title: "Sign-ups and step-ups", subject: "Did you sign anyone this month?", body: "Tell us about new sign-ups, step-ups in your team and any tools you bought." },
  paid: { d: 28, day: "28th", title: "Monthly responsibility", subject: "Have you paid your monthly responsibility?", body: "One tap: yes or no." },
};

export const isKey = (v: unknown): v is Key => typeof v === "string" && (KEYS as readonly string[]).includes(v);

const pad = (n: number) => String(n).padStart(2, "0");
export const ymd = (y: number, m: number, d: number): Day => `${y}-${pad(m + 1)}-${pad(d)}`; // m is 0 to 11
export const parseDay = (s: Day) => ({ y: Number(s.slice(0, 4)), m: Number(s.slice(5, 7)) - 1, d: Number(s.slice(8, 10)) });

export function addDays(day: Day, n: number): Day {
  const { y, m, d } = parseDay(day);
  const t = new Date(Date.UTC(y, m, d + n, 12));
  return ymd(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
}

export type Occ = { key: Key; id: string; date: Day; open: Day; close: Day; month: Day };

export function occurrence(key: Key, year: number, month: number): Occ {
  const t = new Date(Date.UTC(year, month, CI[key].d, 12)); // month may be -1 or 12: Date rolls the year
  const date = ymd(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
  return { key, id: `${key}@${date}`, date, open: addDays(date, -OPEN_BEFORE), close: addDays(date, CLOSE_AFTER), month: ymd(t.getUTCFullYear(), t.getUTCMonth(), 1) };
}

export type State =
  | { state: "open"; occ: Occ }
  | { state: "locked"; next: Occ; last?: Occ };

/** Is this question open today? If not, when does it open, and when was the last one? */
export function stateOf(key: Key, today: Day): State {
  const { y, m } = parseDay(today);
  const list = [-1, 0, 1].map((o) => occurrence(key, y, m + o));
  const open = list.find((o) => o.open <= today && today <= o.close);
  if (open) return { state: "open", occ: open };
  return { state: "locked", next: list.find((o) => o.open > today)!, last: [...list].reverse().find((o) => o.close < today) };
}

/** The five questions of the current calendar month. */
export function monthOccs(today: Day): Occ[] {
  const { y, m } = parseDay(today);
  return KEYS.map((k) => occurrence(k, y, m));
}

/** How many of this month's questions have opened, how many are answered, and how many closed unanswered. */
export function progress(answered: Set<string>, today: Day, since?: Day) {
  // Questions that closed before the person joined do not count against them.
  const due = monthOccs(today).filter((o) => o.open <= today && (!since || o.close >= since));
  return {
    due: due.length,
    done: due.filter((o) => answered.has(o.id)).length,
    missed: due.filter((o) => o.close < today && !answered.has(o.id)).length,
  };
}

/** Every question that is open today, across the month boundary. */
export function openToday(today: Day): Occ[] {
  return KEYS.map((k) => stateOf(k, today)).flatMap((s) => (s.state === "open" ? [s.occ] : []));
}

/** The 15th is only a team label. This is the countdown line the prototype showed. */
export function teamLine(today: Day, monthName: (y: number, m: number) => string): string {
  const { y, m, d } = parseDay(today);
  const short = (mm: number) => new Date(Date.UTC(y, mm, 1)).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
  if (d < 15) { const left = 15 - d; return `Your team's ${monthName(y, m)} ends in ${left} day${left > 1 ? "s" : ""}. Team ${monthName(y, m + 1)} starts on 15 ${short(m)}.`; }
  return `Team ${monthName(y, m + 1)}, day ${d - 14}. Team ${monthName(y, m + 2)} starts on 15 ${short(m + 1)}.`;
}

export const monthLabel = (y: number, m: number) => new Date(Date.UTC(y, m, 1)).toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });
export const dmyDay = (day: Day) => { const { y, m, d } = parseDay(day); return `${d} ${new Date(Date.UTC(y, m, 1)).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })} ${y}`; };
