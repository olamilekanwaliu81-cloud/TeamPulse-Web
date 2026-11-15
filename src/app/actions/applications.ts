"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { INVITE_DAYS, applicationById, inviteByToken, isLive, newInviteToken } from "@/lib/applications";
import { appUrl, notDelivered, sendMail } from "@/lib/mail";
import { esc } from "@/lib/emails";
import { MAX_BULK, RANKS, firstName, parseEmails, validEmail, validNeoId } from "@/lib/rules";
import { logAudit, userById } from "@/lib/users";
import type { FormState } from "./auth";

const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/** The leader makes a sign-up link. They can suggest a sponsor now and still choose again when they register the person. */
export async function createInvite(_: FormState, f: FormData): Promise<FormState> {
  const leader = await requireAdmin();
  const sponsorId = text(f, "sponsor");
  let sponsor = null;
  if (sponsorId) {
    sponsor = await userById(sponsorId);
    if (!sponsor || sponsor.teamId !== leader.teamId || sponsor.status === "inactive") return { error: "Choose a sponsor from your team." };
  }
  const kind = text(f, "kind") === "existing" ? "existing" : "new";
  const { emails, bad } = parseEmails(text(f, "emails"));
  if (emails.length > MAX_BULK) return { error: `Up to ${MAX_BULK} email addresses at a time. You entered ${emails.length}.` };
  const note = text(f, "note").slice(0, 120);
  const token = newInviteToken();
  await db()`insert into invites (team_id, created_by, token, sponsor_id, note, kind, expires_at)
             values (${leader.teamId}, ${leader.id}, ${token}, ${sponsor?.id ?? null}, ${note}, ${kind}, now() + ${INVITE_DAYS + " days"}::interval)`;
  await logAudit(leader.teamId, leader.id, "invite.created", {});
  const link = `${appUrl()}/join/${token}`;
  revalidatePath("/signups");
  if (!emails.length && !bad.length) return { ok: "Link made. Copy it below and send it." };
  const taken = new Set((await db()<{ e: string }[]>`select lower(email) as e from users where lower(email) in ${db()(emails.length ? emails : [""])}`).map((r) => r.e));
  const todo = emails.filter((e) => !taken.has(e));
  let sent = 0;
  const failed: string[] = [];
  for (const [n, to] of todo.entries()) {
    if (n) await new Promise((r) => setTimeout(r, 600)); // the email service allows about two a second
    const r = await sendMail({
      to, name: "", teamId: leader.teamId, subject: kind === "existing" ? `${firstName(leader.name)} invites you to TeamPulse` : `${firstName(leader.name)} invites you to join the team`,
      html: kind === "existing"
        ? `<p>Hello, ${esc(leader.name)} now uses TeamPulse for the team's monthly check-ins. You are already a distributor, so there is nothing new to buy. Please add your details once. It takes about a minute.</p><p>The link works for ${INVITE_DAYS} days.</p>`
        : `<p>Hello, ${esc(leader.name)} would like to welcome you to the team. Please fill in your details. It takes about a minute.</p><p>The link works for ${INVITE_DAYS} days.</p>`,
      ctaLabel: "Fill in my details", ctaUrl: link,
    });
    if (notDelivered(r.status)) failed.push(to); else sent++;
  }
  const parts = [`Link made. Emailed ${sent} ${sent === 1 ? "person" : "people"}.`];
  if (taken.size) parts.push(`Skipped ${taken.size} already on the team: ${[...taken].join(", ")}.`);
  if (bad.length) parts.push(`These do not look like email addresses: ${bad.join(", ")}.`);
  if (failed.length) parts.push(`Could not email: ${failed.join(", ")}. Send them the link yourself.`);
  return { ok: parts.join(" ") + " You can also copy the link below." };
}

export async function revokeInvite(f: FormData) {
  const leader = await requireAdmin();
  const id = text(f, "id");
  if (/^[0-9a-f-]{36}$/.test(id)) await db()`update invites set revoked = true where id = ${id} and team_id = ${leader.teamId}`;
  revalidatePath("/signups");
}

export async function dismissApplication(f: FormData) {
  const leader = await requireAdmin();
  const a = await applicationById(text(f, "id"));
  if (!a || a.teamId !== leader.teamId) return;
  await db()`update applications set state = 'dismissed' where id = ${a.id} and state = 'new'`;
  revalidatePath("/", "layout");
}

/** Public: the new person fills in the form from the link. Nothing is registered until the leader approves it. */
export async function submitApplication(_: FormState, f: FormData): Promise<FormState> {
  const invite = await inviteByToken(text(f, "token"));
  if (!invite || !isLive(invite)) return { error: "This link is no longer active. Ask your team leader for a new one." };
  const name = text(f, "name").slice(0, 120), email = text(f, "email").slice(0, 200), phone = text(f, "phone").slice(0, 40), neo = text(f, "neo");
  const existing = invite.kind === "existing";
  const pv = Number(text(f, "pv")), rank = Number(text(f, "rank"));
  if (name.length < 2) return { error: "Enter your full name." };
  if (!validEmail(email)) return { error: "Enter a valid email address." };
  if (!validNeoId(neo)) return { error: "NeoLife ID must look like 063-9262173." };
  if (existing && !(Number.isInteger(rank) && rank >= 0 && rank < RANKS.length)) return { error: "Choose the title you hold now." };
  if (!existing && (!Number.isFinite(pv) || pv < 0 || pv > 100000)) return { error: "Enter the PV of your first order, for example 136." };
  if (f.get("agree") !== "on") return { error: "Please tick the box to confirm you have read the privacy notice." };
  const sql = db();
  if ((await sql`select 1 from users where neo_id = ${neo} or lower(email) = ${email.toLowerCase()}`).length)
    return { error: "You are already on the team. Sign in with your TeamPulse ID." };
  if ((await sql`select 1 from applications where team_id = ${invite.teamId} and state = 'new' and (neo_id = ${neo} or lower(email) = ${email.toLowerCase()})`).length)
    return { ok: "Thank you. Your details are already with your team leader." };
  if ((await sql<{ n: number }[]>`select count(*)::int as n from applications where invite_id = ${invite.id} and state = 'new'`)[0].n >= 100)
    return { error: "Too many people have used this link. Ask your team leader for a new one." };
  await sql`insert into applications (team_id, invite_id, name, email, phone, neo_id, first_pv, kind, claimed_rank)
    values (${invite.teamId}, ${invite.id}, ${name}, ${email}, ${phone}, ${neo}, ${existing ? null : Math.round(pv)}, ${invite.kind}, ${existing ? rank : 0})`;
  return { ok: "Thank you. Your details are with your team leader. You will get a welcome email when you are registered." };
}
