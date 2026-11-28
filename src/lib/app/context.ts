import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export type Role = "owner" | "manager" | "accountant" | "caretaker" | "passive_owner";
export const ORG_COOKIE = "rentife_org";

/**
 * Who is signed in, which organisation they are working in and what their role allows.
 * Redirects to sign-in, two-step set-up or organisation creation as needed.
 * The permissions here only shape the UI: Postgres RLS enforces them.
 */
export const appContext = cache(async () => {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login?next=/app");

  const [{ data: memberships }, { data: aal }] = await Promise.all([
    supabase.from("memberships").select("org_id, role, two_factor_required, property_scope").eq("user_id", user.id),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  const needs2fa = !memberships?.length || memberships.some((m) => m.two_factor_required);
  if (needs2fa && aal?.currentLevel !== "aal2") redirect("/auth/mfa?next=/app");
  if (!memberships?.length) redirect("/app/welcome");

  const chosen = (await cookies()).get(ORG_COOKIE)?.value;
  const membership = memberships.find((m) => m.org_id === chosen) ?? memberships[0];
  const { data: orgs } = await supabase.from("organisations").select("id, name, type, onboarding_step, onboarding_completed_at, contact_phone").in("id", memberships.map((m) => m.org_id));
  const org = orgs?.find((o) => o.id === membership.org_id);
  if (!org) redirect("/auth/mfa?next=/app");
  const role = membership.role as Role;

  return {
    supabase,
    user,
    org,
    orgs: orgs ?? [],
    role,
    membership,
    can: {
      edit: role === "owner" || role === "manager",
      createProperty: role === "owner" || (role === "manager" && membership.property_scope === null),
      manageTeam: role === "owner",
      seeMoney: role !== "caretaker",
      seeTenants: role === "owner" || role === "manager" || role === "accountant",
      seeAudit: role === "owner",
    },
  };
});
