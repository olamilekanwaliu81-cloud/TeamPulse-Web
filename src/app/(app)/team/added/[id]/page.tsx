import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { userById } from "@/lib/users";

export const metadata = { title: "Member added" };

export default async function Added({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireAdmin();
  const { id } = await params;
  const m = /^[0-9a-f-]{36}$/.test(id) ? await userById(id) : null;
  if (!m || m.teamId !== u.teamId) notFound();
  return (
    <section className="card" style={{ maxWidth: 640 }}>
      <h2>{m.name.split(" ")[0]} is added</h2>
      <p className="sub">We emailed {m.email} their TeamPulse ID, the website link and three steps: create a password, upload a picture and complete their profile. The button in the email works for 7 days.</p>
      <p className="sub" style={{ marginBottom: 4 }}>Their TeamPulse ID</p>
      <div className="big" style={{ display: "inline-block" }}>{m.tpId}</div>
      <p className="sub">Their first order of {m.firstPv ?? 0} PV is recorded, and the team feed shows them with their sponsor.</p>
      <div className="inline"><Link className="btn primary" href="/team/add">Add another member</Link><Link className="btn" href="/team">Back to team</Link></div>
    </section>
  );
}
