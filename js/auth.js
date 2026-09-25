/* auth.js — extracted verbatim from the original single-file index.html.
   Source lines: 1357-1358, 2267-2435, 2472-2508
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
function logout(){
  currentSession=null;clearSession();
  // End the Supabase Auth session too, otherwise boot would silently rebuild the
  // student session from the still-valid JWT on the next page load.
  if(typeof _sb!=='undefined'){ try{ _sb.auth.signOut().catch(function(){}); }catch(e){} }
  navigate('login');
}

window.doStudentLogin=async()=>{
  const email=document.getElementById("login-email").value.trim().toLowerCase();
  const pass=document.getElementById("login-pass").value;
  const errEl=document.getElementById("login-err");
  const btn=document.querySelector('#login-pass~button')||document.querySelector('button[onclick*="doStudentLogin"]');

  if(!email||!pass){
    errEl.textContent="Please enter your email and password.";
    errEl.style.display="block";
    return;
  }

  // Show loading state
  errEl.style.display="none";
  errEl.textContent="";
  const loginBtn=document.getElementById("login-btn-main");
  if(loginBtn){loginBtn.innerHTML='<span style="display:inline-flex;align-items:center;gap:8px"><span style="width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;display:inline-block"></span>Signing in...</span>';loginBtn.disabled=true;}

  // ── Auth path 1: Supabase Auth (JWT-based, server-verified) ──────────────────
  var byEmail=null;
  var usedSupabaseAuth=false;
  if(typeof _sb!=="undefined"){
    try{
      var authResult=await _sb.auth.signInWithPassword({email,password:pass});
      if(!authResult.error&&authResult.data&&authResult.data.user){
        usedSupabaseAuth=true;
        // Load student profile by auth_user_id (not by password)
        var profRes=await _sb.from('students')
          .select('id,name,email,valid_until,access_list,created_at,completed_at,password_reset_required')
          .eq('auth_user_id',authResult.data.user.id).limit(1);
        if(!profRes.error&&profRes.data&&profRes.data.length){
          var d=profRes.data[0];
          byEmail={id:d.id,name:d.name,email:d.email,
            validUntil:d.valid_until||null,accessList:d.access_list||[1],
            createdAt:d.created_at||new Date().toISOString(),
            completedAt:d.completed_at||null,
            passwordResetRequired:!!d.password_reset_required};
        } else if(!profRes.error&&usedSupabaseAuth){
          // Auth succeeded but no student profile found for this JWT — broken link
          if(loginBtn){loginBtn.textContent="Sign In";loginBtn.disabled=false;}
          // An admin account has no student profile. Point it to the admin app instead of
          // showing a link error. Nothing is granted here — the session is signed out either way.
          var _isAdm=false;
          try{var _ar=await _sb.rpc('is_admin');_isAdm=!_ar.error&&_ar.data===true;}catch(e){}
          try{await _sb.auth.signOut();}catch(e){}
          if(_isAdm){
            errEl.innerHTML='This is an admin account. Admins sign in at the <a href="admin.html" style="color:#fff;font-weight:700;text-decoration:underline">Admin portal</a>.';
          } else {
            errEl.textContent="We couldn't load your course account. Please contact your admin. (PROFILE_LINK_ERROR)";
          }
          errEl.style.display="block";
          return;
        }
      }
    }catch(e){console.warn("Supabase Auth login:",e);}
  }

  // ── Auth path 2: Legacy password (students not yet migrated) ─────────────────
  // Removed once all students are migrated via scripts/migrate-students.js
  var _legStudentHasAuthId=false; // student exists in DB but has auth_user_id set (needs Forgot Password)
  if(!byEmail&&!usedSupabaseAuth&&typeof _sb!=="undefined"){
    try{
      var legRes=await _sb.from("students")
        .select("id,name,email,password_hash,valid_until,access_list,created_at,completed_at,auth_user_id")
        .eq("email",email).limit(1);
      if(!legRes.error&&legRes.data&&legRes.data.length){
        var ld=legRes.data[0];
        // Track: student exists in DB with auth_user_id but signInWithPassword failed
        // (likely migration created Auth account with random password due to short legacy password)
        if(ld.auth_user_id) _legStudentHasAuthId=true;
        // Legacy path: only if not yet migrated + password matches
        if(!ld.auth_user_id&&ld.password_hash===pass){
          byEmail={id:ld.id,name:ld.name,email:ld.email,
            validUntil:ld.valid_until||null,accessList:ld.access_list||[1],
            createdAt:ld.created_at||new Date().toISOString(),
            completedAt:ld.completed_at||null};
        }
      }
    }catch(e){console.warn("Legacy auth:",e);}
  }

  // (The old "path 3" — matching a password cached in localStorage — was removed.
  //  Supabase Auth is the only source of truth for student passwords, so credentials
  //  behave the same on every device and browser.)

  if(!byEmail){
    if(loginBtn){loginBtn.textContent="Sign In";loginBtn.disabled=false;}
    if(_legStudentHasAuthId){
      // Student record exists and has auth_user_id but signInWithPassword failed.
      // Migration likely created Auth account with a random password (old password was < 6 chars).
      errEl.textContent="Your account was upgraded and requires a password reset. Click 'Forgot Password?' below to get a reset link by email.";
    } else {
      errEl.textContent="Incorrect email or password.";
    }
    errEl.style.display="block";
    return;
  }

  const{expired}=getValidity(byEmail);
  if(expired){
    if(loginBtn){loginBtn.textContent="Sign In";loginBtn.disabled=false;}
    errEl.textContent="Your course access has expired. Please contact your admin.";
    errEl.style.display="block";
    return;
  }

  errEl.style.display="none";

  // Success path — button disappears with splash, no need to re-enable
  // Note: password_reset_required flag no longer blocks login — Admin uses
  // "Set Password" in Manage Student to push new passwords via Supabase Auth.

  // Persist student profile to brokeneng_students so renderDashboard() can find it on any
  // device/platform — critical for first-time iOS logins where the cache is empty.
  // Write directly to avoid saveStudents() triggering sbSaveStudent() Supabase round-trip.
  try{var _sc=loadStudents();_sc[byEmail.id]=byEmail;localStorage.setItem("brokeneng_students",JSON.stringify(_sc));}catch(_e){}

  currentSession={role:"student",studentId:byEmail.id};
  saveSession(currentSession);
  // Show splash IMMEDIATELY so student sees progress — load data in background during animation
  showBootSplash(byEmail, function(){
    _videosBootLoaded=true;
    navigate("dashboard");
  });
  // Fire data sync in background (doesn't block splash/dashboard)
  waitForSb().then(function(ok){
    if(!ok) return;
    sbLoadProgress(byEmail.id).catch(function(){});
    sbLoadVideos().catch(function(){});
    // Note: EL settings no longer synced to localStorage — TTS is server-side
  }).catch(function(){});

};

function showBootSplash(student, cb){
  var steps=[
    {txt:'Initialising Voice OS...',       pct:0},
    {txt:'Loading accent engine...',        pct:25},
    {txt:'Calibrating phoneme matrix...',   pct:55},
    {txt:'Preparing your journey...',       pct:80},
    {txt:'Welcome, '+(student.name||'Student').split(' ')[0]+'.', pct:100}
  ];
  var logo=getLogoSrc();
  app.innerHTML=
    '<style>'
    +'@keyframes bf-in{from{opacity:0}to{opacity:1}}'
    +'@keyframes bf-out{from{opacity:1}to{opacity:0}}'
    +'@keyframes bf-fill{from{width:0%}to{width:var(--w)}}'
    +'#boot-splash{position:fixed;inset:0;background:var(--bg);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:99998;animation:bf-in .35s ease;gap:0}'
    +'#boot-splash .bs-logo{display:flex;align-items:center;justify-content:center;margin-bottom:28px}'
    +'#boot-splash .bs-logo img{max-height:72px;max-width:180px;object-fit:contain;mix-blend-mode:screen}'
    +'#boot-splash .bs-logo .bs-wordmark{font-family:Montserrat,sans-serif;font-weight:900;font-size:28px;letter-spacing:.02em;color:#fff;line-height:1}'
    +'#boot-splash .bs-wordmark span{color:var(--g1)}'
    +'#boot-splash .bs-status{font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.06em;color:var(--muted);text-align:center;min-height:16px;margin-bottom:10px;transition:opacity .2s}'
    +'#boot-splash .bs-track{width:260px;height:3px;background:rgba(255,255,255,.1);border-radius:2px;overflow:hidden;margin-bottom:8px}'
    +'#boot-splash .bs-fill{height:100%;background:var(--gradh);border-radius:2px;width:0%;transition:width .4s cubic-bezier(.4,0,.2,1)}'
    +'#boot-splash .bs-pct{font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--g1);text-align:center}'
    +'</style>'
    +'<div id="boot-splash">'
      +'<div class="bs-logo">'
        +(logo
          ?'<img src="'+logo+'" onerror="this.style.display=\'none\';document.querySelector(\'.bs-wordmark\').style.display=\'block\'">'
          :'')
        +'<div class="bs-wordmark" style="'+(logo?'display:none':'')+'"><span>BROK</span>EN<br>ENGLISH</div>'
      +'</div>'
      +'<div class="bs-status" id="bs-status">Loading...</div>'
      +'<div class="bs-track"><div class="bs-fill" id="bs-fill"></div></div>'
      +'<div class="bs-pct" id="bs-pct">0%</div>'
    +'</div>';

  // Replace login history entry with dashboard NOW, before the animation.
  // Any popstate fired during the ~2.5s splash (iOS swipe-back, Android back button)
  // will see {screen:'dashboard'} and navigate correctly instead of re-triggering login.
  try{ history.replaceState({screen:'dashboard',params:{}},'','#dashboard'); }catch(e){}

  var i=0;
  function step(){
    if(i>=steps.length){
      setTimeout(function(){
        var el=document.getElementById('boot-splash');
        if(el){ el.style.animation='bf-out .4s ease forwards'; setTimeout(cb,380); }
        else cb();
      },300);
      return;
    }
    var s=steps[i];
    var statusEl=document.getElementById('bs-status');
    if(!statusEl){ cb(); return; } // Splash DOM replaced by popstate — fire cb immediately
    statusEl.textContent=s.txt;
    document.getElementById('bs-fill').style.width=s.pct+'%';
    document.getElementById('bs-pct').textContent=s.pct+'%';
    i++;
    setTimeout(step, i===steps.length ? 500 : 480+Math.random()*200);
  }
  setTimeout(step, 300);
}
