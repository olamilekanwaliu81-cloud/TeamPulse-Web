import { requireUser } from "@/lib/auth";
import { rankName } from "@/lib/rules";
import { teamMembers, teamName, scopeFor } from "@/lib/users";
import { TZ, realToday, today } from "@/lib/clock";
import { Icon } from "@/components/Icons";
import { answeredSets } from "@/lib/answers";
import { CI, dmyDay, monthLabel, openToday, parseDay, teamLine } from "@/lib/checkins";
import { teamClaims, claimsBy } from "@/lib/claims";
import { monthStats, recommendations } from "@/lib/stats";
import { rankName as rn } from "@/lib/rules";
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
  const claims = u.role === "admin" ? (await teamClaims(u.teamId)).filter((c) => c.state === "review" || c.state === "ready") : [];
  if (u.role === "admin") {
    for (const c of claims) {
      const by = all.find((m) => m.id === c.byUser);
      notices.push({ kind: "signup", title: `${by?.name ?? "Someone"} reported ${c.count} new sign-up${c.count > 1 ? "s" : ""}`, sub: c.state === "ready" ? "Details received. Ready to add." : "Waiting for your review", href: "/signups" });
    }
    const recs = await recommendations(u.teamId, all, await monthStats(u.teamId, all, T));
    for (const r of recs) notices.push({ kind: "rank", title: `${r.user.name} may be ready for ${rn(r.to)}`, sub: `PPV ${r.stat.ppv} · QPV ${r.stat.qpv}`, href: "/dashboard" });
    for (const m of mine.filter((x) => x.status === "invited"))
      notices.push({ kind: "invite", title: `${m.name} has not created a login yet`, sub: `ID ${m.tpId}`, href: "/dashboard" });
    for (const o of open) {
      const late = active.filter((m) => !answered.get(m.id)?.has(o.id)).length;
      if (late) notices.push({ kind: "checkin", title: `${late} member${late > 1 ? "s have" : " has"} not answered "${CI[o.key].title}"`, sub: `Closes ${dmyDay(o.close)}`, href: "/dashboard" });
    }
  } else {
    for (const c of (await claimsBy(u.id)).filter((x) => x.state === "details_asked"))
      notices.push({ kind: "signup", title: "Your team leader needs details of your new sign-up", sub: "Tap to send them", href: `/signups/${c.id}/details` });
    for (const o of open)
      if (!answered.get(u.id)?.has(o.id)) notices.push({ kind: "checkin", title: `${CI[o.key].title} is open`, sub: `Answer by ${dmyDay(o.close)}`, href: `/checkins?key=${o.key}` });
  }

  const nav: NavItem[] = u.role === "admin"
    ? [{ href: "/dashboard", label: "Dashboard", icon: "dashboard" }, { href: "/team", label: "Team", icon: "team" }, { href: "/signups", label: "Sign-ups", icon: "signups", badge: claims.length }, { href: "/profile", label: "Settings", icon: "profile" }]
    : [{ href: "/home", label: "Home", icon: "dashboard" }, { href: "/checkins", label: "Check-ins", icon: "checkins" }, { href: "/signups", label: "Report a sign-up", icon: "signups" }, ...(u.rank >= 2 ? [{ href: "/team", label: "My team", icon: "team" } as NavItem] : []), { href: "/profile", label: "My profile", icon: "profile" }];

  const canSearch = u.role === "admin" || u.rank >= 2;
  const { y, m } = parseDay(T);
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

  return (
    <div className="shell">
      <aside className="side">
        <Brand />
        <NavLinks items={nav} />
        <div className="cyclecard"><span className="cc-ic"><Icon name="calendar" /></span>This month<b>1 {MONTHS[m]} – {last} {MONTHS[m]} {y}</b>NeoLife counts PV by the normal calendar month. Every month you need 100 PPV and your title&apos;s QPV to stay qualified.<br /><br />{teamLine(T, monthLabel)}</div>
      </aside>
      <div className="content">
        <header className="top">
          {canSearch ? (
            <form className="search" action="/team" role="search">
              <Icon name="search" />
              <input name="q" type="search" placeholder="Search members, TeamPulse ID or NeoLife ID" aria-label="Search members" />
            </form>
          ) : <span className="search" style={{ visibility: "hidden" }} />}
          <TopBar
            clock={{ today: T, tz: TZ, isTest: T !== realToday() }}
            notices={notices}
            person={{ id: u.id, name: u.name, photo: u.photo, tpId: u.tpId, role: u.role === "admin" ? "Team leader" : rankName(u.rank), subtitle: u.role === "admin" ? `Team leader · ${team}` : rankName(u.rank) }}
          />
        </header>
        <main id="main">{children}</main>
      </div>
    </div>
  );
}
