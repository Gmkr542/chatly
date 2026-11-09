# Manually staged Supabase patches

Files in this directory are deliberately **not** discovered by `supabase db push`.

The production migration ledger was inspected and contains these three entries:

| Remote version | Remote name | Repository migration file |
| --- | --- | --- |
| `20261109075405` | `harden_private_follow_visibility` | `20261109075405_harden_private_follow_visibility.sql` |
| `20261109075633` | `restrict_trigger_function_execution` | `20261109075633_restrict_trigger_function_execution.sql` |
| `20261109080037` | `optimize_rls_policies_and_fk_indexes` | `20261109080037_optimize_rls_policies_and_fk_indexes.sql` |

Those three filenames now match the exact remote version/name pairs. The earlier duplicate local prefixes were removed by aligning these three files to their verified remote ledger versions.

**Important:** the rest of the repository's historical migrations are not represented by those three remote ledger entries. Their live application status has not been established merely by inspecting the ledger. They remain unresolved/pending for reconciliation (unmatched historical migrations remain pending); do not run `supabase db push`, `migration repair`, or a bulk migration replay until every remaining file has been compared with the actual production schema and a verified backup/staging restore is available.

## Staged reconciliation patch

Before applying `20261109_reconcile_live_schema.sql`:

1. Take a verified database backup.
2. Compare `supabase migration list --linked` with the actual live schema and every repository migration file.
3. Map every already-applied migration to its correct local version; do not mark unapplied migrations as applied merely to silence a mismatch.
4. Have any remaining migration-history repair reviewed and approved separately.
5. Review the SQL against the current schema, then apply it to a staging database first.
6. Verify effective table **and column** UPDATE privileges, RLS policies, group authorization helpers, consent policies, the consent timestamp trigger, and `get_group_ai_context` with separate authenticated test accounts.
7. Only after those checks should the patch be promoted to production under separate approval.

The patch is transactional and intended to be idempotent for the objects it owns. It changes database permissions and functions. It is not automatically applied by this repository change, and this commit does not apply SQL to any Supabase environment.
