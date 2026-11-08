// Regression coverage for the read-only Supabase security audit.
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
  assert.match(audit, /\bselect\b/i);
  assert.doesNotMatch(
    audit,
    /^\s*(insert\s+into|update\s+\w|delete\s+from|alter\s+|drop\s+|create\s+|grant\s+|revoke\s+|truncate\s+)/im,
    "audit SQL must not contain data or schema mutations"
  );
});
