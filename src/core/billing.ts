/**
 * Billing engine (masterplan §7.1). Pure and deterministic: given tenancies and a date, it returns the
 * charges that should exist. Persistence is idempotent in Postgres (post_charges), so running it twice,
 * or catching up after a missed day, never double-charges.
 *
 * Dates are calendar dates (YYYY-MM-DD) in Africa/Nairobi. Money is integer cents.
 * Pro-rata rule (DECISIONS.md D-012): daily rate = monthly rent ÷ days in that month; the charge is
 * rounded to the nearest whole shilling (half a shilling rounds up).
 */

export type Period = string; // "YYYY-MM"
export type IsoDate = string; // "YYYY-MM-DD"

export type TenancyInput = {
  id: string;
  start_date: IsoDate;
  end_date: IsoDate | null;
  billing_from: IsoDate;
  rent_amount: number; // cents per month
  due_day: number; // 1..28
  billing_frequency: "monthly" | "quarterly";
  status: "active" | "notice" | "ended";
  unit_id: string;
  property_id: string;
};
export type RentReview = { tenancy_id: string; effective_from: IsoDate; new_rent: number };
export type RecurringCharge = {
  id: string; property_id: string | null; unit_id: string | null; charge_type: string; amount: number;
  description: string; starts_on: IsoDate; ends_on: IsoDate | null; active: boolean;
};
export type ChargeOut = {
  tenancy_id: string; charge_type: string; period: Period; amount: number; due_date: IsoDate;
  description: string; source: "billing_run" | "recurring"; recurring_id?: string;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MAX_CATCH_UP = 24; // never generate more than two years of periods in one run

/* ── Calendar helpers ───────────────────────────────────────────────────────── */
export const pad = (n: number) => String(n).padStart(2, "0");
export const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m is 1-12
export const periodOf = (d: IsoDate): Period => d.slice(0, 7);
export const parsePeriod = (p: Period) => ({ y: Number(p.slice(0, 4)), m: Number(p.slice(5, 7)) });
export function addMonths(p: Period, n: number): Period {
  const { y, m } = parsePeriod(p);
  const idx = y * 12 + (m - 1) + n;
  return `${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`;
}
export const periodStart = (p: Period): IsoDate => `${p}-01`;
export const periodEnd = (p: Period): IsoDate => { const { y, m } = parsePeriod(p); return `${p}-${pad(daysInMonth(y, m))}`; };
export const dueDate = (p: Period, dueDay: number): IsoDate => `${p}-${pad(Math.min(dueDay, 28))}`;
export const label = (p: Period) => { const { y, m } = parsePeriod(p); return `${MONTHS[m - 1]} ${y}`; };
export function addDays(d: IsoDate, n: number): IsoDate {
  const t = new Date(`${d}T00:00:00Z`); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10);
}
const dayOf = (d: IsoDate) => Number(d.slice(8, 10));

/* ── Money rules ────────────────────────────────────────────────────────────── */
/** Days of `period` the tenancy occupies (inclusive), given its start and optional end. */
export function occupiedDays(p: Period, start: IsoDate, end: IsoDate | null): number {
  const from = start > periodStart(p) ? start : periodStart(p);
  const to = end && end < periodEnd(p) ? end : periodEnd(p);
  if (from > to) return 0;
  return dayOf(to) - dayOf(from) + 1;
}

/** Monthly amount for the occupied days, rounded to the nearest whole shilling. */
export function proRata(monthlyCents: number, p: Period, start: IsoDate, end: IsoDate | null): number {
  const { y, m } = parsePeriod(p);
  const dim = daysInMonth(y, m), days = occupiedDays(p, start, end);
  if (days >= dim) return monthlyCents;
  if (days <= 0) return 0;
  return Math.round((monthlyCents / 100) * days / dim) * 100;
}

/** Rent in force for a period: the latest review effective on or before the period's first day. */
export function rentFor(p: Period, base: number, reviews: RentReview[]): number {
  const start = periodStart(p);
  const r = reviews.filter((x) => x.effective_from <= start).sort((a, b) => a.effective_from.localeCompare(b.effective_from)).at(-1);
  return r ? r.new_rent : base;
}

/* ── The engine ─────────────────────────────────────────────────────────────── */
/** Billing periods that are due to be charged by `today` (the charge is created `leadDays` before the due date). */
export function periodsToBill(t: TenancyInput, today: IsoDate, leadDays: number): Period[] {
  const out: Period[] = [];
  const step = t.billing_frequency === "quarterly" ? 3 : 1;
  let p = periodOf(t.billing_from);
  const lastByEnd = t.end_date ? periodOf(t.end_date) : null;
  for (let i = 0; i < MAX_CATCH_UP; i++, p = addMonths(p, step)) {
    if (lastByEnd && p > lastByEnd) break;
    if (addDays(dueDate(p, t.due_day), -leadDays) > today) break;
    out.push(p);
  }
  return out;
}

export function chargesFor(t: TenancyInput, opts: { today: IsoDate; leadDays: number; reviews?: RentReview[]; recurring?: RecurringCharge[] }): ChargeOut[] {
  if (t.status === "ended" && !t.end_date) return [];
  const reviews = (opts.reviews ?? []).filter((r) => r.tenancy_id === t.id);
  const out: ChargeOut[] = [];
  for (const p of periodsToBill(t, opts.today, opts.leadDays)) {
    const months = t.billing_frequency === "quarterly" ? [p, addMonths(p, 1), addMonths(p, 2)] : [p];
    // Each month inside a quarter is pro-rated on its own, so a mid-quarter move-out is fair.
    const parts = months.map((mp) => ({ mp, amount: proRata(rentFor(mp, t.rent_amount, reviews), mp, t.start_date, t.end_date) })).filter((x) => x.amount > 0);
    const rent = parts.reduce((s, x) => s + x.amount, 0);
    if (rent > 0) {
      const partial = parts.some((x) => x.amount !== rentFor(x.mp, t.rent_amount, reviews)) || parts.length < months.length;
      const span = months.length === 1 ? label(p) : `${label(parts[0].mp)} – ${label(parts.at(-1)!.mp)}`;
      out.push({ tenancy_id: t.id, charge_type: "rent", period: p, amount: rent, due_date: dueDate(p, t.due_day),
        description: `Rent ${span}${partial ? " (part month)" : ""}`, source: "billing_run" });
    }
    for (const rc of opts.recurring ?? []) {
      if (!rc.active) continue;
      if (rc.unit_id ? rc.unit_id !== t.unit_id : rc.property_id !== t.property_id) continue;
      for (const mp of months) {
        if (rc.starts_on > periodEnd(mp) || (rc.ends_on && rc.ends_on < periodStart(mp))) continue;
        const amount = proRata(rc.amount, mp, t.start_date, t.end_date);
        if (amount <= 0) continue;
        out.push({ tenancy_id: t.id, charge_type: rc.charge_type, period: mp, amount, due_date: dueDate(p, t.due_day),
          description: `${rc.description || rc.charge_type.replace(/_/g, " ")} ${label(mp)}`, source: "recurring", recurring_id: rc.id });
      }
    }
  }
  return out;
}

/**
 * Move-out credit: if the final month was already charged in full, credit the unused days.
 * Returns cents to credit (0 if nothing to give back).
 */
export function moveOutCredit(chargedForEndPeriod: number, monthlyRent: number, start: IsoDate, end: IsoDate): number {
  const due = proRata(monthlyRent, periodOf(end), start, end);
  return Math.max(0, chargedForEndPeriod - due);
}

/** Today's date in Nairobi as YYYY-MM-DD. */
export const todayKE = (now = new Date()): IsoDate =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
