-- ============================================================================
-- Demo Access — update #2
-- Adds per-link counsellor WhatsApp + enforces duration 1..80 minutes.
-- Additive / safe. Run AFTER 20260912_demo_access_links.sql.
-- Project ref: rbhxufnfzsmkzenqavmf
-- ============================================================================

-- Per-link counsellor WhatsApp (bare international digits, e.g. 919876543210)
alter table public.demo_access_links
  add column if not exists counsellor_whatsapp text;

-- Clamp any pre-existing out-of-range durations before adding the constraint
update public.demo_access_links
  set duration_minutes = 15
  where duration_minutes is null or duration_minutes < 1 or duration_minutes > 80;

-- Enforce 1..80 minutes
alter table public.demo_access_links
  drop constraint if exists demo_duration_range;
alter table public.demo_access_links
  add constraint demo_duration_range
  check (duration_minutes >= 1 and duration_minutes <= 80);

-- NOTE: activate_demo_link() already computes:
--   expires_at = activated_at + (stored duration_minutes) minutes
-- entirely server-side (see 20260912_demo_access_links.sql). No change needed:
-- the client cannot influence duration or expiry at activation time.
