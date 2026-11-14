import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { ActionForm } from "@/components/ActionForm";
import { PasswordInput } from "@/components/PasswordInput";
import { redirectIfSignedIn, signIn } from "@/app/actions/auth";

export const metadata = { title: "Sign in" };

export default async function SignIn({ searchParams }: { searchParams: Promise<{ id?: string; notice?: string }> }) {
  await redirectIfSignedIn();
  const { id, notice } = await searchParams;
  return (
    <AuthShell>
      <h1>Welcome back</h1>
      <p className="sub">Sign in with your TeamPulse ID and password.</p>
      {notice === "exists" && <p className="hint good">This email is already confirmed. Sign in below.</p>}
      {notice === "reset" && <p className="hint good">Password saved. Sign in below.</p>}
      <ActionForm action={signIn} submit="Sign in">
        <div className="field"><label htmlFor="si-id">TeamPulse ID</label>
          <input id="si-id" name="id" type="text" autoComplete="username" placeholder="06OW674" maxLength={7} defaultValue={id ?? ""} autoFocus={!id} /></div>
        <div className="field"><label htmlFor="si-pw">Password</label>
          <PasswordInput id="si-pw" name="pw" autoComplete="current-password" /></div>
      </ActionForm>
      <p className="hint" style={{ marginTop: 16 }}><Link className="link" href="/forgot">Forgot your password?</Link></p>
      <p className="hint" style={{ marginTop: 8 }}>New team leader? <Link className="link" href="/register">Register your team</Link></p>
      <p className="hint" style={{ marginTop: 8 }}>First time as a member? Open the &quot;Create my password&quot; button in your welcome email.</p>
    </AuthShell>
  );
}
