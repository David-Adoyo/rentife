import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FilePdf } from "@phosphor-icons/react/dist/ssr";
import { RegisterImport } from "@/components/app/RegisterImport";
import { aiImportEnabled } from "../../../import-actions";
import { appContext } from "@/lib/app/context";
import { ActionForm } from "@/components/app/ActionForm";
import { Card, Empty, Field, PageHeader, StatusPill, input } from "@/components/app/ui";
import { ksh } from "@/lib/money";
import { addAlias, createUnits, updateUnit } from "../../../actions";

export const metadata: Metadata = { title: "Property" };

const TYPES = [["bedsitter", "Bedsitter"], ["studio", "Studio"], ["1br", "1 bedroom"], ["2br", "2 bedrooms"], ["3br", "3 bedrooms"], ["4br+", "4+ bedrooms"], ["shop", "Shop"], ["office", "Office"], ["other", "Other"]];

export default async function Property({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, org, can } = await appContext();
  const { data: p } = await supabase.from("properties").select("id, name, estate, county, code_prefix, default_due_day, default_grace_days").eq("id", id).eq("org_id", org.id).maybeSingle();
  if (!p) notFound();

  const [{ data: board }, { data: units }, { data: codes }] = await Promise.all([
    supabase.from("unit_board").select("id, label, unit_code, type, status, rent_amount, floor").eq("property_id", id).order("label"),
    can.seeMoney ? supabase.from("units").select("id, deposit_amount").eq("property_id", id) : Promise.resolve({ data: [] as { id: string; deposit_amount: number }[] }),
    supabase.from("unit_codes").select("unit_id, code, is_primary").eq("org_id", org.id),
  ]);
  const deposit = (uid: string) => units?.find((u) => u.id === uid)?.deposit_amount ?? 0;
  const aliases = (uid: string) => (codes ?? []).filter((c) => c.unit_id === uid && !c.is_primary).map((c) => c.code);
  const sorted = (board ?? []).sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));

  return (
    <div className="space-y-8">
      <Link href="/app/properties" className="inline-flex items-center gap-1.5 text-sm text-ink-600 hover:text-pink-700"><ArrowLeft size={14} /> Properties</Link>
      <PageHeader eyebrow={[p.estate, p.county].filter(Boolean).join(", ") || "Property"} title={p.name}>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <p className="text-sm text-ink-600">Rent due on day {p.default_due_day} · {p.default_grace_days} days’ grace · codes {p.code_prefix}-…</p>
          {!!sorted.length && <a href={`/app/properties/${p.id}/notice`} target="_blank" rel="noopener" className="btn btn-outline h-10 min-h-10"><FilePdf size={16} /> How-to-pay notice</a>}
        </div>
      </PageHeader>

      {can.edit && (
        <details className="rounded-[1.5rem] bg-white p-5 shadow-soft sm:p-6" open={!sorted.length}>
          <summary className="cursor-pointer text-lg font-medium">Import units and tenants from Excel or a photo</summary>
          <div className="mt-5">
            <RegisterImport propertyId={p.id} prefix={p.code_prefix} existingCodes={(codes ?? []).map((c) => c.code.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              aiEnabled={await aiImportEnabled()} doneHref={`/app/properties/${p.id}`} />
          </div>
        </details>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <section aria-label="Units" className="space-y-3">
          {!sorted.length && <Empty title="No units yet" text={can.edit ? "Add one unit or a whole floor at once using the form." : "No units have been added yet."} />}
          {sorted.map((u) => (
            <details key={u.id} className="group rounded-[1.25rem] bg-white shadow-soft">
              <summary className="grid cursor-pointer list-none grid-cols-[auto_1fr_auto] items-center gap-4 p-4 sm:grid-cols-[80px_1fr_120px_110px] [&::-webkit-details-marker]:hidden">
                <span className="text-lg font-medium">{u.label}</span>
                <span className="text-sm"><span className="num font-semibold">{u.unit_code}</span><span className="block text-ink-600">{TYPES.find((t) => t[0] === u.type)?.[1]}{aliases(u.id).length ? ` · also ${aliases(u.id).join(", ")}` : ""}</span></span>
                <span className="num hidden text-sm sm:block">{can.seeMoney ? ksh(u.rent_amount) : ""}</span>
                <StatusPill status={u.status} />
              </summary>
              {can.edit && (
                <div className="grid gap-5 border-t border-line p-4 sm:grid-cols-2">
                  <ActionForm action={updateUnit} submit="Save unit" resetOnSuccess={false} submitClass="btn btn-outline h-10 min-h-10">
                    <input type="hidden" name="id" value={u.id} />
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Rent (KSh)" htmlFor={`r-${u.id}`}><input id={`r-${u.id}`} name="rent" inputMode="numeric" defaultValue={(u.rent_amount ?? 0) / 100} className={input} /></Field>
                      <Field label="Deposit (KSh)" htmlFor={`d-${u.id}`}><input id={`d-${u.id}`} name="deposit" inputMode="numeric" defaultValue={deposit(u.id) / 100} className={input} /></Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Type" htmlFor={`t-${u.id}`}><select id={`t-${u.id}`} name="type" defaultValue={u.type} className={input}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
                      {(u.status === "vacant" || u.status === "maintenance") && (
                        <Field label="Status" htmlFor={`s-${u.id}`}><select id={`s-${u.id}`} name="status" defaultValue={u.status} className={input}><option value="vacant">Vacant</option><option value="maintenance">Under maintenance</option></select></Field>
                      )}
                    </div>
                  </ActionForm>
                  <ActionForm action={addAlias} submit="Add code" submitClass="btn btn-outline h-10 min-h-10">
                    <input type="hidden" name="unit_id" value={u.id} /><input type="hidden" name="property_id" value={p.id} />
                    <Field label="Another code tenants use" htmlFor={`a-${u.id}`} hint="e.g. an old unit number. Payments with it will match this unit.">
                      <input id={`a-${u.id}`} name="code" placeholder="SUNRISE B4" className={`${input} uppercase`} />
                    </Field>
                  </ActionForm>
                </div>
              )}
            </details>
          ))}
        </section>

        {can.edit && (
          <Card className="h-fit">
            <h2 className="text-lg font-medium">Add units</h2>
            <div className="mt-4">
              <ActionForm action={createUnits} submit="Add units">
                <input type="hidden" name="property_id" value={p.id} />
                <Field label="One unit" htmlFor="label" hint={`Becomes ${p.code_prefix}-B4 for M-Pesa.`}><input id="label" name="label" placeholder="B4" className={`${input} uppercase`} /></Field>
                <fieldset>
                  <legend className="text-sm font-medium">…or a range</legend>
                  <div className="mt-1.5 grid grid-cols-3 gap-2">
                    <input aria-label="Letter" name="range_prefix" placeholder="B" className={`${input} mt-0 uppercase`} />
                    <input aria-label="From" name="range_from" type="number" min={0} placeholder="1" className={`${input} mt-0`} />
                    <input aria-label="To" name="range_to" type="number" min={0} placeholder="12" className={`${input} mt-0`} />
                  </div>
                  <p className="mt-1 text-xs text-ink-600">B, 1 to 12 adds B1 … B12.</p>
                </fieldset>
                <Field label="Type" htmlFor="type"><select id="type" name="type" className={input}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Monthly rent (KSh)" htmlFor="rent"><input id="rent" name="rent" inputMode="numeric" placeholder="15000" className={input} /></Field>
                  <Field label="Deposit (KSh)" htmlFor="deposit"><input id="deposit" name="deposit" inputMode="numeric" placeholder="15000" className={input} /></Field>
                </div>
              </ActionForm>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
