-- Stage 5: one row per invoice with its total and what is still owed (read-only, RLS of the caller).
create or replace view public.invoice_summary with (security_invoker = true) as
  select i.id, i.org_id, i.tenancy_id, i.period, i.number, i.issued_on,
         min(cb.due_date) as due_date,
         sum(cb.amount)::bigint as total,
         sum(cb.outstanding)::bigint as outstanding,
         count(*)::int as lines
  from public.invoices i
  join public.invoice_lines il on il.invoice_id = i.id
  join public.charge_balances cb on cb.id = il.charge_id
  group by i.id;
revoke all on public.invoice_summary from anon, public;
grant select on public.invoice_summary to authenticated;
