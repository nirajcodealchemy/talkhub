-- Fix: conversations.created_by references public.profiles, but some auth
-- users were created before the handle_new_user trigger existed (or their
-- profile row was removed). That made create_direct_conversation fail with:
--   insert or update on table "conversations" violates foreign key
--   constraint "conversations_created_by_fkey"

-- 1. Backfill a profile for every auth user that is missing one.
insert into public.profiles (id, full_name, avatar_url)
select
  u.id,
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name'
  ),
  u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
where not exists (
  select 1
  from public.profiles p
  where p.id = u.id
)
on conflict (id) do nothing;

-- 2. Make create_direct_conversation self-healing. If the caller's profile
-- is missing for any reason, create it before inserting the conversation.
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

  if p_other_user_id is null or p_other_user_id = v_user_id then
    raise exception 'Invalid recipient';
  end if;

  -- Ensure the current user always has a profile row (required by the
  -- conversations.created_by foreign key).
  insert into public.profiles (id, full_name, avatar_url)
  select
    u.id,
    coalesce(
      u.raw_user_meta_data ->> 'full_name',
      u.raw_user_meta_data ->> 'name'
    ),
    u.raw_user_meta_data ->> 'avatar_url'
  from auth.users u
  where u.id = v_user_id
  on conflict (id) do nothing;

  if not exists (
    select 1 from public.profiles where id = p_other_user_id
  ) then
    raise exception 'User not found';
  end if;

  v_first_user := least(v_user_id, p_other_user_id);
  v_second_user := greatest(v_user_id, p_other_user_id);

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      v_first_user::text || ':' || v_second_user::text,
      0
    )
  );

  select c.id
  into v_conversation_id
  from public.conversations c
  where c.is_group = false
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = c.id
        and cm.user_id = v_user_id
    )
    and exists (
      select 1 from public.conversation_members cm
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

  insert into public.conversations (is_group, created_by)
  values (false, v_user_id)
  returning id into v_conversation_id;

  insert into public.conversation_members (
    conversation_id, user_id, role
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
