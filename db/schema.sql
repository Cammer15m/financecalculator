-- ============================================================================
-- Finance Calculator — Phase 1 schema (self-hosted Postgres)
-- Auto-applied on first Postgres init via /docker-entrypoint-initdb.d/.
-- Only the app server reads/writes this DB, so no RLS is required;
-- authorization is enforced in the Next.js layer before any query runs.
-- ============================================================================

create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  role text not null default 'user' check (role in ('user','admin')),
  display_name text,
  disabled_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists users_email_idx on users (email);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  action text not null,
  metadata jsonb,
  ip text,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_created_at_idx on audit_logs (created_at desc);
create index if not exists audit_logs_user_id_idx on audit_logs (user_id);
create index if not exists audit_logs_action_idx on audit_logs (action);

create table if not exists feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  enabled boolean not null default false,
  description text,
  updated_by uuid references users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists app_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value text,
  description text,
  updated_by uuid references users(id) on delete set null,
  updated_at timestamptz not null default now()
);
