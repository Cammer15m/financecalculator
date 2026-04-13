#!/bin/bash
set -e

# ── Config ────────────────────────────────────────────────────────────────────
PROJECT_NAME="mortgage-calculator"
TARGET="${1:-$HOME/Projects/$PROJECT_NAME}"

echo "📁 Creating project at: $TARGET"
mkdir -p "$TARGET"/{tasks,src}
cd "$TARGET"

# ── CLAUDE.md ─────────────────────────────────────────────────────────────────
cat > CLAUDE.md << 'EOF'
## Project: Free Financial Calculator
Mortgage, HELOC, recast, amortization, Smith Maneuver — no paywalls, no tracking, 100% client-side math.

## Stack
- Next.js 14 App Router + TypeScript
- Supabase (auth + Postgres) — no other DB
- Tailwind CSS
- Deployed to Vercel

## Auth Architecture
- Supabase Auth handles sessions (email/password only, no OAuth)
- Roles stored in `profiles.role` — values: `user` | `admin`
- Middleware at `middleware.ts` enforces route protection
- Route groups: `/(auth)` login/register, `/(app)` protected app, `/admin` admin-only

## Route Structure
```
/login
/register               ← toggle via feature flag (open vs invite-only)
/dashboard
/calculator/[type]
/admin/users            ← list, create, disable, reset password
/admin/logs             ← audit trail
/admin/flags            ← feature flag toggles
/admin/settings         ← app config key/value
```

## Database Schema (Supabase)
```sql
create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  role text not null default 'user' check (role in ('user','admin')),
  display_name text,
  disabled_at timestamptz,
  created_at timestamptz default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  action text not null,
  metadata jsonb,
  ip text,
  created_at timestamptz default now()
);

create table feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  enabled boolean default false,
  description text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz default now()
);

create table app_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value text,
  description text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz default now()
);
```

## Files to Scaffold
```
middleware.ts                 ← session + role + disabled check
lib/supabase/server.ts        ← createServerClient helper
lib/supabase/client.ts        ← createBrowserClient helper
lib/audit.ts                  ← logAction(userId, action, metadata)
lib/flags.ts                  ← getFlag(key): boolean
app/(auth)/login/page.tsx
app/(auth)/login/actions.ts
app/(app)/layout.tsx          ← session guard
app/admin/layout.tsx          ← admin role guard
app/admin/users/page.tsx
app/admin/logs/page.tsx
app/admin/flags/page.tsx
app/admin/settings/page.tsx
```

## Middleware Logic (enforce in this order)
1. Public paths (/login, /register, /api/health) → pass through
2. No session → redirect /login
3. Profile disabled → redirect /login?reason=disabled
4. /admin/* and role !== admin → 403
5. Pass through

## Security Rules
- Admin routes must 403 server-side — never just hide them in the UI
- Disabled users blocked on every request via middleware
- Feature flags checked server-side, not just in UI

## Audit Logging — MANDATORY
- Log every: login, logout, calculator run, admin action, settings change
- Use `logAction(userId, action, metadata)` — call it on every mutation
- Never skip audit logging for admin actions

## Financial Precision — CRITICAL
- NEVER use floating point for money. Use decimal.js.
- Rates stored as decimals (0.05 = 5%), displayed as percentages.
- Amortization must match bank output to the cent.
- Round half-up on final payment only.

## Smith Maneuver
- Canadian strategy: convert non-deductible mortgage debt → tax-deductible HELOC investment debt.
- Flow: mortgage payment made → principal reduces → HELOC re-borrowed up to that amount → invested.
- Track: cumulative HELOC drawn, investment portfolio value, tax refund loop, net worth vs. no-SM baseline.
- HELOC limit = original mortgage principal (user configurable).
- Tax refund: re-invest into HELOC paydown OR investments (user toggle).

## Calculators (priority order)
1. Mortgage amortization (fixed/variable, monthly/accelerated bi-weekly/weekly)
2. HELOC standalone
3. Mortgage + HELOC combined (readvanceable)
4. Smith Maneuver projector
5. Mortgage recast
6. Rent vs. buy

## Output Requirements
- Every calculator: amortization table (collapsible), summary stats, CSV export
- Charts: balance over time, interest vs. principal, net worth projection
- All inputs shareable via URL params

## No-Go
- No analytics, no telemetry beyond audit_logs
- No OAuth
- No external API calls
- No "consult a financial advisor" disclaimers in the UI
EOF

echo "✅ CLAUDE.md written"

# ── tasks/todo.md ─────────────────────────────────────────────────────────────
cat > tasks/todo.md << 'EOF'
# Todo

## Phase 1 — Auth Scaffold
- [ ] Init Next.js 14 project with TypeScript + Tailwind
- [ ] Install dependencies: @supabase/supabase-js @supabase/ssr decimal.js
- [ ] Create Supabase project + run schema SQL
- [ ] Add env vars to .env.local + Vercel
- [ ] lib/supabase/server.ts + client.ts
- [ ] middleware.ts (session, role, disabled checks)
- [ ] (auth)/login page + server action
- [ ] (app)/layout.tsx session guard
- [ ] admin/layout.tsx role guard
- [ ] admin/users — list, create, disable
- [ ] admin/logs — paginated audit trail
- [ ] admin/flags — toggle feature flags
- [ ] admin/settings — key/value config
- [ ] lib/audit.ts logAction helper
- [ ] lib/flags.ts getFlag helper

## Phase 2 — Calculators
- [ ] Mortgage amortization
- [ ] HELOC standalone
- [ ] Mortgage + HELOC combined
- [ ] Smith Maneuver projector
- [ ] Mortgage recast
- [ ] Rent vs. buy

## Review
<!-- Add notes after each phase -->
EOF

echo "✅ tasks/todo.md written"

# ── tasks/lessons.md ──────────────────────────────────────────────────────────
cat > tasks/lessons.md << 'EOF'
# Lessons Learned

## Rules
- Never use floating point for money calculations. Always decimal.js.
- Always check session + role server-side in middleware. Never trust client.
- Log every admin mutation. No exceptions.

## Mistakes & Fixes
<!-- Format: ### YYYY-MM-DD: What went wrong → What the rule is now -->
EOF

echo "✅ tasks/lessons.md written"

# ── .env.local template ───────────────────────────────────────────────────────
cat > .env.local.example << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
EOF

echo "✅ .env.local.example written"

# ── .gitignore ────────────────────────────────────────────────────────────────
cat > .gitignore << 'EOF'
.env.local
.env*.local
.next/
node_modules/
EOF

echo "✅ .gitignore written"

# ── Agent prompt ──────────────────────────────────────────────────────────────
cat > tasks/AGENT_PROMPT.md << 'EOF'
# Agent Prompt — paste this at the start of every Claude Code session

Read CLAUDE.md and tasks/lessons.md before doing anything.

We're building a client-side financial calculator suite with Next.js 14 + Supabase.

Current task: see tasks/todo.md — pick up from the first unchecked item.

Constraints:
- No floating point money math — use decimal.js
- Smith Maneuver logic must match documented Canadian tax strategy exactly
- Every calculator needs URL-shareable state via search params
- No backend beyond Supabase, no external API calls
- Audit log every login, logout, calculator run, and admin action

Write plan to tasks/todo.md before touching code. Check off items as you go.
EOF

echo "✅ tasks/AGENT_PROMPT.md written"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Project scaffold complete: $TARGET"
echo ""
echo "Next steps:"
echo "  1. cd $TARGET"
echo "  2. Create Supabase project at supabase.com"
echo "  3. Copy .env.local.example → .env.local and fill in keys"
echo "  4. Open Claude Code: claude"
echo "  5. Paste contents of tasks/AGENT_PROMPT.md to start"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
