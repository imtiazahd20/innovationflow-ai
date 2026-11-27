-- Undo 20261127000000_organizations.sql: back to "each challenge belongs to its owner".
-- Run in the Supabase SQL editor only if the organisation change has to be reverted.
-- Challenges, ideas, scores and comments are untouched; organisations, memberships and
-- pending invitations are deleted.

begin;

drop policy if exists "Organisers manage their organisation's challenges" on public.challenges;
drop policy if exists "New challenges are created by the signed-in person" on public.challenges;
drop policy if exists "Organisers manage criteria" on public.judging_criteria;
drop policy if exists "Organisers manage timelines" on public.timeline_phases;
drop policy if exists "Organisers read ideas" on public.ideas;
drop policy if exists "Organisers delete ideas" on public.ideas;
drop policy if exists "Organisers manage judges" on public.challenge_judges;

create policy "Owners manage their challenges"
  on public.challenges for all to authenticated
  using      (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Owners manage criteria of their challenges"
  on public.judging_criteria for all to authenticated
  using (exists (select 1 from public.challenges c
                 where c.id = judging_criteria.challenge_id and c.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.challenges c
                 where c.id = judging_criteria.challenge_id and c.owner_id = (select auth.uid())));

create policy "Owners manage timeline of their challenges"
  on public.timeline_phases for all to authenticated
  using (exists (select 1 from public.challenges c
                 where c.id = timeline_phases.challenge_id and c.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.challenges c
                 where c.id = timeline_phases.challenge_id and c.owner_id = (select auth.uid())));

create policy "Owners read ideas for their challenges"
  on public.ideas for select to authenticated
  using (exists (select 1 from public.challenges c
                 where c.id = ideas.challenge_id and c.owner_id = (select auth.uid())));

create policy "Owners delete ideas for their challenges"
  on public.ideas for delete to authenticated
  using (exists (select 1 from public.challenges c
                 where c.id = ideas.challenge_id and c.owner_id = (select auth.uid())));

create policy "Owners manage judges of their challenges"
  on public.challenge_judges for all to authenticated
  using (exists (select 1 from public.challenges c
                 where c.id = challenge_judges.challenge_id and c.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.challenges c
                 where c.id = challenge_judges.challenge_id and c.owner_id = (select auth.uid())));

create or replace function public.judging_role(p_challenge_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when exists (select 1 from public.challenges c
                 where c.id = p_challenge_id and c.owner_id = auth.uid()) then 'owner'
    when exists (select 1 from public.challenge_judges j
                 where j.challenge_id = p_challenge_id
                   and j.email = lower(coalesce(auth.jwt() ->> 'email', ''))) then 'judge'
    else null
  end;
$$;

create or replace function public.delete_comment(p_comment_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
begin
  delete from public.idea_comments m
  using public.ideas i, public.challenges c
  where m.id = p_comment_id and i.id = m.idea_id and c.id = i.challenge_id and c.owner_id = auth.uid();
  return case when found then 'ok' else 'forbidden' end;
end;
$$;

drop trigger if exists challenges_default_organization on public.challenges;
drop function if exists public.challenges_default_organization();
alter table public.challenges drop column if exists organization_id;

drop function if exists public.remove_org_member(uuid, uuid, text);
drop function if exists public.accept_org_invites();
drop function if exists public.ensure_workspace();
drop function if exists public.can_manage_challenge(uuid);
drop table if exists public.organization_invites;
drop table if exists public.organization_members;
drop table if exists public.organizations;
drop function if exists public.is_org_member(uuid);
drop function if exists public.has_org_role(uuid, text[]);
drop function if exists public.org_roles();

commit;

notify pgrst, 'reload schema';
