import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { realToday, today } from "@/lib/clock";
import { answeredSets, dropOf, teamAnswers } from "@/lib/answers";
import { CI, dmyDay, monthLabel, monthOccs, parseDay, ymd } from "@/lib/checkins";
import { teamMembers, teamName } from "@/lib/users";
import { firstName, rankName } from "@/lib/rules";
import { ago } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { resendInvite } from "@/app/actions/team";
import { monthStats, recommendations } from "@/lib/stats";
import { teamClaims } from "@/lib/claims";
import { RANKS } from "@/lib/rules";
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
  const from = ymd(y, mo - 4, 1);
  const earn = await teamAnswers(u.teamId, "earn", from);
  const bars = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(Date.UTC(y, mo - 4 + i, 1)), key = ymd(d.getUTCFullYear(), d.getUTCMonth(), 1);
    const v = earn.filter((a) => a.month === key && typeof a.answers.earn === "number").reduce((s, a) => s + (a.answers.earn as number), 0);
    return { label: d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }), v };
  });
  const mx = Math.max(1, ...bars.map((b) => b.v));
  const drops = earn.map((a) => ({ a, d: dropOf(a) })).filter((x) => x.d && x.d.date >= T).sort((p, q) => (p.d!.date < q.d!.date ? -1 : 1));
  const paidOcc = occs.find((o) => o.key === "paid")!;
  const paidAns = await teamAnswers(u.teamId, "paid", paidOcc.month);
  const unpaid = paidAns.filter((a) => a.answers.paid === false && a.occ === paidOcc.id);

  const stats = await monthStats(u.teamId, all, T);
  const recs = await recommendations(u.teamId, all, stats);
  const claims = (await teamClaims(u.teamId)).filter((c) => c.state === "review" || c.state === "ready");
  const activeP = active.filter((m) => (stats.get(m.id)?.ppv ?? 0) >= 100).length;
  const feed = await db()<{ id: string; kind: string; who: string; by: string | null; data: { to?: number }; created_at: Date }[]>`
    select id, kind, who, by, data, created_at from feed where team_id = ${u.teamId} order by created_at desc limit 8`;

  return (
    <>
      <div className="hello">
        <div><h1>Welcome, {firstName(u.name)}!</h1>
          <p className="sub">{team}{active.length ? <> · Check-in completion this month: <b>{pct}%</b>. Target 75 to 80%.</> : null}</p></div>
        <Link className="btn primary" href="/team/add">Add a member</Link>
      </div>

      {members.length === 0 ? (
        <section className="card" style={{ maxWidth: 640 }}>
          <h3>Get started</h3>
          <ol className="start">
            <li><span className="n">1</span><div><b>Your account is ready</b><div className="sub">You are signed in as team leader. Your TeamPulse ID is <span className="mono">{u.tpId}</span>.</div></div><span className="pill good">Done</span></li>
            <li><span className="n">2</span><div><b>Add your first member</b><div className="sub">Enter their name, NeoLife ID, sponsor and first order. They get their own ID and an email to create their login.</div></div><Link className="btn sm primary" href="/team/add">Add a member</Link></li>
            <li><span className="n">3</span><div><b>They answer the monthly check-ins</b><div className="sub">Questions open 2 days before the 10th, 14th, 15th, 25th and 28th. Their answers fill this page.</div></div></li>
          </ol>
        </section>
      ) : (
        <>
          <div className="stats4" style={{ marginBottom: 16 }}>
            <div><b className="n1">{members.length}</b><span>Members</span></div>
            <div><b className="n2">{activeP}</b><span>Active, 100+ PPV</span></div>
            <div><b className="n3">{invited.length}</b><span>Invited, no login yet</span></div>
            <div><b className="n4">{got}/{slots}</b><span>Check-in answers in</span></div>
          </div>
          <div className="grid g-att">
            <section className="card"><h3>Invited, no login yet</h3>
              {invited.length ? (
                <div className="rows">{invited.map((m) => (
                  <div className="row" key={m.id}>
                    <div className="grow"><div className="name">{m.name}</div><div className="sub">Added {ago(m.joinedAt)} · {m.tpId} · first order {m.firstPv ?? 0} PV</div></div>
                    <form action={resendInvite}><input type="hidden" name="id" value={m.id} /><button className="btn sm" type="submit">Resend</button></form>
                  </div>))}</div>
              ) : <p className="sub">Everyone has created their login.</p>}
            </section>
            <section className="card"><h3>Rank-up recommendations</h3>
              {recs.length ? <div className="rows">{recs.map((r) => (
                <div className="row" key={r.user.id}>
                  <div className="grow"><div className="name">{r.user.name}</div>
                    <div className="sub">PPV {r.stat.ppv} · QPV {r.stat.qpv?.toLocaleString("en-US")} reaches {RANKS[r.to].name} ({RANKS[r.to].qpv.toLocaleString("en-US")}). System shows {r.stat.sysQpv.toLocaleString("en-US")}.</div></div>
                  <form action={confirmRank}><input type="hidden" name="id" value={r.user.id} /><button className="btn sm primary" type="submit">Confirm</button></form>
                  <form action={dismissRank}><input type="hidden" name="id" value={r.user.id} /><button className="btn sm" type="submit">Dismiss</button></form>
                </div>))}</div>
                : <p className="sub">No one has reached a new threshold.</p>}
            </section>
            <section className="card"><h3>Reported sign-ups</h3>
              {claims.length ? <div className="rows">{claims.slice(0, 4).map((c) => (
                <div className="row" key={c.id}><div className="grow"><div className="name">{byId.get(c.byUser)?.name ?? "Someone"} reports {c.count}</div><div className="sub">{c.state === "ready" ? "Details received" : "Waiting for your review"}</div></div>
                  <Link className="btn sm" href="/signups">Review</Link></div>))}</div>
                : <p className="sub">No reports waiting.</p>}
            </section>
            <section className="card"><h3>Not fully replied</h3>
              {!due.length ? <p className="sub">The first question of the month opens on {dmyDay(occs[0].open)}.</p>
                : late.length ? (
                <div className="rows">{late.map((m) => (
                  <div className="row" key={m.id}>
                    <div className="grow"><div className="name">{m.name}</div><div className="sub">{per.get(m.id) === 0 ? "No answers yet" : `${per.get(m.id)} of ${dueOf(m).length} answered`}</div></div>
                    <form action={remindMember}><input type="hidden" name="id" value={m.id} /><button className="btn sm" type="submit">Remind</button></form>
                  </div>))}</div>
              ) : <p className="sub">Everyone has replied.</p>}
            </section>
            <section className="card"><h3>Not paid</h3>
              {unpaid.length ? <div className="rows">{unpaid.map((a) => { const m = byId.get((a as { userId: string }).userId); return m ? <div className="row" key={a.occ + m.id}><div className="grow"><div className="name">{m.name}</div><div className="sub">Monthly responsibility not paid yet</div></div></div> : null; })}</div>
                : <p className="sub">{paidOcc.open > T ? `Asked from ${dmyDay(paidOcc.open)}.` : "No one has said they are unpaid."}</p>}
            </section>
            <section className="card"><h3>Money dropping soon</h3>
              {drops.length ? <div className="rows">{drops.slice(0, 6).map(({ a, d }) => { const m = byId.get((a as { userId: string }).userId); return m ? <div className="row" key={a.occ + m.id}><Avatar user={m} /><div className="grow"><div className="name">{m.name}</div><div className="sub">{money(d!.amount)} on {dmyDay(d!.date)}</div></div></div> : null; })}</div>
                : <p className="sub">No payouts reported yet.</p>}
            </section>
          </div>
          <div className="trio" style={{ marginTop: 16 }}>
            <section className="card"><div className="head"><h3 style={{ margin: 0 }}>Income by month</h3></div>
              <p className="sub" style={{ margin: "4px 0 0" }}>Team total in USD, from the 10th check-ins.</p>
              <div className="bars" style={{ marginTop: 8 }}>{bars.map((b, i) => <div key={i} className={i === 4 ? "now" : ""}>{b.v ? money(b.v) : "0"}<i style={{ height: `${Math.round((b.v / mx) * 78)}%` }} /></div>)}</div>
              <div className="axis">{bars.map((b, i) => <span key={i}>{b.label}</span>)}</div>
            </section>
            <section className="card feed"><h3>Team feed</h3>
              {feed.length ? feed.map((f) => {
                const who = byId.get(f.who), by = f.by ? byId.get(f.by) : null;
                return who ? (
                  <div className="row" key={f.id} style={{ marginTop: 8 }}>
                    <Avatar user={who} />
                    <div className="grow"><div className="name">{f.kind === "rank" ? `${who.name} is now ${RANKS[f.data?.to ?? who.rank].name}` : `${who.name} joined the team`}</div><div className="sub">{f.kind === "join" && by ? `Sponsored by ${by.name} · ` : ""}{ago(f.created_at)}</div></div>
                    <span className="pill acc">{rankName(who.rank)}</span>
                  </div>) : null;
              }) : <p className="sub">New members appear here.</p>}
            </section>
          </div>
          <section className="card" style={{ marginTop: 16 }}>
            <h2>Team this month</h2>
            <p className="sub">Select a name for their answers and history. &quot;System&quot; is the QPV worked out from the members added here. Customers outside the system explain most gaps.</p>
            <div className="scroll"><table>
              <thead><tr><th>Member</th><th>Rank</th><th className="num">PPV</th><th className="num">QPV</th><th className="num">System</th><th className="num">Income</th><th>Monthly</th><th>Replies</th></tr></thead>
              <tbody>{active.map((m) => { const s = stats.get(m.id)!; const d = dueOf(m).length;
                return (<tr key={m.id} className="click">
                  <td><Link className="who" href={`/team/${m.id}`} style={{ color: "inherit", textDecoration: "none" }}><Avatar user={m} /><div><div style={{ fontWeight: 700 }}>{m.name}</div><div className="mono sub">{m.tpId}</div></div></Link></td>
                  <td><span className={`pill ${m.rank >= 1 ? "acc" : ""}`}>{rankName(m.rank)}</span></td>
                  <td className="num">{s.ppv ?? "—"}{s.ppv != null && s.ppv < 100 ? <span className="pill warn" style={{ marginLeft: 6 }}>&lt;100</span> : null}</td>
                  <td className="num">{s.qpv?.toLocaleString("en-US") ?? "—"}</td>
                  <td className="num">{s.sysQpv.toLocaleString("en-US")}</td>
                  <td className="num">{s.earn === "none" ? "None yet" : typeof s.earn === "number" ? money(s.earn) : "—"}</td>
                  <td>{s.paid === true ? <span className="pill good">Paid</span> : s.paid === false ? <span className="pill bad">Not paid</span> : <span className="sub">—</span>}</td>
                  <td>{d ? `${per.get(m.id) ?? 0}/${d}` : "—"}</td>
                </tr>); })}</tbody>
            </table></div>
          </section>
          <p className="sub" style={{ marginTop: 12 }}>{monthLabel(y, mo)} check-ins: {occs.map((o) => `${CI[o.key].day} ${o.open <= T ? "open" : "not yet"}`).join(" · ")}</p>
        </>
      )}
    </>
  );
}
