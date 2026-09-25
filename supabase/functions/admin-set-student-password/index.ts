// admin-set-student-password — Supabase Edge Function
// Updates a student's LOGIN credentials in Supabase Auth: password and/or email.
// Zero imports: uses only Deno.env + native fetch() against Supabase REST/Auth Admin APIs.
// Eliminating the esm.sh import prevents cold-start crashes that strip CORS headers.
// Deploy with: supabase functions deploy admin-set-student-password --no-verify-jwt
//   (the function verifies the caller's JWT against admin_users itself; the gateway check
//    would block the browser's CORS preflight).
//
// Body: { studentId, newPassword?, newEmail? }  — at least one of newPassword / newEmail.
//   newPassword: sets the password (creates + links the Auth user if the student has none).
//   newEmail:    changes the student's email in BOTH Supabase Auth (if linked) and the
//                students table. Auth is updated first; if that fails nothing is changed,
//                so the login email and the profile email can never drift apart.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': 'https://academy.brokenenglish.in',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SVC = { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY };
const SVC_JSON = { ...SVC, 'Content-Type': 'application/json' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

// Turn a Supabase Auth error body into a short, readable message.
async function authErr(res: Response): Promise<string> {
  const t = await res.text();
  try {
    const j = JSON.parse(t);
    return j.msg || j.message || j.error_description || j.error || t;
  } catch { return t; }
}

async function patchStudent(studentId: string, fields: Record<string, unknown>) {
  return fetch(`${SUPABASE_URL}/rest/v1/students?id=eq.${encodeURIComponent(studentId)}`, {
    method: 'PATCH',
    headers: { ...SVC_JSON, 'Prefer': 'return=minimal' },
    body: JSON.stringify(fields),
  });
}

Deno.serve(async (req) => {
  // CORS preflight — must succeed regardless of auth state
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // ── 1. Verify admin JWT ────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Missing authorization' }, 401);
  const callerToken = authHeader.slice(7);

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { 'Authorization': `Bearer ${callerToken}`, 'apikey': SERVICE_KEY },
  });
  if (!userRes.ok) return json({ error: 'Invalid or expired admin session. Please sign out and sign back in.' }, 401);
  const callerUser = await userRes.json();
  const callerId: string = callerUser?.id;
  if (!callerId) return json({ error: 'Could not resolve caller identity' }, 401);

  // Verify caller is in admin_users (deny-all RLS — must use service key)
  const adminCheckRes = await fetch(
    `${SUPABASE_URL}/rest/v1/admin_users?auth_user_id=eq.${callerId}&select=auth_user_id&limit=1`,
    { headers: SVC },
  );
  const adminRows = await adminCheckRes.json();
  if (!Array.isArray(adminRows) || adminRows.length === 0) return json({ error: 'Caller is not an admin' }, 403);

  // ── 2. Parse + validate request body ──────────────────────────────────────
  let body: { studentId?: string; newPassword?: string; newEmail?: string };
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }

  const studentId = body?.studentId;
  const newPassword = body?.newPassword;
  const newEmail = typeof body?.newEmail === 'string' ? body.newEmail.trim().toLowerCase() : undefined;
  if (!studentId || typeof studentId !== 'string') return json({ error: 'studentId required' }, 400);
  if (newPassword === undefined && newEmail === undefined) return json({ error: 'Nothing to update' }, 400);
  if (newPassword !== undefined && (typeof newPassword !== 'string' || newPassword.length < 6)) {
    return json({ error: 'Password must be at least 6 characters' }, 400);
  }
  if (newEmail !== undefined && !EMAIL_RE.test(newEmail)) return json({ error: 'Enter a valid email address' }, 400);

  // ── 3. Load student profile (service key bypasses RLS) ────────────────────
  const stuRes = await fetch(
    `${SUPABASE_URL}/rest/v1/students?id=eq.${encodeURIComponent(studentId)}&select=id,email,auth_user_id&limit=1`,
    { headers: SVC },
  );
  const stuRows = await stuRes.json();
  if (!Array.isArray(stuRows) || stuRows.length === 0) return json({ error: 'Student not found' }, 404);
  const student = stuRows[0];
  let authUserId: string = student.auth_user_id;
  let emailChanged = false;

  // ── 4. Email change (Auth first, then profile) ────────────────────────────
  if (newEmail !== undefined && newEmail !== (student.email || '').toLowerCase()) {
    const dupRes = await fetch(
      `${SUPABASE_URL}/rest/v1/students?email=eq.${encodeURIComponent(newEmail)}&id=neq.${encodeURIComponent(studentId)}&select=id&limit=1`,
      { headers: SVC },
    );
    const dupRows = await dupRes.json();
    if (Array.isArray(dupRows) && dupRows.length) return json({ error: 'Another student already uses this email' }, 409);

    if (authUserId) {
      // Linked: change the login email (and password in the same call if given).
      const payload: Record<string, unknown> = { email: newEmail, email_confirm: true };
      if (newPassword !== undefined) payload.password = newPassword;
      const upRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${authUserId}`, {
        method: 'PUT', headers: SVC_JSON, body: JSON.stringify(payload),
      });
      if (!upRes.ok) return json({ error: 'Could not change the login email: ' + (await authErr(upRes)) }, 409);
    }
    const emRes = await patchStudent(studentId, { email: newEmail });
    if (!emRes.ok) {
      return json({ error: 'Login email updated but the student profile could not be updated (HTTP ' + emRes.status + '). Try saving again.' }, 500);
    }
    student.email = newEmail;
    emailChanged = true;
  }

  // ── 5. Password ───────────────────────────────────────────────────────────
  const passwordAlreadySet = emailChanged && !!authUserId && newPassword !== undefined;
  if (newPassword !== undefined && !passwordAlreadySet) {
    if (!student.email?.includes('@')) return json({ error: 'Student has no valid email — cannot use Supabase Auth' }, 422);

    if (!authUserId) {
      // No Auth user yet → find-or-create, then link.
      const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000`, { headers: SVC });
      const listData = await listRes.json();
      const existing = Array.isArray(listData?.users)
        ? listData.users.find((u: { email?: string; id?: string }) =>
            u.email?.toLowerCase() === student.email.toLowerCase())
        : null;

      if (existing) {
        authUserId = existing.id;
        const upRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${authUserId}`, {
          method: 'PUT', headers: SVC_JSON, body: JSON.stringify({ password: newPassword, email_confirm: true }),
        });
        if (!upRes.ok) return json({ error: 'Failed to update Auth password: ' + (await authErr(upRes)) }, 500);
      } else {
        const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
          method: 'POST', headers: SVC_JSON,
          body: JSON.stringify({ email: student.email, password: newPassword, email_confirm: true }),
        });
        if (!createRes.ok) return json({ error: 'Failed to create Auth user: ' + (await authErr(createRes)) }, 500);
        const created = await createRes.json();
        authUserId = created?.id;
        if (!authUserId) return json({ error: 'Auth user created but id missing' }, 500);
      }

      const linkRes = await patchStudent(studentId, { auth_user_id: authUserId, password_reset_required: false });
      if (!linkRes.ok) {
        return json({ success: true, warning: 'Auth user set but profile link failed (HTTP ' + linkRes.status + ')', authUserId });
      }
    } else {
      const upRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${authUserId}`, {
        method: 'PUT', headers: SVC_JSON, body: JSON.stringify({ password: newPassword }),
      });
      if (!upRes.ok) return json({ error: 'Failed to update Auth password: ' + (await authErr(upRes)) }, 500);
      await patchStudent(studentId, { password_reset_required: false }).catch(() => {});
    }
  } else if (passwordAlreadySet) {
    await patchStudent(studentId, { password_reset_required: false }).catch(() => {});
  }

  // ── 6. Audit log (best-effort, non-blocking) ──────────────────────────────
  fetch(`${SUPABASE_URL}/rest/v1/security_audit_log`, {
    method: 'POST',
    headers: SVC_JSON,
    body: JSON.stringify({
      actor_user_id: callerId,
      event_type: 'admin_update_student_login',
      target_type: 'student',
      target_id: studentId,
      metadata: { auth_user_id: authUserId || null, password_changed: newPassword !== undefined, email_changed: emailChanged },
    }),
  }).catch(() => {});

  return json({ success: true, authUserId: authUserId || null, linked: !!authUserId, emailChanged });
});
