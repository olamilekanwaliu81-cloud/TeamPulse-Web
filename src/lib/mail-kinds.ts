// What kind of email something is, and totals per kind. Pure: no database. Tested in mail-kinds.test.ts.

export const KINDS = ["Welcome", "Check-in reminders", "Invites", "Sign-up requests", "Password reset", "Email confirmation", "Other"] as const;
export type Kind = (typeof KINDS)[number];

export function kindOf(subject: string): Kind {
  const s = subject.toLowerCase();
  if (s.startsWith("welcome")) return "Welcome";
  if (s.startsWith("reset your teampulse")) return "Password reset";
  if (s.startsWith("confirm your email")) return "Email confirmation";
  if (s.startsWith("last day:") || s.startsWith("reminder:") || s.includes("your check-in is open") || s.includes("you planned") || /^how much (ppv|qpv) did you (do|reach)/.test(s)) return "Check-in reminders";
  if (s.includes("invites you")) return "Invites";
  if (s.includes("needs your new sign-up")) return "Sign-up requests";
  return "Other";
}

export type MailRow = { subject: string; delivered: boolean; opens: number; clicks: number };
export type Tally = { kind: Kind | "All emails"; sent: number; opened: number; clicked: number };

/** Emails sent, how many were opened at least once, and how many had their button clicked, per kind and in total. */
export function summarize(rows: MailRow[]): Tally[] {
  const by = new Map<string, Tally>();
  const all: Tally = { kind: "All emails", sent: 0, opened: 0, clicked: 0 };
  for (const r of rows) {
    if (!r.delivered) continue;
    const k = kindOf(r.subject);
    const t = by.get(k) ?? { kind: k, sent: 0, opened: 0, clicked: 0 };
    for (const x of [t, all]) { x.sent++; if (r.opens > 0 || r.clicks > 0) x.opened++; if (r.clicks > 0) x.clicked++; }
    by.set(k, t);
  }
  return [all, ...KINDS.flatMap((k) => (by.has(k) ? [by.get(k)!] : []))];
}

export const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : "—");
