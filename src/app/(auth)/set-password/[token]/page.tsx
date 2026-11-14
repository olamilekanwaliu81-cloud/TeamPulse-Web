import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { ActionForm } from "@/components/ActionForm";
import { PasswordInput } from "@/components/PasswordInput";
import { PhotoField } from "@/components/PhotoField";
import { setPassword } from "@/app/actions/auth";
import { peekToken, whyText } from "@/lib/tokens";
import { userById } from "@/lib/users";
import { PASSWORD_RULE, firstName, initials } from "@/lib/rules";

export const metadata = { title: "Create your login" };

export default async function SetPassword({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await peekToken(token);
  const u = "why" in t || !t.userId ? null : await userById(t.userId);
  if ("why" in t || !u || (t.type !== "setpw" && t.type !== "reset"))
    return (
      <AuthShell>
        <h1>This link does not work</h1>
        <p className="sub">{"why" in t ? whyText(t.why) : "This link is not valid."} Links last 7 days and work once.</p>
        <p className="sub">You can ask for a new one with &quot;Forgot your password?&quot;.</p>
        <div className="inline" style={{ marginTop: 12 }}>
          <Link className="btn primary" href="/forgot">Get a new link</Link><Link className="btn" href="/signin">Back to sign in</Link>
        </div>
      </AuthShell>
    );

  if (t.type === "reset")
    return (
      <AuthShell>
        <h1>Choose a new password</h1>
        <p className="sub">For {u.name}, TeamPulse ID <b className="mono">{u.tpId}</b>.</p>
        <ActionForm action={setPassword} submit="Save password and sign in">
          <input type="hidden" name="token" value={token} />
          <div className="field"><label htmlFor="sp1">New password</label><PasswordInput id="sp1" name="p1" autoComplete="new-password" /><span className="hint">{PASSWORD_RULE}</span></div>
          <div className="field"><label htmlFor="sp2">Repeat password</label><PasswordInput id="sp2" name="p2" autoComplete="new-password" /></div>
        </ActionForm>
      </AuthShell>
    );

  return (
    <AuthShell>
      <h1>Welcome, {firstName(u.name)}</h1>
      <p className="sub">Finish your account in one go: choose a password, add your picture and complete your profile.</p>
      <div className="big" style={{ margin: "4px 0 14px" }}>
        <span style={{ display: "block", fontSize: ".72rem", letterSpacing: ".04em", fontFamily: "var(--body)", opacity: 0.8 }}>Your TeamPulse ID</span>
        {u.tpId}
      </div>
      <ActionForm action={setPassword} submit="Create my login and open my account">
        <input type="hidden" name="token" value={token} />
        <PhotoField initial={u.photo} initials={initials(u.name)} />
        <div className="f2">
          <div className="field"><label htmlFor="sp-phone">Phone number</label><input id="sp-phone" name="phone" type="text" inputMode="tel" autoComplete="tel" defaultValue={u.phone} /></div>
          <div className="field"><label htmlFor="sp-city">City</label><input id="sp-city" name="city" type="text" autoComplete="address-level2" defaultValue={u.city} /></div>
        </div>
        <div className="field"><label htmlFor="sp1">Create password</label><PasswordInput id="sp1" name="p1" autoComplete="new-password" /><span className="hint">{PASSWORD_RULE}</span></div>
        <div className="field"><label htmlFor="sp2">Repeat password</label><PasswordInput id="sp2" name="p2" autoComplete="new-password" /></div>
      </ActionForm>
    </AuthShell>
  );
}
