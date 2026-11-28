-- Stage 4: onboarding wizard state, how tenants pay, reminder preferences and the register import.
-- Masterplan §11 (onboarding), §6.5 (payment integrations, credentials later), §6.8 (reminder_rules).

-- Unit codes are what tenants type into M-Pesa: they must be unique within an organisation.
alter table public.units drop constraint if exists units_org_code_unique;
alter table public.units add constraint units_org_code_unique unique (org_id, unit_code);

-- Wizard progress, saved after every step so it can be resumed.
alter table public.organisations add column if not exists onboarding_step smallint not null default 2 check (onboarding_step between 1 and 7);
alter table public.organisations add column if not exists onboarding_completed_at timestamptz;
alter table public.organisations add column if not exists contact_phone text check (contact_phone is null or app.is_ke_phone(contact_phone));

-- How tenants pay. Daraja credentials (encrypted in Vault) and "Test connection" arrive in Stage 6.
create table if not exists public.payment_settings (
  org_id uuid primary key references public.organisations(id) on delete cascade,
  method text not null check (method in ('mpesa_paybill', 'mpesa_till', 'bank_paybill', 'none_yet')),
  shortcode text check (shortcode is null or shortcode ~ '^[0-9]{5,7}$'),
  bank_name text not null default '',
  bank_account_hint text not null default '' check (char_length(bank_account_hint) <= 40),
  status text not null default 'not_connected' check (status in ('not_connected', 'connected', 'error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (method = 'none_yet' or shortcode is not null)
);

-- Reminder schedule and tone (sending starts in Stage 7).
create table if not exists public.reminder_rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  property_id uuid,
  offsets smallint[] not null default '{-3,0,3,7}' check (cardinality(offsets) between 1 and 8),
  tone text not null default 'standard' check (tone in ('gentle', 'standard', 'firm')),
  channels text[] not null default '{sms}' check (channels <@ array['sms', 'whatsapp']),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (property_id, org_id) references public.properties(id, org_id) on delete cascade
);
create unique index if not exists reminder_rules_org_default on public.reminder_rules (org_id) where property_id is null;

do $$
declare t text;
begin
  foreach t in array array['payment_settings', 'reminder_rules'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, public', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('drop trigger if exists touch on public.%I', t);
    execute format('create trigger touch before update on public.%I for each row execute function app.touch_updated_at()', t);
    execute format('drop trigger if exists audit on public.%I', t);
    execute format('create trigger audit after insert or update or delete on public.%I for each row execute function app.audit()', t);
  end loop;
end $$;

-- Every member may read how tenants pay (the building notice needs it); only owners change it
-- (masterplan §2: managers cannot change payment credentials).
drop policy if exists pay_select on public.payment_settings;
create policy pay_select on public.payment_settings for select to authenticated using (app.is_member(org_id));
drop policy if exists pay_write on public.payment_settings;
create policy pay_write on public.payment_settings for all to authenticated
  using (app.has_role(org_id, array['owner']::public.member_role[])) with check (app.has_role(org_id, array['owner']::public.member_role[]));

drop policy if exists rem_select on public.reminder_rules;
create policy rem_select on public.reminder_rules for select to authenticated using (app.is_member(org_id));
drop policy if exists rem_write on public.reminder_rules;
create policy rem_write on public.reminder_rules for all to authenticated
  using (app.has_role(org_id, array['owner', 'manager']::public.member_role[])) with check (app.has_role(org_id, array['owner', 'manager']::public.member_role[]));

-- Owners and managers may record wizard progress (organisation update is otherwise owner-only).
create or replace function public.set_onboarding_step(p_org uuid, p_step smallint, p_done boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not app.has_role(p_org, array['owner', 'manager']::public.member_role[]) then raise exception 'Not allowed'; end if;
  update public.organisations
     set onboarding_step = greatest(onboarding_step, least(p_step, 7)),
         onboarding_completed_at = case when p_done then coalesce(onboarding_completed_at, now()) else onboarding_completed_at end
   where id = p_org;
end $$;
revoke all on function public.set_onboarding_step(uuid, smallint, boolean) from public, anon;
grant execute on function public.set_onboarding_step(uuid, smallint, boolean) to authenticated;

-- ── Register import ─────────────────────────────────────────────────────────────────────
-- Imports a property's units and (optionally) their tenants in ONE transaction: all rows or none.
-- SECURITY INVOKER: runs as the caller, so every insert is checked by RLS like any other write.
-- p_rows: [{label, unit_code?, type?, rent, deposit?, floor?, tenant_name?, phones?[], move_in?, due_day?,
--           id_last4?, language?}] with money in cents.
create or replace function public.import_register(p_property uuid, p_rows jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_org uuid; v_prefix text; v_due smallint; v_grace smallint;
  r jsonb; v_unit uuid; v_tenant uuid; v_code text; n_units int := 0; n_tenants int := 0;
begin
  select org_id, code_prefix, default_due_day, default_grace_days into v_org, v_prefix, v_due, v_grace
    from public.properties where id = p_property;
  if v_org is null then raise exception 'Property not found'; end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then raise exception 'Nothing to import'; end if;
  if jsonb_array_length(p_rows) > 1000 then raise exception 'Import at most 1,000 rows at a time'; end if;

  for r in select * from jsonb_array_elements(p_rows) loop
    v_code := upper(coalesce(nullif(trim(r ->> 'unit_code'), ''), v_prefix || '-' || app.norm_code(r ->> 'label')));
    if exists (select 1 from public.unit_codes c where c.org_id = v_org and c.code_norm = app.norm_code(v_code)) then
      raise exception 'Unit code % is already used by another unit', v_code;
    end if;
    insert into public.units (org_id, property_id, label, unit_code, type, rent_amount, deposit_amount, floor)
    values (v_org, p_property, upper(trim(r ->> 'label')), v_code, coalesce(nullif(r ->> 'type', ''), 'other'),
            coalesce((r ->> 'rent')::bigint, 0), coalesce((r ->> 'deposit')::bigint, 0), coalesce(r ->> 'floor', ''))
    returning id into v_unit;
    n_units := n_units + 1;

    if coalesce(trim(r ->> 'tenant_name'), '') <> '' then
      insert into public.tenants (org_id, full_name, phones, national_id_last4, preferred_language)
      values (v_org, trim(r ->> 'tenant_name'),
              coalesce(array(select jsonb_array_elements_text(r -> 'phones')), '{}'),
              nullif(r ->> 'id_last4', ''),
              coalesce(nullif(r ->> 'language', ''), 'en')::public.lang)
      returning id into v_tenant;
      insert into public.tenancies (org_id, unit_id, tenant_id, start_date, rent_amount, deposit_amount, due_day, grace_days)
      values (v_org, v_unit, v_tenant, coalesce((r ->> 'move_in')::date, current_date),
              coalesce((r ->> 'rent')::bigint, 0), coalesce((r ->> 'deposit')::bigint, 0),
              coalesce((r ->> 'due_day')::smallint, v_due), v_grace);
      n_tenants := n_tenants + 1;
    end if;
  end loop;
  return jsonb_build_object('units', n_units, 'tenants', n_tenants);
end $$;
revoke all on function public.import_register(uuid, jsonb) from public, anon;
grant execute on function public.import_register(uuid, jsonb) to authenticated;
