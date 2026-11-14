import { requireUser } from "@/lib/auth";
import { rankName } from "@/lib/rules";
import { teamMembers, teamName, scopeFor } from "@/lib/users";
import { today } from "@/lib/clock";
import { answeredSets } from "@/lib/answers";
import { CI, dmyDay, monthLabel, openToday, parseDay, teamLine } from "@/lib/checkins";
import { Brand } from "@/components/AuthShell";
import { NavLinks, type NavItem } from "@/components/NavLinks";
import { TopBar, type Notice } from "@/components/TopBar";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser();
  const [team, all] = await Promise.all([teamName(u.teamId), teamMembers(u.teamId)]);
  const mine = scopeFor(u, all);

  const T = await today();
  const open = openToday(T);
  const answered = await answeredSets(u.teamId, open.map((o) => o.id));
  const active = mine.filter((m) => m.status === "active" && m.role === "member");

  const notices: Notice[] = [];
  if (u.role === "admin") {
    for (const m of mine.filter((x) => x.status === "invited"))
      notices.push({ kind: "invite", title: `${m.name} has not created a login yet`, sub: `ID ${m.tpId}`, href: "/dashboard" });
    for (const o of open) {
      const late = active.filter((m) => !answered.get(m.id)?.has(o.id)).length;
      if (late) notices.push({ kind: "checkin", title: `${late} member${late > 1 ? "s have" : " has"} not answered "${CI[o.key].title}"`, sub: `Closes ${dmyDay(o.close)}`, href: "/dashboard" });
    }
  } else {
    for (const o of open)
      if (!answered.get(u.id)?.has(o.id)) notices.push({ kind: "checkin", title: `${CI[o.key].title} is open`, sub: `Answer by ${dmyDay(o.close)}`, href: `/checkins?key=${o.key}` });
  }

  const nav: NavItem[] = u.role === "admin"
    ? [{ href: "/dashboard", label: "Dashboard", icon: "dashboard" }, { href: "/team", label: "Team", icon: "team" }, { href: "/profile", label: "Settings", icon: "profile" }]
    : [{ href: "/home", label: "Home", icon: "dashboard" }, { href: "/checkins", label: "Check-ins", icon: "checkins" }, ...(u.rank >= 2 ? [{ href: "/team", label: "My team", icon: "team" } as NavItem] : []), { href: "/profile", label: "My profile", icon: "profile" }];

  const { y, m } = parseDay(T);
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

  return (
    <div className="shell">
      <aside className="side">
        <Brand />
        <NavLinks items={nav} />
        <div className="cyclecard">This month<b>1 {MONTHS[m]} – {last} {MONTHS[m]} {y}</b>NeoLife counts PV by the normal calendar month.<br /><br />{teamLine(T, monthLabel)}</div>
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
