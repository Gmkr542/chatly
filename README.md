# Chatly

Chatly is a responsive social and messaging application built with React, Vite, and Supabase. The frontend includes a social feed, profiles, discovery, notifications, direct and group conversations, and account settings. Supabase provides authentication, PostgreSQL data, storage, and realtime updates.

## Application architecture

- **Frontend:** React 19, Vite 8, and Lucide icons.
- **Backend services:** Supabase Auth, Postgres, Storage, and Realtime, accessed through the Supabase JavaScript client.
- **Application shell:** `src/App.jsx` owns session bootstrap, top-level destinations, profile flows, and shared application state.
- **Feature components:** `src/components/` contains authentication, feed, chat, group creation, profiles, Explore/search, notifications, history, and settings.
- **Shared utilities:** `src/lib/` contains the Supabase client, guarded browser-storage helpers, and settings-preference normalization.
- **Styling:** `src/styles.css`, `src/professional-ui.css`, feature polish stylesheets, and component-specific styles.
- **Database:** `supabase/schema.sql` is the bootstrap schema; `supabase/migrations/` contains incremental database changes and security hardening.
- **Tests:** `tests/` contains Node.js regression tests for core UI, account, chat, feed, Explore, settings, storage, and database-security contracts.
- **CI:** `.github/workflows/ci.yml` runs regression tests, a Vite production build, and a Docker image build for pull requests and pushes to `main`.

## Implemented application areas

- Email/password authentication and configured OAuth providers.
- Profile creation, editing, avatars, profile discovery, and follow relationships.
- Public/private profile behavior and follow requests.
- Feed creation, post privacy, likes, comments, sharing, bookmarks, and views.
- Direct messages, replies, editing/deletion, delivery/read state, and realtime updates.
- Group creation, membership, group messaging, and group-management RPCs.
- Activity notifications and unread filtering.
- Explore, people/post discovery, and YouTube video search.
- Settings destinations for privacy, notifications, appearance, chat preferences, and account management.

This inventory describes the codebase; actual production availability also depends on Supabase configuration, applied migrations, RLS policies, storage policies, and configured third-party API keys.

## Repository structure

```text
.
├── .github/workflows/ci.yml
├── docker/nginx/default.conf
├── public/
├── src/
│   ├── components/
│   │   └── explore/
│   ├── lib/
│   ├── App.jsx
│   ├── main.jsx
│   └── stylesheets
├── supabase/
│   ├── migrations/
│   ├── schema.sql
│   └── security_audit.sql
├── tests/
├── .env.example
├── Dockerfile
├── package.json
├── render.yaml
└── vite.config.js
```

## Local development

1. Create a project in [Supabase](https://supabase.com/).
2. Configure the database using the bootstrap schema and the applicable migrations. Read the migration-safety notes below before applying migration files.
3. Copy `.env.example` to `.env.local` and configure:

   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-publishable-or-anon-key
   VITE_YOUTUBE_API_KEY=your-restricted-youtube-api-key
   ```

   The YouTube key is optional unless YouTube discovery is being used. Restrict it to the Chatly site's referrers and the YouTube Data API v3.

4. Install dependencies and start the development server:

   ```bash
   npm install
   npm run dev
   ```

5. Run the repository checks:

   ```bash
   npm test
   npm run build
   ```

## Supabase migration safety

- `supabase/schema.sql` is a bootstrap schema, not a verified snapshot of the current production database. Existing deployments must be checked before applying it.
- Apply only migrations that are not already present in the target database's migration history. Test changes against a staging project before production.
- **Migration-version warning:** the current migration directory contains duplicate timestamp/version prefixes across multiple files. Reconcile these filenames with the actual Supabase migration history before using CLI migration commands or renaming any migration. Do not blindly rename, reorder, or replay migrations that may already have been applied.
- When using the SQL Editor, inspect each migration's dependencies and apply only the required unapplied SQL in a controlled order.
- Never delete production tables, data, RLS policies, triggers, RPCs, or storage policies as routine cleanup.
- The frontend build and source-level tests do not execute migrations or verify live database state, production RLS policies, realtime publication settings, or storage permissions.

## Environment and secrets

Only public browser configuration belongs in `VITE_*` variables. The Supabase publishable/anon key is intended for browser use when RLS is correctly configured. Never expose a Supabase service-role key, database password, or other private credential in frontend variables, Docker build arguments, or committed files.

## Render static-site deployment

The existing Render configuration is a static site:

- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Required environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Optional environment variable: `VITE_YOUTUBE_API_KEY`

The Render configuration uses an SPA rewrite to `index.html`. Deployment is not performed by the repository CI workflow.

## Docker production image

The repository also provides a multi-stage Docker image with a Vite build stage and Nginx runtime. Build with the public frontend configuration:

```bash
docker build \
  --build-arg VITE_SUPABASE_URL=https://your-project.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=your-public-anon-key \
  --build-arg VITE_YOUTUBE_API_KEY=your-restricted-youtube-api-key \
  -t chatly:local .
```

Run locally:

```bash
docker run --rm -p 8080:80 chatly:local
```

Open `http://localhost:8080`. The Nginx `/health` endpoint returns `200 ok`. The container hosts the frontend only; Supabase remains the managed authentication, database, storage, and realtime provider.

## Release verification

Before promoting a release, verify:

- [ ] GitHub Actions passes regression tests, the production build, and the Docker image build.
- [ ] The target environment has the required public Supabase variables.
- [ ] Required tables, indexes, RPCs, triggers, and migrations exist in the actual Supabase project.
- [ ] RLS and storage policies are tested with separate accounts and least-privilege access.
- [ ] Authentication, private profiles, follow requests, feed privacy, likes, comments, and bookmarks work.
- [ ] Direct/group messaging, replies, delivery/read state, and realtime subscriptions work across separate sessions.
- [ ] Notifications and unread counts update correctly.
- [ ] Mobile layouts, keyboard navigation, and reduced-motion behavior are checked in a browser.
- [ ] No private credentials are exposed in frontend assets or repository files.

A green build confirms compilation and repository regression checks. It does not prove production credentials, database schema, RLS, storage, realtime configuration, or end-to-end behavior are correct.
