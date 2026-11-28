-- Team pages show members' email addresses; auth.users is private, so keep a copy on the profile.
alter table public.profiles add column if not exists email text;

create or replace function app.upsert_profile(p_full_name text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id, full_name, email)
  values (auth.uid(), coalesce(nullif(trim(p_full_name), ''), coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', '')), lower(auth.jwt() ->> 'email'))
  on conflict (user_id) do update
    set email = excluded.email,
        full_name = case when public.profiles.full_name = '' then excluded.full_name else public.profiles.full_name end;
end $$;

create or replace function public.create_organisation(p_name text, p_type public.org_type, p_full_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_org uuid; v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then raise exception 'Set up two-step sign-in first'; end if;
  if (select count(*) from public.memberships where user_id = v_uid and role = 'owner') >= 5 then
    raise exception 'You already own the maximum number of organisations';
  end if;
  insert into public.organisations (name, type, created_by) values (trim(p_name), p_type, v_uid) returning id into v_org;
  insert into public.memberships (org_id, user_id, role, two_factor_required) values (v_org, v_uid, 'owner', true);
  perform app.upsert_profile(p_full_name);
  return v_org;
end $$;

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
  values (v_inv.org_id, auth.uid(), v_inv.role, v_inv.property_scope, v_inv.owner_id, v_inv.role = 'manager')
  on conflict (org_id, user_id) do nothing;
  update public.invitations set accepted_at = now(), accepted_by = auth.uid() where id = v_inv.id;
  perform app.upsert_profile('');
  return v_inv.org_id;
end $$;
grant execute on function app.upsert_profile(text) to authenticated;
