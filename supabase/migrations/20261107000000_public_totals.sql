-- Every idea's TOTAL score is visible to everyone who can see the idea: the owner, the judges and
-- the people who submitted ideas. Individual judges' scores stay private (owner sees them all,
-- a judge sees only their own); only the combined total, the number of judges and the rank are shared.
--
-- Total = for each judge, the weighted average of their scores (0-10) once they have scored EVERY
-- criterion; then the average of those judge totals, rounded to one decimal. Ideas nobody has fully
-- scored have no total yet. Equal totals share a rank (1, 2, 2, 4).

-- Internal helper: not callable from the app, only from the two functions below.
create or replace function public.idea_totals(p_challenge_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with weights as (
    select count(*) as n, sum(weight) as w from public.judging_criteria where challenge_id = p_challenge_id
  ),
  per_judge as (
    select s.idea_id, s.judge_id,
           sum(s.score * k.weight)::numeric / nullif((select w from weights), 0) as total
    from public.idea_scores s
    join public.ideas i on i.id = s.idea_id and i.challenge_id = p_challenge_id
    join public.judging_criteria k on k.id = s.criterion_id and k.challenge_id = p_challenge_id
    group by s.idea_id, s.judge_id
    having count(*) = (select n from weights) and (select n from weights) > 0
  ),
  per_idea as (
    select idea_id, round(avg(total), 1) as average, count(*) as judges_scored
    from per_judge where total is not null group by idea_id
  ),
  ranked as (
    select idea_id, average, judges_scored, rank() over (order by average desc) as rnk from per_idea
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'idea_id', idea_id, 'average', average, 'judges_scored', judges_scored, 'rank', rnk)), '[]'::jsonb)
  from ranked;
$$;

revoke all on function public.idea_totals(uuid) from public;

-- Judging page: now also returns the totals for owner AND judges --------------------------------
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
      'totals', public.idea_totals(c.id),
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

-- Discussion: every idea now carries its total, number of judges and rank ------------------------
create or replace function public.get_discussion(p_challenge_id uuid, p_token uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_viewer jsonb := public.discussion_viewer(p_challenge_id, p_token);
  v_totals jsonb := public.idea_totals(p_challenge_id);
begin
  if v_viewer is null then
    return null;
  end if;

  return (
    select jsonb_build_object(
      'viewer', v_viewer,
      'challenge', jsonb_build_object('id', c.id, 'title', c.title, 'status', c.status, 'deadline', c.deadline),
      'ideas', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', i.id,
          'submitter_name', i.submitter_name,
          'title', i.title,
          'description', i.description,
          'created_at', i.created_at,
          'average', (select t -> 'average' from jsonb_array_elements(v_totals) t where t ->> 'idea_id' = i.id::text),
          'judges_scored', (select t -> 'judges_scored' from jsonb_array_elements(v_totals) t where t ->> 'idea_id' = i.id::text),
          'rank', (select t -> 'rank' from jsonb_array_elements(v_totals) t where t ->> 'idea_id' = i.id::text),
          'comments', coalesce((
            select jsonb_agg(jsonb_build_object(
              'id', m.id, 'author_role', m.author_role, 'author_name', m.author_name,
              'body', m.body, 'attachments', m.attachments, 'created_at', m.created_at)
              order by m.created_at)
            from public.idea_comments m where m.idea_id = i.id), '[]'::jsonb))
          order by i.created_at)
        from public.ideas i where i.challenge_id = c.id), '[]'::jsonb)
    )
    from public.challenges c where c.id = p_challenge_id
  );
end;
$$;

revoke all on function public.get_discussion(uuid, uuid) from public;
grant execute on function public.get_discussion(uuid, uuid) to anon, authenticated;

notify pgrst, 'reload schema';
