-- The daily billing run (Vercel Cron → /api/cron/billing) connects as rentife_billing.
-- It reads what billing needs and posts only through post_charges(); it cannot read tenants' personal details.
-- create role rentife_billing login password '<generated, stored only in Vercel as DATABASE_BILLING_URL>' noinherit;
grant usage on schema public, app to rentife_billing;
grant select on public.organisations, public.properties, public.units, public.tenancies, public.recurring_charges,
               public.rent_reviews, public.charge_types to rentife_billing;
do $$
declare t text;
begin
  foreach t in array array['organisations', 'properties', 'units', 'tenancies', 'recurring_charges', 'rent_reviews', 'charge_types'] loop
    execute format('drop policy if exists billing_read on public.%I', t);
    execute format('create policy billing_read on public.%I for select to rentife_billing using (true)', t);
  end loop;
end $$;
grant execute on function public.post_charges(uuid, date, text, jsonb) to rentife_billing;
