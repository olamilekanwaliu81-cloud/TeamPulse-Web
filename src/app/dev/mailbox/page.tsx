import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { mailboxEnabled, wrap } from "@/lib/mail";
import { ago } from "@/lib/format";

export const metadata = { title: "Test mailbox" };
export const dynamic = "force-dynamic";

// Shows the emails the app sent, so you can test without an email service. Off in production unless MAILBOX_ENABLED=1.
export default async function Mailbox() {
  if (!mailboxEnabled()) notFound();
  const rows = await db()<{ id: string; to_email: string; to_name: string; subject: string; html: string; cta_label: string | null; cta_url: string | null; status: string; created_at: Date; error: string | null }[]>`
    select * from mail_log order by created_at desc limit 30`;
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px" }}>
      <h1>Test mailbox</h1>
      <p className="sub">Every email TeamPulse sent. Real delivery needs RESEND_API_KEY and EMAIL_FROM in the environment.</p>
      {rows.length === 0 && <p className="sub">No emails yet.</p>}
      {rows.map((m) => (
        <section className="card" key={m.id} style={{ marginTop: 14 }}>
          <b>{m.subject}</b>
          <div className="sub">To {m.to_name} &lt;{m.to_email}&gt; · {ago(m.created_at)} · {m.status}{m.error ? ` (${m.error})` : ""}</div>
          <details style={{ marginTop: 8 }}><summary>Read</summary>
            <iframe title={m.subject} srcDoc={wrap({ to: m.to_email, name: m.to_name, subject: m.subject, html: m.html, ctaLabel: m.cta_label ?? undefined, ctaUrl: m.cta_url ?? undefined })} style={{ width: "100%", height: 520, border: 0, borderRadius: 12, marginTop: 8 }} />
          </details>
          {m.cta_url && <p style={{ marginTop: 8 }}><a className="btn primary" href={m.cta_url.replace(/^https?:\/\/[^/]+/, "")}>{m.cta_label}</a></p>}
        </section>
      ))}
    </div>
  );
}
