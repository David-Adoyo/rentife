-- Stage 5 fix: a charge is "waived" only when waivers/write-offs settled ALL of it. If any part was paid
-- or covered by a credit note, it is "paid" (found by the billing RLS suite: part waiver + credit note).
create or replace function app.refresh_charge_status(p_charge uuid) returns void
language sql security definer set search_path = '' as $$
  update public.charges c set status = case
      when cb.outstanding <= 0 and not exists (
             select 1 from public.allocations al join public.ledger_entries le on le.id = al.ledger_entry_id
             where al.charge_id = c.id and le.kind not in ('waiver', 'write_off'))
        then 'waived'
      when cb.outstanding <= 0 then 'paid'
      when cb.allocated > 0 then 'part_paid'
      else 'open' end
  from public.charge_balances cb where cb.id = c.id and c.id = p_charge
$$;
