/* admin-app.js — ADMIN application shell (admin.html only).
   Owns: admin session, admin login / forgot password / reset, admin router, admin boot, logout.
   The student app (index.html) has none of this; it only links here.

   AUTH MODEL
   - Identity: Supabase Auth (email + password) via the admin-only client in admin-supabase.js,
     stored under its own key, so it can never be confused with a student session.
   - Authority: the server. Every boot and every login calls the is_admin() SECURITY DEFINER
     RPC, which checks admin_users for the JWT's user id. A student account fails this check.
   - brokeneng_admin_session is only a marker for UX (remembering who was signed in). It is
     NEVER trusted on its own — no valid admin JWT + is_admin() === true means no admin panel.
   - Privileged operations (set student password, demo links) go to Edge Functions that
     re-verify the JWT against admin_users server-side. No secrets in the browser. */

// ── ADMIN SESSION MARKER ─────────────────────────────────────────────────────
var ADMIN_SESSION_KEY='brokeneng_admin_session';
function _saveAdminMarker(user){
  try{localStorage.setItem(ADMIN_SESSION_KEY,JSON.stringify({role:'admin',authUserId:user.id,email:user.email||'',verifiedAt:new Date().toISOString()}));}catch(e){}
}
function _loadAdminMarker(){
  try{var m=JSON.parse(localStorage.getItem(ADMIN_SESSION_KEY)||'null');return m&&m.role==='admin'?m:null;}catch(e){return null;}
}
function _clearAdminMarker(){try{localStorage.removeItem(ADMIN_SESSION_KEY);}catch(e){}}

// Server-side admin check. Returns 'admin' | 'not_admin' | 'error'.
async function _verifyAdminJwt(){
  try{
    var r=await _sb.rpc('is_admin');
    if(r.error) return 'error';
    return r.data===true?'admin':'not_admin';
  }catch(e){return 'error';}
}

function _enterAdmin(user){
  currentSession={role:'admin',authUserId:user.id,email:user.email||''};
  _saveAdminMarker(user);
  startAdminMaintenanceBadge();
}

// ── ROUTER ───────────────────────────────────────────────────────────────────
// Screens: admin-login | admin (tabs) | admin-student | admin-progress-student
var _admFromPop=false;
function _isAdminAuthed(){return !!(currentSession&&currentSession.role==='admin');}
function navigate(screen,params){
  params=params||{};
  if(screen==='login') screen='admin-login';
  if(screen!=='admin-login'&&!_isAdminAuthed()){screen='admin-login';params={};}
  if(!_admFromPop){
    try{history.pushState({screen:screen,params:params},'','#'+screen);}catch(e){}
  }
  render(screen,params);
  window.scrollTo(0,0);
}
function render(screen,params){
  if(screen==='admin-login'){renderAdminLogin();return;}
  if(screen==='admin-student'){renderAdminStudent(params.id);return;}
  if(screen==='admin-progress-student'){renderAdminProgressStudent(params.id);return;}
  renderAdmin(params.tab||'students');
}
window.addEventListener('popstate',function(e){
  var st=e.state||{};
  var target=st.screen||'admin';
  if(target==='admin-login'&&_isAdminAuthed()){
    try{history.replaceState({screen:'admin',params:{tab:'students'}},'','#admin');}catch(er){}
    target='admin';st.params={tab:'students'};
  }
  _admFromPop=true;
  navigate(target,st.params||{});
  _admFromPop=false;
});

// ── ADMIN LOGIN ──────────────────────────────────────────────────────────────
var _eyeOffSvg='<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
// notice: optional one-off message from an action that just happened (logout, reset, session end).
// It lives only in this render — a normal visit or a reload never shows it.
var _AUTH_ICONS={
  info:'<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  success:'<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>',
  error:'<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>'
};
function _authMsg(el,text,type){
  if(!el) return;
  if(!text){el.style.display='none';el.innerHTML='';return;}
  el.className='auth-msg '+(type||'info');
  el.innerHTML=(_AUTH_ICONS[type]||_AUTH_ICONS.info)+'<span>'+escapeHtml(text)+'</span>';
  el.style.display='flex';
}
function renderAdminLogin(notice,type){
  if(window._demoAdminTick){clearInterval(window._demoAdminTick);window._demoAdminTick=null;}
  var marker=_loadAdminMarker();
  app.innerHTML=`
  <div class="auth-wrap">
    <div class="orb o1"></div><div class="orb o2"></div>
    <main class="auth-card">
      <div class="auth-brand">
        <div class="auth-brand-mark"><img src="${getSymbolSrc()}" alt="" onerror="this.style.display='none'"/></div>
        <div>
          <div class="auth-brand-name">${SITE_NAME}</div>
          <span class="auth-pill">Admin Access</span>
        </div>
      </div>
      <h1 class="auth-title">Admin Panel</h1>
      <p class="auth-sub">Sign in to manage students and courses.</p>

      <div id="adm-notice" role="status" style="display:none"></div>
      <div id="adm-err" class="auth-msg error" role="alert" style="display:none"></div>

      <form id="adm-form" onsubmit="event.preventDefault();doAdminLogin();" novalidate>
        <div class="auth-field">
          <div class="auth-label-row"><label for="adm-email" class="auth-label">Admin email</label></div>
          <input id="adm-email" class="auth-input" type="email" inputmode="email" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="admin@brokenenglish.in" value="${marker?escapeAttr(marker.email||''):''}"/>
        </div>
        <div class="auth-field">
          <div class="auth-label-row">
            <label for="adm-pass" class="auth-label">Password</label>
            <button type="button" class="auth-link" onclick="showAdminForgotPassword()">Forgot password?</button>
          </div>
          <div class="auth-input-wrap">
            <input id="adm-pass" class="auth-input has-eye" type="password" autocomplete="current-password" placeholder="••••••••"/>
            <button type="button" class="auth-eye" aria-label="Show password" onclick="togglePw('adm-pass',this)">${_eyeOffSvg}</button>
          </div>
        </div>
        <button id="adm-login-btn" type="submit" class="auth-btn">Sign In as Admin</button>
      </form>
    </main>
  </div>`;
  _authMsg(document.getElementById('adm-notice'),notice,type||'info');
  // One-off notices disappear as soon as the admin starts signing in again.
  var form=document.getElementById('adm-form');
  if(form) form.addEventListener('input',function(){_authMsg(document.getElementById('adm-notice'),'');},{once:true});
  var el=document.getElementById(marker&&marker.email?'adm-pass':'adm-email');
  if(el&&window.matchMedia('(hover:hover)').matches) setTimeout(function(){el.focus();},50);
}

window.doAdminLogin=async function(){
  var email=(document.getElementById('adm-email')?.value||'').trim().toLowerCase();
  var pass=document.getElementById('adm-pass')?.value||'';
  var btn=document.getElementById('adm-login-btn');
  var er=document.getElementById('adm-err');
  var note=document.getElementById('adm-notice');
  function busy(on){ if(!btn)return; btn.disabled=on; btn.innerHTML=on?'<span class="auth-spin"></span>Signing in…':'Sign In as Admin'; }
  function fail(msg){ _authMsg(er,msg,'error'); busy(false); }
  _authMsg(note,'');
  _authMsg(er,'');
  if(!email||!pass){fail('Enter your admin email and password.');return;}
  busy(true);
  try{
    var res=await _sb.auth.signInWithPassword({email:email,password:pass});
    if(res.error||!res.data||!res.data.user){
      var m=(res.error&&res.error.message)||'';
      if(/fetch|network/i.test(m)) fail('Could not reach the server. Check your connection and try again.');
      else fail('Invalid admin credentials.');
      return;
    }
    var check=await _verifyAdminJwt();
    if(check!=='admin'){
      // Valid Supabase account, but not in admin_users (e.g. a student). Never keep this session.
      await _sb.auth.signOut().catch(function(){});
      _clearAdminMarker();
      fail(check==='error'?'Could not verify admin access. Please try again.':'This account does not have admin access.');
      return;
    }
    _enterAdmin(res.data.user);
    try{history.replaceState({screen:'admin',params:{tab:'students'}},'','#admin');}catch(e){}
    _admFromPop=true; navigate('admin',{tab:'students'}); _admFromPop=false;
  }catch(e){
    console.warn('Admin login error:',e);
    fail('Could not reach the server. Check your connection and try again.');
  }
};

// ── ADMIN LOGOUT ─────────────────────────────────────────────────────────────
window.adminLogout=async function(){
  currentSession=null;
  _clearAdminMarker();
  if(window._demoAdminTick){clearInterval(window._demoAdminTick);window._demoAdminTick=null;}
  stopAdminMaintenanceBadge();
  try{await _sb.auth.signOut();}catch(e){}
  try{history.replaceState({screen:'admin-login',params:{}},'','#admin-login');}catch(e){}
  renderAdminLogin('You have been signed out.','success');
};

// ── ADMIN FORGOT PASSWORD (separate from the student flow) ───────────────────
// Reset link returns to admin.html, where this app's own client handles the recovery session.
var _admFpLastSent=0;
window.showAdminForgotPassword=function(){
  document.getElementById('adm-fp-overlay')?.remove();
  var pre=(document.getElementById('adm-email')?.value||'').trim();
  var html='<div id="adm-fp-overlay" class="qe-overlay" role="dialog" aria-modal="true" aria-label="Reset admin password">'
    +'<div class="adm-card adm-card-pad" style="width:100%;max-width:400px;background:#11111e;position:relative">'
    +'<button type="button" onclick="document.getElementById(\'adm-fp-overlay\').remove()" aria-label="Close" class="adm-btn adm-icon-btn" style="position:absolute;top:14px;right:14px">✕</button>'
    +'<h2 class="adm-card-title" style="font-size:17px;margin-bottom:6px">Reset admin password</h2>'
    +'<p class="adm-hint" style="margin:0 0 16px">We\'ll email a secure reset link. It opens the admin portal and expires in 1 hour.</p>'
    +'<label for="adm-fp-email" class="adm-label">Admin email</label>'
    +'<input id="adm-fp-email" type="email" class="adm-input" value="'+escapeAttr(pre)+'" placeholder="admin@example.com" style="margin-bottom:12px"/>'
    +'<button id="adm-fp-btn" type="button" class="adm-btn adm-btn-primary adm-btn-lg" style="width:100%" onclick="doAdminForgotPassword()">Send reset link</button>'
    +'<div id="adm-fp-result" style="margin-top:12px;font-size:13px"></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
  setTimeout(function(){document.getElementById('adm-fp-email')?.focus();},50);
};
window.doAdminForgotPassword=async function(){
  var email=(document.getElementById('adm-fp-email')?.value||'').trim().toLowerCase();
  var out=document.getElementById('adm-fp-result');
  var btn=document.getElementById('adm-fp-btn');
  if(!email){out.innerHTML='<span style="color:#fb7185">Enter your admin email.</span>';return;}
  var wait=60000-(Date.now()-_admFpLastSent);
  if(wait>0){out.innerHTML='<span style="color:#fbbf24">Please wait '+Math.ceil(wait/1000)+'s before requesting another email.</span>';return;}
  if(btn){btn.disabled=true;btn.textContent='Sending…';}
  try{
    var redirectTo=new URL('admin.html',location.href).href+'?reset=1';
    var r=await _sb.auth.resetPasswordForEmail(email,{redirectTo:redirectTo});
    if(r.error&&/rate|too many/i.test(r.error.message||'')){
      out.innerHTML='<span style="color:#fbbf24">Too many requests. Wait a few minutes, then try again.</span>';
    } else {
      _admFpLastSent=Date.now();
      // Neutral wording — never reveal whether the email is an admin account.
      out.innerHTML='<span style="color:#4ade80">If that email belongs to an admin account, a reset link has been sent.</span>';
    }
  }catch(e){
    out.innerHTML='<span style="color:#fb7185">Could not send the email. Check your connection and try again.</span>';
  }
  if(btn){btn.disabled=false;btn.textContent='Send reset link';}
};

// Recovery link → set a new admin password.
function showAdminSetNewPassword(){
  document.getElementById('adm-rp-overlay')?.remove();
  var html='<div id="adm-rp-overlay" class="qe-overlay" role="dialog" aria-modal="true" aria-label="Set new admin password">'
    +'<div class="adm-card adm-card-pad" style="width:100%;max-width:400px;background:#11111e">'
    +'<h2 class="adm-card-title" style="font-size:17px;margin-bottom:6px">Set a new admin password</h2>'
    +'<p class="adm-hint" style="margin:0 0 16px">Choose a strong password. You\'ll sign in again afterwards.</p>'
    +'<input id="adm-rp-1" type="password" autocomplete="new-password" class="adm-input" placeholder="New password (min 8 characters)" style="margin-bottom:8px"/>'
    +'<input id="adm-rp-2" type="password" autocomplete="new-password" class="adm-input" placeholder="Confirm new password" style="margin-bottom:12px"/>'
    +'<button id="adm-rp-btn" type="button" class="adm-btn adm-btn-primary adm-btn-lg" style="width:100%" onclick="doAdminSetNewPassword()">Save password</button>'
    +'<div id="adm-rp-err" style="display:none;margin-top:12px;font-size:13px;color:#fb7185"></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
  setTimeout(function(){document.getElementById('adm-rp-1')?.focus();},50);
}
window.doAdminSetNewPassword=async function(){
  var p1=document.getElementById('adm-rp-1')?.value||'';
  var p2=document.getElementById('adm-rp-2')?.value||'';
  var err=document.getElementById('adm-rp-err');
  var btn=document.getElementById('adm-rp-btn');
  function fail(m){err.textContent=m;err.style.display='block';if(btn){btn.disabled=false;btn.textContent='Save password';}}
  if(p1.length<8){fail('Password must be at least 8 characters.');return;}
  if(p1!==p2){fail('Passwords do not match.');return;}
  if(btn){btn.disabled=true;btn.textContent='Saving…';}
  try{
    var r=await _sb.auth.updateUser({password:p1});
    if(r.error){fail('Could not update password: '+r.error.message);return;}
    await _sb.auth.signOut().catch(function(){});
    currentSession=null;_clearAdminMarker();
    document.getElementById('adm-rp-overlay')?.remove();
    try{history.replaceState({screen:'admin-login',params:{}},'',location.pathname+'#admin-login');}catch(e){}
    renderAdminLogin('Password updated. Sign in with your new password.','success');
  }catch(e){fail('Could not update password. Check your connection and try again.');}
};

// ── MAINTENANCE BADGE (admin is never blocked by maintenance) ────────────────
var _admMaintTimer=null;
async function _pollAdminMaintenance(){
  try{
    var r=await _sb.from('course_config').select('data').eq('id','maintenance_mode').maybeSingle();
    var cfg=(r.data&&r.data.data)||{};
    _maintenanceActive=!!cfg.enabled;
    _maintBypassAuthUserId=cfg.bypass_auth_user_id||null;
    var badge=document.getElementById('admin-maint-badge');
    if(badge){
      badge.style.display=_maintenanceActive?'inline-flex':'none';
      badge.textContent=_maintenanceActive&&cfg.bypass_student_name?'🚧 MAINTENANCE ON | Bypass: '+cfg.bypass_student_name:'🚧 MAINTENANCE ON';
    }
  }catch(e){}
}
function startAdminMaintenanceBadge(){
  if(_admMaintTimer) return;
  _pollAdminMaintenance();
  _admMaintTimer=setInterval(_pollAdminMaintenance,15000);
}
function stopAdminMaintenanceBadge(){ if(_admMaintTimer){clearInterval(_admMaintTimer);_admMaintTimer=null;} }

// ── BOOT ─────────────────────────────────────────────────────────────────────
function _renderAdminStatus(title,msg,retry){
  app.innerHTML='<div style="min-height:100vh;background:var(--bg);display:flex;align-items:center;justify-content:center;padding:24px">'
    +'<div style="text-align:center;max-width:360px">'
    +'<div style="width:36px;height:36px;border:3px solid rgba(255,255,255,.12);border-top-color:var(--g1);border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 18px;'+(retry?'display:none':'')+'"></div>'
    +'<h2 style="font-family:Montserrat,sans-serif;font-size:18px;font-weight:800;color:#fff;margin:0 0 8px">'+title+'</h2>'
    +'<p style="font-size:13px;color:var(--muted2);line-height:1.6;margin:0 0 18px">'+msg+'</p>'
    +(retry?'<button class="adm-btn adm-btn-primary adm-btn-lg" onclick="bootAdmin()">Retry</button>':'')
    +'</div></div>';
}

function _isRecoveryUrl(){
  var q=new URLSearchParams(location.search);
  return q.get('type')==='recovery'||q.get('reset')==='1'||/type=recovery/.test(location.hash);
}

async function bootAdmin(){
  if(_isRecoveryUrl()){
    _renderAdminStatus('Preparing password reset…','Verifying your reset link.');
    // PASSWORD_RECOVERY (below) shows the form. If the link is invalid/expired, fall back to login.
    setTimeout(function(){
      if(!document.getElementById('adm-rp-overlay')){
        try{history.replaceState({screen:'admin-login',params:{}},'',location.pathname+'#admin-login');}catch(e){}
        renderAdminLogin('That reset link is invalid or has expired. Use "Forgot password?" to get a new one.','error');
      }
    },8000);
    return;
  }
  _renderAdminStatus('Opening admin panel…','Checking your admin session.');
  var sess=null;
  try{
    var r=await _sb.auth.getSession();
    sess=r.data&&r.data.session;
  }catch(e){
    _renderAdminStatus('Can\'t reach the server','Check your connection and try again.',true);
    return;
  }
  if(!sess){
    _clearAdminMarker();
    try{history.replaceState({screen:'admin-login',params:{}},'','#admin-login');}catch(e){}
    renderAdminLogin();
    return;
  }
  var check=await _verifyAdminJwt();
  if(check==='error'){
    // Never fall back to the local marker — admin access requires a server-verified check.
    _renderAdminStatus('Can\'t verify admin access','The server could not be reached. Check your connection and try again.',true);
    return;
  }
  if(check==='not_admin'){
    await _sb.auth.signOut().catch(function(){});
    _clearAdminMarker();
    try{history.replaceState({screen:'admin-login',params:{}},'','#admin-login');}catch(e){}
    renderAdminLogin('That account does not have admin access.','error');
    return;
  }
  _enterAdmin(sess.user);
  // Resume the screen from history (refresh keeps you on the same admin page), else Students.
  var st=history.state&&history.state.screen&&history.state.screen!=='admin-login'?history.state:{screen:'admin',params:{tab:'students'}};
  try{history.replaceState(st,'','#'+st.screen);}catch(e){}
  _admFromPop=true; navigate(st.screen,st.params||{}); _admFromPop=false;
}

_sb.auth.onAuthStateChange(function(event){
  if(event==='PASSWORD_RECOVERY'){ showAdminSetNewPassword(); return; }
  // Token expired / signed out in another admin tab → back to login, never to a student view.
  if(event==='SIGNED_OUT'&&_isAdminAuthed()){
    currentSession=null;_clearAdminMarker();stopAdminMaintenanceBadge();
    try{history.replaceState({screen:'admin-login',params:{}},'','#admin-login');}catch(e){}
    renderAdminLogin('Your admin session ended. Please sign in again.','info');
  }
});

bootAdmin();
