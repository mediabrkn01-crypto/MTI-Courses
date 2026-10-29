// send-student-welcome-email — Supabase Edge Function.
//
// Emails a student their personalised Student Guide PDF (which holds their sign-in
// details) through the Brevo transactional API. Called by the admin app right after a
// student's Supabase Auth login was created (or a new password was set).
//
// Security
//   * Caller must be a signed-in admin (JWT checked here + admin_users), like
//     admin-set-student-password. Students and anon get 401/403.
//   * The recipient is NEVER taken from the browser: it is the student's Supabase Auth
//     email, which must match students.email and students.auth_user_id must be linked
//     (i.e. the account really exists and can sign in).
//   * The Brevo key lives only in Edge Function secrets. Responses carry safe error codes,
//     never provider bodies, keys, tokens or stack traces.
//   * The PDF is validated (real PDF signature, size limit) and is not stored or logged.
//
// Idempotency: every request carries requestId (one per prepared guide). The row in
// student_welcome_emails is claimed before Brevo is called; a 'sent' row is final, an
// in-flight row blocks parallel duplicates (double-clicks, timeouts, re-renders).
//
// POST { action:'send', studentId, requestId, pdfBase64, kind?: 'welcome'|'credentials' }
// POST { action:'status', studentId }
//
// Secrets: BREVO_API_KEY, BREVO_SENDER_EMAIL (verified sender in Brevo), BREVO_SENDER_NAME.
// Deploy: supabase functions deploy send-student-welcome-email --no-verify-jwt
//   (the JWT is verified below; the gateway check would block the CORS preflight)

import { renderHtml, renderText, SUBJECT } from './template.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BREVO_URL = Deno.env.get('BREVO_API_URL') || 'https://api.brevo.com/v3/smtp/email'; // override only for local tests
const ALLOWED = ['https://academy.brokenenglish.in', 'http://localhost:8235'];

const MAX_PDF_BYTES = 4 * 1024 * 1024;              // attachment limit (decoded)
const MAX_BODY_BYTES = 6 * 1024 * 1024;             // base64 of 4 MB + JSON
const IN_FLIGHT_MS = 2 * 60 * 1000;                 // a 'sending' row younger than this blocks duplicates
const MAX_ATTEMPTS = 6;                             // per request
const MAX_SENT_PER_10_MIN = 3;                      // per student
const BREVO_TIMEOUT_MS = 25000;

const SVC = { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY };
const SVC_JSON = { ...SVC, 'Content-Type': 'application/json' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Safe, admin-facing messages for each error code.
const MESSAGES: Record<string, string> = {
  brevo_not_configured: 'Email sending is not set up yet. Add BREVO_API_KEY, BREVO_SENDER_EMAIL and BREVO_SENDER_NAME as Supabase Edge Function secrets.',
  brevo_unauthorized: 'Brevo rejected the API key. Check BREVO_API_KEY in the Supabase Edge Function secrets.',
  sender_not_verified: 'Brevo rejected the sender address. Verify BREVO_SENDER_EMAIL (or its domain) in Brevo → Senders, Domains & Dedicated IPs.',
  brevo_rejected: 'Brevo did not accept the email. Check the student’s email address and try again.',
  brevo_unavailable: 'The email service did not respond. Please try again in a moment.',
  invalid_recipient: 'The student’s email address is not valid. Fix it in Edit student, then send again.',
  account_not_ready: 'This student has no working sign-in yet. Set a password for them first.',
  email_mismatch: 'The student’s profile email and sign-in email differ. Save the student again to sync them.',
  student_not_found: 'Student not found.',
  invalid_pdf: 'The guide PDF is invalid. Create it again and retry.',
  pdf_too_large: 'The guide PDF is larger than 4 MB.',
  rate_limited: 'Several emails were just sent to this student. Wait a few minutes before sending again.',
  too_many_attempts: 'This email failed several times. Download the guide and send it manually, or set a new password to start again.',
  in_progress: 'This email is already being sent.',
  request_mismatch: 'This request belongs to a different student.',
};

function cors(origin: string) {
  return {
    'Access-Control-Allow-Origin': ALLOWED.includes(origin) ? origin : ALLOWED[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

async function rest(path: string, init: RequestInit = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { ...SVC_JSON, ...(init.headers || {}) } });
  const t = await r.text();
  let data: any = null;
  try { data = t ? JSON.parse(t) : null; } catch { data = t; }
  return { ok: r.ok, status: r.status, data };
}

function decodeBase64(b64: string): Uint8Array | null {
  try {
    const clean = b64.replace(/^data:application\/pdf;base64,/, '').replace(/\s+/g, '');
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(clean)) return null;
    const bin = atob(clean);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch { return null; }
}

function isPdf(bytes: Uint8Array): boolean {
  if (bytes.length < 64) return false;
  const head = new TextDecoder().decode(bytes.subarray(0, 5));
  const tail = new TextDecoder().decode(bytes.subarray(Math.max(0, bytes.length - 1024)));
  return head === '%PDF-' && tail.includes('%%EOF');
}

function bytesToBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

// Same rule as the admin app's guide file name.
function guideFileName(name: string): string {
  const safe = String(name || 'Student').normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'Student';
  return `Broken-English-Student-Guide-${safe}.pdf`;
}

function displayName(name: string): string {
  return String(name || '').replace(/[\r\n"<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') || '';
  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors(origin), 'Content-Type': 'application/json' } });
  const fail = (code: string, status = 200, extra: Record<string, unknown> = {}) =>
    reply({ ok: false, code, message: MESSAGES[code] || 'Something went wrong. Please try again.', ...extra }, status);

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(origin) });
  if (req.method !== 'POST') return reply({ ok: false, code: 'method_not_allowed' }, 405);

  try {
    // ── 1. Admin only ──
    const auth = req.headers.get('Authorization') || '';
    if (!auth.startsWith('Bearer ')) return reply({ ok: false, code: 'unauthorized', message: 'Please sign in again.' }, 401);
    const ur = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: auth, apikey: SERVICE_KEY } });
    if (!ur.ok) return reply({ ok: false, code: 'session_expired', message: 'Your admin session expired. Sign out and back in.' }, 401);
    const caller = await ur.json();
    if (!caller?.id) return reply({ ok: false, code: 'unauthorized', message: 'Please sign in again.' }, 401);
    const adm = await rest(`admin_users?auth_user_id=eq.${caller.id}&select=auth_user_id&limit=1`);
    if (!Array.isArray(adm.data) || !adm.data.length) return reply({ ok: false, code: 'forbidden', message: 'Admins only.' }, 403);

    // ── 2. Body ──
    const len = Number(req.headers.get('content-length') || 0);
    if (len > MAX_BODY_BYTES) return fail('pdf_too_large', 413);
    let body: any;
    try { body = await req.json(); } catch { return reply({ ok: false, code: 'bad_json', message: 'Invalid request.' }, 400); }
    const action = body?.action;
    const studentId = String(body?.studentId || '');
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(studentId)) return reply({ ok: false, code: 'invalid_student', message: 'Invalid student.' }, 400);

    if (action === 'status') {
      const r = await rest(`student_welcome_emails?student_id=eq.${studentId}&select=status,kind,recipient_email,sent_at,last_attempt_at,error_code,brevo_message_id&order=created_at.desc&limit=1`);
      return reply({ ok: true, last: Array.isArray(r.data) && r.data[0] ? r.data[0] : null });
    }
    if (action !== 'send') return reply({ ok: false, code: 'unknown_action' }, 400);

    const requestId = String(body?.requestId || '');
    if (!UUID_RE.test(requestId)) return reply({ ok: false, code: 'invalid_request', message: 'Invalid request id.' }, 400);
    const kind: 'welcome' | 'credentials' = body?.kind === 'credentials' ? 'credentials' : 'welcome';
    if (typeof body?.pdfBase64 !== 'string') return fail('invalid_pdf', 400);
    const pdf = decodeBase64(body.pdfBase64);
    if (!pdf || !isPdf(pdf)) return fail('invalid_pdf', 400);
    if (pdf.length > MAX_PDF_BYTES) return fail('pdf_too_large', 413);

    // ── 3. The student, their real login, and the recipient (from the server, not the browser) ──
    const sr = await rest(`students?id=eq.${studentId}&select=id,name,email,auth_user_id&limit=1`);
    const stu = Array.isArray(sr.data) ? sr.data[0] : null;
    if (!stu) return fail('student_not_found', 404);
    if (!stu.auth_user_id) return fail('account_not_ready', 409);
    const au = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${stu.auth_user_id}`, { headers: SVC });
    if (!au.ok) return fail('account_not_ready', 409);
    const authUser = await au.json();
    const recipient = String(authUser?.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(recipient)) return fail('invalid_recipient', 400);
    if (recipient !== String(stu.email || '').trim().toLowerCase()) return fail('email_mismatch', 409);

    // ── 4. Resend protection (per student) ──
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const recent = await rest(`student_welcome_emails?student_id=eq.${studentId}&status=eq.sent&sent_at=gte.${since}&request_id=neq.${requestId}&select=id`);
    if (Array.isArray(recent.data) && recent.data.length >= MAX_SENT_PER_10_MIN) return fail('rate_limited', 429);

    // ── 5. Claim this request (idempotency) ──
    const now = new Date().toISOString();
    let claimed = false;
    const ins = await rest('student_welcome_emails', {
      method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ request_id: requestId, student_id: studentId, kind, recipient_email: recipient, status: 'sending', requested_by: caller.id }),
    });
    if (ins.ok) claimed = true;
    else if (ins.status === 409) {
      const ex = await rest(`student_welcome_emails?request_id=eq.${requestId}&select=student_id,status,attempts,last_attempt_at,brevo_message_id,sent_at,recipient_email&limit=1`);
      const row = Array.isArray(ex.data) ? ex.data[0] : null;
      if (!row) return fail('in_progress', 409);
      if (row.student_id !== studentId) return fail('request_mismatch', 409);
      if (row.status === 'sent') {
        return reply({ ok: true, status: 'sent', duplicate: true, messageId: row.brevo_message_id, sentAt: row.sent_at, recipient: row.recipient_email });
      }
      if (row.attempts >= MAX_ATTEMPTS) return fail('too_many_attempts', 429);
      // Re-claim a failed (or stale in-flight) request atomically.
      const stale = new Date(Date.now() - IN_FLIGHT_MS).toISOString();
      const up = await rest(`student_welcome_emails?request_id=eq.${requestId}&status=neq.sent&or=(status.eq.failed,last_attempt_at.lt."${stale}")&attempts=eq.${row.attempts}`, {
        method: 'PATCH', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ status: 'sending', attempts: row.attempts + 1, last_attempt_at: now, error_code: null, recipient_email: recipient }),
      });
      if (Array.isArray(up.data) && up.data.length) claimed = true;
      else return fail('in_progress', 409);
    } else {
      console.error('welcome-email: log insert failed', ins.status);
      return reply({ ok: false, code: 'server_error', message: 'Could not record the email request. Please try again.' }, 500);
    }
    if (!claimed) return fail('in_progress', 409);

    const finish = (fields: Record<string, unknown>) => rest(`student_welcome_emails?request_id=eq.${requestId}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(fields),
    });

    // ── 6. Brevo ──
    const apiKey = Deno.env.get('BREVO_API_KEY') || '';
    const senderEmail = (Deno.env.get('BREVO_SENDER_EMAIL') || '').trim();
    const senderName = (Deno.env.get('BREVO_SENDER_NAME') || 'Broken English').trim();
    if (!apiKey || !EMAIL_RE.test(senderEmail)) {
      await finish({ status: 'failed', error_code: 'brevo_not_configured' });
      return fail('brevo_not_configured', 503);
    }

    const name = displayName(stu.name) || 'Student';
    const payload = {
      sender: { name: senderName, email: senderEmail },
      to: [{ email: recipient, name }],
      subject: SUBJECT[kind],
      htmlContent: renderHtml(name, kind),
      textContent: renderText(name, kind),
      attachment: [{ name: guideFileName(stu.name), content: bytesToBase64(pdf) }],
      tags: ['student-welcome'],
    };

    let res: Response;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), BREVO_TIMEOUT_MS);
    try {
      res = await fetch(BREVO_URL, {
        method: 'POST', signal: ctl.signal,
        headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      clearTimeout(timer);
      console.error('welcome-email: brevo network error', studentId, (e as Error)?.name);
      await finish({ status: 'failed', error_code: 'brevo_unavailable' });
      return fail('brevo_unavailable', 502);
    }
    clearTimeout(timer);

    let out: any = null;
    try { out = await res.json(); } catch { /* empty body */ }
    if (res.ok && out?.messageId) {
      const sentAt = new Date().toISOString();
      await finish({ status: 'sent', brevo_message_id: String(out.messageId).slice(0, 200), sent_at: sentAt, error_code: null });
      return reply({ ok: true, status: 'sent', messageId: out.messageId, sentAt, recipient });
    }

    // Map Brevo errors to safe codes (details stay in the server log).
    const bcode = String(out?.code || ''), bmsg = String(out?.message || '');
    let code = 'brevo_rejected';
    if (res.status === 401 || bcode === 'unauthorized') code = 'brevo_unauthorized';
    else if (/sender/i.test(bmsg)) code = 'sender_not_verified';
    else if (/email/i.test(bmsg) && /valid/i.test(bmsg)) code = 'invalid_recipient';
    else if (res.status >= 500 || res.status === 429) code = 'brevo_unavailable';
    console.error('welcome-email: brevo rejected', studentId, res.status, bcode, bmsg.slice(0, 200));
    await finish({ status: 'failed', error_code: code });
    return fail(code, 502);
  } catch (e) {
    console.error('welcome-email: unexpected', (e as Error)?.message);
    return reply({ ok: false, code: 'server_error', message: 'Something went wrong. Please try again.' }, 500);
  }
});
