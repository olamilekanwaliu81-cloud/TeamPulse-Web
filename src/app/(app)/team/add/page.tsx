import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { claimById, isOpen } from "@/lib/claims";
import { applicationById, suggestedSponsor } from "@/lib/applications";
import { teamMembers } from "@/lib/users";
import { ActionForm } from "@/components/ActionForm";
import { addMember } from "@/app/actions/team";

export const metadata = { title: "Add a member" };

export default async function AddMember({ searchParams }: { searchParams: Promise<{ claim?: string; app?: string }> }) {
  const u = await requireAdmin();
  const found = (await searchParams).claim ? await claimById((await searchParams).claim!) : null;
  const claim = found && found.teamId === u.teamId && isOpen(found) ? found : null;
  const foundApp = (await searchParams).app ? await applicationById((await searchParams).app!) : null;
  const app = foundApp && foundApp.teamId === u.teamId && foundApp.state === "new" ? foundApp : null;
  const suggested = app ? await suggestedSponsor(app) : null;
  const d = claim?.details ?? (app ? { name: app.name, email: app.email, phone: app.phone, neo: app.neoId, pv: app.firstPv } : null);
  const all = (await teamMembers(u.teamId)).filter((m) => m.status !== "inactive");
  return (
    <>
      <div className="head"><div><h2>Add a member</h2><p className="sub" style={{ margin: "2px 0 0" }}>They get a TeamPulse ID and a welcome email with a button to create their login.</p></div>
        <Link className="btn" href="/team">Back to team</Link></div>
      <section className="card" style={{ marginTop: 12, maxWidth: 640 }}>
        <ActionForm action={addMember} submit="Add member and send welcome email">
          {claim && <input type="hidden" name="claim" value={claim.id} />}
          {app && <input type="hidden" name="app" value={app.id} />}
          {app && <p className="hint good" style={{ marginBottom: 12 }}>This person filled in the sign-up form. Check their details, choose who sponsors them, then register.</p>}
          {claim && <p className="hint good" style={{ marginBottom: 12 }}>Adding the person reported in a sign-up report{claim.state === "ready" ? ". Their details are filled in" : ". Fill in what you know"}.</p>}
          <div className="f2">
            <div className="field"><label htmlFor="am-name">Full name</label><input id="am-name" name="name" type="text" autoComplete="off" autoFocus defaultValue={d?.name ?? claim?.who ?? ""} /></div>
            <div className="field"><label htmlFor="am-email">Email</label><input id="am-email" name="email" type="email" autoComplete="off" defaultValue={d?.email ?? ""} /><span className="hint">The welcome message goes here.</span></div>
          </div>
          <div className="f2">
            <div className="field"><label htmlFor="am-neo">NeoLife ID</label><input id="am-neo" name="neo" type="text" inputMode="numeric" maxLength={11} placeholder="063-9262173" defaultValue={d?.neo ?? ""} /></div>
            <div className="field"><label htmlFor="am-phone">Phone (optional)</label><input id="am-phone" name="phone" type="text" inputMode="tel" autoComplete="off" defaultValue={d?.phone ?? ""} /></div>
          </div>
          <div className="f2">
            <div className="field"><label htmlFor="am-pv">First order (PV)</label><input id="am-pv" name="pv" type="number" min="0" placeholder="136" defaultValue={d?.pv ?? ""} /><span className="hint">For example 136, 250 or 272.</span></div>
            <div className="field"><label htmlFor="am-sp">Sponsor</label>
              <select id="am-sp" name="sponsor" defaultValue={app ? (suggested ?? "") : (claim?.byUser ?? u.id)}>{app && <option value="">Choose a sponsor…</option>}{all.map((m) => <option key={m.id} value={m.id}>{m.name}{m.id === u.id ? " (you)" : ""}</option>)}</select></div>
          </div>
        </ActionForm>
      </section>
    </>
  );
}
