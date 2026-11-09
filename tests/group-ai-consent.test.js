import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../supabase/migrations/202611080002_group_ai_consents.sql", import.meta.url), "utf8");

test("group AI consent is opt-in and missing rows cannot imply consent", () => {
  assert.match(migration, /consented boolean not null default false/);
  assert.match(migration, /primary key \(conversation_id, user_id\)/);
});

test("group AI consent is tied to an actual group membership", () => {
  assert.match(migration, /foreign key \(conversation_id, user_id\)[\s\S]*references public\.group_conversation_members/);
  assert.match(migration, /public\.is_group_member\(conversation_id, auth\.uid\(\)\)/);
});

test("members can only change their own consent and anonymous access is revoked", () => {
  assert.match(migration, /user_id = auth\.uid\(\)/);
  assert.match(migration, /revoke all on public\.group_ai_consents from anon/);
  assert.match(migration, /grant select, insert, update on public\.group_ai_consents to authenticated/);
});

test("consent records are removed when membership is removed", () => {
  assert.match(migration, /on delete cascade/);
});
