import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { safeNext } from "@/lib/app/safe-next";
import { AuthShell } from "@/components/app/ui";
import { MfaFlow } from "./MfaFlow";

export const metadata: Metadata = { title: "Two-step sign-in", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Owners and managers must use an authenticator (masterplan §13). Everyone without a team
 * yet will become an owner, so they set it up too. Other roles skip this step.
 */
export default async function Mfa({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/login?next=${encodeURIComponent(next)}`);

  const [{ data: memberships }, { data: aal }, { data: factors }] = await Promise.all([
    supabase.from("memberships").select("two_factor_required").eq("user_id", auth.user.id),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ]);
  const needed = !memberships?.length || memberships.some((m) => m.two_factor_required);
  const verified = factors?.totp?.find((f) => f.status === "verified");
  if (!needed && !verified) redirect(next);
  if (aal?.currentLevel === "aal2") redirect(next);

  return (
    <AuthShell
      title={verified ? "Enter your code" : "Protect your account"}
      text={verified
        ? "Open your authenticator app and enter the 6-digit code for Rentife."
        : "Rentife keeps your rent records safe with two-step sign-in. Scan the code with Google Authenticator, Microsoft Authenticator or 1Password."}
    >
      <MfaFlow factorId={verified?.id ?? null} next={next} />
    </AuthShell>
  );
}
