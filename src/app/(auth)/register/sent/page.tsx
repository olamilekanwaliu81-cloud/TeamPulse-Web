import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";

export const metadata = { title: "Check your email" };

const mask = (e: string) => e.replace(/^(.).*(@.*)$/, "$1***$2");

export default async function Sent({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  return (
    <AuthShell>
      <h1>Check your email</h1>
      <p className="sub">We sent a confirmation link to <b>{e ? mask(e) : "your email"}</b>. Open it to finish creating your account. The link works for 7 days.</p>
      <p className="hint">Nothing in your inbox? Check your spam folder.</p>
      <p className="hint" style={{ marginTop: 16 }}><Link className="link" href="/signin">Back to sign in</Link></p>
    </AuthShell>
  );
}
