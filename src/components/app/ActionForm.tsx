"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { CheckCircle } from "@phosphor-icons/react";

export type ActionResult = { error?: string; ok?: boolean; message?: string } | undefined;

/**
 * Form wired to a server action: shows pending state, the server's error message,
 * and an optional success note. Resets its fields after a successful submit.
 */
export function ActionForm({
  action,
  children,
  submit,
  className = "space-y-4",
  resetOnSuccess = true,
  submitClass = "btn btn-primary",
}: {
  action: (state: ActionResult, form: FormData) => Promise<ActionResult>;
  children: ReactNode;
  submit: string;
  className?: string;
  resetOnSuccess?: boolean;
  submitClass?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      {state?.error && <p role="alert" className="rounded-xl bg-overdue/10 px-4 py-3 text-sm text-overdue">{state.error}</p>}
      {state?.ok && state.message && (
        <p role="status" className="flex items-start gap-2 rounded-xl bg-paid/10 px-4 py-3 text-sm text-paid">
          <CheckCircle size={18} weight="fill" className="mt-0.5 shrink-0" /> <span className="break-all">{state.message}</span>
        </p>
      )}
      <button type="submit" disabled={pending} className={`${submitClass} disabled:opacity-70`}>
        {pending ? "Please wait…" : submit}
      </button>
    </form>
  );
}
