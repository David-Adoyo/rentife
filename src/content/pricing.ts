/**
 * Rentife pricing: per occupied unit, per month, in KES (excluding VAT).
 * Benchmarked against Kenyan competitors in Nov 2026 (see docs/pricing-research.md).
 * Each plan's minimum equals the previous plan's maximum, so a bill never drops
 * when a portfolio grows past a plan boundary.
 */
export type PlanId = "starter" | "growth" | "agency";

export type Plan = {
  id: PlanId;
  name: string;
  perUnit: number; // KES per occupied unit per month
  minimum: number; // KES per month
  minUnits: number;
  maxUnits: number | null;
  for: string;
};

export const plans: Plan[] = [
  { id: "starter", name: "Starter", perUnit: 80, minimum: 800, minUnits: 1, maxUnits: 30, for: "Landlords with up to 30 units" },
  { id: "growth", name: "Growth", perUnit: 60, minimum: 2400, minUnits: 31, maxUnits: 100, for: "Landlords with 31 to 100 units across several buildings" },
  { id: "agency", name: "Agency", perUnit: 40, minimum: 6000, minUnits: 101, maxUnits: null, for: "Agents managing for owners, and portfolios over 100 units" },
];

/** The plan a landlord with this many occupied units would be on. */
export function planFor(units: number): Plan {
  return plans.find((p) => p.maxUnits === null || units <= p.maxUnits) ?? plans[plans.length - 1];
}

/** Monthly price in KES for a number of occupied units. */
export function monthlyPrice(units: number, plan: Plan = planFor(units)): number {
  if (units <= 0) return 0;
  return Math.max(plan.minimum, plan.perUnit * units);
}

export const ksh = (n: number) => `KSh ${n.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
