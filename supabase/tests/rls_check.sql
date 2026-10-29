-- Security test for the challenge tables. Run it in the Supabase SQL editor.
--
-- It creates two pretend users, A and B, then checks from B's point of view that A's data
-- is invisible and untouchable. Everything happens inside one statement that ENDS WITH AN
-- ERROR ON PURPOSE, which makes the database undo all of it: no test data is left behind.
--
-- How to read the result:
--   "RLS TEST PASSED ..."  every check held.
--   "RLS TEST FAILED: ..." the message says which check broke.
-- (Both appear as an error message because the error is what rolls the test data back.)

do $$
declare
  user_a   uuid := gen_random_uuid();
  user_b   uuid := gen_random_uuid();
  chal_a   uuid;
  n        integer;
  checks   integer := 0;
begin
  -- Two pretend users (needs no real emails, and is rolled back).
  insert into auth.users (id, aud, role, email)
  values (user_a, 'authenticated', 'authenticated', 'rls-test-a@example.invalid'),
         (user_b, 'authenticated', 'authenticated', 'rls-test-b@example.invalid');

  -- ---- Act as user A ---------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', user_a, 'role', 'authenticated')::text, true);
  set local role authenticated;

  insert into public.challenges (title, business_problem, objectives, target_participants, deadline)
  values ('Reduce delivery delays', 'Late deliveries are costing us customers.', 'Cut delays by 20%', 'Operations staff', current_date + 30)
  returning id into chal_a;

  insert into public.judging_criteria (challenge_id, name, weight) values (chal_a, 'Impact', 100);
  insert into public.timeline_phases (challenge_id, name, starts_on, ends_on)
  values (chal_a, 'Submissions open', current_date, current_date + 7);

  select count(*) into n from public.challenges;
  if n <> 1 then raise exception 'RLS TEST FAILED: owner A should see exactly 1 challenge, saw %', n; end if;
  checks := checks + 1;

  -- owner_id was filled in automatically with A.
  select count(*) into n from public.challenges where owner_id = user_a;
  if n <> 1 then raise exception 'RLS TEST FAILED: owner_id was not set to the signed-in user'; end if;
  checks := checks + 1;

  -- ---- Act as user B ---------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', user_b, 'role', 'authenticated')::text, true);

  select count(*) into n from public.challenges;
  if n <> 0 then raise exception 'RLS TEST FAILED: user B can see % of A''s challenges', n; end if;
  checks := checks + 1;

  select count(*) into n from public.judging_criteria;
  if n <> 0 then raise exception 'RLS TEST FAILED: user B can see A''s judging criteria'; end if;
  checks := checks + 1;

  select count(*) into n from public.timeline_phases;
  if n <> 0 then raise exception 'RLS TEST FAILED: user B can see A''s timeline'; end if;
  checks := checks + 1;

  update public.challenges set title = 'hacked' where id = chal_a;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'RLS TEST FAILED: user B changed A''s challenge'; end if;
  checks := checks + 1;

  delete from public.challenges where id = chal_a;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'RLS TEST FAILED: user B deleted A''s challenge'; end if;
  checks := checks + 1;

  -- B must not be able to hang criteria on A's challenge...
  begin
    insert into public.judging_criteria (challenge_id, name, weight) values (chal_a, 'Sneaky', 10);
    raise exception 'RLS TEST FAILED: user B added criteria to A''s challenge';
  exception when insufficient_privilege then
    checks := checks + 1;  -- row-level security refused it, as intended
  end;

  -- ...or create a challenge in A's name.
  begin
    insert into public.challenges (owner_id, title, business_problem, objectives, target_participants, deadline)
    values (user_a, 'Forged', 'Pretending to be user A here.', 'None', 'None', current_date + 1);
    raise exception 'RLS TEST FAILED: user B created a challenge owned by A';
  exception when insufficient_privilege then
    checks := checks + 1;
  end;

  -- ---- Signed-out visitors ("anon") ------------------------------------------------
  reset role;
  set local role anon;
  begin
    perform count(*) from public.challenges;
    raise exception 'RLS TEST FAILED: signed-out visitors can read challenges';
  exception when insufficient_privilege then
    checks := checks + 1;
  end;

  -- ---- Back as user A: their data is still there and untouched ---------------------
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', user_a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.challenges where id = chal_a and title = 'Reduce delivery delays';
  if n <> 1 then raise exception 'RLS TEST FAILED: A''s challenge was altered or lost'; end if;
  checks := checks + 1;

  -- Deleting the challenge removes its criteria and timeline too.
  delete from public.challenges where id = chal_a;
  reset role;
  select count(*) into n from public.judging_criteria where challenge_id = chal_a;
  if n <> 0 then raise exception 'RLS TEST FAILED: criteria were left behind after deleting the challenge'; end if;
  select count(*) into n from public.timeline_phases where challenge_id = chal_a;
  if n <> 0 then raise exception 'RLS TEST FAILED: timeline was left behind after deleting the challenge'; end if;
  checks := checks + 1;

  -- Raising an error here undoes everything above, including the pretend users.
  raise exception 'RLS TEST PASSED: all % checks held. Test data was rolled back.', checks;
end;
$$;
