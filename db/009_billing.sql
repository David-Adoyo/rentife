-- Stage 5: billing engine and ledger (masterplan §6.4, §7.1, §7.4).
-- Rules: money in cents (bigint). Charges, adjustments, allocations and ledger entries are never
-- edited or deleted: corrections are new entries. Every automated posting is idempotent.

-- ── Charge types and allocation priority (lower = paid first, after oldest-first) ─────────
create table if not exists public.charge_types (
  org_id uuid not null references public.organisations(id) on delete cascade,
  code text not null check (code ~ '^[a-z_]{2,30}$'),
  name text not null,
  priority smallint not null default 50,
  active boolean not null default true,
  primary key (org_id, code)
);

create or replace function app.seed_charge_types(p_org uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.charge_types (org_id, code, name, priority) values
    (p_org, 'opening_balance', 'Balance brought forward', 5),
    (p_org, 'rent', 'Rent', 10),
    (p_org, 'water', 'Water', 20),
    (p_org, 'electricity', 'Electricity', 20),
    (p_org, 'service_charge', 'Service charge', 30),
    (p_org, 'garbage', 'Garbage collection', 30),
    (p_org, 'security', 'Security', 30),
    (p_org, 'parking', 'Parking', 30),
    (p_org, 'deposit', 'Deposit', 40),
    (p_org, 'late_fee', 'Late fee', 50),
    (p_org, 'other', 'Other', 60)
  on conflict do nothing
$$;
create or replace function app.org_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$ begin perform app.seed_charge_types(new.id); return new; end $$;
drop trigger if exists org_seed_charge_types on public.organisations;
create trigger org_seed_charge_types after insert on public.organisations for each row execute function app.org_after_insert();
select app.seed_charge_types(id) from public.organisations;

alter table public.organisations add column if not exists billing_lead_days smallint not null default 5 check (billing_lead_days between 0 and 20);

-- When billing starts for a tenancy. Imported tenancies that began long ago must not be charged for
-- months before Rentife: start this month if its due day is still ahead, otherwise next month.
-- Older arrears go in as an "opening balance" charge.
alter table public.tenancies add column if not exists billing_from date;
create or replace function app.tenancy_billing_from() returns trigger
language plpgsql as $$
declare v_today date := (now() at time zone 'Africa/Nairobi')::date; v_month date := date_trunc('month', v_today)::date;
begin
  if new.billing_from is null then
    new.billing_from := greatest(new.start_date,
      case when extract(day from v_today) <= new.due_day then v_month else (v_month + interval '1 month')::date end);
  end if;
  return new;
end $$;
drop trigger if exists tenancy_billing_from on public.tenancies;
create trigger tenancy_billing_from before insert on public.tenancies for each row execute function app.tenancy_billing_from();
update public.tenancies set billing_from = greatest(start_date, date_trunc('month', created_at at time zone 'Africa/Nairobi')::date) where billing_from is null;
alter table public.tenancies alter column billing_from set not null;

-- ── Recurring fixed charges and scheduled rent increases ─────────────────────────────────
create table if not exists public.recurring_charges (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  property_id uuid,
  unit_id uuid,
  charge_type text not null,
  amount bigint not null check (amount > 0),
  description text not null default '',
  starts_on date not null default (now() at time zone 'Africa/Nairobi')::date,
  ends_on date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  check ((property_id is null) <> (unit_id is null)),
  foreign key (property_id, org_id) references public.properties(id, org_id) on delete cascade,
  foreign key (unit_id, org_id) references public.units(id, org_id) on delete cascade,
  foreign key (org_id, charge_type) references public.charge_types(org_id, code)
);

create table if not exists public.rent_reviews (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  tenancy_id uuid not null references public.tenancies(id) on delete cascade,
  effective_from date not null check (extract(day from effective_from) = 1),
  new_rent bigint not null check (new_rent >= 0),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  unique (tenancy_id, effective_from)
);

-- ── Charges, invoices ────────────────────────────────────────────────────────────────────
create table if not exists public.charges (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  tenancy_id uuid not null references public.tenancies(id),
  charge_type text not null,
  period text not null check (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  amount bigint not null check (amount > 0),
  due_date date not null,
  description text not null default '',
  source text not null check (source in ('billing_run', 'recurring', 'manual', 'meter', 'plan')),
  recurring_id uuid references public.recurring_charges(id),
  status text not null default 'open' check (status in ('open', 'part_paid', 'paid', 'waived')),
  evidence_path text,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  foreign key (org_id, charge_type) references public.charge_types(org_id, code)
);
-- Idempotency: the billing run can never create the same automated charge twice.
create unique index if not exists charges_run_once on public.charges (tenancy_id, charge_type, period) where source = 'billing_run';
create unique index if not exists charges_recurring_once on public.charges (tenancy_id, recurring_id, period) where source = 'recurring';
create index if not exists charges_tenancy_due on public.charges (tenancy_id, due_date);

create table if not exists public.invoice_counters (org_id uuid not null, year int not null, last int not null default 0, primary key (org_id, year));
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  tenancy_id uuid not null references public.tenancies(id),
  period text not null,
  number text not null,
  issued_on date not null default (now() at time zone 'Africa/Nairobi')::date,
  created_at timestamptz not null default now(),
  unique (tenancy_id, period),
  unique (org_id, number)
);
create table if not exists public.invoice_lines (
  invoice_id uuid not null references public.invoices(id),
  charge_id uuid not null unique references public.charges(id),
  primary key (invoice_id, charge_id)
);

-- ── Adjustments, ledger, allocations ─────────────────────────────────────────────────────
create table if not exists public.adjustments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  tenancy_id uuid not null references public.tenancies(id),
  kind text not null check (kind in ('credit_note', 'waiver', 'write_off')),
  amount bigint not null check (amount > 0),
  charge_id uuid references public.charges(id),
  reason text not null check (char_length(reason) between 3 and 300),
  approved_by uuid not null,
  created_at timestamptz not null default now(),
  check (kind = 'credit_note' or charge_id is not null)
);

create table if not exists public.ledger_entries (
  id bigint generated always as identity primary key,
  org_id uuid not null,
  tenancy_id uuid not null references public.tenancies(id),
  kind text not null check (kind in ('charge', 'payment', 'credit_note', 'waiver', 'write_off', 'reversal', 'refund')),
  debit bigint not null default 0 check (debit >= 0),
  credit bigint not null default 0 check (credit >= 0),
  charge_id uuid references public.charges(id),
  adjustment_id uuid references public.adjustments(id),
  payment_id uuid,                    -- Stage 6
  description text not null default '',
  effective_date date not null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  check ((debit > 0) <> (credit > 0))
);
create index if not exists ledger_tenancy on public.ledger_entries (tenancy_id, effective_date, id);

create table if not exists public.allocations (
  id bigint generated always as identity primary key,
  org_id uuid not null,
  ledger_entry_id bigint not null references public.ledger_entries(id),
  charge_id uuid not null references public.charges(id),
  amount bigint not null check (amount > 0),
  created_at timestamptz not null default now()
);
create index if not exists allocations_charge on public.allocations (charge_id);
create index if not exists allocations_entry on public.allocations (ledger_entry_id);

create table if not exists public.billing_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  as_of date not null,
  trigger text not null check (trigger in ('cron', 'manual')),
  charges_created int not null default 0,
  invoices_created int not null default 0,
  credits_applied bigint not null default 0,
  run_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);

-- ── Immutability ─────────────────────────────────────────────────────────────────────────
create or replace function app.forbid_change() returns trigger
language plpgsql as $$ begin raise exception '% records cannot be changed or deleted: record a correction instead', tg_table_name; end $$;
do $$
declare t text;
begin
  foreach t in array array['ledger_entries', 'allocations', 'adjustments', 'invoice_lines'] loop
    execute format('drop trigger if exists immutable on public.%I', t);
    execute format('create trigger immutable before update or delete on public.%I for each row execute function app.forbid_change()', t);
  end loop;
end $$;
-- Charges: only the derived status (and evidence) may change; never amount, type, period or tenancy.
create or replace function app.charges_guard() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'charges cannot be deleted: waive or credit them instead'; end if;
  if (new.amount, new.tenancy_id, new.charge_type, new.period, new.due_date, new.org_id, new.source)
     is distinct from (old.amount, old.tenancy_id, old.charge_type, old.period, old.due_date, old.org_id, old.source) then
    raise exception 'charges cannot be edited: record a credit note or waiver instead';
  end if;
  return new;
end $$;
drop trigger if exists charges_guard on public.charges;
create trigger charges_guard before update or delete on public.charges for each row execute function app.charges_guard();

-- ── Derived views ────────────────────────────────────────────────────────────────────────
create or replace view public.charge_balances with (security_invoker = true) as
  select c.*, coalesce((select sum(a.amount) from public.allocations a where a.charge_id = c.id), 0)::bigint as allocated,
         c.amount - coalesce((select sum(a.amount) from public.allocations a where a.charge_id = c.id), 0)::bigint as outstanding
  from public.charges c;

create or replace view public.tenancy_balances with (security_invoker = true) as
  select t.id as tenancy_id, t.org_id,
         coalesce(sum(l.debit), 0)::bigint as total_debits,
         coalesce(sum(l.credit), 0)::bigint as total_credits,
         (coalesce(sum(l.debit), 0) - coalesce(sum(l.credit), 0))::bigint as balance
  from public.tenancies t left join public.ledger_entries l on l.tenancy_id = t.id
  group by t.id, t.org_id;

create or replace view public.statement_lines with (security_invoker = true) as
  select l.*, sum(l.debit - l.credit) over (partition by l.tenancy_id order by l.effective_date, l.id) as running_balance
  from public.ledger_entries l;

-- ── Allocation (authoritative; in the same transaction as the money movement) ────────────
-- Applies a tenancy's unallocated credits to its open charges: oldest due first, then by
-- charge-type priority (masterplan §7.4). Locks the tenancy so concurrent postings serialise.
create or replace function app.apply_credits(p_tenancy uuid) returns bigint
language plpgsql security definer set search_path = '' as $$
declare cr record; ch record; v_left bigint; v_take bigint; v_applied bigint := 0;
begin
  perform 1 from public.tenancies where id = p_tenancy for update;
  for cr in
    select l.id, l.org_id, l.credit - coalesce((select sum(a.amount) from public.allocations a where a.ledger_entry_id = l.id), 0) as unallocated
    from public.ledger_entries l
    where l.tenancy_id = p_tenancy and l.credit > 0 and l.kind in ('payment', 'credit_note')
    order by l.effective_date, l.id
  loop
    v_left := cr.unallocated;
    continue when v_left <= 0;
    for ch in
      select cb.id, cb.outstanding from public.charge_balances cb
      join public.charge_types ct on ct.org_id = cb.org_id and ct.code = cb.charge_type
      where cb.tenancy_id = p_tenancy and cb.outstanding > 0
      order by cb.due_date, ct.priority, cb.created_at
    loop
      exit when v_left <= 0;
      v_take := least(v_left, ch.outstanding);
      insert into public.allocations (org_id, ledger_entry_id, charge_id, amount) values (cr.org_id, cr.id, ch.id, v_take);
      perform app.refresh_charge_status(ch.id);
      v_left := v_left - v_take; v_applied := v_applied + v_take;
    end loop;
  end loop;
  return v_applied;
end $$;

create or replace function app.refresh_charge_status(p_charge uuid) returns void
language sql security definer set search_path = '' as $$
  update public.charges c set status = case
      when cb.outstanding <= 0 and exists (select 1 from public.adjustments a where a.charge_id = c.id and a.kind in ('waiver', 'write_off'))
           and not exists (select 1 from public.allocations al join public.ledger_entries le on le.id = al.ledger_entry_id where al.charge_id = c.id and le.kind = 'payment')
        then 'waived'
      when cb.outstanding <= 0 then 'paid'
      when cb.allocated > 0 then 'part_paid'
      else 'open' end
  from public.charge_balances cb where cb.id = c.id and c.id = p_charge
$$;

create or replace function app.next_invoice_number(p_org uuid, p_year int) returns text
language plpgsql security definer set search_path = '' as $$
declare v int;
begin
  insert into public.invoice_counters (org_id, year, last) values (p_org, p_year, 1)
  on conflict (org_id, year) do update set last = public.invoice_counters.last + 1 returning last into v;
  return format('INV-%s-%s', p_year, lpad(v::text, 6, '0'));
end $$;

-- Who may post money for an organisation: the billing service, or its owners/managers.
create or replace function app.can_post(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select current_user = 'rentife_billing' or session_user = 'rentife_billing'
      or app.has_role(p_org, array['owner', 'manager']::public.member_role[])
$$;

-- Posts charges computed by the billing engine (src/core/billing.ts). Idempotent: automated charges
-- that already exist are skipped. Each new charge gets a ledger debit and an invoice line, then any
-- tenant credit is applied. p_charges: [{tenancy_id, charge_type, period, amount, due_date, description,
-- source, recurring_id?}]
create or replace function public.post_charges(p_org uuid, p_as_of date, p_trigger text, p_charges jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  c jsonb; v_id uuid; v_inv uuid; v_created int := 0; v_invoices int := 0; v_applied bigint := 0;
  v_tenancies uuid[] := '{}'; v_t uuid; v_tenancy record;
begin
  if not app.can_post(p_org) then raise exception 'Not allowed'; end if;
  if p_trigger not in ('cron', 'manual') then raise exception 'Bad trigger'; end if;
  for c in select * from jsonb_array_elements(coalesce(p_charges, '[]'::jsonb)) loop
    select t.id, t.org_id, t.unit_id into v_tenancy from public.tenancies t where t.id = (c ->> 'tenancy_id')::uuid;
    if v_tenancy.id is null or v_tenancy.org_id <> p_org then raise exception 'Tenancy not in this organisation'; end if;
    if (c ->> 'source') = 'manual' and not app.can_edit_property(p_org, (select property_id from public.units where id = v_tenancy.unit_id))
       and current_user <> 'rentife_billing' then raise exception 'Not allowed'; end if;
    v_id := null;
    insert into public.charges (org_id, tenancy_id, charge_type, period, amount, due_date, description, source, recurring_id)
    values (p_org, v_tenancy.id, c ->> 'charge_type', c ->> 'period', (c ->> 'amount')::bigint, (c ->> 'due_date')::date,
            coalesce(c ->> 'description', ''), c ->> 'source', nullif(c ->> 'recurring_id', '')::uuid)
    on conflict do nothing
    returning id into v_id;
    continue when v_id is null;
    v_created := v_created + 1;
    insert into public.ledger_entries (org_id, tenancy_id, kind, debit, charge_id, description, effective_date)
    values (p_org, v_tenancy.id, 'charge', (c ->> 'amount')::bigint, v_id,
            coalesce(nullif(c ->> 'description', ''), (select name from public.charge_types where org_id = p_org and code = c ->> 'charge_type')),
            (c ->> 'due_date')::date);
    select id into v_inv from public.invoices where tenancy_id = v_tenancy.id and period = c ->> 'period';
    if v_inv is null then
      insert into public.invoices (org_id, tenancy_id, period, number, issued_on)
      values (p_org, v_tenancy.id, c ->> 'period', app.next_invoice_number(p_org, extract(year from (c ->> 'due_date')::date)::int), p_as_of)
      returning id into v_inv;
      v_invoices := v_invoices + 1;
    end if;
    insert into public.invoice_lines (invoice_id, charge_id) values (v_inv, v_id);
    if not v_tenancy.id = any(v_tenancies) then v_tenancies := v_tenancies || v_tenancy.id; end if;
  end loop;
  foreach v_t in array v_tenancies loop v_applied := v_applied + app.apply_credits(v_t); end loop;
  if p_trigger = 'cron' or v_created > 0 or (p_charges is not null and jsonb_array_length(p_charges) > 0 and (p_charges -> 0 ->> 'source') <> 'manual') then
    insert into public.billing_runs (org_id, as_of, trigger, charges_created, invoices_created, credits_applied)
    values (p_org, p_as_of, p_trigger, v_created, v_invoices, v_applied);
  end if;
  return jsonb_build_object('charges', v_created, 'invoices', v_invoices, 'credits_applied', v_applied);
end $$;

-- Credit notes, waivers and write-offs: a new adjustment + ledger credit, never an edit.
create or replace function public.make_adjustment(p_tenancy uuid, p_kind text, p_amount bigint, p_charge uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_t record; v_adj uuid; v_entry bigint; v_out bigint;
begin
  select t.id, t.org_id, u.property_id into v_t from public.tenancies t join public.units u on u.id = t.unit_id where t.id = p_tenancy for update of t;
  if v_t.id is null then raise exception 'Tenancy not found'; end if;
  if p_kind = 'write_off' then
    if not app.has_role(v_t.org_id, array['owner']::public.member_role[]) then raise exception 'Only the owner can write off a debt'; end if;
  elsif not app.can_edit_property(v_t.org_id, v_t.property_id) then raise exception 'Not allowed';
  end if;
  if p_kind not in ('credit_note', 'waiver', 'write_off') then raise exception 'Unknown adjustment'; end if;
  if coalesce(p_amount, 0) <= 0 then raise exception 'Amount must be more than zero'; end if;
  if p_kind in ('waiver', 'write_off') then
    select outstanding into v_out from public.charge_balances where id = p_charge and tenancy_id = p_tenancy;
    if v_out is null then raise exception 'Choose a charge on this tenancy'; end if;
    if p_amount > v_out then raise exception 'That is more than is still owed on this charge'; end if;
  end if;
  insert into public.adjustments (org_id, tenancy_id, kind, amount, charge_id, reason, approved_by)
  values (v_t.org_id, p_tenancy, p_kind, p_amount, case when p_kind = 'credit_note' then null else p_charge end, trim(p_reason), auth.uid())
  returning id into v_adj;
  insert into public.ledger_entries (org_id, tenancy_id, kind, credit, adjustment_id, charge_id, description, effective_date)
  values (v_t.org_id, p_tenancy, p_kind, p_amount, v_adj, case when p_kind = 'credit_note' then null else p_charge end,
          initcap(replace(p_kind, '_', ' ')) || ': ' || trim(p_reason), (now() at time zone 'Africa/Nairobi')::date)
  returning id into v_entry;
  if p_kind in ('waiver', 'write_off') then
    insert into public.allocations (org_id, ledger_entry_id, charge_id, amount) values (v_t.org_id, v_entry, p_charge, p_amount);
    perform app.refresh_charge_status(p_charge);
  else
    perform app.apply_credits(p_tenancy);
  end if;
  return v_adj;
end $$;

-- ── Access ───────────────────────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['charge_types', 'recurring_charges', 'rent_reviews', 'charges', 'invoice_counters', 'invoices',
                           'invoice_lines', 'adjustments', 'ledger_entries', 'allocations', 'billing_runs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, public, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
  foreach t in array array['recurring_charges', 'rent_reviews', 'charges', 'adjustments', 'invoices'] loop
    execute format('drop trigger if exists audit on public.%I', t);
    execute format('create trigger audit after insert or update or delete on public.%I for each row execute function app.audit()', t);
  end loop;
end $$;
revoke all on public.invoice_counters from authenticated;
grant insert, update on public.recurring_charges, public.rent_reviews to authenticated;
grant select on public.charge_balances, public.tenancy_balances, public.statement_lines to authenticated;
revoke all on public.charge_balances, public.tenancy_balances, public.statement_lines from anon;

-- Money is visible to owner/manager/accountant/passive owner for tenancies they can see. Caretakers: never.
create or replace function app.can_see_tenancy_money(p_tenancy uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.tenancies t join public.units u on u.id = t.unit_id
                 where t.id = p_tenancy
                   and app.has_role(t.org_id, array['owner', 'manager', 'accountant', 'passive_owner']::public.member_role[])
                   and app.can_see_property(t.org_id, u.property_id))
$$;
grant execute on function app.can_see_tenancy_money(uuid) to authenticated;

drop policy if exists ct_select on public.charge_types;
create policy ct_select on public.charge_types for select to authenticated using (app.is_member(org_id));
do $$
declare t text;
begin
  foreach t in array array['charges', 'invoices', 'adjustments', 'ledger_entries', 'rent_reviews'] loop
    execute format('drop policy if exists money_select on public.%I', t);
    execute format('create policy money_select on public.%I for select to authenticated using (app.can_see_tenancy_money(tenancy_id))', t);
  end loop;
end $$;
drop policy if exists lines_select on public.invoice_lines;
create policy lines_select on public.invoice_lines for select to authenticated using (exists (select 1 from public.invoices i where i.id = invoice_id and app.can_see_tenancy_money(i.tenancy_id)));
drop policy if exists alloc_select on public.allocations;
create policy alloc_select on public.allocations for select to authenticated using (exists (select 1 from public.charges c where c.id = charge_id and app.can_see_tenancy_money(c.tenancy_id)));
drop policy if exists runs_select on public.billing_runs;
create policy runs_select on public.billing_runs for select to authenticated using (app.has_role(org_id, array['owner', 'manager', 'accountant']::public.member_role[]));
drop policy if exists rc_select on public.recurring_charges;
create policy rc_select on public.recurring_charges for select to authenticated using (app.has_role(org_id, array['owner', 'manager', 'accountant']::public.member_role[]));
drop policy if exists rc_write on public.recurring_charges;
create policy rc_write on public.recurring_charges for insert to authenticated with check (app.has_role(org_id, array['owner', 'manager']::public.member_role[]));
drop policy if exists rc_update on public.recurring_charges;
create policy rc_update on public.recurring_charges for update to authenticated using (app.has_role(org_id, array['owner', 'manager']::public.member_role[])) with check (app.has_role(org_id, array['owner', 'manager']::public.member_role[]));
drop policy if exists rr_write on public.rent_reviews;
create policy rr_write on public.rent_reviews for insert to authenticated with check (
  exists (select 1 from public.tenancies t join public.units u on u.id = t.unit_id where t.id = tenancy_id and t.org_id = rent_reviews.org_id and app.can_edit_property(t.org_id, u.property_id)));

revoke all on function public.post_charges(uuid, date, text, jsonb) from public, anon;
grant execute on function public.post_charges(uuid, date, text, jsonb) to authenticated;
revoke all on function public.make_adjustment(uuid, text, bigint, uuid, text) from public, anon;
grant execute on function public.make_adjustment(uuid, text, bigint, uuid, text) to authenticated;
revoke execute on function app.apply_credits(uuid), app.refresh_charge_status(uuid), app.next_invoice_number(uuid, int), app.seed_charge_types(uuid) from authenticated, public;
