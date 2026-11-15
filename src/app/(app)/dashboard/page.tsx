import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { TZ, realToday, today } from "@/lib/clock";
import { answeredSets, dropOf, teamAnswers } from "@/lib/answers";
import { CI, dmyDay, monthLabel, monthOccs, parseDay, ymd } from "@/lib/checkins";
import { teamMembers, teamName } from "@/lib/users";
import { RANKS, firstName, rankName } from "@/lib/rules";
import { monthStatus } from "@/lib/ranks";
import { ago } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icons";
import { ColumnChart, Donut, PanelTitle, StatCard, StatusPill, WeekPanel, greeting } from "@/components/ui";
import { KEY_COLOR } from "@/lib/calendar";
import { resendInvite } from "@/app/actions/team";
import { monthStats, recommendations } from "@/lib/stats";
import { teamClaims } from "@/lib/claims";
import { latestMailStatus, mailProblem, notDelivered } from "@/lib/mail";
import { confirmRank, dismissRank } from "@/app/actions/ranks";
import { remindMember } from "@/app/actions/checkins";

export const metadata = { title: "Dashboard" };
const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

export default async function Dashboard() {
  const u = await requireAdmin();
  const T = await today();
  const [all, team] = await Promise.all([teamMembers(u.teamId), teamName(u.teamId)]);
  const members = all.filter((m) => m.id !== u.id);
  const invited = members.filter((m) => m.status === "invited");
  const active = members.filter((m) => m.status === "active");
  const byId = new Map(all.map((m) => [m.id, m]));

  const occs = monthOccs(T), due = occs.filter((o) => o.open <= T);
  const done = await answeredSets(u.teamId, occs.map((o) => o.id));
  const dueOf = (m: (typeof active)[number]) => due.filter((o) => o.close >= realToday(m.joinedAt));
  const per = new Map(active.map((m) => [m.id, dueOf(m).filter((o) => done.get(m.id)?.has(o.id)).length]));
  const slots = active.reduce((s, m) => s + dueOf(m).length, 0), got = [...per.values()].reduce((a, b) => a + b, 0);
  const pct = slots ? Math.round((got / slots) * 100) : 0;
  const late = active.filter((m) => (per.get(m.id) ?? 0) < dueOf(m).length);

  const { y, m: mo } = parseDay(T);
  const earn = await teamAnswers(u.teamId, "earn", ymd(y, mo - 4, 1));
  const income = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(Date.UTC(y, mo - 4 + i, 1)), key = ymd(d.getUTCFullYear(), d.getUTCMonth(), 1);
    return { label: d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }), value: earn.filter((a) => a.month === key && typeof a.answers.earn === "number").reduce((s, a) => s + (a.answers.earn as number), 0) };
  });
  const counts = await db()<{ month: string; n: string }[]>`
    select month::text as month, count(*) as n from checkin_answers where team_id = ${u.teamId} and month >= ${ymd(y, mo - 4, 1)} group by month`;
  const activity = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(Date.UTC(y, mo - 4 + i, 1)), key = ymd(d.getUTCFullYear(), d.getUTCMonth(), 1);
    return { label: d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }), value: Number(counts.find((c) => c.month.slice(0, 10) === key)?.n ?? 0) };
  });
  const drops = earn.map((a) => ({ a, d: dropOf(a) })).filter((x) => x.d && x.d.date >= T).sort((p, q) => (p.d!.date < q.d!.date ? -1 : 1));
  const paidOcc = occs.find((o) => o.key === "paid")!;
  const unpaid = (await teamAnswers(u.teamId, "paid", paidOcc.month)).filter((a) => a.answers.paid === false && a.occ === paidOcc.id);

  const welcome = await latestMailStatus(invited.map((m) => m.email), "Welcome to the family");
  const unsent = invited.filter((m) => notDelivered(welcome.get(m.email.toLowerCase())?.status));
  const stats = await monthStats(u.teamId, all, T);
  const recs = await recommendations(u.teamId, all, stats);
  const claims = (await teamClaims(u.teamId)).filter((c) => c.state === "review" || c.state === "ready");
  const st = (id: string) => { const m = byId.get(id)!, s = stats.get(id); return monthStatus({ role: m.role, rank: m.rank, ppv: s?.ppv ?? null, qpv: s?.qpv ?? null }); };
  const qualified = active.filter((m) => st(m.id).state === "qualified").length;
  const titleOnly = active.filter((m) => st(m.id).state === "title_only").length;
  const unreported = active.length - qualified - titleOnly;
  const feed = await db()<{ id: string; kind: string; who: string; by: string | null; data: { to?: number }; created_at: Date }[]>`
    select id, kind, who, by, data, created_at from feed where team_id = ${u.teamId} order by created_at desc limit 6`;
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(new Date()));
  const progress = occs.map((o) => {
    const elig = active.filter((m) => o.close >= realToday(m.joinedAt));
    const n = elig.filter((m) => done.get(m.id)?.has(o.id)).length;
    return { o, open: o.open <= T, pct: o.open <= T && elig.length ? Math.round((n / elig.length) * 100) : 0 };
  });
  const attention = recs.length > 0 || claims.length > 0 || invited.length > 0;

  return (
    <>
      <div className="hello">
        <div className="greet"><h1>{greeting(hour)}, {firstName(u.name)}! 👋</h1><p>{team} · here is what is happening with your team in {monthLabel(y, mo)}.</p></div>
        <Link className="btn primary" href="/team/add">Add a member</Link>
      </div>

      {unsent.length > 0 && (
        <div className="notice bad" role="alert">
          <b>{unsent.length === 1 ? "1 welcome email did not go out." : `${unsent.length} welcome emails did not go out.`}</b>
          <p style={{ margin: "4px 0 0" }}>{mailProblem(welcome.get(unsent[0].email.toLowerCase())?.status, welcome.get(unsent[0].email.toLowerCase())?.error)} Find them under &quot;Invited, no login yet&quot; below and press Resend once it is fixed.</p>
        </div>
      )}

      {members.length === 0 ? (
        <section className="card" style={{ maxWidth: 680 }}>
          <h3>Get started</h3>
          <ol className="start">
            <li><span className="n">1</span><div><b>Your account is ready</b><div className="sub">You are signed in as team leader. Your TeamPulse ID is <span className="mono">{u.tpId}</span>.</div></div><span className="pill good">Done</span></li>
            <li><span className="n">2</span><div><b>Add your first member</b><div className="sub">Enter their name, NeoLife ID, sponsor and first order. They get their own ID and an email to create their login.</div></div><Link className="btn sm primary" href="/team/add">Add a member</Link></li>
            <li><span className="n">3</span><div><b>They answer the monthly check-ins</b><div className="sub">Questions open 2 days before the 10th, 14th, 15th, 25th and 28th. Their answers fill this page.</div></div></li>
          </ol>
        </section>
      ) : (
        <>
          <div className="statrow">
            <StatCard icon="users" tone="blue" label="Team members" value={members.length} note={`${active.length} active · ${invited.length} invited`} />
            <StatCard icon="circleCheck" tone="green" label="Qualified this month" value={qualified} note={`${titleOnly} title only · ${unreported} not reported`} />
            <StatCard icon="clock" tone="orange" label="Check-in completion" value={`${pct}%`} note="Target 75 to 80%" />
            <StatCard icon="star" tone="purple" label="Waiting for you" value={recs.length + claims.length} note={`${recs.length} rank-ups · ${claims.length} sign-ups`} />
          </div>

          <p className="rule"><b>How the month works:</b> a title is earned once and kept. Every month a member needs <b>100 PPV</b> and the <b>QPV of their title</b> to be <b>Qualified</b>. A month without it they keep the title but are <b>Title only</b>, and earn from the bonus chart by that month&apos;s QPV.</p>

          {attention && (
            <div className="dgrid">
              {recs.length > 0 && (
                <section className="card c4"><PanelTitle>Rank-up recommendations</PanelTitle>
                  <div className="rows">{recs.map((r) => (
                    <div className="row" key={r.user.id}>
                      <div className="grow"><div className="name">{r.user.name}</div>
                        <div className="sub">PPV {r.stat.ppv} · QPV {r.stat.qpv?.toLocaleString("en-US")} reaches {RANKS[r.to].name}. System shows {r.stat.sysQpv.toLocaleString("en-US")}.</div></div>
                      <form action={confirmRank}><input type="hidden" name="id" value={r.user.id} /><button className="btn sm primary" type="submit">Confirm</button></form>
                      <form action={dismissRank}><input type="hidden" name="id" value={r.user.id} /><button className="btn sm" type="submit">Dismiss</button></form>
                    </div>))}</div>
                </section>
              )}
              {claims.length > 0 && (
                <section className="card c4"><PanelTitle href="/signups" link="Review">Reported sign-ups</PanelTitle>
                  <div className="rows">{claims.slice(0, 4).map((c) => (
                    <div className="row" key={c.id}><div className="grow"><div className="name">{byId.get(c.byUser)?.name ?? "Someone"} reports {c.count}</div><div className="sub">{c.state === "ready" ? "Details received" : "Waiting for your review"}</div></div></div>))}</div>
                </section>
              )}
              {invited.length > 0 && (
                <section className="card c4"><PanelTitle>Invited, no login yet</PanelTitle>
                  <div className="rows">{invited.map((m) => (
                    <div className="row" key={m.id}>
                      <div className="grow"><div className="name">{m.name}</div><div className="sub">Added {ago(m.joinedAt)} · {m.tpId} · first order {m.firstPv ?? 0} PV</div>
                        {notDelivered(welcome.get(m.email.toLowerCase())?.status) && <div className="sub" style={{ color: "var(--bad)", fontWeight: 600 }}>Welcome email not delivered. Give them their ID yourself, or resend.</div>}</div>
                      <form action={resendInvite}><input type="hidden" name="id" value={m.id} /><button className="btn sm" type="submit">Resend</button></form>
                    </div>))}</div>
                </section>
              )}
            </div>
          )}

          <div className="dgrid">
            <section className="card c4"><PanelTitle href="/checkins" link="">Check-in progress</PanelTitle>
              {progress.map(({ o, open, pct: p }) => (
                <div className="pbar" key={o.id}>
                  <span className="pi" style={{ background: `color-mix(in srgb, ${KEY_COLOR[o.key]} 16%, white)`, color: KEY_COLOR[o.key] }}><Icon name="circleCheck" /></span>
                  <div className="pm"><div className="pn">{CI[o.key].title}<span>{open ? `${p}%` : `Opens ${dmyDay(o.open).replace(/ \d{4}$/, "")}`}</span></div>
                    <div className="track"><i style={{ width: `${p}%`, background: KEY_COLOR[o.key] }} /></div></div>
                </div>
              ))}
            </section>
            <section className="card c4"><PanelTitle>Team this month</PanelTitle>
              <Donut label="active members" total={active.length}
                parts={[{ value: qualified, color: "var(--green)", label: "Qualified" }, { value: titleOnly, color: "var(--orange)", label: "Title only" }, { value: unreported, color: "#C9D2E8", label: "Not reported yet" }]} />
            </section>
            <section className="card c4"><PanelTitle>This week</PanelTitle><WeekPanel today={T} /></section>
          </div>

          <div className="dgrid">
            <section className="card c6"><PanelTitle href="/team" link="View all">Team members</PanelTitle>
              {active.slice(0, 6).map((m) => (
                <div className="mrow" key={m.id}>
                  <Avatar user={m} />
                  <div className="grow"><b>{m.name}</b><small>{rankName(m.rank)} · {stats.get(m.id)?.ppv != null ? `${stats.get(m.id)!.ppv} PPV` : "no PPV yet"}</small></div>
                  <StatusPill s={st(m.id)} />
                </div>
              ))}
              {active.length === 0 && <p className="sub">Active members appear here once they create their login.</p>}
            </section>
            <section className="card c6"><PanelTitle>Check-in answers by month</PanelTitle><ColumnChart data={activity} /></section>
          </div>

          <div className="dgrid">
            <section className="card c4"><PanelTitle>Not fully replied</PanelTitle>
              {!due.length ? <p className="sub">The first question of the month opens on {dmyDay(occs[0].open)}.</p>
                : late.length ? (
                <div className="rows">{late.map((m) => (
                  <div className="row" key={m.id}>
                    <div className="grow"><div className="name">{m.name}</div><div className="sub">{per.get(m.id) === 0 ? "No answers yet" : `${per.get(m.id)} of ${dueOf(m).length} answered`}</div></div>
                    <form action={remindMember}><input type="hidden" name="id" value={m.id} /><button className="btn sm" type="submit">Remind</button></form>
                  </div>))}</div>
              ) : <p className="sub">Everyone has replied.</p>}
            </section>
            <section className="card c4"><PanelTitle>Not paid</PanelTitle>
              {unpaid.length ? <div className="rows">{unpaid.map((a) => { const m = byId.get((a as { userId: string }).userId); return m ? <div className="row" key={a.occ + m.id}><div className="grow"><div className="name">{m.name}</div><div className="sub">Monthly responsibility not paid yet</div></div></div> : null; })}</div>
                : <p className="sub">{paidOcc.open > T ? `Asked from ${dmyDay(paidOcc.open)}.` : "No one has said they are unpaid."}</p>}
            </section>
            <section className="card c4"><PanelTitle>Money dropping soon</PanelTitle>
              {drops.length ? <div className="rows">{drops.slice(0, 6).map(({ a, d }) => { const m = byId.get((a as { userId: string }).userId); return m ? <div className="row" key={a.occ + m.id}><Avatar user={m} /><div className="grow"><div className="name">{m.name}</div><div className="sub">{money(d!.amount)} on {dmyDay(d!.date)}</div></div></div> : null; })}</div>
                : <p className="sub">No payouts reported yet.</p>}
            </section>
          </div>

          <div className="dgrid">
            <section className="card c6"><PanelTitle>Team income by month</PanelTitle><p className="sub" style={{ margin: "-6px 0 8px" }}>Team total in USD, from the 10th check-ins.</p><ColumnChart data={income} format={money} /></section>
            <section className="card c6"><PanelTitle>Team feed</PanelTitle>
              {feed.length ? feed.map((f) => {
                const who = byId.get(f.who), by = f.by ? byId.get(f.by) : null;
                return who ? (
                  <div className="mrow" key={f.id}>
                    <Avatar user={who} />
                    <div className="grow"><b>{f.kind === "rank" ? `${who.name} is now ${RANKS[f.data?.to ?? who.rank].name}` : `${who.name} joined the team`}</b><small>{f.kind === "join" && by ? `Sponsored by ${by.name} · ` : ""}{ago(f.created_at)}</small></div>
                    <span className="pill acc">{rankName(who.rank)}</span>
                  </div>) : null;
              }) : <p className="sub">New members appear here.</p>}
            </section>
          </div>

          <section className="card">
            <PanelTitle>Team this month</PanelTitle>
            <p className="sub" style={{ margin: "-6px 0 10px" }}>Select a name for their answers and history. &quot;System&quot; is the QPV worked out from the members added here. Customers outside the system explain most gaps.</p>
            <div className="scroll"><table>
              <thead><tr><th>Member</th><th>Title</th><th>This month</th><th className="num">PPV</th><th className="num">QPV</th><th className="num">System</th><th className="num">Income</th><th>Monthly</th><th>Replies</th></tr></thead>
              <tbody>{active.map((m) => { const s = stats.get(m.id)!; const d = dueOf(m).length;
                return (<tr key={m.id} className="click">
                  <td><Link className="who" href={`/team/${m.id}`} style={{ color: "inherit", textDecoration: "none" }}><Avatar user={m} /><div><div style={{ fontWeight: 700 }}>{m.name}</div><div className="mono sub">{m.tpId}</div></div></Link></td>
                  <td><span className={`pill ${m.rank >= 1 ? "acc" : ""}`}>{rankName(m.rank)}</span></td>
                  <td><StatusPill s={st(m.id)} /></td>
                  <td className="num">{s.ppv ?? "—"}</td>
                  <td className="num">{s.qpv?.toLocaleString("en-US") ?? "—"}</td>
                  <td className="num">{s.sysQpv.toLocaleString("en-US")}</td>
                  <td className="num">{s.earn === "none" ? "None yet" : typeof s.earn === "number" ? money(s.earn) : "—"}</td>
                  <td>{s.paid === true ? <span className="pill good">Paid</span> : s.paid === false ? <span className="pill bad">Not paid</span> : <span className="sub">—</span>}</td>
                  <td>{d ? `${per.get(m.id) ?? 0}/${d}` : "—"}</td>
                </tr>); })}</tbody>
            </table></div>
          </section>
        </>
      )}
    </>
  );
}
