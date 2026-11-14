import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { requireAdmin } from "@/lib/auth";
import { firstName } from "@/lib/rules";

export const metadata = { title: "Your team is ready" };

export default async function Welcome() {
  const u = await requireAdmin();
  return (
    <AuthShell>
      <h1>Your team is ready</h1>
      <p className="sub">Welcome, {firstName(u.name)}. This is your TeamPulse ID. You sign in with it and your password, so write it down.</p>
      <div className="big">{u.tpId}</div>
      <p className="sub">Next, add your first member. They get their own TeamPulse ID and an email with a button to create their login.</p>
      <Link className="btn primary" href="/dashboard" style={{ width: "100%", justifyContent: "center", marginTop: 6 }}>Go to my dashboard</Link>
    </AuthShell>
  );
}
