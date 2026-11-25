ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS is_deleted_for_everyone boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.get_user_conversations()
RETURNS TABLE (
  conversation_id uuid,
  title text,
  is_group boolean,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  last_message_id uuid,
  last_message_content text,
  last_message_type text,
  last_message_sender_id uuid,
  last_message_at timestamptz,
  last_message_delivered_at timestamptz,
  last_message_read_at timestamptz,
  last_message_deleted_for_everyone boolean,
  last_message_deleted_for_me boolean,
  unread_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT
    c.id,
    c.title,
    c.is_group,
    c.created_by,
    c.created_at,
    c.updated_at,

    lm.id,
    lm.content,
    lm.message_type,
    lm.sender_id,
    lm.created_at,
    lm.delivered_at,
    lm.read_at,
    COALESCE(lm.is_deleted_for_everyone, false),

    CASE
      WHEN lm.id IS NULL THEN false
      ELSE EXISTS (
        SELECT 1
        FROM public.message_deletions md
        WHERE md.message_id = lm.id
          AND md.user_id = auth.uid()
      )
    END,

    COALESCE(uc.unread_count, 0)::bigint

  FROM public.conversation_members cm

  JOIN public.conversations c
    ON c.id = cm.conversation_id

  LEFT JOIN LATERAL (
    SELECT
      m.id,
      m.content,
      m.message_type,
      m.sender_id,
      m.created_at,
      m.delivered_at,
      m.read_at,
      m.is_deleted_for_everyone
    FROM public.messages m
    WHERE m.conversation_id = c.id
      AND m.is_deleted_for_everyone = false
      AND NOT EXISTS (
        SELECT 1
        FROM public.message_deletions md
        WHERE md.message_id = m.id
          AND md.user_id = auth.uid()
      )
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT 1
  ) lm ON true

  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS unread_count
    FROM public.messages m
    WHERE m.conversation_id = c.id
      AND m.sender_id <> auth.uid()
      AND m.read_at IS NULL
      AND m.is_deleted_for_everyone = false
      AND NOT EXISTS (
        SELECT 1
        FROM public.message_deletions md
        WHERE md.message_id = m.id
          AND md.user_id = auth.uid()
      )
  ) uc ON true

  WHERE cm.user_id = auth.uid()

  ORDER BY COALESCE(lm.created_at, c.updated_at) DESC;
$function$;

REVOKE ALL ON FUNCTION public.get_user_conversations()
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_user_conversations()
TO authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_messages_unread_conversation
ON public.messages (conversation_id, sender_id)
WHERE read_at IS NULL
  AND is_deleted_for_everyone = false;
