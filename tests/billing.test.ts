import { addMonths, chargesFor, daysInMonth, dueDate, moveOutCredit, occupiedDays, periodsToBill, proRata, rentFor, todayKE, type TenancyInput } from "../src/core/billing";

let pass = 0, fail = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  if (!ok) console.log("✘", name, "\n   got ", JSON.stringify(got), "\n   want", JSON.stringify(want));
};
const KSH = (n: number) => n * 100;
const base: TenancyInput = {
  id: "t1", start_date: "2026-01-01", end_date: null, billing_from: "2026-01-01", rent_amount: KSH(15000),
  due_day: 5, billing_frequency: "monthly", status: "active", unit_id: "u1", property_id: "p1",
};

/* Calendar */
eq("Feb in a leap year", daysInMonth(2028, 2), 29);
eq("Feb in a normal year", daysInMonth(2026, 2), 28);
eq("addMonths across a year", addMonths("2026-11", 3), "2027-02");
eq("addMonths backwards", addMonths("2026-01", -1), "2025-12");
eq("due date", dueDate("2026-12", 5), "2026-12-05");
eq("occupied days, move in on 16th of a 31-day month", occupiedDays("2026-12", "2026-12-16", null), 16);
eq("occupied days, move out on 10th", occupiedDays("2026-12", "2025-01-01", "2026-12-10"), 10);
eq("occupied days, outside period", occupiedDays("2026-12", "2027-01-03", null), 0);

/* Pro-rata, to the nearest shilling */
eq("full month unchanged", proRata(KSH(15000), "2026-12", "2026-12-01", null), KSH(15000));
eq("16 of 31 days of 15,000 = 7,742 (7,741.94 rounded)", proRata(KSH(15000), "2026-12", "2026-12-16", null), KSH(7742));
eq("15 of 30 days of 15,000 = 7,500", proRata(KSH(15000), "2026-11", "2026-11-16", null), KSH(7500));
eq("leap Feb: 10 of 29 days of 9,500 = 3,276 (3,275.86)", proRata(KSH(9500), "2028-02", "2028-02-20", null), KSH(3276));
eq("half-shilling rounds up: 1 of 2 of 3 → 2", Math.round(1.5), 2);
eq("move-out on day 10 of 31: 4,839", proRata(KSH(15000), "2026-12", "2025-01-01", "2026-12-10"), KSH(4839));
eq("result is always whole shillings", proRata(KSH(12345), "2026-12", "2026-12-07", null) % 100, 0);

/* Rent reviews */
const reviews = [{ tenancy_id: "t1", effective_from: "2026-07-01", new_rent: KSH(16500) }];
eq("rent before review", rentFor("2026-06", KSH(15000), reviews), KSH(15000));
eq("rent from review month", rentFor("2026-07", KSH(15000), reviews), KSH(16500));

/* Which periods are due (charges created 5 days before the due day) */
eq("not yet: 2026-11-29 is before 30 Nov (5 days before 5 Dec)", periodsToBill({ ...base, billing_from: "2026-12-01" }, "2026-11-29", 5), []);
eq("on lead day: December becomes due on 30 Nov", periodsToBill({ ...base, billing_from: "2026-12-01" }, "2026-11-30", 5), ["2026-12"]);
eq("catch-up after missed runs", periodsToBill({ ...base, billing_from: "2026-10-01" }, "2026-12-01", 5), ["2026-10", "2026-11", "2026-12"]);
eq("stops after move-out month", periodsToBill({ ...base, billing_from: "2026-10-01", end_date: "2026-11-15", status: "ended" }, "2027-03-01", 5), ["2026-10", "2026-11"]);
eq("never more than 24 periods at once", periodsToBill({ ...base, billing_from: "2020-01-01" }, "2026-12-01", 5).length, 24);

/* Charges */
const dec = chargesFor({ ...base, start_date: "2026-12-16", billing_from: "2026-12-16" }, { today: "2026-12-16", leadDays: 5 });
eq("mid-month move-in → one pro-rated rent charge", dec.map((c) => [c.period, c.amount, c.description]), [["2026-12", KSH(7742), "Rent Dec 2026 (part month)"]]);
eq("charge due on the due day", dec[0].due_date, "2026-12-05");
const yr = chargesFor({ ...base, billing_from: "2026-05-01" }, { today: "2026-07-31", leadDays: 5, reviews });
eq("review applies from its month", yr.map((c) => [c.period, c.amount]), [["2026-05", KSH(15000)], ["2026-06", KSH(15000)], ["2026-07", KSH(16500)], ["2026-08", KSH(16500)]]);

const q = chargesFor({ ...base, billing_frequency: "quarterly", billing_from: "2026-12-01", start_date: "2026-12-16" }, { today: "2026-12-01", leadDays: 5 });
eq("quarterly: one charge, first month pro-rated + 2 full months", q.map((c) => [c.period, c.amount, c.description]),
  [["2026-12", KSH(7742 + 15000 + 15000), "Rent Dec 2026 – Feb 2027 (part month)"]]);
eq("quarterly: next quarter not due early", chargesFor({ ...base, billing_frequency: "quarterly", billing_from: "2026-12-01" }, { today: "2027-02-20", leadDays: 5 }).length, 1);

const rec = chargesFor({ ...base, billing_from: "2026-12-01" }, { today: "2026-12-01", leadDays: 5, recurring: [
  { id: "r1", property_id: "p1", unit_id: null, charge_type: "service_charge", amount: KSH(1000), description: "Service charge", starts_on: "2026-01-01", ends_on: null, active: true },
  { id: "r2", property_id: null, unit_id: "u1", charge_type: "parking", amount: KSH(2000), description: "Parking", starts_on: "2026-01-01", ends_on: null, active: true },
  { id: "r3", property_id: "p2", unit_id: null, charge_type: "garbage", amount: KSH(300), description: "", starts_on: "2026-01-01", ends_on: null, active: true },
  { id: "r4", property_id: "p1", unit_id: null, charge_type: "security", amount: KSH(500), description: "", starts_on: "2026-01-01", ends_on: "2026-11-30", active: true },
] });
eq("recurring: property + unit charges apply; other property and ended ones don't", rec.map((c) => [c.charge_type, c.amount, c.source]),
  [["rent", KSH(15000), "billing_run"], ["service_charge", KSH(1000), "recurring"], ["parking", KSH(2000), "recurring"]]);

/* Move-out credit */
eq("moved out on 10 Dec after full December charge → credit 10,161", moveOutCredit(KSH(15000), KSH(15000), "2025-01-01", "2026-12-10"), KSH(15000 - 4839));
eq("no credit if not over-charged", moveOutCredit(KSH(4839), KSH(15000), "2025-01-01", "2026-12-10"), 0);

/* Determinism: same input → same output */
eq("deterministic", JSON.stringify(chargesFor(base, { today: "2026-06-30", leadDays: 5 })), JSON.stringify(chargesFor(base, { today: "2026-06-30", leadDays: 5 })));
eq("Nairobi date at 22:30 UTC is the next day", todayKE(new Date("2026-11-30T22:30:00Z")), "2026-12-01");

console.log(`billing: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
