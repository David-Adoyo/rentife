import "server-only";
import { chargesFor, type ChargeOut, type RecurringCharge, type RentReview, type TenancyInput } from "@/core/billing";

export type OrgBillingData = {
  leadDays: number;
  tenancies: TenancyInput[];
  reviews: RentReview[];
  recurring: RecurringCharge[];
};

/** Everything the organisation should be charged by `today`. Postgres skips what already exists. */
export function computeCharges(d: OrgBillingData, today: string): ChargeOut[] {
  return d.tenancies.flatMap((t) => chargesFor(t, { today, leadDays: d.leadDays, reviews: d.reviews, recurring: d.recurring }));
}

const dateStr = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : v == null ? null : String(v).slice(0, 10));

/** Shape raw rows (from postgres.js or supabase-js) into engine input. */
export function toTenancy(r: Record<string, unknown>): TenancyInput {
  return {
    id: String(r.id), start_date: dateStr(r.start_date)!, end_date: dateStr(r.end_date), billing_from: dateStr(r.billing_from)!,
    rent_amount: Number(r.rent_amount), due_day: Number(r.due_day), billing_frequency: r.billing_frequency as TenancyInput["billing_frequency"],
    status: r.status as TenancyInput["status"], unit_id: String(r.unit_id), property_id: String(r.property_id),
  };
}
export const toReview = (r: Record<string, unknown>): RentReview => ({ tenancy_id: String(r.tenancy_id), effective_from: dateStr(r.effective_from)!, new_rent: Number(r.new_rent) });
export const toRecurring = (r: Record<string, unknown>): RecurringCharge => ({
  id: String(r.id), property_id: (r.property_id as string) ?? null, unit_id: (r.unit_id as string) ?? null, charge_type: String(r.charge_type),
  amount: Number(r.amount), description: String(r.description ?? ""), starts_on: dateStr(r.starts_on)!, ends_on: dateStr(r.ends_on), active: Boolean(r.active),
});
