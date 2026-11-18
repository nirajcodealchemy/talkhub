
-- Remove the unrestricted SELECT policy.
DROP POLICY IF EXISTS "Anyone can view all profiles"
ON public.profiles;

-- Allow users to view their own profile
-- and profiles of users in shared conversations.
CREATE POLICY "Users can view profiles in shared conversations"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.conversation_members AS viewer
    INNER JOIN public.conversation_members AS target
      ON viewer.conversation_id = target.conversation_id
    WHERE viewer.user_id = (SELECT auth.uid())
      AND target.user_id = profiles.id
  )
);
