"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { today } from "@/lib/clock";
import { monthStats, recommendations } from "@/lib/stats";
import { logAudit, teamMembers, userById } from "@/lib/users";

const id = (f: FormData) => String(f.get("id") ?? "");

/** The leader confirms a rank change. The numbers are checked again here, so a stale page cannot confirm the wrong rank. */
export async function confirmRank(f: FormData) {
  const leader = await requireAdmin();
  const m = await userById(id(f));
  if (!m || m.teamId !== leader.teamId) return;
  const people = await teamMembers(leader.teamId);
  const rec = (await recommendations(leader.teamId, people, await monthStats(leader.teamId, people, await today()))).find((r) => r.user.id === m.id);
  if (!rec) return;
  const sql = db();
  await sql.begin(async (tx) => {
    await tx`update users set rank = ${rec.to} where id = ${m.id} and rank < ${rec.to}`;
    await tx`insert into rank_events (team_id, user_id, from_rank, to_rank, confirmed_by) values (${leader.teamId}, ${m.id}, ${m.rank}, ${rec.to}, ${leader.id})`;
    await tx`insert into feed (team_id, kind, who, by, data) values (${leader.teamId}, 'rank', ${m.id}, ${leader.id}, ${tx.json({ to: rec.to })})`;
  });
  await logAudit(leader.teamId, leader.id, "rank.confirmed", { member: m.id, from: m.rank, to: rec.to });
  revalidatePath("/", "layout");
}

export async function dismissRank(f: FormData) {
  const leader = await requireAdmin();
  const m = await userById(id(f));
  if (!m || m.teamId !== leader.teamId) return;
  const people = await teamMembers(leader.teamId);
  const rec = (await recommendations(leader.teamId, people, await monthStats(leader.teamId, people, await today()))).find((r) => r.user.id === m.id);
  if (!rec) return;
  await db()`insert into rank_dismissals (user_id, to_rank, dismissed_by) values (${m.id}, ${rec.to}, ${leader.id}) on conflict do nothing`;
  await logAudit(leader.teamId, leader.id, "rank.dismissed", { member: m.id, to: rec.to });
  revalidatePath("/", "layout");
}
