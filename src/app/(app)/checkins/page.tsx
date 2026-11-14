import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { today } from "@/lib/clock";
import { answersOf } from "@/lib/answers";
import { realToday } from "@/lib/clock";
import { CI, KEYS, OPEN_BEFORE, CLOSE_AFTER, dmyDay, isKey, monthLabel, parseDay, stateOf, type Key } from "@/lib/checkins";
import { firstName } from "@/lib/rules";
import { ActionForm } from "@/components/ActionForm";
import { EarnFields, PpvFields, PlanFields } from "@/components/CheckinFields";
import { saveCheckin } from "@/app/actions/checkins";
import Link from "next/link";

export const metadata = { title: "Check-ins" };

export default async function Checkins({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const u = await requireUser();
  if (u.role !== "member") redirect("/dashboard");
  const T = await today();
  const mine = await answersOf(u.id);
  const byOcc = new Map(mine.map((a) => [a.occ, a]));
  const { key: wanted } = await searchParams;
  const states = Object.fromEntries(KEYS.map((k) => [k, stateOf(k, T)])) as Record<Key, ReturnType<typeof stateOf>>;
  const firstOpen = KEYS.find((k) => { const s = states[k]; return s.state === "open" && !byOcc.has(s.occ.id); });
  const key: Key = isKey(wanted) ? wanted : (firstOpen ?? KEYS[0]);
  const c = CI[key], st = states[key];
  const a = st.state === "open" ? byOcc.get(st.occ.id)?.answers ?? {} : {};
  const since = realToday(u.joinedAt);
  const lastMissed = st.state === "locked" && st.last && st.last.close >= since && !byOcc.has(st.last.id);

  return (
    <>
      <div className="head"><div><h2>Check-ins</h2><p className="sub" style={{ margin: "2px 0 0" }}>Each question opens {OPEN_BEFORE} days before its date and closes {CLOSE_AFTER} days after.</p></div></div>
      <div className="ci-layout">
        <div className="ci-list">
          {KEYS.map((k) => {
            const s = states[k], open = s.state === "open", ans = open && byOcc.has(s.occ.id);
            const missed = !open && s.state === "locked" && s.last && s.last.close >= since && !byOcc.has(s.last.id);
            return (
              <Link key={k} className="ci-item" href={`/checkins?key=${k}`} aria-pressed={key === k} prefetch={false}>
                <span className={`pill ${open ? (ans ? "good" : "warn") : ""}`}>{open ? (ans ? "Answered" : "Open") : "Locked"}</span>
                <b>{CI[k].title}</b>
                <span className="sub">The {CI[k].day} · {open ? `Open until ${dmyDay(s.occ.close)}` : `Opens ${dmyDay(s.state === "locked" ? s.next.open : "")}`}</span>
                {missed && s.state === "locked" && s.last && <span className="sub" style={{ color: "var(--bad)" }}>Missed on {dmyDay(s.last.date)}</span>}
              </Link>
            );
          })}
        </div>
        <section className="card">
          {st.state === "locked" ? (
            <div className="mail">
              <div className="meta">Question date: the {c.day}</div>
              <div className="subj">{c.title} is not open yet</div>
              <p>This check-in opens on <b>{dmyDay(st.next.open)}</b>, {OPEN_BEFORE} days before the {c.day}. You can answer until <b>{dmyDay(st.next.close)}</b>, {CLOSE_AFTER} days after.</p>
              {lastMissed && st.last && <p style={{ color: "var(--bad)" }}>The last one ({dmyDay(st.last.date)}) closed on {dmyDay(st.last.close)} without an answer.</p>}
            </div>
          ) : (
            <>
              <div className="mail">
                <div className="meta">{c.title} · open {dmyDay(st.occ.open)} to {dmyDay(st.occ.close)}</div>
                <div className="subj">{c.subject}</div>
                <p>Hi {firstName(u.name)}, {c.body}</p>
                <p className="meta">It takes about two minutes. Your answer counts for the {c.day}, even if you send it a few days late (until {dmyDay(st.occ.close)}).</p>
              </div>
              <ActionForm key={st.occ.id} action={saveCheckin} submit={key === "plan" ? "Save my plan" : "Save my answers"}>
                <input type="hidden" name="key" value={key} />
                {key === "earn" && <EarnFields a={a} />}
                {key === "ppv" && <PpvFields a={a} />}
                {key === "plan" && <PlanFields a={a} monthName={monthLabel(parseDay(st.occ.date).y, parseDay(st.occ.date).m + 1)} />}
                {key === "paid" && (
                  <>
                    <div className="lbl" style={{ marginBottom: 8 }}>Have you paid your monthly responsibility?</div>
                    <div className="yn">
                      <label><input type="radio" name="paid" value="yes" defaultChecked={a.paid === true} /> Yes, paid</label>
                      <label><input type="radio" name="paid" value="no" defaultChecked={a.paid === false} /> Not yet</label>
                    </div>
                  </>
                )}
                {key === "signup" && (
                  <>
                    <div className="lbl" style={{ marginBottom: 8 }}>Did you sign anyone this month?</div>
                    <div className="yn" style={{ marginBottom: 14 }}>
                      <label><input type="radio" name="su" value="yes" defaultChecked={a.su === "yes"} /> Yes</label>
                      <label><input type="radio" name="su" value="no" defaultChecked={a.su === "no"} /> No</label>
                    </div>
                    <div className="field"><label htmlFor="s-n">If yes, how many?</label><input id="s-n" name="count" type="number" min="1" defaultValue={typeof a.count === "number" ? a.count : 1} /><span className="hint">Your team leader reviews it and may ask you for their details.</span></div>
                    <div className="lbl" style={{ marginBottom: 6 }}>Step-ups in your team this month</div>
                    <div className="counters" style={{ marginBottom: 14 }}>
                      {["Managers", "Senior Managers", "Executive Managers", "Directors"].map((x, i) => (
                        <div key={x}><label htmlFor={`st${i}`} className="sub">{x}</label><input id={`st${i}`} name={`st${i}`} type="number" min="0" defaultValue={Array.isArray(a.steps) ? Number(a.steps[i] ?? 0) : 0} /></div>
                      ))}
                    </div>
                    <div className="lbl" style={{ marginBottom: 8 }}>Did you buy any tools this month?</div>
                    <div className="yn" style={{ marginBottom: 14 }}>
                      <label><input type="radio" name="tools" value="yes" defaultChecked={a.tools === "yes"} /> Yes</label>
                      <label><input type="radio" name="tools" value="no" defaultChecked={a.tools !== "yes"} /> No</label>
                    </div>
                  </>
                )}
              </ActionForm>
            </>
          )}
        </section>
      </div>
    </>
  );
}
