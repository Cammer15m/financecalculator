## Project: Free Financial Calculator
Mortgage, HELOC, recast, amortization, Smith Maneuver. No paywalls, no tracking.

## Stack
- Next.js 14 App Router + TypeScript
- Postgres 16 (self-hosted, home-lab Docker VM)
- `pg` (node-postgres) for DB access — no ORM
- `iron-session` for encrypted session cookies
- `bcryptjs` for password hashing
- Tailwind CSS
- Deployed as a Docker container (Next.js standalone) alongside a Postgres container via docker compose

## Auth
- Email/password only, no OAuth
- Passwords hashed with bcrypt (cost 12)
- Sessions: signed+encrypted cookie (iron-session); stores `{ userId }` only
- Role + disabled_at re-checked from DB on every request — disabling a user is effective immediately
- Roles: `user` | `admin`
- Middleware enforces session + role + disabled checks on every request
- Admin routes 403 server-side — never just hidden client-side
- No self-registration: admins create users via `/admin/users`. "Reset password" = admin sets a new temp password (no SMTP dependency)

## Schema (all tables in one database, owned by the app role)
users: id, email (unique), password_hash, role, display_name, disabled_at, created_at
audit_logs: id, user_id, action, metadata (jsonb), ip, created_at
feature_flags: id, key, enabled, description, updated_by, updated_at
app_settings: id, key, value, description, updated_by, updated_at

No row-level security — the database is only reached from this app's server runtime. Authorization is enforced in `lib/auth.ts` + middleware before any query runs.

## Admin needs
- Manage users (create, disable, enable, set new password)
- Audit log viewer
- Feature flag toggles
- App settings (key/value)

## Financial Precision — CRITICAL
- Never floating point for money. Use decimal.js. No exceptions.
- Amortization must match bank output to the cent.

## Smith Maneuver
- Canadian strategy: mortgage principal paid → HELOC re-borrowed → invested
- Track: HELOC drawn, portfolio value, tax refund reinvestment, net worth vs baseline
- Tax refund toggle: reinvest into HELOC or investments

## Deployment
- `docker compose up -d` stands up Postgres + app
- Schema auto-applies on first Postgres init via `/docker-entrypoint-initdb.d/`
- First admin bootstrapped from `BOOTSTRAP_ADMIN_EMAIL` + `BOOTSTRAP_ADMIN_PASSWORD` env vars on app startup (only if no admin exists)

## No-Go
- No analytics or telemetry beyond audit_logs
- No external API calls
- No SaaS backend (Supabase, Firebase, Auth0, etc.) — all self-hosted
- No financial disclaimer UI copy
