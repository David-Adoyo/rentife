import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { appContext } from "@/lib/app/context";
import { ActionForm } from "@/components/app/ActionForm";
import { Card, Empty, Field, PageHeader, input } from "@/components/app/ui";
import { dateKE, ksh } from "@/lib/money";
import { addMonths, label, periodOf, todayKE } from "@/core/billing";
import { addRecurring, runBillingNow, stopRecurring } from "../../billing-actions";

export const metadata: Metadata = { title: "Billing" };

export default async function Billing({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { supabase, org, can } = await appContext();
  if (!can.seeMoney) redirect("/app");
  const today = todayKE();
  const asked = (await searchParams).period ?? "";
  const period = /^\d{4}-(0[1-9]|1[0-2])$/.test(asked) ? asked : periodOf(today);

  const [{ data: o }, { data: invoices }, { data: balances }, { data: tenancies }, { data: recurring }, { data: runs }, { data: types }, { data: props }, { data: units }] = await Promise.all([
    supabase.from("organisations").select("billing_lead_days").eq("id", org.id).single(),
    supabase.from("invoice_summary").select("id, number, tenancy_id, issued_on, due_date, total, outstanding").eq("org_id", org.id).eq("period", period).order("number"),
    supabase.from("tenancy_balances").select("tenancy_id, balance").eq("org_id", org.id),
    supabase.from("tenancies").select("id, tenant_id, tenants(full_name), units(unit_code)").eq("org_id", org.id),
    supabase.from("recurring_charges").select("id, property_id, unit_id, charge_type, amount, description, starts_on, ends_on, active").eq("org_id", org.id).order("created_at", { ascending: false }),
    supabase.from("billing_runs").select("id, as_of, trigger, charges_created, invoices_created, credits_applied, run_at").eq("org_id", org.id).order("run_at", { ascending: false }).limit(8),
    supabase.from("charge_types").select("code, name").eq("org_id", org.id).eq("active", true).order("priority"),
    supabase.from("properties").select("id, name").eq("org_id", org.id).is("archived_at", null).order("name"),
    supabase.from("unit_board").select("id, unit_code, property_name").eq("org_id", org.id).order("unit_code"),
  ]);
  const who = new Map((tenancies ?? []).map((t) => [t.id, {
    tenant: (t.tenants as unknown as { full_name: string } | null)?.full_name ?? "", tenantId: t.tenant_id,
    unit: (t.units as unknown as { unit_code: string } | null)?.unit_code ?? "",
  }]));
  const typeName = new Map((types ?? []).map((t) => [t.code, t.name]));
  const propName = new Map((props ?? []).map((p) => [p.id, p.name]));
  const unitCode = new Map((units ?? []).map((u) => [u.id, u.unit_code]));
  const billed = (invoices ?? []).reduce((s, i) => s + i.total, 0);
  const stillOwed = (invoices ?? []).reduce((s, i) => s + i.outstanding, 0);
  const totalOwed = (balances ?? []).reduce((s, b) => s + Math.max(0, b.balance), 0);
  const credit = (balances ?? []).reduce((s, b) => s + Math.max(0, -b.balance), 0);
  const lead = o?.billing_lead_days ?? 5;
  const live = (recurring ?? []).filter((r) => r.active);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={org.name} title="Billing">
        {can.edit && (
          <ActionForm action={runBillingNow} submit="Run billing now" className="flex flex-col items-start gap-1 sm:items-end" submitClass="btn btn-primary h-11">
            <span className="text-xs text-ink-600">Safe to press any time: nothing is ever charged twice.</span>
          </ActionForm>
        )}
      </PageHeader>

      <p className="max-w-3xl text-ink-600">
        Rentife creates each tenant’s charges and invoice automatically every night, {lead} days before their rent is due.
        Tenants who move in or out part-way through a month pay only for the days they stay.
      </p>

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><p className="text-sm text-ink-600">Invoiced for {label(period)}</p><p className="num mt-1 text-2xl font-semibold">{ksh(billed)}</p><p className="text-sm text-ink-600">{invoices?.length ?? 0} invoices</p></Card>
        <Card><p className="text-sm text-ink-600">Still owed for {label(period)}</p><p className={`num mt-1 text-2xl font-semibold ${stillOwed ? "text-overdue" : "text-paid"}`}>{ksh(stillOwed)}</p></Card>
        <Card><p className="text-sm text-ink-600">Owed across all tenants</p><p className="num mt-1 text-2xl font-semibold">{ksh(totalOwed)}</p></Card>
        <Card><p className="text-sm text-ink-600">Credit held for tenants</p><p className="num mt-1 text-2xl font-semibold">{ksh(credit)}</p></Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <div className="min-w-0 space-y-6">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-medium">Invoices: {label(period)}</h2>
              <nav aria-label="Month" className="flex gap-2 text-sm">
                <Link className="btn btn-outline h-9 min-h-9" href={`?period=${addMonths(period, -1)}`}>‹ {label(addMonths(period, -1))}</Link>
                <Link className="btn btn-outline h-9 min-h-9" href={`?period=${addMonths(period, 1)}`}>{label(addMonths(period, 1))} ›</Link>
              </nav>
            </div>
            {!invoices?.length ? (
              <div className="mt-4"><Empty title="No invoices for this month yet" text={`They appear ${lead} days before each tenant’s due day, or when you press “Run billing now”.`} /></div>
            ) : (
              <div className="relative mt-4 overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead><tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-600">
                    <th className="py-2 font-semibold">Invoice</th><th className="font-semibold">Tenant</th><th className="font-semibold">Unit</th>
                    <th className="text-right font-semibold">Total</th><th className="text-right font-semibold">Owed</th><th><span className="sr-only">PDF</span></th>
                  </tr></thead>
                  <tbody>
                    {invoices.map((i) => {
                      const w = who.get(i.tenancy_id);
                      return (
                        <tr key={i.id} className="border-b border-line/70">
                          <td className="num py-2 pr-3">{i.number}</td>
                          <td className="pr-3">{w ? <Link className="hover:underline" href={`/app/tenants/${w.tenantId}?tenancy=${i.tenancy_id}`}>{w.tenant}</Link> : "—"}</td>
                          <td className="num pr-3">{w?.unit}</td>
                          <td className="num whitespace-nowrap text-right">{ksh(i.total)}</td>
                          <td className={`num text-right ${i.outstanding ? "text-overdue" : "text-paid"}`}>{i.outstanding ? ksh(i.outstanding) : "Settled"}</td>
                          <td className="pl-3 text-right"><a className="font-medium text-plum-800 underline" href={`/app/billing/invoices/${i.id}`} target="_blank" rel="noopener">PDF<span className="sr-only"> of {i.number}</span></a></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-medium">Billing runs</h2>
            {!runs?.length ? <p className="mt-3 text-ink-600">No runs yet. The first automatic run is tonight just after midnight.</p> : (
              <ul className="mt-3 divide-y divide-line text-sm">
                {runs.map((r) => (
                  <li key={r.id} className="flex flex-wrap justify-between gap-2 py-2.5">
                    <span>{new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Nairobi", dateStyle: "medium", timeStyle: "short" }).format(new Date(r.run_at))} <span className="text-ink-600">· {r.trigger === "cron" ? "automatic" : "run by hand"}</span></span>
                    <span className="num text-ink-600">{r.charges_created} charges · {r.invoices_created} invoices{r.credits_applied ? ` · ${ksh(r.credits_applied)} credit used` : ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <h2 className="text-lg font-medium">Recurring charges</h2>
            <p className="mt-1 text-sm text-ink-600">Added to every invoice for a whole property or one unit: service charge, garbage, security or parking.</p>
            {!live.length ? <p className="mt-3 text-sm text-ink-600">None yet.</p> : (
              <ul className="mt-3 divide-y divide-line text-sm">
                {live.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span>
                      <span className="block font-medium">{r.description || typeName.get(r.charge_type)}: <span className="num">{ksh(r.amount)}</span> a month</span>
                      <span className="text-ink-600">{r.property_id ? `Every unit in ${propName.get(r.property_id) ?? "a property"}` : `Unit ${unitCode.get(r.unit_id!) ?? ""}`} · from {dateKE(r.starts_on)}</span>
                    </span>
                    {can.edit && (
                      <ActionForm action={stopRecurring} submit="Stop" submitClass="btn btn-outline h-9 min-h-9">
                        <input type="hidden" name="id" value={r.id} />
                      </ActionForm>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {can.edit && (
              <div className="mt-5 border-t border-line pt-5">
                <ActionForm action={addRecurring} submit="Add recurring charge">
                  <Field label="Applies to" htmlFor="target">
                    <select id="target" name="target" required className={input}>
                      <option value="">Choose a property or unit</option>
                      <optgroup label="Whole property">{(props ?? []).map((p) => <option key={p.id} value={`p:${p.id}`}>{p.name}</option>)}</optgroup>
                      <optgroup label="One unit">{(units ?? []).map((u) => <option key={u.id} value={`u:${u.id}`}>{u.unit_code} · {u.property_name}</option>)}</optgroup>
                    </select>
                  </Field>
                  <Field label="Type" htmlFor="rc_type">
                    <select id="rc_type" name="charge_type" defaultValue="service_charge" className={input}>
                      {(types ?? []).filter((x) => !["rent", "opening_balance", "deposit", "late_fee"].includes(x.code)).map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Description (optional)" htmlFor="rc_desc"><input id="rc_desc" name="description" placeholder="e.g. Service charge" className={input} /></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Monthly amount (KSh)" htmlFor="rc_amount"><input id="rc_amount" name="amount" inputMode="numeric" required className={input} /></Field>
                    <Field label="Starts" htmlFor="rc_start"><input id="rc_start" name="starts_on" type="date" defaultValue={`${addMonths(periodOf(today), 1)}-01`} className={input} /></Field>
                  </div>
                </ActionForm>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-medium">How payments are applied</h2>
            <p className="mt-1 text-sm text-ink-600">Money and credit pay off the oldest charge first. Charges due the same day are paid in this order:</p>
            <ol className="mt-3 list-decimal space-y-0.5 pl-5 text-sm">
              {(types ?? []).map((t) => <li key={t.code}>{t.name}</li>)}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
