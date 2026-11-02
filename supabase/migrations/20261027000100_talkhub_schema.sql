
-- -- TalkHub initial schema migration
-- -- Assumed schema: adjust columns to match your brief if needed.

-- begin;

-- create extension if not exists pgcrypto;

-- -- 1. Profiles: one profile per Supabase Auth user
-- create table public.profiles (
--   id uuid primary key references auth.users(id) on delete cascade,
--   username text unique,
--   full_name text,
--   avatar_url text,
--   created_at timestamptz not null default now(),
--   updated_at timestamptz not null default now()
-- );

-- -- 2. Conversations
-- create table public.conversations (
--   id uuid primary key default gen_random_uuid(),
--   title text,
--   is_group boolean not null default false,
--   created_by uuid not null references public.profiles(id) on delete restrict,
--   created_at timestamptz not null default now(),
--   updated_at timestamptz not null default now()
-- );

-- -- 3. Conversation membership
-- create table public.conversation_members (
--   conversation_id uuid not null references public.conversations(id) on delete cascade,
--   user_id uuid not null references public.profiles(id) on delete cascade,
--   role text not null default 'member'
--     check (role in ('owner', 'admin', 'member')),
--   joined_at timestamptz not null default now(),
--   primary key (conversation_id, user_id)
-- );

-- -- 4. Messages
-- create table public.messages (
--   id uuid primary key default gen_random_uuid(),
--   conversation_id uuid not null references public.conversations(id) on delete cascade,
--   sender_id uuid not null references public.profiles(id) on delete restrict,
--   content text,
--   message_type text not null default 'text'
--     check (message_type in ('text', 'image', 'file', 'system')),
--   attachment_path text,
--   created_at timestamptz not null default now(),
--   edited_at timestamptz,
--   constraint messages_content_or_attachment
--     check (
--       nullif(trim(content), '') is not null
--       or attachment_path is not null
--     )
-- );

-- -- 5. Per-user message deletion records (soft deletion)
-- create table public.message_deletions (
--   message_id uuid not null references public.messages(id) on delete cascade,
--   user_id uuid not null references public.profiles(id) on delete cascade,
--   deleted_at timestamptz not null default now(),
--   primary key (message_id, user_id)
-- );

-- -- Useful indexes
-- create index conversations_created_by_idx
--   on public.conversations(created_by);

-- create index conversation_members_user_idx
--   on public.conversation_members(user_id);

-- create index messages_conversation_created_idx
--   on public.messages(conversation_id, created_at desc);

-- create index messages_sender_idx
--   on public.messages(sender_id);

-- create index message_deletions_user_idx
--   on public.message_deletions(user_id);

-- -- Helper: checks whether the current authenticated user is a member.
-- -- SECURITY DEFINER avoids recursive membership RLS evaluation.
-- create or replace function public.is_member(p_conversation_id uuid)
-- returns boolean
-- language sql
-- stable
-- security definer
-- set search_path = ''
-- as $$
--   select exists (
--     select 1
--     from public.conversation_members cm
--     where cm.conversation_id = p_conversation_id
--       and cm.user_id = (select auth.uid())
--   );
-- $$;

-- revoke all on function public.is_member(uuid) from public, anon;
-- grant execute on function public.is_member(uuid) to authenticated;

-- -- Automatically create a profile on signup.
-- create or replace function public.handle_new_user()
-- returns trigger
-- language plpgsql
-- security definer
-- set search_path = ''
-- as $$
-- begin
--   insert into public.profiles (id, full_name, avatar_url)
--   values (
--     new.id,
--     coalesce(
--       new.raw_user_meta_data ->> 'full_name',
--       new.raw_user_meta_data ->> 'name'
--     ),
--     new.raw_user_meta_data ->> 'avatar_url'
--   );

--   return new;
-- end;
-- $$;

-- drop trigger if exists on_auth_user_created on auth.users;

-- create trigger on_auth_user_created
--   after insert on auth.users
--   for each row execute function public.handle_new_user();

-- -- Enable RLS on all five tables
-- alter table public.profiles enable row level security;
-- alter table public.conversations enable row level security;
-- alter table public.conversation_members enable row level security;
-- alter table public.messages enable row level security;
-- alter table public.message_deletions enable row level security;

-- -- PROFILES: never expose all profiles through an unrestricted policy
-- create policy "Users can view their own profile"
-- on public.profiles for select to authenticated
-- using (id = (select auth.uid()));

-- create policy "Users can update their own profile"
-- on public.profiles for update to authenticated
-- using (id = (select auth.uid()))
-- with check (id = (select auth.uid()));

-- -- CONVERSATIONS
-- create policy "Members can view conversations"
-- on public.conversations for select to authenticated
-- using (public.is_member(id));

-- create policy "Authenticated users can create conversations"
-- on public.conversations for insert to authenticated
-- with check (created_by = (select auth.uid()));

-- create policy "Creators can update conversations"
-- on public.conversations for update to authenticated
-- using (created_by = (select auth.uid()))
-- with check (created_by = (select auth.uid()));

-- -- CONVERSATION MEMBERS
-- create policy "Members can view membership"
-- on public.conversation_members for select to authenticated
-- using (
--   user_id = (select auth.uid())
--   or public.is_member(conversation_id)
-- );

-- -- Only the conversation creator can add members through the client.
-- -- Do not let users join arbitrary conversations by inserting themselves.
-- create policy "Creators can add conversation members"
-- on public.conversation_members for insert to authenticated
-- with check (
--   exists (
--     select 1
--     from public.conversations c
--     where c.id = conversation_id
--       and c.created_by = (select auth.uid())
--   )
-- );

-- create policy "Creators can remove conversation members"
-- on public.conversation_members for delete to authenticated
-- using (
--   exists (
--     select 1
--     from public.conversations c
--     where c.id = conversation_id
--       and c.created_by = (select auth.uid())
--   )
-- );

-- -- MESSAGES: members can read; a sender can insert as themselves.
-- -- Intentionally NO client UPDATE or DELETE policies.
-- create policy "Members can read messages"
-- on public.messages for select to authenticated
-- using (public.is_member(conversation_id));

-- create policy "Members can send their own messages"
-- on public.messages for insert to authenticated
-- with check (
--   sender_id = (select auth.uid())
--   and public.is_member(conversation_id)
-- );

-- -- MESSAGE DELETIONS: each member manages only their own deletion record.
-- create policy "Users can view their own message deletions"
-- on public.message_deletions for select to authenticated
-- using (user_id = (select auth.uid()));

-- create policy "Members can hide messages for themselves"
-- on public.message_deletions for insert to authenticated
-- with check (
--   user_id = (select auth.uid())
--   and exists (
--     select 1
--     from public.messages m
--     where m.id = message_id
--       and public.is_member(m.conversation_id)
--   )
-- );

-- create policy "Users can remove their own deletion record"
-- on public.message_deletions for delete to authenticated
-- using (user_id = (select auth.uid()));

-- -- Storage buckets
-- insert into storage.buckets (id, name, public)
-- values
--   ('chat-files', 'chat-files', false),
--   ('avatars', 'avatars', true)
-- on conflict (id) do update
-- set public = excluded.public;

-- -- CHAT FILES: object path must be
-- -- <conversation-uuid>/<filename>
-- create policy "Members can read chat files"
-- on storage.objects for select to authenticated
-- using (
--   bucket_id = 'chat-files'
--   and case
--     when (storage.foldername(name))[1] ~*
--       '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
--     then public.is_member(((storage.foldername(name))[1])::uuid)
--     else false
--   end
-- );

-- create policy "Members can upload chat files"
-- on storage.objects for insert to authenticated
-- with check (
--   bucket_id = 'chat-files'
--   and case
--     when (storage.foldername(name))[1] ~*
--       '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
--     then public.is_member(((storage.foldername(name))[1])::uuid)
--     else false
--   end
-- );

-- create policy "Owners can delete their own chat files"
-- on storage.objects for delete to authenticated
-- using (
--   bucket_id = 'chat-files'
--   and owner_id = (select auth.uid()::text)
--   and case
--     when (storage.foldername(name))[1] ~*
--       '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
--     then public.is_member(((storage.foldername(name))[1])::uuid)
--     else false
--   end
-- );

-- -- AVATARS: public reads; each user writes only inside their own
-- -- <user-uuid>/<filename> folder.
-- create policy "Anyone can read public avatars"
-- on storage.objects for select to public
-- using (bucket_id = 'avatars');

-- create policy "Users can upload their own avatars"
-- on storage.objects for insert to authenticated
-- with check (
--   bucket_id = 'avatars'
--   and (storage.foldername(name))[1] = (select auth.uid()::text)
-- );

-- create policy "Users can update their own avatars"
-- on storage.objects for update to authenticated
-- using (
--   bucket_id = 'avatars'
--   and (storage.foldername(name))[1] = (select auth.uid()::text)
-- )
-- with check (
--   bucket_id = 'avatars'
--   and (storage.foldername(name))[1] = (select auth.uid()::text)
-- );

-- create policy "Users can delete their own avatars"
-- on storage.objects for delete to authenticated
-- using (
--   bucket_id = 'avatars'
--   and (storage.foldername(name))[1] = (select auth.uid()::text)
-- );

-- -- Enable Realtime for messages, if not already included.
-- do $$
-- begin
--   if not exists (
--     select 1
--     from pg_publication_tables
--     where pubname = 'supabase_realtime'
--       and schemaname = 'public'
--       and tablename = 'messages'
--   ) then
--     alter publication supabase_realtime add table public.messages;
--   end if;
-- end
-- $$;

-- commit;

-- =========================================================
-- TALKHUB: CHAT FEATURES AND SECURITY IMPROVEMENTS
-- Migration: 20261102000100
-- =========================================================

begin;

-- ---------------------------------------------------------
-- 1. ADD ATTACHMENT METADATA
-- ---------------------------------------------------------

alter table public.messages
add column if not exists attachment_name text,
add column if not exists attachment_mime_type text,
add column if not exists attachment_size_bytes bigint;

-- ---------------------------------------------------------
-- 2. PROTECT CONVERSATION CREATION AND MEMBERSHIP
-- ---------------------------------------------------------

-- Conversations will be created through secure RPC functions.
drop policy if exists
"Authenticated users can create conversations"
on public.conversations;

-- Membership changes will also use secure RPC functions.
drop policy if exists
"Creators can add conversation members"
on public.conversation_members;

drop policy if exists
"Creators can remove conversation members"
on public.conversation_members;

-- Existing SELECT policies remain enabled.

-- ---------------------------------------------------------
-- 3. SEARCH REGISTERED USERS
-- ---------------------------------------------------------

-- Profiles remain private through normal table queries.
-- This function exposes only selected public profile fields.

create or replace function public.search_chat_users(
    p_query text,
    p_limit integer default 20
)
returns table (
    id uuid,
    username text,
    full_name text,
    avatar_url text
)
language sql
stable
security definer
set search_path = ''
as $$
    select
        p.id,
        p.username,
        p.full_name,
        p.avatar_url
    from public.profiles p
    where
        (select auth.uid()) is not null
        and p.id <> (select auth.uid())
        and length(trim(coalesce(p_query, ''))) >= 2
        and (
            coalesce(p.full_name, '') ilike
                '%' || trim(p_query) || '%'
            or
            coalesce(p.username, '') ilike
                '%' || trim(p_query) || '%'
        )
    order by
        p.full_name asc nulls last
    limit greatest(1, least(coalesce(p_limit, 20), 30));
$$;

revoke all on function public.search_chat_users(text, integer)
from public, anon;

grant execute on function public.search_chat_users(text, integer)
to authenticated;

-- ---------------------------------------------------------
-- 4. CREATE OR GET DIRECT CONVERSATION
-- ---------------------------------------------------------

create or replace function public.create_direct_conversation(
    p_other_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_conversation_id uuid;
    v_first_user uuid;
    v_second_user uuid;
begin
    if v_user_id is null then
        raise exception 'Authentication required';
    end if;

    if p_other_user_id is null
       or p_other_user_id = v_user_id then
        raise exception 'Invalid recipient';
    end if;

    if not exists (
        select 1
        from public.profiles
        where id = p_other_user_id
    ) then
        raise exception 'User not found';
    end if;

    v_first_user := least(v_user_id, p_other_user_id);
    v_second_user := greatest(v_user_id, p_other_user_id);

    -- Prevent simultaneous duplicate direct conversations.
    perform pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(
            v_first_user::text || ':' || v_second_user::text,
            0
        )
    );

    -- Check whether a direct conversation already exists.
    select c.id
    into v_conversation_id
    from public.conversations c
    where c.is_group = false
      and exists (
          select 1
          from public.conversation_members cm
          where cm.conversation_id = c.id
            and cm.user_id = v_user_id
      )
      and exists (
          select 1
          from public.conversation_members cm
          where cm.conversation_id = c.id
            and cm.user_id = p_other_user_id
      )
      and (
          select count(*)
          from public.conversation_members cm
          where cm.conversation_id = c.id
      ) = 2
    order by c.created_at asc
    limit 1;

    if v_conversation_id is not null then
        return v_conversation_id;
    end if;

    -- Create a new direct conversation.
    insert into public.conversations (
        is_group,
        created_by
    )
    values (
        false,
        v_user_id
    )
    returning id into v_conversation_id;

    -- Add both participants.
    insert into public.conversation_members (
        conversation_id,
        user_id,
        role
    )
    values
        (v_conversation_id, v_user_id, 'owner'),
        (v_conversation_id, p_other_user_id, 'member');

    return v_conversation_id;
end;
$$;

revoke all on function public.create_direct_conversation(uuid)
from public, anon;

grant execute on function public.create_direct_conversation(uuid)
to authenticated;

-- ---------------------------------------------------------
-- 5. CREATE GROUP CONVERSATION
-- ---------------------------------------------------------

create or replace function public.create_group_conversation(
    p_title text,
    p_member_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_conversation_id uuid;
    v_member_count integer;
begin
    if v_user_id is null then
        raise exception 'Authentication required';
    end if;

    if nullif(trim(p_title), '') is null then
        raise exception 'Group name is required';
    end if;

    if pg_catalog.array_length(p_member_ids, 1) > 100 then
        raise exception 'Maximum 100 selected members allowed';
    end if;

    -- Validate that every selected user exists.
    if exists (
        select 1
        from pg_catalog.unnest(
            coalesce(p_member_ids, array[]::uuid[])
        ) as selected(user_id)
        where selected.user_id is null
           or not exists (
               select 1
               from public.profiles p
               where p.id = selected.user_id
           )
    ) then
        raise exception 'One or more selected users do not exist';
    end if;

    select count(distinct selected.user_id)
    into v_member_count
    from pg_catalog.unnest(
        coalesce(p_member_ids, array[]::uuid[])
    ) as selected(user_id)
    where selected.user_id <> v_user_id;

    if v_member_count < 1 then
        raise exception 'Select at least one other member';
    end if;

    -- Create group.
    insert into public.conversations (
        title,
        is_group,
        created_by
    )
    values (
        trim(p_title),
        true,
        v_user_id
    )
    returning id into v_conversation_id;

    -- Add creator as owner.
    insert into public.conversation_members (
        conversation_id,
        user_id,
        role
    )
    values (
        v_conversation_id,
        v_user_id,
        'owner'
    );

    -- Add selected members without duplicates.
    insert into public.conversation_members (
        conversation_id,
        user_id,
        role
    )
    select
        v_conversation_id,
        selected.user_id,
        'member'
    from (
        select distinct user_id
        from pg_catalog.unnest(
            coalesce(p_member_ids, array[]::uuid[])
        ) as selected(user_id)
        where user_id <> v_user_id
    ) selected;

    return v_conversation_id;
end;
$$;

revoke all on function public.create_group_conversation(text, uuid[])
from public, anon;

grant execute on function public.create_group_conversation(text, uuid[])
to authenticated;

-- ---------------------------------------------------------
-- 6. ADD USEFUL INDEXES
-- ---------------------------------------------------------

create index if not exists profiles_full_name_idx
on public.profiles(full_name);

create index if not exists conversations_updated_at_idx
on public.conversations(updated_at desc);

create index if not exists conversation_members_conversation_idx
on public.conversation_members(conversation_id);

create index if not exists messages_attachment_path_idx
on public.messages(attachment_path)
where attachment_path is not null;

-- ---------------------------------------------------------
-- 7. ENABLE REALTIME FOR CHAT DATA
-- ---------------------------------------------------------

do $$
declare
    v_table text;
begin
    foreach v_table in array array[
        'messages',
        'conversations',
        'conversation_members'
    ]
    loop
        if not exists (
            select 1
            from pg_catalog.pg_publication_tables
            where pubname = 'supabase_realtime'
              and schemaname = 'public'
              and tablename = v_table
        ) then
            execute pg_catalog.format(
                'alter publication supabase_realtime add table public.%I',
                v_table
            );
        end if;
    end loop;
end;
$$;

commit;
