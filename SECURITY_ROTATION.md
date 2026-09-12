# Secret Rotation Guide — MTI Courses

**Run these steps after completing the security migration.**

---

## 1. ElevenLabs API Key

The old ElevenLabs API key was stored in `course_config` and `localStorage` — treat it as **exposed**.

1. Log in to [elevenlabs.io](https://elevenlabs.io) → API Keys → Revoke the old key.
2. Generate a new API key.
3. Set the new key as a Supabase Edge Function secret:
   ```bash
   supabase secrets set ELEVENLABS_API_KEY=sk_xxxxxxxxxxxxxxxxxxxx
   ```
4. Redeploy the `tts` Edge Function:
   ```bash
   supabase functions deploy tts
   ```
5. Delete the `el_settings` row from `course_config`:
   ```sql
   DELETE FROM course_config WHERE id = 'el_settings';
   ```

---

## 2. Admin Password

The old admin password was in frontend source code — treat it as **exposed**.

1. Run `bootstrap-admin.js` with a **new** password (minimum 12 characters):
   ```bash
   SUPABASE_URL=https://rbhxufnfzsmkzenqavmf.supabase.co \
   SUPABASE_SERVICE_ROLE_KEY=<your_key> \
   ADMIN_EMAIL=<new_admin_email> \
   ADMIN_PASSWORD=<new_strong_password> \
   node scripts/bootstrap-admin.js
   ```
2. Delete the old `admin_cred` row from `course_config`:
   ```sql
   DELETE FROM course_config WHERE id = 'admin_cred';
   ```
3. Revoke the old admin Supabase Auth account if it still exists for the old email.

---

## 3. Student Passwords

After running `migrate-students.js --apply`:

1. All students have `password_reset_required = true`.
2. On next login they are prompted to set a new password.
3. After all students have reset passwords, null the legacy `password_hash` column:
   ```bash
   node scripts/migrate-students.js --apply --null-passwords
   ```
   Or directly:
   ```sql
   UPDATE students SET password_hash = NULL WHERE password_hash IS NOT NULL;
   ```

---

## 4. Supabase Service Role Key

If the service role key was ever visible in source code or logs:

1. Rotate it in Supabase Dashboard → Settings → API.
2. Update it in any CI/CD secrets or server environment variables.
3. Update `supabase secrets set` calls with the new key.
4. Never commit it to Git.

---

## 5. Bunny Stream / CDN Keys

If Bunny API keys or signing secrets were exposed:

1. Rotate via Bunny Dashboard → API → Regenerate.
2. Update Edge Function secrets:
   ```bash
   supabase secrets set BUNNY_API_KEY=<new_key>
   supabase secrets set BUNNY_SIGNING_SECRET=<new_secret>
   ```
3. Redeploy `video-playback` Edge Function.
