import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { ActionForm } from "@/components/ActionForm";
import { confirmRegistration } from "@/app/actions/auth";
import { peekToken, whyText } from "@/lib/tokens";

export const metadata = { title: "Confirm your email" };

// The link only shows this page. The account is made when the leader presses the button,
// so an email scanner that opens the link cannot use it up.
export default async function Verify({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await peekToken(token);
  if ("why" in t || t.type !== "verify")
    return (
      <AuthShell>
        <h1>This link does not work</h1>
        <p className="sub">{"why" in t ? whyText(t.why) : "This link is not valid."} Links last 7 days and work once.</p>
        <p className="hint"><Link className="link" href="/register">Register again</Link> · <Link className="link" href="/signin">Sign in</Link></p>
      </AuthShell>
    );
  const d = t.data as { name: string; team: string };
  return (
    <AuthShell>
      <h1>Confirm your email</h1>
      <p className="sub">Hi {d.name.split(" ")[0]}, one more step to create <b>{d.team}</b>.</p>
      <ActionForm action={confirmRegistration} submit="Confirm my email and create my team">
        <input type="hidden" name="token" value={token} />
      </ActionForm>
    </AuthShell>
  );
}
