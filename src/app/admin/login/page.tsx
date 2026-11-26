"use client";

import { useActionState } from "react";
import { signIn, type FormState } from "../actions";
import { AuthCard, FormError, inputClass } from "@/components/admin/AuthCard";

export default function Login() {
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, undefined);
  return (
    <AuthCard title="Sign in" text="Rentife staff only.">
      <form action={action} className="space-y-5">
        <div>
          <label htmlFor="email" className="font-medium">Email</label>
          <input id="email" name="email" type="email" autoComplete="username" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="password" className="font-medium">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required className={inputClass} />
        </div>
        <FormError error={state?.error} />
        <button type="submit" disabled={pending} className="btn btn-primary w-full disabled:opacity-70">
          {pending ? "Checking…" : "Continue"}
        </button>
      </form>
    </AuthCard>
  );
}
