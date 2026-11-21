
BEGIN;

-- Group avatar
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Message attachments
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

-- Message deletion
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS is_deleted_for_everyone boolean
NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- System messages
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS is_system boolean
NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS system_event_type text,
ADD COLUMN IF NOT EXISTS metadata jsonb;

COMMIT;
