-- Chatly live-schema reconciliation patch.
--
-- IMPORTANT:
-- This file intentionally lives outside supabase/migrations because the live
-- migration history does not match the repository's historical filenames.
-- Reconcile the remote/local migration ledger before moving this SQL into the
-- normal migration directory or running `supabase db push`.
--
-- This script is idempotent for the objects it owns. Review against the live
-- schema and take a database backup before applying it to any environment.

BEGIN;

-- Frontend-required columns that are missing from the inspected live schema.
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

ALTER TABLE public.post_comments
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS read_receipts_enabled boolean NOT NULL DEFAULT true;

-- Editing is restricted to content and its edit timestamp. In particular,
-- authenticated users must not retain table-wide UPDATE access to ownership
-- or relationship columns.
REVOKE UPDATE ON TABLE public.posts FROM PUBLIC, anon, authenticated;
REVOKE UPDATE ON TABLE public.post_comments FROM PUBLIC, anon, authenticated;

-- Table-level REVOKE does not clear independently granted column privileges.
-- Remove every existing UPDATE column grant observed on these tables first.
REVOKE UPDATE (body, created_at, id, image_url, user_id, edited_at)
  ON TABLE public.posts FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (body, created_at, id, post_id, user_id, edited_at)
  ON TABLE public.post_comments FROM PUBLIC, anon, authenticated;

GRANT UPDATE (body, edited_at) ON TABLE public.posts TO authenticated;
GRANT UPDATE (body, edited_at) ON TABLE public.post_comments TO authenticated;

DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
CREATE POLICY "Users can update their own posts"
  ON public.posts
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own post comments" ON public.post_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.post_comments;
CREATE POLICY "Users can update their own post comments"
  ON public.post_comments
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Enforce the account owner's read-receipt preference in the trusted RPC,
-- not only in the client. The default preserves existing behavior.
CREATE OR REPLACE FUNCTION public.mark_message_read(p_message_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = '28000';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles AS profile_row
    WHERE profile_row.id = auth.uid()
      AND profile_row.read_receipts_enabled = true
  ) THEN
    RETURN;
  END IF;

  UPDATE public.messages
  SET read_at = pg_catalog.now()
  WHERE id = p_message_id
    AND recipient_id = auth.uid()
    AND read_at IS NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.mark_message_read(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_message_read(bigint) TO authenticated;

-- The helper functions are SECURITY DEFINER because they are used by RLS.
-- Never let a caller probe another user's membership/role by supplying an ID.
CREATE OR REPLACE FUNCTION public.is_group_member(
  p_conversation_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT CASE
    WHEN auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.group_conversation_members AS member_row
      WHERE member_row.conversation_id = p_conversation_id
        AND member_row.user_id = auth.uid()
    )
  END;
$function$;

CREATE OR REPLACE FUNCTION public.is_group_admin(
  p_conversation_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT CASE
    WHEN auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.group_conversation_members AS member_row
      WHERE member_row.conversation_id = p_conversation_id
        AND member_row.user_id = auth.uid()
        AND member_row.role IN ('owner', 'admin')
    )
  END;
$function$;

REVOKE ALL ON FUNCTION public.is_group_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_group_admin(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_admin(uuid, uuid) TO authenticated;

-- Restore the already-built Group AI feature's missing database prerequisites.
-- Missing consent rows are opt-out; consent is tied to an actual membership.
CREATE TABLE IF NOT EXISTS public.group_ai_consents (
  conversation_id uuid NOT NULL
    REFERENCES public.group_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  consented boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id),
  CONSTRAINT group_ai_consents_member_fk
    FOREIGN KEY (conversation_id, user_id)
    REFERENCES public.group_conversation_members(conversation_id, user_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS group_ai_consents_group_idx
  ON public.group_ai_consents (conversation_id, consented);

ALTER TABLE public.group_ai_consents ENABLE ROW LEVEL SECURITY;

-- The database, not the client, owns the consent-change timestamp.
CREATE OR REPLACE FUNCTION public.set_group_ai_consent_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_group_ai_consent_updated_at() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS group_ai_consents_set_updated_at
  ON public.group_ai_consents;
CREATE TRIGGER group_ai_consents_set_updated_at
  BEFORE UPDATE ON public.group_ai_consents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_group_ai_consent_updated_at();

DROP POLICY IF EXISTS "Group members can view AI consent status"
  ON public.group_ai_consents;
CREATE POLICY "Group members can view AI consent status"
  ON public.group_ai_consents
  FOR SELECT TO authenticated
  USING (public.is_group_member(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "Members manage their own group AI consent"
  ON public.group_ai_consents;
CREATE POLICY "Members manage their own group AI consent"
  ON public.group_ai_consents
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_group_member(conversation_id, auth.uid())
  );

DROP POLICY IF EXISTS "Members update their own group AI consent"
  ON public.group_ai_consents;
CREATE POLICY "Members update their own group AI consent"
  ON public.group_ai_consents
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND public.is_group_member(conversation_id, auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_group_member(conversation_id, auth.uid())
  );

REVOKE ALL ON TABLE public.group_ai_consents FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.group_ai_consents TO authenticated;

-- Return bounded group context only after checking the caller's membership
-- and unanimous current-member consent in the same database statement.
CREATE OR REPLACE FUNCTION public.get_group_ai_context(p_conversation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_messages jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = '28000';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.group_conversation_members AS member_row
    WHERE member_row.conversation_id = p_conversation_id
      AND member_row.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'You are not a member of this group' USING errcode = '42501';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.group_conversation_members AS member_row
    LEFT JOIN public.group_ai_consents AS consent_row
      ON consent_row.conversation_id = member_row.conversation_id
      AND consent_row.user_id = member_row.user_id
    WHERE member_row.conversation_id = p_conversation_id
      AND COALESCE(consent_row.consented, false) IS NOT TRUE
  ) THEN
    RAISE EXCEPTION 'Every current group member must opt in before AI analysis can run'
      USING errcode = '42501';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'sender', recent.sender_id,
        'text', left(recent.body, 4000),
        'sentAt', recent.created_at
      ) ORDER BY recent.created_at ASC
    ),
    '[]'::jsonb
  )
  INTO v_messages
  FROM (
    SELECT sender_id, body, created_at
    FROM public.group_messages
    WHERE conversation_id = p_conversation_id
    ORDER BY created_at DESC
    LIMIT 80
  ) AS recent;

  RETURN jsonb_build_object('messages', v_messages);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_group_ai_context(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_group_ai_context(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
