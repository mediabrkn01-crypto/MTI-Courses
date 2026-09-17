/* demo.js — extracted verbatim from the original single-file index.html.
   Source lines: 5725-5792, 5802-5804, 5811-6022
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
// ============================================================================
// 15-MINUTE DEMO CLASS ACCESS SYSTEM
// Server (Supabase Edge Function + service role) is the sole authority for
// activation & expiry. The client only DISPLAYS a monotonic countdown derived
// from the server-provided expires_at, and re-syncs every heartbeat.
// ============================================================================
var DEMO_ENDPOINT   = SUPABASE_URL + '/functions/v1/clever-api';
var DEMO_ALLOW_ALL  = true;                 // demo can freely explore all lessons for the window
var DEMO_LESSONS    = [1];                  // used only when DEMO_ALLOW_ALL=false (lesson .order values)
var DEMO_HEARTBEAT_MS = 20000;              // revalidate against server every 20s
var DEMO_NET_GRACE_MS = 45000;              // max time we tolerate a failing server before locking
// wordvault = "Pronunciation Workshop" (unlocked for demo). 'live' (Live With Sreekanth) intentionally EXCLUDED.
var DEMO_ALLOWED_SCREENS = ['dashboard','courses','lesson','quiz','quizzes','wordvault','achievements','profile'];
var DEMO_WA_MESSAGE = 'Hi, I attended the Broken English MTI demo class. I would like to know more about joining the course.';
var _demoCounsellor = '';    // counsellor WhatsApp for THIS demo link (from server record)
var _demoDurationMin = 15;   // duration for THIS demo link (from server record)

var _demoStudent = null;                    // synthetic in-memory student (see loadStudents)
var _demoToken   = null;
var _demoLocked  = false;
var _demoEndKind = 'expired';               // expired | revoked | invalid | network
var _demoPerfBase = 0, _demoRemMs = 0, _demoLastGood = 0;
var _demoCountdownTimer = null, _demoHeartbeatTimer = null;
var _demoValidating = false, _demoZeroChecked = false;
var _demoChannel = (typeof BroadcastChannel!=='undefined') ? new BroadcastChannel('be_demo') : null;

function _demoDeviceId(){
  try{
    var k='be_demo_device', v=localStorage.getItem(k);
    if(!v){ v=(Date.now().toString(36)+Math.random().toString(36).slice(2)); localStorage.setItem(k,v); }
    return v;
  }catch(e){ return 'nodev'; }
}
async function _demoApi(payload){
  var res = await fetch(DEMO_ENDPOINT, {
    method:'POST',
    headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY},
    body: JSON.stringify(payload)
  });
  return await res.json();
}

function parseDemoTokenFromUrl(){
  try{
    var t = new URLSearchParams(location.search).get('demo');
    return (t && t.length>=20) ? t : null;
  }catch(e){ return null; }
}

// Central authorization for demo sessions
function canDemoLesson(lesson){
  if(DEMO_ALLOW_ALL) return true;
  return DEMO_LESSONS.indexOf(lesson.order)!==-1;
}
function canDemoAccess(screen){
  return DEMO_ALLOWED_SCREENS.indexOf(screen)!==-1;
}

// ── monotonic countdown (immune to system-clock tampering) ──────────────────
function _demoSyncFromServer(resp){
  var rem = Date.parse(resp.expires_at) - Date.parse(resp.server_now);
  if(isFinite(rem)){ _demoRemMs = Math.max(0, rem); _demoPerfBase = performance.now(); }
  _demoLastGood = performance.now();
  // Capture per-link metadata authoritatively from the server on every sync.
  if(resp.counsellor_whatsapp!=null) _demoCounsellor = resp.counsellor_whatsapp;
  if(resp.duration_minutes!=null) _demoDurationMin = resp.duration_minutes;
}

function _demoRemainingMs(){
  return Math.max(0, _demoRemMs - (performance.now() - _demoPerfBase));
}
// ── activation / boot ───────────────────────────────────────────────────────
async function bootDemo(token){
  _demoToken = token;
  renderDemoLoading();
  var resp;
  try{
    resp = await _demoApi({ action:'activate', token: token, device_id: _demoDeviceId() });
  }catch(e){
    return renderDemoExpiredScreen('network');
  }
  if(!resp || resp.status==='invalid') return renderDemoExpiredScreen('invalid');
  if(resp.revoked || resp.status==='revoked') return renderDemoExpiredScreen('revoked');
  if(resp.status==='expired') return renderDemoExpiredScreen('expired');
  if(resp.status!=='active') return renderDemoExpiredScreen('invalid');
  _demoSyncFromServer(resp);
  startDemoSession();
}

function startDemoSession(){
  _demoLocked = false;
  // Synthetic, non-persistent student so the real course UI renders unchanged.
  _demoStudent = { id:'__demo__', name:'Demo Student', email:'', phone:'',
                   accessList:[1], validUntil:null, completedAt:null };
  currentSession = { role:'demo', studentId:'__demo__', demo:true };
  // NOTE: intentionally NOT saved via saveSession() — demo never persists across the 48h store.
  installDemoNavGuard();
  var _ld=document.getElementById('demo-lock-screen'); if(_ld) _ld.remove();  // clear the "Preparing…" overlay
  document.body.style.overflow='';
  injectDemoTimerUI();
  startDemoCountdown();
  startDemoHeartbeat();
  navigate('dashboard');
  // Keep the token in the URL so a refresh re-identifies the SAME session (no restart).
}

function startDemoCountdown(){
  if(_demoCountdownTimer) clearInterval(_demoCountdownTimer);
  updateDemoTimerUI();
  _demoCountdownTimer = setInterval(function(){
    updateDemoTimerUI();
    if(_demoRemainingMs()<=0 && !_demoZeroChecked){
      _demoZeroChecked = true;          // ask the server to confirm expiry, then lock
      demoHeartbeatOnce();
    }
  }, 500);
}

function startDemoHeartbeat(){
  if(_demoHeartbeatTimer) clearInterval(_demoHeartbeatTimer);
  _demoHeartbeatTimer = setInterval(demoHeartbeatOnce, DEMO_HEARTBEAT_MS);
}

async function demoHeartbeatOnce(){
  if(_demoLocked || _demoValidating || !_demoToken) return;
  _demoValidating = true;
  var badge = document.getElementById('demo-timer-net');
  try{
    var resp = await _demoApi({ action:'validate', token: _demoToken, device_id: _demoDeviceId() });
    if(!resp){ throw new Error('empty'); }
    if(resp.status==='invalid') return expireDemoSession('invalid');
    if(resp.revoked || resp.status==='revoked') return expireDemoSession('revoked');
    if(resp.status==='expired') return expireDemoSession('expired');
    // still active — resync authoritative time
    _demoSyncFromServer(resp);
    _demoZeroChecked = false;
    if(badge) badge.style.display='none';
  }catch(e){
    // Network failure: short grace, but NEVER extend the server deadline.
    if(badge) badge.style.display='inline';
    if(performance.now() - _demoLastGood > DEMO_NET_GRACE_MS) return expireDemoSession('network');
  }finally{
    _demoValidating = false;
  }
}

// ── persistent timer UI (top-right, existing visual language) ───────────────
function injectDemoTimerUI(){
  document.body.classList.add('demo-active');   // reserve the top band
  if(document.getElementById('demo-topbar')) return;
  var bar = document.createElement('div');
  bar.id = 'demo-topbar';
  bar.innerHTML =
    '<div id="demo-timer">'+
      '<span class="demo-timer-dot"></span>'+
      '<div class="demo-timer-txt">'+
        '<span class="demo-timer-label">Demo Session</span>'+
        '<span id="demo-timer-clock">15:00</span>'+
        '<span class="demo-timer-sub">remaining<span id="demo-timer-net" style="display:none;color:#fbbf24"> · reconnecting</span></span>'+
      '</div>'+
    '</div>';
  document.body.appendChild(bar);
}
function updateDemoTimerUI(){
  var c = document.getElementById('demo-timer-clock');
  var box = document.getElementById('demo-timer');
  if(!c || !box) return;
  var ms = _demoRemainingMs();
  c.textContent = _fmtClock(ms);
  box.classList.toggle('demo-warn', ms>0 && ms<=5*60*1000);
  box.classList.toggle('demo-danger', ms>0 && ms<=60*1000);
}

// ── navigation guard (central, no per-screen duplication) ───────────────────
var _origNavigate = null;
function installDemoNavGuard(){
  if(_origNavigate) return;
  _origNavigate = navigate;
  navigate = function(screen, params){
    if(isDemoSession()){
      if(_demoLocked){ renderDemoExpiredScreen(_demoEndKind); return; }
      if(!canDemoAccess(screen)) return;         // silently block admin/login routes
    }
    return _origNavigate(screen, params);
  };
}

// ── media teardown ──────────────────────────────────────────────────────────
function stopAllMedia(){
  try{
    document.querySelectorAll('video').forEach(function(v){ try{ v.pause(); v.removeAttribute('src'); v.load(); }catch(e){} });
    document.querySelectorAll('audio').forEach(function(a){ try{ a.pause(); a.currentTime=0; a.removeAttribute('src'); }catch(e){} });
    // YouTube / Bunny iframes — blanking src stops playback immediately
    document.querySelectorAll('iframe').forEach(function(f){ try{ f.src='about:blank'; }catch(e){} });
    if(typeof _wvAudio!=='undefined' && _wvAudio){ try{ _wvAudio.pause(); }catch(e){} }
  }catch(e){}
}

// ── expiry / lock ─────────────────────────────────────────────────────────--
function clearDemoSession(){
  if(_demoCountdownTimer){ clearInterval(_demoCountdownTimer); _demoCountdownTimer=null; }
  if(_demoHeartbeatTimer){ clearInterval(_demoHeartbeatTimer); _demoHeartbeatTimer=null; }
  try{ localStorage.removeItem(getProgressKey('__demo__')); }catch(e){}
  _demoStudent = null;
}
function expireDemoSession(kind){
  if(_demoLocked && document.getElementById('demo-lock-screen')) return;
  _demoEndKind = kind || 'expired';
  _demoLocked = true;
  stopAllMedia();
  clearDemoSession();
  if(_demoChannel){ try{ _demoChannel.postMessage({t:'expire',kind:_demoEndKind}); }catch(e){} }
  renderDemoExpiredScreen(_demoEndKind);
  // Prevent Back/Forward from restoring usable course content
  try{ history.replaceState({demoLocked:true},'', location.pathname+location.search); }catch(e){}
  try{ window.close(); }catch(e){}   // works only for script-opened tabs; harmless otherwise
}

function renderDemoLoading(){
  document.body.classList.add('demo-active');
  _demoOverlay(
    '<div class="demo-spin"></div>'+
    '<div style="font-family:Montserrat,sans-serif;font-weight:800;font-size:20px;color:#fff;margin-top:18px">Preparing your demo class…</div>'+
    '<div style="font-size:13px;color:var(--muted);margin-top:6px">Validating your secure invitation</div>'
  , false);
}
function renderDemoExpiredScreen(kind){
  document.body.classList.add('demo-active');
  _demoLocked = (kind!=='__none__');
  stopAllMedia();
  var dur = (_demoDurationMin && _demoDurationMin>0) ? (_demoDurationMin+'-minute ') : '';
  var title, msg, showCTA=true;
  if(kind==='invalid'){ title='Invalid Demo Link'; msg='This demo link is invalid or no longer available.'; showCTA=false; }
  else if(kind==='revoked'){ title='Demo Access Revoked'; msg='This demo invitation is no longer active.'; }
  else if(kind==='network'){ title='Demo Session Locked'; msg='We could not confirm your session with the server. Please reconnect and open your demo link again.'; }
  else { title='Your Demo Session Has Ended'; msg='Your '+dur+'MTI demo class is complete.'; }
  // Single CTA — Contact Us opens the counsellor's WhatsApp assigned to THIS demo link.
  var hasNum = normalizeWhatsApp(_demoCounsellor).length >= 8;
  var cta = showCTA
    ? '<div style="display:flex;justify-content:center;margin-top:24px">'+
        (hasNum
          ? '<button onclick="openCounsellorWhatsApp()" class="demo-cta demo-cta-brand">Contact Us</button>'
          : '<div style="font-size:13px;color:var(--muted)">Please contact our support team.</div>')+
      '</div>'
    : '';
  var extra = (kind==='expired')
    ? '<div style="font-size:13px;color:var(--muted);margin-top:10px;max-width:420px">Ready to continue your transformation? Contact our course counsellor to learn more.</div>'
    : '';
  _demoOverlay(
    '<div style="font-size:40px;margin-bottom:6px">'+(kind==='invalid'?'⚠️':(kind==='revoked'?'🚫':(kind==='network'?'📡':'⏱️')))+'</div>'+
    '<div style="font-family:Montserrat,sans-serif;font-weight:900;font-size:26px;color:#fff;line-height:1.15">'+title+'</div>'+
    '<div style="font-size:14px;color:rgba(255,255,255,.85);margin-top:10px;max-width:420px">'+msg+'</div>'+
    extra + cta
  , true);
}
// Full-screen, non-dismissible overlay that completely replaces the app view.
function _demoOverlay(innerHtml, lock){
  var existing = document.getElementById('demo-lock-screen');
  if(existing) existing.remove();
  var ov = document.createElement('div');
  ov.id = 'demo-lock-screen';
  ov.className = 'demo-lock-screen';
  ov.innerHTML = '<div class="demo-lock-card">'+innerHtml+'</div>';
  document.body.appendChild(ov);
  var t = document.getElementById('demo-topbar'); if(t && lock) t.style.display='none';
  if(lock){
    try{ app.innerHTML=''; }catch(e){}
    document.body.style.overflow='hidden';
  }
}

// ── revalidate on tab focus / wake / reconnect / bfcache restore ────────────
document.addEventListener('visibilitychange', function(){ if(!document.hidden && isDemoSession() && !_demoLocked) demoHeartbeatOnce(); });
window.addEventListener('online', function(){ if(isDemoSession() && !_demoLocked) demoHeartbeatOnce(); });
window.addEventListener('pageshow', function(e){
  if(e.persisted){ // restored from bfcache — must revalidate before trusting anything
    if(_demoLocked){ renderDemoExpiredScreen(_demoEndKind); }
    else if(isDemoSession()){ demoHeartbeatOnce(); }
  }
});
window.addEventListener('popstate', function(){ if(_demoLocked){ renderDemoExpiredScreen(_demoEndKind); } });
if(_demoChannel){ _demoChannel.onmessage = function(ev){ if(ev.data && ev.data.t==='expire' && isDemoSession()) expireDemoSession(ev.data.kind||'expired'); }; }
