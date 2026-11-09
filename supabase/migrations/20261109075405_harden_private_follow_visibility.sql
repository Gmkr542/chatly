-- Harden private-profile visibility and remove legacy permissive policies.
-- Pending follow requests must never grant access to private profile content.

CREATE OR REPLACE FUNCTION public.can_view_profile_content(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    WHEN p_profile_id = auth.uid() THEN true
    ELSE
      COALESCE(
        (
          SELECT NOT profile_row.is_private
          FROM public.profiles AS profile_row
          WHERE profile_row.id = p_profile_id
        ),
        false
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_follows AS follow_row
        WHERE follow_row.follower_id = auth.uid()
          AND follow_row.following_id = p_profile_id
          AND follow_row.status = 'accepted'
      )
  END;
$$;

REVOKE ALL ON FUNCTION public.can_view_profile_content(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_profile_content(uuid) TO authenticated;

-- This legacy policy allowed direct follow inserts without checking privacy.
-- Keep the intended public-profile-only policy and the toggle_follow RPC.
DROP POLICY IF EXISTS "Users can request follows as themselves" ON public.user_follows;

-- The following legacy policies use can_view_profile(), whose accepted-follow
-- semantics now match can_view_profile_content(). Keep the newer policies,
-- which consistently enforce the shared content-visibility helper.
DROP POLICY IF EXISTS "Users can view permitted posts" ON public.posts;
DROP POLICY IF EXISTS "Users can view permitted post comments" ON public.post_comments;
DROP POLICY IF EXISTS "Users can view permitted post likes" ON public.post_likes;

NOTIFY pgrst, 'reload schema';
