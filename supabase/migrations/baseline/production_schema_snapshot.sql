-- TalkHub production schema snapshot
-- Captured from the user's Supabase inspection on 2026-11-17.
--
-- IMPORTANT:
-- This is a REFERENCE SNAPSHOT, NOT a migration to apply to the existing
-- production database. It contains CREATE statements for objects that already
-- exist in production. Keep it outside supabase/migrations/.
--
-- It is intended to document the inspected schema and support future
-- migration planning. Review against a fresh Supabase schema dump before using
-- it to recreate a project.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------------

CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  phone text
);

CREATE TABLE public.conversations (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  is_group boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.conversation_members (
  conversation_id uuid NOT NULL
    REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conversation_members_pkey PRIMARY KEY (conversation_id, user_id),
  CONSTRAINT conversation_members_role_check
    CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text]))
);

CREATE TABLE public.messages (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL
    REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE RESTRICT,
  content text,
  message_type text NOT NULL DEFAULT 'text',
  attachment_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  attachments jsonb DEFAULT '[]'::jsonb,
  attachment_name text,
  attachment_type text,
  attachment_size bigint,
  read_at timestamptz,
  delivered_at timestamptz,
  media_group_id uuid,
  is_deleted_for_everyone boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  CONSTRAINT messages_message_type_check
    CHECK (message_type = ANY (ARRAY['text'::text, 'image'::text, 'file'::text, 'system'::text])),
  CONSTRAINT messages_content_or_attachment
    CHECK (
      NULLIF(TRIM(BOTH FROM content), ''::text) IS NOT NULL
      OR attachment_path IS NOT NULL
    )
);

CREATE TABLE public.message_deletions (
  message_id uuid NOT NULL
    REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT message_deletions_pkey PRIMARY KEY (message_id, user_id)
);

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------

CREATE INDEX conversations_created_by_idx
  ON public.conversations USING btree (created_by);

CREATE INDEX conversation_members_user_idx
  ON public.conversation_members USING btree (user_id);

CREATE INDEX messages_conversation_created_idx
  ON public.messages USING btree (conversation_id, created_at DESC);

CREATE INDEX messages_sender_idx
  ON public.messages USING btree (sender_id);

CREATE INDEX idx_messages_media_group_id
  ON public.messages USING btree (media_group_id);

CREATE INDEX message_deletions_user_idx
  ON public.message_deletions USING btree (user_id);

-- This unique index duplicates the uniqueness already supplied by the
-- message_deletions primary key. It is retained here to match the inspected DB.
CREATE UNIQUE INDEX message_deletions_message_user_unique
  ON public.message_deletions USING btree (message_id, user_id);

-- ---------------------------------------------------------------------------
-- FUNCTIONS
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_member(p_conversation_id uuid)
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
  );
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name'
    ),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.search_chat_users(
  p_query text DEFAULT ''::text,
  p_limit integer DEFAULT 30
)
RETURNS TABLE(id uuid, username text, full_name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
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
  ORDER BY p.full_name ASC NULLS LAST
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 30), 50));
$function$;

CREATE OR REPLACE FUNCTION public.create_direct_conversation(p_other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_conversation_id uuid;
  v_first_user uuid;
  v_second_user uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_other_user_id IS NULL OR p_other_user_id = v_user_id THEN
    RAISE EXCEPTION 'Invalid recipient';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_other_user_id
  ) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  v_first_user := LEAST(v_user_id, p_other_user_id);
  v_second_user := GREATEST(v_user_id, p_other_user_id);

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      v_first_user::text || ':' || v_second_user::text,
      0
    )
  );

  SELECT c.id
  INTO v_conversation_id
  FROM public.conversations c
  WHERE c.is_group = false
    AND EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = c.id
        AND cm.user_id = v_user_id
    )
    AND EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = c.id
        AND cm.user_id = p_other_user_id
    )
    AND (
      SELECT count(*)
      FROM public.conversation_members cm
      WHERE cm.conversation_id = c.id
    ) = 2
  ORDER BY c.created_at ASC
  LIMIT 1;

  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  INSERT INTO public.conversations (is_group, created_by)
  VALUES (false, v_user_id)
  RETURNING id INTO v_conversation_id;

  INSERT INTO public.conversation_members (
    conversation_id, user_id, role
  )
  VALUES
    (v_conversation_id, v_user_id, 'owner'),
    (v_conversation_id, p_other_user_id, 'member');

  RETURN v_conversation_id;
END;
$function$;

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

CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE public.conversations
  SET updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- FUNCTION EXECUTION PRIVILEGES (as inspected)
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.create_direct_conversation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_direct_conversation(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_member(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.search_chat_users(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_chat_users(text, integer) TO authenticated, service_role;

-- These functions were observed with PUBLIC, anon, authenticated and service_role execute.
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_conversation_messages_read(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_conversation_timestamp() TO PUBLIC, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- TRIGGERS
-- ---------------------------------------------------------------------------

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER trigger_update_conversation_timestamp
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.update_conversation_timestamp();

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_deletions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can add conversation members"
ON public.conversation_members
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = conversation_members.conversation_id
      AND c.created_by = (SELECT auth.uid())
  )
);

CREATE POLICY "Creators can remove conversation members"
ON public.conversation_members
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = conversation_members.conversation_id
      AND c.created_by = (SELECT auth.uid())
  )
);

CREATE POLICY "Members can view membership"
ON public.conversation_members
FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR is_member(conversation_id)
);

CREATE POLICY "Authenticated users can create conversations"
ON public.conversations
FOR INSERT TO authenticated
WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Creators can update conversations"
ON public.conversations
FOR UPDATE TO authenticated
USING (created_by = (SELECT auth.uid()))
WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Members can view conversations"
ON public.conversations
FOR SELECT TO authenticated
USING (is_member(id));

CREATE POLICY "Members can hide messages for themselves"
ON public.message_deletions
FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.messages m
    WHERE m.id = message_deletions.message_id
      AND is_member(m.conversation_id)
  )
);

CREATE POLICY "Users can remove their own deletion record"
ON public.message_deletions
FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can view their own message deletions"
ON public.message_deletions
FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Members can read messages"
ON public.messages
FOR SELECT TO authenticated
USING (is_member(conversation_id));

CREATE POLICY "Members can send their own messages"
ON public.messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_id = (SELECT auth.uid())
  AND is_member(conversation_id)
);

CREATE POLICY "Senders can delete their own messages"
ON public.messages
FOR DELETE TO authenticated
USING (
  sender_id = (SELECT auth.uid())
  AND is_member(conversation_id)
);

CREATE POLICY "Senders can update their own messages"
ON public.messages
FOR UPDATE TO authenticated
USING (
  sender_id = auth.uid()
  AND is_member(conversation_id)
)
WITH CHECK (
  sender_id = auth.uid()
  AND is_member(conversation_id)
);

-- This second SELECT policy is present in the inspected production DB.
CREATE POLICY "conversation members can read messages"
ON public.messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.conversation_members cm
    WHERE cm.conversation_id = messages.conversation_id
      AND cm.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Members can view shared conversation profiles"
ON public.profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.conversation_members mine
    JOIN public.conversation_members other
      ON mine.conversation_id = other.conversation_id
    WHERE mine.user_id = auth.uid()
      AND other.user_id = profiles.id
  )
);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT TO authenticated
USING (id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- STORAGE BUCKETS
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars', 'avatars', true),
  ('chat-attachments', 'chat-attachments', false),

-- ---------------------------------------------------------------------------
-- STORAGE POLICIES
-- ---------------------------------------------------------------------------

CREATE POLICY "Anyone can read public avatars"
ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Conversation members can upload attachments"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND EXISTS (
    SELECT 1
    FROM public.conversation_members cm
    WHERE cm.conversation_id::text = (storage.foldername(objects.name))[1]
      AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Conversation members can view attachments"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND EXISTS (
    SELECT 1
    FROM public.conversation_members cm
    WHERE cm.conversation_id::text = (storage.foldername(objects.name))[1]
      AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Members can read chat files"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND CASE
    WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN is_member(((storage.foldername(name))[1])::uuid)
    ELSE false
  END
);

CREATE POLICY "Members can upload chat files"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND CASE
    WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN is_member(((storage.foldername(name))[1])::uuid)
    ELSE false
  END
);

CREATE POLICY "Owners can delete their own chat files"
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND owner_id = (SELECT (auth.uid())::text)
  AND CASE
    WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN is_member(((storage.foldername(name))[1])::uuid)
    ELSE false
  END
);

CREATE POLICY "Users can delete their own attachments"
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[2] = (auth.uid())::text
  AND EXISTS (
    SELECT 1
    FROM public.conversation_members cm
    WHERE cm.conversation_id::text = (storage.foldername(objects.name))[1]
      AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own avatars"
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT (auth.uid())::text)
);

CREATE POLICY "Users can update their own avatars"
ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT (auth.uid())::text)
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT (auth.uid())::text)
);

CREATE POLICY "Users can upload their own avatars"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT (auth.uid())::text)
);

COMMIT;

-- ---------------------------------------------------------------------------
-- INSPECTION NOTES / KNOWN LIMITATIONS
-- ---------------------------------------------------------------------------
-- 1. Production had 23 objects in chat-attachments and zero observed in chat-files.
-- 2. Bucket file_size_limit and allowed_mime_types were NULL for all three buckets.
-- 3. Production had no messages.status column in the inspected columns list.
-- 4. Production had no create_group_conversation function in the inspected function list.
-- 5. message_deletions_message_user_unique duplicates the primary-key index.
-- 6. The original production RLS policy definitions are reproduced from the
--    pg_policies output supplied by the user. Validate with a fresh dump before
--    using this snapshot to recreate any environment.
