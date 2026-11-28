-- Stage 5: sentence-case labels on statements ("Credit note: …", "Write-off: …"), UK style.
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
          (case p_kind when 'credit_note' then 'Credit note' when 'waiver' then 'Waiver' else 'Write-off' end) || ': ' || trim(p_reason), (now() at time zone 'Africa/Nairobi')::date)
  returning id into v_entry;
  if p_kind in ('waiver', 'write_off') then
    insert into public.allocations (org_id, ledger_entry_id, charge_id, amount) values (v_t.org_id, v_entry, p_charge, p_amount);
    perform app.refresh_charge_status(p_charge);
  else
    perform app.apply_credits(p_tenancy);
  end if;
  return v_adj;
end $$;
