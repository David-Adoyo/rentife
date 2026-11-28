-- Per-organisation daily cap on AI features (masterplan §4.6: "behind a feature flag with usage caps").
create table if not exists public.ai_usage (
  org_id uuid not null references public.organisations(id) on delete cascade,
  day date not null default (now() at time zone 'Africa/Nairobi')::date,
  feature text not null check (feature in ('register_photo')),
  count integer not null default 0,
  primary key (org_id, day, feature)
);
alter table public.ai_usage enable row level security;
alter table public.ai_usage force row level security;
revoke all on public.ai_usage from anon, public, authenticated;

-- Counts one use and says whether it is within today's cap. Only owners and managers may use AI import.
create or replace function public.use_ai_quota(p_org uuid, p_feature text, p_daily_limit int)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_count int;
begin
  if not app.has_role(p_org, array['owner', 'manager']::public.member_role[]) then raise exception 'Not allowed'; end if;
  insert into public.ai_usage (org_id, feature, count) values (p_org, p_feature, 1)
  on conflict (org_id, day, feature) do update set count = public.ai_usage.count + 1
  returning count into v_count;
  return v_count <= p_daily_limit;
end $$;
revoke all on function public.use_ai_quota(uuid, text, int) from public, anon;
grant execute on function public.use_ai_quota(uuid, text, int) to authenticated;
