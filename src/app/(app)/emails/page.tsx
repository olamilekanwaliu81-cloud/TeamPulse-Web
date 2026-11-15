import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { teamMail, tallies } from "@/lib/mail-stats";
import { pct } from "@/lib/mail-kinds";
import { notDelivered, trackingOn } from "@/lib/mail";
import { ago } from "@/lib/format";

export const metadata = { title: "Email activity" };

export default async function Emails() {
  const u = await requireAdmin();
  const items = await teamMail(u.teamId, 30);
  const rows = tallies(items);
  return (
    <>
      <div className="head"><div><h2>Email activity</h2><p className="sub" style={{ margin: "2px 0 0" }}>The last 30 days: which emails were opened and which buttons were clicked.</p></div>
        <Link className="btn" href="/dashboard">Back to dashboard</Link></div>
      {!trackingOn() && <p className="hint bad" style={{ marginTop: 12 }}>Tracking is switched off (EMAIL_TRACKING=0), so opens and clicks are not counted.</p>}
      <section className="card" style={{ marginTop: 12 }}>
        <h3>By kind of email</h3>
        {rows[0].sent === 0 ? <div className="empty">No emails sent in the last 30 days.</div> : (
          <div className="scroll"><table>
            <thead><tr><th>Kind</th><th className="num">Sent</th><th className="num">Opened</th><th className="num">Clicked the button</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.kind}><td style={{ fontWeight: r.kind === "All emails" ? 700 : 500 }}>{r.kind}</td><td className="num">{r.sent}</td>
                <td className="num">{r.opened} <span className="sub">({pct(r.opened, r.sent)})</span></td><td className="num">{r.clicked} <span className="sub">({pct(r.clicked, r.sent)})</span></td></tr>))}</tbody>
          </table></div>
        )}
        <p className="hint" style={{ marginTop: 10 }}>Clicks are the reliable number. Opens are a guide: some mail apps hide opens, and some load every email automatically, so they can be too low or too high. A click also counts as an open.</p>
      </section>
      <section className="card" style={{ marginTop: 16 }}>
        <h3>Recent emails</h3>
        {items.length === 0 ? <div className="empty">Nothing yet.</div> : (
          <div className="scroll"><table>
            <thead><tr><th>To</th><th>Subject</th><th>Sent</th><th>Opened</th><th>Clicked</th></tr></thead>
            <tbody>{items.slice(0, 50).map((m) => (
              <tr key={m.id}>
                <td><div style={{ fontWeight: 600 }}>{m.name || m.to}</div><div className="sub">{m.name ? m.to : ""}</div></td>
                <td>{m.subject}</td>
                <td>{notDelivered(m.status) ? <span className="pill bad">Not delivered</span> : ago(m.at)}</td>
                <td>{m.opens > 0 || m.clicks > 0 ? <span className="pill good">{m.openedAt ? ago(m.openedAt) : "Yes"}</span> : <span className="sub">—</span>}</td>
                <td>{m.clicks > 0 ? <span className="pill good">{m.clicks > 1 ? `${m.clicks} times` : "Yes"}</span> : <span className="sub">—</span>}</td>
              </tr>))}</tbody>
          </table></div>
        )}
      </section>
    </>
  );
}
