// ============================================================================
// Broken English MTI — TTS (Text-to-Speech) Edge Function
// Proxies ElevenLabs so the API key never reaches the browser.
//
// POST /functions/v1/tts
// Headers: Authorization: Bearer <supabase-jwt>
// Body: { text: string, voiceId?: string }
//
// Returns: audio/mpeg stream
//
// Rate limit: 20 req/min per user (in-memory, resets on cold start)
// Deploy: supabase functions deploy tts
// Secrets: ELEVENLABS_API_KEY (set via supabase secrets set)
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON    = Deno.env.get("SUPABASE_ANON_KEY")!;
const EL_API_KEY       = Deno.env.get("ELEVENLABS_API_KEY")!;
const APP_ORIGIN       = Deno.env.get("APP_ORIGIN") || "https://academy.brokenenglish.in";

const ALLOWED_VOICES   = new Set([
  "21m00Tcm4TlvDq8ikWAM", // Rachel
  "AZnzlk1XvdvUeBnXmlld", // Domi
  "EXAVITQu4vr4xnSDxMaL", // Bella
  "ErXwobaYiN019PkySvjV", // Antoni
  "MF3mGyEYCl7XYWbV9V6O", // Elli
  "TxGEqnHWrfWFTfGW9XjX", // Josh
  "VR6AewLTigWG4xSOukaG", // Arnold
  "pNInz6obpgDQGcFmaJgB", // Adam
]);
const DEFAULT_VOICE    = "21m00Tcm4TlvDq8ikWAM";
const MAX_TEXT_LEN     = 500;
const RATE_LIMIT       = 20;  // per minute
const RATE_WINDOW_MS   = 60_000;

// In-memory rate limiter (resets on cold start — good enough for abuse prevention)
const rateBuckets = new Map<string, { count: number; windowStart: number }>();

function corsHeaders(origin: string) {
  const allowed = [APP_ORIGIN, "http://localhost:3000", "http://127.0.0.1:5500"];
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
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

function checkRate(uid: string): boolean {
  const now  = Date.now();
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

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") {
    return jsonError("method_not_allowed", 405, origin);
  }

  // ── 1. Verify Supabase Auth JWT ──────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return jsonError("unauthorized", 401, origin);
  }
  const jwt = authHeader.slice(7);
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return jsonError("unauthorized", 401, origin);
  }

  // ── 2. Rate limit ─────────────────────────────────────────────────────────────
  if (!checkRate(user.id)) {
    return jsonError("rate_limit_exceeded", 429, origin);
  }

  // ── 3. Parse + validate body ──────────────────────────────────────────────────
  let body: { text?: string; voiceId?: string };
  try { body = await req.json(); } catch { return jsonError("bad_json", 400, origin); }

  const text    = (body.text || "").trim().slice(0, MAX_TEXT_LEN);
  const voiceId = ALLOWED_VOICES.has(body.voiceId || "") ? body.voiceId! : DEFAULT_VOICE;

  if (!text) return jsonError("text_required", 400, origin);
  if (text.length < 1) return jsonError("text_too_short", 400, origin);

  // ── 4. Call ElevenLabs server-side ────────────────────────────────────────────
  if (!EL_API_KEY) {
    return jsonError("tts_not_configured", 503, origin);
  }

  const elRes = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": EL_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );

  if (!elRes.ok) {
    // Don't expose ElevenLabs error details to client
    console.error("ElevenLabs error:", elRes.status, await elRes.text());
    return jsonError("tts_upstream_error", 502, origin);
  }

  // ── 5. Stream audio back ──────────────────────────────────────────────────────
  return new Response(elRes.body, {
    status: 200,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
});
