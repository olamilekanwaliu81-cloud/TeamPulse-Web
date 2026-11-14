import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { claimById } from "@/lib/claims";
import { ActionForm } from "@/components/ActionForm";
import { sendDetails } from "@/app/actions/claims";

export const metadata = { title: "Details of your new sign-up" };

export default async function Details({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const c = await claimById((await params).id);
  if (!c || c.byUser !== u.id) notFound();
  if (c.state !== "details_asked") redirect("/signups");
  return (
    <>
      <div className="head"><div><h2>Details of your new sign-up</h2><p className="sub" style={{ margin: "2px 0 0" }}>Your team leader asked for these so they can add the person.</p></div></div>
      <section className="card" style={{ marginTop: 12, maxWidth: 640 }}>
        <ActionForm action={sendDetails} submit="Send to my team leader">
          <input type="hidden" name="id" value={c.id} />
          <div className="f2">
            <div className="field"><label htmlFor="cd-name">Full name</label><input id="cd-name" name="name" type="text" defaultValue={c.who} /></div>
            <div className="field"><label htmlFor="cd-email">Email</label><input id="cd-email" name="email" type="email" /></div>
          </div>
          <div className="f2">
            <div className="field"><label htmlFor="cd-phone">Phone (optional)</label><input id="cd-phone" name="phone" type="text" /></div>
            <div className="field"><label htmlFor="cd-neo">NeoLife ID</label><input id="cd-neo" name="neo" type="text" inputMode="numeric" maxLength={11} placeholder="063-9262173" /></div>
          </div>
          <div className="field" style={{ maxWidth: 280 }}><label htmlFor="cd-pv">First-order PV</label><input id="cd-pv" name="pv" type="number" min="0" placeholder="136" /></div>
        </ActionForm>
      </section>
    </>
  );
}
