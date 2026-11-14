import { requireUser } from "@/lib/auth";
import { rankName } from "@/lib/rules";
import { teamMembers, teamName, scopeFor } from "@/lib/users";
import { Brand } from "@/components/AuthShell";
import { NavLinks, type NavItem } from "@/components/NavLinks";
import { TopBar, type Notice } from "@/components/TopBar";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser();
  const [team, all] = await Promise.all([teamName(u.teamId), teamMembers(u.teamId)]);
  const mine = scopeFor(u, all);

  const notices: Notice[] = [];
  if (u.role === "admin")
    for (const m of mine.filter((x) => x.status === "invited"))
      notices.push({ kind: "invite", title: `${m.name} has not created a login yet`, sub: `ID ${m.tpId}`, href: "/dashboard" });

  const nav: NavItem[] = u.role === "admin"
    ? [{ href: "/dashboard", label: "Dashboard", icon: "dashboard" }, { href: "/team", label: "Team", icon: "team" }, { href: "/profile", label: "Settings", icon: "profile" }]
    : [{ href: "/home", label: "Home", icon: "dashboard" }, ...(u.rank >= 2 ? [{ href: "/team", label: "My team", icon: "team" } as NavItem] : []), { href: "/profile", label: "My profile", icon: "profile" }];

  const now = new Date(), y = now.getFullYear(), m = now.getMonth();
  const last = new Date(y, m + 1, 0).getDate();

  return (
    <div className="shell">
      <aside className="side">
        <Brand />
        <NavLinks items={nav} />
        <div className="cyclecard">This month<b>1 {MONTHS[m]} – {last} {MONTHS[m]} {y}</b>NeoLife counts PV by the normal calendar month.</div>
      </aside>
      <div className="content">
        <header className="top">
          <label className="search" style={{ visibility: "hidden" }} />
          <TopBar
            notices={notices}
            person={{ id: u.id, name: u.name, photo: u.photo, tpId: u.tpId, role: u.role === "admin" ? "Team leader" : rankName(u.rank), subtitle: u.role === "admin" ? `Team leader · ${team}` : rankName(u.rank) }}
          />
        </header>
        <main id="main">{children}</main>
      </div>
    </div>
  );
}
