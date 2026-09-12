-- ============================================================================
-- Broken English MTI — 15-Minute Demo Class Access System
-- Migration: demo_access_links table + atomic activation function + RLS
-- Project ref: rbhxufnfzsmkzenqavmf
-- Safe / additive. Does NOT touch students, student_progress, course_config, etc.
-- ============================================================================

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- ── TABLE ───────────────────────────────────────────────────────────────────
create table if not exists public.demo_access_links (
  id                uuid primary key default gen_random_uuid(),
  token_hash        text unique not null,          -- SHA-256 hex of the raw token. Raw token is NEVER stored.
  duration_minutes  integer not null default 15,   -- configurable per link (functional default stays 15)
  created_at        timestamptz not null default now(),
  activated_at      timestamptz,                   -- set once, on first successful activation (server time)
  expires_at        timestamptz,                   -- activated_at + duration_minutes (server computed)
  revoked_at        timestamptz,                   -- set when admin revokes
  status            text not null default 'not_started'
                    check (status in ('not_started','active','expired','revoked')),
  student_name      text,
  student_phone     text,
  student_email     text,
  created_by        text,                           -- admin email that created it
  last_seen_at      timestamptz,
  activation_count  integer not null default 0,
  user_agent        text,
  device_identifier text
);

comment on table public.demo_access_links is
  'Timed 15-minute demo invitations. Server (Edge Function + service role) is the sole writer. RLS denies anon completely.';

-- ── INDEXES ─────────────────────────────────────────────────────────────────
create unique index if not exists demo_access_links_token_hash_uidx on public.demo_access_links (token_hash);
create index if not exists demo_access_links_status_idx     on public.demo_access_links (status);
create index if not exists demo_access_links_created_at_idx  on public.demo_access_links (created_at desc);
create index if not exists demo_access_links_expires_at_idx  on public.demo_access_links (expires_at);

-- ── RLS: lock everyone out. Only service_role (Edge Function) and SECURITY
--    DEFINER functions may touch this table. anon/authenticated get nothing. ──
alter table public.demo_access_links enable row level security;
alter table public.demo_access_links force row level security;

-- No policies for anon/authenticated => default deny for every operation.
-- (service_role bypasses RLS, so the Edge Function still works.)
-- Belt-and-suspenders: revoke direct table grants from the public API roles.
revoke all on public.demo_access_links from anon, authenticated;

-- ── ATOMIC FIRST-ACTIVATION FUNCTION ─────────────────────────────────────────
-- Single UPDATE => row-level lock => concurrent opens of the SAME unused link
-- can only produce ONE activation time. coalesce() makes it idempotent:
--   * first call  -> sets activated_at/expires_at from server now()
--   * later calls -> keep the ORIGINAL activated_at/expires_at (never restarts)
create or replace function public.activate_demo_link(
  p_token_hash text,
  p_user_agent text default null,
  p_device     text default null
)
returns public.demo_access_links
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.demo_access_links;
begin
  update public.demo_access_links d
     set activated_at = coalesce(d.activated_at, now()),
         expires_at   = coalesce(
                          d.expires_at,
                          now() + make_interval(mins => coalesce(d.duration_minutes, 15))
                        ),
         activation_count  = d.activation_count + 1,
         last_seen_at      = now(),
         user_agent        = coalesce(d.user_agent, p_user_agent),
         device_identifier = coalesce(d.device_identifier, p_device),
         status = case
                    when d.revoked_at is not null then 'revoked'
                    when coalesce(
                           d.expires_at,
                           now() + make_interval(mins => coalesce(d.duration_minutes, 15))
                         ) <= now() then 'expired'
                    else 'active'
                  end
   where d.token_hash = p_token_hash
   returning d.* into r;

  if not found then
    return null;               -- unknown / invalid token
  end if;

  return r;
end;
$$;

-- Only the service role may execute it. Anonymous browsers cannot.
revoke all on function public.activate_demo_link(text, text, text) from public, anon, authenticated;
grant execute on function public.activate_demo_link(text, text, text) to service_role;

-- ── LIGHTWEIGHT STATUS RECONCILER (used by validate/list) ────────────────────
-- Recomputes 'active' -> 'expired' lazily. Called from the Edge Function.
create or replace function public.reconcile_demo_status(p_token_hash text)
returns public.demo_access_links
language plpgsql
security definer
set search_path = public
as $$
declare r public.demo_access_links;
begin
  update public.demo_access_links d
     set last_seen_at = now(),
         status = case
                    when d.revoked_at is not null then 'revoked'
                    when d.activated_at is null then 'not_started'
                    when d.expires_at is not null and d.expires_at <= now() then 'expired'
                    else 'active'
                  end
   where d.token_hash = p_token_hash
   returning d.* into r;
  if not found then return null; end if;
  return r;
end;
$$;
revoke all on function public.reconcile_demo_status(text) from public, anon, authenticated;
grant execute on function public.reconcile_demo_status(text) to service_role;
