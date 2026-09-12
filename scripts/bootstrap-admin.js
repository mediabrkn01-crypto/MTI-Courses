#!/usr/bin/env node
// ============================================================================
// MTI Courses — Admin Bootstrap Script
// Creates a Supabase Auth account for the admin and registers it in admin_users.
//
// RUN SERVER-SIDE ONLY. Never include in the frontend build.
// Uses SUPABASE_SERVICE_ROLE_KEY from environment — never paste it here.
//
// Usage:
//   SUPABASE_URL=https://rbhxufnfzsmkzenqavmf.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
//   ADMIN_EMAIL=yournewemail@example.com \
//   ADMIN_PASSWORD=YourNewStrongPassword123! \
//   node scripts/bootstrap-admin.js
//
// IMPORTANT:
//   - Use a NEW admin password. The old "admin1234" was exposed in source.
//   - Never reuse the old admin@brokenenglish.com / admin1234 credentials.
//   - Never commit .env files or real secrets to git.
// ============================================================================

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL  = process.env.SUPABASE_URL;
const SERVICE_ROLE  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL   = process.env.ADMIN_EMAIL;
const ADMIN_PASS    = process.env.ADMIN_PASSWORD;

if (!SUPABASE_URL || !SERVICE_ROLE || !ADMIN_EMAIL || !ADMIN_PASS) {
  console.error("Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD");
  process.exit(1);
}
if (ADMIN_PASS.length < 12) {
  console.error("Admin password must be at least 12 characters.");
  process.exit(1);
}
if (ADMIN_EMAIL.toLowerCase() === "admin@brokenenglish.com") {
  console.error("Use a new admin email. The old one was exposed.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log("Creating admin Supabase Auth account for:", ADMIN_EMAIL);

  // 1. Check if user already exists
  const { data: existingList } = await admin.auth.admin.listUsers();
  const existing = existingList?.users?.find(u => u.email === ADMIN_EMAIL);

  let userId;
  if (existing) {
    console.log("User already exists:", existing.id, "— updating password...");
    const { error: updErr } = await admin.auth.admin.updateUserById(existing.id, {
      password: ADMIN_PASS,
      email_confirm: true,
    });
    if (updErr) { console.error("Failed to update password:", updErr.message); process.exit(1); }
    userId = existing.id;
    console.log("Password updated.");
  } else {
    // 2. Create Supabase Auth user
    const { data, error } = await admin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASS,
      email_confirm: true,  // skip email confirmation for admin bootstrap
    });
    if (error) { console.error("Failed to create admin user:", error.message); process.exit(1); }
    userId = data.user.id;
    console.log("Admin Supabase Auth user created:", userId);
  }

  // 3. Register in admin_users table
  const { error: insertErr } = await admin.from("admin_users").upsert({
    auth_user_id: userId,
    created_at: new Date().toISOString(),
  }, { onConflict: "auth_user_id" });

  if (insertErr) {
    console.error("Failed to register in admin_users:", insertErr.message);
    process.exit(1);
  }

  console.log("✅ Admin registered in admin_users table.");
  console.log("   auth_user_id:", userId);
  console.log("   email:", ADMIN_EMAIL);
  console.log("\n⚠  Next: delete admin_cred from course_config table:");
  console.log("   DELETE FROM course_config WHERE id = 'admin_cred';");
  console.log("\n⚠  Then rotate any existing admin password that was in source code.");
}

main().catch(err => { console.error(err); process.exit(1); });
