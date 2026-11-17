
-- =========================================================
-- TalkHub: Fix Missing Chat Features
-- Migration: 20261117000100_fix_missing_chat_features.sql
-- =========================================================


-- 1. Add missing attachment metadata columns
-- ---------------------------------------------------------

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_name TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT,
  ADD COLUMN IF NOT EXISTS attachment_size BIGINT,
  ADD COLUMN IF NOT EXISTS media_group_id UUID;


-- 2. Add phone column to profiles
-- ---------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;


-- 3. Create group conversation RPC
-- ---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_group_conversation(
  p_title TEXT,
  p_member_ids UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_conversation_id UUID;
BEGIN

  -- Verify authentication
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;


  -- Validate group title
  IF NULLIF(TRIM(p_title), '') IS NULL THEN
    RAISE EXCEPTION 'Group title is required';
  END IF;


  -- Validate member list
  IF p_member_ids IS NULL
     OR cardinality(p_member_ids) = 0 THEN
    RAISE EXCEPTION 'At least one other member is required';
  END IF;


  -- Verify all requested members exist
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT DISTINCT u.member_id
      FROM unnest(p_member_ids) AS u(member_id)
      WHERE u.member_id IS NULL
         OR u.member_id = v_user_id
    ) invalid_members
  ) THEN
    RAISE EXCEPTION 'Invalid group member list';
  END IF;


  IF EXISTS (
    SELECT 1
    FROM (
      SELECT DISTINCT u.member_id
      FROM unnest(p_member_ids) AS u(member_id)
    ) requested
    LEFT JOIN public.profiles p
      ON p.id = requested.member_id
    WHERE p.id IS NULL
  ) THEN
    RAISE EXCEPTION 'One or more members do not exist';
  END IF;


  -- Create group conversation
  INSERT INTO public.conversations (
    title,
    is_group,
    created_by
  )
  VALUES (
    TRIM(p_title),
    TRUE,
    v_user_id
  )
  RETURNING id INTO v_conversation_id;


  -- Add creator and other members
  INSERT INTO public.conversation_members (
    conversation_id,
    user_id,
    role
  )
  SELECT
    v_conversation_id,
    members.member_id,
    CASE
      WHEN members.member_id = v_user_id
        THEN 'owner'
      ELSE 'member'
    END
  FROM (
    SELECT v_user_id AS member_id

    UNION

    SELECT DISTINCT u.member_id
    FROM unnest(p_member_ids) AS u(member_id)
  ) members;


  RETURN v_conversation_id;

END;
$$;


-- 4. Restrict group creation RPC permissions
-- ---------------------------------------------------------

REVOKE ALL ON FUNCTION
  public.create_group_conversation(TEXT, UUID[])
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.create_group_conversation(TEXT, UUID[])
TO authenticated;


-- 5. Allow senders to delete their own messages
-- ---------------------------------------------------------

DROP POLICY IF EXISTS
  "Senders can delete their own messages"
  ON public.messages;

CREATE POLICY "Senders can delete their own messages"
ON public.messages
FOR DELETE
TO authenticated
USING (
  sender_id = (SELECT auth.uid())
  AND public.is_member(conversation_id)
);


-- 6. Index for grouped media retrieval
-- ---------------------------------------------------------

CREATE INDEX IF NOT EXISTS messages_media_group_id_idx
ON public.messages(media_group_id)
WHERE media_group_id IS NOT NULL;


-- =========================================================
-- Migration completed
-- =========================================================
