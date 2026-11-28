-- Phase 3: activity log and in-app notifications.
--
-- Both are written ONLY by the database (triggers below), never by the app, so an entry can't
-- be skipped or faked from a browser. People can read, but not write:
--   activity_logs   admins and organisers of the workspace read its history
--   notifications   each person reads, marks as read and deletes their own
--
-- What is recorded:
--   challenges            created, edited, plan updated, published, unpublished, deleted
--   ideas                 received (also notifies the workspace's admins and organisers), deleted
--   organization_members  joined with a role (also notifies the other admins), role removed
--   organization_invites  sent, cancelled (an invitation used to join is not "cancelled")

-- activity_logs ------------------------------------------------------------------------------
create table public.activity_logs (
  id              bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  actor_id        uuid references auth.users (id) on delete set null,
  -- Copied at the time, so the log still reads correctly if the person leaves.
  actor_label     text not null default '',
  action          text not null check (char_length(action) between 1 and 60),
  summary         text not null check (char_length(summary) between 1 and 500),
  -- Where the entry links to in the app, if anywhere (for example /dashboard/challenges/<id>).
  link            text check (link is null or link like '/%'),
  created_at      timestamptz not null default now()
);
create index activity_logs_org_idx on public.activity_logs (organization_id, created_at desc);

-- notifications ------------------------------------------------------------------------------
create table public.notifications (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references auth.users (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete cascade,
  kind            text not null check (char_length(kind) between 1 and 60),
  title           text not null check (char_length(title) between 1 and 300),
  link            text check (link is null or link like '/%'),
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

alter table public.activity_logs enable row level security;
alter table public.notifications enable row level security;

grant select on public.activity_logs to authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "Admins and organisers read their workspace's activity"
  on public.activity_logs for select to authenticated
  using (public.has_org_role(organization_id, array['admin', 'organiser']));

create policy "People read their own notifications"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

create policy "People mark their own notifications as read"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "People delete their own notifications"
  on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

-- Helpers used by the triggers (not callable from the app) ------------------------------------
create or replace function public.log_activity(
  p_org uuid, p_action text, p_summary text, p_link text default null, p_actor_label text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_org is null then
    return;
  end if;
  insert into public.activity_logs (organization_id, actor_id, actor_label, action, summary, link)
  values (
    p_org,
    auth.uid(),
    left(coalesce(p_actor_label, nullif(lower(coalesce(auth.jwt() ->> 'email', '')), ''), 'Someone'), 254),
    p_action,
    left(p_summary, 500),
    p_link
  );
end;
$$;

-- Notifies everyone holding one of p_roles in the workspace, except the person who acted.
create or replace function public.notify_roles(
  p_org uuid, p_roles text[], p_kind text, p_title text, p_link text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_org is null then
    return;
  end if;
  insert into public.notifications (user_id, organization_id, kind, title, link)
  select distinct m.user_id, p_org, p_kind, left(p_title, 300), p_link
  from public.organization_members m
  where m.organization_id = p_org
    and m.role = any (p_roles)
    and m.user_id is distinct from auth.uid();
end;
$$;

revoke all on function public.log_activity(uuid, text, text, text, text) from public;
revoke all on function public.notify_roles(uuid, text[], text, text, text) from public;

-- Challenges ---------------------------------------------------------------------------------
create or replace function public.challenges_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_link text;
begin
  if tg_op = 'INSERT' then
    perform public.log_activity(new.organization_id, 'challenge.created',
      'Created the challenge "' || new.title || '"', '/dashboard/challenges/' || new.id);
    return new;
  end if;

  if tg_op = 'DELETE' then
    perform public.log_activity(old.organization_id, 'challenge.deleted',
      'Deleted the challenge "' || old.title || '"');
    return old;
  end if;

  v_link := '/dashboard/challenges/' || new.id;
  if new.status is distinct from old.status then
    perform public.log_activity(new.organization_id,
      case when new.status = 'published' then 'challenge.published' else 'challenge.unpublished' end,
      case when new.status = 'published' then 'Published "' else 'Unpublished "' end || new.title || '"',
      v_link);
  end if;
  if (new.title, new.business_problem, new.objectives, new.target_participants, new.deadline)
     is distinct from (old.title, old.business_problem, old.objectives, old.target_participants, old.deadline) then
    perform public.log_activity(new.organization_id, 'challenge.edited', 'Edited "' || new.title || '"', v_link);
  end if;
  if new.brief is distinct from old.brief then
    perform public.log_activity(new.organization_id, 'plan.updated',
      'Updated the brief, criteria and timeline of "' || new.title || '"', v_link);
  end if;
  if new.organization_id is distinct from old.organization_id then
    perform public.log_activity(old.organization_id, 'challenge.moved',
      'Moved "' || new.title || '" to another workspace');
    perform public.log_activity(new.organization_id, 'challenge.moved',
      'Moved "' || new.title || '" into this workspace', v_link);
  end if;
  return new;
end;
$$;

create trigger challenges_activity
  after insert or update or delete on public.challenges
  for each row execute function public.challenges_activity();

-- Ideas ----------------------------------------------------------------------------------------
create or replace function public.ideas_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org   uuid;
  v_title text;
begin
  select c.organization_id, c.title into v_org, v_title
  from public.challenges c
  where c.id = case when tg_op = 'DELETE' then old.challenge_id else new.challenge_id end;
  -- When a whole challenge is deleted its ideas go too; that is already logged once.
  if v_org is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'INSERT' then
    perform public.log_activity(v_org, 'idea.received',
      new.submitter_name || ' submitted "' || new.title || '" to "' || v_title || '"',
      '/dashboard/challenges/' || new.challenge_id, new.submitter_name);
    perform public.notify_roles(v_org, array['admin', 'organiser'], 'idea.received',
      'New idea for "' || v_title || '": ' || new.title,
      '/dashboard/challenges/' || new.challenge_id);
    return new;
  end if;

  perform public.log_activity(v_org, 'idea.deleted',
    'Deleted the idea "' || old.title || '" from "' || v_title || '"',
    '/dashboard/challenges/' || old.challenge_id);
  return old;
end;
$$;

create trigger ideas_activity
  after insert or delete on public.ideas
  for each row execute function public.ideas_activity();

-- Members ------------------------------------------------------------------------------------
create or replace function public.org_roles_label(p_role text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_role
    when 'admin' then 'Admin' when 'organiser' then 'Organiser' when 'judge' then 'Judge'
    when 'mentor' then 'Mentor' when 'participant' then 'Participant' when 'project_owner' then 'Project owner'
    else p_role end;
$$;

create or replace function public.members_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_activity(new.organization_id, 'member.joined',
      coalesce(nullif(new.email, ''), 'Someone') || ' joined as ' || public.org_roles_label(new.role),
      '/dashboard/organizations/' || new.organization_id);
    perform public.notify_roles(new.organization_id, array['admin'], 'member.joined',
      coalesce(nullif(new.email, ''), 'Someone') || ' joined your workspace as ' || public.org_roles_label(new.role),
      '/dashboard/organizations/' || new.organization_id);
    return new;
  end if;

  perform public.log_activity(old.organization_id, 'member.removed',
    'Removed the ' || public.org_roles_label(old.role) || ' role from ' || coalesce(nullif(old.email, ''), 'a member'),
    '/dashboard/organizations/' || old.organization_id);
  return old;
end;
$$;

create trigger members_activity
  after insert or delete on public.organization_members
  for each row execute function public.members_activity();

-- Invitations ----------------------------------------------------------------------------------
create or replace function public.invites_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_activity(new.organization_id, 'invite.sent',
      'Invited ' || new.email || ' as ' || public.org_roles_label(new.role),
      '/dashboard/organizations/' || new.organization_id);
    return new;
  end if;
  -- accept_org_invites() marks its own clean-up, so a used invitation isn't logged as cancelled.
  if coalesce(current_setting('app.accepting_invites', true), '') <> 'on' then
    perform public.log_activity(old.organization_id, 'invite.cancelled',
      'Cancelled the invitation for ' || old.email,
      '/dashboard/organizations/' || old.organization_id);
  end if;
  return old;
end;
$$;

create trigger invites_activity
  after insert or delete on public.organization_invites
  for each row execute function public.invites_activity();

-- Same as before, plus the marker that tells the trigger above these weren't cancellations.
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

  perform set_config('app.accepting_invites', 'on', true);
  delete from public.organization_invites i where i.email = v_email;
  get diagnostics v_count = row_count;
  perform set_config('app.accepting_invites', 'off', true);
  return v_count;
end;
$$;

revoke all on function public.accept_org_invites() from public;
grant execute on function public.accept_org_invites() to authenticated;

notify pgrst, 'reload schema';
