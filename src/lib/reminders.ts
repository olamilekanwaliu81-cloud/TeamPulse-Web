import { db } from "./db";
import { appUrl, sendMail } from "./mail";
import { esc } from "./emails";
import { firstName } from "./rules";
import { CI, KEYS, dmyDay, stateOf, type Day, type Occ } from "./checkins";
import { toUser, type UserRow } from "./users";

async function once(userId: string, occ: string, kind: string): Promise<boolean> {
  const r = await db()`insert into checkin_mail (user_id, occ, kind) values (${userId}, ${occ}, ${kind}) on conflict do nothing returning user_id`;
  return r.length === 1;
}

async function mailAbout(u: { name: string; email: string; id: string }, o: Occ, kind: "open" | "last" | "nudge", today: Day, leaderName?: string) {
  const c = CI[o.key];
  const lead = kind === "open" ? c.body
    : kind === "last" ? `Today is the last day to answer: ${c.body}`
    : `${leaderName ?? "Your team leader"} is waiting for your answer. ${c.body}`;
  await sendMail({
    to: u.email, name: u.name,
    subject: kind === "open" ? `${c.title}: your check-in is open` : kind === "last" ? `Last day: ${c.title}` : `Reminder: ${c.title}`,
    html: `<p>Hi ${esc(firstName(u.name))}, ${esc(lead)}</p><p>It takes about two minutes. You can answer until ${esc(dmyDay(o.close))}.</p>`,
    ctaLabel: "Answer now", ctaUrl: `${appUrl()}/checkins?key=${o.key}`,
  });
  void today;
}

/**
 * The daily job. For every active member and every question that is open today and unanswered:
 * one email when it opens, and one on its last day. Safe to run twice: nothing is sent twice.
 */
export async function runDailyJob(today: Day): Promise<{ opened: number; last: number }> {
  const members = (await db()<UserRow[]>`select * from users where role = 'member' and status = 'active'`).map(toUser);
  let opened = 0, last = 0;
  for (const k of KEYS) {
    const s = stateOf(k, today);
    if (s.state !== "open") continue;
    const o = s.occ;
    const done = new Set((await db()<{ user_id: string }[]>`select user_id from checkin_answers where occ = ${o.id}`).map((r) => r.user_id));
    for (const m of members) {
      if (done.has(m.id)) continue;
      if (await once(m.id, o.id, "open")) { await mailAbout(m, o, "open", today); opened++; }
      if (today === o.close && (await once(m.id, o.id, "last"))) { await mailAbout(m, o, "last", today); last++; }
    }
  }
  return { opened, last };
}

/** A team leader nudges one member about everything open and unanswered. At most once a day per question. */
export async function nudge(member: { id: string; name: string; email: string }, today: Day, leaderName: string): Promise<number> {
  let n = 0;
  for (const k of KEYS) {
    const s = stateOf(k, today);
    if (s.state !== "open") continue;
    const answered = (await db()`select 1 from checkin_answers where user_id = ${member.id} and occ = ${s.occ.id}`).length > 0;
    if (answered) continue;
    if (await once(member.id, s.occ.id, `nudge:${today}`)) { await mailAbout(member, s.occ, "nudge", today, leaderName); n++; }
  }
  return n;
}
