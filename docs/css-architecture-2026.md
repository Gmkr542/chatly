# Chatly CSS architecture — Batch 01

## Purpose

Keep the existing visual behavior stable while reducing cascade ambiguity and creating a safe migration path away from the legacy stylesheets. This batch is intentionally conservative: it does not wrap existing styles in CSS cascade layers, reorder imports, or broadly delete selectors.

## Current baseline (main, inspected 2026-11-09)

| Stylesheet | Approx. size | Lines | `!important` | Media queries |
|---|---:|---:|---:|---:|
| `src/styles.css` | 454 KB | 6,712 | 1,105 | 271 |
| `src/professional-ui.css` | 224 KB | 4,192 | 73 | 144 |
| `src/auth-polish.css` | 5.4 KB | 317 | 2 | 2 |
| `src/booster-polish.css` | 6.2 KB | 184 | 5 | 9 |
| `src/design-tokens.css` | 6.1 KB | 185 | 0 | 0 |
| `src/app-shell-2026.css` | 4.9 KB | 91 | 6 | 3 |
| `src/feed-chat-2026.css` | 8.6 KB | 304 | 1 | 3 |
| `src/destinations-2026.css` | 34 KB | 1,087 | 0 | 2 |

Selector repetition is substantial in the two legacy stylesheets. Repeated selectors are not automatically defects: many are intentional responsive or state overrides. They must be reviewed in context before consolidation.

## Ownership and import contract

1. `styles.css`: legacy reset, foundational layout and compatibility styles.
2. `professional-ui.css`: existing broad component polish and compatibility overrides.
3. `FeedHeader.css`, `booster-polish.css`, `auth-polish.css`: scoped feature/auth refinements.
4. `design-tokens.css`: canonical design tokens and theme-variable bridges.
5. `app-shell-2026.css`: 2026 global shell refinements.
6. `feed-chat-2026.css`: 2026 feed and messaging presentation.
7. `destinations-2026.css`: destination-specific presentation.

The import order in `src/main.jsx` is part of the current cascade contract. Do not reorder these files or introduce `@layer` around existing styles without visual regression coverage.

## Rules for future batches

- New shared values belong in `design-tokens.css`; do not create competing token vocabularies.
- New component styles must be scoped to the owning component/root class.
- Avoid new `!important` declarations.
- Do not append another global override file to fix a component-specific defect.
- Consolidate duplicate selectors only after checking source order, media-query scope, theme scope, and specificity.
- Preserve light/dark theme behavior, keyboard focus, reduced-motion support, and 44px touch targets.
- Keep CSS-only visual work separate from React state, Supabase queries, RLS, realtime subscriptions, and business logic.
- Run the test suite and production build after each batch; inspect mobile and desktop layouts before merging.

## Batch 01 changes

- Documented the stylesheet ownership and import-order contract in `src/main.jsx` and this file.
- Removed one redundant app-shell form-control font-family rule from `design-tokens.css`. The base and professional UI layers already apply inherited font styling, while the root font stack is defined centrally.
- No stylesheet was broadly reordered, no CSS cascade layers were introduced, and no feature behavior or database code was changed.

## Follow-up

Batch 02 should inspect the app-shell selectors and consolidate only verified duplicates. Feed and Chat visual work remains in the existing 2026 feature stylesheet and should be reviewed against current screenshots before further overrides are added.
