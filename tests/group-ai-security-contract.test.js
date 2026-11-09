import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const edge = await readFile(
  new URL("../supabase/functions/group-ai-insights/index.ts", import.meta.url),
  "utf8"
);
const client = await readFile(
  new URL("../src/lib/groupAi.js", import.meta.url),
  "utf8"
);
const dialog = await readFile(
  new URL("../src/components/GroupAIInsights.jsx", import.meta.url),
  "utf8"
);

test("Group AI Edge Function requires a valid authenticated user", () => {
  assert.match(edge, /request\.method !== "POST"/);
  assert.match(edge, /Authorization/);
  assert.match(edge, /client\.auth\.getUser\(\)/);
  assert.match(edge, /Your session is not valid/);
});

test("Group AI validates the group identifier and obtains context only through the guarded RPC", () => {
  assert.match(edge, /const id = typeof payload\.conversationId === "string"/);
  assert.match(edge, /get_group_ai_context/);
  assert.doesNotMatch(edge, /\.from\(["']group_messages["']\)/);
  assert.doesNotMatch(edge, /service_role/i);
});

test("Group AI provider credentials remain server-side and provider output is bounded", () => {
  assert.match(edge, /Deno\.env\.get\(["']GROUP_AI_API_KEY["']\)/);
  assert.match(edge, /cleanText\(result\.summary, 4000\)/);
  assert.match(edge, /cleanStringList\(result\.topics, 8, 240\)/);
  assert.match(edge, /providerTranscript = transcript[\s\S]*?cleanText\(message\?\.text, 4000\)/);
  assert.match(edge, /content: JSON\\.stringify\\(providerTranscript\\)/);
  assert.doesNotMatch(edge, /content: JSON\\.stringify\\(transcript\\)/);
  assert.match(edge, /cleanActionItems\(result\.action_items\)/);
  assert.match(edge, /cleanStringList\(result\.unanswered_questions, 8, 500\)/);
  assert.doesNotMatch(client, /GROUP_AI_API_KEY|GROUP_AI_MODEL|GROUP_AI_API_URL/);
});

test("Group AI UI cannot request analysis until every current member has opted in", () => {
  assert.match(client, /allConsented: memberIds\.length > 0 && memberIds\.every/);
  assert.match(dialog, /if \(!state\?\.allConsented \|\| running\) return/);
  assert.match(dialog, /disabled=\{!state\?\.allConsented \|\| loading \|\| running \|\| saving\}/);
  assert.match(dialog, /New members must opt in separately/);
});
