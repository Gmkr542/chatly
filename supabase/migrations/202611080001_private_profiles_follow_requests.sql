-- Chatly 2.0 Batch 1: private profiles, follow requests, and content visibility.
-- Existing accounts remain public by default; existing follows are preserved.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.follow_requests (
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT follow_requests_pkey PRIMARY KEY (requester_id, target_id),
  CONSTRAINT follow_requests_no_self CHECK (requester_id <> target_id)
);

CREATE INDEX IF NOT EXISTS follow_requests_target_created_idx
  ON public.follow_requests (target_id, created_at DESC);

CREATE INDEX IF NOT EXISTS follow_requests_requester_created_idx
  ON public.follow_requests (requester_id, created_at DESC);

ALTER TABLE public.follow_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.follow_requests FROM anon;
GRANT SELECT, INSERT, DELETE ON TABLE public.follow_requests TO authenticated;

DROP POLICY IF EXISTS "Users can read their follow requests" ON public.follow_requests;
CREATE POLICY "Users can read their follow requests"
  ON public.follow_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = target_id);

DROP POLICY IF EXISTS "Users can request private follows" ON public.follow_requests;
CREATE POLICY "Users can request private follows"
  ON public.follow_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = requester_id
    AND requester_id <> target_id
    AND EXISTS (
      SELECT 1
      FROM public.profiles AS target_profile
      WHERE target_profile.id = target_id
        AND target_profile.is_private = true
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.user_follows AS existing_follow
      WHERE existing_follow.follower_id = requester_id
        AND existing_follow.following_id = target_id
    )
  );

DROP POLICY IF EXISTS "Participants can remove follow requests" ON public.follow_requests;
CREATE POLICY "Participants can remove follow requests"
  ON public.follow_requests
  FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = target_id);

-- This SECURITY DEFINER helper avoids recursive RLS evaluation when post,
-- comment, and like policies need to check whether a viewer follows an owner.
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
        (SELECT NOT profile_row.is_private
         FROM public.profiles AS profile_row
         WHERE profile_row.id = p_profile_id),
        false
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_follows AS follow_row
        WHERE follow_row.follower_id = auth.uid()
          AND follow_row.following_id = p_profile_id
      )
  END;
$$;

REVOKE ALL ON FUNCTION public.can_view_profile_content(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_profile_content(uuid) TO authenticated;

-- Keep direct table-based follow inserts available for public accounts only.
-- Private accounts must be followed through the request RPC below.
DROP POLICY IF EXISTS "Users can follow as themselves" ON public.user_follows;
DROP POLICY IF EXISTS "Users can follow from their own account" ON public.user_follows;
CREATE POLICY "Users can follow public profiles"
  ON public.user_follows
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = follower_id
    AND follower_id <> following_id
    AND EXISTS (
      SELECT 1
      FROM public.profiles AS target_profile
      WHERE target_profile.id = following_id
        AND target_profile.is_private = false
    )
  );

-- One operation handles follow, unfollow, request, and request cancellation.
CREATE OR REPLACE FUNCTION public.toggle_follow(p_target_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_viewer_id uuid := auth.uid();
  v_is_private boolean;
BEGIN
  IF v_viewer_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;
  IF p_target_id IS NULL OR p_target_id = v_viewer_id THEN
    RAISE EXCEPTION 'A user cannot follow themselves';
  END IF;

  SELECT profile_row.is_private
    INTO v_is_private
  FROM public.profiles AS profile_row
  WHERE profile_row.id = p_target_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_follows
    WHERE follower_id = v_viewer_id AND following_id = p_target_id
  ) THEN
    DELETE FROM public.user_follows
    WHERE follower_id = v_viewer_id AND following_id = p_target_id;
    RETURN 'unfollowed';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.follow_requests
    WHERE requester_id = v_viewer_id AND target_id = p_target_id
  ) THEN
    DELETE FROM public.follow_requests
    WHERE requester_id = v_viewer_id AND target_id = p_target_id;
    RETURN 'cancelled';
  END IF;

  IF v_is_private THEN
    INSERT INTO public.follow_requests (requester_id, target_id)
    VALUES (v_viewer_id, p_target_id)
    ON CONFLICT (requester_id, target_id) DO NOTHING;
    RETURN 'requested';
  END IF;

  INSERT INTO public.user_follows (follower_id, following_id)
  VALUES (v_viewer_id, p_target_id)
  ON CONFLICT (follower_id, following_id) DO NOTHING;
  RETURN 'following';
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_follow(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_follow(uuid) TO authenticated;

-- Only the private profile owner can approve or reject a request addressed to them.
CREATE OR REPLACE FUNCTION public.respond_to_follow_request(
  p_requester_id uuid,
  p_accept boolean
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_target_id uuid := auth.uid();
  v_requester_id uuid;
BEGIN
  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  SELECT request_row.requester_id
    INTO v_requester_id
  FROM public.follow_requests AS request_row
  WHERE request_row.requester_id = p_requester_id
    AND request_row.target_id = v_target_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Follow request not found';
  END IF;

  IF COALESCE(p_accept, false) THEN
    INSERT INTO public.user_follows (follower_id, following_id)
    VALUES (v_requester_id, v_target_id)
    ON CONFLICT (follower_id, following_id) DO NOTHING;
  END IF;

  DELETE FROM public.follow_requests
  WHERE requester_id = v_requester_id
    AND target_id = v_target_id;

  RETURN CASE WHEN COALESCE(p_accept, false) THEN 'accepted' ELSE 'rejected' END;
END;
$$;

REVOKE ALL ON FUNCTION public.respond_to_follow_request(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_follow_request(uuid, boolean) TO authenticated;

-- Apply the same visibility rule to posts and all post-level interactions.
DROP POLICY IF EXISTS "Authenticated users can read posts" ON public.posts;
CREATE POLICY "Viewers can read visible posts"
  ON public.posts
  FOR SELECT TO authenticated
  USING (public.can_view_profile_content(user_id));

DROP POLICY IF EXISTS "Authenticated users can read comments" ON public.post_comments;
DROP POLICY IF EXISTS "Authenticated users can read post comments" ON public.post_comments;
CREATE POLICY "Viewers can read comments on visible posts"
  ON public.post_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.posts AS parent_post
      WHERE parent_post.id = post_id
        AND public.can_view_profile_content(parent_post.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can add their own comments" ON public.post_comments;
DROP POLICY IF EXISTS "Users can create their own post comments" ON public.post_comments;
CREATE POLICY "Users can comment on visible posts"
  ON public.post_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.posts AS parent_post
      WHERE parent_post.id = post_id
        AND public.can_view_profile_content(parent_post.user_id)
    )
  );

DROP POLICY IF EXISTS "Authenticated users can read post likes" ON public.post_likes;
CREATE POLICY "Viewers can read likes on visible posts"
  ON public.post_likes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.posts AS parent_post
      WHERE parent_post.id = post_id
        AND public.can_view_profile_content(parent_post.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can like as themselves" ON public.post_likes;
CREATE POLICY "Users can like visible posts as themselves"
  ON public.post_likes
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.posts AS parent_post
      WHERE parent_post.id = post_id
        AND public.can_view_profile_content(parent_post.user_id)
    )
  );

NOTIFY pgrst, 'reload schema';
