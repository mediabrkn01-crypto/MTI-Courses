#!/usr/bin/env node
// ============================================================================
// MTI Courses — Auth Reconciliation & Diagnostic Script
//
// Checks every student profile against Supabase Auth users:
//   - Profile exists in students table?
//   - Auth user exists for that email?
//   - auth_user_id correctly linked?
//   - Email matches between profile and Auth?
//   - Account valid (validity not expired)?
//
// Optionally repairs safe link mismatches (email-matched orphans).
// Never changes passwords. Never deletes records.
//
// Usage (dry run — read only):
//   SUPABASE_URL=https://rbhxufnfzsmkzenqavmf.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
//   node scripts/reconcile-auth.js
//
// Usage (repair safe link mismatches):
//   ... node scripts/reconcile-auth.js --repair
//
// Access: Admin/server-side only. Never expose to students.
// ============================================================================

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REPAIR = process.argv.includes("--repair");

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log("=".repeat(60));
  console.log("MTI Courses — Auth Reconciliation Diagnostic");
  console.log("=".repeat(60));
  if (REPAIR) console.log("⚠  REPAIR mode — will fix safe link mismatches\n");
  else console.log("🔍 DRY RUN — no changes will be made. Pass --repair to fix.\n");

  // 1. Load all student profiles
  const { data: students, error: stuErr } = await admin
    .from("students")
    .select("id, name, email, auth_user_id, valid_until, password_reset_required");
  if (stuErr) { console.error("Failed to load students:", stuErr.message); process.exit(1); }
  console.log(`Student profiles in DB: ${students.length}`);

  // 2. Load all Auth users (paginated)
  let allAuthUsers = [];
  let page = 1;
  while (true) {
    const { data: pageData } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (!pageData?.users?.length) break;
    allAuthUsers.push(...pageData.users);
    if (pageData.users.length < 1000) break;
    page++;
  }
  console.log(`Supabase Auth users: ${allAuthUsers.length}`);
  console.log();

  // Build lookup maps
  const authByEmail = {};
  const authById = {};
  for (const u of allAuthUsers) {
    if (u.email) authByEmail[u.email.toLowerCase()] = u;
    authById[u.id] = u;
  }

  // 3. Analyze each student
  let linkedOk = 0, missingAuth = 0, missingLink = 0, brokenLink = 0,
      noEmail = 0, expired = 0, resetPending = 0, repaired = 0, repairFailed = 0;

  const issues = [];

  for (const s of students) {
    const email = (s.email || "").toLowerCase().trim();
    const isExpired = s.valid_until && new Date(s.valid_until) < new Date();
    if (isExpired) expired++;
    if (s.password_reset_required) resetPending++;

    if (!email || !email.includes("@")) {
      // Username-only "email" — cannot use Supabase Auth
      noEmail++;
      issues.push({ type: "NO_EMAIL", id: s.id, name: s.name, email: s.email });
      continue;
    }

    const authUser = authByEmail[email];

    if (!authUser) {
      // No Auth user at all for this email
      missingAuth++;
      issues.push({ type: "MISSING_AUTH", id: s.id, name: s.name, email });
      continue;
    }

    if (!s.auth_user_id) {
      // Auth user exists but profile not linked
      missingLink++;
      issues.push({ type: "MISSING_LINK", id: s.id, name: s.name, email, authUserId: authUser.id });

      if (REPAIR) {
        const { error } = await admin.from("students")
          .update({ auth_user_id: authUser.id })
          .eq("id", s.id)
          .is("auth_user_id", null);
        if (error) {
          console.error(`  ✗ Repair failed for [${s.name}]: ${error.message}`);
          repairFailed++;
        } else {
          console.log(`  ✓ Linked [${s.name}] → ${authUser.id}`);
          repaired++;
        }
      }
      continue;
    }

    if (s.auth_user_id !== authUser.id) {
      // Profile points to a DIFFERENT Auth UUID than what email lookup gives
      const linkedAuthUser = authById[s.auth_user_id];
      brokenLink++;
      issues.push({
        type: "BROKEN_LINK",
        id: s.id,
        name: s.name,
        email,
        storedAuthId: s.auth_user_id,
        emailAuthId: authUser.id,
        storedUserEmail: linkedAuthUser?.email || "NOT FOUND"
      });
      continue;
    }

    // All good
    linkedOk++;
  }

  // 4. Print summary
  console.log("─".repeat(60));
  console.log("SUMMARY");
  console.log("─".repeat(60));
  console.log(`✅ Correctly linked:           ${linkedOk}`);
  console.log(`⚠  Missing Auth account:       ${missingAuth}  (need migration script)`);
  console.log(`🔗 Profile unlinked (fixable): ${missingLink}  (Auth exists, auth_user_id null)`);
  console.log(`❌ Broken link:                ${brokenLink}  (auth_user_id points to wrong user)`);
  console.log(`📛 Non-email username:         ${noEmail}   (can't use Supabase Auth)`);
  console.log(`🔑 Password reset pending:     ${resetPending}`);
  console.log(`⏰ Expired accounts:           ${expired}`);
  if (REPAIR) {
    console.log(`\n🔧 Repaired (linked):          ${repaired}`);
    console.log(`✗  Repair failed:              ${repairFailed}`);
  }

  // 5. Print issues detail
  if (issues.length) {
    console.log("\n" + "─".repeat(60));
    console.log("ISSUES DETAIL");
    console.log("─".repeat(60));
    for (const issue of issues) {
      if (issue.type === "MISSING_AUTH") {
        console.log(`[MISSING_AUTH]  ${issue.name} <${issue.email}> (id:${issue.id})`);
        console.log(`   → Run migrate-students.js --apply to create Auth account`);
      } else if (issue.type === "MISSING_LINK") {
        console.log(`[MISSING_LINK]  ${issue.name} <${issue.email}> (id:${issue.id})`);
        console.log(`   → Auth UUID: ${issue.authUserId}`);
        if (!REPAIR) console.log(`   → Fix: run this script with --repair`);
      } else if (issue.type === "BROKEN_LINK") {
        console.log(`[BROKEN_LINK]   ${issue.name} <${issue.email}> (id:${issue.id})`);
        console.log(`   → Stored auth_user_id: ${issue.storedAuthId}`);
        console.log(`   → That user's email:   ${issue.storedUserEmail}`);
        console.log(`   → Email lookup gives:  ${issue.emailAuthId}`);
        console.log(`   → Manual review required — do NOT auto-repair broken links`);
      } else if (issue.type === "NO_EMAIL") {
        console.log(`[NO_EMAIL]      ${issue.name} (email field: "${issue.email}") (id:${issue.id})`);
        console.log(`   → Cannot use Supabase Auth; legacy password-hash login only`);
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("Done.");
  if (!REPAIR && missingLink > 0) {
    console.log(`\nRun with --repair to link ${missingLink} unlinked profile(s).`);
  }
  if (missingAuth > 0) {
    console.log(`\nRun migrate-students.js --apply for ${missingAuth} student(s) with no Auth account.`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
