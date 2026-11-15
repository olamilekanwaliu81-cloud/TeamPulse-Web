// Check-in rules. Pure: no database, no clock of its own. Tested in checkins.test.ts.
//
// Each question has a date in the calendar month (10th, 14th, 15th, 25th, 28th).
// Its answer window opens 2 days before and closes 3 days after that date.
// Days are plain "YYYY-MM-DD" text so that time zones cannot shift them.

export type Day = string;
export const KEYS = ["earn", "ppv", "plan", "signup", "paid", "ppvdone", "qpvdone"] as const;
export type Key = (typeof KEYS)[number];

export const OPEN_BEFORE = 2;
export const CLOSE_AFTER = 3;

/** `openBefore`: days before its date that the window opens (default 2). `monthEnd`: the window never runs past the last day of its own month, so a confirmation is always about the month it closes. */
export const CI: Record<Key, { d: number; day: string; title: string; subject: string; body: string; monthEnd?: boolean; openBefore?: number }> = {
  earn: { d: 10, day: "10th", title: "Earnings and orders", subject: "How much have you made this month?", body: "Tell us your earnings, your active orders, the orders delivered and accepted, and when your money drops." },
  ppv: { d: 14, day: "14th", title: "PPV and QPV", subject: "Your affirmation plan: PPV and QPV", body: "How many PPV will you finish this month? How much QPV is your team building?" },
  plan: { d: 15, day: "15th", title: "New-month plan", subject: "Your new-month plan starts today", body: 'Write what you will do next month. Every goal starts with "I will" or "I must".' },
  signup: { d: 25, day: "25th", title: "Sign-ups and step-ups", subject: "Did you sign anyone this month?", body: "Tell us about new sign-ups, step-ups in your team and any tools you bought." },
  paid: { d: 28, day: "28th", title: "Monthly responsibility", subject: "Have you paid your monthly responsibility?", body: "One tap: yes or no." },
  ppvdone: { d: 28, day: "28th", title: "Confirm your PPV", subject: "Did you do the PPV you planned?", body: "Tell us whether you did the PPV you planned this month, or how many you really did.", monthEnd: true, openBefore: 0 },
  qpvdone: { d: 28, day: "28th", title: "Confirm your QPV", subject: "Did your team reach the QPV you planned?", body: "Tell us whether you reached the QPV you planned this month, or how many you really reached.", monthEnd: true, openBefore: 0 },
};

/** The two end-of-month questions that confirm what was planned on the 14th. */
export const CONFIRM_OF = { ppvdone: "ppv", qpvdone: "qpv" } as const;
export const isConfirm = (k: Key): k is keyof typeof CONFIRM_OF => k in CONFIRM_OF;

/** The personal wording of a confirmation: it repeats the number the member planned. */
export function confirmCopy(key: keyof typeof CONFIRM_OF, planned: number | null): { subject: string; body: string } {
  const what = CONFIRM_OF[key].toUpperCase(), q = key === "qpvdone";
  const n = planned == null ? null : planned.toLocaleString("en-US");
  return n == null
    ? { subject: `How much ${what} did you ${q ? "reach" : "do"} this month?`, body: `Tell us how many ${what} you really ${q ? "reached" : "did"} this month.` }
    : { subject: q ? `Has your team reached the ${n} QPV you planned?` : `Have you done the ${n} PPV you planned?`,
        body: `On the 14th you said ${q ? `your team would reach ${n} QPV` : `you would do ${n} PPV`} this month. ${q ? "Did it" : "Have you done it"}? Tell us yes, or how many ${q ? "it really reached" : "you really did"}.` };
}

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
  const first = new Date(Date.UTC(year, month, 1, 12)); // month may be -1 or 12: Date rolls the year
  const y = first.getUTCFullYear(), m = first.getUTCMonth();
  const last = new Date(Date.UTC(y, m + 1, 0, 12)).getUTCDate(); // 28 to 31
  const date = ymd(y, m, Math.min(CI[key].d, last)); // a date past the month end becomes its last day
  const close = addDays(date, CLOSE_AFTER);
  return { key, id: `${key}@${date}`, date, open: addDays(date, -(CI[key].openBefore ?? OPEN_BEFORE)), close: CI[key].monthEnd && close > ymd(y, m, last) ? ymd(y, m, last) : close, month: ymd(y, m, 1) };
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
