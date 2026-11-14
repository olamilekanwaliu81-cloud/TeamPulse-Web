import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { teamMembers } from "@/lib/users";
import { ActionForm } from "@/components/ActionForm";
import { addMember } from "@/app/actions/team";

export const metadata = { title: "Add a member" };

export default async function AddMember() {
  const u = await requireAdmin();
  const all = (await teamMembers(u.teamId)).filter((m) => m.status !== "inactive");
  return (
    <>
      <div className="head"><div><h2>Add a member</h2><p className="sub" style={{ margin: "2px 0 0" }}>They get a TeamPulse ID and a welcome email with a button to create their login.</p></div>
        <Link className="btn" href="/team">Back to team</Link></div>
      <section className="card" style={{ marginTop: 12, maxWidth: 640 }}>
        <ActionForm action={addMember} submit="Add member and send welcome email">
          <div className="f2">
            <div className="field"><label htmlFor="am-name">Full name</label><input id="am-name" name="name" type="text" autoComplete="off" autoFocus /></div>
            <div className="field"><label htmlFor="am-email">Email</label><input id="am-email" name="email" type="email" autoComplete="off" /><span className="hint">The welcome message goes here.</span></div>
          </div>
          <div className="f2">
            <div className="field"><label htmlFor="am-neo">NeoLife ID</label><input id="am-neo" name="neo" type="text" inputMode="numeric" maxLength={11} placeholder="063-9262173" /></div>
            <div className="field"><label htmlFor="am-phone">Phone (optional)</label><input id="am-phone" name="phone" type="text" inputMode="tel" autoComplete="off" /></div>
          </div>
          <div className="f2">
            <div className="field"><label htmlFor="am-pv">First order (PV)</label><input id="am-pv" name="pv" type="number" min="0" placeholder="136" /><span className="hint">For example 136, 250 or 272.</span></div>
            <div className="field"><label htmlFor="am-sp">Sponsor</label>
              <select id="am-sp" name="sponsor" defaultValue={u.id}>{all.map((m) => <option key={m.id} value={m.id}>{m.name}{m.id === u.id ? " (you)" : ""}</option>)}</select></div>
          </div>
        </ActionForm>
      </section>
    </>
  );
}
