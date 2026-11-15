import { mailProblem } from "@/lib/mail";
import { resendInvite } from "@/app/actions/team";

/** Tells the team leader a welcome email did not go out, why, and lets them send it again. */
export function MailNotice({ memberId, email, status, error }: { memberId: string; email: string; status: string; error: string | null }) {
  return (
    <div className="notice bad" role="alert">
      <b>The welcome email to {email} did not go out.</b>
      <p style={{ margin: "4px 0 0" }}>{mailProblem(status, error)}</p>
      <p className="hint" style={{ margin: "6px 0 10px" }}>The member is added and has a TeamPulse ID. You can give them their ID yourself, and send the email again once this is fixed.</p>
      <form action={resendInvite}><input type="hidden" name="id" value={memberId} /><button className="btn sm primary" type="submit">Send the email again</button></form>
    </div>
  );
}
