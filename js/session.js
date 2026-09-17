/* session.js — extracted verbatim from the original single-file index.html.
   Source lines: 844-847, 888-895, 1340-1356, 1359-1365, 1814-1818, 6356-6361
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
// Save all video metadata to Supabase (admin action)
// ── DYNAMIC QUIZ FUNCTIONS ───────────────────────────────────────────────────
var _dynamicQuizCache={}; // {lessonOrder: [{id,prompt,options,answer}]}

// Load video metadata from Supabase → merge into localStorage → re-render if needed
var _videoData={}; // always from Supabase, never stale cache
var _dripCache={}; // {studentId: {dateStr: Set<order>}} — loaded from Supabase
var _progressCache={}; // in-memory progress {studentId: Set} — survives Safari localStorage quota failures
var _quizPassedCache={}; // in-memory quiz passed {studentId: Set}
var _quizAttemptedCache={}; // in-memory quiz attempted {studentId: Set}
var _videosBootLoaded=false; // prevents double-load on first navigate
var _maintenanceActive=false; // reflects current maintenance state for admin badge
let currentSession=null;

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
    return d.s;
  }catch(e){return null;}
}
function clearSession(){try{localStorage.removeItem(SESSION_KEY);}catch(e){}}
// True when the current viewer may see student-facing screens (real student OR demo).
// Used by screen guards so the demo experience reuses the exact same course UI.
function _viewGuardOk(){return !!(currentSession&&(currentSession.role==='student'||currentSession.role==='demo'));}
function isDemoSession(){return !!(currentSession&&currentSession.role==='demo');}

let adminUnlockAll=false;

// ─── ROUTER ───────────────────────────────────────────────────────────────────
const app=document.getElementById("app");
// Safe getElementById + addEventListener helper
function $on(id,evt,fn){var el=document.getElementById(id);if(el)el.addEventListener(evt,fn);}

// ─── DETERMINISTIC BOOT STATE MACHINE ────────────────────────────────────────
// Single entry point. Guard prevents double-boot (BFCache, visibilitychange).
// STATES: BOOTING → admin | maintenance | student-dashboard | reconnecting | login
var _bootStarted=false;
var _maintPollInterval=null;
