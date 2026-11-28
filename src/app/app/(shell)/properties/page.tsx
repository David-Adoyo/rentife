import type { Metadata } from "next";
import Link from "next/link";
import { appContext } from "@/lib/app/context";
import { ActionForm } from "@/components/app/ActionForm";
import { Card, Empty, Field, PageHeader, input } from "@/components/app/ui";
import { createProperty } from "../../actions";

export const metadata: Metadata = { title: "Properties" };

export default async function Properties() {
  const { supabase, org, can } = await appContext();
  const [{ data: props }, { data: board }, { data: owners }] = await Promise.all([
    supabase.from("properties").select("id, name, estate, county, code_prefix, type, default_due_day").eq("org_id", org.id).is("archived_at", null).order("name"),
    supabase.from("unit_board").select("property_id, status").eq("org_id", org.id),
    org.type === "agency" && can.createProperty ? supabase.from("owners").select("id, full_name").eq("org_id", org.id).order("full_name") : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
  ]);
  const stats = (id: string) => {
    const u = (board ?? []).filter((b) => b.property_id === id);
    const occ = u.filter((b) => b.status === "occupied" || b.status === "notice").length;
    return { total: u.length, occ };
  };
  return (
    <div className="space-y-8">
      <PageHeader eyebrow={org.name} title="Properties" />
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-3">
          {!props?.length && <Empty title="No properties yet" text={can.createProperty ? "Add your first building to start adding units and tenants." : "No properties have been shared with you yet."} />}
          {props?.map((p) => {
            const s = stats(p.id);
            return (
              <Link key={p.id} href={`/app/properties/${p.id}`} className="block rounded-[1.5rem] bg-white p-5 shadow-soft transition-colors hover:bg-cream-50 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-medium">{p.name}</p>
                    <p className="text-sm text-ink-600">{[p.estate, p.county].filter(Boolean).join(", ") || "No location yet"} · codes start {p.code_prefix}-</p>
                  </div>
                  <span className="num shrink-0 text-right text-sm"><b className="text-lg font-medium">{s.total}</b> {s.total === 1 ? "unit" : "units"}<br /><span className="text-ink-600">{s.total ? Math.round((s.occ / s.total) * 100) : 0}% occupied</span></span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-cream-100"><div className="h-full rounded-full bg-paid" style={{ width: `${s.total ? (s.occ / s.total) * 100 : 0}%` }} /></div>
              </Link>
            );
          })}
        </div>
        {can.createProperty && (
          <Card className="h-fit">
            <h2 className="text-lg font-medium">Add a property</h2>
            <div className="mt-4">
              <ActionForm action={createProperty} submit="Add property">
                <Field label="Name" htmlFor="name"><input id="name" name="name" required placeholder="Sunrise Court" className={input} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Estate" htmlFor="estate"><input id="estate" name="estate" placeholder="Kasarani" className={input} /></Field>
                  <Field label="County" htmlFor="county"><input id="county" name="county" placeholder="Nairobi" className={input} /></Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Type" htmlFor="type">
                    <select id="type" name="type" className={input}><option value="residential">Residential</option><option value="commercial">Commercial</option><option value="mixed">Mixed</option></select>
                  </Field>
                  <Field label="Rent due day" htmlFor="default_due_day"><input id="default_due_day" name="default_due_day" type="number" min={1} max={28} defaultValue={5} className={input} /></Field>
                </div>
                <Field label="Unit-code prefix" htmlFor="code_prefix" hint="Tenants pay with codes like SUN-B4. Leave blank and we’ll choose one from the name.">
                  <input id="code_prefix" name="code_prefix" maxLength={5} placeholder="SUN" className={`${input} uppercase`} />
                </Field>
                {!!owners?.length && (
                  <Field label="Owner (optional)" htmlFor="owner_id">
                    <select id="owner_id" name="owner_id" className={input}><option value="">Our own property</option>{owners.map((o) => <option key={o.id} value={o.id}>{o.full_name}</option>)}</select>
                  </Field>
                )}
              </ActionForm>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
