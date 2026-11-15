"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { today } from "@/lib/clock";
import { pledgeOf, saveAnswer } from "@/lib/answers";
import { CONFIRM_OF, isConfirm, isKey, stateOf, type Key } from "@/lib/checkins";
import { nudge } from "@/lib/reminders";
import { userById } from "@/lib/users";
import type { FormState } from "./auth";

const raw = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string): number | null => { const v = raw(f, k); if (v === "") return null; const n = Number(v); return Number.isFinite(n) && n >= 0 && n < 100_000_000 ? n : NaN; };

type Parsed = { answers: Record<string, unknown> } | { error: string };

function parse(key: Key, f: FormData): Parsed {
  if (key === "earn") {
    const none = f.get("none") === "on", amt = num(f, "amt"), drop = num(f, "drop") ?? 0, clears = raw(f, "clears");
    const orders = num(f, "orders") ?? 0, delivered = num(f, "delivered") ?? 0;
    if ([amt, drop, orders, delivered].some((n) => Number.isNaN(n))) return { error: "Use numbers only, with no minus sign." };
    if (!none && amt === null) return { error: 'Enter an amount, or tick "Not yet".' };
    if (drop > 0 && !/^\d{4}-\d{2}-\d{2}$/.test(clears)) return { error: "Add the date the money drops, so your leader can plan your PPV order." };
    return { answers: { earn: none ? "none" : amt, orders, delivered, drop, clears: /^\d{4}-\d{2}-\d{2}$/.test(clears) ? clears : null } };
  }
  if (key === "ppv") {
    const ppv = num(f, "ppv"), q = num(f, "qpv");
    if (ppv === null) return { error: "Enter your PPV." };
    if (Number.isNaN(ppv) || Number.isNaN(q)) return { error: "Use numbers only, with no minus sign." };
    return { answers: { ppv, qpv: f.get("none") === "on" || q === null ? ppv : q } };
  }
  if (key === "plan") {
    const gp = f.getAll("gp").map(String), gt = f.getAll("gt").map((x) => String(x).trim());
    const goals = gp.map((p, i) => [p === "I must" ? "I must" : "I will", (gt[i] ?? "").slice(0, 300)] as [string, string]).filter((g) => g[1]).slice(0, 12);
    if (!goals.length) return { error: 'Write at least one goal after "I will" or "I must".' };
    const signups = num(f, "signups") ?? 0, pp = num(f, "pp"), pq = num(f, "pq");
    if ([signups, pp, pq].some((n) => Number.isNaN(n))) return { error: "Use numbers only, with no minus sign." };
    const target = ["$0 to $300", "$300 to $1,000", "$1,000 and above"].includes(raw(f, "target")) ? raw(f, "target") : "$0 to $300";
    return { answers: { goals, signups, target, pp, pq } };
  }
  if (key === "paid") {
    const v = raw(f, "paid");
    if (v !== "yes" && v !== "no") return { error: "Choose yes or not yet." };
    return { answers: { paid: v === "yes" } };
  }
  const su = raw(f, "su");
  if (su !== "yes" && su !== "no") return { error: "Choose yes or no." };
  const count = Math.max(1, num(f, "count") ?? 1), steps = [0, 1, 2, 3].map((i) => num(f, "st" + i) ?? 0);
  if (Number.isNaN(count) || steps.some(Number.isNaN)) return { error: "Use numbers only, with no minus sign." };
  return { answers: { su, count, steps, tools: raw(f, "tools") === "yes" ? "yes" : "no" } };
}

/** The 28th and 29th: "yes, I did what I planned" or the number they really did. Nothing counts until this is saved. */
function parseConfirm(key: keyof typeof CONFIRM_OF, f: FormData, planned: number | null): Parsed {
  const w = CONFIRM_OF[key].toUpperCase(), v = raw(f, "done"), actual = num(f, "actual");
  if (Number.isNaN(actual)) return { error: "Use numbers only, with no minus sign." };
  if (v === "yes" && planned != null) return { answers: { done: true, actual: planned, planned } };
  if (v !== "yes" && v !== "no" && planned != null) return { error: `Choose yes, or enter the ${w} you really did.` };
  if (actual === null) return { error: `Enter the ${w} you really did.` };
  return { answers: { done: planned != null && actual === planned, actual, planned } };
}

/** A member answers an open check-in. They can change the answer until the window closes. */
export async function saveCheckin(_: FormState, f: FormData): Promise<FormState> {
  const u = await requireUser();
  if (u.role !== "member") return { error: "Team leaders do not answer check-ins." };
  const key = raw(f, "key");
  if (!isKey(key)) return { error: "That check-in does not exist." };
  const s = stateOf(key, await today());
  if (s.state !== "open") return { error: "This check-in is not open." };
  const p = isConfirm(key) ? parseConfirm(key, f, (await pledgeOf(u.id, s.occ.month))[CONFIRM_OF[key]]) : parse(key, f);
  if ("error" in p) return p;
  await saveAnswer(u.id, u.teamId, s.occ.id, key, s.occ.month, p.answers);
  if (key === "signup") {
    // "Yes, I signed people" tells the leader once for this question. Changing to "no" withdraws it if the leader has not acted.
    if (p.answers.su === "yes")
      await db()`insert into claims (team_id, by_user, count, occ) values (${u.teamId}, ${u.id}, ${Number(p.answers.count)}, ${s.occ.id})
                 on conflict (by_user, occ) where occ is not null do update set count = excluded.count, updated_at = now() where claims.state = 'review'`;
    else await db()`update claims set state = 'dismissed', updated_at = now() where by_user = ${u.id} and occ = ${s.occ.id} and state = 'review'`;
  }
  revalidatePath("/", "layout");
  return { ok: key === "ppv" ? "Saved as your plan. It counts only after you confirm it on the 28th." : isConfirm(key) ? `Saved. ${p.answers.actual} ${CONFIRM_OF[key].toUpperCase()} is recorded for this month.` : "Saved." };
}

export async function remindMember(f: FormData) {
  const leader = await requireAdmin();
  const m = await userById(String(f.get("id") ?? ""));
  if (m && m.teamId === leader.teamId && m.status === "active") await nudge(m, await today(), leader.name);
  revalidatePath("/dashboard");
}
