-- Rentife staff admin: accounts, one-time invites, audit log, and lead follow-up fields.
-- The admin area connects as `rentife_admin_app` (separate from the insert-only `rentife_writer`).
alter table rentife.leads
  add column if not exists notes text not null default '' check (char_length(notes) <= 2000),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists rentife.admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  name text not null default '',
  password_hash text,
  totp_secret_enc text,
  totp_enabled boolean not null default false,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  session_version integer not null default 1,
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists rentife.admin_invites (
  token_hash text primary key,
  admin_id uuid not null references rentife.admins(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- Append-only: the app role may insert and read, never update or delete.
create table if not exists rentife.audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid references rentife.admins(id),
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table rentife.admins enable row level security;
alter table rentife.admin_invites enable row level security;
alter table rentife.audit_log enable row level security;
revoke all on rentife.admins, rentife.admin_invites, rentife.audit_log from public, anon, authenticated;

-- create role rentife_admin_app login password '<generated, stored only in Vercel as DATABASE_ADMIN_URL>' noinherit;
grant usage on schema rentife to rentife_admin_app;
grant select, update (status, notes, updated_at) on rentife.leads to rentife_admin_app;
grant select, update on rentife.admins to rentife_admin_app;
grant select, update on rentife.admin_invites to rentife_admin_app;
grant select, insert on rentife.audit_log to rentife_admin_app;

drop policy if exists admin_app_all on rentife.leads;
create policy admin_app_all on rentife.leads for all to rentife_admin_app using (true) with check (true);
drop policy if exists admin_app_all on rentife.admins;
create policy admin_app_all on rentife.admins for all to rentife_admin_app using (true) with check (true);
drop policy if exists admin_app_all on rentife.admin_invites;
create policy admin_app_all on rentife.admin_invites for all to rentife_admin_app using (true) with check (true);
drop policy if exists admin_app_all on rentife.audit_log;
create policy admin_app_all on rentife.audit_log for all to rentife_admin_app using (true) with check (true);
