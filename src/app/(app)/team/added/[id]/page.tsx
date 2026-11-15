import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { userById } from "@/lib/users";
import { latestMailStatus, notDelivered } from "@/lib/mail";
import { MailNotice } from "@/components/MailNotice";
import { WhatsApp } from "@/components/WhatsApp";
import { appUrl } from "@/lib/mail";
import { waLink, waNumber, welcomeText } from "@/lib/whatsapp";

export const metadata = { title: "Member added" };

export default async function Added({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireAdmin();
  const { id } = await params;
  const m = /^[0-9a-f-]{36}$/.test(id) ? await userById(id) : null;
  if (!m || m.teamId !== u.teamId) notFound();
  const mail = (await latestMailStatus([m.email], "Welcome to the family")).get(m.email.toLowerCase());
  const bad = notDelivered(mail?.status);
  return (
    <section className="card" style={{ maxWidth: 640 }}>
      <h2>{m.name.split(" ")[0]} is added</h2>
      {bad && mail && <MailNotice memberId={m.id} email={m.email} status={mail.status} error={mail.error} />}
      <p className="sub">{bad ? "The welcome email, with their TeamPulse ID, the website link and three steps, has not been delivered." : `We emailed ${m.email} their TeamPulse ID, the website link and three steps: create a password, upload a picture and complete their profile. The button in the email works for 7 days.`}</p>
      <p className="sub" style={{ marginBottom: 4 }}>Their TeamPulse ID</p>
      <div className="big" style={{ display: "inline-block" }}>{m.tpId}</div>
      <p className="sub">{m.firstPv != null ? `Their first order of ${m.firstPv} PV is recorded, and the team feed shows them with their sponsor.` : "The team feed shows them with their sponsor."}</p>
      <div className="inline">{waNumber(m.phone) && <WhatsApp primary label="Send their ID on WhatsApp" href={waLink(m.phone, welcomeText(m.name, u.name, m.tpId, appUrl()))} />}<Link className="btn primary" href="/team/add">Add another member</Link><Link className="btn" href="/team">Back to team</Link></div>
    </section>
  );
}
