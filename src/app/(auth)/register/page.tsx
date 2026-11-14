import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { ActionForm } from "@/components/ActionForm";
import { PasswordInput } from "@/components/PasswordInput";
import { redirectIfSignedIn, registerLeader } from "@/app/actions/auth";
import { PASSWORD_RULE } from "@/lib/rules";

export const metadata = { title: "Register as a team leader" };

export default async function Register() {
  await redirectIfSignedIn();
  return (
    <AuthShell>
      <h1>Register as a team leader</h1>
      <p className="sub">Only team leaders register. You add your own members afterwards, and they never register themselves.</p>
      <ActionForm action={registerLeader} submit="Create my account">
        <div className="f2">
          <div className="field"><label htmlFor="rg-name">Full name</label><input id="rg-name" name="name" type="text" autoComplete="name" autoFocus /></div>
          <div className="field"><label htmlFor="rg-team">Team name</label><input id="rg-team" name="team" type="text" placeholder="Team OW" /></div>
        </div>
        <div className="field"><label htmlFor="rg-email">Email</label><input id="rg-email" name="email" type="email" autoComplete="email" />
          <span className="hint">We send a confirmation link here, and password resets go here.</span></div>
        <div className="field"><label htmlFor="rg-neo">Your NeoLife ID</label><input id="rg-neo" name="neo" type="text" inputMode="numeric" maxLength={11} placeholder="063-9262173" /></div>
        <div className="f2">
          <div className="field"><label htmlFor="rg-p1">Password</label><PasswordInput id="rg-p1" name="p1" autoComplete="new-password" /></div>
          <div className="field"><label htmlFor="rg-p2">Repeat password</label><PasswordInput id="rg-p2" name="p2" autoComplete="new-password" /></div>
        </div>
        <p className="hint" style={{ marginTop: -6 }}>{PASSWORD_RULE}</p>
      </ActionForm>
      <p className="hint" style={{ marginTop: 16 }}>Already have an account? <Link className="link" href="/signin">Sign in</Link></p>
    </AuthShell>
  );
}
