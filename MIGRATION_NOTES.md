# Migration Notes — Security Hardening (September 2026)

## Overview

This document describes the one-time steps required to complete the production security migration.

**Status:** Frontend changes deployed. Backend steps below are PENDING and must be run manually.

---

## Step 1: Run SQL Migration

Apply `supabase/migrations/20260912c_security_hardening.sql` via Supabase Dashboard → SQL Editor.

This migration:
- Adds `auth_user_id uuid UNIQUE` to `students`
- Adds `password_reset_required boolean DEFAULT false` to `students`
- Creates `admin_users` table (deny-all RLS)
- Creates `is_admin()` SQL function
- Creates `quiz_answers` table (deny-all RLS) and seeds answers for Days 1–5
- Creates `video_assets` table
- Creates `security_audit_log` table
- Enables RLS on `students`, `student_progress`, `course_config`

**Safety:** The migration is additive. It does NOT drop existing tables or columns.

The destructive cleanup lines are commented out — run them manually AFTER verifying everything works:
```sql
-- Delete old admin credentials from course_config:
DELETE FROM course_config WHERE id = 'admin_cred';

-- Clear legacy plaintext passwords (run AFTER migrate-students.js --null-passwords):
UPDATE students SET password_hash = NULL WHERE password_hash IS NOT NULL;
```

---

## Step 2: Deploy Edge Functions

```bash
supabase functions deploy tts
supabase functions deploy submit-quiz
```

Set required secrets:
```bash
supabase secrets set ELEVENLABS_API_KEY=sk_xxxx
supabase secrets set APP_ORIGIN=https://academy.brokenenglish.in
```

---

## Step 3: Bootstrap Admin Account

Run server-side with a **new** admin email and password (NOT the old `admin@brokenenglish.com` / `admin1234`):

```bash
SUPABASE_URL=https://rbhxufnfzsmkzenqavmf.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key> \
ADMIN_EMAIL=<your_new_admin_email> \
ADMIN_PASSWORD=<your_new_strong_password_min_12_chars> \
node scripts/bootstrap-admin.js
```

After success, delete the old `admin_cred` from `course_config`:
```sql
DELETE FROM course_config WHERE id = 'admin_cred';
```

---

## Step 4: Migrate Student Accounts

Dry run first (safe — no changes made):
```bash
SUPABASE_URL=https://rbhxufnfzsmkzenqavmf.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<key> \
node scripts/migrate-students.js
```

Apply when ready:
```bash
SUPABASE_URL=https://rbhxufnfzsmkzenqavmf.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<key> \
node scripts/migrate-students.js --apply
```

After all students have reset passwords (they'll be prompted on next login), null legacy passwords:
```bash
node scripts/migrate-students.js --apply --null-passwords
```

---

## Step 5: Rotate ElevenLabs API Key

See `SECURITY_ROTATION.md` § 1. The old key was stored in course_config/localStorage — it is exposed.

---

## Step 6: Verify

1. Student login works (try with an existing account).
2. Admin login works with new credentials.
3. TTS voice works (plays audio via Edge Function).
4. Quiz submits and returns score.
5. Password reset email received.
6. `course_config` no longer contains `admin_cred` or `el_settings` rows.
7. `students.password_hash` is NULL for all migrated accounts.

---

## Rollback Plan

The migration is additive — reverting the frontend to the previous commit (`ddf883e`) restores legacy behaviour.

The SQL migration adds columns and tables but does not remove anything. Safe to keep even if rolling back frontend.

Students who authenticated via the new Supabase Auth path will need their `auth_user_id` to remain in the DB to continue working after rollback.

---

## Pending Items

- [ ] `video-playback` Edge Function for signed Bunny Stream tokens (Bunny credentials needed)
- [ ] `_headers` file for HTTP security headers (requires Cloudflare in front of GitHub Pages)
- [ ] Quiz answers seeded only for Days 1–5 — add remaining days in `quiz_answers` table
- [ ] YouTube-hosted paid content review — YouTube cannot enforce access control
