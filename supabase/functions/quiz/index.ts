// quiz — Supabase Edge Function. Serves, checks and scores the Mission challenge quizzes.
//
// Every quiz question a student sees comes from public.quiz_answers (the single private
// answer key: question text, options, order and correct option). The browser never
// receives an answer before it has submitted its own; each answer is graded here
// immediately, stored, and locked — it cannot be changed or re-tried in that attempt.
//
// POST { action: 'start',  lessonOrder }                         → resume the open attempt or start one
// POST { action: 'answer', attemptId, questionId, optionIndex, optionText } → grade + lock one answer
// POST { action: 'finish', attemptId }                           → score from stored answers
//
// The correct option is matched by its TEXT (normalised) with the index as a cross-check,
// so reordering options in the admin editor can never move the key onto another option.
//
// Zero imports (native fetch to REST) — same pattern as admin-set-student-password.
// Deploy: supabase functions deploy quiz --no-verify-jwt   (the JWT is verified below)

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ALLOWED = ["https://academy.brokenenglish.in", "http://localhost:8235"];
const PASS_PCT = 70;

const SVC = { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY };
const SVC_JSON = { ...SVC, "Content-Type": "application/json" };

function cors(origin: string) {
  return {
    "Access-Control-Allow-Origin": ALLOWED.includes(origin) ? origin : ALLOWED[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
function reply(body: unknown, status: number, origin: string) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json" } });
}
function norm(s: unknown): string {
  return String(s ?? "").normalize("NFKC").replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/\s+/g, " ").trim().toLowerCase();
}
async function rest(path: string, init: RequestInit = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { ...SVC_JSON, ...(init.headers || {}) } });
  const t = await r.text();
  let data: unknown = null;
  try { data = t ? JSON.parse(t) : null; } catch { data = t; }
  if (!r.ok) throw new Error(`${r.status} ${typeof data === "string" ? data : JSON.stringify(data)}`);
  return data as any;
}

type Q = { id: string; prompt: string; options: string[]; hint?: string | null };

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
  if (req.method !== "POST") return reply({ error: "method_not_allowed" }, 405, origin);

  try {
    // ── auth ──
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) return reply({ error: "unauthorized" }, 401, origin);
    const ur = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: auth, apikey: SERVICE_KEY } });
    if (!ur.ok) return reply({ error: "session_expired" }, 401, origin);
    const user = await ur.json();
    if (!user?.id) return reply({ error: "unauthorized" }, 401, origin);

    const stu = await rest(`students?auth_user_id=eq.${user.id}&select=id&limit=1`);
    if (!Array.isArray(stu) || !stu.length) return reply({ error: "no_student" }, 403, origin);
    const studentId: string = stu[0].id;

    let body: any;
    try { body = await req.json(); } catch { return reply({ error: "bad_json" }, 400, origin); }
    const action = body?.action;

    const loadAttempt = async (id: string) => {
      if (!/^[0-9a-f-]{36}$/i.test(String(id || ""))) return null;
      const a = await rest(`quiz_attempts?id=eq.${id}&auth_user_id=eq.${user.id}&select=*&limit=1`);
      return Array.isArray(a) && a.length ? a[0] : null;
    };
    const answersOf = async (attemptId: string) => {
      const rows = await rest(`quiz_attempt_answers?attempt_id=eq.${attemptId}&select=question_id,selected_index,is_correct,correct_index`);
      const out: Record<string, { selectedIndex: number; isCorrect: boolean; correctIndex: number }> = {};
      (rows || []).forEach((r: any) => { out[r.question_id] = { selectedIndex: r.selected_index, isCorrect: r.is_correct, correctIndex: r.correct_index }; });
      return out;
    };

    // ── start: resume the open attempt (refresh-safe) or create one ──
    if (action === "start") {
      const lessonOrder = parseInt(String(body.lessonOrder), 10);
      if (!(lessonOrder >= 1 && lessonOrder <= 100)) return reply({ error: "invalid_lesson" }, 400, origin);

      const open = await rest(`quiz_attempts?auth_user_id=eq.${user.id}&lesson_order=eq.${lessonOrder}&finished_at=is.null&select=*&order=started_at.desc&limit=1`);
      if (Array.isArray(open) && open.length) {
        const a = open[0];
        return reply({ attemptId: a.id, questions: a.questions, answers: await answersOf(a.id), resumed: true }, 200, origin);
      }

      const upl = await rest(`quiz_answers?lesson_order=eq.${lessonOrder}&source=eq.uploaded&select=question_id&limit=1`);
      const source = Array.isArray(upl) && upl.length ? "uploaded" : "builtin";
      const rows = await rest(`quiz_answers?lesson_order=eq.${lessonOrder}&source=eq.${source}&select=question_id,prompt,options,hint,correct_index,correct_text,position&order=position.asc,question_id.asc`);
      if (!Array.isArray(rows) || !rows.length) return reply({ error: "no_quiz" }, 404, origin);

      const questions: Q[] = [];
      const key: Record<string, { index: number; text: string }> = {};
      for (const r of rows) {
        if (!r.prompt || !Array.isArray(r.options) || r.options.length < 2) continue; // unusable row — never served
        const ci = r.options.findIndex((o: string) => norm(o) === norm(r.correct_text));
        if (ci < 0) continue; // key text matches no option — never served (flagged by the audit query)
        questions.push({ id: r.question_id, prompt: r.prompt, options: r.options, hint: r.hint || null });
        key[r.question_id] = { index: ci, text: r.options[ci] };
      }
      if (!questions.length) return reply({ error: "no_quiz" }, 404, origin);

      const created = await rest(`quiz_attempts`, {
        method: "POST", headers: { Prefer: "return=representation" },
        body: JSON.stringify({ student_id: studentId, auth_user_id: user.id, lesson_order: lessonOrder, source, questions, answer_key: key }),
      });
      return reply({ attemptId: created[0].id, questions, answers: {}, resumed: false }, 200, origin);
    }

    // ── answer: grade one question immediately and lock it ──
    if (action === "answer") {
      const a = await loadAttempt(body.attemptId);
      if (!a) return reply({ error: "attempt_not_found" }, 404, origin);
      if (a.finished_at) return reply({ error: "attempt_finished" }, 409, origin);
      const qid = String(body.questionId || "");
      const q: Q | undefined = (a.questions || []).find((x: Q) => x.id === qid);
      const k = a.answer_key?.[qid];
      if (!q || !k) return reply({ error: "unknown_question" }, 400, origin);

      // Already answered → return the stored (locked) result unchanged.
      const prev = await rest(`quiz_attempt_answers?attempt_id=eq.${a.id}&question_id=eq.${encodeURIComponent(qid)}&select=selected_index,is_correct,correct_index&limit=1`);
      if (Array.isArray(prev) && prev.length) {
        return reply({ questionId: qid, selectedIndex: prev[0].selected_index, isCorrect: prev[0].is_correct, correctIndex: prev[0].correct_index, locked: true }, 200, origin);
      }

      // Identify the chosen option by its text (stable), falling back to the index.
      let sel = -1;
      if (typeof body.optionText === "string") sel = q.options.findIndex((o) => norm(o) === norm(body.optionText));
      if (sel < 0 && Number.isInteger(body.optionIndex) && body.optionIndex >= 0 && body.optionIndex < q.options.length) sel = body.optionIndex;
      if (sel < 0) return reply({ error: "invalid_option" }, 400, origin);

      const isCorrect = norm(q.options[sel]) === norm(k.text);
      try {
        await rest(`quiz_attempt_answers`, {
          method: "POST", headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ attempt_id: a.id, question_id: qid, selected_index: sel, selected_text: q.options[sel], is_correct: isCorrect, correct_index: k.index }),
        });
      } catch (e) {
        // Double-click race: the first stored answer wins.
        const again = await rest(`quiz_attempt_answers?attempt_id=eq.${a.id}&question_id=eq.${encodeURIComponent(qid)}&select=selected_index,is_correct,correct_index&limit=1`);
        if (Array.isArray(again) && again.length) {
          return reply({ questionId: qid, selectedIndex: again[0].selected_index, isCorrect: again[0].is_correct, correctIndex: again[0].correct_index, locked: true }, 200, origin);
        }
        throw e;
      }
      return reply({ questionId: qid, selectedIndex: sel, isCorrect, correctIndex: k.index, locked: true }, 200, origin);
    }

    // ── finish: score from the stored answers only ──
    if (action === "finish") {
      const a = await loadAttempt(body.attemptId);
      if (!a) return reply({ error: "attempt_not_found" }, 404, origin);
      const answers = await answersOf(a.id);
      const total = (a.questions || []).length;
      const correct = Object.values(answers).filter((x) => x.isCorrect).length;
      const pct = total ? Math.round((correct / total) * 100) : 0;
      const passed = pct >= PASS_PCT;
      if (!a.finished_at) {
        const now = new Date().toISOString();
        await rest(`quiz_attempts?id=eq.${a.id}`, {
          method: "PATCH", headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ finished_at: now, score: correct, total, pct, passed }),
        });
        // Same records the app already reads for progress / achievements.
        const lessonId = `a-${a.lesson_order}`;
        await rest(`quiz_scores?on_conflict=student_id,lesson_id`, {
          method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify({ student_id: a.student_id, lesson_id: lessonId, score: correct, total, pct, submitted_at: now }),
        }).catch(() => {});
        await rest(`student_progress?on_conflict=student_id,lesson_id`, {
          method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify({ student_id: a.student_id, lesson_id: `quiz_result_${a.lesson_order}`, completed_at: now }),
        }).catch(() => {});
      }
      return reply({ score: correct, total, pct, passed, answers }, 200, origin);
    }

    return reply({ error: "unknown_action" }, 400, origin);
  } catch (e) {
    console.error("quiz error:", e);
    return reply({ error: "server_error" }, 500, origin);
  }
});
