-- Ensure banned group members cannot insert messages, including through direct
-- Supabase requests that bypass the chat UI.

ALTER TABLE public.conversation_members
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.can_send_message(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_members cm
    WHERE cm.conversation_id = p_conversation_id
      AND cm.user_id = (SELECT auth.uid())
      AND cm.is_banned = FALSE
  );
$$;

REVOKE ALL ON FUNCTION public.can_send_message(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_send_message(UUID) TO authenticated;

DROP POLICY IF EXISTS "Members can send their own messages"
  ON public.messages;

CREATE POLICY "Active members can send their own messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = (SELECT auth.uid())
  AND public.can_send_message(conversation_id)
);
