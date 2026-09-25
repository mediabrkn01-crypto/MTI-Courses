/* admin-supabase.js — ADMIN app Supabase client (admin.html only).
   Same project + public anon key as the student app (js/shared/supabase-config.js),
   but a SEPARATE auth storage key. That keeps the admin's Supabase Auth session
   completely apart from any student session in the same browser:
     student app → supabase-js default key (sb-<project>-auth-token)
     admin app   → brokeneng_admin_auth
   No service-role key or other secret is ever used in the browser. Privileged work
   runs in Edge Functions that verify this client's JWT against admin_users. */
const ADMIN_AUTH_STORAGE_KEY = 'brokeneng_admin_auth';
const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storageKey: ADMIN_AUTH_STORAGE_KEY,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true // picks up the admin password-reset link on admin.html
  }
});
