import { randomBytes } from "node:crypto";
import { db } from "./db";

export type Invite = { id: string; teamId: string; token: string; sponsorId: string | null; note: string; expiresAt: Date; revoked: boolean; createdAt: Date };
export type Application = { id: string; teamId: string; inviteId: string | null; name: string; email: string; phone: string; neoId: string; firstPv: number; state: "new" | "added" | "dismissed"; createdAt: Date };

type InviteRow = { id: string; team_id: string; token: string; sponsor_id: string | null; note: string; expires_at: Date; revoked: boolean; created_at: Date };
type AppRow = { id: string; team_id: string; invite_id: string | null; name: string; email: string; phone: string; neo_id: string; first_pv: number; state: Application["state"]; created_at: Date };

const toInvite = (r: InviteRow): Invite => ({ id: r.id, teamId: r.team_id, token: r.token, sponsorId: r.sponsor_id, note: r.note, expiresAt: r.expires_at, revoked: r.revoked, createdAt: r.created_at });
const toApp = (r: AppRow): Application => ({ id: r.id, teamId: r.team_id, inviteId: r.invite_id, name: r.name, email: r.email, phone: r.phone, neoId: r.neo_id, firstPv: r.first_pv, state: r.state, createdAt: r.created_at });

export const INVITE_DAYS = 14;
export const newInviteToken = () => randomBytes(24).toString("base64url");
export const isLive = (i: Invite) => !i.revoked && i.expiresAt.getTime() > Date.now();
const uuid = /^[0-9a-f-]{36}$/;

export async function inviteByToken(token: string): Promise<Invite | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const r = (await db()<InviteRow[]>`select * from invites where token = ${token}`)[0];
  return r ? toInvite(r) : null;
}
export async function teamInvites(teamId: string): Promise<Invite[]> {
  return (await db()<InviteRow[]>`select * from invites where team_id = ${teamId} and not revoked and expires_at > now() order by created_at desc`).map(toInvite);
}
export async function newApplications(teamId: string): Promise<Application[]> {
  return (await db()<AppRow[]>`select * from applications where team_id = ${teamId} and state = 'new' order by created_at`).map(toApp);
}
export async function applicationById(id: string): Promise<Application | null> {
  if (!uuid.test(id)) return null;
  const r = (await db()<AppRow[]>`select * from applications where id = ${id}`)[0];
  return r ? toApp(r) : null;
}
/** The sponsor the leader suggested on the link this person used, if any. */
export async function suggestedSponsor(a: Application): Promise<string | null> {
  if (!a.inviteId) return null;
  const r = (await db()<{ sponsor_id: string | null }[]>`select sponsor_id from invites where id = ${a.inviteId}`)[0];
  return r?.sponsor_id ?? null;
}
