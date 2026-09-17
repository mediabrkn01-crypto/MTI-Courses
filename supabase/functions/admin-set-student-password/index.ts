// admin-set-student-password — Supabase Edge Function
// Sets (or creates) a Supabase Auth password for a student.
// Caller MUST be an authenticated admin (JWT verified against admin_users table).
// Service-role key lives only in Supabase secrets — never in frontend code.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://academy.brokenenglish.in',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  // 1. Verify admin JWT
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Missing authorization' }, 401);
  }
  const token = authHeader.slice(7);

  const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Verify the token is a valid Supabase JWT
  const { data: { user }, error: jwtErr } = await serviceClient.auth.getUser(token);
  if (jwtErr || !user) {
    return json({ error: 'Invalid or expired session. Please log out and log back in as admin.' }, 401);
  }

  // Verify they are in admin_users (SECURITY DEFINER table, zero public RLS)
  const { data: adminRow } = await serviceClient
    .from('admin_users')
    .select('auth_user_id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!adminRow) {
    return json({ error: 'Caller is not an admin' }, 403);
  }

  // 2. Parse request body
  let body: { studentId?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { studentId, newPassword } = body;
  if (!studentId || typeof studentId !== 'string') {
    return json({ error: 'studentId required' }, 400);
  }
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    return json({ error: 'newPassword must be at least 6 characters' }, 400);
  }

  // 3. Load student profile
  const { data: student, error: stuErr } = await serviceClient
    .from('students')
    .select('id, email, auth_user_id')
    .eq('id', studentId)
    .maybeSingle();

  if (stuErr || !student) {
    return json({ error: 'Student not found' }, 404);
  }
  if (!student.email || !student.email.includes('@')) {
    return json({ error: 'Student has no valid email — cannot use Supabase Auth' }, 422);
  }

  let authUserId: string = student.auth_user_id;

  // 4a. No Auth user yet — create one and link
  if (!authUserId) {
    // Check if Auth user already exists for this email (unlinked)
    const { data: existing } = await serviceClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existingUser = existing?.users?.find(
      (u: { email?: string }) => u.email?.toLowerCase() === student.email.toLowerCase()
    );

    if (existingUser) {
      authUserId = existingUser.id;
      // Update password on the existing Auth user
      const { error: pwErr } = await serviceClient.auth.admin.updateUserById(authUserId, {
        password: newPassword,
        email_confirm: true,
      });
      if (pwErr) return json({ error: 'Failed to update Auth password: ' + pwErr.message }, 500);
    } else {
      // Create new Auth user
      const { data: newUser, error: createErr } = await serviceClient.auth.admin.createUser({
        email: student.email,
        password: newPassword,
        email_confirm: true,
      });
      if (createErr) return json({ error: 'Failed to create Auth user: ' + createErr.message }, 500);
      authUserId = newUser.user.id;
    }

    // Link auth_user_id to student profile
    const { error: linkErr } = await serviceClient
      .from('students')
      .update({ auth_user_id: authUserId, password_reset_required: false })
      .eq('id', studentId);
    if (linkErr) {
      // Auth user created/updated but link failed — still return success with warning
      console.warn('Auth link failed:', linkErr.message);
      return json({ success: true, warning: 'Auth user set but profile link failed: ' + linkErr.message, authUserId });
    }

  // 4b. Auth user already linked — just update password
  } else {
    const { error: pwErr } = await serviceClient.auth.admin.updateUserById(authUserId, {
      password: newPassword,
    });
    if (pwErr) return json({ error: 'Failed to update Auth password: ' + pwErr.message }, 500);

    // Clear password_reset_required
    await serviceClient
      .from('students')
      .update({ password_reset_required: false })
      .eq('id', studentId);
  }

  // 5. Audit log
  await serviceClient.from('security_audit_log').insert({
    actor_user_id: user.id,
    event_type: 'admin_set_student_password',
    target_type: 'student',
    target_id: studentId,
    metadata: { auth_user_id: authUserId },
  }).catch(() => {}); // non-blocking

  return json({ success: true, authUserId });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
