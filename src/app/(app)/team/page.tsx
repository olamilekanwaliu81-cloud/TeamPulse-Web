import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { rankName } from "@/lib/rules";
import { monthStatus } from "@/lib/ranks";
import { StatusPill } from "@/components/ui";
import { scopeFor, teamMembers, teamName, type User } from "@/lib/users";
import { Avatar } from "@/components/Avatar";
import { TreeView, type TreeNode } from "@/components/TreeView";
import { today } from "@/lib/clock";
import { monthStats } from "@/lib/stats";

export const metadata = { title: "Team" };

const pill = (m: User) => (m.status === "invited" ? <span className="pill warn">Invited</span> : m.status === "inactive" ? <span className="pill">Inactive</span> : null);

export default async function Team({ searchParams }: { searchParams: Promise<{ view?: string; q?: string; removed?: string }> }) {
  const u = await requireUser();
  if (u.role !== "admin" && u.rank < 2) redirect("/home");
  const { view, q: rawQ, removed } = await searchParams;
  const q = (rawQ ?? "").trim().toLowerCase();
  const [all, team] = await Promise.all([teamMembers(u.teamId), teamName(u.teamId)]);
  const list = scopeFor(u, all);
  const stats = await monthStats(u.teamId, all, await today());
  const ids = new Set(list.map((m) => m.id));
  const byId = new Map(all.map((m) => [m.id, m]));
  const stOf = (m: User) => monthStatus({ role: m.role, rank: m.rank, ppv: stats.get(m.id)?.ppv ?? null, qpv: stats.get(m.id)?.qpv ?? null });
  const treeMonth = (m: User): "qualified" | "title_only" | "no_bonus" | "unreported" => { const s = stOf(m); return s.state === "title_only" ? (s.noPpv ? "no_bonus" : "title_only") : s.state === "qualified" ? "qualified" : "unreported"; };
  const kids = (id: string) => list.filter((m) => m.sponsorId === id);
  const node = (m: User): TreeNode => ({ id: m.id, name: m.name, photo: m.photo, rank: rankName(m.rank), status: m.status, tpId: m.tpId, ppv: stats.get(m.id)?.ppv ?? null, qpv: stats.get(m.id)?.qpv ?? null, month: m.status === "active" ? treeMonth(m) : "unreported", children: kids(m.id).map(node) });
  // people whose sponsor is outside the list hang directly under the viewer
  const top = list.filter((m) => !m.sponsorId || !ids.has(m.sponsorId));
  const root: TreeNode = { ...node(u), rank: u.role === "admin" ? "Team leader" : rankName(u.rank), children: top.map(node) };
  const tree = view === "tree" && !q;
  const shown = q ? list.filter((m) => `${m.name} ${m.tpId} ${m.neoId}`.toLowerCase().includes(q)) : list;

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
      {removed && u.role === "admin" && <p className="hint good" style={{ marginTop: 12 }}>The member was removed from the database.</p>}
      <section className="card" style={{ marginTop: 12 }}>
        {q && <p className="sub" style={{ margin: "0 0 10px" }}>{shown.length} result{shown.length === 1 ? "" : "s"} for &quot;{rawQ}&quot;. <Link className="link" href="/team">Clear</Link></p>}
        {list.length === 0 ? (
          <div className="empty" style={{ padding: "26px 0" }}>{u.role === "admin" ? "No members yet. Add your first member to start the team." : "Nobody is in your downline yet."}</div>
        ) : tree ? (
          <TreeView root={root} team={team} />
        ) : (
          <div className="scroll">
            <table>
              <thead><tr><th>Member</th><th>Rank</th><th>NeoLife ID</th><th>This month</th><th className="num">PPV</th><th className="num">QPV</th><th>Sponsor</th><th>Joined</th></tr></thead>
              <tbody>
                {shown.map((m) => (
                  <tr key={m.id} className="click">
                    <td><Link className="who" href={`/team/${m.id}`} style={{ color: "inherit", textDecoration: "none" }}><Avatar user={m} />
                      <div><div style={{ fontWeight: 700 }}>{m.name} {pill(m)}</div><div className="mono sub">{m.tpId}</div></div></Link></td>
                    <td><span className={`pill ${m.rank >= 1 ? "acc" : ""}`}>{rankName(m.rank)}</span></td>
                    <td className="mono">{m.neoId}</td>
                    <td>{m.status === "active" ? <StatusPill s={stOf(m)} /> : <span className="sub">—</span>}</td>
                    <td className="num">{stats.get(m.id)?.ppv ?? "—"}</td>
                    <td className="num">{stats.get(m.id)?.qpv?.toLocaleString("en-US") ?? "—"}</td>
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
