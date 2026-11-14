import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { mailboxEnabled } from "@/lib/mail";
import { isDay, realToday, today } from "@/lib/clock";
import { runDailyJob } from "@/lib/reminders";
import { CI, KEYS, dmyDay, stateOf } from "@/lib/checkins";

export const metadata = { title: "Test clock" };
export const dynamic = "force-dynamic";

async function setDay(f: FormData) {
  "use server";
  if (!mailboxEnabled()) return;
  const v = String(f.get("day") ?? "");
  const jar = await cookies();
  if (isDay(v)) jar.set("tp_today", v, { path: "/", httpOnly: true, sameSite: "lax" });
  else jar.delete("tp_today");
  redirect("/dev/clock");
}

async function runJob() {
  "use server";
  if (!mailboxEnabled()) return;
  await runDailyJob(await today());
  redirect("/dev/clock?ran=1");
}

// Test tool: moves "today" so you can watch check-in windows open and close, and runs the daily email job by hand.
export default async function Clock({ searchParams }: { searchParams: Promise<{ ran?: string }> }) {
  if (!mailboxEnabled()) notFound();
  const T = await today(), real = realToday(), { ran } = await searchParams;
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px" }}>
      <h1>Test clock</h1>
      <p className="sub">Only for testing. In production this page does not exist and the real date is always used.</p>
      <section className="card" style={{ marginTop: 14 }}>
        <p>Today in TeamPulse: <b>{dmyDay(T)}</b>{T === real ? " (the real date)" : ` (real date: ${dmyDay(real)})`}</p>
        <form action={setDay} className="inline"><input type="date" name="day" defaultValue={T} /><button className="btn sm primary" type="submit">Use this date</button><button className="btn sm" type="submit" name="day" value="">Use the real date</button></form>
      </section>
      <section className="card" style={{ marginTop: 14 }}>
        <h3>Questions today</h3>
        {KEYS.map((k) => { const s = stateOf(k, T); return <div key={k} className="row"><div className="grow"><b>{CI[k].title}</b><div className="sub">{s.state === "open" ? `Open until ${dmyDay(s.occ.close)}` : `Opens ${dmyDay(s.next.open)}`}</div></div><span className={`pill ${s.state === "open" ? "warn" : ""}`}>{s.state === "open" ? "Open" : "Locked"}</span></div>; })}
      </section>
      <section className="card" style={{ marginTop: 14 }}>
        <h3>Daily email job</h3>
        <p className="sub">On the live site this runs by itself every morning. Here you run it by hand for the date above. Nothing is sent twice.</p>
        <form action={runJob}><button className="btn primary" type="submit">Run the daily job now</button></form>
        {ran && <p className="hint good">Done. Read the emails at <a className="link" href="/dev/mailbox">the test mailbox</a>.</p>}
      </section>
    </div>
  );
}
