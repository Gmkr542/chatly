import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const handler = await readFile(new URL("../supabase/functions/group-ai-insights/index.ts", import.meta.url), "utf8");

test("group AI requires a verified authenticated user", () => {
  assert.match(handler, /request\.headers\.get\("Authorization"\)/);
  assert.match(handler, /userClient\.auth\.getUser\(\)/);
});

test("group AI checks caller membership and unanimous current-member consent before reading messages", () => {
  const membershipCheck = handler.indexOf('from("group_conversation_members")');
  const consentCheck = handler.indexOf('from("group_ai_consents")');
  const messageRead = handler.indexOf('from("group_messages")');
  assert.ok(membershipCheck >= 0 && consentCheck > membershipCheck && messageRead > consentCheck);
  assert.match(handler, /memberIds\.every\(\(memberId\) => consentByUser\.get\(memberId\) === true\)/);
  assert.match(handler, /member\.user_id === user\.id/);
});

test("provider credentials are server-only and requests are manual", () => {
  assert.match(handler, /Deno\.env\.get\("GROUP_AI_API_KEY"\)/);
  assert.doesNotMatch(handler, /VITE_GROUP_AI/);
  assert.match(handler, /request\.method !== "POST"/);
  assert.doesNotMatch(handler, /Deno\.cron|setInterval|schedule/i);
});

test("messages are bounded and AI output is returned without persistence", () => {
  assert.match(handler, /\.limit\(80\)/);
  assert.doesNotMatch(handler, /\.from\(["']group_ai_results/);
  assert.match(handler, /generated_at/);
});
