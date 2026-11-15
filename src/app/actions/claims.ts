"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { appUrl, sendMail } from "@/lib/mail";
import { esc } from "@/lib/emails";
import { claimById } from "@/lib/claims";
import { firstName, validEmail, validNeoId } from "@/lib/rules";
import { userById } from "@/lib/users";
import type { FormState } from "./auth";

const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/** A member tells the team leader about a new sign-up, on any day. */
export async function reportSignup(_: FormState, f: FormData): Promise<FormState> {
  const u = await requireUser();
  if (u.role !== "member") return { error: "Team leaders add members directly." };
  const count = Number(text(f, "count") || 1);
  if (!Number.isInteger(count) || count < 1 || count > 50) return { error: "Enter how many people, from 1 to 50." };
  const who = text(f, "who").slice(0, 120);
  await db()`insert into claims (team_id, by_user, count, who) values (${u.teamId}, ${u.id}, ${count}, ${who})`;
  revalidatePath("/", "layout");
  return { ok: "Sent. Your team leader will review it." };
}

/** The leader asks the member for the new person's details. The member gets an email with a button. */
export async function askDetails(f: FormData) {
  const leader = await requireAdmin();
  const c = await claimById(text(f, "id"));
  if (!c || c.teamId !== leader.teamId || c.state !== "review") return;
  const by = await userById(c.byUser);
  if (!by) return;
  await db()`update claims set state = 'details_asked', updated_at = now() where id = ${c.id}`;
  await sendMail({
    to: by.email, name: by.name, teamId: leader.teamId, subject: "Your team leader needs your new sign-up's details",
    html: `<p>Hi ${esc(firstName(by.name))}, your team leader would like to add ${c.count > 1 ? "your new sign-ups" : "your new sign-up"} to the team. Please send the details.</p>`,
    ctaLabel: "Send the details", ctaUrl: `${appUrl()}/signups/${c.id}/details`,
  });
  revalidatePath("/", "layout");
}

export async function dismissClaim(f: FormData) {
  const leader = await requireAdmin();
  const c = await claimById(text(f, "id"));
  if (!c || c.teamId !== leader.teamId) return;
  await db()`update claims set state = 'dismissed', updated_at = now() where id = ${c.id} and state in ('review', 'details_asked', 'ready')`;
  revalidatePath("/", "layout");
}

/** The member sends the details the leader asked for. */
export async function sendDetails(_: FormState, f: FormData): Promise<FormState> {
  const u = await requireUser();
  const c = await claimById(text(f, "id"));
  if (!c || c.byUser !== u.id) return { error: "This report is not yours." };
  if (c.state !== "details_asked") return { error: "Your team leader is not waiting for details on this one." };
  const name = text(f, "name"), email = text(f, "email"), phone = text(f, "phone").slice(0, 40), neo = text(f, "neo"), pv = Number(text(f, "pv"));
  if (name.length < 2) return { error: "Enter their full name." };
  if (!validEmail(email)) return { error: "Enter a valid email address." };
  if (!validNeoId(neo)) return { error: "NeoLife ID must look like 063-9262173." };
  if (!(pv > 0) || pv > 100000) return { error: "Enter the PV of their first order." };
  await db()`update claims set state = 'ready', who = ${name}, details = ${db().json({ name, email, phone, neo, pv })}, updated_at = now() where id = ${c.id}`;
  revalidatePath("/", "layout");
  redirect("/signups");
}
