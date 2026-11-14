import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";

export const metadata = { title: "Check your email" };

export default function ForgotSent() {
  return (
    <AuthShell>
      <h1>Check your email</h1>
      <p className="sub">If that TeamPulse ID exists, we sent a reset link to the email on the account. The link works for 7 days.</p>
      <Link className="btn" href="/signin" style={{ marginTop: 10 }}>Back to sign in</Link>
    </AuthShell>
  );
}
