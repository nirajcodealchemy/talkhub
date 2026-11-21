-- =========================================================
-- 1. ADD GROUP MEMBERS
-- =========================================================

CREATE OR REPLACE FUNCTION public.add_group_members(
  p_conversation_id uuid,
  p_member_ids uuid[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_role TEXT;
  v_new_count INTEGER;
  v_existing_count INTEGER;
  v_added_member_ids UUID[];
  v_actor_name TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be logged in.';
  END IF;

  PERFORM 1
  FROM public.conversations
  WHERE id = p_conversation_id
    AND is_group = TRUE
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group not found.';
  END IF;

  SELECT role
  INTO v_role
  FROM public.conversation_members
  WHERE conversation_id = p_conversation_id
    AND user_id = v_user_id
    AND is_banned = FALSE;

  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only group admins can add new members.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.conversation_members
    WHERE conversation_id = p_conversation_id
      AND is_banned = TRUE
      AND user_id = ANY(COALESCE(p_member_ids, ARRAY[]::UUID[]))
  ) THEN
    RAISE EXCEPTION 'One or more users are banned from this group.';
  END IF;

  SELECT COUNT(*)
  INTO v_existing_count
  FROM public.conversation_members
  WHERE conversation_id = p_conversation_id
    AND is_banned = FALSE;

  SELECT COUNT(DISTINCT requested.user_id)
  INTO v_new_count
  FROM unnest(COALESCE(p_member_ids, ARRAY[]::UUID[]))
    AS requested(user_id)
  WHERE requested.user_id IS NOT NULL
    AND requested.user_id <> v_user_id
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = requested.user_id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.conversation_members cm
      WHERE cm.conversation_id = p_conversation_id
        AND cm.user_id = requested.user_id
    );

  IF v_existing_count + v_new_count > 100 THEN
    RAISE EXCEPTION 'A group can have a maximum of 100 members.';
  END IF;

  SELECT COALESCE(
    NULLIF(TRIM(full_name), ''),
    NULLIF(TRIM(username), ''),
    'Someone'
  )
  INTO v_actor_name
  FROM public.profiles
  WHERE id = v_user_id;

  v_actor_name := COALESCE(v_actor_name, 'Someone');

  WITH inserted_members AS (
    INSERT INTO public.conversation_members (
      conversation_id,
      user_id,
      role
    )
    SELECT
      p_conversation_id,
      requested.user_id,
      'member'
    FROM (
      SELECT DISTINCT unnest(
        COALESCE(p_member_ids, ARRAY[]::UUID[])
      ) AS user_id
    ) requested
    WHERE requested.user_id IS NOT NULL
      AND requested.user_id <> v_user_id
      AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = requested.user_id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.conversation_members cm
        WHERE cm.conversation_id = p_conversation_id
          AND cm.user_id = requested.user_id
      )
    ON CONFLICT (conversation_id, user_id) DO NOTHING
    RETURNING user_id
  )
  SELECT
    COALESCE(ARRAY_AGG(user_id), ARRAY[]::UUID[]),
    COUNT(*)::INTEGER
  INTO v_added_member_ids, v_new_count
  FROM inserted_members;

  INSERT INTO public.messages (
    conversation_id,
    sender_id,
    content,
    message_type,
    is_system,
    system_event_type,
    metadata
  )
  SELECT
    p_conversation_id,
    v_user_id,
    v_actor_name || ' added ' ||
      COALESCE(
        NULLIF(TRIM(p.full_name), ''),
        NULLIF(TRIM(p.username), ''),
        'a member'
      ) || ' to the group',
    'text',
    TRUE,
    'member_added',
    jsonb_build_object(
      'actor_id', v_user_id,
      'target_user_id', added.user_id
    )
  FROM unnest(v_added_member_ids) AS added(user_id)
  JOIN public.profiles p ON p.id = added.user_id;

  RETURN v_new_count;
END;
$function$;


-- =========================================================
-- 2. BAN GROUP MEMBER
-- =========================================================

CREATE OR REPLACE FUNCTION public.ban_group_member(
  p_conversation_id uuid,
  p_member_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_admin_role text;
  v_target_role text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be logged in.';
  END IF;

  IF v_user_id = p_member_id THEN
    RAISE EXCEPTION 'You cannot ban yourself.';
  END IF;

  SELECT role
  INTO v_admin_role
  FROM public.conversation_members
  WHERE conversation_id = p_conversation_id
    AND user_id = v_user_id
    AND is_banned = false;

  IF v_admin_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only admins can ban members.';
  END IF;

  SELECT role
  INTO v_target_role
  FROM public.conversation_members
  WHERE conversation_id = p_conversation_id
    AND user_id = p_member_id
    AND is_banned = false;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'Member not found.';
  END IF;

  IF v_target_role = 'admin' THEN
    RAISE EXCEPTION 'You cannot ban another admin.';
  END IF;

  UPDATE public.conversation_members
  SET is_banned = true
  WHERE conversation_id = p_conversation_id
    AND user_id = p_member_id;

  RETURN true;
END;
$function$;


-- =========================================================
-- 3. UNBAN GROUP MEMBER
-- =========================================================

CREATE OR REPLACE FUNCTION public.unban_group_member(
  p_conversation_id uuid,
  p_member_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be logged in.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.conversation_members
    WHERE conversation_id = p_conversation_id
      AND user_id = v_user_id
      AND role = 'admin'
      AND is_banned = false
  ) THEN
    RAISE EXCEPTION 'Only admins can unban members.';
  END IF;

  UPDATE public.conversation_members
  SET is_banned = false
  WHERE conversation_id = p_conversation_id
    AND user_id = p_member_id
    AND is_banned = true;

  RETURN FOUND;
END;
$function$;


-- =========================================================
-- 4. PROMOTE GROUP MEMBER
-- =========================================================

CREATE OR REPLACE FUNCTION public.promote_group_member(
  p_conversation_id uuid,
  p_member_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be logged in.';
  END IF;

  PERFORM 1
  FROM public.conversations
  WHERE id = p_conversation_id
    AND is_group = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group not found.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.conversation_members
    WHERE conversation_id = p_conversation_id
      AND user_id = v_user_id
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can promote members.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.conversation_members
    WHERE conversation_id = p_conversation_id
      AND user_id = p_member_id
  ) THEN
    RAISE EXCEPTION 'Member not found.';
  END IF;

  UPDATE public.conversation_members
  SET role = 'admin'
  WHERE conversation_id = p_conversation_id
    AND user_id = p_member_id
    AND role = 'member';

  RETURN true;
END;
$function$;


-- =========================================================
-- 5. LEAVE GROUP CONVERSATION
-- =========================================================

CREATE OR REPLACE FUNCTION public.leave_group_conversation(
  p_conversation_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_role text;
  v_next_owner uuid;
  v_member_name text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be logged in.';
  END IF;

  PERFORM 1
  FROM public.conversations
  WHERE id = p_conversation_id
    AND is_group = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group not found.';
  END IF;

  SELECT role
  INTO v_role
  FROM public.conversation_members
  WHERE conversation_id = p_conversation_id
    AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'You are not a member of this group.';
  END IF;

  SELECT COALESCE(
    NULLIF(BTRIM(full_name), ''),
    NULLIF(BTRIM(username), ''),
    'A member'
  )
  INTO v_member_name
  FROM public.profiles
  WHERE id = v_user_id;

  v_member_name := COALESCE(v_member_name, 'A member');

  IF v_role = 'admin' THEN
    SELECT user_id
    INTO v_next_owner
    FROM public.conversation_members
    WHERE conversation_id = p_conversation_id
      AND user_id <> v_user_id
    ORDER BY joined_at ASC
    LIMIT 1
    FOR UPDATE;

    IF v_next_owner IS NULL THEN
      RAISE EXCEPTION
        'You are the only member. Use Delete and Exit instead.';
    END IF;

    UPDATE public.conversation_members
    SET role = 'admin'
    WHERE conversation_id = p_conversation_id
      AND user_id = v_next_owner;
  END IF;

  INSERT INTO public.messages (
    conversation_id,
    sender_id,
    content,
    message_type,
    is_system
  )
  VALUES (
    p_conversation_id,
    v_user_id,
    v_member_name || ' left the group',
    'text',
    true
  );

  DELETE FROM public.conversation_members
  WHERE conversation_id = p_conversation_id
    AND user_id = v_user_id;

  RETURN true;
END;
$function$;


-- =========================================================
-- 6. DELETE GROUP CONVERSATION
-- =========================================================

CREATE OR REPLACE FUNCTION public.delete_group_conversation(
  p_conversation_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be logged in.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.conversations
    WHERE id = p_conversation_id
      AND is_group = true
  ) THEN
    RAISE EXCEPTION 'Group not found.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.conversation_members
    WHERE conversation_id = p_conversation_id
      AND user_id = v_user_id
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only the group admin can delete this group.';
  END IF;

  DELETE FROM public.conversations
  WHERE id = p_conversation_id;

  RETURN true;
END;
$function$;


-- =========================================================
-- 7. CAN MANAGE GROUP AVATAR
-- =========================================================

CREATE OR REPLACE FUNCTION public.can_manage_group_avatar(
  p_conversation_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_members cm
    WHERE cm.conversation_id = p_conversation_id
      AND cm.user_id = (SELECT auth.uid())
      AND cm.role IN ('admin', 'owner')
      AND cm.is_banned = false
  );
$function$;


-- =========================================================
-- 8. UPDATE GROUP AVATAR
-- =========================================================

CREATE OR REPLACE FUNCTION public.update_group_avatar(
  p_conversation_id uuid,
  p_avatar_url text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.conversations c
    JOIN public.conversation_members cm
      ON cm.conversation_id = c.id
    WHERE c.id = p_conversation_id
      AND c.is_group = TRUE
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only group admins can change the avatar';
  END IF;

  UPDATE public.conversations
  SET avatar_url = p_avatar_url
  WHERE id = p_conversation_id
    AND is_group = TRUE;
END;
$function$;


-- =========================================================
-- 9. MARK CONVERSATION MESSAGES AS READ
-- =========================================================

CREATE OR REPLACE FUNCTION public.mark_conversation_messages_read(
  p_conversation_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  updated_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.conversation_members
    WHERE conversation_id = p_conversation_id
      AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You are not a member of this conversation';
  END IF;

  UPDATE public.messages
  SET read_at = NOW()
  WHERE conversation_id = p_conversation_id
    AND sender_id <> auth.uid()
    AND read_at IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  RETURN updated_count;
END;
$function$;


-- =========================================================
-- 10. MARK CONVERSATION MESSAGES AS DELIVERED
-- =========================================================

CREATE OR REPLACE FUNCTION public.mark_conversation_messages_delivered(
  p_conversation_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  updated_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.conversation_members
    WHERE conversation_id = p_conversation_id
      AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a conversation member';
  END IF;

  UPDATE public.messages
  SET delivered_at = NOW()
  WHERE conversation_id = p_conversation_id
    AND sender_id <> auth.uid()
    AND delivered_at IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  RETURN updated_count;
END;
$function$;


-- =========================================================
-- 11. SEARCH CHAT USERS WITH PAGINATION
-- This is the 3-argument overload.
-- Your existing 2-argument function remains separate.
-- =========================================================

CREATE OR REPLACE FUNCTION public.search_chat_users(
  p_query text DEFAULT '',
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  username text,
  full_name text,
  avatar_url text
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT
    p.id,
    p.username,
    p.full_name,
    p.avatar_url
  FROM public.profiles p
  WHERE
    auth.uid() IS NOT NULL
    AND p.id <> auth.uid()
    AND (
      NULLIF(TRIM(COALESCE(p_query, '')), '') IS NULL
      OR COALESCE(p.full_name, '') ILIKE '%' || TRIM(p_query) || '%'
      OR COALESCE(p.username, '') ILIKE '%' || TRIM(p_query) || '%'
      OR COALESCE(p.avatar_url, '') ILIKE '%' || TRIM(p_query) || '%'
    )
  ORDER BY p.full_name ASC NULLS LAST, p.id ASC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 10), 50))
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$function$;


-- =========================================================
-- FUNCTION PERMISSIONS
-- =========================================================

REVOKE ALL ON FUNCTION public.add_group_members(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_group_members(uuid, uuid[]) TO authenticated;

REVOKE ALL ON FUNCTION public.ban_group_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ban_group_member(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.unban_group_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unban_group_member(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.promote_group_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.promote_group_member(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.leave_group_conversation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_group_conversation(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.delete_group_conversation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_group_conversation(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.can_manage_group_avatar(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_group_avatar(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.update_group_avatar(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_group_avatar(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.mark_conversation_messages_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_conversation_messages_read(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.mark_conversation_messages_delivered(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_conversation_messages_delivered(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.search_chat_users(text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_chat_users(text, integer, integer) TO authenticated;