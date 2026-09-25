/* session.js — STUDENT app session (index.html only).
   Shared caches / currentSession / app live in js/shared/state.js.
   The admin app never reads or writes brokeneng_session. */

// ── PERSISTENT SESSION (48h) ─────────────────────────────────────────────────
var SESSION_KEY="brokeneng_session", SESSION_HOURS=48;
function saveSession(sess){
  try{localStorage.setItem(SESSION_KEY,JSON.stringify({s:sess,exp:Date.now()+SESSION_HOURS*3600*1000}));}catch(e){}
}
function loadSession(){
  try{
    var raw=localStorage.getItem(SESSION_KEY);
    if(!raw) return null;
    var d=JSON.parse(raw);
    if(!d||!d.s||!d.exp||Date.now()>d.exp){localStorage.removeItem(SESSION_KEY);return null;}
    // Only student sessions are valid here. Older builds stored admin sessions under this key;
    // those are discarded — the admin app (admin.html) has its own server-verified session.
    if(d.s.role!=='student'){localStorage.removeItem(SESSION_KEY);return null;}
    return d.s;
  }catch(e){return null;}
}
function clearSession(){try{localStorage.removeItem(SESSION_KEY);}catch(e){}}
// True when the current viewer may see student-facing screens (real student OR demo).
// Used by screen guards so the demo experience reuses the exact same course UI.
function _viewGuardOk(){return !!(currentSession&&(currentSession.role==='student'||currentSession.role==='demo'));}

// ─── DETERMINISTIC BOOT STATE MACHINE ────────────────────────────────────────
// Single entry point. Guard prevents double-boot (BFCache, visibilitychange).
// STATES: BOOTING → maintenance | student-dashboard | reconnecting | login
var _bootStarted=false;
var _maintPollInterval=null;
