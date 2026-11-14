import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { teamMembers, teamName } from "@/lib/users";
import { firstName, rankName } from "@/lib/rules";
import { ago } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { resendInvite } from "@/app/actions/team";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const u = await requireAdmin();
  const [all, team] = await Promise.all([teamMembers(u.teamId), teamName(u.teamId)]);
  const members = all.filter((m) => m.id !== u.id);
  const invited = members.filter((m) => m.status === "invited");
  const active = members.filter((m) => m.status === "active");
  const byId = new Map(all.map((m) => [m.id, m]));
  const feed = await db()<{ id: string; who: string; by: string | null; created_at: Date }[]>`
    select id, who, by, created_at from feed where team_id = ${u.teamId} and kind = 'join' order by created_at desc limit 8`;

  return (
    <>
      <div className="hello">
        <div><h1>Welcome, {firstName(u.name)}!</h1><p className="sub">{team}</p></div>
        <Link className="btn primary" href="/team/add">Add a member</Link>
      </div>

      {members.length === 0 ? (
        <section className="card" style={{ maxWidth: 640 }}>
          <h3>Get started</h3>
          <ol className="start">
            <li><span className="n">1</span><div><b>Your account is ready</b><div className="sub">You are signed in as team leader. Your TeamPulse ID is <span className="mono">{u.tpId}</span>.</div></div><span className="pill good">Done</span></li>
            <li><span className="n">2</span><div><b>Add your first member</b><div className="sub">Enter their name, NeoLife ID, sponsor and first order. They get their own ID and an email to create their login.</div></div><Link className="btn sm primary" href="/team/add">Add a member</Link></li>
            <li><span className="n">3</span><div><b>They create their login</b><div className="sub">Once they set a password, they appear here as Active.</div></div></li>
          </ol>
        </section>
      ) : (
        <>
          <div className="stats4" style={{ marginBottom: 16 }}>
            <div><b className="n1">{members.length}</b><span>Members</span></div>
            <div><b className="n2">{active.length}</b><span>Active</span></div>
            <div><b className="n3">{invited.length}</b><span>Invited, no login yet</span></div>
          </div>
          <div className="grid g-att">
            <section className="card"><h3>Invited, no login yet</h3>
              {invited.length ? (
                <div className="rows">
                  {invited.map((m) => (
                    <div className="row" key={m.id}>
                      <div className="grow"><div className="name">{m.name}</div><div className="sub">Added {ago(m.joinedAt)} · {m.tpId} · first order {m.firstPv ?? 0} PV</div></div>
                      <form action={resendInvite}><input type="hidden" name="id" value={m.id} /><button className="btn sm" type="submit">Resend</button></form>
                    </div>
                  ))}
                </div>
              ) : <p className="sub">Everyone has created their login.</p>}
            </section>
            <section className="card feed"><h3>Team feed</h3>
              {feed.length ? feed.map((f) => {
                const who = byId.get(f.who), by = f.by ? byId.get(f.by) : null;
                return who ? (
                  <div className="row" key={f.id} style={{ marginTop: 8 }}>
                    <Avatar user={who} />
                    <div className="grow"><div className="name">{who.name} joined the team</div><div className="sub">{by ? `Sponsored by ${by.name} · ` : ""}{ago(f.created_at)}</div></div>
                    <span className="pill acc">{rankName(who.rank)}</span>
                  </div>
                ) : null;
              }) : <p className="sub">New members appear here.</p>}
            </section>
          </div>
        </>
      )}
    </>
  );
}
