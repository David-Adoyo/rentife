import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { appContext } from "@/lib/app/context";
import { ActionForm } from "@/components/app/ActionForm";
import { Card, Empty, Field, PageHeader, StatusPill, input } from "@/components/app/ui";
import { dateKE, ksh } from "@/lib/money";
import { createTenant, endTenancy, startTenancy } from "../../actions";

export const metadata: Metadata = { title: "Tenants" };

type Tenancy = { id: string; status: string; start_date: string; rent_amount: number; unit_id: string; units: { unit_code: string; property_id: string } | null };

export default async function Tenants({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { supabase, org, can } = await appContext();
  if (!can.seeTenants) redirect("/app");
  const q = ((await searchParams).q ?? "").trim().slice(0, 60);
  let query = supabase.from("tenants")
    .select("id, full_name, phones, email, preferred_language, tenancies(id, status, start_date, rent_amount, unit_id, units(unit_code, property_id))")
    .eq("org_id", org.id).is("archived_at", null).order("full_name").limit(300);
  if (q) query = query.ilike("full_name", `%${q.replace(/[%_]/g, "")}%`);
  const [{ data: tenants }, { data: vacant }] = await Promise.all([
    query,
    supabase.from("unit_board").select("id, unit_code, property_name, rent_amount").eq("org_id", org.id).eq("status", "vacant").order("unit_code"),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={org.name} title="Tenants">
        <form role="search" className="flex gap-2">
          <label htmlFor="q" className="sr-only">Search tenants</label>
          <input id="q" name="q" defaultValue={q} placeholder="Search by name" className={`${input} mt-0 w-56`} />
          <button className="btn btn-outline h-11">Search</button>
        </form>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <section aria-label="Tenants" className="space-y-3">
          {!tenants?.length && <Empty title={q ? "No tenants match" : "No tenants yet"} text={q ? "Try another name." : "Add your tenants, then move each one into their unit."} />}
          {tenants?.map((t) => {
            const live = (t.tenancies as unknown as Tenancy[]).find((x) => x.status === "active" || x.status === "notice");
            return (
              <details key={t.id} className="rounded-[1.25rem] bg-white shadow-soft">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 [&::-webkit-details-marker]:hidden">
                  <span>
                    <span className="block font-medium">{t.full_name}</span>
                    <span className="num text-sm text-ink-600">{(t.phones as string[]).join(" · ")}</span>
                  </span>
                  {live ? <span className="text-right text-sm"><span className="num font-semibold">{live.units?.unit_code}</span><br /><span className="text-ink-600">{ksh(live.rent_amount)}</span></span> : <StatusPill status="vacant" />}
                </summary>
                <div className="border-t border-line p-4 text-sm">
                  {live ? (
                    <div className="flex flex-wrap items-end justify-between gap-4">
                      <p>In <b className="num">{live.units?.unit_code}</b> since {dateKE(live.start_date)}, rent {ksh(live.rent_amount)}.</p>
                      {can.edit && (
                        <ActionForm action={endTenancy} submit="End tenancy" className="flex items-end gap-2" submitClass="btn btn-outline h-10 min-h-10">
                          <input type="hidden" name="tenancy_id" value={live.id} />
                          <Field label="Move-out date" htmlFor={`e-${live.id}`}><input id={`e-${live.id}`} name="end_date" type="date" defaultValue={today} className={`${input} h-10`} /></Field>
                        </ActionForm>
                      )}
                    </div>
                  ) : can.edit ? (
                    vacant?.length ? (
                      <ActionForm action={startTenancy} submit="Move in">
                        <input type="hidden" name="tenant_id" value={t.id} />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label="Unit" htmlFor={`u-${t.id}`}>
                            <select id={`u-${t.id}`} name="unit_id" required className={input}>
                              <option value="">Choose a vacant unit</option>
                              {vacant.map((v) => <option key={v.id} value={v.id}>{v.unit_code} · {v.property_name} · {ksh(v.rent_amount)}</option>)}
                            </select>
                          </Field>
                          <Field label="Start date" htmlFor={`sd-${t.id}`}><input id={`sd-${t.id}`} name="start_date" type="date" defaultValue={today} required className={input} /></Field>
                          <Field label="Rent (KSh)" htmlFor={`rr-${t.id}`} hint="Leave blank to use the unit’s rent."><input id={`rr-${t.id}`} name="rent" inputMode="numeric" className={input} /></Field>
                          <Field label="Due day" htmlFor={`dd-${t.id}`} hint="Leave blank to use the property’s."><input id={`dd-${t.id}`} name="due_day" type="number" min={1} max={28} className={input} /></Field>
                        </div>
                      </ActionForm>
                    ) : <p className="text-ink-600">No vacant units. Add units to a property first.</p>
                  ) : <p className="text-ink-600">Not currently in a unit.</p>}
                </div>
              </details>
            );
          })}
        </section>

        {can.edit && (
          <Card className="h-fit">
            <h2 className="text-lg font-medium">Add a tenant</h2>
            <div className="mt-4">
              <ActionForm action={createTenant} submit="Add tenant">
                <Field label="Full name" htmlFor="full_name"><input id="full_name" name="full_name" required className={input} /></Field>
                <Field label="Phone" htmlFor="phone" hint="The number they pay rent from."><input id="phone" name="phone" type="tel" inputMode="tel" placeholder="0712 345 678" required className={input} /></Field>
                <Field label="Second phone (optional)" htmlFor="phone2" hint="e.g. a spouse who sometimes pays."><input id="phone2" name="phone2" type="tel" inputMode="tel" className={input} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="ID: last 4 digits" htmlFor="national_id_last4"><input id="national_id_last4" name="national_id_last4" inputMode="numeric" maxLength={4} className={input} /></Field>
                  <Field label="Language" htmlFor="preferred_language"><select id="preferred_language" name="preferred_language" className={input}><option value="en">English</option><option value="sw">Kiswahili</option></select></Field>
                </div>
                <Field label="Email (optional)" htmlFor="email"><input id="email" name="email" type="email" className={input} /></Field>
                <fieldset className="space-y-2 text-sm">
                  <legend className="font-medium">Tenant agrees to receive</legend>
                  <label className="flex items-center gap-2"><input type="checkbox" name="consent_sms" defaultChecked className="accent-plum-800" /> SMS receipts and reminders</label>
                  <label className="flex items-center gap-2"><input type="checkbox" name="consent_whatsapp" className="accent-plum-800" /> WhatsApp messages</label>
                </fieldset>
              </ActionForm>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
