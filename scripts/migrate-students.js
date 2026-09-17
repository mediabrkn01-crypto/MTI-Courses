#!/usr/bin/env node
// ============================================================================
// MTI Courses — Student Account Migration Script
// Migrates existing students to Supabase Auth.
//
// For each student:
//   1. Creates Supabase Auth user with existing email + password
//   2. Links auth_user_id back to student record
//   3. Sets password_reset_required = true (forces new password on next login)
//   4. Does NOT log or print any password
//
// Run SERVER-SIDE ONLY. Requires SUPABASE_SERVICE_ROLE_KEY in environment.
//
// Usage:
//   SUPABASE_URL=https://rbhxufnfzsmkzenqavmf.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
//   node scripts/migrate-students.js
//
// After successful migration:
//   UPDATE students SET password_hash = NULL WHERE password_hash IS NOT NULL;
// (Or use the --null-passwords flag)
//
// SAFETY: Dry-run mode enabled by default. Pass --apply to make real changes.
// ============================================================================

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN      = !process.argv.includes("--apply");
const NULL_PASSES  = process.argv.includes("--null-passwords");

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  if (DRY_RUN) {
    console.log("🔍 DRY RUN mode — no changes will be made. Pass --apply to execute.");
    console.log("   (This will show what would happen for each student)\n");
  }

  // 1. Load all existing students
  const { data: students, error } = await admin.from("students").select(
    "id, name, email, password_hash, auth_user_id, valid_until"
  );
  if (error) { console.error("Failed to load students:", error.message); process.exit(1); }

  console.log(`Found ${students.length} students.\n`);

  let created = 0, updated = 0, skipped = 0, failed = 0;

  for (const student of students) {
    const label = `[${student.name || "?"}] <email redacted>`;

    // Already migrated
    if (student.auth_user_id) {
      console.log(`  ${label} — already has auth_user_id, skipping`);
      skipped++;
      continue;
    }

    if (!student.email) {
      console.log(`  ${label} — no email, skipping`);
      skipped++;
      continue;
    }

    const rawPass = student.password_hash;
    // Generate a safe temp password if none stored (shouldn't happen)
    // We do NOT print the real password; only log success/failure
    const password = rawPass && rawPass.length >= 6
      ? rawPass
      : `Brkn${Math.random().toString(36).slice(2,10)}!`;

    if (DRY_RUN) {
      console.log(`  ${label} — would create Supabase Auth user + link, set password_reset_required=true`);
      continue;
    }

    try {
      // Check if Supabase Auth user already exists for this email
      // listUsers() is paginated — fetch all pages to avoid missing users
      let authUserId = null;
      let allAuthUsers = [];
      let page = 1;
      while (true) {
        const { data: pageData } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (!pageData?.users?.length) break;
        allAuthUsers.push(...pageData.users);
        if (pageData.users.length < 1000) break;
        page++;
      }
      const existing = allAuthUsers.find(u => u.email === student.email);

      if (existing) {
        authUserId = existing.id;
        // Update password in case it changed
        await admin.auth.admin.updateUserById(authUserId, {
          password,
          email_confirm: true,
        });
        console.log(`  ${label} — auth user exists, password updated, linking`);
        updated++;
      } else {
        // Create new Supabase Auth user
        const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
          email: student.email,
          password,
          email_confirm: true,
        });
        if (createErr) throw createErr;
        authUserId = newUser.user.id;
        console.log(`  ${label} — auth user created, linking`);
        created++;
      }

      // Link auth_user_id + set password_reset_required
      const { error: updateErr } = await admin.from("students").update({
        auth_user_id: authUserId,
        password_reset_required: true,
      }).eq("id", student.id);

      if (updateErr) {
        console.error(`  ${label} — failed to link: ${updateErr.message}`);
        failed++;
      }

      // Small delay to avoid rate limits
      await sleep(200);
    } catch (err) {
      console.error(`  ${label} — error: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n── Summary ─────────────────────────────`);
  if (DRY_RUN) {
    console.log(`Would process: ${students.length - skipped} students`);
    console.log(`Already migrated (skipped): ${skipped}`);
  } else {
    console.log(`Created new auth users: ${created}`);
    console.log(`Updated existing auth users: ${updated}`);
    console.log(`Skipped (already migrated): ${skipped}`);
    console.log(`Failed: ${failed}`);

    if (failed === 0 && NULL_PASSES) {
      console.log("\nNulling out password_hash for all migrated students...");
      const { error: nullErr } = await admin.from("students")
        .update({ password_hash: null })
        .not("auth_user_id", "is", null);
      if (nullErr) {
        console.error("Failed to null passwords:", nullErr.message);
      } else {
        console.log("✅ password_hash cleared for all migrated students.");
      }
    } else if (failed > 0) {
      console.log("\n⚠  Some students failed — do NOT null passwords yet. Fix errors and re-run.");
    } else {
      console.log("\nTo null legacy passwords after verifying auth works:");
      console.log("  node scripts/migrate-students.js --apply --null-passwords");
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
