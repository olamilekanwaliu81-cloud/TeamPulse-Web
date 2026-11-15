import { Resend } from "resend";
import { db } from "./db";

export type Mail = { to: string; name: string; subject: string; html: string; ctaLabel?: string; ctaUrl?: string };

export const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const mailboxEnabled = () => process.env.NODE_ENV !== "production" || process.env.MAILBOX_ENABLED === "1";

/**
 * Every email is saved in mail_log. When RESEND_API_KEY and EMAIL_FROM are set it is also sent for real.
 * Without them (local testing) it is only saved, and you read it at /dev/mailbox.
 */
export type MailResult = { status: "logged" | "sent" | "failed"; error?: string };

export async function sendMail(m: Mail): Promise<MailResult> {
  const rows = await db()<{ id: string }[]>`
    insert into mail_log (to_email, to_name, subject, html, cta_label, cta_url)
    values (${m.to}, ${m.name}, ${m.subject}, ${m.html}, ${m.ctaLabel ?? null}, ${m.ctaUrl ?? null}) returning id`;
  const id = rows[0].id;
  const key = process.env.RESEND_API_KEY, from = process.env.EMAIL_FROM;
  if (!key || !from) return { status: "logged" }; // saved only: nothing was delivered
  try {
    const { data, error } = await new Resend(key).emails.send({ from, to: m.to, subject: m.subject, html: wrap(m) });
    if (error) throw new Error(error.message);
    await db()`update mail_log set status = 'sent', provider_id = ${data?.id ?? null} where id = ${id}`;
    return { status: "sent" };
  } catch (e) {
    const error = String((e as Error).message ?? e).slice(0, 500);
    await db()`update mail_log set status = 'failed', error = ${error} where id = ${id}`;
    console.error("Email failed:", e);
    return { status: "failed", error };
  }
}

/** In production an email that was only "logged" was never delivered, because the email service is not connected. */
export const notDelivered = (status: string | undefined) => status === "failed" || (status === "logged" && !mailboxEnabled());

/** What went wrong, in words a team leader can act on. */
export function mailProblem(status: string | undefined, error?: string | null): string {
  if (status === "logged") return "Email is not connected on this site yet. Add RESEND_API_KEY and EMAIL_FROM in the site settings.";
  const e = (error ?? "").toLowerCase();
  if (/not verified|verify your domain|domain is not|testing email|your own email/.test(e)) return "Your sending domain is not verified in Resend yet, so Resend only delivers to your own address.";
  if (/api key is invalid|invalid api key|restricted_api_key|unauthorized|403|401/.test(e)) return "The Resend key was refused. Check RESEND_API_KEY in the site settings.";
  if (/rate limit|too many|daily|quota/.test(e)) return "Resend's sending limit was reached. Try again later.";
  if (/invalid .?to|invalid email|recipient/.test(e)) return "Resend rejected this email address. Check it is spelled correctly.";
  return "The email service could not send it.";
}

/** The newest email of a kind to each address, so pages can say whether it went out. */
export async function latestMailStatus(emails: string[], subjectPrefix: string): Promise<Map<string, { status: string; error: string | null }>> {
  const out = new Map<string, { status: string; error: string | null }>();
  if (!emails.length) return out;
  const rows = await db()<{ to_email: string; status: string; error: string | null }[]>`
    select distinct on (lower(to_email)) to_email, status, error from mail_log
    where lower(to_email) in ${db()(emails.map((e) => e.toLowerCase()))} and subject like ${subjectPrefix + "%"}
    order by lower(to_email), created_at desc`;
  for (const r of rows) out.set(r.to_email.toLowerCase(), { status: r.status, error: r.error });
  return out;
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
