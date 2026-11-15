"use client";

import { useState } from "react";

const n = (v: unknown) => (typeof v === "number" ? String(v) : "");

export function EarnFields({ a }: { a: Record<string, unknown> }) {
  const [none, setNone] = useState(a.earn === "none");
  return (
    <>
      <div className="field"><label htmlFor="e-amt">Money made this month (USD)</label>
        <div className="inline"><input id="e-amt" name="amt" type="number" min="0" step="1" defaultValue={n(a.earn)} disabled={none} />
          <label className="inline" style={{ fontWeight: 400 }}><input name="none" type="checkbox" checked={none} onChange={(e) => setNone(e.target.checked)} /> Not yet</label></div></div>
      <div className="field"><label htmlFor="e-ord">Active orders on your account right now</label><input id="e-ord" name="orders" type="number" min="0" defaultValue={n(a.orders)} /></div>
      <div className="field"><label htmlFor="e-del">Orders delivered and accepted this month</label><input id="e-del" name="delivered" type="number" min="0" defaultValue={n(a.delivered)} /></div>
      <div className="field"><label htmlFor="e-drop">Amount that will drop into your account (USD)</label><input id="e-drop" name="drop" type="number" min="0" step="1" defaultValue={n(a.drop)} /></div>
      <div className="field"><label htmlFor="e-clr">Date the money drops and you can withdraw it</label><input id="e-clr" name="clears" type="date" defaultValue={typeof a.clears === "string" ? a.clears : ""} />
        <span className="hint">Your leader uses this date to plan the days for your PPV order.</span></div>
    </>
  );
}

export function PpvFields({ a }: { a: Record<string, unknown> }) {
  const [ppv, setPpv] = useState(n(a.ppv));
  const [none, setNone] = useState(false);
  const v = ppv === "" ? null : Number(ppv);
  return (
    <>
      <div className="field"><label htmlFor="p-ppv">PPV you plan to do this month</label>
        <input id="p-ppv" name="ppv" type="number" min="0" value={ppv} onChange={(e) => setPpv(e.target.value)} />
        <span className={`hint ${v == null ? "" : v < 100 ? "bad" : "good"}`}>{v == null ? "NeoLife asks for 100 PPV to stay active. This is your plan: we will ask you on the 28th if you did it." : v < 100 ? `${v} PPV is under the 100 needed. You would be "Title only" this month, with no bonus.` : `${v} PPV. You meet the 100 needed.`}</span></div>
      <div className="field"><label htmlFor="p-qpv">Team QPV you plan to reach this month</label>
        <div className="inline"><input id="p-qpv" name="qpv" type="number" min="0" defaultValue={n(a.qpv)} disabled={none} />
          <label className="inline" style={{ fontWeight: 400 }}><input name="none" type="checkbox" checked={none} onChange={(e) => setNone(e.target.checked)} /> None yet, I have no downline</label></div>
        <span className="hint">If you have no downline, your QPV is just your PPV. We will ask you on the 28th if your team reached it.</span></div>
    </>
  );
}

/** The 28th. Said yes: the planned number is recorded. Said no: they type what they really did. */
export function ConfirmFields({ a, planned, what }: { a: Record<string, unknown>; planned: number | null; what: "PPV" | "QPV" }) {
  const [done, setDone] = useState<"yes" | "no" | "">(a.done === true ? "yes" : a.done === false ? "no" : "");
  const noPlan = planned == null;
  return (
    <>
      {noPlan ? (
        <div className="field"><label htmlFor="c-act">How many {what} did you really do this month?</label>
          <input id="c-act" name="actual" type="number" min="0" defaultValue={n(a.actual)} />
          <span className="hint">You did not give a {what} plan on the 14th, so just tell us the number.</span></div>
      ) : (
        <>
          <div className="lbl" style={{ marginBottom: 8 }}>{what === "QPV" ? "Has your team reached" : "Have you done"} the {planned.toLocaleString("en-US")} {what} you said {what === "QPV" ? "it would reach" : "you would do"}?</div>
          <div className="yn" style={{ marginBottom: 14 }}>
            <label><input type="radio" name="done" value="yes" checked={done === "yes"} onChange={() => setDone("yes")} /> {what === "QPV" ? "Yes, we reached" : "Yes, I did"} {planned.toLocaleString("en-US")} {what}</label>
            <label><input type="radio" name="done" value="no" checked={done === "no"} onChange={() => setDone("no")} /> No, it was a different number</label>
          </div>
          {done === "no" && (
            <div className="field"><label htmlFor="c-act">How many {what} did you really do?</label>
              <input id="c-act" name="actual" type="number" min="0" defaultValue={typeof a.actual === "number" && a.done === false ? a.actual : ""} />
              <span className="hint">Only the number you enter here is counted.</span></div>
          )}
        </>
      )}
    </>
  );
}

export function PlanFields({ a, monthName }: { a: Record<string, unknown>; monthName: string }) {
  const start = Array.isArray(a.goals) && a.goals.length ? (a.goals as [string, string][]) : [["I will", ""] as [string, string]];
  const [goals, setGoals] = useState(start);
  const set = (i: number, k: 0 | 1, v: string) => setGoals(goals.map((g, j) => (j === i ? (k === 0 ? [v, g[1]] : [g[0], v]) : g)) as [string, string][]);
  return (
    <>
      <div className="lbl" style={{ marginBottom: 6 }}>My goals for {monthName}</div>
      {goals.map(([p, t], i) => (
        <div className="goal" key={i}>
          <select name="gp" aria-label="Goal starts with" value={p} onChange={(e) => set(i, 0, e.target.value)}><option>I will</option><option>I must</option></select>
          <input name="gt" type="text" aria-label="Goal" value={t} placeholder="what you will do" onChange={(e) => set(i, 1, e.target.value)} />
        </div>
      ))}
      {goals.length < 12 && <button className="btn sm" type="button" onClick={() => setGoals([...goals, ["I will", ""]])} style={{ marginBottom: 16 }}>Add another goal</button>}
      <div className="field"><label htmlFor="pl-s">How many people will you sign?</label><input id="pl-s" name="signups" type="number" min="0" defaultValue={n(a.signups)} /></div>
      <div className="field"><label htmlFor="pl-t">How much do you want to make?</label>
        <select id="pl-t" name="target" defaultValue={typeof a.target === "string" ? a.target : "$0 to $300"}>{["$0 to $300", "$300 to $1,000", "$1,000 and above"].map((x) => <option key={x}>{x}</option>)}</select></div>
      <div className="f2">
        <div className="field"><label htmlFor="pl-p">Your PPV for {monthName}</label><input id="pl-p" name="pp" type="number" min="0" defaultValue={n(a.pp)} /></div>
        <div className="field"><label htmlFor="pl-q">Your QPV for {monthName}</label><input id="pl-q" name="pq" type="number" min="0" defaultValue={n(a.pq)} /></div>
      </div>
    </>
  );
}
