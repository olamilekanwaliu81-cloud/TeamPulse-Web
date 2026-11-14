import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { claimsBy, isOpen, stateText, teamClaims } from "@/lib/claims";
import { teamMembers } from "@/lib/users";
import { firstName } from "@/lib/rules";
import { ago } from "@/lib/format";
import { ActionForm } from "@/components/ActionForm";
import { askDetails, dismissClaim, reportSignup } from "@/app/actions/claims";

export const metadata = { title: "Sign-ups" };

export default async function Signups() {
  const u = await requireUser();

  if (u.role !== "admin") {
    const mine = await claimsBy(u.id);
    return (
      <>
        <section className="card" style={{ maxWidth: 560 }}>
          <h2>Report a sign-up</h2>
          <p className="sub">Got a new sign-up? Tell your team leader now. You do not need to wait for the 25th. Your leader adds them, and they get their own TeamPulse ID.</p>
          <ActionForm action={reportSignup} submit="Tell my team leader">
            <div className="field"><label htmlFor="rp-n">Name of the new person (if you know it)</label><input id="rp-n" name="who" type="text" /></div>
            <div className="field"><label htmlFor="rp-c">How many people?</label><input id="rp-c" name="count" type="number" min="1" max="50" defaultValue={1} /></div>
          </ActionForm>
        </section>
        {mine.length > 0 && (
          <section className="card" style={{ marginTop: 16, maxWidth: 560 }}>
            <h3>Your reports</h3>
            <div className="rows">{mine.map((c) => (
              <div className="row" key={c.id}>
                <div className="grow"><div className="name">{c.count} sign-up{c.count > 1 ? "s" : ""}{c.who ? ` · ${c.who}` : ""}</div><div className="sub">{ago(c.createdAt)}</div></div>
                {c.state === "details_asked" ? <Link className="btn sm primary" href={`/signups/${c.id}/details`}>Send details</Link> : <span className={`pill ${c.state === "added" ? "good" : ""}`}>{stateText[c.state]}</span>}
              </div>))}</div>
          </section>
        )}
      </>
    );
  }

  const [claims, all] = await Promise.all([teamClaims(u.teamId), teamMembers(u.teamId)]);
  const byId = new Map(all.map((m) => [m.id, m]));
  const open = claims.filter(isOpen), done = claims.filter((c) => !isOpen(c));
  return (
    <>
      <div className="head"><div><h2>Sign-ups</h2><p className="sub" style={{ margin: "2px 0 0" }}>Your members report their sign-ups here. You decide who joins the team.</p></div>
        <Link className="btn primary" href="/team/add">Add a member</Link></div>
      <section className="card" style={{ marginTop: 12 }}>
        <h3>Waiting for you</h3>
        {open.length === 0 ? <div className="empty">No reports waiting.</div> : (
          <div className="rows">{open.map((c) => {
            const by = byId.get(c.byUser);
            return (
              <div className="row" key={c.id}>
                <div className="grow">
                  <div className="name">{by?.name ?? "Someone"} reports {c.count} sign-up{c.count > 1 ? "s" : ""}{c.who ? ` · ${c.who}` : ""}</div>
                  <div className="sub">{ago(c.createdAt)} · {c.state === "ready" ? "Details received, ready to add" : c.state === "details_asked" ? `Waiting for ${by ? firstName(by.name) : "them"}'s details` : "Waiting for your review"}</div>
                </div>
                <Link className="btn sm primary" href={`/team/add?claim=${c.id}`}>Add this person</Link>
                {c.state === "review" && <form action={askDetails}><input type="hidden" name="id" value={c.id} /><button className="btn sm" type="submit">Ask for details</button></form>}
                <form action={dismissClaim}><input type="hidden" name="id" value={c.id} /><button className="btn sm bad" type="submit">Dismiss</button></form>
              </div>);
          })}</div>
        )}
      </section>
      {done.length > 0 && (
        <section className="card" style={{ marginTop: 16 }}>
          <h3>Done</h3>
          <div className="rows">{done.slice(0, 8).map((c) => (
            <div className="row" key={c.id}><div className="grow"><div className="name">{byId.get(c.byUser)?.name ?? "Someone"} · {c.count}</div><div className="sub">{ago(c.createdAt)}</div></div>
              <span className={`pill ${c.state === "added" ? "good" : ""}`}>{c.state === "added" ? "Added" : "Dismissed"}</span></div>))}</div>
        </section>
      )}
    </>
  );
}
