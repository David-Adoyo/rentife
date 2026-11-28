"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { input } from "@/components/app/ui";

export function MfaFlow({ factorId, next }: { factorId: string | null; next: string }) {
  const router = useRouter();
  const [enrol, setEnrol] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (factorId) return;
    const sb = supabaseBrowser();
    // If this effect runs twice (re-render, remount), only the latest set-up may reach the screen;
    // otherwise the page could show the key of a set-up that the second run already removed.
    let stale = false;
    (async () => {
      // Clear any half-finished set-up before starting a new one.
      const { data } = await sb.auth.mfa.listFactors();
      for (const f of data?.all ?? []) if (f.status === "unverified") await sb.auth.mfa.unenroll({ factorId: f.id });
      if (stale) return;
      const { data: e, error: err } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: `Rentife ${crypto.randomUUID().slice(0, 8)}` });
      if (stale) {
        if (e) await sb.auth.mfa.unenroll({ factorId: e.id });
        return;
      }
      if (err || !e) return setError(err?.message ?? "Could not start set-up. Refresh the page.");
      setEnrol({ id: e.id, qr: e.totp.qr_code, secret: e.totp.secret });
    })();
    return () => {
      stale = true;
    };
  }, [factorId]);

  async function verify(form: FormData) {
    setBusy(true);
    setError(null);
    const code = String(form.get("code") ?? "").replace(/\s/g, "");
    const id = factorId ?? enrol?.id;
    if (!id) return;
    const { error: err } = await supabaseBrowser().auth.mfa.challengeAndVerify({ factorId: id, code });
    if (err) {
      setBusy(false);
      // A set-up that no longer exists (e.g. started in another tab): start again with a fresh QR code.
      if (!factorId && /not found|unverified|factor/i.test(err.message) && !/code|invalid/i.test(err.message)) {
        setEnrol(null);
        return setError("Your set-up expired. Refresh the page to get a new QR code.");
      }
      return setError("That code isn’t right. Check the app and try again.");
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {!factorId && (
        <div className="flex flex-col items-center gap-3">
          {enrol ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={enrol.qr} alt="QR code for your authenticator app" width={200} height={200} className="rounded-xl bg-white p-2 ring-1 ring-line" />
          ) : (
            <div className="h-[200px] w-[200px] animate-pulse rounded-xl bg-cream-100" aria-label="Loading" />
          )}
          {enrol && (
            <details className="w-full text-sm text-ink-600">
              <summary className="cursor-pointer">Can’t scan? Enter this key instead</summary>
              <code className="mt-2 block break-all rounded-lg bg-cream-100 p-3 font-mono text-ink-900">{enrol.secret}</code>
            </details>
          )}
        </div>
      )}
      <form action={verify} className="space-y-4">
        <div>
          <label htmlFor="code" className="text-sm font-medium">6-digit code</label>
          <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} required autoFocus
            className={`${input} num h-12 text-center text-2xl tracking-[0.4em]`} />
        </div>
        {error && <p role="alert" className="rounded-xl bg-overdue/10 px-4 py-3 text-sm text-overdue">{error}</p>}
        <button disabled={busy || (!factorId && !enrol)} className="btn btn-primary w-full disabled:opacity-70">{busy ? "Checking…" : "Continue"}</button>
      </form>
    </div>
  );
}
