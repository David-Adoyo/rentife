"use server";

import { revalidatePath } from "next/cache";
import { appContext } from "@/lib/app/context";
import { todayKE, periodOf } from "@/core/billing";
import { computeCharges, toRecurring, toReview, toTenancy } from "@/lib/billing/run";
import { toCents } from "@/lib/money";
import type { ActionResult } from "@/components/app/ActionForm";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const plain = (m: string) =>
  /not allowed|permission|row-level/i.test(m) ? "You don’t have permission to do that." : m.length < 160 ? m : "That didn’t work. Please try again.";

/** "Run billing now": the same engine as the daily run, limited to what this person may see. */
export async function runBillingNow(_: ActionResult): Promise<ActionResult> {
  const { supabase, org, can } = await appContext();
  if (!can.edit) return { error: "Only owners and managers can run billing." };
  const today = todayKE();
  const [{ data: o }, { data: ten }, { data: rev }, { data: rec }] = await Promise.all([
    supabase.from("organisations").select("billing_lead_days").eq("id", org.id).single(),
    supabase.from("tenancies").select("*, units(property_id)").eq("org_id", org.id),
    supabase.from("rent_reviews").select("*").eq("org_id", org.id),
    supabase.from("recurring_charges").select("*").eq("org_id", org.id).eq("active", true),
  ]);
  const tenancies = (ten ?? [])
    .filter((t) => t.status !== "ended" || (t.end_date && t.end_date >= new Date(Date.now() - 62 * 864e5).toISOString().slice(0, 10)))
    .map((t) => toTenancy({ ...t, property_id: (t.units as { property_id: string }).property_id }));
  const charges = computeCharges({ leadDays: o?.billing_lead_days ?? 5, tenancies, reviews: (rev ?? []).map(toReview), recurring: (rec ?? []).map(toRecurring) }, today);
  const { data, error } = await supabase.rpc("post_charges", { p_org: org.id, p_as_of: today, p_trigger: "manual", p_charges: charges });
  if (error) return { error: plain(error.message) };
  revalidatePath("/app", "layout");
  const r = data as { charges: number; invoices: number };
  return { ok: true, message: r.charges ? `Created ${r.charges} charges on ${r.invoices} new invoices.` : "Everything is up to date: no new charges were due." };
}

export async function addCharge(_: ActionResult, f: FormData): Promise<ActionResult> {
  const { supabase, org } = await appContext();
  const due = str(f, "due_date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return { error: "Choose a due date." };
  let amount: number;
  try { amount = toCents(str(f, "amount")); } catch { return { error: "Enter the amount as a number, e.g. 1500." }; }
  if (amount <= 0) return { error: "The amount must be more than zero." };
  const description = str(f, "description");
  if (description.length < 2) return { error: "Say what the charge is for." };
  const { error } = await supabase.rpc("post_charges", {
    p_org: org.id, p_as_of: todayKE(), p_trigger: "manual",
    p_charges: [{ tenancy_id: str(f, "tenancy_id"), charge_type: str(f, "charge_type") || "other", period: periodOf(due), amount, due_date: due, description, source: "manual" }],
  });
  if (error) return { error: plain(error.message) };
  revalidatePath("/app", "layout");
  return { ok: true, message: "Charge added to the statement and invoice." };
}

export async function makeAdjustment(_: ActionResult, f: FormData): Promise<ActionResult> {
  const { supabase } = await appContext();
  const kind = str(f, "kind");
  let amount: number;
  try { amount = toCents(str(f, "amount")); } catch { return { error: "Enter the amount as a number." }; }
  const reason = str(f, "reason");
  if (reason.length < 3) return { error: "Give a short reason: it’s kept on the record." };
  if (kind !== "credit_note" && !str(f, "charge_id")) return { error: "Choose which charge this is for." };
  const { error } = await supabase.rpc("make_adjustment", {
    p_tenancy: str(f, "tenancy_id"), p_kind: kind, p_amount: amount, p_charge: str(f, "charge_id") || null, p_reason: reason,
  });
  if (error) return { error: plain(error.message) };
  revalidatePath("/app", "layout");
  return { ok: true, message: { credit_note: "Credit note recorded.", waiver: "Charge waived.", write_off: "Debt written off." }[kind] ?? "Saved." };
}

export async function addRecurring(_: ActionResult, f: FormData): Promise<ActionResult> {
  const { supabase, org, can } = await appContext();
  if (!can.edit) return { error: "Only owners and managers can set recurring charges." };
  let amount: number;
  try { amount = toCents(str(f, "amount")); } catch { return { error: "Enter the amount as a number." }; }
  if (amount <= 0) return { error: "The amount must be more than zero." };
  const target = str(f, "target"); // "p:<id>" or "u:<id>"
  const [kind, id] = target.split(":");
  if (!id || !["p", "u"].includes(kind)) return { error: "Choose a property or unit." };
  const { error } = await supabase.from("recurring_charges").insert({
    org_id: org.id, property_id: kind === "p" ? id : null, unit_id: kind === "u" ? id : null,
    charge_type: str(f, "charge_type"), amount, description: str(f, "description"), starts_on: str(f, "starts_on") || todayKE(),
  });
  if (error) return { error: plain(error.message) };
  revalidatePath("/app/billing");
  return { ok: true, message: "Recurring charge added. It starts with the next billing run." };
}

export async function stopRecurring(_: ActionResult, f: FormData): Promise<ActionResult> {
  const { supabase } = await appContext();
  const { data, error } = await supabase.from("recurring_charges").update({ active: false, ends_on: todayKE() }).eq("id", str(f, "id")).select("id");
  if (error || !data?.length) return { error: "You don’t have permission to do that." };
  revalidatePath("/app/billing");
  return { ok: true, message: "Stopped. Charges already made stay on the record." };
}

export async function addRentReview(_: ActionResult, f: FormData): Promise<ActionResult> {
  const { supabase, org } = await appContext();
  const month = str(f, "month"); // YYYY-MM
  if (!/^\d{4}-\d{2}$/.test(month)) return { error: "Choose the month the new rent starts." };
  if (month <= periodOf(todayKE())) return { error: "Rent changes must start from next month or later, so tenants get notice." };
  let rent: number;
  try { rent = toCents(str(f, "new_rent")); } catch { return { error: "Enter the new rent as a number." }; }
  const { error } = await supabase.from("rent_reviews").insert({ org_id: org.id, tenancy_id: str(f, "tenancy_id"), effective_from: `${month}-01`, new_rent: rent });
  if (error) return { error: error.code === "23505" ? "There’s already a change starting that month." : plain(error.message) };
  revalidatePath("/app", "layout");
  return { ok: true, message: "Rent change scheduled." };
}
