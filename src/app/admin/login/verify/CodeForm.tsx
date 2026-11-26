"use client";

import { useActionState } from "react";
import { verifyCode, type FormState } from "../../actions";
import { FormError, inputClass } from "@/components/admin/AuthCard";

export function CodeForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(verifyCode, undefined);
  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="code" className="font-medium">6-digit code</label>
        <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" maxLength={7} required autoFocus className={`${inputClass} num text-center text-2xl tracking-[0.4em]`} />
      </div>
      <FormError error={state?.error} />
      <button type="submit" disabled={pending} className="btn btn-primary w-full disabled:opacity-70">
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
