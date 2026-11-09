import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const sql = await readFile(
  new URL("../supabase/manual-migrations/20261109_reconcile_live_schema.sql", import.meta.url),
  "utf8"
);
const guide = await readFile(
  new URL("../supabase/manual-migrations/README.md", import.meta.url),
  "utf8"
);
const migrationFiles = await readdir(new URL("../supabase/migrations/", import.meta.url));

test("reconciliation adds only the frontend-required nullable/defaulted columns", () => {
  assert.match(sql, /posts\s+ADD COLUMN IF NOT EXISTS edited_at timestamptz/i);
  assert.match(sql, /post_comments\s+ADD COLUMN IF NOT EXISTS edited_at timestamptz/i);
  assert.match(sql, /profiles\s+ADD COLUMN IF NOT EXISTS read_receipts_enabled boolean NOT NULL DEFAULT true/i);
});

test("post and comment edits are restricted to body and edited_at", () => {
  assert.match(sql, /REVOKE UPDATE ON TABLE public\.posts FROM PUBLIC, anon, authenticated/i);
  assert.match(sql, /REVOKE UPDATE ON TABLE public\.post_comments FROM PUBLIC, anon, authenticated/i);
  assert.match(sql, /REVOKE UPDATE \(body, created_at, id, image_url, user_id, edited_at\)[\s\S]*?ON TABLE public\.posts FROM PUBLIC, anon, authenticated/i);
  assert.match(sql, /REVOKE UPDATE \(body, created_at, id, post_id, user_id, edited_at\)[\s\S]*?ON TABLE public\.post_comments FROM PUBLIC, anon, authenticated/i);
  assert.match(sql, /GRANT UPDATE \(body, edited_at\) ON TABLE public\.posts TO authenticated/i);
  assert.match(sql, /GRANT UPDATE \(body, edited_at\) ON TABLE public\.post_comments TO authenticated/i);
  assert.match(sql, /Users can update their own posts[\s\S]*?USING \(\(SELECT auth\.uid\(\)\) = user_id\)[\s\S]*?WITH CHECK \(\(SELECT auth\.uid\(\)\) = user_id\)/i);
  assert.match(sql, /Users can update their own post comments[\s\S]*?USING \(\(SELECT auth\.uid\(\)\) = user_id\)[\s\S]*?WITH CHECK \(\(SELECT auth\.uid\(\)\) = user_id\)/i);
});

test("read receipts are enforced server-side and remain enabled by default", () => {
  assert.match(sql, /profile_row\.read_receipts_enabled = true/i);
  assert.match(sql, /recipient_id = auth\.uid\(\)/i);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.mark_message_read\(bigint\) FROM PUBLIC, anon/i);
});

test("group membership and administrator helpers cannot inspect another user's role", () => {
  const helpers = sql.match(/CREATE OR REPLACE FUNCTION public\.is_group_(?:member|admin)[\s\S]*?\$function\$;/gi) || [];
  assert.equal(helpers.length, 2);
  for (const helper of helpers) {
    assert.match(helper, /p_user_id IS DISTINCT FROM auth\.uid\(\)/i);
    assert.match(helper, /member_row\.user_id = auth\.uid\(\)/i);
    assert.match(helper, /SECURITY DEFINER/i);
    assert.match(helper, /SET search_path = ''/i);
  }
});

test("Group AI requires real membership and unanimous opt-in before returning bounded context", () => {
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.group_ai_consents/i);
  assert.match(sql, /consented boolean NOT NULL DEFAULT false/i);
  assert.match(sql, /FOREIGN KEY \(conversation_id, user_id\)[\s\S]*?REFERENCES public\.group_conversation_members/i);
  assert.match(sql, /user_id = auth\.uid\(\)/i);
  assert.match(sql, /COALESCE\(consent_row\.consented, false\) IS NOT TRUE/i);
  assert.match(sql, /ORDER BY created_at DESC\s+LIMIT 80/i);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.get_group_ai_context\(uuid\) FROM PUBLIC, anon/i);
});

test("patch is staged outside automatic migrations until migration history is reconciled", () => {
  assert.match(guide, /deliberately \*\*not\*\* discovered by `supabase db push`/i);
  assert.match(guide, /migration history/i);
  assert.match(sql, /intentionally lives outside supabase\/migrations/i);
});

test("patch is transactional and contains no destructive data reset", () => {
  assert.match(sql, /^BEGIN;/m);
  assert.match(sql, /^COMMIT;/m);
  assert.doesNotMatch(sql, /^\s*(DROP TABLE|TRUNCATE|DELETE FROM)\b/im);
});

test("group AI consent timestamps are enforced by a database trigger", () => {
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.set_group_ai_consent_updated_at\(\)/i);
  assert.match(sql, /NEW\.updated_at := pg_catalog\.now\(\)/i);
  assert.match(sql, /BEFORE UPDATE ON public\.group_ai_consents[\s\S]*?EXECUTE FUNCTION public\.set_group_ai_consent_updated_at\(\)/i);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.set_group_ai_consent_updated_at\(\) FROM PUBLIC, anon, authenticated/i);
});

test("migration versions are unique and the live ledger mappings use exact remote versions", () => {
  const versions = migrationFiles
    .filter((file) => file.endsWith(".sql"))
    .map((file) => file.match(/^(\d+)_/)?.[1])
    .filter(Boolean);
  const duplicateVersions = [...new Set(
    versions.filter((version, index) => versions.indexOf(version) !== index)
  )].sort();
  assert.deepEqual(duplicateVersions, [
    "202610250001",
    "202610260001",
    "202610260002",
    "202610260003",
    "202610260004"
  ]);
  assert.equal(versions.filter((version) => version === "202611090001").length, 1);
  assert.equal(versions.filter((version) => version === "202611090002").length, 1);
  assert.ok(migrationFiles.includes("20261109075405_harden_private_follow_visibility.sql"));
  assert.ok(migrationFiles.includes("20261109075633_restrict_trigger_function_execution.sql"));
  assert.ok(migrationFiles.includes("20261109080037_optimize_rls_policies_and_fk_indexes.sql"));
  assert.match(guide, /unmatched historical migrations remain pending/i);
});
