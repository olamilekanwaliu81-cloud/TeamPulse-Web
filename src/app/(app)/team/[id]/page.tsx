import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { scopeFor, teamMembers, userById } from "@/lib/users";
import { rankName } from "@/lib/rules";
import { monthStatus, statusText } from "@/lib/ranks";
import { StatusPill } from "@/components/ui";
import { dmy } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { deactivateMember, reactivateMember, removeMember, resendInvite } from "@/app/actions/team";
import { ActionForm } from "@/components/ActionForm";
import { ResetPasswordButton } from "@/components/ResetPasswordButton";
import { answersOf, summarize } from "@/lib/answers";
import { rankHistory, monthStats } from "@/lib/stats";
import { today } from "@/lib/clock";
import { latestMailStatus, notDelivered } from "@/lib/mail";
import { MailNotice } from "@/components/MailNotice";
import { CI, dmyDay, monthLabel, parseDay } from "@/lib/checkins";

export default async function Member({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const m = await userById(id);
  if (!m || m.teamId !== viewer.teamId) notFound();
  const all = await teamMembers(viewer.teamId);
  if (m.id !== viewer.id && !scopeFor(viewer, all).some((x) => x.id === m.id)) notFound(); // outside the viewer's downline
  const sponsor = all.find((x) => x.id === m.sponsorId);
  const mail = viewer.role === "admin" && m.status === "invited" ? (await latestMailStatus([m.email], "Welcome to the family")).get(m.email.toLowerCase()) : undefined;
  const admin = viewer.role === "admin";
  const history = m.status === "invited" ? [] : await answersOf(m.id);
  const [ranks, stat] = await Promise.all([rankHistory(m.id), monthStats(viewer.teamId, all, await today()).then((s) => s.get(m.id))]);
  return (
    <>
      <div className="head"><div><h2>{m.name}</h2><p className="sub" style={{ margin: "2px 0 0" }}>{rankName(m.rank)} · {m.status === "invited" ? "Invited, no login yet" : m.status === "inactive" ? "Inactive" : "Active"}</p></div>
        <Link className="btn" href="/team">Back to team</Link></div>
      {mail && notDelivered(mail.status) && <MailNotice memberId={m.id} email={m.email} status={mail.status} error={mail.error} />}
      <section className="card" style={{ marginTop: 12, maxWidth: 720 }}>
        <div className="inline"><Avatar user={m} size="lg" /><div><b>{m.name}</b><div className="sub">TeamPulse ID <span className="mono">{m.tpId}</span> · NeoLife ID <span className="mono">{m.neoId}</span></div></div></div>
        <div className="kv" style={{ marginTop: 16 }}>
          <div><div className="k">Sponsor</div><div className="v">{sponsor?.name ?? "—"}</div></div>
          <div><div className="k">Joined</div><div className="v">{dmy(m.joinedAt)}</div></div>
          <div><div className="k">First order</div><div className="v">{m.firstPv != null ? `${m.firstPv} PV` : "—"}</div></div>
          <div><div className="k">PPV this month</div><div className="v">{stat?.ppv ?? "—"}</div></div>
          <div><div className="k">QPV reported / system</div><div className="v">{stat?.qpv?.toLocaleString("en-US") ?? "—"} / {(stat?.sysQpv ?? 0).toLocaleString("en-US")}</div></div>
          <div><div className="k">City</div><div className="v">{m.city || "—"}</div></div>
          {admin && <div><div className="k">Email</div><div className="v">{m.email}</div></div>}
          {admin && <div><div className="k">Phone</div><div className="v">{m.phone || "—"}</div></div>}
        </div>
        {m.status === "active" && (() => { const ms = monthStatus({ role: m.role, rank: m.rank, ppv: stat?.ppv ?? null, qpv: stat?.qpv ?? null }), tx = statusText({ rank: m.rank, ppv: stat?.ppv ?? null, qpv: stat?.qpv ?? null }, ms);
          return <p className="rule" style={{ marginTop: 14 }}><StatusPill s={ms} /> <b>{tx.headline}.</b> {tx.detail}</p>; })()}
        {m.bio && <p className="sub" style={{ marginTop: 14 }}>{m.bio}</p>}
        {admin && m.id !== viewer.id && (<>
          <div className="inline" style={{ marginTop: 18 }}>
            {m.status === "invited" && <form action={resendInvite}><input type="hidden" name="id" value={m.id} /><button className="btn primary" type="submit">Resend welcome email</button></form>}
            {m.status === "active" && <ResetPasswordButton memberId={m.id} />}
            {m.role === "member" && m.status !== "inactive" && <form action={deactivateMember}><input type="hidden" name="id" value={m.id} /><button className="btn" type="submit">Make inactive</button></form>}
            {m.role === "member" && m.status === "inactive" && <form action={reactivateMember}><input type="hidden" name="id" value={m.id} /><button className="btn primary" type="submit">Make active again</button></form>}
          </div>
          {m.role === "member" && m.status !== "inactive" && <p className="hint" style={{ marginTop: 8 }}>Making someone inactive stops them signing in and from getting check-in emails. Nothing is deleted and you can bring them back.</p>}
          {m.role === "member" && m.status === "inactive" && <p className="hint" style={{ marginTop: 8 }}>This person cannot sign in and gets no check-in emails. Their records are kept.</p>}
        </>)}
      </section>
      {admin && m.id !== viewer.id && m.role === "member" && (
        <section className="card" style={{ marginTop: 16, maxWidth: 720 }}>
          <h3>Remove from the team</h3>
          <p className="sub">For someone who is no longer active. This deletes {m.name} from the database for good: their details, check-in answers and emails.
            {all.some((x) => x.sponsorId === m.id) ? ` The people they sponsored move up to ${sponsor?.name ?? "you"}.` : ""} Past months of their upline&apos;s team numbers may change. This cannot be undone.</p>
          <ActionForm action={removeMember} submit="Remove permanently" danger>
            <input type="hidden" name="id" value={m.id} />
            <div className="field"><label htmlFor="rm-c">Type their TeamPulse ID ({m.tpId}) to confirm</label><input id="rm-c" name="confirm" type="text" autoComplete="off" /></div>
          </ActionForm>
        </section>
      )}
      <section className="card" style={{ marginTop: 16, maxWidth: 720 }}>
        <h3>Rank history</h3>
        {ranks.length === 0 ? <p className="sub">No rank changes yet.</p> : <div className="rows">{ranks.map((r) => <div className="row" key={r.id}><div className="grow">{rankName(r.from)} to <b>{rankName(r.to)}</b></div><span className="sub">{dmy(r.at)}</span></div>)}</div>}
      </section>
      <section className="card" style={{ marginTop: 16, maxWidth: 720 }}>
        <h3>Check-in answers</h3>
        {history.length === 0 ? <p className="sub">No answers yet.</p> : history.map((a) => (
          <div className="row" key={a.occ} style={{ alignItems: "flex-start" }}>
            <div className="grow"><div className="name">{CI[a.key].title} <span className="sub">· {monthLabel(parseDay(a.month).y, parseDay(a.month).m)} {parseDay(a.month).y}</span></div>
              <div className="sub">{summarize(a)}</div></div>
            <span className="sub">{dmyDay(a.answeredAt.toISOString().slice(0, 10))}</span>
          </div>
        ))}
      </section>
    </>
  );
}
