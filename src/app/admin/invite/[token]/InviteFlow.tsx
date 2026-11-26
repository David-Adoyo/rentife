"use client";

import { useActionState } from "react";
import { confirmAuthenticator, setPassword, type FormState } from "../../actions";
import { AuthCard, FormError, inputClass } from "@/components/admin/AuthCard";

export function InviteFlow({ token, email }: { token: string; email: string }) {
  const [pwState, pwAction, pwPending] = useActionState<FormState, FormData>(setPassword.bind(null, token), undefined);
  const [codeState, codeAction, codePending] = useActionState<FormState, FormData>(confirmAuthenticator.bind(null, token), undefined);

  if (!pwState?.ok) {
    return (
      <AuthCard title="Set up your admin account" text={<>Step 1 of 2. Choose a password for <b className="text-ink-900">{email}</b>.</>}>
        <form action={pwAction} className="space-y-5">
          <input type="email" name="username" value={email} autoComplete="username" readOnly hidden />
          <div>
            <label htmlFor="password" className="font-medium">New password</label>
            <input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required className={inputClass} />
            <p className="mt-1.5 text-sm text-ink-600">At least 12 characters.</p>
          </div>
          <div>
            <label htmlFor="confirm" className="font-medium">Confirm password</label>
            <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={12} required className={inputClass} />
          </div>
          <FormError error={pwState?.error} />
          <button type="submit" disabled={pwPending} className="btn btn-primary w-full disabled:opacity-70">
            {pwPending ? "Saving…" : "Continue"}
          </button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Connect your authenticator"
      text="Step 2 of 2. Scan this with Google Authenticator, Microsoft Authenticator or 1Password, then enter the 6-digit code it shows."
    >
      <div className="flex flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pwState.qr} alt="QR code to add Rentife to your authenticator app" width={220} height={220} className="rounded-xl ring-1 ring-line" />
        <details className="w-full text-sm text-ink-600">
          <summary className="cursor-pointer">Can’t scan? Enter this key instead</summary>
          <code className="mt-2 block break-all rounded-lg bg-cream-100 p-3 font-mono text-ink-900">{pwState.secret}</code>
        </details>
      </div>
      <form action={codeAction} className="mt-6 space-y-5">
        <div>
          <label htmlFor="code" className="font-medium">6-digit code</label>
          <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} required className={`${inputClass} num text-center text-2xl tracking-[0.4em]`} />
        </div>
        <FormError error={codeState?.error} />
        <button type="submit" disabled={codePending} className="btn btn-primary w-full disabled:opacity-70">
          {codePending ? "Checking…" : "Finish and sign in"}
        </button>
      </form>
    </AuthCard>
  );
}
