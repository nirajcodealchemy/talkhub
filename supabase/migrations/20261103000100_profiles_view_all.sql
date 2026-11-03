-- TalkHub needs to list registered users so people can start a conversation.
-- The original policy only allowed reading your own profile, which made the
-- people/user list appear empty.
--
-- Only display fields (id, username, full_name, avatar_url) are read by the
-- app; updates are still restricted to the owner by the existing
-- "Users can update their own profile" policy.

drop policy if exists "Users can view all profiles" on public.profiles;

create policy "Users can view all profiles"
on public.profiles for select to authenticated
using (true);
