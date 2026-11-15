"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/session";
import { createToken, peekToken, consumeToken, whyText } from "@/lib/tokens";
import { sendResetEmail, sendVerifyEmail } from "@/lib/emails";
import { notDelivered } from "@/lib/mail";
import {
  MAX_TRIES, makeTpId, normalizeTpId, strongPassword, validEmail, validNeoId, validTpId,
} from "@/lib/rules";
import { userById, userRowByTpId, toUser, type UserRow } from "@/lib/users";
import { currentUser, homePath } from "@/lib/auth";

export type FormState = { error?: string; ok?: string } | undefined;
const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const pw = (f: FormData, k: string) => String(f.get(k) ?? "");
let dummyHash: string | undefined; // makes an unknown ID take as long as a wrong password

/** A TeamPulse ID that nobody has yet. */
export async function freshTpId(): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const id = makeTpId(new Date().getFullYear());
    if (!(await userRowByTpId(id))) return id;
  }
  throw new Error("Could not make a free TeamPulse ID");
}

/* ---------- team leader registration ---------- */

export async function registerLeader(_: FormState, f: FormData): Promise<FormState> {
  const name = text(f, "name"), team = text(f, "team"), email = text(f, "email"), neo = text(f, "neo");
  const p1 = pw(f, "p1"), p2 = pw(f, "p2");
  if (name.length < 2) return { error: "Enter your full name." };
  if (team.length < 2) return { error: "Enter a name for your team." };
  if (!validEmail(email)) return { error: "Enter a valid email address." };
  if (!validNeoId(neo)) return { error: "NeoLife ID must look like 063-9262173." };
  if (!strongPassword(p1)) return { error: `Use at least 8 characters, with a letter and a number.` };
  if (p1 !== p2) return { error: "The two passwords do not match." };
  const sql = db();
  if ((await sql`select 1 from users where lower(email) = ${email.toLowerCase()}`).length)
    return { error: "An account with this email already exists. Sign in instead." };
  if ((await sql`select 1 from users where neo_id = ${neo}`).length) return { error: "That NeoLife ID already has an account." };
  const token = await createToken("verify", null, { name, team, email, neo, pwHash: await bcrypt.hash(p1, 12) });
  const sent = await sendVerifyEmail({ name, email, team }, token);
  if (notDelivered(sent.status)) return { error: "We could not send the confirmation email right now. Please try again in a few minutes." };
  redirect(`/register/sent?e=${encodeURIComponent(email)}`);
}

/** Runs when the leader presses "Confirm my email" on the page the email link opens. */
export async function confirmRegistration(_: FormState, f: FormData): Promise<FormState> {
  const raw = text(f, "token");
  const t = await peekToken(raw);
  if ("why" in t || t.type !== "verify") return { error: "why" in t ? whyText(t.why) : "This link is not valid." };
  const d = t.data as { name: string; team: string; email: string; neo: string; pwHash: string };
  if (!(await consumeToken(raw))) return { error: "This link was already used." };
  const sql = db();
  if ((await sql`select 1 from users where lower(email) = ${d.email.toLowerCase()}`).length) redirect("/signin?notice=exists");
  const tpId = await freshTpId();
  const userId = await sql.begin(async (tx) => {
    const [team] = await tx<{ id: string }[]>`insert into teams (name) values (${d.team}) returning id`;
    const [u] = await tx<{ id: string }[]>`
      insert into users (team_id, role, name, email, neo_id, tp_id, status, pw_hash)
      values (${team.id}, 'admin', ${d.name}, ${d.email}, ${d.neo}, ${tpId}, 'active', ${d.pwHash}) returning id`;
    return u.id;
  });
  await createSession(userId);
  redirect("/welcome");
}

/* ---------- sign in and out ---------- */

export async function signIn(_: FormState, f: FormData): Promise<FormState> {
  const id = normalizeTpId(text(f, "id")), password = pw(f, "pw");
  if (!validTpId(id)) return { error: "Use the format 06OW674: a zero, one digit, OW and three digits." };
  if (!password) return { error: "Enter your password." };
  const row = await userRowByTpId(id);
  const bad = "The TeamPulse ID or password is not right.";
  if (!row) { await bcrypt.compare(password, (dummyHash ??= bcrypt.hashSync("not-a-real-password", 12))); return { error: bad }; }
  if (row.status === "inactive") return { error: "This account is not active. Ask your team leader." };
  if (!row.pw_hash) return { error: "Create your password first. Open the link in your welcome or reset email, or use \"Forgot your password?\"." };
  if (row.locked) return { error: "This account is locked after 5 wrong tries. Use \"Forgot your password?\" or ask your team leader to reset it." };
  if (!(await bcrypt.compare(password, row.pw_hash))) {
    const [r] = await db()<{ failed_tries: number }[]>`
      update users set failed_tries = failed_tries + 1, locked = (failed_tries + 1 >= ${MAX_TRIES}) where id = ${row.id} returning failed_tries`;
    const left = MAX_TRIES - r.failed_tries;
    return { error: left <= 0 ? "Locked after 5 wrong tries. Use \"Forgot your password?\" or ask your team leader to reset it." : `${bad} ${left} ${left === 1 ? "try" : "tries"} left.` };
  }
  await db()`update users set failed_tries = 0 where id = ${row.id}`;
  await createSession(row.id);
  redirect(homePath(toUser(row)));
}

export async function signOut() {
  await destroySession();
  redirect("/signin");
}

/* ---------- forgot, create and reset passwords ---------- */

export async function forgotPassword(_: FormState, f: FormData): Promise<FormState> {
  const id = normalizeTpId(text(f, "id"));
  if (!validTpId(id)) return { error: "Use the format 06OW674: a zero, one digit, OW and three digits." };
  const row = await userRowByTpId(id);
  if (row && row.status !== "inactive") await sendResetEmail(toUser(row));
  redirect("/forgot/sent"); // same answer whether or not the ID exists
}

/** One action for both links: "create your login" (new member) and "choose a new password" (reset). */
export async function setPassword(_: FormState, f: FormData): Promise<FormState> {
  const raw = text(f, "token"), p1 = pw(f, "p1"), p2 = pw(f, "p2");
  const t = await peekToken(raw);
  if ("why" in t) return { error: whyText(t.why) };
  if ((t.type !== "setpw" && t.type !== "reset") || !t.userId) return { error: "This link is not valid." };
  if (!strongPassword(p1)) return { error: `Use at least 8 characters, with a letter and a number.` };
  if (p1 !== p2) return { error: "The two passwords do not match." };
  const photo = text(f, "photo"), phone = text(f, "phone").slice(0, 40), city = text(f, "city").slice(0, 80);
  if (photo && !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(photo)) return { error: "That picture could not be used. Try another one." };
  if (photo.length > 400_000) return { error: "That picture is too large. Try a smaller one." };
  if (!(await consumeToken(raw))) return { error: "This link was already used." };
  const hash = await bcrypt.hash(p1, 12);
  const first = t.type === "setpw";
  await db()`update users set pw_hash = ${hash}, failed_tries = 0, locked = false, status = 'active',
      phone = case when ${first} and ${phone} <> '' then ${phone} else phone end,
      city = case when ${first} and ${city} <> '' then ${city} else city end,
      photo = case when ${first} and ${photo} <> '' then ${photo} else photo end
    where id = ${t.userId} and status <> 'inactive'`;
  const u = await userById(t.userId);
  if (!u) return { error: "This link is not valid." };
  await createSession(u.id);
  redirect(homePath(u));
}

export async function redirectIfSignedIn() {
  const u = await currentUser();
  if (u) redirect(homePath(u));
}

export type { UserRow };
