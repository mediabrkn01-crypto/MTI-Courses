/* courses.js — extracted verbatim from the original single-file index.html.
   Source lines: 1693-1809, 4111-4191
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
// ─── HELPERS ─────────────────────────────────────────────────────────────────
// 3-per-day drip unlock logic:
// Unlock rule — sequential, at most DAILY_UNLOCK_LIMIT (4) classes per calendar day:
//  • Day 1 is always open; completed classes always stay open.
//  • The next class opens as soon as the previous one is completed (Mark Complete or
//    finishing the video) — no refresh needed.
//  • Per day a student gets at most 4 classes. The class they were already on when the
//    day started counts as one of the 4 (D05 open → D05, D06, D07, D08 = 4).
//  • Each class opened today is recorded as a drip row (course_config drip_<id>_<date>)
//    so the count survives reloads/devices; admin unlocks (date 0000-00-00) are extra.
// (Replaces the old fixed 4-class blocks that could only start the day after the previous
//  block ended — a student who did 2 classes on day 1 then only got 2 on day 2.)
function _localDateKey(d){ d=d||new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function getUnlockedSet(student){
  const progress = loadProgress(student.id);
  const done = new Set(ALL_LESSONS.filter(l=>progress.has(l.id)).map(l=>l.order));
  const todayStr=_localDateKey();
  const LIMIT=(typeof DAILY_UNLOCK_LIMIT!=='undefined'&&DAILY_UNLOCK_LIMIT>0)?DAILY_UNLOCK_LIMIT:4;
  const drip=_dripCache[student.id]||{};

  const allUnlocked = new Set([1]); // Day 1 always unlocked
  var openedToday = new Set();
  Object.keys(drip).forEach(function(d){
    var set=drip[d]; if(!(set instanceof Set)) return;
    set.forEach(function(o){ allUnlocked.add(o); if(d===todayStr) openedToday.add(o); });
  });
  done.forEach(function(o){ allUnlocked.add(o); });

  // Persist only once this device has loaded the student's drip rows from the server
  // (sbLoadProgress creates _dripCache[id]); before that, a partial cache could overwrite
  // today's row. Until then unlocks are computed but not saved.
  var dripLoaded=!!_dripCache[student.id];
  function recordToday(order){
    openedToday.add(order);
    if(!dripLoaded) return;
    if(!_dripCache[student.id][todayStr]) _dripCache[student.id][todayStr]=new Set();
    _dripCache[student.id][todayStr].add(order);
    if(typeof sbSaveDripUnlock==='function'){
      sbSaveDripUnlock(student.id,todayStr,_dripCache[student.id][todayStr]).catch(function(){});
    }
    try{localStorage.setItem('brokeneng_drip_'+student.id+'_'+todayStr,JSON.stringify([..._dripCache[student.id][todayStr]]));}catch(e){}
  }
  // The class the student is on when the day starts (open, not completed, opened on an
  // earlier day — e.g. D01 on the first day) counts as one of today's classes. It is
  // recorded in today's row the first time we see it, so completing it later in the day
  // does not free up an extra slot.
  if(!openedToday.size){
    var carried=ALL_LESSONS.find(function(l){ return allUnlocked.has(l.order)&&!done.has(l.order); });
    if(carried) recordToday(carried.order);
  }
  var usedToday = openedToday.size;
  // Not loaded yet: show only what is certain (Day 1, completed, recorded unlocks).
  // refreshUnlockViews() redraws once sbLoadProgress has the drip rows.
  if(!dripLoaded) return allUnlocked;

  for(let i=1;i<ALL_LESSONS.length;i++){
    const lesson=ALL_LESSONS[i], prev=ALL_LESSONS[i-1];
    if(allUnlocked.has(lesson.order)) continue;   // already open (drip / completed / admin)
    if(!done.has(prev.order)) break;              // sequential: previous must be completed
    if(usedToday>=LIMIT) break;                   // daily maximum reached — next class tomorrow

    allUnlocked.add(lesson.order);
    recordToday(lesson.order);
    usedToday++;
  }

  return allUnlocked;
}

// Redraw whatever on screen depends on unlock state (after progress/drip load or a
// completion) without reloading the video player.
function refreshUnlockViews(){
  try{
    var scr=(history.state&&history.state.screen)||'';
    if(scr==='lesson'&&typeof window._lsRefresh==='function'){ window._lsRefresh(); return; }
    if((scr==='dashboard'||scr==='courses')&&document.getElementById('main-content')){
      var y=window.scrollY; (scr==='dashboard'?renderDashboard:renderMyCourses)(); window.scrollTo(0,y);
    }
  }catch(e){}
}
function isUnlocked(lesson){
  if(isDemoSession())return (typeof canDemoLesson==='function')?canDemoLesson(lesson):true;
  if(currentSession?.role==="student"){
    const s=loadStudents()[currentSession.studentId];
    // If student not in localStorage (new device / Safari cleared storage),
    // build a minimal student object from session to allow access
    var student=s||{id:currentSession.studentId,accessList:[1],validUntil:null,completedAt:null};
    if(s){
      const{expired}=getValidity(s);
      if(expired)return false;
    }
    return getUnlockedSet(student).has(lesson.order);
  }
  return false;
}
function isVideoAccessible(lesson){
  if(!isUnlocked(lesson))return false;
  if(isDemoSession())return true;
  if(currentSession?.role==="student"){
    const locked=getLockedVideos(currentSession.studentId);
    if(locked.includes(lesson.order))return false;
  }
  return true;
}

// ─── MY COURSES ───────────────────────────────────────────────────────────────
function renderMyCourses(){
  if(!_viewGuardOk()){navigate("login");return;}
  const student=loadStudents()[currentSession.studentId];
  if(!student){logout();return;}

  const PHASES=[
    {name:'Foundation',days:'Days 1–4',orders:[1,2,3,4]},
    {name:'Sounds',days:'Days 5–8',orders:[5,6,7,8]},
    {name:'Precision Round',days:'Days 9–12',orders:[9,10,11,12]},
    {name:'Fine-Tune',days:'Days 13–16',orders:[13,14,15,16]},
    {name:'Accent Mastery',days:'Days 17–20',orders:[17,18,19,20]},
  ];

  const lockIc='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  const checkIc='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
  const upNext=ALL_LESSONS.find(l=>isUnlocked(l)&&!isCompleted(l.id));
  const totalDone=ALL_LESSONS.filter(l=>isCompleted(l.id)).length;

  const phaseHtml=PHASES.map((ph,pi)=>{
    const phaseLessons=ALL_LESSONS.filter(l=>ph.orders.includes(l.order));
    const phaseDoneCount=phaseLessons.filter(l=>isCompleted(l.id)).length;
    const isPhaseComplete=phaseLessons.length>0&&phaseDoneCount===phaseLessons.length;
    const rows=phaseLessons.map(l=>{
      const unlocked=isUnlocked(l);
      const completed=isCompleted(l.id);
      const vm=loadVideos()[l.order]||{};
      const thumb=vm.thumb||l.thumbnailUrl||'';
      const dur=vm.duration||'18 min';
      const diff=l.order<=4?'Beginner':l.order<=12?'Intermediate':'Advanced';
      const xp=l.order*10+90;
      const isNext=upNext&&upNext.id===l.id;
      const state=completed?'done':isNext?'next':unlocked?'open':'locked';
      const lonclick=unlocked?"navigate('lesson',{id:'"+l.id+"'})":'';
      const action=completed?'<span class="cr-status done">'+checkIc+'Completed</span>'
        :isNext?'<span class="cr-btn">Continue →</span>'
        :unlocked?'<span class="cr-btn ghost">Start</span>'
        :'<span class="cr-status locked">'+lockIc+'Locked</span>';
      return '<div class="cr-row '+state+'"'+(lonclick?' onclick="'+lonclick+'" role="button" tabindex="0" onkeydown="if(event.key===\'Enter\')'+lonclick.replace(/"/g,'&quot;')+'"':'')+'>'
        +'<div class="cr-thumb">'+(thumb?'<img src="'+escapeAttr(thumb)+'" alt=""'+thumbPosAttr(l.order)+' loading="lazy" onerror="this.remove()"/>':'')
          +'<span class="cr-day">Day '+l.order+'</span>'
          +(!unlocked?'<span class="cr-lock">'+lockIc+'</span>':'')
        +'</div>'
        +'<div class="cr-main">'
          +(isNext?'<span class="cr-tag">Up next</span>':'')
          +'<h3 class="cr-title">'+escapeHtml(getLessonTitle(l))+'</h3>'
          +'<div class="cr-meta"><span>'+escapeHtml(dur)+'</span><span>'+diff+'</span><span class="xp">+'+xp+' XP</span></div>'
          +(completed?'<div class="cr-mstat done">'+checkIc+'Completed</div>':!unlocked?'<div class="cr-mstat locked">'+lockIc+'Locked</div>':'')
        +'</div>'
        +'<div class="cr-act">'+action+'</div>'
      +'</div>';
    }).join('');
    return '<section id="phase-'+pi+'" class="cr-phase">'
      +'<div class="cr-phase-h">'
        +'<div style="min-width:0"><div class="cr-phase-k">Phase '+(pi+1)+' · '+ph.days+'</div>'
        +'<h2 class="cr-phase-name'+(isPhaseComplete?' ok':'')+'">'+ph.name+'</h2></div>'
        +'<div class="cr-phase-p"><span>'+phaseDoneCount+'/'+phaseLessons.length+' done</span>'
        +'<div class="dsh-bar'+(isPhaseComplete?' ok':'')+'" style="width:120px;height:4px"><span style="width:'+Math.round(phaseDoneCount/phaseLessons.length*100)+'%"></span></div></div>'
      +'</div>'
      +'<div class="cr-list dock-col" data-dock-opts=\'{"maxScale":1.04,"influence":170,"maxLift":0,"origin":"center center"}\'>'+rows+'</div>'
      +'</section>';
  }).join('');

  app.innerHTML=sidebarHtml("courses")+`
  <div id="main-content">
    ${topBarHtml(student)}
    ${mobileNavHtml("courses")}
    <div class="dsh-wrap">
      <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:28px">
        <div>
          <h1 style="font-family:'Montserrat',sans-serif;font-weight:800;font-size:30px;color:#fff;margin:0 0 6px">The Course</h1>
          <p style="font-size:14px;color:var(--muted2);margin:0">20 missions across 5 phases. One complete voice transformation.</p>
        </div>
        <div class="dsh-card" style="padding:12px 16px;min-width:220px">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted2);margin-bottom:8px"><span>Course progress</span><span class="dsh-mono" style="color:#fff">${totalDone}/${ALL_LESSONS.length}</span></div>
          <div class="dsh-bar"><span style="width:${Math.round(totalDone/ALL_LESSONS.length*100)}%"></span></div>
        </div>
      </div>
      ${phaseHtml}
    </div>
  </div>`;
  requestAnimationFrame(function(){
    document.querySelectorAll('.cr-list.dock-col').forEach(function(el){ initDockMagnify(el,'col'); });
  });
}
