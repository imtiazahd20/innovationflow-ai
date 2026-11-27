-- Security test for organisations and roles. Run it in the Supabase SQL editor (or the local
-- test harness). Like rls_check.sql, it creates pretend people and data, checks who can see and
-- do what, then ENDS WITH AN ERROR ON PURPOSE so everything is rolled back.
--
--   "ORG TEST PASSED ..."  every check held.
--   "ORG TEST FAILED: ..." the message says which check broke.
--
-- The cast:
--   A  admin of workspace A          B  admin of workspace B (an outsider to A)
--   C  invited to A as organiser     D  invited to A as mentor (no challenge rights)
--   J  invited as a judge of one of A's challenges by email (not an A member)

do $$
declare
  a uuid := gen_random_uuid();  b uuid := gen_random_uuid();  c uuid := gen_random_uuid();
  d uuid := gen_random_uuid();  j uuid := gen_random_uuid();
  org_a uuid;  org_b uuid;  org_c uuid;
  chal_a uuid;  chal_b uuid;  chal_c uuid;  idea_a uuid;  comment_a uuid;
  n integer;  t text;  checks integer := 0;
  ok boolean;
begin
  insert into auth.users (id, aud, role, email) values
    (a, 'authenticated', 'authenticated', 'org-test-a@example.invalid'),
    (b, 'authenticated', 'authenticated', 'org-test-b@example.invalid'),
    (c, 'authenticated', 'authenticated', 'org-test-c@example.invalid'),
    (d, 'authenticated', 'authenticated', 'org-test-d@example.invalid'),
    (j, 'authenticated', 'authenticated', 'org-test-j@example.invalid');

  set local role authenticated;

  -- ---- A: gets a workspace and creates a challenge ----------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated', 'email', 'org-test-a@example.invalid')::text, true);
  org_a := public.ensure_workspace();
  if public.ensure_workspace() <> org_a then raise exception 'ORG TEST FAILED: ensure_workspace is not stable'; end if;
  checks := checks + 1;

  select count(*) into n from public.organization_members where organization_id = org_a and user_id = a and role = 'admin';
  if n <> 1 then raise exception 'ORG TEST FAILED: A is not admin of their new workspace'; end if;
  checks := checks + 1;

  -- No organisation given: the trigger files it in A's workspace.
  insert into public.challenges (title, business_problem, objectives, target_participants, deadline)
  values ('Cut energy use', 'Our buildings waste a lot of energy.', 'Use 15% less', 'Facilities team', current_date + 30)
  returning id, organization_id into chal_a, org_c;
  if org_c <> org_a then raise exception 'ORG TEST FAILED: challenge was not filed in A''s workspace'; end if;
  checks := checks + 1;

  insert into public.judging_criteria (challenge_id, name, weight) values (chal_a, 'Impact', 100);
  insert into public.challenge_judges (challenge_id, email) values (chal_a, 'org-test-j@example.invalid');
  -- Ideas and comments arrive through functions in real life; insert directly as the test owner.
  reset role;
  insert into public.ideas (challenge_id, submitter_name, submitter_email, title, description)
  values (chal_a, 'Sam', 'sam@example.invalid', 'Motion sensors', 'Turn lights off in empty rooms automatically.')
  returning id into idea_a;
  insert into public.idea_comments (idea_id, author_role, author_name, body)
  values (idea_a, 'submitter', 'Sam', 'Happy to share costs.') returning id into comment_a;
  set local role authenticated;

  insert into public.organization_invites (organization_id, email, role) values
    (org_a, 'org-test-c@example.invalid', 'organiser'),
    (org_a, 'org-test-d@example.invalid', 'mentor');

  -- ---- B: a separate workspace; sees nothing of A ------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated', 'email', 'org-test-b@example.invalid')::text, true);
  org_b := public.ensure_workspace();
  insert into public.challenges (title, business_problem, objectives, target_participants, deadline, organization_id)
  values ('Faster invoicing', 'Invoices take two weeks to go out.', 'Same-day invoices', 'Finance', current_date + 20, org_b)
  returning id into chal_b;

  select count(*) into n from public.challenges;
  if n <> 1 then raise exception 'ORG TEST FAILED: B should see only their own challenge, saw %', n; end if;
  select count(*) into n from public.organizations where id = org_a;
  if n <> 0 then raise exception 'ORG TEST FAILED: B can see A''s organisation'; end if;
  select count(*) into n from public.organization_members where organization_id = org_a;
  if n <> 0 then raise exception 'ORG TEST FAILED: B can see A''s members'; end if;
  select count(*) into n from public.organization_invites;
  if n <> 0 then raise exception 'ORG TEST FAILED: B can see A''s invitations'; end if;
  select count(*) into n from public.ideas;
  if n <> 0 then raise exception 'ORG TEST FAILED: B can see A''s ideas'; end if;
  checks := checks + 5;

  begin
    insert into public.challenges (title, business_problem, objectives, target_participants, deadline, organization_id)
    values ('Sneaky', 'Trying to write into A.', 'Nope', 'Nobody', current_date + 5, org_a);
    raise exception 'ORG TEST FAILED: B created a challenge in A''s workspace';
  exception when insufficient_privilege then checks := checks + 1;
  end;

  begin
    insert into public.organization_invites (organization_id, email, role) values (org_a, 'b2@example.invalid', 'admin');
    raise exception 'ORG TEST FAILED: B invited someone into A''s workspace';
  exception when insufficient_privilege then checks := checks + 1;
  end;

  update public.organizations set name = 'Hijacked' where id = org_a;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'ORG TEST FAILED: B renamed A''s workspace'; end if;
  checks := checks + 1;

  if public.remove_org_member(org_a, a, 'admin') <> 'forbidden' then
    raise exception 'ORG TEST FAILED: B could remove A''s admin';
  end if;
  checks := checks + 1;

  if public.judging_role(chal_a) is not null then raise exception 'ORG TEST FAILED: B has a judging role on A''s challenge'; end if;
  if public.delete_comment(comment_a) <> 'forbidden' then raise exception 'ORG TEST FAILED: B deleted a comment on A''s idea'; end if;
  checks := checks + 2;

  -- ---- A cannot move a challenge into B's workspace ----------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated', 'email', 'org-test-a@example.invalid')::text, true);
  begin
    update public.challenges set organization_id = org_b where id = chal_a;
    raise exception 'ORG TEST FAILED: A moved a challenge into B''s workspace';
  exception when insufficient_privilege then checks := checks + 1;
  end;

  -- ---- C accepts an organiser invitation and can manage A's challenges --------------------
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated', 'email', 'ORG-TEST-C@example.invalid')::text, true);
  select count(*) into n from public.challenges;
  if n <> 0 then raise exception 'ORG TEST FAILED: C sees challenges before accepting'; end if;
  if public.accept_org_invites() <> 1 then raise exception 'ORG TEST FAILED: C''s invitation was not accepted'; end if;
  select count(*) into n from public.challenges where id = chal_a;
  if n <> 1 then raise exception 'ORG TEST FAILED: organiser C cannot see A''s challenge'; end if;
  checks := checks + 3;

  update public.challenges set title = 'Cut energy use by 15%' where id = chal_a;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'ORG TEST FAILED: organiser C cannot edit the challenge'; end if;
  select count(*) into n from public.ideas where challenge_id = chal_a;
  if n <> 1 then raise exception 'ORG TEST FAILED: organiser C cannot read ideas'; end if;
  if public.judging_role(chal_a) <> 'owner' then raise exception 'ORG TEST FAILED: organiser C has no manager role in judging'; end if;
  checks := checks + 3;

  insert into public.challenges (title, business_problem, objectives, target_participants, deadline, organization_id)
  values ('Greener commuting', 'Most staff drive alone to work.', 'Halve solo drives', 'Everyone', current_date + 40, org_a)
  returning id into chal_c;
  select owner_id = c into ok from public.challenges where id = chal_c;
  if not ok then raise exception 'ORG TEST FAILED: new challenge not recorded as created by C'; end if;
  checks := checks + 1;

  begin
    insert into public.challenges (title, business_problem, objectives, target_participants, deadline, organization_id, owner_id)
    values ('Impersonation', 'Pretending A created this.', 'Nope', 'Nobody', current_date + 5, org_a, a);
    raise exception 'ORG TEST FAILED: C created a challenge in A''s name';
  exception when insufficient_privilege then checks := checks + 1;
  end;

  update public.organizations set name = 'Renamed by organiser' where id = org_a;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'ORG TEST FAILED: organiser C renamed the workspace (admin only)'; end if;
  select count(*) into n from public.organization_invites;
  if n <> 0 then raise exception 'ORG TEST FAILED: organiser C can see invitations (admin only)'; end if;
  checks := checks + 2;

  -- ---- D is a mentor: a member, but no rights over challenges yet -------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', d, 'role', 'authenticated', 'email', 'org-test-d@example.invalid')::text, true);
  perform public.accept_org_invites();
  select count(*) into n from public.organizations where id = org_a;
  if n <> 1 then raise exception 'ORG TEST FAILED: mentor D cannot see their organisation'; end if;
  select count(*) into n from public.challenges;
  if n <> 0 then raise exception 'ORG TEST FAILED: mentor D can see challenges'; end if;
  select count(*) into n from public.ideas;
  if n <> 0 then raise exception 'ORG TEST FAILED: mentor D can see ideas'; end if;
  checks := checks + 3;

  -- ---- J was invited to judge one challenge by email: still works, sees nothing else -------
  perform set_config('request.jwt.claims', json_build_object('sub', j, 'role', 'authenticated', 'email', 'org-test-j@example.invalid')::text, true);
  if public.judging_role(chal_a) is distinct from 'judge' then raise exception 'ORG TEST FAILED: challenge judge J lost access'; end if;
  if public.judging_role(chal_c) is not null then raise exception 'ORG TEST FAILED: judge J has access to another challenge'; end if;
  select count(*) into n from public.challenges;
  if n <> 0 then raise exception 'ORG TEST FAILED: judge J can read the challenges table'; end if;
  checks := checks + 3;

  -- ---- A manages members --------------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated', 'email', 'org-test-a@example.invalid')::text, true);
  if public.remove_org_member(org_a, a, 'admin') <> 'last-admin' then
    raise exception 'ORG TEST FAILED: the last admin could be removed';
  end if;
  checks := checks + 1;

  if public.remove_org_member(org_a, c, 'organiser') <> 'ok' then raise exception 'ORG TEST FAILED: A could not remove organiser C'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated', 'email', 'org-test-c@example.invalid')::text, true);
  select count(*) into n from public.challenges where organization_id = org_a;
  if n <> 0 then raise exception 'ORG TEST FAILED: removed organiser C still sees % challenges', n; end if;
  checks := checks + 2;

  -- ---- Visitors who are not signed in see nothing ------------------------------------------
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  begin
    select count(*) into n from public.organizations;
    raise exception 'ORG TEST FAILED: visitors can read organisations';
  exception when insufficient_privilege then checks := checks + 1;
  end;

  raise exception 'ORG TEST PASSED: all % checks held. Test data was rolled back.', checks;
end;
$$;
