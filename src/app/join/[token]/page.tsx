import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { ActionForm } from "@/components/ActionForm";
import { inviteByToken, isLive } from "@/lib/applications";
import { submitApplication } from "@/app/actions/applications";
import { RANKS } from "@/lib/rules";

export const metadata = { title: "Join the team" };

export default async function Join({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await inviteByToken(token);
  if (!invite || !isLive(invite))
    return (
      <AuthShell>
        <h1>This link is not active</h1>
        <p className="sub">It may have expired or been replaced. Ask your team leader to send you a new one.</p>
      </AuthShell>
    );
  return (
    <AuthShell>
      <h1>Join the team</h1>
      <p className="sub">{invite.kind === "existing"
        ? "You are already a distributor, so there is nothing new to buy. Add your details once. Your team leader checks them and registers you, and then you get your TeamPulse ID by email."
        : "Fill in your details. Your team leader checks them and registers you, and then you get your TeamPulse ID by email."}</p>
      <ActionForm action={submitApplication} submit="Send my details">
        <input type="hidden" name="token" value={token} />
        <div className="field"><label htmlFor="jn-name">Full name</label><input id="jn-name" name="name" type="text" autoComplete="name" /></div>
        <div className="field"><label htmlFor="jn-email">Email</label><input id="jn-email" name="email" type="email" autoComplete="email" /></div>
        <div className="field"><label htmlFor="jn-phone">Phone (optional)</label><input id="jn-phone" name="phone" type="text" inputMode="tel" autoComplete="tel" /></div>
        <div className="field"><label htmlFor="jn-neo">NeoLife ID</label><input id="jn-neo" name="neo" type="text" inputMode="numeric" maxLength={11} placeholder="063-9262173" /></div>
        {invite.kind === "existing"
          ? <div className="field"><label htmlFor="jn-rank">Your title now</label>
              <select id="jn-rank" name="rank" defaultValue="0">{RANKS.map((r, i) => <option key={r.name} value={i}>{r.name}</option>)}</select>
              <span className="hint">The title you hold today. Your team leader will confirm it.</span></div>
          : <div className="field"><label htmlFor="jn-pv">PV of your first order</label><input id="jn-pv" name="pv" type="number" min="0" placeholder="136" /></div>}
        <label className="hint" style={{ display: "flex", gap: 8, alignItems: "flex-start", margin: "4px 0 12px" }}>
          <input type="checkbox" name="agree" style={{ marginTop: 3 }} />
          <span>I have read the <Link className="link" href="/privacy" target="_blank">privacy notice</Link>.</span>
        </label>
      </ActionForm>
    </AuthShell>
  );
}
