import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { appContext } from "@/lib/app/context";
import { Card, PageHeader } from "@/components/app/ui";

export const metadata: Metadata = { title: "Activity" };

const entityLabel: Record<string, string> = {
  organisations: "organisation", owners: "owner", memberships: "team member", properties: "property",
  units: "unit", tenants: "tenant", tenancies: "tenancy", invitations: "invitation",
};
const verb: Record<string, string> = { insert: "added", update: "changed", delete: "removed" };

function describe(r: { action: string; entity: string; before: Record<string, unknown> | null; after: Record<string, unknown> | null }) {
  const row = (r.after ?? r.before ?? {}) as Record<string, unknown>;
  const name = (row.full_name ?? row.name ?? row.unit_code ?? row.email ?? "") as string;
  let changes = "";
  if (r.action === "update" && r.before && r.after) {
    const keys = Object.keys(r.after).filter((k) => !["updated_at"].includes(k) && JSON.stringify(r.after![k]) !== JSON.stringify(r.before![k]));
    changes = keys.length ? ` (${keys.map((k) => k.replace(/_/g, " ")).join(", ")})` : "";
  }
  return `${verb[r.action] ?? r.action} ${entityLabel[r.entity] ?? r.entity}${name ? ` “${name}”` : ""}${changes}`;
}

export default async function Activity() {
  const { supabase, org, can } = await appContext();
  if (!can.seeAudit) redirect("/app");
  const { data: rows } = await supabase.from("audit_log").select("id, actor, action, entity, before, after, at").eq("org_id", org.id).order("at", { ascending: false }).limit(200);
  const actors = [...new Set((rows ?? []).map((r) => r.actor).filter(Boolean))] as string[];
  const { data: profiles } = actors.length ? await supabase.from("profiles").select("user_id, full_name, email").in("user_id", actors) : { data: [] };
  const who = (uid: string | null) => { const p = profiles?.find((x) => x.user_id === uid); return p?.full_name || p?.email || "System"; };
  const when = (d: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Nairobi", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(d));

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={org.name} title="Activity">
        <p className="max-w-sm text-sm text-ink-600">Every change to your organisation, in order. This record cannot be edited or deleted.</p>
      </PageHeader>
      <Card className="p-0 sm:p-0">
        <ol className="divide-y divide-line">
          {rows?.map((r) => (
            <li key={r.id} className="grid gap-1 px-5 py-3.5 text-sm sm:grid-cols-[150px_1fr] sm:px-6">
              <span className="num text-ink-600">{when(r.at)}</span>
              <span><b>{who(r.actor)}</b> {describe(r)}</span>
            </li>
          ))}
          {!rows?.length && <li className="px-6 py-8 text-center text-ink-600">Nothing yet.</li>}
        </ol>
      </Card>
    </div>
  );
}
