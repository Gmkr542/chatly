# Chatly App Manager 2.0 — Implementation Plan

## Goal
Build a standalone, mobile-first engineering workspace inside this repository, isolated from the Chatly social application. Use PR #48 as a reference implementation only; do not merge its stale branch or copy it wholesale.

## Baseline
- Build from current `main` at 9c1fcddcdfb2b5684a9fe7a2a26565cc04b19f6a.
- Current Chatly application is a React 19 + Vite 8 static frontend backed by Supabase.
- Render currently publishes the root `dist/` directory as a static site.
- PR #48 adds an isolated `app-manager/` app with React/Vite and an Express GitHub OAuth API, but its branch is substantially behind main.
- PR #48 is read-only in practice: diagnostics are real, while Fix/Optimize/Improve/Update are recommendation screens rather than execution workflows.

## Non-negotiable boundaries
1. Keep App Manager under `app-manager/`; do not change Chatly's root app routing, Supabase schema, RLS, auth, or database bindings as part of this work.
2. Do not change the existing Render static-site configuration or deploy App Manager as part of initial implementation.
3. Never expose GitHub OAuth tokens, client secrets, session secrets, or private credentials to browser code or Vite variables.
4. Start with read-only GitHub operations. Any future write operation must require a visible change preview and explicit user approval.
5. No automatic merge, force-push, or deployment.
6. Every health result must be backed by a real API response or executed check. Distinguish PASS, ISSUE, BLOCKED, and NOT RUN.

## Reuse from PR #48
- Mobile-first dark dashboard visual direction and six action categories.
- Express server separation from the Vite client.
- GitHub OAuth concept with HttpOnly encrypted session cookie.
- Repository selector and read-only GitHub API diagnostics.
- Session encryption tests and dedicated App Manager CI workflow, after hardening and adapting to current dependencies.

Do not reuse without review:
- Old package versions and lockfile assumptions.
- OAuth/session implementation without security review.
- The current action labels if they imply capabilities that are not implemented.
- Any stale assumptions about root repository scripts or deployment.

## Target architecture
- `app-manager/src/`: React UI, dashboard, repository selector, diagnostics, findings, activity/approval surfaces.
- `app-manager/server/`: Express API, OAuth/session middleware, GitHub API client, typed/validated route handlers.
- `app-manager/server/services/`: repository inspection, Actions/CI analysis, pull request analysis, security/dependency metadata.
- `app-manager/server/policies/`: explicit allowlist of permitted GitHub operations and approval gates.
- `app-manager/tests/`: server, session, route, and permission tests.
- `.github/workflows/app-manager.yml`: path-filtered tests and production build for App Manager changes only.

## Delivery phases

### Phase 0 — Foundation and threat model
- Confirm current main baseline and create an isolated feature branch.
- Define supported GitHub permissions and data retention.
- Harden OAuth state verification, cookie parsing, session expiry, logout, error handling, and request limits.
- Keep all GitHub tokens server-side. Use minimum OAuth scopes necessary for the read-only slice.
- Add tests for tampered/expired sessions, malformed cookies, missing configuration, and unauthorized requests.

### Phase 1 — Read-only engineering dashboard
- Repository discovery and selection.
- Latest commit and workflow status with links to evidence.
- Open issues and PRs, changed-file summaries, and branch divergence.
- Health checks that report PASS / ISSUE / BLOCKED / NOT RUN with timestamps and source URLs.
- No fabricated health percentage or generic green status when checks were unavailable.

### Phase 2 — Diagnose and recommend
- Diagnose failed workflow jobs using actual job/step logs where accessible.
- Identify affected files and correlate errors with commits/PRs.
- Produce prioritized recommendations with evidence, risk, and affected paths.
- Clearly label recommendations as proposals, not completed fixes.

### Phase 3 — Approved patch workflow
- Generate a patch on an isolated feature branch, never directly on main.
- Show complete diff, impacted files, test plan, and risk before asking for approval.
- Only after approval, apply the patch and run relevant tests/build in an isolated runner.
- Stop on any failed check; never claim a fix passed if it was not executed.
- Commit only approved, passing changes and report exact commit SHA.

### Phase 4 — PR and deployment controls
- PR creation and review summary only after explicit approval.
- Merge remains a separate explicit action and requires passing required checks.
- Render deployment remains user-controlled and is not part of automatic optimization.
- Provide audit history for proposed, approved, executed, failed, and committed actions.

## Security and reliability requirements
- OAuth state must be cryptographically verified with constant-time comparison.
- Cookie decoding must fail safely; malformed cookies must not crash requests.
- Use HttpOnly, Secure-in-production, SameSite cookies with strict path and expiry.
- Enforce session secret configuration at startup in production.
- Add CSRF protection for state-changing endpoints; validate Origin/Host where appropriate.
- Add rate limits to OAuth and API endpoints; set request timeouts and bounded response sizes.
- Never log tokens, cookies, authorization headers, or secrets.
- Use least-privilege GitHub scopes and inspect permissions before enabling writes.
- Validate owner/repository/path inputs and prevent path traversal.
- Add dependency auditing and lockfile-based reproducible installs.

## CI and acceptance criteria
- App Manager CI runs on changes under `app-manager/**` and its workflow.
- Unit tests cover session security, route authorization, validation, and failure handling.
- `npm test` and `npm run build` pass in the App Manager workspace.
- Root Chatly regression tests, root Vite build, and Docker build remain unchanged and pass.
- No secrets are added to source, build-time browser variables, or committed files.
- No Supabase schema, RLS, authentication, or root Render configuration changes.
- Documentation accurately describes what is implemented and what remains read-only.
- PR review confirms the feature is isolated and does not regress Chatly.

## First implementation batch
1. Port only the reviewed App Manager foundation from PR #48 onto a branch created from current main.
2. Update dependencies and create a lockfile in the App Manager workspace.
3. Harden OAuth/session handling and add negative-path tests before expanding features.
4. Keep all dashboard actions read-only until the approval-and-runner architecture exists.
5. Open a draft PR with CI evidence; do not merge or deploy.
