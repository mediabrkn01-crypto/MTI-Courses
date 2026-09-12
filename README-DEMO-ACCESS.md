# 15-Minute Demo Class Access System — Broken English MTI

Server-authoritative timed demo invitations, bolted onto the existing SPA
without touching branding, students, progress, quizzes, video, or admin login.

---

## 1. Architecture (short)

```
Admin panel (Demo Access tab)
        │  create / revoke / delete / list   (sends admin email+password)
        ▼
Supabase Edge Function  demo-access   ── holds SERVICE ROLE key (env only)
        │  service-role writes                 verifies admin vs course_config.admin_cred
        ▼
Postgres  demo_access_links (RLS: deny-all to anon)
   activate_demo_link()  ← atomic, idempotent first-activation (server clock)
        ▲
        │  activate / validate   (public, needs only the raw token)
Prospect browser (?demo=TOKEN)  ── Demo module: monotonic countdown + 20s heartbeat
```

- **Server is the only clock.** `activated_at`/`expires_at` are set by Postgres
  `now()` inside `activate_demo_link()`. The client never sends or chooses them.
- **Idempotent activation.** `coalesce(activated_at, now())` in a single `UPDATE`
  (row lock) means: first open sets the times; every later open keeps the
  originals. Reopen / refresh / second browser / new tab → same expiry, never a
  restart. Concurrent first opens can only produce ONE activation.
- **Token security.** 256-bit random token (`crypto.getRandomValues`), only its
  SHA-256 hash is stored. Raw token is returned once (in the URL) and never logged.
- **Clock-tamper proof.** The on-screen countdown counts down from
  `performance.now()` (monotonic — immune to system clock changes) seeded from the
  server's `expires_at - server_now`, and re-syncs every heartbeat.
- **Admin auth is server-side.** Privileged actions re-verify the admin
  email+password against `course_config.admin_cred` inside the function. No
  service-role key ever reaches the browser.

---

## 2. Files

| File | What |
|------|------|
| `index (2).html` | **Edited in place.** All frontend demo logic + admin Demo Access tab + CSS. |
| `supabase/migrations/20260912_demo_access_links.sql` | Table, indexes, RLS, `activate_demo_link()`, `reconcile_demo_status()`. |
| `supabase/functions/demo-access/index.ts` | Edge Function (create/activate/validate/revoke/list/delete). |

### Changes made inside `index.html` (all additive)
- `loadStudents()` — merges an in-memory synthetic `__demo__` student (never persisted).
- Added `_viewGuardOk()` + `isDemoSession()`; screen guards now accept `role:'demo'`.
- `isUnlocked()` / `isVideoAccessible()` — demo branch via `canDemoLesson()`.
- `sbSaveProgress()` — no-ops for demo (progress stays temporary/local).
- `adminTopBar()` — new **🎟 Demo Access** tab; `renderAdmin()` routes `tab==='demo'`.
- New **Demo module** (before the boot IIFE): token parse, activate, session,
  monotonic countdown, heartbeat, nav guard, media teardown, lock/expiry/invalid/
  revoked screens, BroadcastChannel, `pageshow`/`visibilitychange`/`online` hooks.
- New **Demo admin panel** (`renderDemoAdmin` + handlers) with live table.
- Boot IIFE now intercepts `?demo=TOKEN` **before** normal login/session restore.
- CSS block for the timer pill, lock screen, toast (existing dark/glass/gradient style).

---

## 3. Environment variables (Edge Function)

Auto-provided by Supabase — **do not set manually**:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional extra lock (recommended for production):
- `DEMO_ADMIN_SHARED_SECRET` — if set, admin actions ALSO require header
  `x-demo-admin-secret`. (Frontend does not send it by default; leave unset unless
  you wire it in.)

**Never** put the service-role key in `index.html`, git, or any public var.

---

## 4. Deployment (project ref: `rbhxufnfzsmkzenqavmf`)

> The website's Supabase project is NOT the one connected to the assistant's tools,
> so run these yourself. Requires Supabase CLI + `supabase login`.

```bash
# 0. from a folder containing the supabase/ directory from this deliverable
supabase link --project-ref rbhxufnfzsmkzenqavmf

# 1. apply the migration (creates table + functions + RLS)
supabase db push
# — or paste supabase/migrations/20260912_demo_access_links.sql into
#   Supabase Studio → SQL Editor → Run

# 2. deploy the Edge Function (custom token auth inside → no JWT gate)
supabase functions deploy demo-access --no-verify-jwt
```

No secrets to set unless you opt into `DEMO_ADMIN_SHARED_SECRET`:
```bash
supabase secrets set DEMO_ADMIN_SHARED_SECRET=your-long-random-string
```

Then just deploy the edited `index.html` the same way you deploy the site today.

---

## 5. Test checklist (maps to your TEST 1–14)

| # | Test | Handled by |
|---|------|-----------|
| 1 | Generated but unused → still fresh 15:00 on first open | `activate_demo_link` sets times only on first open (unused link has `activated_at IS NULL`). |
| 2 | Normal countdown → auto-locks at expiry, no refresh | Monotonic countdown hits 0 → `demoHeartbeatOnce()` → server says `expired` → `expireDemoSession()`. |
| 3 | Refresh mid-session → ~remaining time, not 15:00 | `?demo` stays in URL; boot re-`activate` returns original `expires_at` (idempotent). |
| 4 | Close & reopen → remaining only | Same idempotent activation. |
| 5 | Second browser → only remaining | Server expiry is per-token, not per-device. |
| 6 | Expired URL → never opens, shows Expired | `bootDemo` gets `status:'expired'` → `renderDemoExpiredScreen('expired')`. |
| 7 | Clock manipulation → no extension | Countdown uses `performance.now()`; expiry is server `expires_at`. |
| 8 | Admin revoke → student locked next heartbeat | `revoke` sets `revoked_at`; heartbeat (≤20s) → `expireDemoSession('revoked')`. |
| 9 | Refresh after revoke → still revoked | Boot `activate`/`validate` returns `revoked`. |
| 10 | Multiple tabs → one shared expiry | All read server `expires_at`; BroadcastChannel also broadcasts expiry. |
| 11 | Sleep past expiry → locks on wake | `visibilitychange` + `pageshow(persisted)` → immediate revalidate. |
| 12 | Back button after expiry → no course | `history.replaceState` + `popstate`/nav-guard re-render lock screen. |
| 13 | Normal student → unchanged | Guards fall through to original behavior; boot only diverts on `?demo`. |
| 14 | Admin → unchanged + new tab | New tab added; other admin functions untouched. |

### Extra safeguards
- **Network failure:** short grace (`DEMO_NET_GRACE_MS`, 45s); never extends the
  server deadline; locks if the server can't confirm within grace.
- **Media teardown at expiry:** pauses/blanks all `<video>`, `<audio>`, and
  `<iframe>` (YouTube/Bunny) + Word-vault audio.
- **No-cache / bfcache:** existing cache-control preserved; `pageshow.persisted`
  forces revalidation before trusting a restored page.

---

## 6. Configuration knobs (top of the Demo module in index.html)
- `DEMO_ALLOW_ALL` (default `true`) — demo can freely explore all lessons for the
  window. Set `false` and list lesson `.order` values in `DEMO_LESSONS` to restrict.
- `DEMO_HEARTBEAT_MS` (20000) — server revalidation cadence.
- `DEMO_NET_GRACE_MS` (45000) — max tolerated offline time before locking.
- Duration is per-link (`duration_minutes`, default 15) — the UI currently offers
  only 15, but the column + function already support other values.
