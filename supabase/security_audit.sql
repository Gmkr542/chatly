-- Chatly 2.0 / Batch 1: read-only Supabase security audit.
-- Run this in the Supabase SQL Editor using a database owner account.
-- This script only reads PostgreSQL metadata; it does not alter schema, data, or policies.

-- 1) Public tables: verify that Row Level Security is enabled and forced where appropriate.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced,
  case
    when not c.relrowsecurity then 'CRITICAL: RLS is disabled'
    when not c.relforcerowsecurity then 'REVIEW: RLS is enabled but not forced'
    else 'RLS enabled and forced'
  end as audit_status
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
order by c.relname;

-- 2) Effective policy definitions for public tables.
-- Review permissive policies carefully: multiple permissive policies are OR-combined.
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check as check_expression
from pg_catalog.pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;

-- 3) Table-level privileges granted to anon/authenticated.
-- RLS does not replace the need to review these grants.
select
  table_schema,
  table_name,
  grantee,
  privilege_type,
  is_grantable
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

-- 4) Column-level privileges, especially important for profile and message fields.
select
  table_schema,
  table_name,
  column_name,
  grantee,
  privilege_type
from information_schema.column_privileges
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
order by table_name, column_name, grantee, privilege_type;

-- 5) SECURITY DEFINER routines: inspect search_path and execution grants.
-- SECURITY DEFINER routines should use a safe, fixed search_path and narrow EXECUTE grants.
select
  p.oid::regprocedure as routine,
  p.prosecdef as security_definer,
  p.proconfig as routine_settings,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.oid::regprocedure::text;

-- 6) Storage object policies: confirm avatar writes remain user-folder scoped.
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check as check_expression
from pg_catalog.pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
order by policyname;

-- 7) Profile privacy readiness: the current client preference is local-only.
-- This query confirms whether a server-side privacy column exists yet.
select
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'is_private'
  ) as server_side_is_private_column_exists;

-- Manual review checklist after running:
-- [ ] No public table containing user data has RLS disabled.
-- [ ] Profile and post visibility policies match the intended product privacy model.
-- [ ] Follow relationships cannot bypass private-account approval.
-- [ ] Message policies restrict reads and writes to conversation participants.
-- [ ] Group membership writes are routed through role-checked RPCs.
-- [ ] SECURITY DEFINER routines use a fixed safe search_path and narrow EXECUTE grants.
-- [ ] Avatar uploads are restricted to the authenticated user's own folder.
-- [ ] Compare these live results with the checked-in migrations; do not assume they match.
