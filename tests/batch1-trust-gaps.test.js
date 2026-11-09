import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");

test("post and comment edits require owner-scoped UPDATE policies", () => {
  const sql = read("../supabase/migrations/202611090001_batch1_edit_permissions_and_like_dedup.sql");
  assert.match(sql, /on public\.posts for update to authenticated\s+using \(auth\.uid\(\) = user_id\)/i);
  assert.match(sql, /on public\.post_comments for update to authenticated\s+using \(auth\.uid\(\) = user_id\)/i);
  assert.match(sql, /add column if not exists edited_at timestamptz/i);
});

test("post and comment editors verify that a row was actually updated", () => {
  const feed = read("../src/components/Feed.jsx");
  assert.match(feed, /\.select\("id,edited_at"\)\.maybeSingle\(\)/);
  assert.match(feed, /if \(!data\) throw new Error\("Post was not updated/);
  assert.match(feed, /if \(!data\) throw new Error\("Comment was not updated/);
});

test("read receipts are gated in the client and enforced by the database RPC", () => {
  const chat = read("../src/components/Chat.jsx");
  const app = read("../src/App.jsx");
  const sql = read("../supabase/migrations/202611090002_enforce_read_receipt_preferences.sql");
  assert.match(chat, /if \(!active \|\| readReceipts === false\) return/);
  assert.match(app, /readReceipts=\{chatPrefs\.readReceipts\}/);
  assert.match(sql, /read_receipts_enabled boolean not null default true/i);
  assert.match(sql, /p\.read_receipts_enabled = true/i);
});

test("unsupported alert and media preferences are disabled in settings", () => {
  const settings = read("../src/components/SettingsDestination.jsx");
  assert.match(settings, /function Toggle\(\{[^}]*disabled = false[^}]*\}\)[\s\S]*?disabled=\{disabled\}/);
  for (const key of ["messageAlerts", "activityAlerts", "likesAlerts", "commentAlerts", "mentionAlerts", "mediaPreview", "autoDownloadMedia"]) {
    assert.match(settings, new RegExp('<Toggle[^>]*checked=\\{safePrefs\\.' + key + '\\}[^>]*disabled=\\{true\\}'));
  }
});

test("like notification trigger is idempotent per recipient, actor and post", () => {
  const sql = read("../supabase/migrations/202611090001_batch1_edit_permissions_and_like_dedup.sql");
  assert.match(sql, /create unique index if not exists notifications_like_once_per_actor_post_uidx/i);
  assert.match(sql, /on conflict \(recipient_id, actor_id, post_id\)[\s\S]*?do nothing/i);
});
