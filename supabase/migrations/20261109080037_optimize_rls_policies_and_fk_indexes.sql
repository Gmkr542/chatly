-- Add covering indexes for the foreign keys identified by Supabase's advisor.
CREATE INDEX IF NOT EXISTS group_conversations_created_by_idx ON public.group_conversations (created_by);
CREATE INDEX IF NOT EXISTS group_messages_reply_to_idx ON public.group_messages (reply_to);
CREATE INDEX IF NOT EXISTS group_messages_sender_id_idx ON public.group_messages (sender_id);
CREATE INDEX IF NOT EXISTS messages_recipient_id_idx ON public.messages (recipient_id);
CREATE INDEX IF NOT EXISTS notifications_actor_id_idx ON public.notifications (actor_id);
CREATE INDEX IF NOT EXISTS notifications_comment_id_idx ON public.notifications (comment_id);
CREATE INDEX IF NOT EXISTS notifications_post_id_idx ON public.notifications (post_id);
CREATE INDEX IF NOT EXISTS post_comments_user_id_idx ON public.post_comments (user_id);
CREATE INDEX IF NOT EXISTS post_likes_user_id_idx ON public.post_likes (user_id);
CREATE INDEX IF NOT EXISTS post_reports_reporter_id_idx ON public.post_reports (reporter_id);
CREATE INDEX IF NOT EXISTS post_views_user_id_idx ON public.post_views (user_id);
CREATE INDEX IF NOT EXISTS posts_user_id_idx ON public.posts (user_id);
CREATE INDEX IF NOT EXISTS saved_posts_post_id_idx ON public.saved_posts (post_id);

-- Convert per-row auth.uid() policy calls into initplan-safe scalar subqueries.
DO $$
DECLARE
  policy_row record;
  new_qual text;
  new_check text;
  role_list text;
  policy_mode text;
BEGIN
  FOR policy_row IN
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (coalesce(qual, '') ~* 'auth\.uid\(\)' AND coalesce(qual, '') !~* 'select[[:space:]]+auth\.uid\(\)')
        OR
        (coalesce(with_check, '') ~* 'auth\.uid\(\)' AND coalesce(with_check, '') !~* 'select[[:space:]]+auth\.uid\(\)')
      )
  LOOP
    new_qual := policy_row.qual;
    new_check := policy_row.with_check;
    IF new_qual IS NOT NULL THEN
      new_qual := regexp_replace(new_qual, 'auth\.uid\(\)', '(select auth.uid())', 'gi');
    END IF;
    IF new_check IS NOT NULL THEN
      new_check := regexp_replace(new_check, 'auth\.uid\(\)', '(select auth.uid())', 'gi');
    END IF;
    role_list := array_to_string(policy_row.roles, ', ');
    policy_mode := CASE WHEN policy_row.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END;

    EXECUTE format('DROP POLICY %I ON %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
    EXECUTE format(
      'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename,
      policy_mode,
      policy_row.cmd,
      role_list,
      CASE WHEN new_qual IS NOT NULL THEN format(' USING (%s)', new_qual) ELSE '' END,
      CASE WHEN new_check IS NOT NULL THEN format(' WITH CHECK (%s)', new_check) ELSE '' END
    );
  END LOOP;
END
$$;

NOTIFY pgrst, 'reload schema';
