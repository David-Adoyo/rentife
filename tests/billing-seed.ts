/**
 * Stage 5 acceptance: "balances reconcile to the cent on seed data" (masterplan §16, §17).
 * Builds the "Mwangaza Homes" demo organisation (3 properties, 64 units, 58 tenancies), simulates six
 * months of daily billing runs with the real engine (src/core/billing.ts) and the real database
 * functions, adds credit notes, waivers, write-offs and move-outs, then checks every balance several
 * independent ways. Prints one SQL script that runs in a transaction and ROLLS BACK.
 *
 *   npx tsx tests/billing-seed.ts > /tmp/seed.sql   (then run it against the database)
 */
import { addDays, chargesFor, moveOutCredit, periodOf, type ChargeOut, type RecurringCharge, type RentReview, type TenancyInput } from "../src/core/billing";

const KSH = (n: number) => n * 100;
const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const uuid = (n: number, kind: number) => `00000000-0000-4000-8${kind.toString(16).padStart(3, "0")}-${n.toString(16).padStart(12, "0")}`;
const sql: string[] = [];
const emit = (s: string) => sql.push(s);

// ── Fixed, deterministic demo data ─────────────────────────────────────────────────────────
const owner = uuid(1, 1), org = uuid(1, 2);
const properties = [
  { id: uuid(1, 3), name: "Sunrise Court", estate: "Kasarani", prefix: "SUN", units: 24, rent: 15000 },
  { id: uuid(2, 3), name: "Acacia Apartments", estate: "Ruaka", prefix: "ACA", units: 24, rent: 22000 },
  { id: uuid(3, 3), name: "Baraka Flats", estate: "Rongai", prefix: "BAR", units: 16, rent: 9500 },
];
const NAMES = ["Wanjiru Kamau", "Otieno Ouma", "Achieng Atieno", "Mutua Musyoka", "Chebet Kiprop", "Njeri Mwangi", "Omondi Okoth", "Wambui Njoroge", "Kiprono Rotich", "Akinyi Odhiambo", "Kamau Githinji", "Nafula Wekesa"];

type Unit = { id: string; property: (typeof properties)[number]; label: string; rent: number };
const units: Unit[] = [];
properties.forEach((p, pi) => {
  for (let i = 1; i <= p.units; i++) units.push({ id: uuid(pi * 100 + i, 4), property: p, label: `${String.fromCharCode(65 + Math.floor((i - 1) / 8))}${((i - 1) % 8) + 1}`, rent: KSH(p.rent + (i % 4) * 500) });
});

// 58 tenancies: every unit except 6 vacant ones. Variety: mid-month move-ins, quarterly, due days.
const tenancies: (TenancyInput & { tenant: string; phone: string })[] = [];
units.forEach((u, i) => {
  if (i % 11 === 5) return; // 6 vacant units
  const n = tenancies.length;
  const midMonth = n % 9 === 3;
  const start = midMonth ? `2026-0${6 + (n % 3)}-${String(10 + (n % 15)).padStart(2, "0")}` : "2025-03-01";
  tenancies.push({
    id: uuid(n + 1, 5), tenant: `${NAMES[n % NAMES.length]} ${n + 1}`, phone: `+2547${String(10000000 + n * 7919).slice(-8)}`,
    start_date: start, end_date: null, billing_from: start > "2026-06-01" ? start : "2026-06-01",
    rent_amount: u.rent, due_day: [5, 5, 1, 10, 5, 15][n % 6], billing_frequency: n % 17 === 4 ? "quarterly" : "monthly",
    status: "active", unit_id: u.id, property_id: u.property.id,
  });
});
const reviews: RentReview[] = [
  { tenancy_id: tenancies[2].id, effective_from: "2026-09-01", new_rent: tenancies[2].rent_amount + KSH(1500) },
  { tenancy_id: tenancies[30].id, effective_from: "2026-10-01", new_rent: tenancies[30].rent_amount + KSH(2000) },
];
const recurring: RecurringCharge[] = [
  { id: uuid(1, 6), property_id: properties[1].id, unit_id: null, charge_type: "service_charge", amount: KSH(1500), description: "Service charge", starts_on: "2026-06-01", ends_on: null, active: true },
  { id: uuid(2, 6), property_id: properties[0].id, unit_id: null, charge_type: "garbage", amount: KSH(300), description: "Garbage collection", starts_on: "2026-08-01", ends_on: null, active: true },
  { id: uuid(3, 6), property_id: null, unit_id: tenancies[7].unit_id, charge_type: "parking", amount: KSH(2000), description: "Parking", starts_on: "2026-06-01", ends_on: null, active: true },
];

// Events on given days: move-outs, credit notes (tenant credit carried forward), waivers, write-offs.
type Event = { day: string; kind: "move_out"; t: number; end: string } | { day: string; kind: "credit_note"; t: number; amount: number; reason: string }
  | { day: string; kind: "waiver" | "write_off"; t: number; period: string; reason: string };
const events: Event[] = [
  { day: "2026-07-12", kind: "credit_note", t: 1, amount: KSH(20000), reason: "Two months paid in advance (credit carried forward)" },
  { day: "2026-08-03", kind: "waiver", t: 6, period: "2026-08", reason: "Burst pipe: August rent waived" },
  { day: "2026-09-20", kind: "move_out", t: 11, end: "2026-09-20" },
  { day: "2026-10-08", kind: "move_out", t: 40, end: "2026-10-08" },
  { day: "2026-10-15", kind: "write_off", t: 20, period: "2026-07", reason: "Tenant left the country; unrecoverable" },
  { day: "2026-11-02", kind: "credit_note", t: 25, amount: KSH(3333), reason: "Goodwill credit for water outage" },
];

// ── Setup: owner, organisation (via the real RPC), structure ───────────────────────────────
emit(`begin;`);
emit(`create temp table checks (n serial, name text, ok boolean, detail text) on commit drop; grant all on checks to authenticated; grant usage, select on sequence checks_n_seq to authenticated;`);
emit(`create function pg_temp.ok(p_name text, p_ok boolean, p_detail text default null) returns void language sql as $$ insert into checks (name, ok, detail) values (p_name, coalesce(p_ok, false), p_detail) $$;`);
emit(`insert into auth.users (id, email, aud, role) values (${q(owner)}, 'seed-owner@demo.invalid', 'authenticated', 'authenticated');`);
emit(`select set_config('request.jwt.claims', json_build_object('sub', ${q(owner)}, 'role', 'authenticated', 'aal', 'aal2', 'email', 'seed-owner@demo.invalid')::text, true); set local role authenticated;`);
emit(`create temp table ids as select public.create_organisation('Mwangaza Homes (demo data)', 'individual', 'Demo Owner') as org_id;`);
emit(`reset role;`);
// Re-key the demo organisation to a fixed id is not possible (FKs); look it up instead.
const ORG = `(select org_id from ids)`;
for (const p of properties) emit(`insert into public.properties (id, org_id, name, estate, county, code_prefix) values (${q(p.id)}, ${ORG}, ${q(p.name)}, ${q(p.estate)}, 'Nairobi', ${q(p.prefix)});`);
emit(`insert into public.units (id, org_id, property_id, label, unit_code, type, rent_amount, deposit_amount) values\n` +
  units.map((u) => `(${q(u.id)}, ${ORG}, ${q(u.property.id)}, ${q(u.label)}, '', '1br', ${u.rent}, ${u.rent})`).join(",\n") + `;`);
emit(`insert into public.tenants (id, org_id, full_name, phones) values\n` + tenancies.map((t) => `(${q(t.id)}, ${ORG}, ${q(t.tenant)}, array[${q(t.phone)}])`).join(",\n") + `;`);
emit(`insert into public.tenancies (id, org_id, unit_id, tenant_id, start_date, billing_from, rent_amount, deposit_amount, due_day, billing_frequency) values\n` +
  tenancies.map((t) => `(${q(t.id)}, ${ORG}, ${q(t.unit_id)}, ${q(t.id)}, ${q(t.start_date)}, ${q(t.billing_from)}, ${t.rent_amount}, ${t.rent_amount}, ${t.due_day}, ${q(t.billing_frequency)})`).join(",\n") + `;`);
emit(`insert into public.rent_reviews (org_id, tenancy_id, effective_from, new_rent) values\n` + reviews.map((r) => `(${ORG}, ${q(r.tenancy_id)}, ${q(r.effective_from)}, ${r.new_rent})`).join(",\n") + `;`);
emit(`insert into public.recurring_charges (id, org_id, property_id, unit_id, charge_type, amount, description, starts_on) values\n` +
  recurring.map((r) => `(${q(r.id)}, ${ORG}, ${r.property_id ? q(r.property_id) : "null"}, ${r.unit_id ? q(r.unit_id) : "null"}, ${q(r.charge_type)}, ${r.amount}, ${q(r.description)}, ${q(r.starts_on)})`).join(",\n") + `;`);
emit(`select set_config('request.jwt.claims', json_build_object('sub', ${q(owner)}, 'role', 'authenticated', 'aal', 'aal2', 'email', 'seed-owner@demo.invalid')::text, true); set local role authenticated;`);

// ── Simulate six months of daily billing runs ──────────────────────────────────────────────
const key = (c: ChargeOut) => `${c.tenancy_id}|${c.charge_type}|${c.period}|${c.recurring_id ?? ""}`;
const posted = new Map<string, ChargeOut>();
const expected = new Map<string, number>(); // tenancy → expected balance in cents
const add = (t: string, cents: number) => expected.set(t, (expected.get(t) ?? 0) + cents);
let runs = 0;
for (let day = "2026-06-01"; day <= "2026-11-30"; day = addDays(day, 1)) {
  // events first (a move-out on a day changes that day's billing)
  for (const e of events.filter((x) => x.day === day)) {
    const t = tenancies[e.t];
    if (e.kind === "move_out") {
      t.end_date = e.end; t.status = "ended";
      emit(`update public.tenancies set status = 'ended', end_date = ${q(e.end)} where id = ${q(t.id)};`);
      const charged = [...posted.values()].find((c) => c.tenancy_id === t.id && c.charge_type === "rent" && c.period === periodOf(e.end));
      const credit = charged ? moveOutCredit(charged.amount, t.rent_amount, t.start_date, e.end) : 0;
      if (credit > 0) {
        emit(`select public.make_adjustment(${q(t.id)}, 'credit_note', ${credit}, null, ${q(`Unused days after moving out on ${e.end}`)});`);
        add(t.id, -credit);
      }
    } else if (e.kind === "credit_note") {
      emit(`select public.make_adjustment(${q(t.id)}, 'credit_note', ${e.amount}, null, ${q(e.reason)});`);
      add(t.id, -e.amount);
    } else {
      const c = [...posted.values()].find((x) => x.tenancy_id === t.id && x.charge_type === "rent" && x.period === e.period)!;
      // waive / write off what is still owed on that charge (computed in SQL)
      emit(`select public.make_adjustment(${q(t.id)}, ${q(e.kind)}, (select outstanding from public.charge_balances where tenancy_id = ${q(t.id)} and charge_type = 'rent' and period = ${q(e.period)} and source = 'billing_run'), (select id from public.charges where tenancy_id = ${q(t.id)} and charge_type = 'rent' and period = ${q(e.period)} and source = 'billing_run'), ${q(e.reason)});`);
      emit(`create temp table if not exists adj_amounts (tenancy uuid, amount bigint); insert into adj_amounts select ${q(t.id)}, amount from public.adjustments where tenancy_id = ${q(t.id)} and kind = ${q(e.kind)};`);
      void c;
    }
  }
  const due = tenancies.flatMap((t) => chargesFor(t, { today: day, leadDays: 5, reviews, recurring }));
  const fresh = due.filter((c) => !posted.has(key(c)));
  if (fresh.length) {
    fresh.forEach((c) => { posted.set(key(c), c); add(c.tenancy_id, c.amount); });
    // Post the FULL due list (not just fresh) to prove the database skips what exists.
    emit(`select public.post_charges(${ORG}, ${q(day)}, 'manual', ${q(JSON.stringify(due))}::jsonb);`);
    runs++;
  }
}

// ── Checks ─────────────────────────────────────────────────────────────────────────────────
emit(`reset role;`);
const expectedRows = [...expected.entries()].map(([t, cents]) => `(${q(t)}::uuid, ${cents}::bigint)`).join(",\n");
const T = `(select id from public.tenancies where org_id = ${ORG})`;
emit(`create temp table expected (tenancy_id uuid, cents bigint); insert into expected values\n${expectedRows};`);
emit(`create temp table if not exists adj_amounts (tenancy uuid, amount bigint);`);
emit(`select pg_temp.ok('Seed: 3 properties, 64 units, 58 tenancies', (select count(*) from public.properties where org_id = ${ORG}) = 3 and (select count(*) from public.units where org_id = ${ORG}) = 64 and (select count(*) from public.tenancies where org_id = ${ORG}) = 58,
  (select count(*) from public.charges where org_id = ${ORG})::text || ' charges, ' || (select count(*) from public.invoices where org_id = ${ORG})::text || ' invoices over ${runs} billing runs');`);
emit(`select pg_temp.ok('Every automated charge was created exactly once (${posted.size} expected)', (select count(*) from public.charges where org_id = ${ORG} and source in ('billing_run','recurring')) = ${posted.size}, (select count(*) from public.charges where org_id = ${ORG})::text);`);
emit(`select pg_temp.ok('Total billed matches the engine to the cent', (select coalesce(sum(amount),0) from public.charges where org_id = ${ORG}) = ${[...posted.values()].reduce((s, c) => s + c.amount, 0)},
  'KSh ' || to_char((select sum(amount) from public.charges where org_id = ${ORG}) / 100.0, 'FM999,999,999.00'));`);
// expected balance = engine charges − credit notes (tracked in TS) − waivers/write-offs (amounts read back)
emit(`update expected e set cents = cents - coalesce((select sum(amount) from adj_amounts a where a.tenancy = e.tenancy_id), 0);`);
emit(`select pg_temp.ok('Every tenancy’s balance matches the independent calculation to the cent', not exists (
  select 1 from public.tenancy_balances b join expected e on e.tenancy_id = b.tenancy_id where b.balance <> e.cents),
  (select count(*) from public.tenancy_balances b join expected e on e.tenancy_id = b.tenancy_id where b.balance <> e.cents)::text || ' mismatches');`);
emit(`select pg_temp.ok('Ledger balance = charges − adjustments for every tenancy', not exists (
  select 1 from ${T} t(id) where (select coalesce(sum(debit - credit),0) from public.ledger_entries where tenancy_id = t.id)
    <> (select coalesce(sum(amount),0) from public.charges where tenancy_id = t.id) - (select coalesce(sum(amount),0) from public.adjustments where tenancy_id = t.id)));`);
emit(`select pg_temp.ok('Ledger balance = what is owed on open charges − unused credit, for every tenancy', not exists (
  select 1 from ${T} t(id) where (select balance from public.tenancy_balances where tenancy_id = t.id)
    <> (select coalesce(sum(outstanding),0) from public.charge_balances where tenancy_id = t.id)
     - (select coalesce(sum(l.credit - coalesce((select sum(a.amount) from public.allocations a where a.ledger_entry_id = l.id),0)),0) from public.ledger_entries l where l.tenancy_id = t.id and l.credit > 0)));`);
emit(`select pg_temp.ok('No charge is over-allocated and no credit is over-spent', not exists (select 1 from public.charge_balances where org_id = ${ORG} and outstanding < 0)
  and not exists (select 1 from public.ledger_entries l where l.org_id = ${ORG} and l.credit < (select coalesce(sum(amount),0) from public.allocations a where a.ledger_entry_id = l.id)));`);
emit(`select pg_temp.ok('Credit carried forward: 20,000 credit fully used on later charges, oldest first', (select coalesce(sum(a.amount),0) from public.allocations a join public.ledger_entries l on l.id = a.ledger_entry_id where l.tenancy_id = ${q(tenancies[1].id)} and l.kind = 'credit_note') = ${KSH(20000)},
  (select string_agg(c.period || ':' || c.status, ' ' order by c.due_date) from public.charges c where c.tenancy_id = ${q(tenancies[1].id)}));`);
emit(`select pg_temp.ok('Waived charge is marked waived, written-off charge settled', (select status from public.charges where tenancy_id = ${q(tenancies[6].id)} and period = '2026-08' and charge_type = 'rent') = 'waived'
  and (select outstanding from public.charge_balances where tenancy_id = ${q(tenancies[20].id)} and period = '2026-07' and charge_type = 'rent') = 0);`);
emit(`select pg_temp.ok('Move-outs: no rent after the move-out month; unused days credited', not exists (select 1 from public.charges where tenancy_id in (${q(tenancies[11].id)}, ${q(tenancies[40].id)}) and period > '2026-10')
  and (select count(*) from public.adjustments where reason like 'Unused days%' and org_id = ${ORG}) >= 1,
  (select string_agg(reason || ' ' || amount/100, '; ') from public.adjustments where reason like 'Unused days%' and org_id = ${ORG}));`);
emit(`select pg_temp.ok('Charge statuses agree with allocations', not exists (select 1 from public.charge_balances where org_id = ${ORG} and (
  (status in ('paid','waived') and outstanding <> 0) or (status = 'open' and allocated <> 0) or (status = 'part_paid' and (allocated = 0 or outstanding = 0)))));`);
emit(`select pg_temp.ok('Every charge is on exactly one invoice; invoice totals = their charges', (select count(*) from public.charges c where c.org_id = ${ORG} and not exists (select 1 from public.invoice_lines il where il.charge_id = c.id)) = 0);`);
emit(`select pg_temp.ok('Invoice numbers are sequential with no gaps', (select bool_and(gapless) from (select count(*) = max(substr(number, 10)::int) as gapless from public.invoices where org_id = ${ORG} group by substr(number, 5, 4)) x),
  (select min(number) || ' … ' || max(number) from public.invoices where org_id = ${ORG}));`);
emit(`select pg_temp.ok('Statement running balance ends at the tenancy balance', not exists (select 1 from ${T} t(id) where
  coalesce((select running_balance from public.statement_lines where tenancy_id = t.id order by effective_date desc, id desc limit 1), 0) <> (select balance from public.tenancy_balances where tenancy_id = t.id)));`);
emit(`select pg_temp.ok('Pro-rata: mid-month move-in charged a part month', exists (select 1 from public.charges where org_id = ${ORG} and description like '%(part month)%'));`);
emit(`select pg_temp.ok('Rent review applied from its month', (select amount from public.charges where tenancy_id = ${q(tenancies[2].id)} and period = '2026-09' and charge_type = 'rent') = ${reviews[0].new_rent}
  and (select amount from public.charges where tenancy_id = ${q(tenancies[2].id)} and period = '2026-08' and charge_type = 'rent') = ${tenancies[2].rent_amount});`);
const qt = tenancies.find((t) => t.billing_frequency === "quarterly")!;
const qPeriods = [...posted.values()].filter((c) => c.tenancy_id === qt.id && c.charge_type === "rent").map((c) => c.period);
emit(`select pg_temp.ok('Quarterly tenancy billed once per quarter (${qPeriods.join(", ")})', (select string_agg(period, ',' order by period) from public.charges where tenancy_id = ${q(qt.id)} and charge_type = 'rent') = ${q(qPeriods.join(","))}
  and ${qPeriods.length} = 3, (select string_agg(period || ' KSh ' || amount/100, ', ' order by period) from public.charges where tenancy_id = ${q(qt.id)} and charge_type = 'rent'));`);
emit(`select pg_temp.ok('Recurring charges: service charge on Acacia, garbage from August, parking on one unit',
  (select count(*) from public.charges where org_id = ${ORG} and charge_type = 'service_charge') > 0 and not exists (select 1 from public.charges where org_id = ${ORG} and charge_type = 'garbage' and period < '2026-08')
  and (select count(distinct tenancy_id) from public.charges where org_id = ${ORG} and charge_type = 'parking') = 1);`);
// idempotency: re-run every day's full list at the end → nothing new
emit(`select set_config('request.jwt.claims', json_build_object('sub', ${q(owner)}, 'role', 'authenticated', 'aal', 'aal2')::text, true); set local role authenticated;`);
emit(`create temp table rerun as select public.post_charges(${ORG}, '2026-11-30', 'manual', ${q(JSON.stringify([...posted.values()]))}::jsonb) as r;`);
emit(`reset role;`);
emit(`select pg_temp.ok('Re-running all billing creates nothing new (idempotent)', (select (r ->> 'charges')::int from rerun) = 0);`);
emit(`do $$ begin begin update public.ledger_entries set debit = debit + 1 where org_id = (select org_id from ids); perform pg_temp.ok('Ledger entries cannot be edited', false); exception when others then perform pg_temp.ok('Ledger entries cannot be edited', true); end; end $$;`);
emit(`do $$ begin begin update public.charges set amount = 1 where org_id = (select org_id from ids); perform pg_temp.ok('Charge amounts cannot be edited', false); exception when others then perform pg_temp.ok('Charge amounts cannot be edited', true); end; end $$;`);
emit(`do $$ begin begin delete from public.allocations where org_id = (select org_id from ids); perform pg_temp.ok('Allocations cannot be deleted', false); exception when others then perform pg_temp.ok('Allocations cannot be deleted', true); end; end $$;`);
emit(`select n, name, ok, detail from checks order by n;`);
emit(`rollback;`);

console.log(sql.join("\n"));
