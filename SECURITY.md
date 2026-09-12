# Security Architecture — Broken English Academy / MTI Courses

## Overview

This document describes the production security architecture as of the September 2026 hardening migration.

---

## Authentication

### Students
- Authenticate via **Supabase Auth** (`signInWithPassword`).
- Passwords stored in Supabase Auth only — never in the `students` table.
- Session managed by Supabase Auth JWT, not localStorage role flags.
- Legacy login path (via `password_hash` column) available during migration window; removed after `migrate-students.js --apply` completes.
- Password reset via `supabase.auth.resetPasswordForEmail()` — no plaintext passwords emailed.
- `password_reset_required = true` for migrated accounts forces a password change on first post-migration login.

### Admins
- Authenticate via **Supabase Auth** (`signInWithPassword`).
- Authorization checked against `admin_users` table (`is_admin()` SQL function).
- Admin session signed out immediately if `admin_users` row not found.
- No admin credentials in frontend source, `course_config`, or localStorage.
- Bootstrap: `node scripts/bootstrap-admin.js` (server-side only, uses service-role key).

---

## Secrets Management

| Secret | Location | Never in |
|--------|----------|----------|
| `SUPABASE_SERVICE_ROLE_KEY` | Server env / Edge Function secrets | Frontend, Git |
| `ELEVENLABS_API_KEY` | Supabase Edge Function secret (`supabase secrets set`) | localStorage, course_config, Git |
| `BUNNY_API_KEY` / signing secret | Supabase Edge Function secret | Frontend, Git |
| Admin password | Supabase Auth only | Source code, course_config |
| Student passwords | Supabase Auth only | students table (after migration) |

---

## Edge Functions

### `tts` — Text-to-Speech Proxy
- Verifies Supabase Auth JWT before calling ElevenLabs.
- Rate limit: 20 req/min per user (in-memory).
- Validates voice ID against whitelist.
- ElevenLabs API key read from `ELEVENLABS_API_KEY` env secret.
- Returns audio stream only — never the API key.

### `submit-quiz` — Server-Side Quiz Grading
- Verifies Supabase Auth JWT.
- Rate limit: 5 submissions/min per user.
- Loads correct answers from `quiz_answers` table via service role.
- Grades server-side — correct answers never reach the browser.
- Returns `{score, total, passed, results}`.

---

## Database Row Level Security

| Table | Policy |
|-------|--------|
| `students` | Students read/update own row only (`auth_user_id = auth.uid()`) |
| `student_progress` | Students read/write own progress only |
| `course_config` | Authenticated read (except `admin_cred`, `el_settings` rows); admin full access |
| `admin_users` | Deny-all (no public policies); service-role only |
| `quiz_answers` | Deny-all; Edge Function service role only |
| `video_assets` | Deny-all; admin/service role only |
| `security_audit_log` | Insert only for authenticated users; read via service role |

---

## What Was Removed

- F12 / right-click / DevTools blocking (security theatre — not real security).
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` hardcoded constants.
- `ADMIN_CREDENTIALS` object.
- Admin credentials in `course_config` (`admin_cred` row must be deleted post-migration).
- `brokeneng_admin_cred` localStorage key.
- `brokeneng_el_key` localStorage key (ElevenLabs API key).
- `el_settings` course_config row (ElevenLabs key must be deleted post-migration).
- 143 `answer:N` fields from QUIZ_BANK in public JS.
- Custom localStorage-based session with `role:"admin"` / `role:"student"`.
- Frontend password comparison logic.
- `getAdminCredentials()` / `saveAdminCredentials()` browser functions.
- `sbSaveAdminCred()` / `sbLoadAdminCred()` — wrote plaintext creds to Supabase.

---

## Reporting Vulnerabilities

Contact the site administrator. Do not post security issues publicly.
