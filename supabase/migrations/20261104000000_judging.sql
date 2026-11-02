-- InnovationFlow AI, Milestone 7: judges score ideas against the challenge's criteria.
--
-- Who can do what:
--   * The challenge OWNER invites judges by email (table challenge_judges) and sees every
--     judge's scores.
--   * A JUDGE is a signed-in person whose email was invited. They see the ideas and the
--     criteria of that challenge and can score them. They see only their OWN scores.
--   * Nobody touches the scores table directly. It has no table rights at all: everything goes
--     through the functions below, which check who is asking.

-- Invited judges -------------------------------------------------------------------------
create table public.challenge_judges (
  id           uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  email        text not null check (email = lower(email) and char_length(email) between 5 and 254),
  created_at   timestamptz not null default now(),
  unique (challenge_id, email)
);

alter table public.challenge_judges enable row level security;
grant select, insert, delete on public.challenge_judges to authenticated;

create policy "Owners manage judges of their challenges"
  on public.challenge_judges
  for all
  to authenticated
  using (exists (
    select 1 from public.challenges c
    where c.id = challenge_judges.challenge_id and c.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.challenges c
    where c.id = challenge_judges.challenge_id and c.owner_id = (select auth.uid())
  ));

-- Scores: one number per judge, idea and criterion --------------------------------------
create table public.idea_scores (
  idea_id      uuid not null references public.ideas (id) on delete cascade,
  criterion_id uuid not null references public.judging_criteria (id) on delete cascade,
  judge_id     uuid not null,
  score        integer not null check (score between 0 and 10),
  updated_at   timestamptz not null default now(),
  primary key (idea_id, criterion_id, judge_id)
);

alter table public.idea_scores enable row level security;
-- No policies and no grants: only the security-definer functions below can read or write.

-- Is the signed-in person the owner or an invited judge of this challenge? -----------------
create or replace function public.judging_role(p_challenge_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (select 1 from public.challenges c
                 where c.id = p_challenge_id and c.owner_id = auth.uid()) then 'owner'
    when exists (select 1 from public.challenge_judges j
                 where j.challenge_id = p_challenge_id
                   and j.email = lower(coalesce(auth.jwt() ->> 'email', ''))) then 'judge'
    else null
  end;
$$;

revoke all on function public.judging_role(uuid) from public;
grant execute on function public.judging_role(uuid) to authenticated;

-- Everything the judging page needs, in one call ------------------------------------------
-- Owners get every judge's scores, judges get only their own.
create or replace function public.get_judging(p_challenge_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role text := public.judging_role(p_challenge_id);
begin
  if v_role is null then
    return null;
  end if;

  return (
    select jsonb_build_object(
      'role', v_role,
      'challenge', jsonb_build_object('id', c.id, 'title', c.title, 'status', c.status),
      'criteria', coalesce((
        select jsonb_agg(jsonb_build_object('id', k.id, 'name', k.name, 'description', k.description, 'weight', k.weight)
                         order by k.position)
        from public.judging_criteria k where k.challenge_id = c.id), '[]'::jsonb),
      'ideas', coalesce((
        select jsonb_agg(jsonb_build_object('id', i.id, 'submitter_name', i.submitter_name, 'title', i.title,
                                            'description', i.description, 'created_at', i.created_at)
                         order by i.created_at)
        from public.ideas i where i.challenge_id = c.id), '[]'::jsonb),
      'scores', coalesce((
        select jsonb_agg(jsonb_build_object('idea_id', s.idea_id, 'criterion_id', s.criterion_id,
                                            'judge_id', s.judge_id, 'score', s.score))
        from public.idea_scores s
        join public.ideas i on i.id = s.idea_id
        where i.challenge_id = c.id and (v_role = 'owner' or s.judge_id = auth.uid())), '[]'::jsonb),
      'judges', case when v_role = 'owner' then coalesce((
        select jsonb_agg(jsonb_build_object('id', j.id, 'email', j.email) order by j.created_at)
        from public.challenge_judges j where j.challenge_id = c.id), '[]'::jsonb)
        else '[]'::jsonb end
    )
    from public.challenges c where c.id = p_challenge_id
  );
end;
$$;

revoke all on function public.get_judging(uuid) from public;
grant execute on function public.get_judging(uuid) to authenticated;

-- Save one judge's scores for one idea ----------------------------------------------------
-- p_scores looks like {"<criterion id>": 7, ...}. Returns ok | forbidden | invalid.
create or replace function public.save_scores(p_idea_id uuid, p_scores jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_challenge uuid;
  v_key text;
  v_val jsonb;
  v_n integer;
begin
  select challenge_id into v_challenge from public.ideas where id = p_idea_id;
  if v_challenge is null or public.judging_role(v_challenge) is null then
    return 'forbidden';
  end if;
  if p_scores is null or jsonb_typeof(p_scores) <> 'object' then
    return 'invalid';
  end if;

  for v_key, v_val in select * from jsonb_each(p_scores) loop
    if jsonb_typeof(v_val) <> 'number' or (v_val #>> '{}') !~ '^[0-9]+$' then
      return 'invalid';
    end if;
    v_n := (v_val #>> '{}')::integer;
    if v_n not between 0 and 10 then
      return 'invalid';
    end if;
    if not exists (select 1 from public.judging_criteria k
                   where k.id::text = v_key and k.challenge_id = v_challenge) then
      return 'invalid';
    end if;
  end loop;

  insert into public.idea_scores (idea_id, criterion_id, judge_id, score)
  select p_idea_id, e.key::uuid, auth.uid(), (e.value #>> '{}')::integer
  from jsonb_each(p_scores) e
  on conflict (idea_id, criterion_id, judge_id)
  do update set score = excluded.score, updated_at = now();

  return 'ok';
end;
$$;

revoke all on function public.save_scores(uuid, jsonb) from public;
grant execute on function public.save_scores(uuid, jsonb) to authenticated;

-- Challenges where I am an invited judge (for my dashboard) --------------------------------
create or replace function public.my_judging_challenges()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'title', c.title, 'deadline', c.deadline)
                            order by c.created_at desc), '[]'::jsonb)
  from public.challenges c
  join public.challenge_judges j on j.challenge_id = c.id
  where j.email = lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

revoke all on function public.my_judging_challenges() from public;
grant execute on function public.my_judging_challenges() to authenticated;

notify pgrst, 'reload schema';
