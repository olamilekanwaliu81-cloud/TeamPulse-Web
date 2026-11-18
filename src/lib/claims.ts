import { cache } from "react";
import { db } from "./db";

export type ClaimState = "review" | "details_asked" | "ready" | "added" | "dismissed";
export type Details = { name: string; email: string; phone: string; neo: string; pv: number };
export type Claim = { id: string; teamId: string; byUser: string; count: number; who: string; state: ClaimState; details: Details | null; memberId: string | null; createdAt: Date };

type Row = { id: string; team_id: string; by_user: string; count: number; who: string; state: ClaimState; details: Details | null; member_id: string | null; created_at: Date };
const toClaim = (r: Row): Claim => ({ id: r.id, teamId: r.team_id, byUser: r.by_user, count: r.count, who: r.who, state: r.state, details: r.details, memberId: r.member_id, createdAt: r.created_at });

export const teamClaims = cache(async (teamId: string): Promise<Claim[]> =>
  (await db()<Row[]>`select * from claims where team_id = ${teamId} order by created_at desc`).map(toClaim));
export async function claimsBy(userId: string): Promise<Claim[]> {
  return (await db()<Row[]>`select * from claims where by_user = ${userId} order by created_at desc`).map(toClaim);
}
export async function claimById(id: string): Promise<Claim | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const r = (await db()<Row[]>`select * from claims where id = ${id}`)[0];
  return r ? toClaim(r) : null;
}
export const isOpen = (c: Claim) => c.state === "review" || c.state === "details_asked" || c.state === "ready";
export const stateText: Record<ClaimState, string> = { review: "With your leader", details_asked: "Your leader needs details", ready: "With your leader", added: "Added", dismissed: "Not added" };
