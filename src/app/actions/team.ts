"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { sendResetEmail, sendWelcomeEmail } from "@/lib/emails";
import { logAudit, userById } from "@/lib/users";
import { validEmail, validNeoId, strongPassword, firstName } from "@/lib/rules";
import { mailProblem, notDelivered } from "@/lib/mail";
import { freshTpId, type FormState } from "./auth";
import bcrypt from "bcryptjs";

const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/** Only a team leader can add members. The member gets a TeamPulse ID and a welcome email. */
export async function addMember(_: FormState, f: FormData): Promise<FormState> {
  const leader = await requireAdmin();
  const name = text(f, "name"), email = text(f, "email"), phone = text(f, "phone").slice(0, 40), neo = text(f, "neo");
  const pv = Number(text(f, "pv")), appId = text(f, "app"), sponsorId = text(f, "sponsor") || (appId ? "" : leader.id);
  if (appId && !sponsorId) return { error: "Choose who sponsors this person." };
  if (name.length < 2) return { error: "Enter the member's full name." };
  if (!validEmail(email)) return { error: "Enter a valid email address. The welcome message goes there." };
  if (!validNeoId(neo)) return { error: "NeoLife ID must look like 063-9262173." };
  if (!Number.isFinite(pv) || pv < 0 || pv > 100000) return { error: "Enter the PV of the first order, for example 136." };
  const sql = db();
  if ((await sql`select 1 from users where neo_id = ${neo}`).length) return { error: "That NeoLife ID is already on a member." };
  if ((await sql`select 1 from users where lower(email) = ${email.toLowerCase()}`).length) return { error: "That email already has an account." };
  const sponsor = await userById(sponsorId);
  if (!sponsor || sponsor.teamId !== leader.teamId || sponsor.status === "inactive") return { error: "Choose a sponsor from your team." };
  const tpId = await freshTpId();
  const [row] = await sql<{ id: string }[]>`
    insert into users (team_id, role, name, email, neo_id, tp_id, status, sponsor_id, first_pv, phone)
    values (${leader.teamId}, 'member', ${name}, ${email}, ${neo}, ${tpId}, 'invited', ${sponsor.id}, ${Math.round(pv)}, ${phone}) returning id`;
  await sql`insert into feed (team_id, kind, who, by) values (${leader.teamId}, 'join', ${row.id}, ${sponsor.id})`;
  const claimId = text(f, "claim");
  if (/^[0-9a-f-]{36}$/.test(claimId))
    await sql`update claims set state = 'added', member_id = ${row.id}, updated_at = now()
              where id = ${claimId} and team_id = ${leader.teamId} and state in ('review', 'details_asked', 'ready')`;
  if (/^[0-9a-f-]{36}$/.test(appId))
    await sql`update applications set state = 'added', member_id = ${row.id} where id = ${appId} and team_id = ${leader.teamId} and state = 'new'`;
  await logAudit(leader.teamId, leader.id, "member.added", { member: row.id });
  const member = (await userById(row.id))!;
  await sendWelcomeEmail(member, sponsor);
  revalidatePath("/team");
  redirect(`/team/added/${row.id}`);
}

async function ownMember(leaderTeam: string, id: string) {
  const m = await userById(id);
  return m && m.teamId === leaderTeam ? m : null;
}

export async function resendInvite(f: FormData) {
  const leader = await requireAdmin();
  const m = await ownMember(leader.teamId, text(f, "id"));
  if (m && m.status === "invited") {
    const sponsor = (m.sponsorId && (await userById(m.sponsorId))) || leader;
    await sendWelcomeEmail(m, sponsor);
  }
  revalidatePath("/", "layout");
}

/**
 * The leader sends a member a link to choose a new password. The email goes first. Only when it was delivered
 * is the old password cleared, so a failed email never locks the member out of an account that still works.
 */
export async function sendMemberReset(_: FormState, f: FormData): Promise<FormState> {
  const leader = await requireAdmin();
  const m = await ownMember(leader.teamId, text(f, "id"));
  if (!m || m.status !== "active") return { error: "That member cannot be reset." };
  const sent = await sendResetEmail(m, true);
  if (notDelivered(sent.status))
    return { error: `The reset email to ${m.email} did not go out. ${mailProblem(sent.status, sent.error)} Nothing was changed: ${firstName(m.name)} can still sign in with their current password.` };
  await db()`update users set pw_hash = null, locked = false, failed_tries = 0 where id = ${m.id}`;
  await logAudit(leader.teamId, leader.id, "member.password_reset", { member: m.id });
  revalidatePath("/", "layout");
  return { ok: `Reset email sent to ${m.email}. Their old password no longer works. The link in the email works for 7 days.` };
}

/** Own profile: contact details, bio and picture. The NeoLife ID is not editable here. */
export async function saveProfile(_: FormState, f: FormData): Promise<FormState> {
  const u = await requireUser();
  const name = text(f, "name"), phone = text(f, "phone").slice(0, 40), city = text(f, "city").slice(0, 80), bio = text(f, "bio").slice(0, 600);
  const photo = text(f, "photo");
  if (name.length < 2) return { error: "Enter your name." };
  if (photo && !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(photo)) return { error: "That picture could not be used." };
  if (photo.length > 400_000) return { error: "That picture is too large. Try a smaller one." };
  await db()`update users set name = ${name}, phone = ${phone}, city = ${city}, bio = ${bio},
             photo = case when ${photo} <> '' then ${photo} else photo end where id = ${u.id}`;
  revalidatePath("/", "layout");
  return undefined;
}

export async function changePassword(_: FormState, f: FormData): Promise<FormState> {
  const u = await requireUser();
  const cur = String(f.get("p0") ?? ""), p1 = String(f.get("p1") ?? ""), p2 = String(f.get("p2") ?? "");
  const [row] = await db()<{ pw_hash: string | null }[]>`select pw_hash from users where id = ${u.id}`;
  if (!row?.pw_hash || !(await bcrypt.compare(cur, row.pw_hash))) return { error: "Your current password is not right." };
  if (!strongPassword(p1)) return { error: "Use at least 8 characters, with a letter and a number." };
  if (p1 !== p2) return { error: "The two new passwords do not match." };
  await db()`update users set pw_hash = ${await bcrypt.hash(p1, 12)} where id = ${u.id}`;
  return { ok: "Password changed." };
}
