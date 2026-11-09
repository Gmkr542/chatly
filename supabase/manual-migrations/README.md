# Manually staged Supabase patches

Files in this directory are deliberately **not** discovered by `supabase db push`.

The live Chatly project currently reports only three migration-history entries, and their version identifiers do not match the corresponding migration filenames in the repository. The repository also contains older migration files that are not represented in the live ledger. Running the ordinary migration command before reconciling that history could replay historical schema changes.

Before applying `20261109_reconcile_live_schema.sql`:

1. Take a verified database backup.
2. Compare `supabase migration list --linked` with the actual live schema and the full repository migration directory.
3. Map every already-applied migration to its correct local version; do not mark unapplied migrations as applied merely to silence a mismatch.
4. Have the migration history reviewed and repaired in a separate, explicitly approved operation.
5. Review the SQL against the current schema, then apply it to a staging database first.
6. Verify the edit-column grants, RLS policies, group authorization helpers, consent policies, and `get_group_ai_context` RPC with separate authenticated test accounts.
7. Only after those checks should the patch be promoted to production under separate approval.

This patch is idempotent for the objects it owns, but it still changes database permissions and functions. It is not automatically applied by this repository change.
