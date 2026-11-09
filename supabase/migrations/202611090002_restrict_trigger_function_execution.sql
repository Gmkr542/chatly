-- Trigger and event-trigger entrypoints must not be callable as RPC functions.
-- PostgreSQL invokes attached triggers without requiring EXECUTE from the DML caller.
REVOKE ALL ON FUNCTION public.create_follow_notification() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_post_comment_notification() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_post_like_notification() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_follow_request_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
