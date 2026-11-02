-- InnovationFlow AI, Milestone 5: share a published challenge through a read-only link.
--
-- Why a function and not a public table policy?
-- A public SELECT policy would let anyone with the site's public key LIST every published
-- challenge. This function does something narrower: you must already know a challenge's id
-- (the link), and it only answers for challenges whose status is 'published'. It returns
-- only the fields meant for readers (never owner_id, never drafts).
--
-- "security definer" = the function runs with its creator's rights, so it can read rows that
-- the anonymous visitor's own rights can't. That is safe here because the function itself
-- decides exactly what to return.

create or replace function public.get_public_challenge(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', c.id,
    'title', c.title,
    'business_problem', c.business_problem,
    'objectives', c.objectives,
    'target_participants', c.target_participants,
    'deadline', c.deadline,
    'brief', c.brief,
    'criteria', coalesce((
      select jsonb_agg(jsonb_build_object('name', k.name, 'description', k.description, 'weight', k.weight)
                       order by k.position)
      from public.judging_criteria k where k.challenge_id = c.id
    ), '[]'::jsonb),
    'phases', coalesce((
      select jsonb_agg(jsonb_build_object('name', p.name, 'description', p.description,
                                          'starts_on', p.starts_on, 'ends_on', p.ends_on)
                       order by p.position)
      from public.timeline_phases p where p.challenge_id = c.id
    ), '[]'::jsonb)
  )
  from public.challenges c
  where c.id = p_id and c.status = 'published';
$$;

revoke all on function public.get_public_challenge(uuid) from public;
grant execute on function public.get_public_challenge(uuid) to anon, authenticated;
