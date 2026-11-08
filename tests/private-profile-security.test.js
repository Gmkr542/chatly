import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../supabase/migrations/202611080001_private_profiles_follow_requests.sql", import.meta.url),
  "utf8"
);

test("private profiles default to public to preserve existing account behavior", () => {
  assert.match(migration, /ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false/i);
});

test("follow requests preserve existing follows and enforce participant ownership", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.follow_requests/i);
  assert.match(migration, /PRIMARY KEY \(requester_id, target_id\)/i);
  assert.match(migration, /auth\.uid\(\) = requester_id/i);
  assert.match(migration, /auth\.uid\(\) = target_id/i);
  assert.match(migration, /respond_to_follow_request/i);
  assert.match(migration, /toggle_follow/i);
  assert.match(migration, /ON CONFLICT \(follower_id, following_id\) DO NOTHING/i);
  assert.doesNotMatch(migration, /DROP TABLE|TRUNCATE|DELETE FROM public\.user_follows\s*;/i);
});

test("private content access is enforced for posts, comments, and likes", () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.can_view_profile_content/i);
  assert.match(migration, /USING \(public\.can_view_profile_content\(user_id\)\)/i);
  assert.match(migration, /Viewers can read comments on visible posts/i);
  assert.match(migration, /Viewers can read likes on visible posts/i);
  assert.match(migration, /Users can comment on visible posts/i);
  assert.match(migration, /Users can like visible posts as themselves/i);
  assert.match(migration, /Users can record their own visible post views/i);
  assert.match(migration, /public\.get_post_view_counts\(post_ids bigint\[\]\)/i);
  assert.match(migration, /public\.can_view_profile_content\(parent_post\.user_id\)/i);
});

test("privileged functions have fixed search paths and authenticated-only execution", () => {
  const functionBlocks = migration.match(/CREATE OR REPLACE FUNCTION[\s\S]*?\$\$;/gi) || [];
  assert.equal(functionBlocks.length, 5);
  for (const block of functionBlocks) {
    assert.match(block, /SECURITY DEFINER/i);
    assert.match(block, /SET search_path = ''/i);
  }
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.toggle_follow\(uuid\) FROM PUBLIC, anon/i);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.toggle_follow\(uuid\) TO authenticated/i);
});

test("profile and feed controls use the secure follow RPC", () => {
  const profile = readFileSync(new URL("../src/components/PublicProfile.jsx", import.meta.url), "utf8");
  const feed = readFileSync(new URL("../src/components/Feed.jsx", import.meta.url), "utf8");
  const settings = readFileSync(new URL("../src/components/SettingsDestination.jsx", import.meta.url), "utf8");
  assert.match(profile, /rpc\("toggle_follow"/);
  assert.match(profile, /isPrivate && !ownProfile && !isFollowing/);
  assert.match(feed, /rpc\("toggle_follow"/);
  assert.match(feed, /followRequested/);
  assert.match(settings, /update\(\{ is_private: Boolean\(nextValue\) \}\)/);
  assert.match(settings, /rpc\("respond_to_follow_request"/);
});
