/* courses.js — extracted verbatim from the original single-file index.html.
   Source lines: 1693-1809, 4111-4191
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
// ─── HELPERS ─────────────────────────────────────────────────────────────────
// 3-per-day drip unlock logic:
function getUnlockedSet(student){
  const progress = loadProgress(student.id);
  const done = new Set(ALL_LESSONS.filter(l=>progress.has(l.id)).map(l=>l.order));
  const attempted = getAttemptedQuizzes(student.id);
  const hasAnyQuizData=(attempted.size>0||(_quizPassedCache[student.id]&&_quizPassedCache[student.id].size>0));
  const todayStr=new Date().toISOString().slice(0,10);
  const PHASE=4; // lessons per phase

  const allUnlocked = new Set([1]); // Day 1 always unlocked

  // Restore all previously drip-unlocked lessons from Supabase cache
  if(_dripCache[student.id]){
    Object.values(_dripCache[student.id]).forEach(function(daySet){
      daySet.forEach(function(o){allUnlocked.add(o);});
    });
  }

  // Determine which phase the student is currently in based on completed lessons
  // Phase 1 = lessons 1-4, Phase 2 = lessons 5-8, etc.
  for(let i=1;i<ALL_LESSONS.length;i++){
    const lesson=ALL_LESSONS[i];
    const prev=ALL_LESSONS[i-1];

    // Already unlocked (from drip cache or explicit access) — keep going
    if(allUnlocked.has(lesson.order)){continue;}

    // Already completed on another device — restore access
    if(done.has(lesson.order)){allUnlocked.add(lesson.order);continue;}

    // Previous lesson must be completed
    if(!done.has(prev.order)) break;

    // Quiz gate: previous lesson's quiz must be attempted (if quiz tracking active)
    if(hasRealQuiz(prev)&&!attempted.has(prev.order)&&hasAnyQuizData) break;

    // Phase boundary check: if this lesson starts a new phase (position % PHASE === 0),
    // only unlock if today is a new day since the previous phase was completed
    var lessonIdx=i; // 0-based index in ALL_LESSONS
    if(lessonIdx % PHASE === 0){
      // This is the first lesson of a new phase
      // Find when the previous phase was completed (last completed lesson of prev phase)
      // Check if we have a drip entry for this phase starting today
      var phaseKey='phase_'+(Math.floor(lessonIdx/PHASE)+1);
      var phaseDripDate=null;
      if(_dripCache[student.id]){
        Object.keys(_dripCache[student.id]).forEach(function(d){
          var ds=_dripCache[student.id][d];
          if(ds instanceof Set&&ds.has(lesson.order)) phaseDripDate=d;
        });
      }
      if(phaseDripDate){
        // Already drip-unlocked on a previous day — restore all 4
        allUnlocked.add(lesson.order);
        continue;
      }
      // Check if today is allowed to unlock this phase
      // Find the date the previous phase block was last active
      var prevPhaseLastLesson=ALL_LESSONS[lessonIdx-1];
      var prevPhaseDripDate=null;
      if(_dripCache[student.id]){
        Object.keys(_dripCache[student.id]).forEach(function(d){
          var ds=_dripCache[student.id][d];
          if(ds instanceof Set&&ds.has(prevPhaseLastLesson.order)) prevPhaseDripDate=d;
        });
      }
      // Allow if: no prior drip history (Day 1 student) OR prior phase was on a different day
      var allowNewPhase=!prevPhaseDripDate||(prevPhaseDripDate<todayStr);
      if(!allowNewPhase) break; // same day as previous phase — wait until tomorrow
    }

    // Unlock this lesson and track the drip
    allUnlocked.add(lesson.order);
    if(!_dripCache[student.id]) _dripCache[student.id]={};
    if(!_dripCache[student.id][todayStr]) _dripCache[student.id][todayStr]=new Set();
    _dripCache[student.id][todayStr].add(lesson.order);
    if(typeof sbSaveDripUnlock==='function'){
      sbSaveDripUnlock(student.id,todayStr,_dripCache[student.id][todayStr]).catch(function(){});
    }
    try{localStorage.setItem('brokeneng_drip_'+student.id+'_'+todayStr,JSON.stringify([..._dripCache[student.id][todayStr]]));}catch(e){}

    // At phase boundary, unlock remaining 3 lessons of this phase in the same pass
    if(lessonIdx % PHASE === 0){
      // Continue looping — the next 3 will be unlocked by normal sequential flow
    }
  }

  return allUnlocked;
}

function isUnlocked(lesson){
  if(adminUnlockAll)return true;
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
        +'<div class="cr-thumb">'+(thumb?'<img src="'+escapeAttr(thumb)+'" alt="" loading="lazy" onerror="this.remove()"/>':'')
          +'<span class="cr-day">Day '+l.order+'</span>'
          +(!unlocked?'<span class="cr-lock">'+lockIc+'</span>':'')
        +'</div>'
        +'<div class="cr-main">'
          +(isNext?'<span class="cr-tag">Up next</span>':'')
          +'<h3 class="cr-title">'+escapeHtml(getLessonTitle(l))+'</h3>'
          +'<div class="cr-meta"><span>'+escapeHtml(dur)+'</span><span>'+diff+'</span><span class="xp">+'+xp+' XP</span></div>'
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
      +'<div class="cr-list">'+rows+'</div>'
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
}

