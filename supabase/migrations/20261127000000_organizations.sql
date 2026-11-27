-- Phase 3: organisations (workspaces) and roles.
--
-- Until now every challenge belonged to one person. From here on every challenge belongs to an
-- organisation, and what you can do depends on your role there:
--   admin       manages the organisation (name, members, invitations) and all its challenges
--   organiser   creates and manages the organisation's challenges
--   judge, mentor, participant, project_owner
--               recorded now; their screens arrive in later phases
-- A person can hold several roles in the same organisation.
--
-- This change only ADDS things. For existing data:
--   * every person who owns a challenge gets their own workspace, with themselves as admin;
--   * their challenges move into it, so they see and manage exactly what they did before;
--   * judges invited to a challenge by email keep their access unchanged;
--   * owner_id stays on every challenge, so this can be undone (see supabase/rollback).
--
-- Safe during deploy: if the previous version of the app creates a challenge without an
-- organisation, a trigger files it in the creator's workspace (creating one if needed).

-- Roles ---------------------------------------------------------------------------------------
create or replace function public.org_roles()
returns text[]
language sql
immutable
set search_path = ''
as $$ select array['admin', 'organiser', 'judge', 'mentor', 'participant', 'project_owner'] $$;

-- organizations -------------------------------------------------------------------------------
create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 120),
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- organization_members: one row per person per role ------------------------------------------
create table public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  role            text not null check (role = any (public.org_roles())),
  -- Copied from the login so members can see who is who (auth.users is not readable).
  email           text not null default '',
  created_at      timestamptz not null default now(),
  primary key (organization_id, user_id, role)
);
create index organization_members_user_idx on public.organization_members (user_id);

-- organization_invites: waiting for someone to sign in with this email ------------------------
-- Like judge invitations, an invite is claimed by signing in with the invited address. That is
-- safe because Supabase only lets people sign in after confirming their email address.
create table public.organization_invites (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email           text not null check (
                    email = lower(btrim(email))
                    and char_length(email) <= 254
                    and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  role            text not null check (role = any (public.org_roles())),
  invited_by      uuid references auth.users (id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  unique (organization_id, email, role)
);

-- Challenges belong to an organisation ---------------------------------------------------------
alter table public.challenges
  add column organization_id uuid references public.organizations (id) on delete restrict;

-- Filled in for existing challenges further down (see "Backfill").

-- Permission helpers --------------------------------------------------------------------------
-- "security definer" lets these read the membership table without tripping over its own
-- security rules; they only ever answer about the signed-in person.
-- They are "volatile" (not "stable") on purpose: when someone's first challenge creates their
-- workspace inside the same statement, the permission check must see that new membership.
create or replace function public.has_org_role(p_org uuid, p_roles text[])
returns boolean
language sql
volatile
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = p_org and m.user_id = auth.uid() and m.role = any (p_roles));
$$;

create or replace function public.is_org_member(p_org uuid)
returns boolean
language sql
volatile
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = p_org and m.user_id = auth.uid());
$$;

-- Admins and organisers of the challenge's organisation manage it.
create or replace function public.can_manage_challenge(p_challenge uuid)
returns boolean
language sql
volatile
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.challenges c
    where c.id = p_challenge and public.has_org_role(c.organization_id, array['admin', 'organiser']));
$$;

revoke all on function public.has_org_role(uuid, text[]) from public;
revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.can_manage_challenge(uuid) from public;
grant execute on function public.has_org_role(uuid, text[]) to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.can_manage_challenge(uuid) to authenticated;

-- My workspace: returns the signed-in person's first workspace, creating one if needed ----------
create or replace function public.ensure_workspace()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user  uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_org   uuid;
begin
  if v_user is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  select m.organization_id into v_org
  from public.organization_members m
  join public.organizations o on o.id = m.organization_id
  where m.user_id = v_user and m.role = 'admin'
  order by o.created_at
  limit 1;

  if v_org is null then
    insert into public.organizations (name, created_by)
    values (coalesce(nullif(split_part(v_email, '@', 1), ''), 'My') || '''s workspace', v_user)
    returning id into v_org;
    insert into public.organization_members (organization_id, user_id, role, email)
    values (v_org, v_user, 'admin', v_email);
  end if;
  return v_org;
end;
$$;

revoke all on function public.ensure_workspace() from public;
grant execute on function public.ensure_workspace() to authenticated;

-- Claim every invitation sent to the signed-in person's email ----------------------------------
create or replace function public.accept_org_invites()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user  uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_count integer;
begin
  if v_user is null or v_email = '' then
    return 0;
  end if;

  insert into public.organization_members (organization_id, user_id, role, email)
  select i.organization_id, v_user, i.role, v_email
  from public.organization_invites i
  where i.email = v_email
  on conflict do nothing;

  delete from public.organization_invites i where i.email = v_email;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.accept_org_invites() from public;
grant execute on function public.accept_org_invites() to authenticated;

-- Admins remove a role from a member; the last admin can't be removed --------------------------
create or replace function public.remove_org_member(p_org uuid, p_user uuid, p_role text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_org_role(p_org, array['admin']) then
    return 'forbidden';
  end if;
  if p_role = 'admin' and (
       select count(*) from public.organization_members m
       where m.organization_id = p_org and m.role = 'admin') <= 1 then
    return 'last-admin';
  end if;
  delete from public.organization_members m
  where m.organization_id = p_org and m.user_id = p_user and m.role = p_role;
  return case when found then 'ok' else 'not-found' end;
end;
$$;

revoke all on function public.remove_org_member(uuid, uuid, text) from public;
grant execute on function public.remove_org_member(uuid, uuid, text) to authenticated;

-- Security rules for the new tables ---------------------------------------------------------
alter table public.organizations        enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invites enable row level security;

grant select on public.organizations to authenticated;
grant update (name) on public.organizations to authenticated;
grant select on public.organization_members to authenticated;
grant select, insert, delete on public.organization_invites to authenticated;

create policy "Members see their organisations"
  on public.organizations for select to authenticated
  using (public.is_org_member(id));

create policy "Admins rename their organisations"
  on public.organizations for update to authenticated
  using (public.has_org_role(id, array['admin']))
  with check (public.has_org_role(id, array['admin']));

create policy "Members see who else is in their organisations"
  on public.organization_members for select to authenticated
  using (public.is_org_member(organization_id));

create policy "Admins see invitations"
  on public.organization_invites for select to authenticated
  using (public.has_org_role(organization_id, array['admin']));

create policy "Admins send invitations"
  on public.organization_invites for insert to authenticated
  with check (public.has_org_role(organization_id, array['admin']) and invited_by = (select auth.uid()));

create policy "Admins cancel invitations"
  on public.organization_invites for delete to authenticated
  using (public.has_org_role(organization_id, array['admin']));

-- Backfill: one workspace per existing owner, named after their email.
do $$
declare
  r     record;
  v_org uuid;
begin
  for r in
    select distinct c.owner_id, lower(coalesce(u.email, '')) as email
    from public.challenges c
    left join auth.users u on u.id = c.owner_id
  loop
    insert into public.organizations (name, created_by)
    values (coalesce(nullif(split_part(r.email, '@', 1), ''), 'My') || '''s workspace', r.owner_id)
    returning id into v_org;
    insert into public.organization_members (organization_id, user_id, role, email)
    values (v_org, r.owner_id, 'admin', r.email);
    update public.challenges set organization_id = v_org where owner_id = r.owner_id;
  end loop;
end;
$$;

alter table public.challenges alter column organization_id set not null;
create index challenges_organization_idx on public.challenges (organization_id, created_at desc);

-- A challenge created without an organisation goes into the creator's workspace.
create or replace function public.challenges_default_organization()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.organization_id is null then
    new.organization_id := public.ensure_workspace();
  end if;
  return new;
end;
$$;

create trigger challenges_default_organization
  before insert on public.challenges
  for each row execute function public.challenges_default_organization();

-- Replace "owner only" rules with "admins and organisers of the organisation" ------------------
drop policy "Owners manage their challenges" on public.challenges;
drop policy "Owners manage criteria of their challenges" on public.judging_criteria;
drop policy "Owners manage timeline of their challenges" on public.timeline_phases;
drop policy "Owners read ideas for their challenges" on public.ideas;
drop policy "Owners delete ideas for their challenges" on public.ideas;
drop policy "Owners manage judges of their challenges" on public.challenge_judges;

create policy "Organisers manage their organisation's challenges"
  on public.challenges for all to authenticated
  using (public.has_org_role(organization_id, array['admin', 'organiser']))
  with check (
    public.has_org_role(organization_id, array['admin', 'organiser'])
    and owner_id is not null);

-- New challenges are always recorded as created by the person creating them.
create policy "New challenges are created by the signed-in person"
  on public.challenges as restrictive for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "Organisers manage criteria"
  on public.judging_criteria for all to authenticated
  using (public.can_manage_challenge(challenge_id))
  with check (public.can_manage_challenge(challenge_id));

create policy "Organisers manage timelines"
  on public.timeline_phases for all to authenticated
  using (public.can_manage_challenge(challenge_id))
  with check (public.can_manage_challenge(challenge_id));

create policy "Organisers read ideas"
  on public.ideas for select to authenticated
  using (public.can_manage_challenge(challenge_id));

create policy "Organisers delete ideas"
  on public.ideas for delete to authenticated
  using (public.can_manage_challenge(challenge_id));

create policy "Organisers manage judges"
  on public.challenge_judges for all to authenticated
  using (public.can_manage_challenge(challenge_id))
  with check (public.can_manage_challenge(challenge_id));

-- Functions that checked "is the owner" now check "manages the challenge" ---------------------
-- judging_role still answers 'owner' for managers so the rest of the app needs no change.
create or replace function public.judging_role(p_challenge_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when public.can_manage_challenge(p_challenge_id) then 'owner'
    when exists (select 1 from public.challenge_judges j
                 where j.challenge_id = p_challenge_id
                   and j.email = lower(coalesce(auth.jwt() ->> 'email', ''))) then 'judge'
    else null
  end;
$$;

revoke all on function public.judging_role(uuid) from public;
grant execute on function public.judging_role(uuid) to authenticated;

create or replace function public.delete_comment(p_comment_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.idea_comments m
  using public.ideas i
  where m.id = p_comment_id and i.id = m.idea_id and public.can_manage_challenge(i.challenge_id);
  return case when found then 'ok' else 'forbidden' end;
end;
$$;

revoke all on function public.delete_comment(uuid) from public;
grant execute on function public.delete_comment(uuid) to authenticated;

notify pgrst, 'reload schema';
