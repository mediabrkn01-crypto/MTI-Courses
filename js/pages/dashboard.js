/* dashboard.js — extracted verbatim from the original single-file index.html.
   Source lines: 1223-1229, 1264-1322, 4505-4648, 4649-4901
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
function getStudentStats(studentId){
  const progress = loadProgress(studentId);
  const completed = progress.size;
  const quizzes = ALL_LESSONS.filter(l=>progress.has(l.id) && hasRealQuiz(l)).length;
  return {completed, quizzes};
}

function journeyStripHtml(studentId){
  const progress = loadProgress(studentId);
  const dots = ALL_LESSONS.map((l,i)=>{
    const done = progress.has(l.id);
    const unlocked = isUnlocked(l);
    const isCurrent = !done && unlocked;
    const cls = done?'done':isCurrent?'current':'locked';
    const isLast = i===ALL_LESSONS.length-1;
    return`<div class="jd-item" onclick="${unlocked?`selectLesson('${l.id}');navigate('dashboard')`:''}">
      <div class="jd-dot ${cls}">${done?'✓':l.order}</div>
      <div class="jd-num">D${l.order}</div>
    </div>${!isLast?`<div class="jd-line ${done?'done':''}"></div>`:''}`;
  }).join('');
  const completed = progress.size;
  const pct = Math.round(completed/ALL_LESSONS.length*100);
  return`<div class="journey-strip">
    <div class="journey-header">
      <span class="journey-title">Your Journey</span>
      <span style="font-size:11px;font-family:monospace;color:var(--brand-2)">${completed}/${ALL_LESSONS.length} · ${pct}%</span>
    </div>
    <div class="journey-dots">${dots}</div>
  </div>`;
}

function statsStripHtml(studentId){
  const progress = loadProgress(studentId);
  const completed = progress.size;
  const quizzes = ALL_LESSONS.filter(l=>progress.has(l.id)&&hasRealQuiz(l)).length;
  const total = ALL_LESSONS.length;
  const pct = Math.round(completed/total*100);
  const earnedBadges = BADGES.filter(b=>b.check({completed,quizzes})).length;
  return`<div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon">📚</div>
      <div class="stat-val">${completed}</div>
      <div class="stat-label">Classes Done</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">📝</div>
      <div class="stat-val">${quizzes}</div>
      <div class="stat-label">Quizzes Passed</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">📊</div>
      <div class="stat-val">${pct}%</div>
      <div class="stat-label">Progress</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">🏅</div>
      <div class="stat-val">${earnedBadges}</div>
      <div class="stat-label">Badges</div>
    </div>
  </div>`;
}





// ─── PROFILE ─────────────────────────────────────────────────────────────────
function renderProfile(){
  if(!_viewGuardOk()){navigate("login");return;}
  const student=loadStudents()[currentSession.studentId];
  if(!student){logout();return;}

  const completedCount=ALL_LESSONS.filter(l=>isCompleted(l.id)).length;
  const quizCount=ALL_LESSONS.filter(l=>hasRealQuiz(l)&&isUnlocked(l)&&isCompleted(l.id)).length;
  const pct=Math.round((completedCount/ALL_LESSONS.length)*100);

  app.innerHTML=sidebarHtml("profile")+`
  <div id="main-content">
    ${topBarHtml(student)}
    ${mobileNavHtml("profile")}
    <div style="padding:20px 16px 60px;max-width:720px;width:100%">
      <h1 style="font-family:'Montserrat',sans-serif;font-weight:800;font-size:22px;color:#fff;margin-bottom:4px">Profile</h1>
      <p style="font-size:13px;color:var(--muted);margin-bottom:20px">Your account details and learning progress.</p>

      <div class="lg" style="padding:20px;margin-bottom:16px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <div class="avatar-upload" style="flex-shrink:0" onclick="document.getElementById('photo-input').click()" title="Tap to change photo">
          <div id="profile-avatar">${avatarHtml(student,64,24)}</div>
          <div class="avatar-overlay rounded-2xl">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <input id="photo-input" type="file" accept="image/*" style="display:none" onchange="handlePhotoUpload(event,'${student.id}')"/>
        </div>
        <div style="flex:1;min-width:0">
          <p style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:17px;color:#fff">${student.name}</p>
          <p style="font-size:13px;color:var(--muted);margin-top:3px">${student.email}</p>
          <span style="display:inline-block;margin-top:8px;border-radius:99px;background:rgba(232,52,26,0.15);border:1px solid rgba(232,52,26,0.28);padding:2px 10px;font-size:11px;font-weight:700;color:var(--brand-2)">Student</span>
          <p style="font-size:10px;color:rgba(255,255,255,0.3);margin-top:6px">Tap photo to change</p>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">
        ${[
          {label:"Lessons Done",value:completedCount,color:"#4ade80"},
          {label:"Quizzes Ready",value:quizCount,color:"var(--g3)"},
          {label:"Progress",value:pct+"%",color:"#60a5fa"},
        ].map(s=>`<div class="stat-card">
          <div style="font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:700;color:${s.color};line-height:1;margin-bottom:4px">${s.value}</div>
          <div class="stat-label">${s.label}</div>
        </div>`).join("")}
      </div>

      <div class="lg" style="padding:20px;margin-bottom:16px">
        <p style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:13px;color:#fff;margin-bottom:16px">Account Details</p>
        <div style="display:flex;flex-direction:column;gap:14px">
          ${[
            ["Full Name",student.name],
            ["Email Address",student.email],
            ["Member Since",new Date(student.createdAt).toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'})],
          ].map(([lbl,val])=>`<div>
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:6px">${lbl}</label>
            <div style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.14);border-radius:12px;padding:12px 16px;font-size:14px;color:rgba(255,255,255,0.85);box-shadow:inset 0 1.5px 0 rgba(255,255,255,0.1)">${val}</div>
          </div>`).join("")}
          <div>
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:6px">Course Access Validity</label>
            ${(()=>{
              const{validUntil,expired}=getValidity(student);
              if(student.completedAt) return`<div style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.25);border-radius:12px;padding:12px 16px;display:flex;align-items:center;gap:10px">
                <svg style="width:16px;height:16px;color:#4ade80;flex-shrink:0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <div><p style="font-size:13px;font-weight:600;color:#4ade80">Course Complete 🎉 — Lifetime Access</p>
                <p style="font-size:11px;color:rgba(74,222,128,0.7);margin-top:2px">Finished ${new Date(student.completedAt).toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'})}</p></div>
              </div>`;
              if(!validUntil) return`<div style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.14);border-radius:12px;padding:12px 16px;font-size:14px;color:rgba(255,255,255,0.6)">Active access — complete all lessons to unlock everything.</div>`;
              const days=Math.ceil((validUntil-today)/86400000);
              const col=expired?'rgba(239,68,68,0.12)':days<=7?'rgba(239,68,68,0.1)':days<=30?'rgba(234,179,8,0.1)':'rgba(34,197,94,0.1)';
              const bcol=expired?'rgba(239,68,68,0.28)':days<=7?'rgba(239,68,68,0.22)':days<=30?'rgba(234,179,8,0.22)':'rgba(34,197,94,0.22)';
              const tcol=expired?'#fca5a5':days<=7?'#fca5a5':days<=30?'#facc15':'#4ade80';
              const msg=expired?`Access expired on ${validUntil.toLocaleDateString()}`:days<=7?`⚠ Expiring in ${days} days — ${validUntil.toLocaleDateString()}`:days<=30?`⏳ ${days} days remaining — valid until ${validUntil.toLocaleDateString()}`:`✓ Active — valid until ${validUntil.toLocaleDateString()}`;
              const sub=expired?'Contact your admin to renew.':'Once you complete the course, all lessons will be unlocked and you can revisit anytime.';
              return`<div style="background:${col};border:1px solid ${bcol};border-radius:12px;padding:12px 16px">
                <p style="font-size:13px;font-weight:600;color:${tcol}">${msg}</p>
                <p style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:3px">${sub}</p>
              </div>`;
            })()}
          </div>
        </div>
        <p style="font-size:11px;color:rgba(255,255,255,0.3);margin-top:14px">To update your name or email, contact your course admin.</p>
      </div>

      <div class="lg" style="padding:20px;margin-bottom:16px" id="pass-card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <p style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:13px;color:#fff">Change Password</p>
          <button onclick="togglePassForm()" id="pass-toggle-btn" style="font-size:12px;color:var(--g3);background:none;border:none;cursor:pointer;font-weight:600;font-family:'JetBrains Mono',monospace">Change</button>
        </div>
        <div id="pass-form" style="display:none;flex-direction:column;gap:12px">
          <div>
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:6px">New Password</label>
            <div style="position:relative"><input id="new-pass" type="password" autocomplete="new-password" placeholder="Enter new password" class="glass-input" style="padding-right:40px"/><button type="button" onclick="togglePw('new-pass',this)" tabindex="-1" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:15px;color:rgba(255,255,255,.55);padding:0;line-height:1"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg></button></div>
          </div>
          <div>
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:6px">Confirm Password</label>
            <div style="position:relative"><input id="confirm-pass" type="password" autocomplete="new-password" placeholder="Confirm new password" class="glass-input" style="padding-right:40px"/><button type="button" onclick="togglePw('confirm-pass',this)" tabindex="-1" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:15px;color:rgba(255,255,255,.55);padding:0;line-height:1"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg></button></div>
          </div>
          <div style="display:flex;gap:10px">
            <button id="pass-save-btn" onclick="savePassword()" class="btn-primary flex-1" style="padding:11px;font-size:14px">Save</button>
            <button onclick="togglePassForm()" class="btn-ghost flex-1" style="padding:11px;font-size:14px">Cancel</button>
          </div>
          <p id="pass-err" style="display:none;font-size:12px;color:#fca5a5;margin:0"></p>
          <p id="pass-ok" style="display:none;font-size:12px;color:#4ade80;margin:0">✓ Password updated successfully.</p>
        </div>
        <div id="pass-placeholder" style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:12px 16px;color:rgba(255,255,255,0.3);font-size:14px;box-shadow:inset 0 1.5px 0 rgba(255,255,255,0.08)">••••••••••</div>
      </div>

      <button onclick="logout()" style="width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:12px 20px;border:1px solid rgba(237,31,81,.3);border-radius:12px;background:rgba(237,31,81,.08);color:var(--g3);font-size:14px;font-weight:600;cursor:pointer;transition:all .18s;margin-top:8px" onmouseover="this.style.background='rgba(237,31,81,.15)'" onmouseout="this.style.background='rgba(237,31,81,.08)'">
        <svg style="width:16px;height:16px;flex-shrink:0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
        Sign Out
      </button>
    </div>
  </div>`;

  window.togglePassForm=()=>{
    const form=document.getElementById("pass-form");
    const placeholder=document.getElementById("pass-placeholder");
    const btn=document.getElementById("pass-toggle-btn");
    const hidden=form.style.display==="none"||form.style.display==="";
    form.style.display=hidden?"flex":"none";
    placeholder.style.display=hidden?"none":"block";
    btn.textContent=hidden?"Cancel":"Change";
    document.getElementById("pass-err").style.display="none";
    document.getElementById("pass-ok").style.display="none";
    if(!hidden){
      // Closing form — reset state
      var np=document.getElementById("new-pass"); if(np) np.value="";
      var cp=document.getElementById("confirm-pass"); if(cp) cp.value="";
      var sb=document.getElementById("pass-save-btn"); if(sb){sb.disabled=false;sb.textContent="Save";}
    }
  };
  window.savePassword=async()=>{
    const np=document.getElementById("new-pass").value;
    const cp=document.getElementById("confirm-pass").value;
    const err=document.getElementById("pass-err");
    const ok=document.getElementById("pass-ok");
    const btn=document.getElementById("pass-save-btn");
    err.style.display="none";ok.style.display="none";
    if(!np||np.length<6){err.textContent="Password must be at least 6 characters.";err.style.display="block";return;}
    if(np!==cp){err.textContent="Passwords do not match.";err.style.display="block";return;}
    if(btn){btn.disabled=true;btn.textContent="Saving...";}
    try{
      if(typeof _sb==="undefined") throw new Error("not_ready");
      const{error}=await _sb.auth.updateUser({password:np});
      if(error) throw error;
      // Clear password_reset_required now that student has set a real password
      const authRes=await _sb.auth.getSession();
      const authUid=authRes.data&&authRes.data.session&&authRes.data.session.user?authRes.data.session.user.id:null;
      if(authUid){
        try{await _sb.from("students").update({password_reset_required:false}).eq("auth_user_id",authUid);}catch(e){}
      }
      ok.style.display="block";
      document.getElementById("new-pass").value="";
      document.getElementById("confirm-pass").value="";
    }catch(e){
      err.textContent="Failed to update password: "+(e.message||"unknown error")+". Try again.";
      err.style.display="block";
    }
    if(btn){btn.disabled=false;btn.textContent="Save";}
  };
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
let activeSectionId=SECTIONS[0].id;
let activeLesson=null;
let currentPage=0;
const PAGE_SIZE=5;

// Get admin-set title for a lesson (falls back to lesson.title)
function getLessonTitle(lesson){
  if(!lesson) return '';
  var vm=loadVideos()[lesson.order]||{};
  return vm.panelTitle||vm.title||lesson.title;
}

function renderDashboard(){
  document.body.style.overflow=""; // clear any lesson scroll-lock
  if(!_viewGuardOk()){navigate("login");return;}
  const student=loadStudents()[currentSession.studentId];
  if(!student){logout();return;}

  const{expired}=getValidity(student);
  if(expired){
    currentSession=null;
    app.innerHTML='<div style="min-height:100vh;background:var(--bg);display:flex;align-items:center;justify-content:center;padding:24px"><div style="text-align:center;max-width:340px"><h2 style="font-family:Montserrat,sans-serif;font-weight:800;font-size:20px;color:#fff;margin-bottom:8px">Access Expired</h2><p style="color:var(--muted);font-size:13px;margin-bottom:24px;line-height:1.6">Your course validity has ended.</p><button onclick="navigate(\'login\')" class="btn-primary" style="width:auto;padding:10px 24px">Back to Login</button></div></div>';
    return;
  }

  const logoutAt=localStorage.getItem("brokeneng_logout_"+student.id);
  if(logoutAt&&Date.now()>Number(logoutAt)){localStorage.removeItem("brokeneng_logout_"+student.id);logout();return;}

  const completedCount=ALL_LESSONS.filter(l=>isCompleted(l.id)).length;
  const unlockedCount=ALL_LESSONS.filter(isUnlocked).length;
  const pct=Math.round(completedCount/ALL_LESSONS.length*100);
  const quizScores=ALL_LESSONS.filter(l=>hasRealQuiz(l)&&isCompleted(l.id)).length;
  const xpTotal=completedCount>0?completedCount*100+quizScores*75:0;
  const vsArc=163.4*(1-pct/100);

  // Pick the next actual lesson to work on:
  // 1. First unlocked lesson that is NOT completed (this is what student should do next)
  // 2. If all unlocked are completed, use the last-opened one from localStorage
  // 3. Otherwise fallback to first lesson
  activeLesson=ALL_LESSONS.find(l=>isUnlocked(l)&&!isCompleted(l.id));
  if(!activeLesson){
    var lastLessonId=student?localStorage.getItem('brokeneng_lastlesson_'+student.id):null;
    var lastLesson=lastLessonId?ALL_LESSONS.find(l=>l.id===lastLessonId):null;
    if(lastLesson&&isUnlocked(lastLesson)){
      activeLesson=lastLesson;
    } else {
      activeLesson=ALL_LESSONS.find(l=>isUnlocked(l))||ALL_LESSONS[0];
    }
  }
  const nextLesson=activeLesson;

  const days=['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
  const months=['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  const now=new Date();
  const dateStr=days[now.getDay()]+' · '+months[now.getMonth()]+' '+now.getFullYear();
  const hr=now.getHours();
  const greet=hr<12?'Good morning':hr<17?'Good afternoon':'Good evening';

  // Journey dots — section a only (20 lessons)
  const journeyLessons=SECTIONS[0]?SECTIONS[0].lessons:ALL_LESSONS.slice(0,20);
  var dots='';
  journeyLessons.forEach(function(l,i){
    var done=isCompleted(l.id);
    var unlocked=isUnlocked(l);
    var isCur=!done&&unlocked;
    var cls=done?'done':isCur?'current':'locked';
    var isLast=i===journeyLessons.length-1;
    dots+='<div class="jd-item"'+(unlocked?' onclick="navigate(\'lesson\',{id:\''+l.id+'\'})"':'')+'>'+
      '<div class="jd-dot '+cls+'">'+(done?'✓':l.order)+'</div>'+
      '<div class="jd-num">D'+String(l.order).padStart(2,'0')+'</div>'+
      '</div>'+
      (!isLast?'<div class="jd-line '+(done?'done':'')+'"></div>':'');
  });

  // Phase cards
  var PHASES=[
    {name:'Foundation',days:'Days 1–4',orders:[1,2,3,4]},
    {name:'Sounds',days:'Days 5–8',orders:[5,6,7,8]},
    {name:'Precision Round',days:'Days 9–12',orders:[9,10,11,12]},
    {name:'Fine-Tune',days:'Days 13–16',orders:[13,14,15,16]},
    {name:'Accent Mastery',days:'Days 17–20',orders:[17,18,19,20]},
  ];
  var phaseCards='';
  PHASES.forEach(function(ph,pi){
    var isActive=nextLesson&&ph.orders.includes(nextLesson.order);
    var phaseLessons=ph.orders.map(function(o){return ALL_LESSONS.find(function(l){return l.order===o;});}).filter(Boolean);
    var phaseDoneCount=phaseLessons.filter(function(l){return isCompleted(l.id);}).length;
    var isPhaseComplete=phaseLessons.length>0&&phaseDoneCount===phaseLessons.length;

    var bg, border, badge;
    if(isPhaseComplete){
      bg='rgba(34,197,94,.1)'; border='rgba(34,197,94,.35)';
      badge='<div style="position:absolute;top:10px;right:10px;font-size:14px;color:#4ade80">✓</div>';
    } else if(isActive){
      bg='rgba(255,45,120,.12)'; border='rgba(255,45,120,.3)'; badge='';
    } else {
      bg='rgba(255,255,255,.05)'; border='rgba(255,255,255,.09)'; badge='';
    }

    phaseCards+='<div style="min-width:180px;border-radius:16px;padding:18px;cursor:pointer;position:relative;'+
      'background:'+bg+';'+
      'border:1px solid '+border+';'+
      'flex-shrink:0;transition:all .2s" onclick="navigateToPhase('+pi+')">'+
      badge+
      '<div style="font-size:9px;font-weight:700;color:var(--muted);font-family:JetBrains Mono,monospace;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px">PHASE '+(pi+1)+'</div>'+
      '<div style="font-family:Montserrat,sans-serif;font-weight:700;font-size:14px;color:'+(isPhaseComplete?'#4ade80':'#fff')+';margin-bottom:2px">'+ph.name+'</div>'+
      '<div style="font-size:11px;color:var(--muted)">'+ph.days+'</div>'+
      (isPhaseComplete?'<div style="width:28px;height:2px;background:#4ade80;border-radius:2px;margin-top:10px"></div>':
       isActive?'<div style="width:28px;height:2px;background:var(--gradh);border-radius:2px;margin-top:10px"></div>':'')+
      '</div>';
  });

  // Word Vault preview — all 10 WV_DATA cards
  var wvCards='';
  if(typeof WV_DATA!=='undefined'){
    var _day5=ALL_LESSONS.find(function(l){return l.order===4;});
    var _wvUnlocked=isDemoSession()||!!(_day5&&isCompleted(_day5.id));
    var _wvVids=loadVideos();
    WV_DATA.forEach(function(f,idx){
      var _click=_wvUnlocked?'onclick="navigate(\'lesson\',{id:\''+f.id+'\'})"':'';
      var _v=_wvVids[100+idx+1]||{};
      var _thumb=_v.thumb||f.thumb||'';
            var _done=isCompleted(f.id);
      wvCards+='<div data-dash-wv-card="'+f.id+'" style="min-width:150px;max-width:150px;border-radius:12px;overflow:hidden;background:rgba(255,255,255,.05);border:1px solid '+(_done?'rgba(34,197,94,.3)':_wvUnlocked?'rgba(255,255,255,.09)':'rgba(255,255,255,.06)')+';flex-shrink:0;cursor:'+(_wvUnlocked?'pointer':'default')+';position:relative;opacity:'+(_wvUnlocked?'1':'.5')+'" '+_click+'>'+
        '<div data-dash-wv-tick="'+f.id+'" style="position:absolute;top:8px;right:8px;background:rgba(34,197,94,.9);border-radius:50%;width:22px;height:22px;display:'+(_done?'flex':'none')+';align-items:center;justify-content:center;font-size:12px;font-weight:900;color:#fff;z-index:2">✓</div>'+
        (!_wvUnlocked?'<div style="position:absolute;top:10px;right:10px;font-size:11px;color:var(--muted);z-index:2"><img src="data:image/png;base64,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" style="width:22px;height:22px;object-fit:contain;vertical-align:middle;filter:brightness(1.4) drop-shadow(0 0 3px rgba(255,255,255,.3))"/></div>':'')+
        (_thumb
          ?'<div style="height:84px;background:#000"><img src="'+_thumb+'" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.parentElement.innerHTML=\'<div style=&quot;font-size:26px;display:flex;align-items:center;justify-content:center;height:100%&quot;>'+f.icon+'</div>\'"/></div>'
          :'<div style="height:84px;display:flex;align-items:center;justify-content:center;font-size:30px;background:rgba(255,255,255,.03)">'+f.icon+'</div>')+
        '<div style="padding:10px 12px 12px">'+
        '<div style="font-size:9px;color:var(--muted);font-family:JetBrains Mono,monospace;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">'+f.cat+'</div>'+
        '<div style="font-family:Montserrat,sans-serif;font-weight:700;font-size:12px;color:#fff;line-height:1.3">'+f.title+'</div>'+
        '</div>'+
        '</div>';
    });
  }

  // Continue mission info
  var cmDur='18 min', cmXp=100, cmDiff='Beginner';
  if(nextLesson){
    var cmMeta=loadVideos()[nextLesson.order]||{};
    cmDur=cmMeta.duration||'18 min';
    cmXp=nextLesson.order*10+90;
    cmDiff=nextLesson.order<=4?'Beginner':nextLesson.order<=12?'Intermediate':'Advanced';
  }

  // Stat cards
  var accentDone=SECTIONS[0]?SECTIONS[0].lessons.filter(function(l){return isCompleted(l.id);}).length:completedCount;
  var allQuizLessons=ALL_LESSONS.filter(function(l){return hasRealQuiz(l)&&isUnlocked(l)&&isCompleted(l.id);});
  var quizAccStr=allQuizLessons.length>0?Math.round(allQuizLessons.length/Math.max(1,ALL_LESSONS.filter(function(l){return hasRealQuiz(l);}).length)*100)+'%':'—';

  app.innerHTML=sidebarHtml("dashboard")+
    '<div id="main-content">'+
    topBarHtml(student)+
    mobileNavHtml("dashboard")+
    '<div style="padding:28px 32px 80px" id="dash-inner">'+

    // GREETING + VOICE SCORE
    '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;gap:16px;flex-wrap:wrap">'+
      '<div>'+
        '<div style="font-size:11px;color:var(--muted);font-family:JetBrains Mono,monospace;letter-spacing:.07em;margin-bottom:4px">'+dateStr+'</div>'+
        '<div style="font-family:Montserrat,sans-serif;font-weight:800;font-size:34px;line-height:1.1;margin-bottom:4px">'+
          greet+', <span style="background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent">'+student.name.split(' ')[0]+'</span> 👋'+
        '</div>'+
        '<div style="font-size:13px;color:var(--muted2)">'+
          (completedCount===0?'Day 1 awaits. Your transformation begins now.':nextLesson?'Day '+nextLesson.order+' awaits. Keep going.':'Course complete! Amazing work.')+
        '</div>'+
      '</div>'+
      '<div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:16px 20px;backdrop-filter:blur(20px);display:flex;align-items:center;gap:16px;box-shadow:inset 0 1px 0 rgba(255,255,255,.1);flex-shrink:0">'+
        '<div style="position:relative;width:64px;height:64px;flex-shrink:0">'+
          '<svg width="64" height="64" viewBox="0 0 64 64" style="position:absolute;inset:0">'+
            '<circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="5"/>'+
            '<circle cx="32" cy="32" r="26" fill="none" stroke="url(#vgr)" stroke-width="5" stroke-linecap="round" stroke-dasharray="163.4" stroke-dashoffset="'+vsArc+'" transform="rotate(-90 32 32)" style="transition:stroke-dashoffset 1s ease"/>'+
            '<defs><linearGradient id="vgr" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#FF2D78"/><stop offset="100%" stop-color="#FF8C00"/></linearGradient></defs>'+
          '</svg>'+
          '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:JetBrains Mono,monospace;font-size:13px;font-weight:600;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent">'+pct+'%</div>'+
        '</div>'+
        '<div>'+
          '<div style="font-size:9px;color:var(--muted);font-family:JetBrains Mono,monospace;text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px">Voice Score</div>'+
          '<div style="font-family:Montserrat,sans-serif;font-weight:800;font-size:18px;color:#fff">Level '+(Math.floor(pct/20)+1)+'</div>'+
          '<div style="font-size:11px;color:var(--g3);margin-top:2px">'+pct+'% total progress</div>'+
        '</div>'+
      '</div>'+
    '</div>'+

    // CONTINUE MISSION CARD
    (nextLesson?
      '<div id="cm-card" style="background:rgba(255,45,120,.07);border:1px solid rgba(255,45,120,.2);border-radius:22px;padding:26px 28px;margin-bottom:22px;position:relative;overflow:hidden;cursor:pointer;backdrop-filter:blur(20px);box-shadow:0 4px 40px rgba(255,45,120,.1),inset 0 1px 0 rgba(255,255,255,.12);transition:transform .2s,box-shadow .2s" onclick="navigate(\'lesson\',{id:\''+nextLesson.id+'\'})" onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'\'">'+
        '<div style="position:absolute;top:-80px;right:-60px;width:300px;height:300px;background:radial-gradient(circle,rgba(255,45,120,.18) 0%,transparent 70%);pointer-events:none"></div>'+
        '<div style="position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.25),transparent)"></div>'+
        '<div style="font-size:10px;font-family:JetBrains Mono,monospace;color:var(--g1);text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px;display:flex;align-items:center;gap:6px">'+
          '<span style="width:6px;height:6px;border-radius:50%;background:var(--g1);animation:blink 1.5s ease-in-out infinite;display:inline-block"></span>'+
          '🎯 Today\'s Mission · Day '+nextLesson.order+
        '</div>'+
        '<div style="font-family:Montserrat,sans-serif;font-weight:800;font-size:22px;color:#fff;margin-bottom:4px">'+getLessonTitle(nextLesson)+'</div>'+
        '<div style="font-size:12px;color:var(--muted2);margin-bottom:20px;display:flex;gap:14px;flex-wrap:wrap">'+
          '<span>⏱ '+cmDur+'</span><span>⚡ +'+cmXp+' XP</span><span>📊 '+cmDiff+'</span>'+
        '</div>'+
        '<div class="star-border-container" style="border-radius:10px"><div class="border-gradient-bottom"></div><div class="border-gradient-top"></div><button id="cm-btn" type="button" class="star-border-inner" style="display:inline-flex;align-items:center;gap:10px;padding:13px 26px;background:var(--grad);border:1px solid #222;border-radius:10px;color:#fff;font-family:Montserrat,sans-serif;font-weight:800;font-size:14px;cursor:pointer;box-shadow:0 4px 20px rgba(255,45,120,.4);letter-spacing:.02em">'+(completedCount===0?'Start Your Accent Neutralization Journey':'Continue Mission →')+'</button></div>'+
      '</div>'
    :'')+

    // STAT CARDS
    '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:22px" class="dash-stats-grid">'+
      [
        {icon:'🔥',val:Math.max(1,completedCount),label:'Day Streak'},
        {icon:'⚡',val:xpTotal,label:'XP Earned'},
        {icon:'📅',val:accentDone+'/20',label:'Missions Done'},
        {icon:'🎯',val:quizAccStr,label:'Quiz Accuracy'},
      ].map(function(s){
        return '<div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);border-radius:16px;padding:18px;position:relative;overflow:hidden;transition:transform .2s" onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'\'">'+
          '<div style="position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent)"></div>'+
          '<div style="font-size:20px;margin-bottom:10px">'+s.icon+'</div>'+
          '<div style="font-family:JetBrains Mono,monospace;font-size:26px;font-weight:600;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;line-height:1;margin-bottom:3px">'+s.val+'</div>'+
          '<div style="font-size:11px;color:var(--muted)">'+s.label+'</div>'+
          '</div>';
      }).join('')+
    '</div>'+

    // JOURNEY PROGRESS
    '<div style="background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:var(--r);padding:20px;margin-bottom:22px;overflow:visible">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">'+
        '<div style="font-family:Montserrat,sans-serif;font-weight:700;font-size:14px">Journey Progress</div>'+
        '<div style="font-size:12px;color:var(--g1);cursor:pointer" onclick="navigate(\'courses\')">View all →</div>'+
      '</div>'+
      '<div class="journey-dots dock-row" id="jp-dots">'+dots+'</div>'+
    '</div>'+

    // PHASES
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">'+
      '<div style="font-family:Montserrat,sans-serif;font-weight:700;font-size:16px">Your Journey Phases</div>'+
    '</div>'+
    '<div style="display:flex;gap:24px;overflow-x:auto;overflow-y:visible;padding:60px 50px 14px;margin:-32px -46px 16px;" class="dock-row">'+phaseCards+'</div>'+

    // WORD VAULT PREVIEW
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">'+
      '<div style="font-family:Montserrat,sans-serif;font-weight:700;font-size:16px">Pronunciation Workshop</div>'+
      '<div style="font-size:12px;color:var(--g1);cursor:pointer" onclick="navigate(\'wordvault\')">Browse all →</div>'+
    '</div>'+
    '<div style="display:flex;gap:24px;overflow-x:auto;overflow-y:visible;padding:60px 50px 14px;margin:-32px -46px -6px" class="dock-row">'+wvCards+'</div>'+

    '</div></div>';

  // Wire Continue Mission button
  if(nextLesson){
    var cmBtn=document.getElementById('cm-btn');
    if(cmBtn) cmBtn.addEventListener('click',function(){navigate('lesson',{id:nextLesson.id});});
    var cmCard=document.getElementById('cm-card');
    if(cmCard) cmCard.addEventListener('click',function(){navigate('lesson',{id:nextLesson.id});});
  }
}
