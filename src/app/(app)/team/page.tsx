import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { rankName } from "@/lib/rules";
import { scopeFor, teamMembers, teamName, type User } from "@/lib/users";
import { Avatar } from "@/components/Avatar";
import { TreeView, type TreeNode } from "@/components/TreeView";

export const metadata = { title: "Team" };

const pill = (m: User) => (m.status === "invited" ? <span className="pill warn">Invited</span> : m.status === "inactive" ? <span className="pill">Inactive</span> : null);

export default async function Team({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const u = await requireUser();
  if (u.role !== "admin" && u.rank < 2) redirect("/home");
  const { view } = await searchParams;
  const [all, team] = await Promise.all([teamMembers(u.teamId), teamName(u.teamId)]);
  const list = scopeFor(u, all);
  const ids = new Set(list.map((m) => m.id));
  const byId = new Map(all.map((m) => [m.id, m]));
  const kids = (id: string) => list.filter((m) => m.sponsorId === id);
  const node = (m: User): TreeNode => ({ id: m.id, name: m.name, photo: m.photo, rank: rankName(m.rank), status: m.status, tpId: m.tpId, children: kids(m.id).map(node) });
  // people whose sponsor is outside the list hang directly under the viewer
  const top = list.filter((m) => !m.sponsorId || !ids.has(m.sponsorId));
  const root: TreeNode = { ...node(u), children: top.map(node) };
  const tree = view === "tree";

  return (
    <>
      <div className="head">
        <div><h2>{u.role === "admin" ? "Team" : "My team"}</h2>
          <p className="sub" style={{ margin: "2px 0 0" }}>{list.length} member{list.length === 1 ? "" : "s"}{u.role === "admin" ? "" : " in your downline. You see their results, and nobody outside it."}</p></div>
        <div className="inline">
          <div className="chips">
            <Link className="chip" href="/team" aria-pressed={!tree}>List</Link>
            <Link className="chip" href="/team?view=tree" aria-pressed={tree}>Tree</Link>
          </div>
          {u.role === "admin" && <Link className="btn primary" href="/team/add">Add a member</Link>}
        </div>
      </div>
      <section className="card" style={{ marginTop: 12 }}>
        {list.length === 0 ? (
          <div className="empty" style={{ padding: "26px 0" }}>{u.role === "admin" ? "No members yet. Add your first member to start the team." : "Nobody is in your downline yet."}</div>
        ) : tree ? (
          <TreeView root={root} team={team} />
        ) : (
          <div className="scroll">
            <table>
              <thead><tr><th>Member</th><th>Rank</th><th>NeoLife ID</th><th>Sponsor</th><th>Joined</th></tr></thead>
              <tbody>
                {list.map((m) => (
                  <tr key={m.id} className="click">
                    <td><Link className="who" href={`/team/${m.id}`} style={{ color: "inherit", textDecoration: "none" }}><Avatar user={m} />
                      <div><div style={{ fontWeight: 700 }}>{m.name} {pill(m)}</div><div className="mono sub">{m.tpId}</div></div></Link></td>
                    <td><span className={`pill ${m.rank >= 1 ? "acc" : ""}`}>{rankName(m.rank)}</span></td>
                    <td className="mono">{m.neoId}</td>
                    <td>{(m.sponsorId && byId.get(m.sponsorId)?.name) || "—"}</td>
                    <td>{m.joinedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
