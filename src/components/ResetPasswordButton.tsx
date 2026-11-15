"use client";

import { useActionState } from "react";
import { sendMemberReset } from "@/app/actions/team";

/** The leader's "Send password reset" button. It says plainly whether the email went out. */
export function ResetPasswordButton({ memberId }: { memberId: string }) {
  const [state, run, pending] = useActionState(sendMemberReset, undefined);
  return (
    <form action={run} style={{ display: "inline-block", maxWidth: 520 }}>
      <input type="hidden" name="id" value={memberId} />
      <button className="btn" type="submit" disabled={pending}>{pending ? "Sending…" : "Send password reset"}</button>
      {state?.error && <div className="notice bad" role="alert"><b>{state.error}</b></div>}
      {state?.ok && <p className="hint good" role="status" style={{ marginTop: 8 }}>{state.ok}</p>}
    </form>
  );
}
