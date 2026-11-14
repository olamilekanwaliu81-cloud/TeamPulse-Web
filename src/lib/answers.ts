import { db } from "./db";
import { CI, KEYS, parseDay, type Day, type Key } from "./checkins";

export type Answer = { occ: string; key: Key; month: Day; answers: Record<string, unknown>; answeredAt: Date };

type Row = { occ: string; key: Key; month: Date | string; answers: Record<string, unknown>; answered_at: Date; user_id: string };
const monthText = (m: Date | string) => (typeof m === "string" ? m.slice(0, 10) : `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}-01`);
const toAnswer = (r: Row): Answer => ({ occ: r.occ, key: r.key, month: monthText(r.month), answers: r.answers, answeredAt: r.answered_at });

export async function answersOf(userId: string): Promise<Answer[]> {
  const rows = await db()<Row[]>`select occ, key, month::text as month, answers, answered_at, user_id from checkin_answers where user_id = ${userId} order by month desc, key`;
  return rows.map(toAnswer);
}

/** Answers of many people for the given occurrence ids. Returned as person -> set of answered occurrences. */
export async function answeredSets(teamId: string, occs: string[]): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>();
  if (!occs.length) return out;
  const rows = await db()<{ user_id: string; occ: string }[]>`select user_id, occ from checkin_answers where team_id = ${teamId} and occ in ${db()(occs)}`;
  for (const r of rows) (out.get(r.user_id) ?? out.set(r.user_id, new Set()).get(r.user_id)!).add(r.occ);
  return out;
}

export async function teamAnswers(teamId: string, key: Key, fromMonth: Day): Promise<(Answer & { userId: string })[]> {
  const rows = await db()<Row[]>`select occ, key, month::text as month, answers, answered_at, user_id from checkin_answers
    where team_id = ${teamId} and key = ${key} and month >= ${fromMonth}`;
  return rows.map((r) => ({ ...toAnswer(r), userId: r.user_id }));
}

export async function saveAnswer(userId: string, teamId: string, occ: string, key: Key, month: Day, answers: Record<string, unknown>) {
  await db()`insert into checkin_answers (user_id, team_id, occ, key, month, answers)
             values (${userId}, ${teamId}, ${occ}, ${key}, ${month}, ${db().json(answers as never)})
             on conflict (user_id, occ) do update set answers = excluded.answers, updated_at = now()`;
}

/** Money that has been reported as on its way, with the date it lands, from earn answers. */
export function dropOf(a: Answer): { amount: number; date: Day } | null {
  if (a.key !== "earn") return null;
  const drop = Number(a.answers.drop ?? 0), clears = a.answers.clears;
  return drop > 0 && typeof clears === "string" ? { amount: drop, date: clears } : null;
}

export const titleOf = (k: Key) => CI[k].title;
export const monthIndex = (m: Day) => { const { y, m: mm } = parseDay(m); return y * 12 + mm; };
export { KEYS };

const usd = (n: unknown) => (typeof n === "number" ? "$" + Math.round(n).toLocaleString("en-US") : "—");
/** One line that says what an answer was. Used on member pages. */
export function summarize(a: Answer): string {
  const x = a.answers;
  switch (a.key) {
    case "earn": return `Made ${x.earn === "none" ? "nothing yet" : usd(x.earn)} · ${x.orders ?? 0} active orders · ${x.delivered ?? 0} delivered${Number(x.drop) > 0 ? ` · ${usd(x.drop)} dropping on ${x.clears}` : ""}`;
    case "ppv": return `PPV ${x.ppv} · QPV ${x.qpv}`;
    case "plan": return `${Array.isArray(x.goals) ? (x.goals as string[][]).map((g) => `${g[0]} ${g[1]}`).join("; ") : ""}${x.signups ? ` · sign ${x.signups}` : ""} · aiming for ${x.target}`;
    case "paid": return x.paid ? "Paid the monthly responsibility" : "Has not paid the monthly responsibility";
    case "signup": return `${x.su === "yes" ? `Signed ${x.count}` : "No sign-ups"} · step-ups ${Array.isArray(x.steps) ? (x.steps as number[]).join("/") : "0/0/0/0"} · tools ${x.tools}`;
  }
}
