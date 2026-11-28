-- RLS test suite for Stage 3 (masterplan §17: "RLS tests prove isolation between orgs and the
-- caretaker/owner scopes"). Runs in one transaction and rolls back: no data is left behind.
-- Output: one row per check with ok = true/false.
begin;

create temp table results (n serial, check_name text, ok boolean, detail text) on commit drop;
grant all on results to authenticated;
grant usage, select on sequence results_n_seq to authenticated;

create or replace function pg_temp.act(p_uid uuid, p_aal text default 'aal2') returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated', 'aal', p_aal,
    'email', (select email from auth.users where id = p_uid))::text, true);
  execute 'set local role authenticated';
end $$;
create or replace function pg_temp.ok(p_name text, p_ok boolean, p_detail text default null) returns void language sql as $$
  insert into results (check_name, ok, detail) values (p_name, coalesce(p_ok, false), p_detail) $$;

do $$
declare
  alice uuid := gen_random_uuid(); bob uuid := gen_random_uuid(); mgr uuid := gen_random_uuid();
  care uuid := gen_random_uuid(); acc uuid := gen_random_uuid(); po uuid := gen_random_uuid(); newbie uuid := gen_random_uuid();
  org_a uuid; org_b uuid; p1 uuid; p2 uuid; pb uuid; u1 uuid; u2 uuid; ub uuid; t1 uuid; tb uuid; o1 uuid;
  n int; v text; failed boolean; token text := 'test-invite-token';
begin
  insert into auth.users (id, email, aud, role) values
    (alice, 'alice@test.invalid', 'authenticated', 'authenticated'), (bob, 'bob@test.invalid', 'authenticated', 'authenticated'),
    (mgr, 'mgr@test.invalid', 'authenticated', 'authenticated'), (care, 'care@test.invalid', 'authenticated', 'authenticated'),
    (acc, 'acc@test.invalid', 'authenticated', 'authenticated'), (po, 'po@test.invalid', 'authenticated', 'authenticated'),
    (newbie, 'newbie@test.invalid', 'authenticated', 'authenticated');

  -- Alice builds organisation A
  perform pg_temp.act(alice);
  org_a := public.create_organisation('Mwangaza Homes', 'agency', 'Alice Wanjiku');
  insert into public.owners (org_id, full_name) values (org_a, 'Owner One') returning id into o1;
  insert into public.properties (org_id, name, code_prefix) values (org_a, 'Sunrise Court', 'SUN') returning id into p1;
  insert into public.properties (org_id, name, code_prefix, owner_id) values (org_a, 'Acacia Apartments', 'ACA', o1) returning id into p2;
  insert into public.units (org_id, property_id, label, unit_code, rent_amount) values (org_a, p1, 'B4', '', 1500000) returning id into u1;
  insert into public.units (org_id, property_id, label, unit_code, rent_amount) values (org_a, p2, 'B4', '', 2200000) returning id into u2;
  insert into public.tenants (org_id, full_name, phones) values (org_a, 'Wanjiru Kamau', array['+254712345678']) returning id into t1;
  insert into public.tenancies (org_id, unit_id, tenant_id, start_date, rent_amount, due_day) values (org_a, u1, t1, current_date, 1500000, 5);

  -- Bob builds organisation B
  perform pg_temp.act(bob);
  org_b := public.create_organisation('Bob Lettings', 'individual', 'Bob Otieno');
  insert into public.properties (org_id, name, code_prefix) values (org_b, 'Baraka Flats', 'BAR') returning id into pb;
  insert into public.units (org_id, property_id, label, unit_code) values (org_b, pb, 'G1', '') returning id into ub;
  insert into public.tenants (org_id, full_name) values (org_b, 'Bob Tenant') returning id into tb;

  -- Team in org A (added as postgres, as an accepted invitation would)
  execute 'reset role';
  insert into public.memberships (org_id, user_id, role, property_scope, two_factor_required) values (org_a, mgr, 'manager', array[p1], true);
  insert into public.memberships (org_id, user_id, role, property_scope) values (org_a, care, 'caretaker', array[p1]);
  insert into public.memberships (org_id, user_id, role) values (org_a, acc, 'accountant');
  insert into public.memberships (org_id, user_id, role, owner_id) values (org_a, po, 'passive_owner', o1);

  -- ── Unit codes ──
  perform pg_temp.act(alice);
  select unit_code into v from public.units where id = u1;
  perform pg_temp.ok('Unit code generated from prefix + label', v = 'SUN-B4', v);
  select count(*) into n from public.unit_codes where unit_id = u1 and code_norm = 'B4';
  perform pg_temp.ok('Bare label "B4" kept as an alias for the first unit', n = 1);
  select count(*) into n from public.unit_codes where unit_id = u2 and code_norm = 'B4';
  perform pg_temp.ok('Duplicate alias "B4" not given to a second unit (no ambiguous matches)', n = 0);
  select status::text into v from public.units where id = u1;
  perform pg_temp.ok('Active tenancy marks the unit occupied', v = 'occupied', v);

  -- ── Organisation isolation (Bob vs org A) ──
  perform pg_temp.act(bob);
  select count(*) into n from public.organisations where id = org_a;        perform pg_temp.ok('Other org: organisation hidden', n = 0);
  select count(*) into n from public.properties where org_id = org_a;       perform pg_temp.ok('Other org: properties hidden', n = 0);
  select count(*) into n from public.units where org_id = org_a;            perform pg_temp.ok('Other org: units hidden', n = 0);
  select count(*) into n from public.unit_board where org_id = org_a;       perform pg_temp.ok('Other org: unit board hidden', n = 0);
  select count(*) into n from public.tenants where org_id = org_a;          perform pg_temp.ok('Other org: tenants hidden', n = 0);
  select count(*) into n from public.tenancies where org_id = org_a;        perform pg_temp.ok('Other org: tenancies hidden', n = 0);
  select count(*) into n from public.audit_log where org_id = org_a;        perform pg_temp.ok('Other org: audit log hidden', n = 0);
  select count(*) into n from public.memberships where org_id = org_a;      perform pg_temp.ok('Other org: team hidden', n = 0);
  failed := false; begin
    insert into public.units (org_id, property_id, label, unit_code) values (org_a, p1, 'X9', '');
  exception when others then failed := true; end;
  perform pg_temp.ok('Other org: cannot add a unit to someone else''s property', failed);
  failed := false; begin
    insert into public.tenancies (org_id, unit_id, tenant_id, start_date, rent_amount, due_day) values (org_b, ub, t1, current_date, 100, 5);
  exception when others then failed := true; end;
  perform pg_temp.ok('Other org: cannot link own unit to another org''s tenant', failed);
  update public.tenants set full_name = 'Hacked' where id = t1; get diagnostics n = row_count;
  perform pg_temp.ok('Other org: cannot edit another org''s tenant', n = 0);
  failed := false; begin perform public.suggest_prefix(org_a, 'Test'); exception when others then failed := true; end;
  perform pg_temp.ok('Other org: cannot call helper functions on another org', failed);

  -- ── Two-factor enforced in the database ──
  perform pg_temp.act(alice, 'aal1');
  select count(*) into n from public.properties where org_id = org_a;
  perform pg_temp.ok('Owner without two-factor (aal1) sees nothing', n = 0);
  perform pg_temp.act(alice, 'aal2');
  select count(*) into n from public.properties where org_id = org_a;
  perform pg_temp.ok('Owner with two-factor (aal2) sees all properties', n = 2, n::text);

  -- ── Manager scoped to Sunrise Court ──
  perform pg_temp.act(mgr, 'aal1');
  select count(*) into n from public.properties where org_id = org_a;       perform pg_temp.ok('Manager without two-factor sees nothing', n = 0);
  perform pg_temp.act(mgr);
  select count(*) into n from public.properties where org_id = org_a;       perform pg_temp.ok('Scoped manager sees only their property', n = 1, n::text);
  update public.units set rent_amount = 1600000 where id = u1; get diagnostics n = row_count;
  perform pg_temp.ok('Scoped manager can edit a unit in scope', n = 1);
  update public.units set rent_amount = 1 where id = u2; get diagnostics n = row_count;
  perform pg_temp.ok('Scoped manager cannot edit a unit out of scope', n = 0);
  failed := false; begin
    insert into public.properties (org_id, name, code_prefix) values (org_a, 'New Place', 'NEW');
  exception when others then failed := true; end;
  perform pg_temp.ok('Scoped manager cannot create properties', failed);
  select count(*) into n from public.tenants where id = t1;                 perform pg_temp.ok('Scoped manager sees tenants of their property', n = 1);
  select count(*) into n from public.audit_log where org_id = org_a;        perform pg_temp.ok('Manager cannot read the audit log', n = 0);
  failed := false; begin
    insert into public.memberships (org_id, user_id, role) values (org_a, newbie, 'manager');
  exception when others then failed := true; end;
  perform pg_temp.ok('Manager cannot add team members', failed);

  -- ── Caretaker ──
  perform pg_temp.act(care);
  select count(*) into n from public.unit_board where org_id = org_a;       perform pg_temp.ok('Caretaker sees units of their property on the board', n = 1, n::text);
  select count(*) into n from public.unit_board where org_id = org_a and rent_amount is not null;
  perform pg_temp.ok('Caretaker cannot see rent amounts', n = 0);
  select count(*) into n from public.units where org_id = org_a;            perform pg_temp.ok('Caretaker cannot read the units table directly', n = 0);
  select count(*) into n from public.tenants where org_id = org_a;          perform pg_temp.ok('Caretaker cannot see tenant details', n = 0);
  select count(*) into n from public.tenancies where org_id = org_a;        perform pg_temp.ok('Caretaker cannot see tenancies', n = 0);
  update public.units set status = 'vacant' where id = u1; get diagnostics n = row_count;
  perform pg_temp.ok('Caretaker cannot change units', n = 0);

  -- ── Accountant (read-only) ──
  perform pg_temp.act(acc);
  select count(*) into n from public.units where org_id = org_a;            perform pg_temp.ok('Accountant sees all units', n = 2, n::text);
  select count(*) into n from public.tenants where org_id = org_a;          perform pg_temp.ok('Accountant sees tenants', n = 1);
  select count(*) into n from public.unit_board where org_id = org_a and rent_amount is not null;
  perform pg_temp.ok('Accountant sees rent amounts', n = 2);
  update public.tenants set full_name = 'Changed' where id = t1; get diagnostics n = row_count;
  perform pg_temp.ok('Accountant cannot edit tenants', n = 0);
  update public.units set rent_amount = 1 where org_id = org_a; get diagnostics n = row_count;
  perform pg_temp.ok('Accountant cannot edit units', n = 0);

  -- ── Passive (diaspora) owner linked to Acacia only ──
  perform pg_temp.act(po);
  select count(*) into n from public.properties where org_id = org_a;       perform pg_temp.ok('Passive owner sees only their own property', n = 1, n::text);
  select count(*) into n from public.properties where id = p1;              perform pg_temp.ok('Passive owner cannot see other owners'' properties', n = 0);
  select count(*) into n from public.tenancies where org_id = org_a;        perform pg_temp.ok('Passive owner sees no tenancies outside their units', n = 0);
  update public.units set rent_amount = 1 where id = u2; get diagnostics n = row_count;
  perform pg_temp.ok('Passive owner cannot edit (read-only)', n = 0);

  -- ── Data rules ──
  perform pg_temp.act(alice);
  failed := false; begin
    insert into public.tenancies (org_id, unit_id, tenant_id, start_date, rent_amount, due_day) values (org_a, u1, t1, current_date, 1, 5);
  exception when others then failed := true; end;
  perform pg_temp.ok('Only one live tenancy per unit', failed);
  failed := false; begin
    insert into public.tenants (org_id, full_name, phones) values (org_a, 'Bad Phone', array['0712345678']);
  exception when others then failed := true; end;
  perform pg_temp.ok('Phone numbers must be in +254 format', failed);
  failed := false; begin
    delete from public.memberships where org_id = org_a and user_id = alice;
  exception when others then failed := true; end;
  perform pg_temp.ok('The last owner cannot be removed', failed);

  -- ── Audit log ──
  select count(*) into n from public.audit_log where org_id = org_a;
  perform pg_temp.ok('Every change is written to the audit log', n >= 8, n::text || ' entries');
  select count(*) into n from public.audit_log where org_id = org_a and entity = 'units' and action = 'update' and actor = mgr;
  perform pg_temp.ok('Audit log records who made a change', n = 1);
  execute 'reset role';
  failed := false; begin update public.audit_log set action = 'x' where org_id = org_a; exception when others then failed := true; end;
  perform pg_temp.ok('Audit log cannot be edited, even by the database owner', failed);

  -- ── Invitations ──
  insert into public.invitations (org_id, email, role, token_hash, invited_by)
    values (org_a, 'newbie@test.invalid', 'accountant', encode(extensions.digest(token, 'sha256'), 'hex'), alice);
  perform pg_temp.act(bob);
  failed := false; begin perform public.accept_invitation(token); exception when others then failed := true; end;
  perform pg_temp.ok('Invitation cannot be used by a different email address', failed);
  perform pg_temp.act(newbie);
  begin
    perform public.accept_invitation(token);
    select count(*) into n from public.properties where org_id = org_a;
    perform pg_temp.ok('Invited person joins with their role', n = 2, n::text);
  exception when others then perform pg_temp.ok('Invited person joins with their role', false, sqlerrm); end;
  failed := false; begin perform public.accept_invitation(token); exception when others then failed := true; end;
  perform pg_temp.ok('Invitation link works only once', failed);

  -- ── Anonymous visitors ──
  execute 'reset role'; perform set_config('request.jwt.claims', '{"role":"anon"}', true); execute 'set local role anon';
  failed := false; begin select count(*) into n from public.properties; exception when others then failed := true; end;
  execute 'reset role';
  perform pg_temp.ok('Signed-out visitors cannot read any table', failed);
end $$;

select n, check_name, ok, detail from results order by n;
rollback;
