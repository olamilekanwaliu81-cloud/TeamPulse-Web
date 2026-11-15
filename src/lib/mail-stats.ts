import { db } from "./db";
import { notDelivered } from "./mail";
import { summarize, type Tally } from "./mail-kinds";

export type MailItem = { id: string; to: string; name: string; subject: string; status: string; at: Date; opens: number; clicks: number; openedAt: Date | null; clickedAt: Date | null };

/** The team's emails from the last `days` days: those marked with the team, and those sent to the team's members. */
export async function teamMail(teamId: string, days = 30, limit = 500): Promise<MailItem[]> {
  const rows = await db()<{ id: string; to_email: string; to_name: string; subject: string; status: string; created_at: Date; open_count: number; click_count: number; first_opened_at: Date | null; first_clicked_at: Date | null }[]>`
    select id, to_email, to_name, subject, status, created_at, open_count, click_count, first_opened_at, first_clicked_at from mail_log
    where created_at > now() - (${days} * interval '1 day')
      and (team_id = ${teamId} or lower(to_email) in (select lower(email) from users where team_id = ${teamId}))
    order by created_at desc limit ${limit}`;
  return rows.map((r) => ({ id: r.id, to: r.to_email, name: r.to_name, subject: r.subject, status: r.status, at: r.created_at, opens: r.open_count, clicks: r.click_count, openedAt: r.first_opened_at, clickedAt: r.first_clicked_at }));
}

export const tallies = (items: MailItem[]): Tally[] =>
  summarize(items.map((m) => ({ subject: m.subject, delivered: !notDelivered(m.status), opens: m.opens, clicks: m.clicks })));
