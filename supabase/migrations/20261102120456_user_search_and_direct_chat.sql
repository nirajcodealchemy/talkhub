-- Search registered TalkHub users
create or replace function public.search_chat_users(
  p_query text default '',
  p_limit integer default 30
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
    auth.uid() is not null
    and p.id <> auth.uid()
    and (
      nullif(trim(coalesce(p_query, '')), '') is null
      or coalesce(p.full_name, '') ilike '%' || trim(p_query) || '%'
      or coalesce(p.username, '') ilike '%' || trim(p_query) || '%'
    )
  order by p.full_name asc nulls last
  limit greatest(1, least(coalesce(p_limit, 30), 50));
$$;

revoke all on function public.search_chat_users(text, integer)
from public, anon;

grant execute on function public.search_chat_users(text, integer)
to authenticated;


-- Create or retrieve a direct conversation
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
