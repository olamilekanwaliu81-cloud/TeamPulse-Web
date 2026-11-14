import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { teamMembers, teamName } from "@/lib/users";
import { firstName, rankName } from "@/lib/rules";
import { dmy } from "@/lib/format";
import { Avatar } from "@/components/Avatar";

export const metadata = { title: "Home" };

export default async function Home() {
  const u = await requireUser();
  const [team, all] = await Promise.all([teamName(u.teamId), teamMembers(u.teamId)]);
  const sponsor = all.find((m) => m.id === u.sponsorId);
  return (
    <>
      <div className="hello">
        <div><h1>Welcome, {firstName(u.name)}!</h1><p className="sub">{team} · {rankName(u.rank)}</p></div>
      </div>
      <div className="grid g-att">
        <section className="card">
          <div className="inline"><Avatar user={u} size="lg" />
            <div><h3 style={{ margin: 0 }}>{u.name}</h3><div className="sub">TeamPulse ID <span className="mono">{u.tpId}</span> · NeoLife ID <span className="mono">{u.neoId}</span></div></div></div>
          <div className="kv" style={{ marginTop: 14 }}>
            <div><div className="k">Rank</div><div className="v">{rankName(u.rank)}</div></div>
            <div><div className="k">Sponsor</div><div className="v">{sponsor?.name ?? "—"}</div></div>
            <div><div className="k">Joined</div><div className="v">{dmy(u.joinedAt)}</div></div>
          </div>
          <p style={{ marginTop: 14 }}><Link className="btn" href="/profile">Edit my profile</Link></p>
        </section>
        {(!u.photo || !u.phone || !u.city) && (
          <section className="card"><h3>Finish your profile</h3>
            <p className="sub">Your team sees your picture and city next to your name.</p>
            <ul style={{ margin: "8px 0 14px 18px", padding: 0 }}>
              {!u.photo && <li>Add your picture</li>}{!u.phone && <li>Add your phone number</li>}{!u.city && <li>Add your city</li>}
            </ul>
            <Link className="btn primary" href="/profile">Complete my profile</Link>
          </section>
        )}
      </div>
    </>
  );
}
