-- Rentife booking leads. Lives in its own `rentife` schema inside the shared Supabase project
-- (free plan project limit; see DECISIONS.md D-005). Applied on 25 Nov 2026.
create schema if not exists rentife;
revoke all on schema rentife from public, anon, authenticated;

create table if not exists rentife.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  phone text not null check (phone ~ '^\+254[17][0-9]{8}$'),
  units integer not null check (units between 1 and 10000),
  area text not null check (char_length(area) between 2 and 100),
  best_time text not null check (best_time in ('morning','afternoon','evening')),
  source text not null default 'website',
  status text not null default 'new' check (status in ('new','contacted','booked','closed')),
  created_at timestamptz not null default now()
);
alter table rentife.leads enable row level security;
revoke all on rentife.leads from public, anon, authenticated;

-- The website connects as this role. It can insert leads and nothing else: no reads, no other schemas.
-- create role rentife_writer login password '<generated, stored only in Vercel as DATABASE_URL>' noinherit;
grant usage on schema rentife to rentife_writer;
grant insert on rentife.leads to rentife_writer;
create policy writer_insert on rentife.leads for insert to rentife_writer with check (true);
