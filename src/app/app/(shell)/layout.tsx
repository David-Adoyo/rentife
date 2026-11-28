import { appContext } from "@/lib/app/context";
import { Sidebar } from "@/components/app/Sidebar";
import { roleLabel } from "@/components/app/ui";
import { signOut } from "@/app/(auth)/actions";
import { switchOrg } from "../actions";

export default async function Shell({ children }: { children: React.ReactNode }) {
  const ctx = await appContext();
  const { data: profile } = await ctx.supabase.from("profiles").select("full_name").eq("user_id", ctx.user.id).maybeSingle();
  const items = [
    { href: "/app", label: "Home", icon: "home" as const },
    { href: "/app/properties", label: "Properties", icon: "properties" as const },
    ...(ctx.can.seeTenants ? [{ href: "/app/tenants", label: "Tenants", icon: "tenants" as const }] : []),
    ...(ctx.can.seeMoney ? [{ href: "/app/billing", label: "Billing", icon: "billing" as const }] : []),
    { href: "/app/team", label: "Team", icon: "team" as const },
    ...(ctx.can.seeAudit ? [{ href: "/app/activity", label: "Activity", icon: "activity" as const }] : []),
  ];
  return (
    <>
      <Sidebar items={items} orgs={ctx.orgs} currentOrg={ctx.org.id} userLabel={profile?.full_name || ctx.user.email || ""}
        roleLabel={roleLabel[ctx.role]} switchOrg={switchOrg} signOut={signOut} />
      <main id="main" className="px-4 py-6 sm:px-8 sm:py-10 lg:ml-64">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </>
  );
}
