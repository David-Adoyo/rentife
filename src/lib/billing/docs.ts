import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { siteUrl } from "@/lib/app/safe-next";
import { todayKE } from "@/core/billing";
import type { InvoiceData, Party, StatementData } from "@/lib/pdf/billing";

/** Everything printed in the header of an invoice or statement. RLS decides whether the caller may read it. */
export async function loadParty(supabase: SupabaseClient, tenancyId: string): Promise<(Party & { orgId: string }) | null> {
  const { data: t } = await supabase.from("tenancies")
    .select("id, org_id, tenants(full_name, phones), units(unit_code, label, properties(name))")
    .eq("id", tenancyId).maybeSingle();
  if (!t) return null;
  const [{ data: pay }, { data: org }] = await Promise.all([
    supabase.from("payment_settings").select("method, shortcode, bank_account_hint").eq("org_id", t.org_id).maybeSingle(),
    supabase.from("organisations").select("name, contact_phone").eq("id", t.org_id).single(),
  ]);
  if (!org) return null;
  const tenant = t.tenants as unknown as { full_name: string; phones: string[] };
  const unit = t.units as unknown as { unit_code: string; label: string; properties: { name: string } };
  return {
    orgId: t.org_id, org: org.name, orgPhone: org.contact_phone, tenant: tenant.full_name, phone: tenant.phones?.[0] ?? null,
    unitCode: unit.unit_code, unitLabel: unit.label, property: unit.properties.name,
    pay: pay ? { method: pay.method, shortcode: pay.shortcode, bankAccountHint: pay.bank_account_hint ?? "" } : null,
    logoUrl: `${siteUrl()}/brand/rentife-wordmark-white.png`,
  };
}

export async function loadInvoice(supabase: SupabaseClient, invoiceId: string): Promise<InvoiceData | null> {
  const { data: inv } = await supabase.from("invoice_summary").select("*").eq("id", invoiceId).maybeSingle();
  if (!inv) return null;
  const party = await loadParty(supabase, inv.tenancy_id);
  if (!party) return null;
  const [{ data: lines }, { data: bal }] = await Promise.all([
    supabase.from("invoice_lines").select("charge_id").eq("invoice_id", invoiceId),
    supabase.from("tenancy_balances").select("balance").eq("tenancy_id", inv.tenancy_id).maybeSingle(),
  ]);
  const { data: charges } = await supabase.from("charge_balances").select("description, amount, outstanding, status, due_date, charge_type")
    .in("id", (lines ?? []).map((l) => l.charge_id)).order("due_date").order("charge_type");
  return {
    ...party, number: inv.number, issuedOn: inv.issued_on, dueDate: inv.due_date, period: inv.period,
    lines: (charges ?? []).map((c) => ({ description: c.description, amount: c.amount, outstanding: c.outstanding, status: c.status })),
    accountBalance: bal?.balance ?? 0,
  };
}

export type StatementLine = { id: number; effective_date: string; description: string; debit: number; credit: number; running_balance: number; kind: string };

export async function loadStatementLines(supabase: SupabaseClient, tenancyId: string) {
  const { data } = await supabase.from("statement_lines").select("id, effective_date, description, debit, credit, running_balance, kind")
    .eq("tenancy_id", tenancyId).order("effective_date").order("id").limit(2000);
  return (data ?? []) as StatementLine[];
}

export async function loadStatement(supabase: SupabaseClient, tenancyId: string, from: string | null, to: string | null): Promise<StatementData | null> {
  const party = await loadParty(supabase, tenancyId);
  if (!party) return null;
  const all = await loadStatementLines(supabase, tenancyId);
  const end = to ?? todayKE();
  const before = from ? all.filter((l) => l.effective_date < from) : [];
  const inRange = all.filter((l) => (!from || l.effective_date >= from) && l.effective_date <= end);
  const opening = before.at(-1)?.running_balance ?? 0;
  return {
    ...party, from, to: end, opening, generatedOn: todayKE(),
    lines: inRange.map((l) => ({ date: l.effective_date, description: l.description, debit: l.debit, credit: l.credit, balance: l.running_balance })),
    closing: inRange.at(-1)?.running_balance ?? opening,
  };
}
