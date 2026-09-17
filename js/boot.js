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

async function bootApp(opts){
  opts=opts||{};
  if(_bootStarted&&!opts.force) return;
  _bootStarted=true;
  _bootLog('BOOT_START');

  // 1. Demo intercept
  var _dtok=parseDemoTokenFromUrl();
  if(_dtok){ bootDemo(_dtok); return; }

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

  // 3. Local session (fast-path, valid for offline / network error cases)
  var localSess=loadSession();

  // 4. Admin path — always bypasses maintenance
  if(localSess&&localSess.role==='admin'){
    currentSession=localSess;
    waitForSb().then(function(ok){ if(ok) sbLoadAllStudents().catch(function(){}); });
    navigate('admin');
    startMaintenancePolling();
    return;
  }

  // 5. Check maintenance config (now that we have auth state for bypass check)
  var maintEnabled=false, maintMsg='', maintBypassAuthUid=null;
  if(typeof _sb!=='undefined'){
    try{
      var mr=await _sb.from('course_config').select('data').eq('id','maintenance_mode').maybeSingle();
      if(!mr.error&&mr.data&&mr.data.data){
        maintEnabled=!!mr.data.data.enabled;
        maintMsg=mr.data.data.message||'';
        maintBypassAuthUid=mr.data.data.bypass_auth_user_id||null;
      }
      _bootLog('MAINT_CHECK',{enabled:maintEnabled,hasBypass:!!maintBypassAuthUid});
    }catch(e){ _bootLog('MAINT_ERR',{msg:e.message}); }
  }
  // Store for polling comparisons
  _maintBypassAuthUserId=maintBypassAuthUid;

  // 6. Maintenance gate — bypass if this user's JWT uid matches the configured bypass account
  if(maintEnabled){
    var currentAuthUid=sbSession&&sbSession.user?sbSession.user.id:null;
    var isBypassed=!!(maintBypassAuthUid&&currentAuthUid&&currentAuthUid===maintBypassAuthUid);
    if(!isBypassed){
      _maintenanceActive=true;
      renderMaintenanceScreen(maintMsg);
      startMaintenancePolling();
      return;
    }
    _bootLog('MAINT_BYPASSED',{uid:currentAuthUid});
    // Fall through to normal boot — bypass student gets full access
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

    currentSession=localSess||{role:'student',studentId:null};
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
      var r=await _sb.from('course_config').select('data').eq('id','maintenance_mode').maybeSingle();
      var cfg=(r.data&&r.data.data)||{};
      var isOn=!!cfg.enabled;
      var pollMsg=cfg.message||'';
      var bypassUid=cfg.bypass_auth_user_id||null;
      var bypassName=cfg.bypass_student_name||'';
      _maintBypassAuthUserId=bypassUid;
      _maintenanceActive=isOn;

      // Update admin badge
      var badge=document.getElementById('admin-maint-badge');
      if(badge){
        badge.style.display=isOn?'inline-flex':'none';
        if(isOn&&bypassName) badge.textContent='🚧 MAINTENANCE ON | Bypass: '+bypassName;
        else badge.textContent='🚧 MAINTENANCE ON';
      }

      if(currentSession&&currentSession.role==='admin') return; // admin unaffected

      // Check bypass for current user using server-signed JWT
      var authRes=await _sb.auth.getSession();
      var sess=authRes.data&&authRes.data.session;
      var currentUid=sess&&sess.user?sess.user.id:null;
      var isBypassed=!!(bypassUid&&currentUid&&currentUid===bypassUid);

      var screenNow=app.getAttribute('data-screen');
      if(isOn&&!isBypassed&&screenNow!=='maintenance'){
        // Maintenance just enabled — pause video, show maintenance
        var vid=document.querySelector('video');
        if(vid&&!vid.paused){try{vid.pause();}catch(e){}}
        renderMaintenanceScreen(pollMsg);
      } else if(isOn&&isBypassed&&screenNow==='maintenance'){
        // Bypass student recovered from maintenance screen
        clearInterval(_maintPollInterval); _maintPollInterval=null;
        _bootStarted=false; app.removeAttribute('data-screen');
        bootApp({force:true});
      } else if(!isOn&&screenNow==='maintenance'){
        // Maintenance disabled — restore app
        clearInterval(_maintPollInterval); _maintPollInterval=null;
        _bootStarted=false; app.removeAttribute('data-screen');
        bootApp({force:true});
      }
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
      if(currentSession&&currentSession.role==='admin') return;
      Promise.all([
        _sb.from('course_config').select('data').eq('id','maintenance_mode').maybeSingle(),
        _sb.auth.getSession()
      ]).then(function(results){
        var mr=results[0]; var authRes=results[1];
        var cfg=(mr.data&&mr.data.data)||{};
        var isOn=!!cfg.enabled;
        var bypassUid=cfg.bypass_auth_user_id||null;
        var sess=authRes.data&&authRes.data.session;
        var currentUid=sess&&sess.user?sess.user.id:null;
        var isBypassed=!!(bypassUid&&currentUid&&currentUid===bypassUid);
        if(isOn&&!isBypassed){
          renderMaintenanceScreen(cfg.message||'');
          startMaintenancePolling();
        }
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

// Start boot
bootApp();
