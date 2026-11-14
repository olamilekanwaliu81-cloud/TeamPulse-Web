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
