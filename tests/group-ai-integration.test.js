import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const chat = await readFile(new URL("../src/components/Chat.jsx", import.meta.url), "utf8");
const rpc = await readFile(new URL("../supabase/migrations/202611080003_group_ai_context_rpc.sql", import.meta.url), "utf8");
const edge = await readFile(new URL("../supabase/functions/group-ai-insights/index.ts", import.meta.url), "utf8");
test("group AI is integrated only for group conversations", () => { assert.match(chat, /aria-label="Group AI insights"/); assert.match(chat, /<GroupAIInsights/); assert.match(chat, /from\("messages"\)/); });
test("database context checks membership and unanimous consent before returning bounded messages", () => { assert.match(rpc, /auth\.uid\(\)/); assert.match(rpc, /left join public\.group_ai_consents/); assert.match(rpc, /coalesce\(c\.consented, false\) is not true/); assert.match(rpc, /limit 80/); });
test("edge function uses the authenticated RPC and no service-role credential", () => { assert.match(edge, /client\.rpc\("get_group_ai_context"/); assert.doesNotMatch(edge, /SUPABASE_SERVICE_ROLE_KEY/); });
