import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { TZ, realToday, today } from "@/lib/clock";
import { answersOf, dropOf } from "@/lib/answers";
import { CI, dmyDay, monthLabel, monthOccs, parseDay, progress, stateOf } from "@/lib/checkins";
import { teamMembers, teamName } from "@/lib/users";
import { monthStats } from "@/lib/stats";
import { RANKS, firstName, pvText, rankName } from "@/lib/rules";
import { monthStatus, nextRank, statusText } from "@/lib/ranks";
import { dmy } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { PanelTitle, RankLadder, StatCard, WeekPanel, greeting } from "@/components/ui";

export const metadata = { title: "Home" };
const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

export default async function Home() {
  const u = await requireUser();
  const T = await today();
  const [team, all, mine] = await Promise.all([teamName(u.teamId), teamMembers(u.teamId), answersOf(u.id)]);
  const sponsor = all.find((m) => m.id === u.sponsorId);
  const answered = new Set(mine.map((a) => a.occ));
  const since = realToday(u.joinedAt), pg = progress(answered, T, since);
  const occs = monthOccs(T);
  // Only what was confirmed on the 28th counts. The plan from the 14th is shown beside it as "planned".
  const stat = (await monthStats(u.teamId, all, T)).get(u.id);
  const ppv = stat?.ppv ?? null, qpv = stat?.qpv ?? null, ppvPlan = stat?.ppvPlan ?? null, qpvPlan = stat?.qpvPlan ?? null;
  const status = monthStatus({ role: u.role, rank: u.rank, ppv, qpv });
  const tx = statusText({ rank: u.rank, ppv, qpv }, status, ppvPlan);
  const next = nextRank(u.rank), need = RANKS[u.rank].qpv;
  const pctN = next && qpv != null ? Math.min(100, Math.round((qpv / next.qpv) * 100)) : 0;
  const drop = mine.map(dropOf).filter((d): d is NonNullable<typeof d> => !!d && d.date >= T).sort((a, b) => (a.date < b.date ? -1 : 1))[0];
  const { y, m } = parseDay(T);
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(new Date()));

  return (
    <>
      <div className="hello">
        <div className="greet"><h1>{greeting(hour)}, {firstName(u.name)}! 👋</h1><p>{team} · {monthLabel(y, m)}{pg.due ? ` · ${pg.done} of ${pg.due} check-ins answered` : ""}</p></div>
        <Link className="btn primary" href="/checkins">Open my check-ins</Link>
      </div>

      <div className="statrow">
        <StatCard icon="star" tone="blue" label="My title" value={rankName(u.rank)} note={u.rank >= 1 ? "Kept for good once earned" : "Your first title is Manager"} />
        <StatCard icon="circleCheck" tone={status.state === "qualified" ? "green" : status.state === "title_only" ? (status.noPpv ? "red" : "orange") : "purple"} label="This month" value={status.state === "qualified" ? "Qualified" : status.state === "title_only" ? (status.noPpv ? "No bonus" : "Title only") : ppvPlan != null ? "Pending" : "No PPV yet"} note={status.state === "qualified" ? (status.rate ? `Bonus level ${status.rate}%` : "You met this month's targets") : status.state === "title_only" ? (status.noPpv ? "Under 100 PPV" : status.rate ? `Earning ${status.rate}% this month` : "QPV under 250") : ppvPlan != null ? "Confirm it on the 28th" : "Answer the 14th check-in"} />
        <StatCard icon="bolt" tone="purple" label="My PPV" value={pvText(ppv, ppvPlan)} note={ppv == null && ppvPlan != null ? "Counts once you confirm it on the 28th" : "100 needed every month"} />
        <StatCard icon="users" tone="orange" label="My team QPV" value={pvText(qpv, qpvPlan)} note={qpv == null && qpvPlan != null ? "Counts once you confirm it on the 28th" : u.rank >= 1 ? `${need.toLocaleString("en-US")} needed for ${rankName(u.rank)}` : "Includes your own PPV"} />
      </div>

      <div className={status.state === "qualified" ? "rule" : "notice bad"} role="status" style={status.state === "title_only" && !status.noPpv ? { background: "var(--orange-soft)", borderColor: "var(--orange)" } : status.state === "unreported" ? { background: "var(--accent-soft)", borderColor: "var(--accent)" } : undefined}>
        <b style={{ color: tx.tone === "good" ? "var(--accent)" : tx.tone === "warn" ? "var(--warn)" : tx.tone === "bad" ? "var(--bad)" : "var(--accent)" }}>{tx.headline}.</b> {tx.detail}
      </div>

      <div className="dgrid">
        <section className="card c5"><PanelTitle href="/checkins" link="Open">Check-ins this month</PanelTitle>
          {occs.map((o) => {
            const st = stateOf(o.key, T), open = st.state === "open", cur = open ? st.occ : o, ans = answered.has(cur.id);
            return (
              <div className="todo" key={o.id}>
                <div className="grow"><div className="name" style={{ fontWeight: 700 }}>{CI[o.key].title}</div><div className="sub">The {CI[o.key].day}</div></div>
                {open ? <span className={`pill ${ans ? "good" : "warn"}`}>{ans ? "Answered" : `Open until ${dmyDay(st.occ.close).replace(/ \d{4}$/, "")}`}</span>
                  : o.close < T ? (o.close < since && !answered.has(o.id) ? <span className="pill">Before you joined</span> : <span className={`pill ${answered.has(o.id) ? "good" : "bad"}`}>{answered.has(o.id) ? "Answered" : "Missed"}</span>)
                  : <span className="pill">Opens {dmyDay(o.open).replace(/ \d{4}$/, "")}</span>}
                {open && <Link className={`btn sm ${ans ? "" : "primary"}`} href={`/checkins?key=${o.key}`}>{ans ? "Review" : "Answer now"}</Link>}
              </div>
            );
          })}
        </section>
        <section className="card c4"><PanelTitle>This week</PanelTitle><WeekPanel today={T} /></section>
        <section className="card c3"><PanelTitle>Next title</PanelTitle>
          {next ? <><div className="sub">{next.name} at {next.qpv.toLocaleString("en-US")} QPV with 100 PPV in one month</div>
            <div className="track" style={{ margin: "12px 0 6px" }}><i style={{ width: `${pctN}%`, background: "var(--accent)" }} /></div><div className="sub">{pctN}% of the way this month</div></>
            : <div className="sub">Director follows its own rules.</div>}
          <h3 style={{ margin: "18px 0 8px" }}>Money dropping</h3>
          {drop ? <><div className="name" style={{ fontWeight: 800, fontSize: "1.5rem" }}>{money(drop.amount)}</div><div className="sub">on {dmyDay(drop.date)}. Your team leader plans your PPV order around it.</div></>
            : <div className="empty">Report your payout in the 10th check-in and it shows here.</div>}
        </section>
      </div>

      <section className="card" style={{ maxWidth: 720 }}><PanelTitle>The stages</PanelTitle><p className="sub" style={{ margin: "-6px 0 10px" }}>What each stage needs every month to be Qualified, and the bonus level it earns.</p><RankLadder rank={u.rank} /></section>

      <section className="card" style={{ maxWidth: 720 }}>
        <div className="inline"><Avatar user={u} size="lg" />
          <div><h3 style={{ margin: 0 }}>{u.name}</h3><div className="sub">TeamPulse ID <span className="mono">{u.tpId}</span> · NeoLife ID <span className="mono">{u.neoId}</span></div></div></div>
        <div className="kv" style={{ marginTop: 14 }}>
          <div><div className="k">Sponsor</div><div className="v">{sponsor?.name ?? "—"}</div></div>
          <div><div className="k">Team</div><div className="v">{team}</div></div>
          <div><div className="k">Joined</div><div className="v">{dmy(u.joinedAt)}</div></div>
        </div>
        <p style={{ marginTop: 14 }}><Link className="btn" href="/profile">Edit my profile</Link>{(!u.photo || !u.phone || !u.city) && <span className="sub" style={{ marginLeft: 10 }}>Add your {[!u.photo && "picture", !u.phone && "phone", !u.city && "city"].filter(Boolean).join(", ")}.</span>}</p>
      </section>
    </>
  );
}
