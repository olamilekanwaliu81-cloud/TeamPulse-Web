import { db } from "./db";
import { teamAnswers } from "./answers";
import { monthOccs, parseDay, type Day } from "./checkins";
import { realToday } from "./clock";
import { MIN_PPV, effectiveSponsors, recommend, systemQpv } from "./ranks";
import type { User } from "./users";

export type Stat = { ppv: number | null; qpv: number | null; sysQpv: number; earn: number | "none" | null; paid: boolean | null;
  /** Who their team counts under this month: their own sponsor, or the nearest upline who qualified. */
  effSponsor: string | null;
  /** True when they did not qualify this month, so the people they sponsored count under their upline. */
  compressed: boolean;
};

/** This month's numbers for everyone: what they reported, and the QPV worked out from the team tree. */
export async function monthStats(teamId: string, people: User[], today: Day): Promise<Map<string, Stat>> {
  const month = monthOccs(today)[0].month;
  const [ppvA, earnA, paidA] = await Promise.all(["ppv", "earn", "paid"].map((k) => teamAnswers(teamId, k as "ppv" | "earn" | "paid", month)));
  const mine = <T extends { month: Day; userId: string }>(rows: T[]) => new Map(rows.filter((r) => r.month === month).map((r) => [r.userId, r]));
  const P = mine(ppvA), E = mine(earnA), D = mine(paidA);
  const { y, m } = parseDay(today);

  const ppv = new Map<string, number>();
  const out = new Map<string, Stat>();
  for (const u of people) {
    const a = P.get(u.id)?.answers;
    let own: number | null = typeof a?.ppv === "number" ? a.ppv : null;
    const j = parseDay(realToday(u.joinedAt));
    if (own == null && j.y === y && j.m === m && u.firstPv != null) own = u.firstPv; // joined this month: the first order counts
    if (own != null) ppv.set(u.id, own);
    out.set(u.id, { ppv: own, qpv: typeof a?.qpv === "number" ? a.qpv : null, sysQpv: 0, earn: (E.get(u.id)?.answers.earn as Stat["earn"]) ?? null, paid: typeof D.get(u.id)?.answers.paid === "boolean" ? (D.get(u.id)!.answers.paid as boolean) : null, effSponsor: u.sponsorId, compressed: false });
  }
  // Not qualified this month: inactive, or under 100 PPV, or no PPV once the PPV question has closed. Until then no PPV is "not yet".
  const ppvClosed = monthOccs(today).find((o) => o.key === "ppv")!.close < today;
  const qualified = (id: string) => {
    const u = people.find((p) => p.id === id);
    if (!u || u.role === "admin") return true;
    if (u.status === "inactive") return false;
    const own = ppv.get(id);
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
