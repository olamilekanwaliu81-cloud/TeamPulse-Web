// Plain rules, no database. Tested in rules.test.ts.

export const RANKS = [
  { name: "Distributor", qpv: 0 },
  { name: "Manager", qpv: 500 },
  { name: "Senior Manager", qpv: 1000 },
  { name: "Executive Manager", qpv: 2000 },
  { name: "Director", qpv: 4000 },
] as const;

export const rankName = (rank: number) => RANKS[Math.max(0, Math.min(RANKS.length - 1, rank))].name;

export const PASSWORD_RULE = "At least 8 characters, with a letter and a number.";
export const TOKEN_DAYS = 7;
export const MAX_TRIES = 5;
export const SESSION_DAYS = 14;

export const validNeoId = (v: string) => /^\d{3}-\d{7}$/.test(v);
export const validEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v);
export const strongPassword = (p: string) => p.length >= 8 && p.length <= 200 && /[A-Za-z]/.test(p) && /\d/.test(p);

/** People type the letter O as a zero. Accept both. */
export const normalizeTpId = (s: string) => String(s ?? "").trim().toUpperCase().replace(/\s/g, "").replace(/0W/, "OW");
export const validTpId = (v: string) => /^0\dOW\d{3}$/.test(v);

/** TeamPulse ID: a zero, the last digit of the year, OW and three digits. For example 06OW674 in 2026. */
export function makeTpId(year: number, random: () => number = Math.random) {
  const n = Math.floor(random() * 1000);
  return `0${String(year).slice(-1)}OW${String(n).padStart(3, "0")}`;
}

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

export const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86_400_000);

export const MAX_BULK = 25;

/** Email addresses typed or pasted in one box, split on spaces, commas, semicolons and new lines. Duplicates are dropped. */
export function parseEmails(raw: string): { emails: string[]; bad: string[] } {
  const seen = new Set<string>();
  const emails: string[] = [], bad: string[] = [];
  for (const part of raw.split(/[\s,;]+/)) {
    const e = part.trim().replace(/^<|>$/g, "").toLowerCase();
    if (!e || seen.has(e)) continue;
    seen.add(e);
    (validEmail(e) ? emails : bad).push(e);
  }
  return { emails, bad };
}
