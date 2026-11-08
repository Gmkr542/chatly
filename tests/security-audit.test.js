import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const audit = await readFile(new URL("../supabase/security_audit.sql", import.meta.url), "utf8");

test("security audit inspects public-table RLS state", () => {
  assert.match(audit, /relrowsecurity/);
  assert.match(audit, /relforcerowsecurity/);
  assert.match(audit, /pg_catalog\.pg_class/);
});

test("security audit reports effective public-schema policies", () => {
  assert.match(audit, /pg_catalog\.pg_policies/);
  assert.match(audit, /using_expression/);
  assert.match(audit, /check_expression/);
});

test("security audit checks table and column grants", () => {
  assert.match(audit, /information_schema\.role_table_grants/);
  assert.match(audit, /information_schema\.column_privileges/);
  assert.match(audit, /'anon', 'authenticated'/);
});

test("security audit checks SECURITY DEFINER configuration and execution grants", () => {
  assert.match(audit, /prosecdef/);
  assert.match(audit, /proconfig/);
  assert.match(audit, /has_function_privilege/);
});

test("security audit checks storage policies and server-side profile privacy readiness", () => {
  assert.match(audit, /schemaname = 'storage'/);
  assert.match(audit, /column_name = 'is_private'/);
});

test("security audit contains only read-only SQL statements", () => {
  const executableLines = audit
    .split("\n")
    .map(line => line.trim())
    .filter(line => line && !line.startsWith("--"));
  assert.ok(executableLines.length > 0);
  assert.ok(executableLines.every(line => /^(select|from|join|where|and|or|order|case|when|then|else|end|as|on|group|having|left|inner|cross|with|\(|\))/i.test(line)),
    "audit SQL must remain read-only");
  assert.doesNotMatch(audit, /^\s*(insert|update|delete|alter|drop|create|grant|revoke|truncate)\b/im);
});
