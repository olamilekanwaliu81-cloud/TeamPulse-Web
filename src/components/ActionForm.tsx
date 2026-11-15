"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "@/app/actions/auth";

type Props = {
  action: (state: FormState, data: FormData) => Promise<FormState>;
  submit: string;
  children: React.ReactNode;
  secondary?: boolean;
  className?: string;
  danger?: boolean;
};

/** A form that runs a server action, shows its error under the fields and disables the button while it works. */
export function ActionForm({ action, submit, children, secondary, className, danger }: Props) {
  const [state, run, pending] = useActionState(action, undefined);
  const sent = useRef<FormData | null>(null);
  const form = useRef<HTMLFormElement>(null);
  // React clears a form after it is sent. After an error we put back what the person typed (never a password).
  useEffect(() => {
    if (!state?.error || !sent.current || !form.current) return;
    for (const [name, value] of sent.current.entries()) {
      if (typeof value !== "string") continue;
      const el = form.current.elements.namedItem(name);
      if (el instanceof HTMLInputElement) { if (el.type === "password") continue; if (el.type === "checkbox") el.checked = value === "on"; else el.value = value; }
      else if (el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) el.value = value;
    }
  }, [state]);
  return (
    <form ref={form} action={run} className={className} noValidate onSubmit={(e) => { sent.current = new FormData(e.currentTarget); }}>
      {children}
      <p className={`hint ${state?.error ? "bad" : state?.ok ? "good" : ""}`} role="alert" aria-live="polite">
        {state?.error ?? state?.ok ?? ""}
      </p>
      <button className={`btn ${danger ? "bad" : secondary ? "" : "primary"}`} type="submit" disabled={pending} style={{ width: "100%", justifyContent: "center" }}>
        {pending ? "One moment…" : submit}
      </button>
    </form>
  );
}
