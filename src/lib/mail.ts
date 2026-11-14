import { Resend } from "resend";
import { db } from "./db";

export type Mail = { to: string; name: string; subject: string; html: string; ctaLabel?: string; ctaUrl?: string };

export const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const mailboxEnabled = () => process.env.NODE_ENV !== "production" || process.env.MAILBOX_ENABLED === "1";

/**
 * Every email is saved in mail_log. When RESEND_API_KEY and EMAIL_FROM are set it is also sent for real.
 * Without them (local testing) it is only saved, and you read it at /dev/mailbox.
 */
export async function sendMail(m: Mail): Promise<void> {
  const rows = await db()<{ id: string }[]>`
    insert into mail_log (to_email, to_name, subject, html, cta_label, cta_url)
    values (${m.to}, ${m.name}, ${m.subject}, ${m.html}, ${m.ctaLabel ?? null}, ${m.ctaUrl ?? null}) returning id`;
  const id = rows[0].id;
  const key = process.env.RESEND_API_KEY, from = process.env.EMAIL_FROM;
  if (!key || !from) return;
  try {
    const { data, error } = await new Resend(key).emails.send({ from, to: m.to, subject: m.subject, html: wrap(m) });
    if (error) throw new Error(error.message);
    await db()`update mail_log set status = 'sent', provider_id = ${data?.id ?? null} where id = ${id}`;
  } catch (e) {
    await db()`update mail_log set status = 'failed', error = ${String((e as Error).message ?? e).slice(0, 500)} where id = ${id}`;
    console.error("Email failed:", e);
  }
}

/** The HTML that is actually sent: the message, a button, and a plain-text link under it. */
export function wrap(m: Mail): string {
  const btn = m.ctaLabel && m.ctaUrl
    ? `<p style="margin:22px 0"><a href="${m.ctaUrl}" style="background:#6A5AE0;color:#fff;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:12px;display:inline-block">${m.ctaLabel}</a></p>
       <p style="font-size:13px;color:#686E8E">If the button does not work, copy this link into your browser:<br><span style="word-break:break-all">${m.ctaUrl}</span></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#EEF0F8;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#171C3F">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px"><div style="background:#fff;border-radius:20px;padding:28px">
  <p style="font-weight:800;font-size:18px;margin:0 0 18px;color:#6A5AE0">TeamPulse</p>${m.html}${btn}
  <p style="font-size:12px;color:#686E8E;margin-top:26px">TeamPulse · monthly check-ins for your team</p></div></div></body></html>`;
}
