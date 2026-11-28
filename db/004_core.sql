-- Stage 3: organisations, people, property structure, tenancies, invitations and audit.
-- Masterplan §2 (roles), §6.1–6.3 (data model), §6.9 (RLS), §13 (audit).
-- Money is stored in cents as bigint. Every table has RLS. Cross-organisation links are
-- impossible by construction: child rows reference (id, org_id) pairs of their parents.

create schema if not exists app;
grant usage on schema app to authenticated;

-- ── Types ────────────────────────────────────────────────────────────────────────────────
do $$ begin
  create type public.org_type as enum ('individual', 'family', 'agency');
  create type public.member_role as enum ('owner', 'manager', 'accountant', 'caretaker', 'passive_owner');
  create type public.property_type as enum ('residential', 'commercial', 'mixed');
  create type public.unit_status as enum ('vacant', 'occupied', 'notice', 'maintenance');
  create type public.tenancy_status as enum ('active', 'notice', 'ended');
  create type public.lang as enum ('en', 'sw');
exception when duplicate_object then null; end $$;

-- ── Small helpers ───────────────────────────────────────────────────────────────────────
create or replace function app.norm_code(code text) returns text
language sql immutable parallel safe as $$ select upper(regexp_replace(coalesce(code, ''), '[^A-Za-z0-9]', '', 'g')) $$;

create or replace function app.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at := now(); return new; end $$;

-- Kenyan mobile numbers in E.164: +2547XXXXXXXX or +2541XXXXXXXX
create or replace function app.is_ke_phone(p text) returns boolean
language sql immutable as $$ select p ~ '^\+254[17][0-9]{8}$' $$;

-- ── Tables ──────────────────────────────────────────────────────────────────────────────
create table if not exists public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  type public.org_type not null default 'individual',
  residency text not null default 'resident' check (residency in ('resident', 'non_resident')),
  timezone text not null default 'Africa/Nairobi',
  quiet_start time not null default '21:00',
  quiet_end time not null default '07:00',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  phone text check (phone is null or app.is_ke_phone(phone)),
  preferred_language public.lang not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.owners (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  phone text check (phone is null or app.is_ke_phone(phone)),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  residency text not null default 'resident' check (residency in ('resident', 'non_resident')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (id, org_id)
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null,
  property_scope uuid[],            -- null = all properties
  owner_id uuid,                    -- required for passive owners
  two_factor_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, user_id),
  foreign key (owner_id, org_id) references public.owners(id, org_id),
  check (role <> 'passive_owner' or owner_id is not null)
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  owner_id uuid,
  name text not null check (char_length(name) between 2 and 120),
  type public.property_type not null default 'residential',
  address text not null default '',
  estate text not null default '',
  county text not null default '',
  code_prefix text not null check (code_prefix ~ '^[A-Z]{2,5}$'),
  default_due_day smallint not null default 5 check (default_due_day between 1 and 28),
  default_grace_days smallint not null default 3 check (default_grace_days between 0 and 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (id, org_id),
  unique (org_id, code_prefix),
  foreign key (owner_id, org_id) references public.owners(id, org_id)
);

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  property_id uuid not null,
  label text not null check (char_length(label) between 1 and 20),
  unit_code text not null check (unit_code ~ '^[A-Z0-9-]{2,24}$'),
  type text not null default 'other' check (type in ('bedsitter', 'studio', '1br', '2br', '3br', '4br+', 'shop', 'office', 'other')),
  rent_amount bigint not null default 0 check (rent_amount >= 0),       -- cents
  deposit_amount bigint not null default 0 check (deposit_amount >= 0), -- cents
  status public.unit_status not null default 'vacant',
  floor text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (id, org_id),
  unique (property_id, label),
  foreign key (property_id, org_id) references public.properties(id, org_id) on delete cascade
);

-- Every accepted M-Pesa account reference for a unit: the primary code plus aliases (B4, b-4, SUNB4).
create table if not exists public.unit_codes (
  org_id uuid not null,
  unit_id uuid not null,
  code text not null check (char_length(code) between 1 and 24),
  code_norm text generated always as (app.norm_code(code)) stored,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (org_id, code_norm),
  foreign key (unit_id, org_id) references public.units(id, org_id) on delete cascade
);
create unique index if not exists unit_codes_one_primary on public.unit_codes (unit_id) where is_primary;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  phones text[] not null default '{}' check (cardinality(phones) <= 5),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  national_id_last4 text check (national_id_last4 is null or national_id_last4 ~ '^[0-9]{4}$'),
  guarantor_name text not null default '',
  guarantor_phone text check (guarantor_phone is null or app.is_ke_phone(guarantor_phone)),
  preferred_language public.lang not null default 'en',
  consent_sms boolean not null default true,
  consent_whatsapp boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (id, org_id)
);

create or replace function app.phones_valid(ps text[]) returns boolean
language sql immutable as $$ select coalesce(bool_and(app.is_ke_phone(p)), true) from unnest(ps) p $$;
alter table public.tenants drop constraint if exists tenants_phones_valid;
alter table public.tenants add constraint tenants_phones_valid check (app.phones_valid(phones));

create table if not exists public.tenancies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  unit_id uuid not null,
  tenant_id uuid not null,
  start_date date not null,
  end_date date,
  rent_amount bigint not null check (rent_amount >= 0),       -- cents
  deposit_amount bigint not null default 0 check (deposit_amount >= 0),
  due_day smallint not null check (due_day between 1 and 28),
  grace_days smallint not null default 3 check (grace_days between 0 and 30),
  billing_frequency text not null default 'monthly' check (billing_frequency in ('monthly', 'quarterly')),
  status public.tenancy_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date),
  foreign key (unit_id, org_id) references public.units(id, org_id),
  foreign key (tenant_id, org_id) references public.tenants(id, org_id)
);
-- One live tenancy per unit.
create unique index if not exists tenancies_one_live_per_unit on public.tenancies (unit_id) where status in ('active', 'notice');

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  email text not null check (email = lower(email) and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role public.member_role not null check (role <> 'owner'),
  property_scope uuid[],
  owner_id uuid,
  token_hash text not null unique,
  invited_by uuid not null references auth.users(id),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (owner_id, org_id) references public.owners(id, org_id)
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  org_id uuid references public.organisations(id) on delete cascade,
  actor uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  at timestamptz not null default now()
);
create index if not exists audit_log_org_at on public.audit_log (org_id, at desc);

-- Useful lookups
create index if not exists memberships_user on public.memberships (user_id);
create index if not exists units_property on public.units (property_id);
create index if not exists tenancies_tenant on public.tenancies (tenant_id);
create index if not exists tenants_name_trgm on public.tenants using gin (full_name gin_trgm_ops);

-- ── Access helpers (used by every policy) ───────────────────────────────────────────────
-- Owners and managers must have passed two-factor (JWT aal2) when their membership requires it.
create or replace function app.mfa_ok(required boolean) returns boolean
language sql stable as $$ select not required or coalesce(auth.jwt() ->> 'aal', '') = 'aal2' $$;

create or replace function app.my_role(p_org uuid) returns public.member_role
language sql stable security definer set search_path = '' as $$
  select m.role from public.memberships m
  where m.org_id = p_org and m.user_id = auth.uid() and app.mfa_ok(m.two_factor_required)
$$;

create or replace function app.has_role(p_org uuid, p_roles public.member_role[]) returns boolean
language sql stable security definer set search_path = '' as $$ select app.my_role(p_org) = any(p_roles) $$;

create or replace function app.is_member(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$ select app.my_role(p_org) is not null $$;

-- Can the current user see this property? Scope applies to managers and caretakers;
-- passive owners only see properties linked to their owner record.
create or replace function app.can_see_property(p_org uuid, p_property uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org and m.user_id = auth.uid() and app.mfa_ok(m.two_factor_required)
      and case m.role
            when 'passive_owner' then exists (select 1 from public.properties p where p.id = p_property and p.owner_id = m.owner_id)
            else m.property_scope is null or p_property = any(m.property_scope)
          end)
$$;

create or replace function app.can_edit_property(p_org uuid, p_property uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select app.has_role(p_org, array['owner', 'manager']::public.member_role[]) and app.can_see_property(p_org, p_property)
$$;

-- Unscoped owner/manager/accountant: may see every tenant. Scoped managers see tenants with a tenancy in scope.
create or replace function app.can_see_tenant(p_org uuid, p_tenant uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when app.has_role(p_org, array['owner', 'accountant']::public.member_role[]) then true
    when app.has_role(p_org, array['manager']::public.member_role[]) then
      (select m.property_scope is null from public.memberships m where m.org_id = p_org and m.user_id = auth.uid())
      or exists (select 1 from public.tenancies t join public.units u on u.id = t.unit_id
                 where t.tenant_id = p_tenant and app.can_see_property(p_org, u.property_id))
    else false end
$$;

create or replace function app.shares_org(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships a join public.memberships b on a.org_id = b.org_id
                 where a.user_id = auth.uid() and b.user_id = p_user and app.mfa_ok(a.two_factor_required))
$$;

grant execute on all functions in schema app to authenticated;

-- ── Unit codes: generate on insert, keep the primary in sync, add safe aliases ──────────
create or replace function app.units_before() returns trigger
language plpgsql as $$
declare v_prefix text;
begin
  if new.unit_code is null or new.unit_code = '' then
    select code_prefix into v_prefix from public.properties where id = new.property_id;
    new.unit_code := v_prefix || '-' || app.norm_code(new.label);
  end if;
  new.unit_code := upper(new.unit_code);
  return new;
end $$;

create or replace function app.units_after() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.unit_code is distinct from old.unit_code then
    -- keep the old code as an alias so tenants using it still match
    update public.unit_codes set is_primary = false where unit_id = new.id and is_primary;
  end if;
  insert into public.unit_codes (org_id, unit_id, code, is_primary) values (new.org_id, new.id, new.unit_code, true)
    on conflict (org_id, code_norm) do update set is_primary = true where public.unit_codes.unit_id = excluded.unit_id;
  -- bare label (e.g. B4) only if no other unit in the organisation already answers to it
  insert into public.unit_codes (org_id, unit_id, code, is_primary) values (new.org_id, new.id, new.label, false)
    on conflict (org_id, code_norm) do nothing;
  return new;
end $$;

-- ── Tenancy → unit status ───────────────────────────────────────────────────────────────
create or replace function app.tenancy_status_sync() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.units set status = case new.status when 'active' then 'occupied'::public.unit_status
                                                   when 'notice' then 'notice'::public.unit_status
                                                   else 'vacant'::public.unit_status end
  where id = new.unit_id;
  return new;
end $$;

-- ── Never remove the last owner ─────────────────────────────────────────────────────────
create or replace function app.keep_an_owner() returns trigger
language plpgsql as $$
begin
  if old.role = 'owner' and (tg_op = 'DELETE' or new.role <> 'owner') and not exists (
    select 1 from public.memberships where org_id = old.org_id and role = 'owner' and id <> old.id) then
    raise exception 'An organisation must keep at least one owner';
  end if;
  return coalesce(new, old);
end $$;

-- ── Audit: append-only, written by triggers, never editable ─────────────────────────────
create or replace function app.audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_org uuid; v_id uuid; v_before jsonb; v_after jsonb;
begin
  v_before := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_after  := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  if tg_op = 'UPDATE' and v_before - 'updated_at' = v_after - 'updated_at' then return new; end if;
  v_org := coalesce((v_after ->> 'org_id'), (v_before ->> 'org_id'),
                    case when tg_table_name = 'organisations' then coalesce(v_after ->> 'id', v_before ->> 'id') end)::uuid;
  v_id := coalesce(v_after ->> 'id', v_before ->> 'id')::uuid;
  -- never copy token hashes into the log
  v_before := v_before - 'token_hash'; v_after := v_after - 'token_hash';
  insert into public.audit_log (org_id, actor, action, entity, entity_id, before, after)
  values (v_org, auth.uid(), lower(tg_op), tg_table_name, v_id, v_before, v_after);
  return coalesce(new, old);
end $$;

create or replace function app.audit_immutable() returns trigger
language plpgsql as $$ begin raise exception 'The audit log cannot be changed'; end $$;

do $$
declare t text;
begin
  foreach t in array array['organisations', 'profiles', 'owners', 'memberships', 'properties', 'units', 'tenants', 'tenancies'] loop
    execute format('drop trigger if exists touch on public.%I', t);
    execute format('create trigger touch before update on public.%I for each row execute function app.touch_updated_at()', t);
  end loop;
  foreach t in array array['organisations', 'owners', 'memberships', 'properties', 'units', 'tenants', 'tenancies', 'invitations'] loop
    execute format('drop trigger if exists audit on public.%I', t);
    execute format('create trigger audit after insert or update or delete on public.%I for each row execute function app.audit()', t);
  end loop;
end $$;

drop trigger if exists units_before on public.units;
create trigger units_before before insert or update of unit_code, label on public.units for each row execute function app.units_before();
drop trigger if exists units_after on public.units;
create trigger units_after after insert or update of unit_code, label on public.units for each row execute function app.units_after();
drop trigger if exists tenancy_status_sync on public.tenancies;
create trigger tenancy_status_sync after insert or update of status on public.tenancies for each row execute function app.tenancy_status_sync();
drop trigger if exists keep_an_owner on public.memberships;
create trigger keep_an_owner before update or delete on public.memberships for each row execute function app.keep_an_owner();
drop trigger if exists audit_immutable on public.audit_log;
create trigger audit_immutable before update or delete on public.audit_log for each row execute function app.audit_immutable();

-- ── Row Level Security ──────────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['organisations', 'profiles', 'owners', 'memberships', 'properties', 'units', 'unit_codes',
                           'tenants', 'tenancies', 'invitations', 'audit_log'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, public', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
revoke insert, update, delete on public.audit_log from authenticated;
revoke insert, delete on public.organisations from authenticated;   -- created via create_organisation()

-- organisations
drop policy if exists org_select on public.organisations;
create policy org_select on public.organisations for select to authenticated using (app.is_member(id));
drop policy if exists org_update on public.organisations;
create policy org_update on public.organisations for update to authenticated
  using (app.has_role(id, array['owner']::public.member_role[])) with check (app.has_role(id, array['owner']::public.member_role[]));

-- profiles: your own, plus people you work with
drop policy if exists profile_select on public.profiles;
create policy profile_select on public.profiles for select to authenticated using (user_id = auth.uid() or app.shares_org(user_id));
drop policy if exists profile_write on public.profiles;
create policy profile_write on public.profiles for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- memberships: members see the team; owners manage it
drop policy if exists member_select on public.memberships;
create policy member_select on public.memberships for select to authenticated using (user_id = auth.uid() or app.is_member(org_id));
drop policy if exists member_manage on public.memberships;
create policy member_manage on public.memberships for all to authenticated
  using (app.has_role(org_id, array['owner']::public.member_role[])) with check (app.has_role(org_id, array['owner']::public.member_role[]));

-- owners (agency mode)
drop policy if exists owners_select on public.owners;
create policy owners_select on public.owners for select to authenticated using (
  app.has_role(org_id, array['owner', 'manager', 'accountant']::public.member_role[])
  or exists (select 1 from public.memberships m where m.org_id = owners.org_id and m.user_id = auth.uid()
             and m.role = 'passive_owner' and m.owner_id = owners.id and app.mfa_ok(m.two_factor_required)));
drop policy if exists owners_write on public.owners;
create policy owners_write on public.owners for all to authenticated
  using (app.has_role(org_id, array['owner', 'manager']::public.member_role[])) with check (app.has_role(org_id, array['owner', 'manager']::public.member_role[]));

-- properties
drop policy if exists prop_select on public.properties;
create policy prop_select on public.properties for select to authenticated using (app.can_see_property(org_id, id));
drop policy if exists prop_insert on public.properties;
create policy prop_insert on public.properties for insert to authenticated with check (
  app.has_role(org_id, array['owner', 'manager']::public.member_role[])
  and (select m.property_scope is null from public.memberships m where m.org_id = properties.org_id and m.user_id = auth.uid()));
drop policy if exists prop_update on public.properties;
create policy prop_update on public.properties for update to authenticated using (app.can_edit_property(org_id, id)) with check (app.can_edit_property(org_id, id));
drop policy if exists prop_delete on public.properties;
create policy prop_delete on public.properties for delete to authenticated using (app.has_role(org_id, array['owner']::public.member_role[]));

-- units: caretakers read them through unit_board (amounts masked), not directly
drop policy if exists units_select on public.units;
create policy units_select on public.units for select to authenticated using (
  app.can_see_property(org_id, property_id) and not app.has_role(org_id, array['caretaker']::public.member_role[]));
drop policy if exists units_write on public.units;
create policy units_write on public.units for all to authenticated
  using (app.can_edit_property(org_id, property_id)) with check (app.can_edit_property(org_id, property_id));

drop policy if exists codes_select on public.unit_codes;
create policy codes_select on public.unit_codes for select to authenticated using (
  exists (select 1 from public.units u where u.id = unit_codes.unit_id and app.can_see_property(u.org_id, u.property_id)));
drop policy if exists codes_write on public.unit_codes;
create policy codes_write on public.unit_codes for all to authenticated
  using (exists (select 1 from public.units u where u.id = unit_codes.unit_id and app.can_edit_property(u.org_id, u.property_id)))
  with check (exists (select 1 from public.units u where u.id = unit_codes.unit_id and u.org_id = unit_codes.org_id and app.can_edit_property(u.org_id, u.property_id)));

-- tenants
drop policy if exists tenants_select on public.tenants;
create policy tenants_select on public.tenants for select to authenticated using (app.can_see_tenant(org_id, id));
drop policy if exists tenants_write on public.tenants;
create policy tenants_write on public.tenants for all to authenticated
  using (app.has_role(org_id, array['owner', 'manager']::public.member_role[]) and app.can_see_tenant(org_id, id))
  with check (app.has_role(org_id, array['owner', 'manager']::public.member_role[]));

-- tenancies: passive owners see tenancies on their own properties
drop policy if exists tenancies_select on public.tenancies;
create policy tenancies_select on public.tenancies for select to authenticated using (
  app.has_role(org_id, array['owner', 'manager', 'accountant', 'passive_owner']::public.member_role[])
  and exists (select 1 from public.units u where u.id = tenancies.unit_id and app.can_see_property(u.org_id, u.property_id)));
drop policy if exists tenancies_write on public.tenancies;
create policy tenancies_write on public.tenancies for all to authenticated
  using (exists (select 1 from public.units u where u.id = tenancies.unit_id and app.can_edit_property(u.org_id, u.property_id)))
  with check (exists (select 1 from public.units u where u.id = tenancies.unit_id and u.org_id = tenancies.org_id and app.can_edit_property(u.org_id, u.property_id)));

-- invitations: owners only
drop policy if exists invites_owner on public.invitations;
create policy invites_owner on public.invitations for all to authenticated
  using (app.has_role(org_id, array['owner']::public.member_role[])) with check (app.has_role(org_id, array['owner']::public.member_role[]));

-- audit log: owners read; nobody writes directly
drop policy if exists audit_select on public.audit_log;
create policy audit_select on public.audit_log for select to authenticated using (app.has_role(org_id, array['owner']::public.member_role[]));

-- ── Caretaker-safe unit board: status for everyone in scope, money only for money roles ─
create or replace view public.unit_board with (security_barrier = true) as
  select u.id, u.org_id, u.property_id, p.name as property_name, u.label, u.unit_code, u.type, u.status, u.floor,
         case when app.has_role(u.org_id, array['owner', 'manager', 'accountant', 'passive_owner']::public.member_role[])
              then u.rent_amount end as rent_amount
  from public.units u join public.properties p on p.id = u.property_id
  where u.archived_at is null and app.can_see_property(u.org_id, u.property_id);
revoke all on public.unit_board from anon, public;
grant select on public.unit_board to authenticated;

-- ── RPCs ────────────────────────────────────────────────────────────────────────────────
-- Create an organisation and make the caller its owner (two-factor required, masterplan §13).
create or replace function public.create_organisation(p_name text, p_type public.org_type, p_full_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_org uuid; v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  if (select count(*) from public.memberships where user_id = v_uid and role = 'owner') >= 5 then
    raise exception 'You already own the maximum number of organisations';
  end if;
  insert into public.organisations (name, type, created_by) values (trim(p_name), p_type, v_uid) returning id into v_org;
  insert into public.memberships (org_id, user_id, role, two_factor_required) values (v_org, v_uid, 'owner', true);
  insert into public.profiles (user_id, full_name) values (v_uid, trim(p_full_name))
    on conflict (user_id) do update set full_name = excluded.full_name where public.profiles.full_name = '';
  return v_org;
end $$;
revoke all on function public.create_organisation(text, public.org_type, text) from public, anon;
grant execute on function public.create_organisation(text, public.org_type, text) to authenticated;

-- Accept an invitation sent to the signed-in user's email address.
create or replace function public.accept_invitation(p_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_inv public.invitations; v_email text := lower(auth.jwt() ->> 'email');
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into v_inv from public.invitations
   where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') for update;
  if v_inv.id is null or v_inv.accepted_at is not null or v_inv.expires_at < now() then
    raise exception 'This invitation has expired or was already used';
  end if;
  if v_inv.email <> v_email then raise exception 'This invitation was sent to a different email address'; end if;
  insert into public.memberships (org_id, user_id, role, property_scope, owner_id, two_factor_required)
  values (v_inv.org_id, auth.uid(), v_inv.role, v_inv.property_scope, v_inv.owner_id, v_inv.role in ('manager'))
  on conflict (org_id, user_id) do nothing;
  update public.invitations set accepted_at = now(), accepted_by = auth.uid() where id = v_inv.id;
  return v_inv.org_id;
end $$;
revoke all on function public.accept_invitation(text) from public, anon;
grant execute on function public.accept_invitation(text) to authenticated;

-- Suggest a unique 3-letter unit-code prefix from a property name (masterplan {{PROPERTY_PREFIX}}).
create or replace function public.suggest_prefix(p_org uuid, p_name text)
returns text language plpgsql stable security definer set search_path = '' as $$
declare v_base text := left(app.norm_code(regexp_replace(p_name, '[0-9]', '', 'g')) || 'XXX', 3); v_try text; i int := 2;
begin
  if not app.is_member(p_org) then raise exception 'Not allowed'; end if;
  v_try := v_base;
  while exists (select 1 from public.properties where org_id = p_org and code_prefix = v_try) loop
    v_try := left(v_base, 2) || chr(64 + i); i := i + 1;
    if i > 26 then raise exception 'Choose a prefix manually'; end if;
  end loop;
  return v_try;
end $$;
revoke all on function public.suggest_prefix(uuid, text) from public, anon;
grant execute on function public.suggest_prefix(uuid, text) to authenticated;
