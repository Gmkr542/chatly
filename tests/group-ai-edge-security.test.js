import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const handler = await readFile(new URL("../supabase/functions/group-ai-insights/index.ts", import.meta.url), "utf8");
const contextRpc = await readFile(new URL("../supabase/migrations/202611080003_group_ai_context_rpc.sql", import.meta.url), "utf8");

test("group AI requires a verified authenticated user", () => {
  assert.match(handler, /request\.headers\.get\("Authorization"\)/);
  assert.match(handler, /client\.auth\.getUser\(\)/);
});

test("group AI delegates membership and unanimous consent checks to the authenticated context RPC", () => {
  assert.match(handler, /client\.rpc\("get_group_ai_context"/);
  assert.match(contextRpc, /m\.user_id = v_user_id/);
  assert.match(contextRpc, /left join public\.group_ai_consents/);
  assert.match(contextRpc, /coalesce\(c\.consented, false\) is not true/);
});

test("provider credentials are server-only and requests are manual", () => {
  assert.match(handler, /Deno\.env\.get\("GROUP_AI_API_KEY"\)/);
  assert.doesNotMatch(handler, /VITE_GROUP_AI|SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(handler, /request\.method !== "POST"/);
  assert.doesNotMatch(handler, /Deno\.cron|setInterval|schedule/i);
});

test("message context is bounded and generated results are not persisted", () => {
  assert.match(contextRpc, /order by created_at desc\s+limit 80/);
  assert.doesNotMatch(handler, /\.from\(["']group_ai_results/);
  assert.match(handler, /generated_at/);
});

test("provider action items are normalized and malformed entries are discarded", () => {
  assert.match(handler, /const cleanActionItems = \(value: unknown\)/);
  assert.match(handler, /typeof item !== "object" \|\| Array\.isArray\(item\)/);
  assert.match(handler, /cleanText\(\(item as Record<string, unknown>\)\.task, 500\)/);
  assert.match(handler, /if \(!task\) return \[\]/);
  assert.match(handler, /cleanText\(\(item as Record<string, unknown>\)\.owner, 120\)/);
  assert.match(handler, /action_items: cleanActionItems\(result\.action_items\)/);
});

test("provider text arrays reject non-strings and blank values and enforce limits", () => {
  assert.match(handler, /const cleanStringList = \(value: unknown, maxItems: number, maxLength: number\)/);
  assert.match(handler, /filter\(\(item\): item is string => item !== null\)\.slice\(0, maxItems\)/);
  assert.match(handler, /topics: cleanStringList\(result\.topics, 8, 240\)/);
  assert.match(handler, /unanswered_questions: cleanStringList\(result\.unanswered_questions, 8, 500\)/);
  assert.match(handler, /const summary = result && typeof result === "object" \? cleanText\(result\.summary, 4000\) : null/);
});
