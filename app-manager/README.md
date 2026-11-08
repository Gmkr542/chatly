# Chatly App Manager 2.0

A standalone engineering workspace for inspecting and safely improving repositories. It is intentionally isolated under `app-manager/`; it does not change the Chatly frontend, Supabase schema, authentication, RLS policies, or Render deployment.

## Development status

**Foundation batch:** security primitives and their regression tests.

- Defensive cookie parsing: malformed percent-encoding cannot crash cookie parsing.
- Constant-time string comparison for untrusted OAuth state/signature values.
- Signed OAuth state verification helper.
- Focused Node.js tests and path-filtered GitHub Actions workflow.

The helper functions are not yet wired into an OAuth server. Do not treat OAuth integration or a complete App Manager UI as implemented until subsequent batches connect and test these primitives.

## Safety rules

- Begin with read-only repository inspection.
- Keep GitHub credentials server-side; never expose tokens in browser code or `VITE_*` variables.
- Any future write workflow must show the complete proposed diff and require explicit approval.
- Apply changes on isolated branches, run tests, and stop on failure.
- No automatic merge, force-push, or deployment.
- Report checks as PASS, ISSUE, BLOCKED, or NOT RUN with supporting evidence. Never invent health scores.

## Planned phases

1. Secure foundation and OAuth/session integration.
2. Read-only repository dashboard and evidence-based health checks.
3. CI diagnosis and prioritized recommendations.
4. Approved patches executed in an isolated runner with tests.
5. Explicitly approved PR and deployment controls.
