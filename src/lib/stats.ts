import { db } from "./db";
import { teamAnswers } from "./answers";
import { monthOccs, parseDay, type Day } from "./checkins";
import { realToday } from "./clock";
import { MIN_PPV, effectiveSponsors, recommend, systemQpv } from "./ranks";
import type { User } from "./users";

export type Stat = {
  /** PPV and QPV that were CONFIRMED on the 28th (or a first order). Null until then: a plan is not a result. */
  ppv: number | null; qpv: number | null;
  /** What they said on the 14th they would do. Shown as "planned" until confirmed. */
  ppvPlan: number | null; qpvPlan: number | null; sysQpv: number; earn: number | "none" | null; paid: boolean | null;
  /** Who their team counts under this month: their own sponsor, or the nearest upline who qualified. */
  effSponsor: string | null;
  /** True when they did not qualify this month, so the people they sponsored count under their upline. */
  compressed: boolean;
};

/** This month's numbers for everyone: what they reported, and the QPV worked out from the team tree. */
export async function monthStats(teamId: string, people: User[], today: Day): Promise<Map<string, Stat>> {
  const month = monthOccs(today)[0].month;
  const [ppvA, earnA, paidA, ppvD, qpvD] = await Promise.all((["ppv", "earn", "paid", "ppvdone", "qpvdone"] as const).map((k) => teamAnswers(teamId, k, month)));
  const mine = <T extends { month: Day; userId: string }>(rows: T[]) => new Map(rows.filter((r) => r.month === month).map((r) => [r.userId, r]));
  const P = mine(ppvA), E = mine(earnA), D = mine(paidA), PD = mine(ppvD), QD = mine(qpvD);
  const { y, m } = parseDay(today);

  const ppv = new Map<string, number>();
  const out = new Map<string, Stat>();
  for (const u of people) {
    const a = P.get(u.id)?.answers; // the plan from the 14th
    const pd = PD.get(u.id)?.answers.actual, qd = QD.get(u.id)?.answers.actual; // what they confirmed they really did
    let own: number | null = typeof pd === "number" ? pd : null;
    const j = parseDay(realToday(u.joinedAt));
    if (own == null && j.y === y && j.m === m && u.firstPv != null) own = u.firstPv; // joined this month: the first order counts
    if (own != null) ppv.set(u.id, own);
    out.set(u.id, { ppv: own, qpv: typeof qd === "number" ? qd : null, ppvPlan: typeof a?.ppv === "number" ? a.ppv : null, qpvPlan: typeof a?.qpv === "number" ? a.qpv : null, sysQpv: 0, earn: (E.get(u.id)?.answers.earn as Stat["earn"]) ?? null, paid: typeof D.get(u.id)?.answers.paid === "boolean" ? (D.get(u.id)!.answers.paid as boolean) : null, effSponsor: u.sponsorId, compressed: false });
  }
  // Not qualified this month: inactive, or under 100 PPV. Confirmed PPV decides. Until it is confirmed, the plan only
  // decides where their team sits in the tree (a plan under 100 means they already say they will not qualify).
  const ppvClosed = monthOccs(today).find((o) => o.key === "ppv")!.close < today;
  const qualified = (id: string) => {
    const u = people.find((p) => p.id === id);
    if (!u || u.role === "admin") return true;
    if (u.status === "inactive") return false;
    const own = ppv.get(id) ?? out.get(id)?.ppvPlan ?? null;
    return own == null ? !ppvClosed : own >= MIN_PPV;
  };
  const list = people.map((p) => ({ id: p.id, sponsorId: p.sponsorId, status: p.status, role: p.role }));
  const sys = systemQpv(list, ppv, qualified);
  const eff = effectiveSponsors(list, qualified);
  for (const [id, s] of out) { s.sysQpv = sys.get(id) ?? 0; s.effSponsor = eff.get(id) ?? null; s.compressed = !qualified(id); }
  return out;
}

export type Recommendation = { user: User; to: number; stat: Stat };

export async function recommendations(teamId: string, people: User[], stats: Map<string, Stat>): Promise<Recommendation[]> {
  const gone = new Set((await db()<{ user_id: string; to_rank: number }[]>`
    select d.user_id, d.to_rank from rank_dismissals d join users u on u.id = d.user_id where u.team_id = ${teamId}`).map((r) => `${r.user_id}:${r.to_rank}`));
  const out: Recommendation[] = [];
  for (const u of people) {
    const s = stats.get(u.id);
    if (!s) continue;
    const to = recommend({ role: u.role, status: u.status, rank: u.rank, ppv: s.ppv, qpv: s.qpv });
    if (to != null && !gone.has(`${u.id}:${to}`)) out.push({ user: u, to, stat: s });
  }
  return out;
}

export type RankEvent = { id: string; from: number; to: number; at: Date };
export async function rankHistory(userId: string): Promise<RankEvent[]> {
  const rows = await db()<{ id: string; from_rank: number; to_rank: number; created_at: Date }[]>`
    select id, from_rank, to_rank, created_at from rank_events where user_id = ${userId} order by created_at desc`;
  return rows.map((r) => ({ id: r.id, from: r.from_rank, to: r.to_rank, at: r.created_at }));
}
