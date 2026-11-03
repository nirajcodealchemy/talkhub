-- Add status, delivered_at, read_at columns to messages table if not present
alter table public.messages
  add column if not exists status text not null default 'sent'
    check (status in ('sent', 'delivered', 'read')),
  add column if not exists delivered_at timestamptz,
  add column if not exists read_at timestamptz;

-- Allow conversation members to update messages (to update delivered_at, read_at, status)
drop policy if exists "Members can update message status" on public.messages;
create policy "Members can update message status"
on public.messages for update to authenticated
using (public.is_member(conversation_id))
with check (public.is_member(conversation_id));

-- Function to mark messages as read
create or replace function public.mark_messages_as_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  update public.messages
  set
    status = 'read',
    delivered_at = coalesce(delivered_at, now()),
    read_at = coalesce(read_at, now())
  where conversation_id = p_conversation_id
    and sender_id <> v_user_id
    and (read_at is null or status <> 'read');
end;
$$;

revoke all on function public.mark_messages_as_read(uuid) from public, anon;
grant execute on function public.mark_messages_as_read(uuid) to authenticated;

-- Function to mark messages as delivered
create or replace function public.mark_messages_as_delivered(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  update public.messages
  set
    status = case when read_at is not null then 'read' else 'delivered' end,
    delivered_at = coalesce(delivered_at, now())
  where conversation_id = p_conversation_id
    and sender_id <> v_user_id
    and delivered_at is null;
end;
$$;

revoke all on function public.mark_messages_as_delivered(uuid) from public, anon;
grant execute on function public.mark_messages_as_delivered(uuid) to authenticated;
