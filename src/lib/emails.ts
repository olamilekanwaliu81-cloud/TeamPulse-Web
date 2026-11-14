import { appUrl, sendMail } from "./mail";
import { createToken } from "./tokens";
import { firstName } from "./rules";
import type { User } from "./users";

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function sendVerifyEmail(to: { name: string; email: string; team: string }, token: string) {
  await sendMail({
    to: to.email, name: to.name, subject: "Confirm your email for TeamPulse",
    html: `<p>Hi ${esc(firstName(to.name))}, confirm your email to finish creating <b>${esc(to.team)}</b>. The link works for 7 days.</p>`,
    ctaLabel: "Confirm my email", ctaUrl: `${appUrl()}/verify/${token}`,
  });
}

/** The welcome email: ID, website, three steps and one button that opens the create-your-login page. */
export async function sendWelcomeEmail(member: User, sponsor: User) {
  const token = await createToken("setpw", member.id);
  const site = appUrl();
  await sendMail({
    to: member.email, name: member.name,
    subject: `Welcome to the family, ${firstName(member.name)}! Your TeamPulse ID is ${member.tpId}`,
    html: `<p>Congratulations, ${esc(firstName(member.name))}, and welcome to the family! ${esc(sponsor.name)} is proud of you for stepping up and joining the business. Your first order of ${member.firstPv ?? 0} PV makes you a NeoLife Distributor today.</p>
    <p style="margin:18px 0 4px">Your TeamPulse ID</p>
    <p style="font-size:26px;font-weight:700;letter-spacing:.06em;margin:0 0 6px;font-family:ui-monospace,Menlo,monospace">${esc(member.tpId)}</p>
    <p style="margin:0 0 14px">Your team website: <b>${esc(site)}</b></p>
    <p><b>Get your account ready in three steps:</b></p>
    <ol><li><b>Create your password.</b> Use the button below. You sign in with your TeamPulse ID and this password.</li><li><b>Upload your picture.</b> Your team sees it next to your name.</li><li><b>Complete your profile.</b> Add your phone number and your city.</li></ol>
    <p>The button works for 7 days. After that, open the website and sign in with your ID, or choose "Forgot your password?".</p>
    <p>Now the real work starts:</p>
    <ol><li><b>Build your business actively.</b> Work it every week, not once in a while.</li><li><b>Start calling people.</b> Write a list of names today and reach out about your business.</li><li><b>Start recruiting.</b> Invite people to look at what you are doing.</li><li><b>Train your team.</b> Show them to do what you do, and how to earn with their own skills. Help them place their first order.</li><li><b>Grow through them.</b> When your team signs people, you sign more people too.</li><li><b>Stay close to ${esc(sponsor.name)}.</b> Book a call to plan your first 30 days.</li></ol>`,
    ctaLabel: "Create my password and open my account", ctaUrl: `${site}/set-password/${token}`,
  });
}

export async function sendResetEmail(user: User, byLeader = false) {
  const token = await createToken("reset", user.id);
  await sendMail({
    to: user.email, name: user.name, subject: "Reset your TeamPulse password",
    html: `<p>Hi ${esc(firstName(user.name))},</p><p>${byLeader
      ? `Your team leader asked us to help you set a new password for TeamPulse ID <b>${esc(user.tpId)}</b>.`
      : `We got a request to reset the password for TeamPulse ID <b>${esc(user.tpId)}</b>. If it was not you, ignore this email.`} The link works for 7 days and only once.</p>`,
    ctaLabel: "Choose a new password", ctaUrl: `${appUrl()}/set-password/${token}`,
  });
}
