-- Fix: has_role() returned NULL (not false) for non-members. Policies treat NULL as deny, but in
-- PL/pgSQL "IF NOT has_role(...)" a NULL skips the check. Always return a real boolean.
create or replace function app.has_role(p_org uuid, p_roles public.member_role[]) returns boolean
language sql stable security definer set search_path = '' as $$ select coalesce(app.my_role(p_org) = any(p_roles), false) $$;
