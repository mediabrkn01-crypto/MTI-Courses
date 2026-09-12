// ============================================================================
// Broken English MTI — Demo Access Edge Function
// Server-side authority for the 15-minute demo system.
//
// Actions (POST JSON { action, ... }):
//   create   (admin) -> generate secure token, store only its SHA-256 hash
//   activate (public)-> atomic first activation, server sets activated/expires
//   validate (public)-> heartbeat: returns authoritative status + server time
//   revoke   (admin) -> invalidate a link immediately
//   list     (admin) -> list all links (with prospect PII) for admin panel
//   delete   (admin) -> hard delete a link
//
// Security:
//   * Service-role key lives ONLY in this function's env (never in frontend).
//   * anon/authenticated cannot touch demo_access_links (RLS deny-all).
//   * Admin actions verify email+password against course_config.admin_cred.
//   * Raw token is returned exactly once (on create) and never stored/logged.
// Deploy with:  supabase functions deploy demo-access --no-verify-jwt
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Optional extra guard: if set, admin actions ALSO require this shared secret
// (header x-demo-admin-secret). Leave unset to rely on admin_cred only.
const ADMIN_SHARED_SECRET = Deno.env.get("DEMO_ADMIN_SHARED_SECRET") || "";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-demo-admin-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// ── secure token + hashing ──────────────────────────────────────────────────
function base64url(bytes: Uint8Array): string {
  let s = btoa(String.fromCharCode(...bytes));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function generateToken(): string {
  // 32 random bytes = 256 bits of entropy (>> 128-bit requirement)
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return base64url(buf);
}
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Constant-time-ish string compare
function safeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ── admin verification (server-side, against course_config.admin_cred) ───────
async function verifyAdmin(req: Request, body: any): Promise<boolean> {
  if (ADMIN_SHARED_SECRET) {
    const hdr = req.headers.get("x-demo-admin-secret") || "";
    if (!safeEqual(hdr, ADMIN_SHARED_SECRET)) return false;
  }
  const email = (body?.admin?.email || "").trim().toLowerCase();
  const password = body?.admin?.password || "";
  if (!email || !password) return false;

  const { data, error } = await admin
    .from("course_config").select("data").eq("id", "admin_cred").single();
  if (error || !data?.data?.email) return false;

  const okEmail = safeEqual(email, String(data.data.email).trim().toLowerCase());
  const okPass  = safeEqual(password, String(data.data.password ?? ""));
  return okEmail && okPass;
}

// Public status shape returned to the browser (no token_hash, no PII on public paths)
function publicStatus(row: any, serverNow: string) {
  return {
    status: row.status,
    server_now: serverNow,
    created_at: row.created_at,
    activated_at: row.activated_at,
    expires_at: row.expires_at,
    revoked: !!row.revoked_at,
    duration_minutes: row.duration_minutes,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  const action = String(body?.action || "");

  try {
    // ── ACTIVATE (public) — atomic first activation ─────────────────────────
    if (action === "activate") {
      const token = String(body?.token || "");
      if (!token) return json({ error: "missing_token", status: "invalid" }, 400);
      const hash = await sha256Hex(token);

      const { data, error } = await admin.rpc("activate_demo_link", {
        p_token_hash: hash,
        p_user_agent: (req.headers.get("user-agent") || "").slice(0, 400),
        p_device: String(body?.device_id || "").slice(0, 120) || null,
      });
      if (error) return json({ error: "server_error", status: "invalid" }, 500);
      if (!data) return json({ status: "invalid" }, 200); // unknown token

      const nowRow = await admin.rpc("reconcile_demo_status", { p_token_hash: hash });
      const row = nowRow.data || data;
      const serverNow = new Date().toISOString();
      return json(publicStatus(row, serverNow), 200);
    }

    // ── VALIDATE (public) — heartbeat ───────────────────────────────────────
    if (action === "validate") {
      const token = String(body?.token || "");
      if (!token) return json({ error: "missing_token", status: "invalid" }, 400);
      const hash = await sha256Hex(token);
      const { data, error } = await admin.rpc("reconcile_demo_status", { p_token_hash: hash });
      if (error) return json({ error: "server_error", status: "invalid" }, 500);
      if (!data) return json({ status: "invalid" }, 200);
      return json(publicStatus(data, new Date().toISOString()), 200);
    }

    // ── everything below requires admin ─────────────────────────────────────
    if (["create", "revoke", "list", "delete"].includes(action)) {
      const ok = await verifyAdmin(req, body);
      if (!ok) return json({ error: "unauthorized" }, 401);
    }

    // ── CREATE (admin) ──────────────────────────────────────────────────────
    if (action === "create") {
      const token = generateToken();
      const hash = await sha256Hex(token);
      const duration = Math.max(1, Math.min(600, parseInt(body?.duration_minutes ?? 15, 10) || 15));

      const { data, error } = await admin.from("demo_access_links").insert({
        token_hash: hash,
        duration_minutes: duration,
        status: "not_started",
        student_name: body?.student_name || null,
        student_phone: body?.student_phone || null,
        student_email: body?.student_email || null,
        created_by: (body?.admin?.email || "").trim().toLowerCase() || null,
      }).select().single();
      if (error) return json({ error: "server_error", detail: error.message }, 500);

      // Raw token returned ONCE. Never stored, never logged.
      return json({ ok: true, token, link: data }, 200);
    }

    // ── REVOKE (admin) ──────────────────────────────────────────────────────
    if (action === "revoke") {
      const id = String(body?.id || "");
      if (!id) return json({ error: "missing_id" }, 400);
      const { data, error } = await admin.from("demo_access_links")
        .update({ revoked_at: new Date().toISOString(), status: "revoked" })
        .eq("id", id).select().single();
      if (error) return json({ error: "server_error", detail: error.message }, 500);
      return json({ ok: true, link: data }, 200);
    }

    // ── DELETE (admin) ──────────────────────────────────────────────────────
    if (action === "delete") {
      const id = String(body?.id || "");
      if (!id) return json({ error: "missing_id" }, 400);
      const { error } = await admin.from("demo_access_links").delete().eq("id", id);
      if (error) return json({ error: "server_error", detail: error.message }, 500);
      return json({ ok: true }, 200);
    }

    // ── LIST (admin) ────────────────────────────────────────────────────────
    if (action === "list") {
      const { data, error } = await admin.from("demo_access_links")
        .select("id,duration_minutes,created_at,activated_at,expires_at,revoked_at,status,student_name,student_phone,student_email,created_by,last_seen_at,activation_count")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) return json({ error: "server_error", detail: error.message }, 500);
      // Lazily reflect expiry in the returned rows (DB status may lag until next touch)
      const now = Date.now();
      const rows = (data || []).map((r: any) => {
        let status = r.status;
        if (r.revoked_at) status = "revoked";
        else if (!r.activated_at) status = "not_started";
        else if (r.expires_at && new Date(r.expires_at).getTime() <= now) status = "expired";
        else status = "active";
        return { ...r, status };
      });
      return json({ ok: true, links: rows, server_now: new Date().toISOString() }, 200);
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    return json({ error: "server_error", detail: String(e) }, 500);
  }
});
