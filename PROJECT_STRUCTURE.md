# Project Structure

The Broken English Academy portal used to be one ~7,450-line `index.html` containing
the markup, a 544-line `<style>` block and ~6,800 lines of JavaScript. This document
describes the multi-file layout it was split into.

**This was a structural refactor only — zero functional changes, zero visual changes.**
Every CSS rule and every line of JavaScript was moved *verbatim*; nothing was rewritten,
reformatted, renamed or deleted. The original file is preserved untouched at
`legacy/index-single-file-backup.html`.

---

## Critical constraint: these are NOT ES modules

The UI is built by generating HTML strings that contain inline handlers:

```js
'<button onclick="adminQuizDelete(' + order + ')">Delete</button>'
```

Inline handlers are resolved against `window`. ES module exports are **not** on `window`,
so switching to `type="module"` would silently break every button in the app without a
full rewrite of every HTML-string template.

Therefore:

- All files are loaded with plain `<script src="...">` — **never** `type="module"`.
- All globals stay on `window` exactly as before.
- Dependency order is managed purely by the order of the `<script>` tags in `index.html`.
- Do not add `import` / `export` to any file in `js/`.

The `<script>` tags live at the **end of `<body>`**, not in `<head>`, because several
files read the DOM at load time — most importantly
`const app = document.getElementById("app")` in `js/session.js`.

---

## Layout

```
index.html                          Slim shell: meta, CSS links, script tags (100 lines)
legacy/
  index-single-file-backup.html     The original single-file build. Do not modify.
css/                                10 stylesheets (see below)
js/                                 37 scripts (see below)
PROJECT_STRUCTURE.md                This file
supabase/                           Edge functions / SQL. Untouched by the refactor.
```

## CSS

The `<link>` tags are emitted in an order that **reproduces the original cascade**, so
concatenating them yields the same rule order the single `<style>` block had. A few
non-adjacent blocks were grouped by theme; in every such case the moved rules were
checked for selector conflicts with the rules they moved past (there were none).

| File | Contents |
| --- | --- |
| `variables.css` | The `:root` custom properties (`--bg`, `--grad`, `--brand`, …) |
| `base.css` | Global reset, `html`, `body`, scrollbars, boot screen, screen-warn |
| `sidebar.css` | Everything `.sb-*`: brand, nav, items, voice widget, collapsed/dock hover |
| `layout.css` | `#main-content`, dashboard split layout, progress bar |
| `components.css` | Glass/cards, module banners, buttons, tabs, inputs, quiz options, pills, class cards, toggles, avatars, journey strip, stats, achievements, login orbs, mesh border-glow, app loader |
| `admin.css` | `.admin-top-bar`, `.admin-table`, `.settings-grid` |
| `video-player.css` | `#player-wrapper`, video protection, watermark drift |
| `demo.css` | Demo timer band, lock screen, toasts, confirm modal, demo links table |
| `responsive.css` | The main mobile `@media` blocks (767px / 820px / 480px) |
| `maintenance.css` | Placeholder — see note below |

**`maintenance.css` is intentionally near-empty.** The original `<style>` block contained
no maintenance rules: the only one (`@keyframes maintPulse`) is emitted inline inside
`renderMaintenanceScreen()` in `js/boot.js`. That inline `<style>` was deliberately left
exactly where it was so behaviour is unchanged. The file exists as the documented home
for future maintenance-screen CSS.

Note that `responsive.css` does not hold *every* `@media` query. Some media queries are
interleaved with the rules they override (e.g. the sidebar's collapsed/desktop breakpoints)
and moving them would change the cascade. Those stayed with their section.

## JavaScript — load order

This order **is** the dependency order. Changing it can break the app.

```
js/protection.js         Selection / drag / PiP / tab-blur deterrents
js/config.js             Site branding, colors, drip settings, logo sources, boot-time
                         branding effects (favicon, brand CSS vars, version self-check)
js/data.js               SECTIONS, ALL_LESSONS, QUIZ_BANK, DAY_*, MODULE_IMAGES, BADGES, WV_DATA
js/supabase-client.js    SUPABASE_URL / SUPABASE_ANON_KEY, _sb client, waitForSb()
js/utils/storage.js      localStorage wrappers (students, progress, photos, locks)
js/utils/formatting.js   Date/time/HTML formatters, avatars, validity badges
js/utils/security.js     escapeHtml, escapeAttr, safeUrl, normalizeWhatsApp, togglePw
js/session.js            currentSession + the shared in-memory caches, `const app`
js/services/videos.js    sbLoadVideos / sbSaveVideos, thumb re-sync
js/services/students.js  Student + progress Supabase queries
js/services/quizzes.js   Quiz CRUD, scores, access gating, quiz file parsing
js/services/elevenlabs.js TTS endpoint + voice settings + pronunciation
js/services/demo.js      Demo token runtime: heartbeat, countdown, nav guard, expiry
js/components/loader.js  showAppLoader / hideAppLoader
js/components/modal.js   createBxSelect, demoToast, showDemoConfirm
js/components/sidebar.js sidebarHtml, mobile nav, collapse/hover-expand
js/components/topbar.js  topBarHtml, notifications, adminTopBar, glassBtn
js/components/effects.js Border-glow + dock-magnify, and the MutationObserver that
                         re-applies them after every render
js/pages/*.js            login, dashboard, courses, lesson, quiz, workshop,
                         achievements, live
js/admin/*.js            settings, students, progress, classes, quizzes, images,
                         demo-access, then admin.js (the tab dispatcher)
js/auth.js               doStudentLogin, doAdminLogin, logout, boot splash
js/router.js             navigate(), render(), popstate, navigateToPhase
js/boot.js               bootApp(), maintenance + reconnecting screens, polling,
                         and the bootApp() call that starts the app
```

`js/boot.js` loads last because `bootApp()` calls into nearly everything.
`js/components/effects.js` must load *before* `boot.js`, because `bootApp()` renders
synchronously and the render hook calls `applyBorderGlowToAll()` / `applyDockMagnifyToAll()`.

### Placement notes (deviations from a purely thematic split)

A few functions live somewhere other than the "obvious" file, because load-time
execution order forced it. These are deliberate:

- **`getLogoSrc()` / `getSymbolSrc()` are in `config.js`, not `utils/security.js`.**
  The `applyBrandColors()` IIFE in `config.js` calls `getLogoSrc()` at load time, and
  `utils/security.js` loads later.
- **`addDays()`, `today`, `courseStart` are in `config.js`, not `utils/formatting.js`.**
  `const courseStart = addDays(today,-2)` executes immediately and feeds `SECTIONS`.
- **`waitForSb()` is in `supabase-client.js`**, since it waits for the Supabase client.
- **The boot-time `sbLoadVideos()` / `sbLoadAllDynamicQuizzes()` kick-off moved to the top
  of `boot.js`** (original lines 1199–1209). It could not stay in `config.js`, which loads
  before the Supabase client and the service files exist. Both calls are fire-and-forget
  and still start before `bootApp()`, exactly as before.

### Cache busting

Every CSS and JS asset is referenced with `?v=20260917`. Bump that value in
`index.html` when deploying so browsers pick up changed files.

---

## Security

- `js/config.js` / `js/supabase-client.js` contain only the **Supabase URL and the anon
  (publishable) key**. These are browser-safe by design and were already public in the
  original build; RLS is what protects the data.
- **No service-role key, ElevenLabs API key, or Bunny signing secret appears anywhere in
  the frontend.** The ElevenLabs key lives in Supabase Edge Function secrets; the client
  only calls the `tts` function.
- Admin authentication remains Supabase Auth + the `admin_users` table, and the
  `_sb.rpc('is_admin')` pattern is unchanged.
- The `supabase/` directory was not touched.

---

## How the refactor was verified

1. **Exact line coverage** — the extraction was driven by explicit line ranges over the
   original, with an automated check that every source line lands in exactly one output
   file: no duplicated lines, no gaps.
2. **CSS losslessness** — the concatenation of the 10 stylesheets is the same multiset of
   rules as the original `<style>` block (532/532 non-blank lines).
3. **Syntax** — all 37 JS files pass `node --check` individually, and the full
   concatenation in load order also parses (which would catch any duplicate top-level
   `const`/`let`). A separate scan confirmed zero duplicated top-level declarations.
4. **Runtime** — served locally and loaded in a browser. Boot completes with no console
   errors; Supabase connects and dynamic quizzes load.
5. **Rendered-output equality** — the original and the refactor were loaded side by side
   and every screen was rendered in both. The login screen and all pure HTML-producing
   helpers (`sidebarHtml`, `topBarHtml`, `statsStripHtml`, `journeyStripHtml`,
   `adminTopBar`, `mobileNavHtml`, `avatarHtml`, `validityBadge`, `renderQuizCta`, …)
   hash **byte-identically**, as do `escapeHtml`, `safeUrl`, `getUnlockedSet`,
   `getYouTubeId`, `normalizeWhatsApp`, `formatDate` and the data constants.
6. **Error sweep** — rendering all 20 screens and admin tabs on the refactored build
   (dashboard, courses, lesson, quiz, workshop, achievements, live, profile, both logins,
   all 7 admin tabs, admin-student, admin-progress-student) produced **zero** thrown
   exceptions, `window.onerror` events, unhandled rejections or `console.error` calls.

Admin tabs could not be byte-compared because their content comes from live Supabase data
and they re-render asynchronously (a one-tab render lag that is present in the original
build too, and is unrelated to this refactor).
