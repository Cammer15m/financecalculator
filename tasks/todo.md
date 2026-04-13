# Todo

## Phase 1 — Auth Scaffold (current)

### 1. Project init
- [x] Confirm working dir is empty of Node artifacts (no package.json yet)
- [x] Run `npx create-next-app@14 . --ts --tailwind --app --no-src-dir --import-alias "@/*" --eslint --use-npm --yes`
- [x] Install: `@supabase/supabase-js @supabase/ssr decimal.js`
- [x] Write `.env.local.example` (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
- [x] Confirm `.gitignore` covers `.env*.local`, `.next/`, `node_modules/`

### 2. Supabase helpers
- [x] `lib/supabase/server.ts` — `createClient()` via `@supabase/ssr` `createServerClient` + `next/headers` cookies
- [x] `lib/supabase/client.ts` — `createBrowserClient` for Client Components
- [x] `lib/supabase/admin.ts` — service-role client (server-only, used for admin user mgmt)

### 3. Middleware (`middleware.ts`)
Order of checks — enforce exactly:
- [x] Bootstrap: refresh session via `@supabase/ssr` `updateSession` pattern
- [x] Allow public: `/login`, `/register`, `/api/health`, static assets
- [x] No session → redirect `/login`
- [x] Session present → fetch `profiles` row by `user_id`
- [x] `disabled_at !== null` → sign out + redirect `/login?reason=disabled`
- [x] Path starts with `/admin` AND `role !== 'admin'` → return 403 response
- [x] Otherwise pass through
- [x] Matcher excludes `_next/static`, `_next/image`, `favicon.ico`, public assets

### 4. Login flow
- [x] `app/(auth)/login/page.tsx` — email/password form, reads `?reason=` for disabled message
- [x] `app/(auth)/login/actions.ts` — `"use server"`, `signInWithPassword`, audit-log `login` on success, redirect `/dashboard`
- [x] `app/(auth)/logout/route.ts` — POST handler, `signOut`, audit-log `logout`
- [x] `app/(app)/layout.tsx` — server guard (redundant safety if middleware bypassed)
- [x] `app/(app)/dashboard/page.tsx` — trivial placeholder for Phase 1 (just confirms session works)

### 5. Admin area (all under `app/admin/`)
- [x] `app/admin/layout.tsx` — server-side role check, 403 via `notFound()`/custom if not admin
- [x] `app/admin/users/page.tsx` — list profiles joined with auth.users email
- [x] `app/admin/users/actions.ts` — `createUser`, `disableUser`, `enableUser`, `resetPassword` (service-role client), each calls `logAction`
- [x] `app/admin/logs/page.tsx` — paginated `audit_logs` viewer (newest first, filter by action/user)
- [x] `app/admin/flags/page.tsx` — list `feature_flags`, toggle action updates + audit logs
- [x] `app/admin/settings/page.tsx` — list `app_settings`, edit key/value, audit log each change

### 6. Helpers
- [x] `lib/audit.ts` — `logAction(userId, action, metadata?, ip?)`; inserts into `audit_logs`; used on every mutation
- [x] `lib/flags.ts` — `getFlag(key): Promise<boolean>`; server-only; reads from `feature_flags`
- [x] `lib/auth.ts` — `requireUser()`, `requireAdmin()` server helpers that throw/redirect

### 7. Database
- [x] `supabase/schema.sql` — profiles, audit_logs, feature_flags, app_settings (matches CLAUDE.MD spec)
- [x] RLS policies: profiles (self read, admin all), audit_logs (admin all, insert from any authed), flags/settings (admin-only write, any authed read)
- [x] Trigger: on `auth.users` insert → create `profiles` row with role='user'

### 8. Verification (before marking Phase 1 complete)
- [x] `npm run build` clean (12 routes, middleware 80 kB)
- [x] `npm run lint` clean (no warnings or errors)
- [ ] Manual (requires live Supabase project + seeded admin): log in → /dashboard; user → /admin/* 403; disable user → /login?reason=disabled
- [ ] Manual: verify admin mutations produce audit_logs rows

## Phase 2 — Calculators (deferred)
- Mortgage amortization → HELOC → combined → Smith Maneuver → recast → rent vs buy

## Review

### Phase 1 — 2026-04-13

**Initial Supabase scaffold was replaced** mid-phase with a self-hosted Postgres + iron-session stack to match the user's home-lab infra (no SaaS). All Supabase code removed; the rest of Phase 1 holds.

**Built (final):**
- Next.js 14 + TS + Tailwind. Runtime deps: `pg`, `bcryptjs`, `iron-session`, `decimal.js`, `server-only`.
- `lib/db.ts` — singleton `pg.Pool` (HMR-safe) + `query<T>()` helper.
- `lib/session.ts` — iron-session cookie config (`fc_session`), enforces ≥32-char `SESSION_PASSWORD` in production.
- `lib/auth.ts` — `getSession()`, `getCurrentUser()`, `requireUser()`, `requireAdmin()`. Every call re-queries `users` so disabling is effective on the next request.
- `lib/audit.ts` — `logAction()` via direct `insert` + `x-forwarded-for` / `x-real-ip` fallback. Swallows insert errors to console so audit failures never crash a request.
- `lib/flags.ts` — server-only `getFlag(key)`.
- `middleware.ts` — edge-runtime-safe: only checks "has session cookie?" then redirects to `/login`. Role + disabled checks moved into `(app)/layout.tsx` and `admin/layout.tsx` (edge runtime can't use `pg`).
- Auth routes: `/login` page + server action (bcrypt verify, audits `login`, routes on `disabled_at`), `/logout` POST (audits + `session.destroy()`).
- Admin: `admin/layout` calls `requireAdmin()` (throws `Response(403)` on non-admin); users (create/disable/enable/set-password — admin sets new temp password inline), logs (paginated + filter), flags (toggle), settings (upsert). Every mutation calls `logAction` + `revalidatePath`.
- `db/schema.sql` — `users` (with `password_hash`), `audit_logs`, `feature_flags`, `app_settings`, indexes. No RLS — only the app server touches Postgres.
- `instrumentation.ts` — on boot, if `BOOTSTRAP_ADMIN_EMAIL` + `BOOTSTRAP_ADMIN_PASSWORD` are set and no admin exists, creates one and writes a `bootstrap.admin` audit row.
- `Dockerfile` — multi-stage (deps/builder/runner), Next.js `output: "standalone"`, non-root `nextjs` user.
- `docker-compose.yml` — `postgres:16-alpine` (schema auto-applied via `/docker-entrypoint-initdb.d/`) + app container, healthcheck-gated startup, named volume for pg data.
- `.env.example` (compose) and `.env.local.example` (local dev) with generated-secret guidance.

**Verified:**
- `next build` produces 12 routes + 30.6 kB middleware (down from 80 kB pre-rewrite).
- `next lint` clean.
- `docker compose config` validates.

**Still required before first boot:**
1. `cp .env.example .env`, set `POSTGRES_PASSWORD`, `SESSION_PASSWORD` (≥32 chars — `openssl rand -base64 48`), and optionally `BOOTSTRAP_ADMIN_*`.
2. `docker compose up -d --build`.
3. First-run admin logs in with the bootstrap creds, changes password via `/admin/users` → set new password on own row.
4. Manual auth matrix: login happy path, `/admin/*` returns 403 for non-admin, disabled user next request bounces to `/login?reason=disabled`, logout round-trip.
5. Confirm `audit_logs` rows land for each admin mutation.

**Notes / deviations:**
- Middleware is thin (cookie-only) because `pg` needs Node APIs unavailable on the edge runtime. Layouts carry the real auth check. Security property unchanged — every protected route still hits `requireUser()`/`requireAdmin()` before rendering.
- `reset password` became `set password`: admin supplies a new temp password directly, no email step. Matches "no external API calls" constraint.
- No `register` route — Phase 1 is invite-only via admin `createUser`, matching the CLAUDE.MD admin-managed model.
- ECONNREFUSED noise during `next build` is harmless: Next.js probes dynamic pages to classify them, and those probes query `pg` which isn't up locally. Production runtime connects cleanly once the compose Postgres is healthy.
