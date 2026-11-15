// Rank rules. Pure: no database. Tested in ranks.test.ts.
import { RANKS } from "./rules";

export const MIN_PPV = 100; // NeoLife asks for 100 PPV to stay active and to qualify for a rank

export type Person = { id: string; sponsorId: string | null; status: "invited" | "active" | "inactive"; role: "admin" | "member" };

/**
 * The rank a member qualifies for from reported numbers, or null if there is nothing to recommend.
 * Needs 100 PPV and enough QPV for a higher rank than the one they hold. Manager, Senior Manager and
 * Executive Manager are worked out here; Director follows its own rules, so it is never recommended.
 */
export function recommend(p: { role: string; status: string; rank: number; ppv: number | null; qpv: number | null }): number | null {
  if (p.role !== "member" || p.status !== "active" || p.ppv == null || p.ppv < MIN_PPV || p.qpv == null) return null;
  let best = 0;
  for (let i = 1; i <= 3; i++) if (p.qpv >= RANKS[i].qpv) best = i;
  return best > p.rank ? best : null;
}

/**
 * QPV worked out from the team tree: a person's own PPV plus the PPV of everyone below them.
 * People with no PPV reported count as zero. Members who left (inactive) still count for the month they were active.
 */
export function systemQpv(people: Person[], ppv: Map<string, number>): Map<string, number> {
  const kids = new Map<string, string[]>();
  for (const p of people) if (p.sponsorId) (kids.get(p.sponsorId) ?? kids.set(p.sponsorId, []).get(p.sponsorId)!).push(p.id);
  const out = new Map<string, number>();
  const total = (id: string, seen: Set<string>): number => {
    if (seen.has(id)) return 0; // a loop in the sponsor links must not hang us
    seen.add(id);
    return (ppv.get(id) ?? 0) + (kids.get(id) ?? []).reduce((s, k) => s + total(k, seen), 0);
  };
  for (const p of people) out.set(p.id, total(p.id, new Set()));
  return out;
}

export const nextRank = (rank: number) => (rank < RANKS.length - 1 ? RANKS[rank + 1] : null);

/** Sales Volume Bonus chart from the NeoLife compensation plan: monthly QPV needed for each rate. */
export const SVB_CHART = [
  { qpv: 250, rate: 3 }, { qpv: 500, rate: 5 }, { qpv: 1000, rate: 10 },
  { qpv: 2000, rate: 15 }, { qpv: 3000, rate: 20 }, { qpv: 4000, rate: 25 },
] as const;

/** The bonus rate this month's QPV reaches. It needs 100 PPV, or there is no bonus at all. Null if none. */
export function svbRate(ppv: number | null, qpv: number | null): number | null {
  if (ppv == null || ppv < MIN_PPV || qpv == null) return null;
  let rate: number | null = null;
  for (const s of SVB_CHART) if (qpv >= s.qpv) rate = s.rate;
  return rate;
}

export type MonthStatus =
  | { state: "unreported" }
  | { state: "qualified"; rate: number | null }
  | { state: "title_only"; why: string[]; rate: number | null };

/**
 * A title (Manager, Senior Manager...) is earned once and kept. Qualified status is earned again every month:
 * at least 100 PPV, and for Manager and above the QPV of the title. A month without it, the member keeps the
 * title but is "Title only": they earn from the bonus chart by that month's QPV, and only with 100 PPV.
 * A Distributor is qualified for the month with 100 PPV.
 */
export function monthStatus(p: { role: string; rank: number; ppv: number | null; qpv: number | null }): MonthStatus {
  if (p.ppv == null) return { state: "unreported" };
  const need = RANKS[Math.min(p.rank, RANKS.length - 1)].qpv;
  const why: string[] = [];
  if (p.ppv < MIN_PPV) why.push(`PPV ${p.ppv} is under the ${MIN_PPV} needed`);
  if (p.rank >= 1 && (p.qpv == null || p.qpv < need)) why.push(`QPV ${p.qpv ?? 0} is under the ${need.toLocaleString("en-US")} needed for ${RANKS[p.rank].name}`);
  const rate = svbRate(p.ppv, p.qpv);
  return why.length ? { state: "title_only", why, rate } : { state: "qualified", rate };
}
