import { requireUser } from "@/lib/auth";
import { teamMembers } from "@/lib/users";
import { rankName, initials, PASSWORD_RULE } from "@/lib/rules";
import { ActionForm } from "@/components/ActionForm";
import { PasswordInput } from "@/components/PasswordInput";
import { PhotoField } from "@/components/PhotoField";
import { changePassword, saveProfile } from "@/app/actions/team";

export const metadata = { title: "Profile and settings" };

export default async function Profile() {
  const u = await requireUser();
  const sponsor = (await teamMembers(u.teamId)).find((m) => m.id === u.sponsorId);
  return (
    <>
      <div className="head"><div><h2>{u.role === "admin" ? "Profile and settings" : "My profile and settings"}</h2><p className="sub" style={{ margin: "2px 0 0" }}>{rankName(u.rank)}{sponsor ? ` · Sponsor ${sponsor.name}` : ""}</p></div></div>
      <div className="grid g-att" style={{ marginTop: 12 }}>
        <section className="card">
          <h3>Profile</h3>
          <ActionForm action={saveProfile} submit="Save">
            <PhotoField initial={u.photo} initials={initials(u.name)} label="Profile picture" />
            <div className="field"><label htmlFor="pf-name">Display name</label><input id="pf-name" name="name" type="text" defaultValue={u.name} /></div>
            <div className="f2">
              <div className="field"><label htmlFor="pf-phone">Phone</label><input id="pf-phone" name="phone" type="text" inputMode="tel" defaultValue={u.phone} /></div>
              <div className="field"><label htmlFor="pf-city">City</label><input id="pf-city" name="city" type="text" defaultValue={u.city} /></div>
            </div>
            <div className="field"><label htmlFor="pf-bio">About me</label><textarea id="pf-bio" name="bio" rows={3} defaultValue={u.bio} /></div>
            <div className="f2">
              <div className="field"><label htmlFor="pf-tp">TeamPulse ID</label><input id="pf-tp" value={u.tpId} readOnly /><span className="hint">Set by the system.</span></div>
              <div className="field"><label htmlFor="pf-neo">NeoLife ID</label><input id="pf-neo" value={u.neoId} readOnly /><span className="hint">Your team leader can correct it.</span></div>
            </div>
          </ActionForm>
        </section>
        <section className="card">
          <h3>Change password</h3>
          <ActionForm action={changePassword} submit="Change password" secondary>
            <div className="field"><label htmlFor="cp0">Current password</label><PasswordInput id="cp0" name="p0" autoComplete="current-password" /></div>
            <div className="field"><label htmlFor="cp1">New password</label><PasswordInput id="cp1" name="p1" autoComplete="new-password" /><span className="hint">{PASSWORD_RULE}</span></div>
            <div className="field"><label htmlFor="cp2">Repeat new password</label><PasswordInput id="cp2" name="p2" autoComplete="new-password" /></div>
          </ActionForm>
        </section>
      </div>
    </>
  );
}
