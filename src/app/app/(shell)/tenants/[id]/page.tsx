import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { appContext } from "@/lib/app/context";
import { ActionForm } from "@/components/app/ActionForm";
import { Card, Empty, Field, StatusPill, input } from "@/components/app/ui";
import { dateKE, ksh } from "@/lib/money";
import { addMonths, label, periodOf, todayKE } from "@/core/billing";
import { loadStatementLines } from "@/lib/billing/docs";
import { addCharge, addRentReview, makeAdjustment } from "../../../billing-actions";

export const metadata: Metadata = { title: "Tenant" };

type Tenancy = {
  id: string; status: string; start_date: string; end_date: string | null; billing_from: string; rent_amount: number; due_day: number;
  billing_frequency: string; units: { unit_code: string; label: string; properties: { name: string } } | null;
};

const chargeStatus: Record<string, string> = { open: "bg-overdue/10 text-overdue", part_paid: "bg-partial/15 text-[#8a5c0f]", paid: "bg-paid/10 text-paid", waived: "bg-vacant/15 text-[#5f5d55]" };
const statusText: Record<string, string> = { open: "Owed", part_paid: "Part paid", paid: "Settled", waived: "Waived" };

export default async function TenantPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tenancy?: string }> }) {
  const { supabase, org, can, role } = await appContext();
  if (!can.seeTenants) redirect("/app");
  const { id } = await params;
  const { data: tenant } = await supabase.from("tenants")
    .select("id, full_name, phones, email, tenancies(id, status, start_date, end_date, billing_from, rent_amount, due_day, billing_frequency, units(unit_code, label, properties(name)))")
    .eq("id", id).eq("org_id", org.id).maybeSingle();
  if (!tenant) notFound();
  const tenancies = ((tenant.tenancies ?? []) as unknown as Tenancy[]).sort((a, b) => b.start_date.localeCompare(a.start_date));
  const wanted = (await searchParams).tenancy;
  const t = tenancies.find((x) => x.id === wanted) ?? tenancies.find((x) => x.status !== "ended") ?? tenancies[0];

  return (
    <div className="space-y-8">
      <div>
        <Link href="/app/tenants" className="text-sm text-ink-600 hover:text-plum-800">‹ Tenants</Link>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">{tenant.full_name}</h1>
            <p className="num mt-1 text-ink-600">{(tenant.phones as string[]).join(" · ")}{tenant.email ? ` · ${tenant.email}` : ""}</p>
          </div>
          {tenancies.length > 1 && (
            <nav aria-label="Tenancies" className="flex flex-wrap gap-2">
              {tenancies.map((x) => (
                <Link key={x.id} href={`?tenancy=${x.id}`} aria-current={x.id === t?.id ? "page" : undefined}
                  className={`rounded-full px-3 py-1 text-sm ${x.id === t?.id ? "bg-plum-800 text-white" : "bg-white shadow-soft"}`}>
                  {x.units?.unit_code} · {dateKE(x.start_date)}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </div>
      {t ? <TenancyMoney t={t} tenantId={tenant.id} canEdit={can.edit} isOwner={role === "owner"} /> :
        <Empty title="Not in a unit yet" text="Move this tenant into a unit from the Tenants page, and their charges will appear here." />}
    </div>
  );
}

async function TenancyMoney({ t, tenantId, canEdit, isOwner }: { t: Tenancy; tenantId: string; canEdit: boolean; isOwner: boolean }) {
  const { supabase, org } = await appContext();
  const [{ data: bal }, { data: invoices }, { data: charges }, { data: types }, { data: reviews }, lines] = await Promise.all([
    supabase.from("tenancy_balances").select("balance, total_debits, total_credits").eq("tenancy_id", t.id).maybeSingle(),
    supabase.from("invoice_summary").select("id, number, period, issued_on, due_date, total, outstanding").eq("tenancy_id", t.id).order("period", { ascending: false }).limit(24),
    supabase.from("charge_balances").select("id, description, amount, outstanding, status, due_date, period, charge_type").eq("tenancy_id", t.id).order("due_date", { ascending: false }).limit(60),
    supabase.from("charge_types").select("code, name").eq("org_id", org.id).eq("active", true).order("priority"),
    supabase.from("rent_reviews").select("id, effective_from, new_rent").eq("tenancy_id", t.id).order("effective_from"),
    loadStatementLines(supabase, t.id),
  ]);
  const balance = bal?.balance ?? 0;
  const today = todayKE();
  const overdue = (charges ?? []).filter((c) => c.outstanding > 0 && c.due_date < today).reduce((s, c) => s + c.outstanding, 0);
  const open = (charges ?? []).filter((c) => c.outstanding > 0);
  const recent = lines.slice(-40);
  const yearStart = `${today.slice(0, 4)}-01-01`;
  const pdf = `/app/tenants/${tenantId}/statement?tenancy=${t.id}`;
  const nextMonth = addMonths(periodOf(today), 1);

  return (
    <>
      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-sm text-ink-600">{balance < 0 ? "In credit" : "Balance owed"}</p>
          <p className={`num mt-1 text-3xl font-semibold ${balance > 0 ? "text-overdue" : "text-paid"}`}>{ksh(Math.abs(balance))}</p>
          {overdue > 0 && <p className="num mt-1 text-sm text-overdue">{ksh(overdue)} past due</p>}
        </Card>
        <Card>
          <p className="text-sm text-ink-600">Unit</p>
          <p className="num mt-1 text-2xl font-semibold">{t.units?.unit_code}</p>
          <p className="text-sm text-ink-600">{t.units?.label} · {t.units?.properties.name}</p>
        </Card>
        <Card>
          <p className="text-sm text-ink-600">Rent</p>
          <p className="num mt-1 text-2xl font-semibold">{ksh(t.rent_amount)}</p>
          <p className="text-sm text-ink-600">{t.billing_frequency === "quarterly" ? "Every quarter" : "Monthly"}, due on day {t.due_day}</p>
        </Card>
        <Card>
          <p className="text-sm text-ink-600">Tenancy</p>
          <p className="mt-1"><StatusPill status={t.status} /></p>
          <p className="mt-1 text-sm text-ink-600">From {dateKE(t.start_date)}{t.end_date ? ` to ${dateKE(t.end_date)}` : ""}. Billed from {label(periodOf(t.billing_from))}.</p>
        </Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <div className="min-w-0 space-y-6">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-medium">Statement</h2>
              <div className="flex flex-wrap gap-2 text-sm">
                <a className="btn btn-outline h-9 min-h-9" href={`${pdf}&from=${yearStart}`} target="_blank" rel="noopener">PDF: this year</a>
                <a className="btn btn-outline h-9 min-h-9" href={pdf} target="_blank" rel="noopener">PDF: all</a>
              </div>
            </div>
            {!recent.length ? <p className="mt-4 text-ink-600">No charges yet. The first one is created a few days before the rent is due.</p> : (
              <div className="relative mt-4 overflow-x-auto">
                {lines.length > recent.length && <p className="mb-2 text-xs text-ink-600">Showing the latest {recent.length} of {lines.length} entries. The PDF has them all.</p>}
                <table className="w-full min-w-[560px] text-sm">
                  <thead><tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-600">
                    <th className="py-2 font-semibold">Date</th><th className="font-semibold">Description</th>
                    <th className="text-right font-semibold">Charged</th><th className="text-right font-semibold">Paid / credit</th><th className="text-right font-semibold">Balance</th>
                  </tr></thead>
                  <tbody>
                    {recent.map((l) => (
                      <tr key={l.id} className="border-b border-line/70">
                        <td className="num whitespace-nowrap py-2 pr-3">{dateKE(l.effective_date)}</td>
                        <td className="pr-3">{l.description}</td>
                        <td className="num whitespace-nowrap text-right">{l.debit ? ksh(l.debit) : ""}</td>
                        <td className="num whitespace-nowrap text-right text-paid">{l.credit ? ksh(l.credit) : ""}</td>
                        <td className="num whitespace-nowrap text-right font-medium">{l.running_balance < 0 ? `−${ksh(-l.running_balance)}` : ksh(l.running_balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-medium">Invoices</h2>
            {!invoices?.length ? <p className="mt-3 text-ink-600">No invoices yet.</p> : (
              <ul className="mt-3 divide-y divide-line">
                {invoices.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
                    <span><span className="num font-medium">{i.number}</span> <span className="text-ink-600">· {label(i.period)} · due {dateKE(i.due_date)}</span></span>
                    <span className="flex items-center gap-3">
                      <span className="num">{ksh(i.total)}</span>
                      {i.outstanding > 0 ? <span className="num text-overdue">{ksh(i.outstanding)} owed</span> : <span className="text-paid">Settled</span>}
                      <a className="font-medium text-plum-800 underline" href={`/app/billing/invoices/${i.id}`} target="_blank" rel="noopener">PDF<span className="sr-only"> of {i.number}</span></a>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-medium">Charges</h2>
            {!charges?.length ? <p className="mt-3 text-ink-600">No charges yet.</p> : (
              <ul className="mt-3 divide-y divide-line">
                {charges.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <span>{c.description} <span className="text-ink-600">· due {dateKE(c.due_date)}</span></span>
                    <span className="flex items-center gap-3">
                      <span className="num">{ksh(c.amount)}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${chargeStatus[c.status]}`}>
                        {c.status === "part_paid" ? `${ksh(c.outstanding)} owed` : statusText[c.status]}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {canEdit && (
          <div className="min-w-0 space-y-6">
            <Card>
              <h2 className="text-lg font-medium">Add a charge</h2>
              <p className="mt-1 text-sm text-ink-600">For one-off items such as a repair or a replacement key. It goes on this month’s invoice.</p>
              <div className="mt-4">
                <ActionForm action={addCharge} submit="Add charge">
                  <input type="hidden" name="tenancy_id" value={t.id} />
                  <Field label="Type" htmlFor="charge_type">
                    <select id="charge_type" name="charge_type" className={input}>
                      {(types ?? []).filter((x) => !["rent", "opening_balance"].includes(x.code)).map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}
                    </select>
                  </Field>
                  <Field label="What it’s for" htmlFor="description"><input id="description" name="description" required placeholder="e.g. Replacement gate key" className={input} /></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Amount (KSh)" htmlFor="amount"><input id="amount" name="amount" inputMode="numeric" required className={input} /></Field>
                    <Field label="Due date" htmlFor="due_date"><input id="due_date" name="due_date" type="date" defaultValue={today} required className={input} /></Field>
                  </div>
                </ActionForm>
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-medium">Credit, waive or write off</h2>
              <p className="mt-1 text-sm text-ink-600">Nothing is ever deleted. Each of these adds a new line to the statement with your reason.</p>
              <div className="mt-4">
                <ActionForm action={makeAdjustment} submit="Save">
                  <input type="hidden" name="tenancy_id" value={t.id} />
                  <Field label="What to do" htmlFor="kind" hint={isOwner ? undefined : "Only the owner can write off a debt."}>
                    <select id="kind" name="kind" className={input}>
                      <option value="credit_note">Credit note: give the tenant credit</option>
                      <option value="waiver">Waive part or all of a charge</option>
                      {isOwner && <option value="write_off">Write off a debt you won’t recover</option>}
                    </select>
                  </Field>
                  <Field label="Charge (for waivers and write-offs)" htmlFor="charge_id">
                    <select id="charge_id" name="charge_id" className={input}>
                      <option value="">Not needed for a credit note</option>
                      {open.map((c) => <option key={c.id} value={c.id}>{c.description}: {ksh(c.outstanding)} owed</option>)}
                    </select>
                  </Field>
                  <Field label="Amount (KSh)" htmlFor="adj_amount"><input id="adj_amount" name="amount" inputMode="numeric" required className={input} /></Field>
                  <Field label="Reason" htmlFor="reason" hint="Kept on the record and shown on the statement."><input id="reason" name="reason" required minLength={3} maxLength={300} className={input} /></Field>
                </ActionForm>
              </div>
            </Card>

            {t.status !== "ended" && (
              <Card>
                <h2 className="text-lg font-medium">Change the rent</h2>
                <p className="mt-1 text-sm text-ink-600">The new rent applies from the first of the month you choose. Months already invoiced don’t change.</p>
                {!!reviews?.length && (
                  <ul className="mt-3 space-y-1 text-sm">
                    {reviews.map((r) => <li key={r.id} className="num">{label(periodOf(r.effective_from))}: {ksh(r.new_rent)}</li>)}
                  </ul>
                )}
                <div className="mt-4">
                  <ActionForm action={addRentReview} submit="Schedule change">
                    <input type="hidden" name="tenancy_id" value={t.id} />
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="From month" htmlFor="month"><input id="month" name="month" type="month" min={nextMonth} defaultValue={nextMonth} required className={input} /></Field>
                      <Field label="New rent (KSh)" htmlFor="new_rent"><input id="new_rent" name="new_rent" inputMode="numeric" required className={input} /></Field>
                    </div>
                  </ActionForm>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </>
  );
}
