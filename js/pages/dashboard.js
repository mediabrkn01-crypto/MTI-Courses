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

  const quizTotal=ALL_LESSONS.filter(l=>hasRealQuiz(l)).length;
  const fmtLong=d=>d.toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'});
  const access=(()=>{
    const{validUntil,expired}=getValidity(student);
    if(student.completedAt) return{c:'ok',t:'Course complete — lifetime access',s:'Finished '+fmtLong(new Date(student.completedAt))+'. Revisit any lesson anytime.'};
    if(!validUntil) return{c:'muted',t:'Active access',s:'Complete all lessons to keep everything unlocked for life.'};
    const days=Math.ceil((validUntil-today)/86400000);
    if(expired) return{c:'bad',t:'Access expired',s:'Ended '+fmtLong(validUntil)+'. Contact your admin to renew.'};
    if(days<=7) return{c:'bad',t:'Expires in '+days+' day'+(days===1?'':'s'),s:'Valid until '+fmtLong(validUntil)+'. Contact your admin to extend.'};
    if(days<=30) return{c:'warn',t:days+' days remaining',s:'Valid until '+fmtLong(validUntil)+'. Finish the course to keep lifetime access.'};
    return{c:'ok',t:'Active · '+days+' days left',s:'Valid until '+fmtLong(validUntil)+'. Finish the course to keep lifetime access.'};
  })();
  const pfStat=(label,val,of)=>`<div class="dsh-card dsh-stat">
    <div class="dsh-stat-top">${label}</div>
    <div class="dsh-stat-val">${val}${of?`<small>/${of}</small>`:''}</div>
    ${of?`<div class="dsh-bar${val>=of?' ok':''}"><span style="width:${Math.round(val/of*100)}%"></span></div>`:''}
  </div>`;
  const eyeOff='<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
  const pwField=(id,label,ph)=>`<div>
    <label style="display:block;font-size:11px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--muted2);margin-bottom:6px">${label}</label>
    <div style="position:relative"><input id="${id}" type="password" autocomplete="new-password" placeholder="${ph}" class="glass-input" style="padding-right:44px"/><button type="button" aria-label="Show password" onclick="togglePw('${id}',this)" tabindex="-1" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:rgba(255,255,255,.55);padding:0;line-height:1">${eyeOff}</button></div>
  </div>`;

  app.innerHTML=sidebarHtml("profile")+`
  <div id="main-content">
    ${topBarHtml(student)}
    ${mobileNavHtml("profile")}
    <div class="pf-wrap">
      <h1 style="font-family:'Montserrat',sans-serif;font-weight:800;font-size:26px;color:#fff;margin:0 0 4px">Profile</h1>
      <p style="font-size:13px;color:var(--muted2);margin:0 0 22px">Your account details and learning progress.</p>

      <div class="pf-grid">
        <aside class="dsh-card pf-id">
          <div class="avatar-upload" onclick="document.getElementById('photo-input').click()" title="Change photo">
            <div id="profile-avatar">${avatarHtml(student,88,32)}</div>
            <div class="avatar-overlay rounded-2xl">
              <svg style="width:22px;height:22px;color:#fff" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <input id="photo-input" type="file" accept="image/*" style="display:none" onchange="handlePhotoUpload(event,'${student.id}')"/>
          </div>
          <p class="pf-name">${escapeHtml(student.name)}</p>
          <p class="pf-email">${escapeHtml(student.email)}</p>
          <span class="pf-role">Student</span>
          <p class="pf-hint">Tap your photo to change it</p>
          <div class="pf-status ${access.c}">
            <p class="pf-status-t">${access.t}</p>
            <p class="pf-status-s">${access.s}</p>
          </div>
          <button onclick="logout()" class="pf-signout">
            <svg style="width:16px;height:16px;flex-shrink:0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            Sign out
          </button>
        </aside>

        <div style="min-width:0">
          <div class="pf-stats">
            ${pfStat('Lessons done',completedCount,ALL_LESSONS.length)}
            ${pfStat('Quizzes done',quizCount,quizTotal)}
            ${pfStat('Progress',pct+'%')}
          </div>

          <section class="dsh-card pf-sec">
            <div class="pf-sec-head"><h2 class="dsh-h2">Account details</h2></div>
            <dl class="pf-rows">
              <div class="pf-row"><dt>Full name</dt><dd>${escapeHtml(student.name)}</dd></div>
              <div class="pf-row"><dt>Email address</dt><dd>${escapeHtml(student.email)}</dd></div>
              <div class="pf-row"><dt>Member since</dt><dd>${student.createdAt?fmtLong(new Date(student.createdAt)):'—'}</dd></div>
            </dl>
            <p class="pf-note">To update your name or email, contact your course admin.</p>
          </section>

          <section class="dsh-card pf-sec" id="pass-card">
            <div class="pf-sec-head">
              <h2 class="dsh-h2">Password</h2>
              <button onclick="togglePassForm()" id="pass-toggle-btn" class="pf-btn">Change</button>
            </div>
            <div id="pass-form" style="display:none;flex-direction:column;gap:12px">
              ${pwField('new-pass','New password','At least 6 characters')}
              ${pwField('confirm-pass','Confirm password','Re-enter new password')}
              <div style="display:flex;gap:10px">
                <button id="pass-save-btn" onclick="savePassword()" class="btn-primary flex-1" style="padding:11px;font-size:14px">Save password</button>
                <button onclick="togglePassForm()" class="btn-ghost flex-1" style="padding:11px;font-size:14px">Cancel</button>
              </div>
              <p id="pass-err" style="display:none;font-size:12px;color:#fca5a5;margin:0"></p>
              <p id="pass-ok" style="display:none;font-size:12px;color:#4ade80;margin:0">✓ Password updated successfully.</p>
            </div>
            <p id="pass-placeholder" style="margin:0;font-size:13px;color:var(--muted2)">Use a password you don't use anywhere else.</p>
          </section>
        </div>
      </div>
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
    var cls=isPhaseComplete?' done':isActive?' active':'';
    var tag=isPhaseComplete?'<span class="dsh-tag ok">DONE</span>':isActive?'<span class="dsh-tag now">NOW</span>':'';
    phaseCards+='<div class="dsh-card dsh-phase'+cls+'" onclick="navigateToPhase('+pi+')">'+
      '<div class="dsh-phase-k"><span>Phase '+(pi+1)+'</span>'+tag+'</div>'+
      '<p class="dsh-phase-name">'+ph.name+'</p>'+
      '<p class="dsh-phase-days">'+ph.days+' · '+phaseDoneCount+'/'+phaseLessons.length+' done</p>'+
      '<div class="dsh-bar'+(isPhaseComplete?' ok':'')+'"><span style="width:'+(phaseLessons.length?Math.round(phaseDoneCount/phaseLessons.length*100):0)+'%"></span></div>'+
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

  // Stat cards — each value is exactly what its label says.
  var accentLessons=SECTIONS[0]?SECTIONS[0].lessons:ALL_LESSONS;
  var accentDone=accentLessons.filter(function(l){return isCompleted(l.id);}).length;
  var quizTotal=ALL_LESSONS.filter(function(l){return hasRealQuiz(l);}).length;
  var quizDone=ALL_LESSONS.filter(function(l){return hasRealQuiz(l)&&isUnlocked(l)&&isCompleted(l.id);}).length;
  var ico={
    book:'<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5v14zM20 17v4H6.5A2.5 2.5 0 014 18.5"/></svg>',
    bolt:'<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
    check:'<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>',
    unlock:'<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 019.9-1"/></svg>'
  };
  function statCard(icon,label,val,of){
    var pctv=of?Math.round(Number(val)/of*100):null;
    return '<div class="dsh-card dsh-stat">'+
      '<div class="dsh-stat-top"><span class="dsh-stat-ico">'+icon+'</span>'+label+'</div>'+
      '<div class="dsh-stat-val">'+val+(of?'<small>/'+of+'</small>':'')+'</div>'+
      (of?'<div class="dsh-bar'+(pctv>=100?' ok':'')+'"><span style="width:'+pctv+'%"></span></div>':'')+
    '</div>';
  }
  var cmThumb=nextLesson?((loadVideos()[nextLesson.order]||{}).thumb||''):'';

  app.innerHTML=sidebarHtml("dashboard")+
    '<div id="main-content">'+
    topBarHtml(student)+
    mobileNavHtml("dashboard")+
    '<div class="dsh-wrap" id="dash-inner">'+

    // GREETING + VOICE SCORE
    '<div style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:24px;gap:16px;flex-wrap:wrap">'+
      '<div>'+
        '<div class="dsh-mono" style="font-size:11px;color:var(--muted);letter-spacing:.07em;margin-bottom:6px">'+dateStr+'</div>'+
        '<h1 style="font-family:Montserrat,sans-serif;font-weight:800;font-size:32px;line-height:1.1;margin:0 0 6px;color:#fff">'+
          greet+', <span style="background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent">'+escapeHtml(student.name.split(' ')[0])+'</span>'+
        '</h1>'+
        '<div style="font-size:14px;color:var(--muted2)">'+
          (completedCount===0?'Day 1 awaits. Your transformation begins now.':nextLesson?'Day '+nextLesson.order+' awaits. Keep going.':'Course complete! Amazing work.')+
        '</div>'+
      '</div>'+
      '<div class="dsh-card" style="padding:14px 18px;display:flex;align-items:center;gap:14px;flex-shrink:0">'+
        '<div style="position:relative;width:56px;height:56px;flex-shrink:0">'+
          '<svg width="56" height="56" viewBox="0 0 64 64" style="position:absolute;inset:0">'+
            '<circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="6"/>'+
            '<circle cx="32" cy="32" r="26" fill="none" stroke="url(#vgr)" stroke-width="6" stroke-linecap="round" stroke-dasharray="163.4" stroke-dashoffset="'+vsArc+'" transform="rotate(-90 32 32)" style="transition:stroke-dashoffset 1s ease"/>'+
            '<defs><linearGradient id="vgr" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#FF2D78"/><stop offset="100%" stop-color="#FF8C00"/></linearGradient></defs>'+
          '</svg>'+
          '<div class="dsh-mono" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:#fff">'+pct+'%</div>'+
        '</div>'+
        '<div>'+
          '<div class="dsh-mono" style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px">Voice Score</div>'+
          '<div style="font-family:Montserrat,sans-serif;font-weight:800;font-size:18px;color:#fff">Level '+(Math.floor(pct/20)+1)+'</div>'+
          '<div style="font-size:11px;color:var(--muted2);margin-top:2px">'+(pct>=100?'Max level reached':(20-pct%20)+'% to Level '+(Math.floor(pct/20)+2))+'</div>'+
        '</div>'+
      '</div>'+
    '</div>'+

    // CONTINUE MISSION CARD
    (nextLesson?
      '<div id="cm-card" class="dsh-card dsh-mission">'+
        '<div class="dsh-mission-body">'+
          '<div class="dsh-eyebrow"><span class="dot"></span>Today\'s mission · Day '+nextLesson.order+'</div>'+
          '<h2 class="dsh-mission-title">'+escapeHtml(getLessonTitle(nextLesson))+'</h2>'+
          '<div class="dsh-meta"><span>'+escapeHtml(cmDur)+'</span><span>+'+cmXp+' XP</span><span>'+cmDiff+'</span></div>'+
          '<div><div class="star-border-container" style="border-radius:10px;display:inline-block"><div class="border-gradient-bottom"></div><div class="border-gradient-top"></div><button id="cm-btn" type="button" class="star-border-inner" style="display:inline-flex;align-items:center;gap:10px;padding:13px 26px;background:var(--grad);border:1px solid #222;border-radius:10px;color:#fff;font-family:Montserrat,sans-serif;font-weight:800;font-size:14px;cursor:pointer;box-shadow:0 4px 20px rgba(255,45,120,.4);letter-spacing:.02em">'+(completedCount===0?'Start your journey →':'Continue mission →')+'</button></div></div>'+
        '</div>'+
        '<div class="dsh-mission-thumb">'+
          (cmThumb?'<img src="'+escapeAttr(cmThumb)+'" alt="" onerror="this.remove()"/>':'')+
          '<div class="dsh-play"><span><svg width="20" height="20" viewBox="0 0 24 24" fill="#ED1F51"><path d="M8 5v14l11-7z"/></svg></span></div>'+
        '</div>'+
      '</div>'
    :'')+

    // STAT CARDS
    '<div class="dsh-stats">'+
      statCard(ico.book,'Classes done',accentDone,accentLessons.length)+
      statCard(ico.bolt,'XP earned',xpTotal)+
      statCard(ico.check,'Quizzes done',quizDone,quizTotal||null)+
      statCard(ico.unlock,'Classes unlocked',unlockedCount,ALL_LESSONS.length)+
    '</div>'+

    // JOURNEY PROGRESS
    '<div class="dsh-card dsh-journey">'+
      '<div class="dsh-sec-head">'+
        '<h2 class="dsh-h2">Journey progress <span class="dsh-mono" style="font-size:12px;color:var(--muted2);font-weight:400;margin-left:6px">'+accentDone+' of '+accentLessons.length+' days</span></h2>'+
        '<button class="dsh-link" onclick="navigate(\'courses\')">View all →</button>'+
      '</div>'+
      '<div class="journey-dots dock-row" id="jp-dots">'+dots+'</div>'+
    '</div>'+

    // PHASES
    '<div class="dsh-sec-head"><h2 class="dsh-h2">Your journey phases</h2></div>'+
    '<div class="dsh-phases">'+phaseCards+'</div>'+

    // WORD VAULT PREVIEW
    '<div class="dsh-sec-head">'+
      '<h2 class="dsh-h2">Pronunciation Workshop</h2>'+
      '<button class="dsh-link" onclick="navigate(\'wordvault\')">Browse all →</button>'+
    '</div>'+
    '<div class="dsh-wv-row dock-row">'+wvCards+'</div>'+

    '</div></div>';

  // Wire Continue Mission button
  if(nextLesson){
    var cmBtn=document.getElementById('cm-btn');
    if(cmBtn) cmBtn.addEventListener('click',function(e){e.stopPropagation();navigate('lesson',{id:nextLesson.id});});
    var cmCard=document.getElementById('cm-card');
    if(cmCard) cmCard.addEventListener('click',function(){navigate('lesson',{id:nextLesson.id});});
  }
}
