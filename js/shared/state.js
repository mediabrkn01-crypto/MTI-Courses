/* state.js — in-memory state shared by the student app and the admin app.
   Data caches only. Each app owns its OWN session logic:
     student → js/session.js   (key: brokeneng_session)
     admin   → js/admin/admin-app.js (key: brokeneng_admin_session + separate Supabase auth storage) */
var _dynamicQuizCache={}; // {lessonOrder: [{id,prompt,options,answer}]}
var _videoData={}; // always from Supabase, never stale cache
var _dripCache={}; // {studentId: {dateStr: Set<order>}} — loaded from Supabase
var _progressCache={}; // in-memory progress {studentId: Set} — survives Safari localStorage quota failures
var _quizPassedCache={}; // in-memory quiz passed {studentId: Set}
var _quizAttemptedCache={}; // in-memory quiz attempted {studentId: Set}
var _videosBootLoaded=false; // prevents double-load on first navigate
var _maintenanceActive=false; // current maintenance state
var _maintBypassAuthUserId=null; // auth_user_id of the maintenance bypass student
let currentSession=null; // set by whichever app is running: {role:'student'|'demo'} or {role:'admin'}

function isDemoSession(){return !!(currentSession&&currentSession.role==='demo');}

const app=document.getElementById("app");
// Safe getElementById + addEventListener helper
function $on(id,evt,fn){var el=document.getElementById(id);if(el)el.addEventListener(evt,fn);}
