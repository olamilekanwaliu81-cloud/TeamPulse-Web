import { requireUser } from "@/lib/auth";
import { teamMembers } from "@/lib/users";
import { rankName, initials, PASSWORD_RULE } from "@/lib/rules";
import { nextRank } from "@/lib/ranks";
import { rankHistory, monthStats } from "@/lib/stats";
import { today } from "@/lib/clock";
import { dmy } from "@/lib/format";
import { ActionForm } from "@/components/ActionForm";
import { PasswordInput } from "@/components/PasswordInput";
import { PhotoField } from "@/components/PhotoField";
import { changePassword, saveProfile } from "@/app/actions/team";

export const metadata = { title: "Profile and settings" };

export default async function Profile() {
  const u = await requireUser();
  const all = await teamMembers(u.teamId);
  const sponsor = all.find((m) => m.id === u.sponsorId);
  const ranks = u.role === "member" ? await rankHistory(u.id) : [];
  const stat = u.role === "member" ? (await monthStats(u.teamId, all, await today())).get(u.id) : undefined;
  const next = nextRank(u.rank), pct = next && stat?.qpv != null ? Math.min(100, Math.round((stat.qpv / next.qpv) * 100)) : 0;
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
        {u.role === "member" && (
          <section className="card">
            <h3>My progress</h3>
            <div className="kv"><div><div className="k">Rank</div><div className="v">{rankName(u.rank)}</div></div><div><div className="k">PPV</div><div className="v">{stat?.ppv ?? "—"}</div></div><div><div className="k">QPV</div><div className="v">{stat?.qpv?.toLocaleString("en-US") ?? "—"}</div></div></div>
            {next ? <><div className="sub">Next: {next.name} at {next.qpv.toLocaleString("en-US")} QPV with 100 PPV</div><div className="meter"><i style={{ width: `${pct}%` }} /></div><div className="sub">{pct}% of the way</div></> : <div className="sub">Director follows its own rules.</div>}
            <h3 style={{ marginTop: 16 }}>Rank history</h3>
            {ranks.length ? <div className="rows">{ranks.map((r) => <div className="row" key={r.id}><div className="grow">{rankName(r.from)} to <b>{rankName(r.to)}</b></div><span className="sub">{dmy(r.at)}</span></div>)}</div> : <p className="sub">No rank changes yet.</p>}
          </section>
        )}
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
