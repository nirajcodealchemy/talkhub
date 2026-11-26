BEGIN;

-- =========================================================
-- 1. Message forwarding
-- =========================================================

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS forwarded_from_id uuid
    REFERENCES public.messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS messages_forwarded_from_id_idx
  ON public.messages(forwarded_from_id)
  WHERE forwarded_from_id IS NOT NULL;


-- =========================================================
-- 2. Message reactions
-- One reaction per user per message; upsert updates the emoji.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.message_reactions (
  message_id uuid NOT NULL
    REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT message_reactions_pkey
    PRIMARY KEY (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS message_reactions_user_id_idx
  ON public.message_reactions(user_id);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.message_reactions TO authenticated;


-- Members can read reactions on messages in their conversations.
DROP POLICY IF EXISTS "Members can view reactions"
  ON public.message_reactions;

CREATE POLICY "Members can view reactions"
ON public.message_reactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.messages m
    WHERE m.id = message_id
      AND public.is_member(m.conversation_id)
  )
);


-- Users can add a reaction as themselves.
DROP POLICY IF EXISTS "Members can add their own reactions"
  ON public.message_reactions;

CREATE POLICY "Members can add their own reactions"
ON public.message_reactions
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.messages m
    WHERE m.id = message_id
      AND public.is_member(m.conversation_id)
  )
);


-- Users can update their own reaction.
DROP POLICY IF EXISTS "Users can update their own reactions"
  ON public.message_reactions;

CREATE POLICY "Users can update their own reactions"
ON public.message_reactions
FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.messages m
    WHERE m.id = message_id
      AND public.is_member(m.conversation_id)
  )
);


-- Users can remove their own reaction.
DROP POLICY IF EXISTS "Users can delete their own reactions"
  ON public.message_reactions;

CREATE POLICY "Users can delete their own reactions"
ON public.message_reactions
FOR DELETE
TO authenticated
USING (user_id = (SELECT auth.uid()));


-- =========================================================
-- 3. RPC used by useMyTopReactions()
-- Returns the user's five most-used reaction emojis.
-- =========================================================

CREATE OR REPLACE FUNCTION public.get_my_top_reactions()
RETURNS TABLE (emoji text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT mr.emoji
  FROM public.message_reactions mr
  WHERE mr.user_id = (SELECT auth.uid())
  GROUP BY mr.emoji
  ORDER BY COUNT(*) DESC, MAX(mr.updated_at) DESC
  LIMIT 5;
$$;

REVOKE ALL ON FUNCTION public.get_my_top_reactions()
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_my_top_reactions()
  TO authenticated;

COMMIT;