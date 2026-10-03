/* boot.js — extracted verbatim from the original single-file index.html.
   Source lines: 1199-1209, 6362-6558
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
// ── BOOT SCREEN ──────────────────────────────────────────────────────────────

// Clear stale video cache on boot so Safari quota doesn't block fresh data
try{localStorage.removeItem('brokeneng_videos');}catch(e){}

// Load videos + dynamic quizzes from Supabase on BOOT
if(typeof _sb!=="undefined"){
  sbLoadVideos().catch(function(e){ console.warn('Boot video load failed:',e); });
  sbLoadAllDynamicQuizzes().catch(function(){});
}

function _bootLog(ev,data){
  try{
    var entry={ev:ev,ts:new Date().toISOString()};
    if(data) Object.assign(entry,data);
    console.log('[BOOT]',JSON.stringify(entry));
    try{var log=JSON.parse(sessionStorage.getItem('_bootLog')||'[]');log.push(entry);if(log.length>30)log=log.slice(-30);sessionStorage.setItem('_bootLog',JSON.stringify(log));}catch(e){}
  }catch(e){}
}


// ── MAINTENANCE MODE ─────────────────────────────────────────────────────────
// The login page stays visible during maintenance (with a notice). Only admins and the
// one bypass account chosen in Admin > Settings may sign in; everyone else is signed out
// with a popup. The database enforces the same rule (public.maintenance_allows_me() +
// "maintenance_gate" RLS policies), so this UI is not the only guard.
var _maintCfg={enabled:false,message:'',bypass:null};
var _maintAllowedMe=true; // last server answer for the signed-in user
async function maintFetchConfig(){
  if(typeof _sb==='undefined') return _maintCfg;
  try{
    var r=await _sb.from('course_config').select('data').eq('id','maintenance_mode').maybeSingle();
    if(!r.error){
      var d=(r.data&&r.data.data)||{};
      _maintCfg={enabled:!!d.enabled,message:d.message||'',bypass:d.bypass_auth_user_id||null};
      _maintenanceActive=_maintCfg.enabled;
      _maintBypassAuthUserId=_maintCfg.bypass;
      maintRefreshBanner();
    }
  }catch(e){}
  return _maintCfg;
}
// Is the signed-in user allowed in right now? Asked of the server (admin / bypass user id).
async function maintCheckMe(){
  if(!_maintCfg.enabled) return (_maintAllowedMe=true);
  try{
    var r=await _sb.rpc('maintenance_allows_me');
    if(!r.error) return (_maintAllowedMe=(r.data===true));
  }catch(e){}
  // Fallback until the database function is installed: compare the server-signed user id.
  try{
    var s=(await _sb.auth.getSession()).data.session;
    var uid=s&&s.user?s.user.id:null;
    return (_maintAllowedMe=!!(uid&&_maintCfg.bypass&&uid===_maintCfg.bypass));
  }catch(e){ return (_maintAllowedMe=false); }
}
function maintBannerHtml(){
  if(!_maintenanceActive) return '';
  var extra=_maintCfg.message?'<span class="m2">'+escapeHtml(_maintCfg.message)+'</span>':'';
  return '<div class="auth-msg maint" role="status"><b>System maintenance</b>'
    +'<span>The platform is currently being updated. Student access is temporarily unavailable.</span>'+extra+'</div>';
}
function maintRefreshBanner(){
  var el=document.getElementById('maint-banner');
  if(el) el.innerHTML=maintBannerHtml();
}
function showMaintenanceModal(){
  if(document.getElementById('maint-modal')) return;
  var m=document.createElement('div');
  m.id='maint-modal'; m.className='maint-modal';
  m.setAttribute('role','alertdialog'); m.setAttribute('aria-modal','true'); m.setAttribute('aria-labelledby','maint-modal-t');
  m.innerHTML='<div class="maint-box">'
    +'<div class="maint-ic"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg></div>'
    +'<h2 id="maint-modal-t">System under maintenance</h2>'
    +'<p>We\'re currently updating the platform.<br>You can\'t log in right now.<br>Please try again later.</p>'
    +'<button type="button" class="auth-btn" id="maint-modal-ok">OK</button></div>';
  var close=function(){ document.removeEventListener('keydown',esc); m.classList.remove('open'); setTimeout(function(){m.remove();},180); };
  var esc=function(e){ if(e.key==='Escape') close(); };
  m.querySelector('#maint-modal-ok').onclick=close;
  m.addEventListener('click',function(e){ if(e.target===m) close(); });
  document.addEventListener('keydown',esc);
  document.body.appendChild(m);
  requestAnimationFrame(function(){ m.classList.add('open'); m.querySelector('#maint-modal-ok').focus(); });
}
// Sign a blocked student out and send them to the login page with the popup.
function maintKickOut(){
  try{ var v=document.querySelector('video'); if(v&&!v.paused) v.pause(); }catch(e){}
  currentSession=null; try{clearSession();}catch(e){}
  if(typeof _sb!=='undefined'){ try{ _sb.auth.signOut().catch(function(){}); }catch(e){} }
  navigate('login');
  showMaintenanceModal();
}

async function bootApp(opts){
  opts=opts||{};
  if(_bootStarted&&!opts.force) return;
  _bootStarted=true;
  _bootLog('BOOT_START');

  // 1. Demo intercept
  var _dtok=parseDemoTokenFromUrl();
  if(_dtok){
    // Demo links are blocked during maintenance (checked before the link is opened, so
    // its timer does not start).
    var _dm=await maintFetchConfig();
    if(_dm.enabled){ renderMaintenanceScreen(_dm.message); startMaintenancePolling(); return; }
    bootDemo(_dtok); return;
  }

  // 1b. Password recovery link intercept.
  // When student clicks a Supabase reset email, URL has type=recovery.
  // Do NOT run normal boot — let onAuthStateChange PASSWORD_RECOVERY handle it.
  var _urlP=new URLSearchParams(window.location.search);
  if(!opts.skipRecovery&&(_urlP.get('type')==='recovery'||(_urlP.get('reset')==='1'&&_urlP.get('token_hash')))){
    _bootLog('RECOVERY_URL');
    app.innerHTML='<div style="min-height:100vh;background:var(--bg);display:flex;align-items:center;justify-content:center;padding:24px;font-family:Montserrat,sans-serif">'
      +'<div style="text-align:center;max-width:340px;width:100%">'
      +'<div style="width:60px;height:60px;border-radius:16px;background:rgba(255,45,120,.12);border:1px solid rgba(255,45,120,.3);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:28px">🔑</div>'
      +'<h2 style="font-family:Montserrat,sans-serif;font-size:18px;font-weight:800;color:#fff;margin-bottom:10px">Preparing Password Reset...</h2>'
      +'<p style="font-size:13px;color:rgba(255,255,255,.5);line-height:1.7">Verifying your reset link. Please wait.</p>'
      +'</div></div>';
    // Fallback: if PASSWORD_RECOVERY event never fires (expired/invalid link), go to login after 8s
    setTimeout(function(){
      if(!document.getElementById('email-reset-overlay')){
        _bootLog('RECOVERY_TIMEOUT');
        _bootStarted=false;
        app.innerHTML='';
        bootApp({force:true,skipRecovery:true});
      }
    },8000);
    return; // onAuthStateChange PASSWORD_RECOVERY fires and shows showPasswordResetFromEmail()
  }

  // 2. Resolve Supabase Auth JWT FIRST — needed for maintenance bypass check
  var sbSession=null, sbAuthErr=null;
  if(typeof _sb!=='undefined'){
    try{
      var authRes=await _sb.auth.getSession();
      if(!authRes.error) sbSession=authRes.data.session;
      else sbAuthErr=authRes.error;
      _bootLog('AUTH_RESOLVE',{hasJwt:!!sbSession});
    }catch(e){ sbAuthErr=e; _bootLog('AUTH_NET_ERR',{msg:e.message}); }
  }

  // 3. Local session (fast-path, valid for offline / network error cases).
  //    loadSession() only ever returns role:'student' — the admin panel is admin.html.
  var localSess=loadSession();

  // 5. Maintenance config
  var _mc=await maintFetchConfig();
  _bootLog('MAINT_CHECK',{enabled:_mc.enabled,hasBypass:!!_mc.bypass});

  // 6. Maintenance gate — login page stays available; only admins and the bypass account
  //    (server-verified) get past it. A blocked signed-in student is signed out.
  if(_mc.enabled){
    var _allowed=sbSession?await maintCheckMe():false;
    if(!_allowed){
      if(sbSession||localSess){
        _bootLog('MAINT_SIGNED_OUT');
        currentSession=null; try{clearSession();}catch(e){}
        try{ await _sb.auth.signOut(); }catch(e){}
        navigate('login'); showMaintenanceModal();
      } else {
        navigate('login');
      }
      startMaintenancePolling();
      return;
    }
    _bootLog('MAINT_BYPASSED',{uid:sbSession.user.id});
    // Fall through to normal boot — bypass student / admin gets full access
  }

  // 7. Student auth: JWT is authoritative; local session is a safe fallback on network error
  var hasAuth=!!(sbSession||localSess);

  if(hasAuth){
    _bootLog('AUTH_OK');

    // JWT valid but no local session → re-derive student ID from Supabase profile
    if(sbSession&&!localSess){
      try{
        var pr=await _sb.from('students')
          .select('id,name,email,valid_until,access_list,created_at,completed_at')
          .eq('auth_user_id',sbSession.user.id).limit(1);
        if(!pr.error&&pr.data&&pr.data.length){
          var d=pr.data[0];
          var stuObj={id:d.id,name:d.name,email:d.email,validUntil:d.valid_until||null,
            accessList:d.access_list||[1],createdAt:d.created_at||new Date().toISOString(),completedAt:d.completed_at||null};
          var existing=loadStudents(); existing[d.id]=stuObj; saveStudents(existing);
          localSess={role:'student',studentId:d.id}; saveSession(localSess);
          _bootLog('SESSION_REBUILT');
        }
      }catch(e){ _bootLog('REBUILD_ERR',{msg:e.message}); }
    }

    // A Supabase session with no linked student profile (e.g. an admin account signed in
    // here by an older build) is never treated as a student.
    if(!localSess){
      _bootLog('JWT_WITHOUT_STUDENT');
      navigate('login');
      startMaintenancePolling();
      return;
    }

    currentSession=localSess;
    showAppLoader();

    // Background data — NEVER block navigation on these
    if(typeof _sb!=='undefined'&&currentSession.studentId){
      Promise.all([
        sbLoadProgress(currentSession.studentId).catch(function(e){ _bootLog('PROG_ERR',{msg:e.message}); }),
        sbLoadVideos().catch(function(e){ _bootLog('VID_ERR',{msg:e.message}); }),
        sbLoadELSettings().catch(function(e){ _bootLog('EL_ERR',{msg:e.message}); })
      ]).then(function(){ _videosBootLoaded=true; _bootLog('DATA_OK'); });
    } else {
      _videosBootLoaded=true;
    }

    navigate('dashboard');
    startMaintenancePolling();
    return;
  }

  // 8. Network error with no local session — could be network failure, not genuine logout
  if(sbAuthErr&&!localSess){
    _bootLog('NET_ERR_NO_SESSION');
    renderReconnectingScreen();
    return;
  }

  // 9. Definitively unauthenticated
  _bootLog('UNAUTHENTICATED');
  navigate('login');
  startMaintenancePolling();
}

function renderMaintenanceScreen(msg){
  app.innerHTML='<div style="min-height:100vh;background:var(--bg);display:flex;align-items:center;justify-content:center;padding:24px;font-family:Montserrat,sans-serif">'
    +'<div style="text-align:center;max-width:380px;width:100%">'
    +'<div style="width:72px;height:72px;border-radius:20px;background:rgba(255,165,0,.12);border:1px solid rgba(255,165,0,.3);display:flex;align-items:center;justify-content:center;margin:0 auto 24px;font-size:32px">🔧</div>'
    +'<h1 style="font-family:Montserrat,sans-serif;font-size:22px;font-weight:800;color:#fff;margin-bottom:12px;line-height:1.3">System Update<br>in Progress</h1>'
    +'<p style="font-size:14px;color:rgba(255,255,255,.5);line-height:1.7;margin-bottom:32px">'+(msg||"We're making improvements to give you a better experience. We'll be back shortly.")+'</p>'
    +'<div style="display:flex;align-items:center;justify-content:center;gap:8px;font-size:12px;color:rgba(255,165,0,.7);font-family:JetBrains Mono,monospace">'
    +'<div style="width:8px;height:8px;border-radius:50%;background:rgba(255,165,0,.7);animation:maintPulse 1.5s ease infinite"></div>Checking status...</div>'
    +'</div></div>'
    +'<style>@keyframes maintPulse{0%,100%{opacity:1}50%{opacity:.3}}</style>';
  app.setAttribute('data-screen','maintenance');
}

function renderReconnectingScreen(){
  app.innerHTML='<div style="min-height:100vh;background:var(--bg);display:flex;align-items:center;justify-content:center;padding:24px;font-family:Montserrat,sans-serif">'
    +'<div style="text-align:center;max-width:340px;width:100%">'
    +'<div style="width:60px;height:60px;border-radius:16px;background:rgba(59,130,246,.12);border:1px solid rgba(59,130,246,.3);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:28px">📶</div>'
    +'<h2 style="font-family:Montserrat,sans-serif;font-size:18px;font-weight:800;color:#fff;margin-bottom:10px">Connecting...</h2>'
    +'<p style="font-size:13px;color:rgba(255,255,255,.5);line-height:1.7;margin-bottom:24px">Having trouble reaching the server. Check your connection and try again.</p>'
    +'<button onclick="window._retryBoot()" style="background:var(--grad);border:none;border-radius:10px;color:#fff;font-family:Montserrat,sans-serif;font-weight:700;font-size:14px;padding:12px 28px;cursor:pointer;box-shadow:0 4px 14px rgba(255,45,120,.3)">Retry</button>'
    +'</div></div>';
  app.setAttribute('data-screen','reconnecting');
  window._retryBoot=function(){
    _bootStarted=false;
    app.removeAttribute('data-screen');
    bootApp({force:true});
  };
}

function startMaintenancePolling(){
  if(_maintPollInterval) return;
  _maintPollInterval=setInterval(async function(){
    if(typeof _sb==='undefined') return;
    try{
      var cfg=await maintFetchConfig(); // also refreshes the login-page notice
      // Demo maintenance screen: reopen the app once maintenance is over.
      if(app.getAttribute('data-screen')==='maintenance'){
        if(!cfg.enabled){
          clearInterval(_maintPollInterval); _maintPollInterval=null;
          _bootStarted=false; app.removeAttribute('data-screen');
          bootApp({force:true});
        }
        return;
      }
      // Turned on while a student is signed in → sign them out unless allowed.
      if(cfg.enabled&&currentSession&&!(await maintCheckMe())) maintKickOut();
      if(!cfg.enabled) _maintAllowedMe=true;
    }catch(e){} // network error — stay on current screen
  },15000);
}

// BFCache: page restored from history — re-sync data without triggering full boot
window.addEventListener('pageshow',function(e){
  if(!e.persisted) return;
  if(typeof _sb!=='undefined'&&currentSession){
    waitForSb(5000).then(function(ok){
      if(!ok) return;
      sbLoadVideos().catch(function(){});
      maintFetchConfig().then(function(cfg){
        if(!cfg.enabled||!currentSession) return;
        return maintCheckMe().then(function(ok){ if(!ok) maintKickOut(); });
      }).catch(function(){});
    });
  }
});

// Reconnect: if on reconnecting screen and network comes back, auto-retry
window.addEventListener('online',function(){
  if(app.getAttribute('data-screen')==='reconnecting'){
    _bootStarted=false; app.removeAttribute('data-screen');
    bootApp({force:true});
  }
});

// Handle Supabase Auth password recovery email link.
// Fires when student clicks the reset-password link in their email.
// Must be registered before bootApp() so it catches the INITIAL_SESSION→PASSWORD_RECOVERY sequence.
if(typeof _sb!=='undefined'){
  _sb.auth.onAuthStateChange(function(event,session){
    if(event==='PASSWORD_RECOVERY'){
      // Stop any in-progress boot navigation and show set-new-password form.
      // showPasswordResetFromEmail is defined in js/pages/login.js.
      if(typeof window.showPasswordResetFromEmail==='function'){
        window.showPasswordResetFromEmail();
      }
    }
  });
}

// Start boot
bootApp();
