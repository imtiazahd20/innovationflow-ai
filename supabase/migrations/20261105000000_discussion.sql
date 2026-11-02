-- InnovationFlow AI, Milestone 7b: an open discussion on each challenge's ideas.
--
-- Who can do what:
--   * Everyone who SUBMITTED an idea to a challenge can read all of that challenge's ideas and
--     comments and can comment on any idea. They prove who they are with a private link
--     (thread_token) shown right after they submit. No account needed. Emails are never shown.
--   * The challenge OWNER and invited JUDGES (signed in) can read and comment too.
--   * The owner can delete any comment.
-- Nobody touches the comments table directly; everything goes through the functions below.
-- Attachments live in the Storage bucket "idea-files" (5 MB each, images/PDF/Office/text).

-- A private link key for every idea ---------------------------------------------------------
alter table public.ideas add column thread_token uuid not null default gen_random_uuid();
create unique index ideas_thread_token_idx on public.ideas (thread_token);

-- submit_idea now also hands back the new idea's key -----------------------------------------
drop function if exists public.submit_idea(uuid, text, text, text, text);

create function public.submit_idea(
  p_challenge_id uuid,
  p_name         text,
  p_email        text,
  p_title        text,
  p_description  text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deadline date;
  v_status   text;
  v_token    uuid;
begin
  select c.deadline, c.status into v_deadline, v_status
  from public.challenges c where c.id = p_challenge_id;

  if not found or v_status <> 'published' then
    return jsonb_build_object('status', 'not_found');
  end if;
  if current_date > v_deadline then
    return jsonb_build_object('status', 'closed');
  end if;
  if (select count(*) from public.ideas i where i.challenge_id = p_challenge_id) >= 500 then
    return jsonb_build_object('status', 'full');
  end if;
  if exists (
    select 1 from public.ideas i
    where i.challenge_id = p_challenge_id
      and lower(i.submitter_email) = lower(btrim(p_email))
      and lower(i.title) = lower(btrim(p_title))
  ) then
    return jsonb_build_object('status', 'duplicate');
  end if;

  insert into public.ideas (challenge_id, submitter_name, submitter_email, title, description)
  values (p_challenge_id, btrim(p_name), btrim(p_email), btrim(p_title), btrim(p_description))
  returning thread_token into v_token;
  return jsonb_build_object('status', 'ok', 'token', v_token);
end;
$$;

revoke all on function public.submit_idea(uuid, text, text, text, text) from public;
grant execute on function public.submit_idea(uuid, text, text, text, text) to anon, authenticated;

-- Comments ------------------------------------------------------------------------------------
create table public.idea_comments (
  id             uuid primary key default gen_random_uuid(),
  idea_id        uuid not null references public.ideas (id) on delete cascade,
  author_role    text not null check (author_role in ('submitter', 'judge', 'owner')),
  author_name    text not null check (char_length(author_name) between 1 and 100),
  body           text not null check (char_length(body) between 1 and 2000),
  -- [{"path": "...", "name": "...", "type": "...", "size": 123}], at most 3
  attachments    jsonb not null default '[]'::jsonb,
  created_at     timestamptz not null default now()
);

create index idea_comments_idea_id_idx on public.idea_comments (idea_id, created_at);

alter table public.idea_comments enable row level security;
-- No policies and no grants: only the functions below can read or write.

-- Who is asking? Returns {role, name, idea_id} or null ----------------------------------------
create or replace function public.discussion_viewer(p_challenge_id uuid, p_token uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role  text;
  v_idea  record;
  v_email text;
begin
  if p_token is not null then
    select i.id, i.submitter_name into v_idea
    from public.ideas i
    join public.challenges c on c.id = i.challenge_id
    where i.thread_token = p_token and i.challenge_id = p_challenge_id and c.status = 'published';
    if found then
      return jsonb_build_object('role', 'submitter', 'name', v_idea.submitter_name, 'idea_id', v_idea.id);
    end if;
    return null;
  end if;

  if auth.uid() is not null then
    v_role := public.judging_role(p_challenge_id);
    if v_role is not null then
      v_email := coalesce(auth.jwt() ->> 'email', 'judge');
      return jsonb_build_object('role', v_role, 'name', left(split_part(v_email, '@', 1), 100), 'idea_id', null);
    end if;
  end if;
  return null;
end;
$$;

revoke all on function public.discussion_viewer(uuid, uuid) from public;

-- Everything the discussion page needs -----------------------------------------------------------
create or replace function public.get_discussion(p_challenge_id uuid, p_token uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_viewer jsonb := public.discussion_viewer(p_challenge_id, p_token);
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

-- Post a comment. p_files is a list of already uploaded files. Returns ok | forbidden | invalid | full
create or replace function public.post_comment(
  p_challenge_id uuid,
  p_token        uuid,
  p_idea_id      uuid,
  p_body         text,
  p_files        jsonb default '[]'::jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_viewer jsonb := public.discussion_viewer(p_challenge_id, p_token);
  v_body   text := btrim(coalesce(p_body, ''));
  v_prefix text;
  v_file   jsonb;
  v_uuid   constant text := '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
begin
  if v_viewer is null then
    return 'forbidden';
  end if;
  if not exists (select 1 from public.ideas i where i.id = p_idea_id and i.challenge_id = p_challenge_id) then
    return 'forbidden';
  end if;
  if char_length(v_body) not between 1 and 2000 then
    return 'invalid';
  end if;
  if p_files is null or jsonb_typeof(p_files) <> 'array' or jsonb_array_length(p_files) > 3 then
    return 'invalid';
  end if;

  v_prefix := case when v_viewer ->> 'role' = 'submitter'
                   then 't/' || p_token::text || '/'
                   else 'c/' || p_challenge_id::text || '/' end;

  for v_file in select * from jsonb_array_elements(p_files) loop
    if jsonb_typeof(v_file) <> 'object'
       or jsonb_typeof(v_file -> 'path') <> 'string'
       or jsonb_typeof(v_file -> 'name') <> 'string'
       or jsonb_typeof(v_file -> 'type') <> 'string'
       or jsonb_typeof(v_file -> 'size') <> 'number' then
      return 'invalid';
    end if;
    if (v_file ->> 'path') not like v_prefix || '%'
       or substr(v_file ->> 'path', char_length(v_prefix) + 1) !~ ('^' || v_uuid || '\.[a-z0-9]{1,5}$') then
      return 'invalid';
    end if;
    if char_length(v_file ->> 'name') not between 1 and 200 then
      return 'invalid';
    end if;
    if (v_file ->> 'type') not in (
         'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf', 'text/plain',
         'application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.ms-excel',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
         'application/vnd.ms-powerpoint',
         'application/vnd.openxmlformats-officedocument.presentationml.presentation') then
      return 'invalid';
    end if;
    if (v_file ->> 'size') !~ '^[0-9]+$' or (v_file ->> 'size')::bigint > 5242880 then
      return 'invalid';
    end if;
  end loop;

  if (select count(*) from public.idea_comments m where m.idea_id = p_idea_id) >= 300 then
    return 'full';
  end if;

  insert into public.idea_comments (idea_id, author_role, author_name, body, attachments)
  select p_idea_id, v_viewer ->> 'role', v_viewer ->> 'name', v_body,
         coalesce((select jsonb_agg(jsonb_build_object(
                     'path', f ->> 'path', 'name', f ->> 'name', 'type', f ->> 'type', 'size', (f ->> 'size')::bigint))
                   from jsonb_array_elements(p_files) f), '[]'::jsonb);
  return 'ok';
end;
$$;

revoke all on function public.post_comment(uuid, uuid, uuid, text, jsonb) from public;
grant execute on function public.post_comment(uuid, uuid, uuid, text, jsonb) to anon, authenticated;

-- The owner can remove a comment ------------------------------------------------------------------
create or replace function public.delete_comment(p_comment_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.idea_comments m
  using public.ideas i, public.challenges c
  where m.id = p_comment_id and i.id = m.idea_id and c.id = i.challenge_id and c.owner_id = auth.uid();
  return case when found then 'ok' else 'forbidden' end;
end;
$$;

revoke all on function public.delete_comment(uuid) from public;
grant execute on function public.delete_comment(uuid) to authenticated;

-- Attachment storage ------------------------------------------------------------------------------
-- The bucket is "public": a file can be opened by anyone who has its exact link. The link
-- contains a random id and is shown only to people allowed into the discussion. Nobody can
-- list or overwrite files. Uploads are allowed only into a folder the uploader owns:
--   t/<idea key>/<file>      for submitters (the key proves they submitted an idea)
--   c/<challenge id>/<file>  for the owner and invited judges
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('idea-files', 'idea-files', true, 5242880, array[
  'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf', 'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.upload_path_ok(p_path text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_parts text[] := string_to_array(p_path, '/');
  v_uuid  constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  if array_length(v_parts, 1) is distinct from 3 or v_parts[2] !~ v_uuid then
    return false;
  end if;
  if v_parts[1] = 't' then
    return exists (select 1 from public.ideas i where i.thread_token = v_parts[2]::uuid);
  elsif v_parts[1] = 'c' then
    return public.judging_role(v_parts[2]::uuid) is not null;
  end if;
  return false;
end;
$$;

revoke all on function public.upload_path_ok(text) from public;
grant execute on function public.upload_path_ok(text) to anon, authenticated;

create policy "Upload idea files into your own folder"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'idea-files' and public.upload_path_ok(name));

notify pgrst, 'reload schema';
