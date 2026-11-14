import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { today } from "@/lib/clock";
import { realToday } from "@/lib/clock";
import { answersOf, dropOf } from "@/lib/answers";
import { CI, dmyDay, monthLabel, monthOccs, parseDay, progress, stateOf } from "@/lib/checkins";
import { teamMembers, teamName } from "@/lib/users";
import { RANKS, firstName, rankName } from "@/lib/rules";
import { dmy } from "@/lib/format";
import { Avatar } from "@/components/Avatar";

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
  const ppvAns = mine.find((a) => a.occ === occs.find((o) => o.key === "ppv")!.id)?.answers;
  const ppv = typeof ppvAns?.ppv === "number" ? ppvAns.ppv : null, qpv = typeof ppvAns?.qpv === "number" ? ppvAns.qpv : null;
  const next = u.rank < RANKS.length - 1 ? RANKS[u.rank + 1] : null;
  const pctN = next && qpv != null ? Math.min(100, Math.round((qpv / next.qpv) * 100)) : 0;
  const drop = mine.map(dropOf).filter((d): d is NonNullable<typeof d> => !!d && d.date >= T).sort((a, b) => (a.date < b.date ? -1 : 1))[0];
  const { y, m } = parseDay(T);

  return (
    <>
      <div className="hello">
        <div><h1>Welcome, {firstName(u.name)}!</h1><p className="sub">{monthLabel(y, m)} · {rankName(u.rank)}{pg.due ? ` · ${pg.done} of ${pg.due} check-ins answered` : ""}</p></div>
        <Link className="btn primary" href="/checkins">Open my check-ins</Link>
      </div>
      <div className="grid g-att">
        <section className="card"><h3>My month</h3>
          <div className="kv"><div><div className="k">PPV</div><div className="v">{ppv == null ? "Not reported" : ppv.toLocaleString("en-US")}</div></div><div><div className="k">QPV</div><div className="v">{qpv == null ? "Not reported" : qpv.toLocaleString("en-US")}</div></div></div>
          {ppv != null && ppv < 100 && <p className="hint warn" style={{ margin: "0 0 8px" }}>{ppv} PPV is under the 100 minimum, so you are not active for bonuses this month.</p>}
          {ppv != null && ppv >= 100 && <span className="pill good">Active, 100+ PPV</span>}
          {next && <><div className="sub" style={{ marginTop: 12 }}>Next: {next.name} at {next.qpv.toLocaleString("en-US")} QPV with 100 PPV</div><div className="meter"><i style={{ width: `${pctN}%` }} /></div><div className="sub">{pctN}% of the way</div></>}
        </section>
        <section className="card"><h3>Check-ins this month</h3>
          {occs.map((o) => {
            const st = stateOf(o.key, T), open = st.state === "open", cur = open ? st.occ : o, ans = answered.has(cur.id);
            return (
              <div className="todo" key={o.id}>
                <div className="grow"><div className="name" style={{ fontWeight: 700 }}>{CI[o.key].title}</div><div className="sub">The {CI[o.key].day}</div></div>
                {open ? <span className={`pill ${ans ? "good" : "warn"}`}>{ans ? "Answered" : `Open until ${dmyDay(st.occ.close)}`}</span>
                  : o.close < T ? (o.close < since && !answered.has(o.id) ? <span className="pill">Before you joined</span> : <span className={`pill ${answered.has(o.id) ? "good" : "bad"}`}>{answered.has(o.id) ? "Answered" : "Missed"}</span>)
                  : <span className="pill">Opens {dmyDay(o.open)}</span>}
                {open && <Link className={`btn sm ${ans ? "" : "primary"}`} href={`/checkins?key=${o.key}`}>{ans ? "Review" : "Answer now"}</Link>}
              </div>
            );
          })}
        </section>
        <section className="card"><h3>Money dropping</h3>
          {drop ? <><div className="name" style={{ fontWeight: 700, fontSize: "1.4rem" }}>{money(drop.amount)}</div><div className="sub">on {dmyDay(drop.date)}. Your team leader plans your PPV order around it.</div></>
            : <div className="empty">Report your payout in the 10th check-in and it shows here.</div>}
        </section>
        <section className="card">
          <div className="inline"><Avatar user={u} size="lg" />
            <div><h3 style={{ margin: 0 }}>{u.name}</h3><div className="sub">TeamPulse ID <span className="mono">{u.tpId}</span> · NeoLife ID <span className="mono">{u.neoId}</span></div></div></div>
          <div className="kv" style={{ marginTop: 14 }}>
            <div><div className="k">Sponsor</div><div className="v">{sponsor?.name ?? "—"}</div></div>
            <div><div className="k">Team</div><div className="v">{team}</div></div>
            <div><div className="k">Joined</div><div className="v">{dmy(u.joinedAt)}</div></div>
          </div>
          <p style={{ marginTop: 14 }}><Link className="btn" href="/profile">Edit my profile</Link>{(!u.photo || !u.phone || !u.city) && <span className="sub" style={{ marginLeft: 10 }}>Add your {[!u.photo && "picture", !u.phone && "phone", !u.city && "city"].filter(Boolean).join(", ")}.</span>}</p>
        </section>
      </div>
    </>
  );
}
