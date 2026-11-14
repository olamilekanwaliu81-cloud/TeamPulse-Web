import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { ActionForm } from "@/components/ActionForm";
import { forgotPassword } from "@/app/actions/auth";

export const metadata = { title: "Forgot your password?" };

export default function Forgot() {
  return (
    <AuthShell>
      <h1>Forgot your password?</h1>
      <p className="sub">Enter your TeamPulse ID. We email a reset link to the address on your account.</p>
      <ActionForm action={forgotPassword} submit="Send reset link">
        <div className="field"><label htmlFor="fp-id">TeamPulse ID</label><input id="fp-id" name="id" type="text" placeholder="06OW674" maxLength={7} autoFocus /></div>
      </ActionForm>
      <p className="hint" style={{ marginTop: 16 }}><Link className="link" href="/signin">Back to sign in</Link></p>
    </AuthShell>
  );
}
