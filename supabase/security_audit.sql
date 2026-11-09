-- Chatly 2.0 / Batch 1: consolidated read-only Supabase security audit.
-- Run in Supabase SQL Editor using a database owner account.
-- IMPORTANT: this is one SELECT statement so the SQL Editor returns every
-- audit section in a single result grid. It does not alter schema, data, or policies.

with audit_rows(section, sort_order, details) as (
  -- 1) Public tables: RLS enabled / forced.
  select
    '01_rls_tables',
    c.relname,
    jsonb_build_object(
      'schema_name', n.nspname,
      'table_name', c.relname,
      'rls_enabled', c.relrowsecurity,
      'rls_forced', c.relforcerowsecurity,
      'audit_status', case
        when not c.relrowsecurity then 'CRITICAL: RLS is disabled'
        when not c.relforcerowsecurity then 'REVIEW: RLS enabled but not forced'
        else 'RLS enabled and forced'
      end
    )
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p')

  union all

  -- 2) Effective public policies. Permissive policies are OR-combined.
  select
    '02_public_policies',
    p.tablename || ':' || p.policyname,
    jsonb_build_object(
      'schema_name', p.schemaname,
      'table_name', p.tablename,
      'policy_name', p.policyname,
      'permissive', p.permissive,
      'roles', p.roles,
      'command', p.cmd,
      'using_expression', p.qual,
      'check_expression', p.with_check
    )
  from pg_catalog.pg_policies p
  where p.schemaname = 'public'

  union all

  -- 3) Table-level grants to API roles.
  select
    '03_table_grants',
    g.table_name || ':' || g.grantee || ':' || g.privilege_type,
    jsonb_build_object(
      'table_schema', g.table_schema,
      'table_name', g.table_name,
      'grantee', g.grantee,
      'privilege_type', g.privilege_type,
      'is_grantable', g.is_grantable
    )
  from information_schema.role_table_grants g
  where g.table_schema = 'public'
    and g.grantee in ('anon', 'authenticated')

  union all

  -- 4) Column-level grants to API roles.
  select
    '04_column_grants',
    g.table_name || ':' || g.column_name || ':' || g.grantee || ':' || g.privilege_type,
    jsonb_build_object(
      'table_schema', g.table_schema,
      'table_name', g.table_name,
      'column_name', g.column_name,
      'grantee', g.grantee,
      'privilege_type', g.privilege_type
    )
  from information_schema.column_privileges g
  where g.table_schema = 'public'
    and g.grantee in ('anon', 'authenticated')

  union all

  -- 5) SECURITY DEFINER routines and execute grants.
  select
    '05_routines',
    p.oid::regprocedure::text,
    jsonb_build_object(
      'routine', p.oid::regprocedure::text,
      'security_definer', p.prosecdef,
      'routine_settings', p.proconfig,
      'anon_can_execute', has_function_privilege('anon', p.oid, 'EXECUTE'),
      'authenticated_can_execute', has_function_privilege('authenticated', p.oid, 'EXECUTE')
    )
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'

  union all

  -- 6) Storage object policies.
  select
    '06_storage_policies',
    p.policyname,
    jsonb_build_object(
      'schema_name', p.schemaname,
      'table_name', p.tablename,
      'policy_name', p.policyname,
      'permissive', p.permissive,
      'roles', p.roles,
      'command', p.cmd,
      'using_expression', p.qual,
      'check_expression', p.with_check
    )
  from pg_catalog.pg_policies p
  where p.schemaname = 'storage' and p.tablename = 'objects'

  union all

  -- 7) Server-side profile privacy column. Keep the existing output key.
  select
    '07_profile_privacy_column',
    'profiles.is_private',
    jsonb_build_object(
      'server_side_is_private_column_exists',
      exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'profiles'
          and column_name = 'is_private'
      )
    )
)
select section, details
from audit_rows
order by section, sort_order;
