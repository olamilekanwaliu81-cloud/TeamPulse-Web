import { db } from "./db";

export type Role = "admin" | "member";
export type Status = "invited" | "active" | "inactive";

export type User = {
  id: string;
  teamId: string;
  role: Role;
  name: string;
  email: string;
  neoId: string;
  tpId: string;
  status: Status;
  rank: number;
  sponsorId: string | null;
  firstPv: number | null;
  phone: string;
  city: string;
  bio: string;
  photo: string | null;
  joinedAt: Date;
  hasPassword: boolean;
};

export type UserRow = {
  id: string; team_id: string; role: Role; name: string; email: string; neo_id: string; tp_id: string;
  status: Status; pw_hash: string | null; failed_tries: number; locked: boolean; sponsor_id: string | null;
  rank: number; first_pv: number | null; phone: string; city: string; bio: string; photo: string | null; joined_at: Date;
};

export const toUser = (r: UserRow): User => ({
  id: r.id, teamId: r.team_id, role: r.role, name: r.name, email: r.email, neoId: r.neo_id, tpId: r.tp_id,
  status: r.status, rank: r.rank, sponsorId: r.sponsor_id, firstPv: r.first_pv, phone: r.phone, city: r.city,
  bio: r.bio, photo: r.photo, joinedAt: r.joined_at, hasPassword: !!r.pw_hash,
});

export async function userById(id: string): Promise<User | null> {
  const rows = await db()<UserRow[]>`select * from users where id = ${id}`;
  return rows[0] ? toUser(rows[0]) : null;
}

export async function userRowByTpId(tpId: string): Promise<UserRow | null> {
  const rows = await db()<UserRow[]>`select * from users where tp_id = ${tpId}`;
  return rows[0] ?? null;
}

export async function teamName(teamId: string): Promise<string> {
  const rows = await db()<{ name: string }[]>`select name from teams where id = ${teamId}`;
  return rows[0]?.name ?? "";
}

export async function teamMembers(teamId: string): Promise<User[]> {
  const rows = await db()<UserRow[]>`select * from users where team_id = ${teamId} order by joined_at asc`;
  return rows.map(toUser);
}

/** People the viewer may see: a team leader sees the whole team, a member sees their own downline. */
export function scopeFor(viewer: User, all: User[]): User[] {
  if (viewer.role === "admin") return all.filter((u) => u.id !== viewer.id);
  const seen = new Set<string>();
  const walk = (id: string) => {
    for (const u of all) if (u.sponsorId === id && !seen.has(u.id)) { seen.add(u.id); walk(u.id); }
  };
  walk(viewer.id);
  return all.filter((u) => seen.has(u.id));
}

export async function logAudit(teamId: string, actorId: string | null, action: string, detail: object = {}) {
  await db()`insert into audit_log (team_id, actor_id, action, detail) values (${teamId}, ${actorId}, ${action}, ${db().json(detail as never)})`;
}
