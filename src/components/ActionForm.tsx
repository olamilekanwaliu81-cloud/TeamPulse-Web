"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";

type Props = {
  action: (state: FormState, data: FormData) => Promise<FormState>;
  submit: string;
  children: React.ReactNode;
  secondary?: boolean;
  className?: string;
};

/** A form that runs a server action, shows its error under the fields and disables the button while it works. */
export function ActionForm({ action, submit, children, secondary, className }: Props) {
  const [state, run, pending] = useActionState(action, undefined);
  return (
    <form action={run} className={className} noValidate>
      {children}
      <p className={`hint ${state?.error ? "bad" : state?.ok ? "good" : ""}`} role="alert" aria-live="polite">
        {state?.error ?? state?.ok ?? ""}
      </p>
      <button className={`btn ${secondary ? "" : "primary"}`} type="submit" disabled={pending} style={{ width: "100%", justifyContent: "center" }}>
        {pending ? "One moment…" : submit}
      </button>
    </form>
  );
}
