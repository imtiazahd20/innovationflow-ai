-- Test for the activity log and notifications. Safe to run on the live database: it ends with
-- an error ON PURPOSE so everything it created is rolled back.
--   "ACTIVITY TEST PASSED ..."  every check held.
--   "ACTIVITY TEST FAILED: ..." the message says which check broke.
--
-- Cast: A admin, C organiser (joins by invitation), M mentor, B outsider in another workspace.

do $$
declare
  a uuid := gen_random_uuid();  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();  m uuid := gen_random_uuid();
  org_a uuid;  org_b uuid;  chal uuid;  n integer;  t text;  checks integer := 0;
begin
  insert into auth.users (id, aud, role, email) values
    (a, 'authenticated', 'authenticated', 'act-test-a@example.invalid'),
    (b, 'authenticated', 'authenticated', 'act-test-b@example.invalid'),
    (c, 'authenticated', 'authenticated', 'act-test-c@example.invalid'),
    (m, 'authenticated', 'authenticated', 'act-test-m@example.invalid');

  set local role authenticated;

  -- A creates a workspace, a challenge, and invites C (organiser) and M (mentor).
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'email', 'act-test-a@example.invalid')::text, true);
  org_a := public.ensure_workspace();
  insert into public.challenges (title, business_problem, objectives, target_participants, deadline)
  values ('Quieter offices', 'Open-plan floors are too noisy.', 'Fewer complaints', 'Everyone', current_date + 30)
  returning id into chal;
  insert into public.organization_invites (organization_id, email, role) values
    (org_a, 'act-test-c@example.invalid', 'organiser'),
    (org_a, 'act-test-m@example.invalid', 'mentor'),
    (org_a, 'nobody@example.invalid', 'judge');
  delete from public.organization_invites where email = 'nobody@example.invalid';
  update public.challenges set status = 'published' where id = chal;
  update public.challenges set brief = 'THE PROBLEM' where id = chal;

  select count(*) into n from public.activity_logs where organization_id = org_a and action = 'challenge.created' and actor_id = a;
  if n <> 1 then raise exception 'ACTIVITY TEST FAILED: challenge creation not logged with its author'; end if;
  select count(*) into n from public.activity_logs where organization_id = org_a and action in ('challenge.published', 'plan.updated');
  if n <> 2 then raise exception 'ACTIVITY TEST FAILED: publish / plan update not logged (got %)', n; end if;
  select count(*) into n from public.activity_logs where organization_id = org_a and action = 'invite.sent';
  if n <> 3 then raise exception 'ACTIVITY TEST FAILED: expected 3 invitations logged, got %', n; end if;
  select count(*) into n from public.activity_logs where organization_id = org_a and action = 'invite.cancelled';
  if n <> 1 then raise exception 'ACTIVITY TEST FAILED: cancelled invitation not logged once (got %)', n; end if;
  checks := checks + 4;

  -- C and M accept: logged as joins, not as cancellations; A is notified about each.
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'email', 'act-test-c@example.invalid')::text, true);
  perform public.accept_org_invites();
  perform set_config('request.jwt.claims', json_build_object('sub', m, 'email', 'act-test-m@example.invalid')::text, true);
  perform public.accept_org_invites();

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'email', 'act-test-a@example.invalid')::text, true);
  select count(*) into n from public.activity_logs where organization_id = org_a and action = 'invite.cancelled';
  if n <> 1 then raise exception 'ACTIVITY TEST FAILED: accepted invitations were logged as cancelled'; end if;
  select count(*) into n from public.activity_logs where organization_id = org_a and action = 'member.joined';
  if n <> 3 then raise exception 'ACTIVITY TEST FAILED: expected 3 joins (A, C, M), got %', n; end if;
  select count(*) into n from public.notifications where kind = 'member.joined';
  if n <> 2 then raise exception 'ACTIVITY TEST FAILED: admin A should have 2 join notifications, got %', n; end if;
  checks := checks + 3;

  -- A visitor submits an idea: logged, and admin + organiser are notified; the mentor is not.
  reset role;
  perform set_config('request.jwt.claims', '', true);
  insert into public.ideas (challenge_id, submitter_name, submitter_email, title, description)
  values (chal, 'Sam Visitor', 'sam@example.invalid', 'Phone booths', 'Small booths for calls so open areas stay quiet.');
  select count(*) into n from public.activity_logs where organization_id = org_a and action = 'idea.received' and actor_label = 'Sam Visitor';
  if n <> 1 then raise exception 'ACTIVITY TEST FAILED: new idea not logged'; end if;
  select count(*) into n from public.notifications where kind = 'idea.received' and user_id in (a, c);
  if n <> 2 then raise exception 'ACTIVITY TEST FAILED: admin and organiser should both be told about the idea, got %', n; end if;
  select count(*) into n from public.notifications where kind = 'idea.received' and user_id = m;
  if n <> 0 then raise exception 'ACTIVITY TEST FAILED: the mentor was notified about an idea'; end if;
  checks := checks + 3;
  set local role authenticated;

  -- Who can read what.
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'email', 'act-test-c@example.invalid')::text, true);
  select count(*) into n from public.activity_logs where organization_id = org_a;
  if n = 0 then raise exception 'ACTIVITY TEST FAILED: organiser C cannot read the activity log'; end if;
  select count(*) into n from public.notifications;
  if n <> 1 then raise exception 'ACTIVITY TEST FAILED: C should see only their own 1 notification, saw %', n; end if;
  update public.notifications set read_at = now();
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'ACTIVITY TEST FAILED: C could not mark their notification as read'; end if;
  checks := checks + 3;

  begin
    update public.notifications set title = 'changed' where user_id = c;
    raise exception 'ACTIVITY TEST FAILED: a notification title could be changed';
  exception when insufficient_privilege then checks := checks + 1;
  end;

  begin
    insert into public.activity_logs (organization_id, action, summary) values (org_a, 'fake', 'Faked entry');
    raise exception 'ACTIVITY TEST FAILED: the activity log accepted a hand-written entry';
  exception when insufficient_privilege then checks := checks + 1;
  end;

  begin
    insert into public.notifications (user_id, kind, title) values (a, 'fake', 'Faked');
    raise exception 'ACTIVITY TEST FAILED: a notification could be created by hand';
  exception when insufficient_privilege then checks := checks + 1;
  end;

  perform set_config('request.jwt.claims', json_build_object('sub', m, 'email', 'act-test-m@example.invalid')::text, true);
  select count(*) into n from public.activity_logs;
  if n <> 0 then raise exception 'ACTIVITY TEST FAILED: mentor M can read the activity log'; end if;
  checks := checks + 1;

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'email', 'act-test-b@example.invalid')::text, true);
  org_b := public.ensure_workspace();
  select count(*) into n from public.activity_logs where organization_id = org_a;
  if n <> 0 then raise exception 'ACTIVITY TEST FAILED: outsider B can read A''s activity'; end if;
  select count(*) into n from public.notifications where user_id <> b;
  if n <> 0 then raise exception 'ACTIVITY TEST FAILED: outsider B can read other people''s notifications'; end if;
  delete from public.notifications where user_id = a;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'ACTIVITY TEST FAILED: B deleted A''s notifications'; end if;
  checks := checks + 3;

  -- Deleting the challenge is logged once; its ideas going with it are not logged separately.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'email', 'act-test-a@example.invalid')::text, true);
  delete from public.challenges where id = chal;
  select count(*) into n from public.activity_logs where organization_id = org_a and action = 'challenge.deleted';
  if n <> 1 then raise exception 'ACTIVITY TEST FAILED: challenge deletion not logged once'; end if;
  select count(*) into n from public.activity_logs where organization_id = org_a and action = 'idea.deleted';
  if n <> 0 then raise exception 'ACTIVITY TEST FAILED: cascaded idea deletions were logged one by one'; end if;
  checks := checks + 2;

  -- Visitors see nothing.
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  begin
    select count(*) into n from public.notifications;
    raise exception 'ACTIVITY TEST FAILED: visitors can read notifications';
  exception when insufficient_privilege then checks := checks + 1;
  end;

  raise exception 'ACTIVITY TEST PASSED: all % checks held. Test data was rolled back.', checks;
end;
$$;
