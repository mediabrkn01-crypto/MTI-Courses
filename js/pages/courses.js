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
      const isActive=unlocked&&!completed;
      const lonclick=unlocked?"navigate('lesson',{id:'"+l.id+"'})":'';
      return '<div style="border-radius:14px;overflow:hidden;cursor:'+(unlocked?'pointer':'default')
        +';opacity:'+(unlocked?'1':'.45')+';margin-bottom:4px"'
        +' onclick="'+lonclick+'"'
        +'>'
        +'<div style="position:relative;width:100%;height:110px;background:rgba(255,255,255,.06);overflow:hidden">'
          +(thumb?'<img src="'+thumb+'" style="width:100%;height:100%;object-fit:cover;display:block"/>'
            :'<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center">'
              +'<span style="font-size:9px;font-family:JetBrains Mono,monospace;color:rgba(255,255,255,.2);text-transform:uppercase;letter-spacing:.1em">D'+String(l.order).padStart(2,'0')+'</span></div>')
          +'<div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(13,13,28,.92) 0%,rgba(13,13,28,.2) 60%,transparent 100%)"></div>'
          +(isActive?'<div style="position:absolute;top:0;left:0;right:0;height:2px;background:var(--gradh)"></div>':'')
          +'<div style="position:absolute;bottom:7px;left:10px;right:10px;display:flex;align-items:flex-end;justify-content:space-between">'
            +'<div style="min-width:0">'
              +'<div style="font-family:Montserrat,sans-serif;font-weight:700;font-size:13px;color:'+(unlocked?'#fff':'rgba(255,255,255,.5)')+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:360px">'+getLessonTitle(l)+'</div>'
              +'<div style="font-size:10px;color:rgba(255,255,255,.45);display:flex;gap:8px;margin-top:2px">'
                +'<span>'+dur+'</span><span>'+diff+'</span>'
                +(unlocked?'<span style="color:var(--g3);font-weight:600">+'+xp+' XP</span>':'')
              +'</div>'
            +'</div>'
            +(completed?'<span style="font-size:13px;color:var(--g1);flex-shrink:0">✓</span>'
              :unlocked?'<span style="font-size:16px;color:var(--g3);flex-shrink:0">▶</span>'
              :'<span style="font-size:12px;color:rgba(255,255,255,.25);flex-shrink:0"><img src="data:image/png;base64,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" style="width:22px;height:22px;object-fit:contain;vertical-align:middle;filter:brightness(1.4) drop-shadow(0 0 3px rgba(255,255,255,.3))"/></span>')
          +'</div>'
        +'</div>'
        +'</div>';
    }).join('');
    return '<div id="phase-'+pi+'" style="margin-bottom:32px">'
      +'<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">'
      +'<div style="font-size:9px;font-weight:700;color:var(--muted);font-family:\'JetBrains Mono\',monospace;text-transform:uppercase;letter-spacing:.1em;white-space:nowrap">PHASE '+(pi+1)+'</div>'
      +'<div style="font-family:\'Montserrat\',sans-serif;font-weight:800;font-size:20px;color:'+(isPhaseComplete?'#4ade80':'#fff')+'">'+ph.name+'</div>'
      +(isPhaseComplete?'<div style="font-size:14px;color:#4ade80">✓</div>':'')
      +'<div style="border-radius:99px;padding:3px 10px;font-size:10px;font-weight:700;background:'+(isPhaseComplete?'rgba(34,197,94,.12)':'rgba(255,255,255,.08)')+';border:1px solid '+(isPhaseComplete?'rgba(34,197,94,.3)':'rgba(255,255,255,.12)')+';color:'+(isPhaseComplete?'#4ade80':'var(--muted)')+';font-family:\'JetBrains Mono\',monospace;white-space:nowrap">'+ph.days+'</div>'
      +'</div>'
      +'<div style="display:flex;flex-direction:column;gap:26px;padding:24px 8px 24px 30px;margin:-16px -8px -16px -22px" class="dock-col">'+rows+'</div>'
      +'</div>';
  }).join('');

  app.innerHTML=sidebarHtml("courses")+`
  <div id="main-content">
    ${topBarHtml(student)}
    ${mobileNavHtml("courses")}
    <div style="padding:28px 32px 80px">
      <h1 style="font-family:'Montserrat',sans-serif;font-weight:800;font-size:28px;color:#fff;margin-bottom:4px">The Course</h1>
      <p style="font-size:14px;color:var(--muted);margin-bottom:28px">20 missions across 5 phases. One complete voice transformation.</p>
      ${phaseHtml}
    </div>
  </div>`;
  // Force dock-col init after DOM is ready
  requestAnimationFrame(function(){
    document.querySelectorAll('.dock-col').forEach(function(el){ initDockMagnify(el,'col'); });
    document.querySelectorAll('.dock-row').forEach(function(el){ initDockMagnify(el,'row'); });
  });
}
