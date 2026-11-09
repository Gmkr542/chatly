import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const helper = await readFile(new URL("../src/lib/groupAi.js", import.meta.url), "utf8");

test("group AI client only writes the current member's supplied consent choice", () => {
  assert.match(helper, /user_id: userId/);
  assert.match(helper, /consented: Boolean\(consented\)/);
  assert.match(helper, /onConflict: "conversation_id,user_id"/);
});

test("missing consent rows are treated as opt-out", () => {
  assert.match(helper, /consentByUser\.get\(userId\) === true/);
  assert.match(helper, /memberIds\.length > 0/);
});

test("AI requests use the authenticated Supabase Edge Function and send only a group ID", () => {
  assert.match(helper, /functions\.invoke\("group-ai-insights"/);
  assert.match(helper, /body: \{ conversationId \}/);
  assert.doesNotMatch(helper, /service_role|GROUP_AI_API_KEY|VITE_.*AI/);
});
