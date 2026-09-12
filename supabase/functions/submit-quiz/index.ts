// ============================================================================
// Broken English MTI — Submit Quiz Edge Function
// Server-side quiz grading. Correct answers never reach the browser.
//
// POST /functions/v1/submit-quiz
// Headers: Authorization: Bearer <supabase-jwt>
// Body: { lessonOrder: number, responses: { [questionId]: number } }
//
// Returns: { score, total, passed, results: { [qid]: boolean } }
//
// Security:
//   * Requires valid Supabase Auth JWT
//   * Loads correct answers from quiz_answers table (service role)
//   * Score calculated server-side; browser-submitted scores ignored
// Deploy: supabase functions deploy submit-quiz
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL   = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON  = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_ORIGIN     = Deno.env.get("APP_ORIGIN") || "https://academy.brokenenglish.in";

const PASS_THRESHOLD = 0.7; // 70% to pass

// Rate limit: 5 quiz submissions per minute per user (prevent answer-grinding)
const rateBuckets = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

function cors(origin: string) {
  const allowed = [APP_ORIGIN, "http://localhost:3000"];
  const o = allowed.includes(origin) ? origin : APP_ORIGIN;
  return {
    "Access-Control-Allow-Origin":  o,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function jsonError(msg: string, status: number, origin: string) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json" },
  });
}
function json(body: unknown, origin: string) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...cors(origin), "Content-Type": "application/json" },
  });
}

function checkRate(uid: string): boolean {
  const now = Date.now();
  const slot = rateBuckets.get(uid);
  if (!slot || now - slot.windowStart > RATE_WINDOW_MS) {
    rateBuckets.set(uid, { count: 1, windowStart: now });
    return true;
  }
  if (slot.count >= RATE_LIMIT) return false;
  slot.count++;
  return true;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || APP_ORIGIN;
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return jsonError("method_not_allowed", 405, origin);

  // ── 1. Auth ───────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return jsonError("unauthorized", 401, origin);

  const jwt = authHeader.slice(7);
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authErr } = await anonClient.auth.getUser();
  if (authErr || !user) return jsonError("unauthorized", 401, origin);

  // ── 2. Rate limit ─────────────────────────────────────────────────────────────
  if (!checkRate(user.id)) return jsonError("rate_limit_exceeded", 429, origin);

  // ── 3. Parse body ─────────────────────────────────────────────────────────────
  let body: { lessonOrder?: number; responses?: Record<string, number> };
  try { body = await req.json(); } catch { return jsonError("bad_json", 400, origin); }

  const lessonOrder = parseInt(String(body.lessonOrder || "0"), 10);
  const responses = body.responses || {};
  if (!lessonOrder || lessonOrder < 1) return jsonError("invalid_lesson_order", 400, origin);
  if (typeof responses !== "object" || Array.isArray(responses)) {
    return jsonError("invalid_responses", 400, origin);
  }

  // ── 4. Load correct answers server-side (service role) ───────────────────────
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: answerRows, error: ansErr } = await admin
    .from("quiz_answers")
    .select("question_id, correct_index")
    .eq("lesson_order", lessonOrder);

  if (ansErr) {
    console.error("quiz_answers fetch error:", ansErr);
    return jsonError("server_error", 500, origin);
  }

  // If no server-side answers, fall back to legacy (transitional period)
  if (!answerRows || answerRows.length === 0) {
    return json({
      score: 0, total: 0, passed: false,
      results: {}, legacy: true,
      message: "No server-side answers for this lesson yet"
    }, origin);
  }

  // ── 5. Grade server-side ──────────────────────────────────────────────────────
  const results: Record<string, boolean> = {};
  let correct = 0;

  for (const row of answerRows) {
    const submitted = responses[row.question_id];
    const isCorrect = typeof submitted === "number" && submitted === row.correct_index;
    results[row.question_id] = isCorrect;
    if (isCorrect) correct++;
  }

  const total  = answerRows.length;
  const score  = total > 0 ? Math.round((correct / total) * 100) : 0;
  const passed = score >= PASS_THRESHOLD * 100;

  // ── 6. Store result (best-effort, non-blocking) ────────────────────────────────
  // Look up student by auth_user_id
  const { data: studentRow } = await admin
    .from("students")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (studentRow?.id) {
    await admin.from("student_progress").upsert({
      student_id:   studentRow.id,
      lesson_id:    `quiz_result_${lessonOrder}`,
      completed_at: new Date().toISOString(),
    }, { onConflict: "student_id,lesson_id" }).then(() => {});
  }

  return json({ score, total, passed, results }, origin);
});
