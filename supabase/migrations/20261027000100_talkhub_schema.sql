
-- TalkHub initial schema migration
-- Assumed schema: adjust columns to match your brief if needed.

begin;

create extension if not exists pgcrypto;

-- 1. Profiles: one profile per Supabase Auth user
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Conversations
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  title text,
  is_group boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Conversation membership
create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

-- 4. Messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete restrict,
  content text,
  message_type text not null default 'text'
    check (message_type in ('text', 'image', 'file', 'system')),
  attachment_path text,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  constraint messages_content_or_attachment
    check (
      nullif(trim(content), '') is not null
      or attachment_path is not null
    )
);

-- 5. Per-user message deletion records (soft deletion)
create table public.message_deletions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  deleted_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

-- Useful indexes
create index conversations_created_by_idx
  on public.conversations(created_by);

create index conversation_members_user_idx
  on public.conversation_members(user_id);

create index messages_conversation_created_idx
  on public.messages(conversation_id, created_at desc);

create index messages_sender_idx
  on public.messages(sender_id);

create index message_deletions_user_idx
  on public.message_deletions(user_id);

-- Helper: checks whether the current authenticated user is a member.
-- SECURITY DEFINER avoids recursive membership RLS evaluation.
create or replace function public.is_member(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_member(uuid) from public, anon;
grant execute on function public.is_member(uuid) to authenticated;

-- Automatically create a profile on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Enable RLS on all five tables
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_deletions enable row level security;

-- PROFILES: never expose all profiles through an unrestricted policy
create policy "Users can view their own profile"
on public.profiles for select to authenticated
using (id = (select auth.uid()));

create policy "Users can update their own profile"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- CONVERSATIONS
create policy "Members can view conversations"
on public.conversations for select to authenticated
using (public.is_member(id));

create policy "Authenticated users can create conversations"
on public.conversations for insert to authenticated
with check (created_by = (select auth.uid()));

create policy "Creators can update conversations"
on public.conversations for update to authenticated
using (created_by = (select auth.uid()))
with check (created_by = (select auth.uid()));

-- CONVERSATION MEMBERS
create policy "Members can view membership"
on public.conversation_members for select to authenticated
using (
  user_id = (select auth.uid())
  or public.is_member(conversation_id)
);

-- Only the conversation creator can add members through the client.
-- Do not let users join arbitrary conversations by inserting themselves.
create policy "Creators can add conversation members"
on public.conversation_members for insert to authenticated
with check (
  exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and c.created_by = (select auth.uid())
  )
);

create policy "Creators can remove conversation members"
on public.conversation_members for delete to authenticated
using (
  exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and c.created_by = (select auth.uid())
  )
);

-- MESSAGES: members can read; a sender can insert as themselves.
-- Intentionally NO client UPDATE or DELETE policies.
create policy "Members can read messages"
on public.messages for select to authenticated
using (public.is_member(conversation_id));

create policy "Members can send their own messages"
on public.messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and public.is_member(conversation_id)
);

-- MESSAGE DELETIONS: each member manages only their own deletion record.
create policy "Users can view their own message deletions"
on public.message_deletions for select to authenticated
using (user_id = (select auth.uid()));

create policy "Members can hide messages for themselves"
on public.message_deletions for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.messages m
    where m.id = message_id
      and public.is_member(m.conversation_id)
  )
);

create policy "Users can remove their own deletion record"
on public.message_deletions for delete to authenticated
using (user_id = (select auth.uid()));

-- Storage buckets
insert into storage.buckets (id, name, public)
values
  ('chat-files', 'chat-files', false),
  ('avatars', 'avatars', true)
on conflict (id) do update
set public = excluded.public;

-- CHAT FILES: object path must be
-- <conversation-uuid>/<filename>
create policy "Members can read chat files"
on storage.objects for select to authenticated
using (
  bucket_id = 'chat-files'
  and case
    when (storage.foldername(name))[1] ~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then public.is_member(((storage.foldername(name))[1])::uuid)
    else false
  end
);

create policy "Members can upload chat files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'chat-files'
  and case
    when (storage.foldername(name))[1] ~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then public.is_member(((storage.foldername(name))[1])::uuid)
    else false
  end
);

create policy "Owners can delete their own chat files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'chat-files'
  and owner_id = (select auth.uid()::text)
  and case
    when (storage.foldername(name))[1] ~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then public.is_member(((storage.foldername(name))[1])::uuid)
    else false
  end
);

-- AVATARS: public reads; each user writes only inside their own
-- <user-uuid>/<filename> folder.
create policy "Anyone can read public avatars"
on storage.objects for select to public
using (bucket_id = 'avatars');

create policy "Users can upload their own avatars"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users can update their own avatars"
on storage.objects for update to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users can delete their own avatars"
on storage.objects for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- Enable Realtime for messages, if not already included.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end
$$;

commit;


