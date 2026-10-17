/* login.js — extracted verbatim from the original single-file index.html.
   Source lines: 2224-2266, 2436-2471, 6568-6662
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
// ─── LOGIN ────────────────────────────────────────────────────────────────────
// ── LOGIN SHELL ───────────────────────────────────────────────────────────────
// Two-panel look shared with the Broken English work portal: illustrated slides on the
// left, the form on the right. Every student auth screen (Sign In, Forgot password,
// Create / Set new password, Password updated) renders its form into this shell, so
// they all look the same. Visual only — ids and handlers are unchanged.
var BL_SLIDES=[
  {h:'Master your<br>pronunciation.', s:'20 guided missions take you from the basics to clear, confident, natural English.'},
  {h:'Learn at<br>your own pace.', s:'Up to 4 new classes a day — continue on any device, right where you left off.'},
  {h:'Practise the words<br>that matter.', s:'The Pronunciation Workshop fixes the everyday words people mispronounce most.'}
];
var BL_ART=[
  // 1 · video lesson card + progress ring
  '<svg class="bl-slide-svg" data-slide="0" viewBox="0 0 220 160"><defs><linearGradient id="bl1a" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ff6b06"/><stop offset="100%" stop-color="#ff0552"/></linearGradient><linearGradient id="bl1b" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f9182f"/><stop offset="100%" stop-color="#7c3aed"/></linearGradient></defs>'
   +'<rect x="16" y="30" width="128" height="88" rx="10" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)"/><rect x="26" y="40" width="108" height="56" rx="6" fill="url(#bl1a)" opacity="0.2"/><circle cx="80" cy="68" r="14" fill="url(#bl1a)"/><path d="M76 61 L87 68 L76 75 Z" fill="#fff"/>'
   +'<rect x="26" y="104" width="108" height="4" rx="2" fill="rgba(255,255,255,0.12)"/><rect x="26" y="104" width="62" height="4" rx="2" fill="url(#bl1a)"/>'
   +'<circle cx="178" cy="60" r="26" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="8"/><circle cx="178" cy="60" r="26" fill="none" stroke="url(#bl1b)" stroke-width="8" stroke-dasharray="104 163" stroke-linecap="round" transform="rotate(-90 178 60)"/><text x="178" y="65" text-anchor="middle" font-size="13" font-weight="800" fill="#fff" font-family="Montserrat,sans-serif">64%</text>'
   +'<rect x="152" y="98" width="52" height="30" rx="8" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)"/><path d="M160 118 L170 110 L180 114 L196 104" fill="none" stroke="url(#bl1a)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  // 2 · mission list with ticks + calendar badge
  '<svg class="bl-slide-svg" data-slide="1" viewBox="0 0 220 160"><defs><linearGradient id="bl2a" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ff6b06"/><stop offset="100%" stop-color="#ff0552"/></linearGradient><linearGradient id="bl2b" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f9182f"/><stop offset="100%" stop-color="#7c3aed"/></linearGradient></defs>'
   +'<rect x="20" y="22" width="122" height="116" rx="10" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)"/>'
   +'<rect x="30" y="34" width="102" height="20" rx="6" fill="rgba(255,255,255,0.05)"/><circle cx="41" cy="44" r="5" fill="url(#bl2a)"/><path d="M38.5 44 L40.5 46 L44 42" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/><rect x="52" y="41" width="56" height="5" rx="2.5" fill="rgba(255,255,255,0.25)"/>'
   +'<rect x="30" y="60" width="102" height="20" rx="6" fill="rgba(255,255,255,0.05)"/><circle cx="41" cy="70" r="5" fill="url(#bl2a)"/><path d="M38.5 70 L40.5 72 L44 68" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/><rect x="52" y="67" width="46" height="5" rx="2.5" fill="rgba(255,255,255,0.25)"/>'
   +'<rect x="30" y="86" width="102" height="20" rx="6" fill="url(#bl2a)" opacity="0.2" stroke="rgba(255,6,82,0.45)"/><circle cx="41" cy="96" r="5" fill="#fff"/><path d="M39.5 93.5 L43.5 96 L39.5 98.5 Z" fill="#ff0552"/><rect x="52" y="93" width="60" height="5" rx="2.5" fill="rgba(255,255,255,0.45)"/>'
   +'<rect x="30" y="112" width="102" height="20" rx="6" fill="rgba(255,255,255,0.03)"/><rect x="36" y="118" width="10" height="8" rx="2" fill="none" stroke="rgba(255,255,255,0.3)"/><rect x="52" y="119" width="40" height="5" rx="2.5" fill="rgba(255,255,255,0.12)"/>'
   +'<rect x="152" y="40" width="54" height="56" rx="10" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)"/><rect x="152" y="40" width="54" height="16" rx="8" fill="url(#bl2b)" opacity="0.6"/><text x="179" y="85" text-anchor="middle" font-size="22" font-weight="800" fill="#fff" font-family="Montserrat,sans-serif">4</text><text x="179" y="112" text-anchor="middle" font-size="8" font-weight="700" fill="rgba(255,255,255,0.55)" font-family="Inter,sans-serif">PER DAY</text></svg>',
  // 3 · microphone + sound wave
  '<svg class="bl-slide-svg" data-slide="2" viewBox="0 0 220 160"><defs><linearGradient id="bl3a" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ff6b06"/><stop offset="100%" stop-color="#ff0552"/></linearGradient><linearGradient id="bl3b" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f9182f"/><stop offset="100%" stop-color="#7c3aed"/></linearGradient></defs>'
   +'<circle cx="62" cy="78" r="38" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)"/><rect x="52" y="52" width="20" height="36" rx="10" fill="url(#bl3a)"/><path d="M44 78 a18 18 0 0 0 36 0" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="3" stroke-linecap="round"/><line x1="62" y1="96" x2="62" y2="104" stroke="rgba(255,255,255,0.7)" stroke-width="3" stroke-linecap="round"/>'
   +'<rect x="113" y="70" width="6" height="16" rx="3" fill="url(#bl3b)"/><rect x="125" y="58" width="6" height="40" rx="3" fill="url(#bl3a)"/><rect x="137" y="66" width="6" height="24" rx="3" fill="url(#bl3b)"/><rect x="149" y="50" width="6" height="56" rx="3" fill="url(#bl3a)"/><rect x="161" y="62" width="6" height="32" rx="3" fill="url(#bl3b)"/><rect x="173" y="72" width="6" height="12" rx="3" fill="url(#bl3a)"/><rect x="185" y="66" width="6" height="24" rx="3" fill="url(#bl3b)"/>'
   +'<rect x="112" y="118" width="86" height="22" rx="11" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)"/><text x="155" y="133" text-anchor="middle" font-size="9" font-weight="700" fill="#fff" font-family="Inter,sans-serif">/ˌprəˌnʌn.siˈeɪ.ʃən/</text></svg>'
];
var _blSlideIdx=0, _blTimer=null;
function blShell(formHtml){
  _blSlideIdx=0;
  return '<div class="bl-page"><div class="bl-shell">'
    +'<section class="bl-form">'+formHtml+'</section>'
    +'<aside class="bl-visual" aria-hidden="true"><div class="bl-glow"></div><div class="bl-visual-in">'
      +'<div class="bl-art">'+BL_ART.map(function(a,i){return i===0?a.replace('class="bl-slide-svg"','class="bl-slide-svg active"'):a;}).join('')+'</div>'
      +'<h3 class="bl-head" id="bl-head">'+BL_SLIDES[0].h+'</h3><p class="bl-sub" id="bl-sub">'+BL_SLIDES[0].s+'</p>'
      +'<div class="bl-dots">'+BL_SLIDES.map(function(_,i){return '<button type="button" class="bl-dot'+(i===0?' active':'')+'" data-i="'+i+'" tabindex="-1" onclick="blGo('+i+',true)"></button>';}).join('')+'</div>'
    +'</div></aside></div></div>';
}
window.blGo=function(i,manual){
  if(!document.querySelector('.bl-art')){ clearInterval(_blTimer); _blTimer=null; return; }
  if(i===_blSlideIdx){ if(manual) blStart(); return; }
  _blSlideIdx=i;
  var h=document.getElementById('bl-head'), sb=document.getElementById('bl-sub');
  if(h&&sb){ h.classList.add('fade'); sb.classList.add('fade'); }
  setTimeout(function(){
    [].forEach.call(document.querySelectorAll('.bl-slide-svg'),function(el){ el.classList.toggle('active',+el.dataset.slide===i); });
    [].forEach.call(document.querySelectorAll('.bl-dot'),function(el){ el.classList.toggle('active',+el.dataset.i===i); });
    if(h&&sb){ h.innerHTML=BL_SLIDES[i].h; sb.textContent=BL_SLIDES[i].s; h.classList.remove('fade'); sb.classList.remove('fade'); }
  },180);
  if(manual) blStart();
};
function blStart(){
  clearInterval(_blTimer);
  if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  _blTimer=setInterval(function(){ blGo((_blSlideIdx+1)%BL_SLIDES.length); },6000);
}
var BL_EYE='<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
function blBrand(){ return '<div class="bl-logo"><img src="'+getLogoSrc()+'" alt="Broken English" onerror="this.style.display=\'none\'"/></div>'; }
function blMsg(type,text){ return '<div class="bl-msg '+type+'" role="'+(type==='error'?'alert':'status')+'">'+escapeHtml(text)+'</div>'; }

function renderLogin(){
  app.innerHTML=blShell(
    blBrand()
    +'<div class="bl-titles"><h1 class="bl-title">Sign In</h1><p class="bl-subtitle">Welcome back — continue your learning journey.</p></div>'
    +'<div id="maint-banner">'+(typeof maintBannerHtml==='function'?maintBannerHtml():'')+'</div>'
    +'<div id="login-err" class="auth-msg error bl-err" role="alert" style="display:none"></div>'
    +'<form id="login-form" novalidate onsubmit="event.preventDefault();doStudentLogin();">'
      +'<div class="bl-field"><label for="login-email" class="bl-label">Email or username</label>'
        +'<input id="login-email" class="bl-input" type="text" inputmode="email" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="you@email.com"/></div>'
      +'<div class="bl-field"><label for="login-pass" class="bl-label">Password</label>'
        +'<div class="bl-pass"><input id="login-pass" class="bl-input" type="password" autocomplete="current-password" placeholder="••••••••"/>'
        +'<button type="button" class="bl-eye" onclick="togglePw(\'login-pass\',this)" aria-label="Show password">'+BL_EYE+'</button></div>'
        +'<div class="bl-forgot"><button type="button" class="bl-link" onclick="showStudentForgotPassword()">Forgot password?</button></div></div>'
      +'<button id="login-btn-main" type="submit" class="bl-submit">Sign In</button>'
    +'</form>'
    +'<p class="bl-help">Having trouble? <a href="mailto:mediabrkn01@gmail.com">Contact support</a></p>'
  );
  blStart();
}

// ── FORGOT PASSWORD ───────────────────────────────────────────────────────────
// Now uses Supabase Auth resetPasswordForEmail(). Never emails the actual password.
window.showStudentForgotPassword=function(){
  var typed=(document.getElementById('login-email')||{}).value||'';
  var form=document.querySelector('.bl-form');
  var html=blBrand()
    +'<div class="bl-titles"><h1 class="bl-title">Reset Password</h1><p class="bl-subtitle">Enter your email and we\'ll send a secure reset link. It expires in 1 hour.</p></div>'
    +'<form id="fp-form" novalidate onsubmit="event.preventDefault();doStudentForgotLookup();">'
      +'<div class="bl-field"><label for="fp-input" class="bl-label">Email</label><input id="fp-input" class="bl-input" type="email" autocomplete="email" placeholder="you@email.com"/></div>'
      +'<div id="fp-result" aria-live="polite"></div>'
      +'<button id="fp-send-btn" type="submit" class="bl-submit">Send Reset Link</button>'
      +'<button type="button" class="bl-cancel" onclick="renderLogin()">Back to sign in</button>'
    +'</form>';
  if(form) form.innerHTML=html;
  else { app.innerHTML=blShell(html); blStart(); }
  var el=document.getElementById('fp-input'); if(el){ if(/@/.test(typed)) el.value=typed.trim(); setTimeout(function(){el.focus();},50); }
};
var _fpLastSent=0; // epoch ms of last reset email sent — cooldown guard
window.doStudentForgotLookup=async function(){
  var q=(document.getElementById('fp-input')?.value||'').trim().toLowerCase();
  var res=document.getElementById('fp-result');
  var btn=document.getElementById('fp-send-btn');
  if(!res)return;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(q)){ res.innerHTML=blMsg('error','Enter the email address you use to sign in.'); return; }

  // 60s cooldown — prevent rate-limit hammer and duplicate requests
  var now=Date.now();
  var cooldownMs=60000;
  if(now-_fpLastSent<cooldownMs){
    var remaining=Math.ceil((cooldownMs-(now-_fpLastSent))/1000);
    res.innerHTML=blMsg('warn','Please wait '+remaining+'s before requesting another reset email.');
    return;
  }

  if(btn){btn.disabled=true;btn.innerHTML='<span class="bl-spin"></span>Sending…';}

  try{
    if(typeof _sb==='undefined') throw new Error('not_ready');
    var {error}=await _sb.auth.resetPasswordForEmail(q,{
      redirectTo: 'https://academy.brokenenglish.in/?reset=1'
    });

    if(error){
      var isRateLimit=error.message&&(error.message.toLowerCase().includes('rate')||error.message.toLowerCase().includes('too many')||error.status===429);
      if(isRateLimit){
        res.innerHTML=blMsg('warn','Too many reset requests. Please wait a few minutes before trying again. Check your inbox — an email may already be on the way.');
      } else {
        // Non-rate-limit error — still show neutral message (prevent email enumeration)
        res.innerHTML=blMsg('ok','If an account exists for this email, a reset link has been sent.');
        console.warn('Reset email note:',error.message);
      }
      if(btn){btn.disabled=false;btn.textContent='Send Reset Link';}
    } else {
      _fpLastSent=Date.now(); // start cooldown only on success
      res.innerHTML=blMsg('ok','If an account exists for this email, a reset link has been sent. Check your inbox (and spam).');
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
    res.innerHTML=blMsg('error','Could not send the reset email. Check your connection and try again.');
    if(btn){btn.disabled=false;btn.textContent='Send Reset Link';}
  }
};

// ── FORCE PASSWORD RESET (migrated students) ──────────────────────────────────
window.showForcePasswordReset=function(email){
  var ov=document.createElement('div'); ov.id='fpr-overlay'; ov.className='bl-overlay';
  ov.innerHTML=blShell(blBrand()
    +'<div class="bl-titles"><h1 class="bl-title">Create a New Password</h1><p class="bl-subtitle">For your security, please create a new password for your account.</p></div>'
    +'<form novalidate onsubmit="event.preventDefault();doForcePasswordReset();">'
      +'<div class="bl-field"><label for="fpr-pass" class="bl-label">New password</label><div class="bl-pass"><input id="fpr-pass" class="bl-input" type="password" autocomplete="new-password" placeholder="At least 6 characters"/><button type="button" class="bl-eye" onclick="togglePw(\'fpr-pass\',this)" aria-label="Show password">'+BL_EYE+'</button></div></div>'
      +'<div class="bl-field"><label for="fpr-pass2" class="bl-label">Confirm password</label><input id="fpr-pass2" class="bl-input" type="password" autocomplete="new-password" placeholder="Type it again"/></div>'
      +'<div id="fpr-err" class="bl-msg error" role="alert" style="display:none"></div>'
      +'<button id="fpr-btn" type="submit" class="bl-submit">Set New Password</button>'
      +'<button type="button" class="bl-cancel" onclick="doForcePasswordReset(true)">Skip for now — you\'ll be asked again next time</button>'
    +'</form>');
  document.body.appendChild(ov); blStart();
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
  if(btn){btn.disabled=true;btn.innerHTML='<span class="bl-spin"></span>Saving…';}
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
  document.getElementById('email-reset-overlay')?.remove();
  var ov=document.createElement('div'); ov.id='email-reset-overlay'; ov.className='bl-overlay';
  ov.innerHTML=blShell(blBrand()
    +'<div class="bl-titles"><h1 class="bl-title">Set New Password</h1><p class="bl-subtitle">Choose a strong password for your account. You\'ll sign in with it next.</p></div>'
    +'<form novalidate onsubmit="event.preventDefault();doEmailResetPassword();">'
      +'<div class="bl-field"><label for="er-pass" class="bl-label">New password</label><div class="bl-pass"><input id="er-pass" class="bl-input" type="password" autocomplete="new-password" placeholder="At least 6 characters"/><button type="button" class="bl-eye" onclick="togglePw(\'er-pass\',this)" aria-label="Show password">'+BL_EYE+'</button></div></div>'
      +'<div class="bl-field"><label for="er-pass2" class="bl-label">Confirm password</label><input id="er-pass2" class="bl-input" type="password" autocomplete="new-password" placeholder="Type it again"/></div>'
      +'<div id="er-err" class="bl-msg error" role="alert" style="display:none"></div>'
      +'<button id="er-btn" type="submit" class="bl-submit">Set Password</button>'
    +'</form>');
  document.body.appendChild(ov); blStart();
  setTimeout(function(){var el=document.getElementById('er-pass');if(el)el.focus();},100);
};

window.doEmailResetPassword=async function(){
  var errEl=document.getElementById('er-err');
  var btn=document.getElementById('er-btn');
  var p1=(document.getElementById('er-pass')?.value||'');
  var p2=(document.getElementById('er-pass2')?.value||'');
  if(!p1||p1.length<6){errEl.textContent='Password must be at least 6 characters.';errEl.style.display='block';return;}
  if(p1!==p2){errEl.textContent='Passwords do not match.';errEl.style.display='block';return;}
  if(btn){btn.disabled=true;btn.innerHTML='<span class="bl-spin"></span>Saving…';}
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
    var successDiv=document.createElement('div'); successDiv.className='bl-overlay';
    successDiv.innerHTML=blShell(blBrand()
      +'<div class="bl-done"><span class="bl-done-ic"><svg width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg></span>'
      +'<h1 class="bl-title">Password Updated</h1><p class="bl-subtitle">Your new password is set. Sign in to continue.</p></div>'
      +'<button type="button" class="bl-submit" onclick="this.closest(\'.bl-overlay\').remove();navigate(\'login\')">Sign In</button>');
    document.body.appendChild(successDiv);
  }catch(e){
    errEl.textContent='Failed to set password: '+e.message;
    errEl.style.display='block';
    if(btn){btn.disabled=false;btn.textContent='Set New Password';}
  }
};
