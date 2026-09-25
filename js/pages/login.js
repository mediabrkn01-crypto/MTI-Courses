/* login.js — extracted verbatim from the original single-file index.html.
   Source lines: 2224-2266, 2436-2471, 6568-6662
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
// ─── LOGIN ────────────────────────────────────────────────────────────────────
function renderLogin(){
  app.innerHTML=`
  <div class="auth-wrap">
    <div class="orb o1"></div><div class="orb o2"></div><div class="orb o3"></div>
    <main class="auth-card center" data-glow-init="1">
      <div class="auth-logo"><img src="${getSymbolSrc()}" alt="Broken English" onerror="this.style.display='none'"/></div>
      <h1 class="auth-title">Sign In</h1>
      <p class="auth-sub">Enter your credentials to access your classes.</p>

      <div id="login-err" class="auth-msg error" role="alert" style="display:none"></div>

      <form id="login-form" novalidate onsubmit="event.preventDefault();doStudentLogin();">
        <div class="auth-field">
          <div class="auth-label-row"><label for="login-email" class="auth-label">Email or username</label></div>
          <input id="login-email" class="auth-input" type="text" inputmode="email" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="you@email.com"/>
        </div>
        <div class="auth-field">
          <div class="auth-label-row">
            <label for="login-pass" class="auth-label">Password</label>
            <button type="button" class="auth-link" onclick="showStudentForgotPassword()">Forgot password?</button>
          </div>
          <div class="auth-input-wrap">
            <input id="login-pass" class="auth-input has-eye" type="password" autocomplete="current-password" placeholder="••••••••"/>
            <button type="button" class="auth-eye" onclick="togglePw('login-pass',this)" aria-label="Show password"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg></button>
          </div>
        </div>
        <button id="login-btn-main" type="submit" class="auth-btn">Sign In</button>
      </form>

      <p class="auth-foot">Having trouble? Contact <a href="mailto:mediabrkn01@gmail.com">mediabrkn01@gmail.com</a></p>
    </main>
  </div>`;
}

// ── FORGOT PASSWORD ───────────────────────────────────────────────────────────
// Now uses Supabase Auth resetPasswordForEmail(). Never emails the actual password.
window.showStudentForgotPassword=function(){
  var html='<div id="fp-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px">'+
    '<div style="background:#1a1a2e;border:1px solid rgba(255,255,255,.15);border-radius:20px;padding:32px 28px;width:100%;max-width:380px;position:relative">'+
    '<button onclick="document.getElementById(\'fp-overlay\').remove()" style="position:absolute;top:14px;right:16px;background:none;border:none;color:rgba(255,255,255,.5);font-size:20px;cursor:pointer">✕</button>'+
    '<h3 style="font-family:Montserrat,sans-serif;font-weight:800;font-size:18px;color:#fff;margin-bottom:6px">Reset Password</h3>'+
    '<p style="font-size:12px;color:rgba(255,255,255,.5);margin-bottom:18px">Enter your email and we\'ll send a secure reset link. The link expires in 1 hour.</p>'+
    '<input id="fp-input" type="email" placeholder="Your email address" style="width:100%;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);border-radius:10px;color:#fff;font-size:14px;padding:12px 14px;outline:none;box-sizing:border-box;margin-bottom:12px"/>'+
    '<button id="fp-send-btn" onclick="doStudentForgotLookup()" style="width:100%;background:var(--grad);border:none;border-radius:10px;color:#fff;font-size:14px;font-weight:700;padding:12px;cursor:pointer;font-family:Montserrat,sans-serif">Send Reset Link</button>'+
    '<div id="fp-result" style="margin-top:14px;font-size:13px;text-align:center"></div>'+
    '</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
  setTimeout(function(){var el=document.getElementById('fp-input');if(el)el.focus();},100);
};
var _fpLastSent=0; // epoch ms of last reset email sent — cooldown guard
window.doStudentForgotLookup=async function(){
  var q=(document.getElementById('fp-input')?.value||'').trim().toLowerCase();
  var res=document.getElementById('fp-result');
  var btn=document.getElementById('fp-send-btn');
  if(!q||!res)return;

  // 60s cooldown — prevent rate-limit hammer and duplicate requests
  var now=Date.now();
  var cooldownMs=60000;
  if(now-_fpLastSent<cooldownMs){
    var remaining=Math.ceil((cooldownMs-(now-_fpLastSent))/1000);
    res.innerHTML='<div style="background:rgba(255,165,0,.1);border:1px solid rgba(255,165,0,.3);border-radius:10px;padding:12px;color:#facc15;font-weight:600">Please wait '+remaining+'s before requesting another reset email.</div>';
    return;
  }

  if(btn){btn.disabled=true;btn.textContent='Sending...';}

  try{
    if(typeof _sb==='undefined') throw new Error('not_ready');
    var {error}=await _sb.auth.resetPasswordForEmail(q,{
      redirectTo: 'https://academy.brokenenglish.in/?reset=1'
    });

    if(error){
      var isRateLimit=error.message&&(error.message.toLowerCase().includes('rate')||error.message.toLowerCase().includes('too many')||error.status===429);
      if(isRateLimit){
        res.innerHTML='<div style="background:rgba(255,165,0,.1);border:1px solid rgba(255,165,0,.3);border-radius:10px;padding:12px;color:#facc15;font-weight:600">Too many reset requests. Please wait a few minutes before trying again. Check your inbox — an email may already be on the way.</div>';
      } else {
        // Non-rate-limit error — still show neutral message (prevent email enumeration)
        res.innerHTML='<div style="background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.3);border-radius:10px;padding:12px;color:#4ade80;font-weight:700">If an account exists for this email, a reset link has been sent.</div>';
        console.warn('Reset email note:',error.message);
      }
    } else {
      _fpLastSent=Date.now(); // start cooldown only on success
      res.innerHTML='<div style="background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.3);border-radius:10px;padding:12px;color:#4ade80;font-weight:700">If an account exists for this email, a reset link has been sent. Check your inbox (and spam).</div>';
      // Disable button with countdown
      var countdown=60;
      if(btn){btn.textContent='Resend ('+countdown+'s)';}
      var _fpTimer=setInterval(function(){
        countdown--;
        if(countdown<=0){clearInterval(_fpTimer);if(btn){btn.disabled=false;btn.textContent='Send Reset Link';}}
        else{if(btn) btn.textContent='Resend ('+countdown+'s)';}
      },1000);
    }
  }catch(e){
    res.innerHTML='<div style="color:rgba(255,45,120,.8)">Could not send reset email. Check your connection and try again.</div>';
    if(btn){btn.disabled=false;btn.textContent='Send Reset Link';}
  }
};

// ── FORCE PASSWORD RESET (migrated students) ──────────────────────────────────
window.showForcePasswordReset=function(email){
  var html='<div id="fpr-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px">'+
    '<div style="background:#1a1a2e;border:1px solid rgba(255,113,0,.4);border-radius:20px;padding:32px 28px;width:100%;max-width:420px">'+
    '<h3 style="font-family:Montserrat,sans-serif;font-weight:800;font-size:18px;color:#fff;margin-bottom:8px">Create a New Password</h3>'+
    '<p style="font-size:13px;color:rgba(255,255,255,.6);margin-bottom:20px;line-height:1.6">For your security, please create a new password. Your previous password was stored insecurely.</p>'+
    '<input id="fpr-pass" type="password" autocomplete="new-password" placeholder="New password (min 6 characters)" style="width:100%;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);border-radius:10px;color:#fff;font-size:14px;padding:12px 14px;outline:none;box-sizing:border-box;margin-bottom:10px"/>'+
    '<input id="fpr-pass2" type="password" autocomplete="new-password" placeholder="Confirm new password" style="width:100%;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);border-radius:10px;color:#fff;font-size:14px;padding:12px 14px;outline:none;box-sizing:border-box;margin-bottom:14px"/>'+
    '<button id="fpr-btn" onclick="doForcePasswordReset()" style="width:100%;background:var(--grad);border:none;border-radius:10px;color:#fff;font-size:14px;font-weight:700;padding:12px;cursor:pointer;font-family:Montserrat,sans-serif">Set New Password</button>'+
    '<div id="fpr-err" style="display:none;margin-top:12px;font-size:13px;color:#f87171;text-align:center"></div>'+
    '<button onclick="doForcePasswordReset(true)" style="display:block;width:100%;margin-top:12px;background:none;border:none;color:rgba(255,255,255,.35);font-size:12px;cursor:pointer;text-align:center">Skip for now (you will be asked again next login)</button>'+
    '</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
  setTimeout(function(){var el=document.getElementById('fpr-pass');if(el)el.focus();},100);
};
window.doForcePasswordReset=async function(skip){
  var errEl=document.getElementById('fpr-err');
  var btn=document.getElementById('fpr-btn');

  if(skip){
    // Student chose to skip — complete login without changing password.
    // They will be prompted again on next login.
    document.getElementById('fpr-overlay')?.remove();
    if(window._pendingStudentId){
      currentSession={role:"student",studentId:window._pendingStudentId};
      delete window._pendingStudentId;
      saveSession(currentSession);
      navigate("dashboard");
    }
    return;
  }

  var p1=(document.getElementById('fpr-pass')?.value||'');
  var p2=(document.getElementById('fpr-pass2')?.value||'');
  if(!p1||p1.length<6){errEl.textContent='Password must be at least 6 characters.';errEl.style.display='block';return;}
  if(p1!==p2){errEl.textContent='Passwords do not match.';errEl.style.display='block';return;}
  if(btn){btn.disabled=true;btn.textContent='Saving...';}
  try{
    if(typeof _sb==='undefined')throw new Error('not_ready');
    var {error}=await _sb.auth.updateUser({password:p1});
    if(error)throw error;
    // Clear reset flag in students table
    if(window._pendingStudentId){
      try{await _sb.from('students').update({password_reset_required:false}).eq('id',window._pendingStudentId);}catch(e){}
    }
    document.getElementById('fpr-overlay')?.remove();
    // Now complete login
    if(window._pendingStudentId){
      currentSession={role:"student",studentId:window._pendingStudentId};
      delete window._pendingStudentId;
      saveSession(currentSession);
      navigate("dashboard");
    }
  }catch(e){
    errEl.textContent='Failed to set password: '+e.message+'. Try logging in again.';
    errEl.style.display='block';
    if(btn){btn.disabled=false;btn.textContent='Set New Password';}
  }
};
// ── PASSWORD RESET FROM EMAIL LINK ────────────────────────────────────────────
// Called by onAuthStateChange when event === 'PASSWORD_RECOVERY'.
// Student clicked the email link, Supabase established a recovery session.
// Show a form to set a new password (replaces whatever screen is showing).
window.showPasswordResetFromEmail=function(){
  // Remove any existing overlay
  document.getElementById('email-reset-overlay')?.remove();
  var html='<div id="email-reset-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px">'+
    '<div style="background:#1a1a2e;border:1px solid rgba(255,113,0,.4);border-radius:20px;padding:32px 28px;width:100%;max-width:420px">'+
    '<h3 style="font-family:Montserrat,sans-serif;font-weight:800;font-size:20px;color:#fff;margin-bottom:8px">Set New Password</h3>'+
    '<p style="font-size:13px;color:rgba(255,255,255,.6);margin-bottom:20px;line-height:1.6">Choose a strong password to secure your account. You\'ll be signed in automatically after.</p>'+
    '<input id="er-pass" type="password" autocomplete="new-password" placeholder="New password (min 6 characters)" style="width:100%;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);border-radius:10px;color:#fff;font-size:14px;padding:12px 14px;outline:none;box-sizing:border-box;margin-bottom:10px"/>'+
    '<input id="er-pass2" type="password" autocomplete="new-password" placeholder="Confirm new password" style="width:100%;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);border-radius:10px;color:#fff;font-size:14px;padding:12px 14px;outline:none;box-sizing:border-box;margin-bottom:14px"/>'+
    '<button id="er-btn" onclick="doEmailResetPassword()" style="width:100%;background:var(--grad);border:none;border-radius:10px;color:#fff;font-size:14px;font-weight:700;padding:12px;cursor:pointer;font-family:Montserrat,sans-serif">Set Password & Sign In</button>'+
    '<div id="er-err" style="display:none;margin-top:12px;font-size:13px;color:#f87171;text-align:center"></div>'+
    '</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
  setTimeout(function(){var el=document.getElementById('er-pass');if(el)el.focus();},100);
};

window.doEmailResetPassword=async function(){
  var errEl=document.getElementById('er-err');
  var btn=document.getElementById('er-btn');
  var p1=(document.getElementById('er-pass')?.value||'');
  var p2=(document.getElementById('er-pass2')?.value||'');
  if(!p1||p1.length<6){errEl.textContent='Password must be at least 6 characters.';errEl.style.display='block';return;}
  if(p1!==p2){errEl.textContent='Passwords do not match.';errEl.style.display='block';return;}
  if(btn){btn.disabled=true;btn.textContent='Saving...';}
  try{
    if(typeof _sb==='undefined') throw new Error('not_ready');
    var {error}=await _sb.auth.updateUser({password:p1});
    if(error) throw error;
    // Clear password_reset_required for this Auth user
    var authRes=await _sb.auth.getSession();
    var authUid=authRes.data&&authRes.data.session&&authRes.data.session.user?authRes.data.session.user.id:null;
    if(authUid){
      try{await _sb.from('students').update({password_reset_required:false}).eq('auth_user_id',authUid);}catch(e){}
    }
    // Sign out so student verifies new password on login (preferred UX per requirement)
    await _sb.auth.signOut().catch(function(){});
    clearSession();
    // Show success then redirect to login
    document.getElementById('email-reset-overlay')?.remove();
    var successDiv=document.createElement('div');
    successDiv.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px';
    successDiv.innerHTML='<div style="background:#1a1a2e;border:1px solid rgba(34,197,94,.4);border-radius:20px;padding:32px 28px;width:100%;max-width:380px;text-align:center">'
      +'<div style="font-size:40px;margin-bottom:16px">✓</div>'
      +'<h3 style="font-family:Montserrat,sans-serif;font-weight:800;font-size:18px;color:#4ade80;margin-bottom:10px">Password Updated</h3>'
      +'<p style="font-size:13px;color:rgba(255,255,255,.6);margin-bottom:20px;line-height:1.6">Your new password is set. Sign in below to continue.</p>'
      +'<button onclick="this.closest(\'div\').parentElement.remove();navigate(\'login\')" style="width:100%;background:var(--grad);border:none;border-radius:10px;color:#fff;font-size:14px;font-weight:700;padding:12px;cursor:pointer;font-family:Montserrat,sans-serif">Sign In</button>'
      +'</div>';
    document.body.appendChild(successDiv);
  }catch(e){
    errEl.textContent='Failed to set password: '+e.message;
    errEl.style.display='block';
    if(btn){btn.disabled=false;btn.textContent='Set New Password';}
  }
};
