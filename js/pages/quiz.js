/* quiz.js — extracted verbatim from the original single-file index.html.
   Source lines: 4435-4504, 5506-5713
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
function renderQuizzes(){
  if(!_viewGuardOk()){navigate("login");return;}
  const student=loadStudents()[currentSession.studentId];
  if(!student){logout();return;}

  const quizLessons=ALL_LESSONS.filter(l=>hasRealQuiz(l));
  const locked=quizLessons.filter(l=>!isUnlocked(l));
  const quizLockedList=currentSession?.role==="student"?getLockedQuizzes(currentSession.studentId):[];
  const unlockableQuizzes=quizLessons.filter(l=>isUnlocked(l)&&!isCompleted(l.id));
  const readyQuizzes=quizLessons.filter(l=>isUnlocked(l)&&isCompleted(l.id)&&!quizLockedList.includes(l.order));
  const adminLockedQuizzes=quizLessons.filter(l=>isUnlocked(l)&&isCompleted(l.id)&&quizLockedList.includes(l.order));

  const STATS=[
    {label:"Total Quizzes",value:quizLessons.length,color:"rgba(255,255,255,0.9)"},
    {label:"Available",value:readyQuizzes.length,color:"var(--brand-2)"},
    {label:"Finish Lesson",value:unlockableQuizzes.length,color:"#fb923c"},
    {label:"Locked",value:locked.length+adminLockedQuizzes.length,color:"rgba(255,255,255,0.35)"},
  ];

  app.innerHTML=sidebarHtml("quizzes")+`
  <div id="main-content">
    ${topBarHtml(student)}
    ${mobileNavHtml("quizzes")}
    <div style="padding:20px 16px 60px">
      <h1 style="font-family:'Montserrat',sans-serif;font-weight:800;font-size:22px;color:#fff;margin-bottom:4px">Quizzes</h1>
      <p style="font-size:13px;color:var(--muted);margin-bottom:20px">Complete each lesson to unlock its quiz. Pass with 70% or more.</p>

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px" class="stats-grid">
        ${STATS.map(s=>`
          <div class="stat-card">
            <div style="font-family:'JetBrains Mono',monospace;font-size:24px;font-weight:700;color:${s.color};line-height:1;margin-bottom:4px">${s.value}</div>
            <div class="stat-label">${s.label}</div>
          </div>`).join("")}
      </div>

      <div class="lg" style="overflow:hidden">
        ${quizLessons.map((l,i)=>{
          const unlocked=isUnlocked(l);
          const lessonDone=isCompleted(l.id);
          const qAdminLocked=quizLockedList.includes(l.order);
          const quizReady=unlocked&&lessonDone&&!qAdminLocked;
          const section=SECTIONS.find(s=>s.id===l.sectionId);
          return`<div class="quiz-row" style="display:flex;align-items:center;gap:14px;padding:16px 20px;${i>0?'border-top:1px solid rgba(255,255,255,0.08)':''};${quizReady?'cursor:pointer':'cursor:default'};${!quizReady?'opacity:0.55':''}"
            onclick="${quizReady?`navigate('quiz',{lessonId:'${l.id}'})`:''}">
            <div style="width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;${quizReady?'background:linear-gradient(135deg,#E8341A,#FF7100);box-shadow:inset 0 2px 0 rgba(255,255,255,0.25),0 4px 12px rgba(232,52,26,0.4)':qAdminLocked&&lessonDone?'background:rgba(234,179,8,0.15);border:1px solid rgba(234,179,8,0.25)':'background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15)'}">
              <svg style="width:18px;height:18px;color:${quizReady?'#fff':qAdminLocked&&lessonDone?'#facc15':'rgba(255,255,255,0.4)'}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
              </svg>
            </div>
            <div style="flex:1;min-width:0">
              <p style="font-size:14px;font-weight:600;color:#fff">Day ${l.order} Quiz</p>
              <p style="font-size:11px;margin-top:2px;color:rgba(255,255,255,0.45);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${l.title} · ${section.title}</p>
            </div>
            <div style="flex-shrink:0;display:flex;align-items:center;gap:8px">
              ${quizReady
                ?`<span style="border-radius:99px;padding:4px 12px;font-size:11px;font-weight:700;background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.3);color:#4ade80">Ready</span>
                  <svg style="width:14px;height:14px;color:rgba(255,255,255,0.3)" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>`
                :qAdminLocked&&lessonDone
                ?`<span style="border-radius:99px;padding:4px 10px;font-size:11px;font-weight:700;background:rgba(234,179,8,0.12);border:1px solid rgba(234,179,8,0.22);color:#facc15"><img src="data:image/png;base64,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" style="width:22px;height:22px;object-fit:contain;vertical-align:middle;filter:brightness(1.4) drop-shadow(0 0 3px rgba(255,255,255,.3))"/> Admin</span>`
                :unlocked&&!lessonDone
                ?`<span style="border-radius:99px;padding:4px 10px;font-size:11px;font-weight:700;background:rgba(255,113,0,0.12);border:1px solid rgba(255,113,0,0.22);color:#fb923c">Finish Lesson</span>`
                :`<span style="border-radius:99px;padding:4px 10px;font-size:11px;font-weight:700;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:rgba(255,255,255,0.35)"><img src="data:image/png;base64,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" style="width:22px;height:22px;object-fit:contain;vertical-align:middle;filter:brightness(1.4) drop-shadow(0 0 3px rgba(255,255,255,.3))"/> Locked</span>`}
            </div>
          </div>`;
        }).join("")}
      </div>
    </div>
  </div>`;
}

// ─── QUIZ ─────────────────────────────────────────────────────────────────────
function renderQuiz(lessonId){
  const lesson=ALL_LESSONS.find(l=>l.id===lessonId);
  if(!lesson||!isCompleted(lesson.id)){navigate("lesson",{id:lessonId});return;}
  if(currentSession?.role==="student"){
    const lockedQuizzes=getLockedQuizzes(currentSession.studentId);
    if(lockedQuizzes.includes(lesson.order)){navigate("lesson",{id:lessonId});return;}
  }
  if(!_viewGuardOk()){navigate("login");return;}
  const student=loadStudents()[currentSession.studentId];
  const QUESTIONS=getQuiz(lesson);
  const total=QUESTIONS.length;
  let current=0,correct=0,answered=false;
  var userResponses={}; // { questionId: choiceIndex } — submitted to server at end

  document.body.style.overflow='hidden';

  app.innerHTML=sidebarHtml("")+`
  <style>
    .be-quiz-wrap{display:flex;flex-direction:column;height:100vh;overflow:hidden;background:var(--bg)}
    .be-quiz-topbar{display:flex;align-items:center;gap:14px;padding:14px 28px;border-bottom:1px solid rgba(255,255,255,.07);background:rgba(13,13,28,.92);backdrop-filter:blur(20px);flex-shrink:0;position:relative;z-index:10}
    .be-quiz-body{flex:1;overflow-y:auto;display:flex;align-items:flex-start;justify-content:center;padding:48px 24px 80px}
    .be-quiz-card{width:100%;max-width:680px}
    .be-quiz-header{margin-bottom:36px}
    .be-quiz-meta{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--g3);margin-bottom:6px}
    .be-quiz-title{font-family:'Montserrat',sans-serif;font-weight:800;font-size:28px;color:#fff;line-height:1.2;margin-bottom:20px}
    .be-prog-track{height:3px;background:rgba(255,255,255,.08);border-radius:2px;overflow:hidden;margin-bottom:6px}
    .be-prog-fill{height:100%;background:var(--gradh);border-radius:2px;transition:width .4s cubic-bezier(.4,0,.2,1)}
    .be-prog-labels{display:flex;justify-content:space-between;align-items:center}
    .be-prog-label{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--muted);font-weight:600}
    .be-q-prompt{font-family:'Montserrat',sans-serif;font-weight:700;font-size:18px;color:#fff;line-height:1.5;margin-bottom:28px}
    .be-opt{display:flex;align-items:center;gap:14px;width:100%;background:rgba(255,255,255,.04);border:1.5px solid rgba(255,255,255,.1);border-radius:14px;padding:16px 20px;cursor:pointer;text-align:left;color:#fff;font-size:14px;font-family:'Inter',sans-serif;transition:all .15s;margin-bottom:10px}
    .be-opt:hover:not(:disabled){background:rgba(255,255,255,.08);border-color:rgba(255,45,120,.4);transform:translateX(4px)}
    .be-opt.correct{background:rgba(34,197,94,.1)!important;border-color:rgba(34,197,94,.5)!important}
    .be-opt.wrong{background:rgba(239,68,68,.08)!important;border-color:rgba(239,68,68,.4)!important}
    .be-opt.dim{opacity:.4}
    .be-opt.selected{background:rgba(99,102,241,.12)!important;border-color:rgba(99,102,241,.5)!important}
    .be-opt.selected .be-opt-letter{border-color:rgba(99,102,241,.6);color:#a5b4fc;background:rgba(99,102,241,.15)}
    .be-opt-letter{display:flex;width:32px;height:32px;flex-shrink:0;align-items:center;justify-content:center;border-radius:50%;border:1.5px solid rgba(255,255,255,.2);font-family:'JetBrains Mono',monospace;font-weight:700;font-size:11px;color:rgba(255,255,255,.5);transition:all .15s}
    .be-opt.correct .be-opt-letter{border-color:rgba(34,197,94,.6);color:#4ade80;background:rgba(34,197,94,.15)}
    .be-opt.wrong .be-opt-letter{border-color:rgba(239,68,68,.5);color:#f87171;background:rgba(239,68,68,.12)}
    .be-feedback{display:none;border-radius:12px;padding:14px 18px;margin-top:18px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:10px}
    .be-next-btn{width:100%;margin-top:24px;background:var(--grad);color:#fff;border:none;border-radius:12px;padding:15px;font-size:15px;font-weight:700;cursor:pointer;font-family:'Montserrat',sans-serif;letter-spacing:.02em;box-shadow:0 4px 20px rgba(255,45,120,.3);transition:opacity .15s}
    .be-next-btn:hover{opacity:.88}
    .be-back-btn{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:8px 16px;color:var(--muted);font-size:12px;cursor:pointer;font-family:'JetBrains Mono',monospace;transition:all .15s}
    .be-back-btn:hover{border-color:rgba(255,45,120,.35);color:#fff}
    .be-hint-btn{margin-left:auto;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:5px 14px;font-size:11px;color:var(--muted);cursor:pointer;font-family:'JetBrains Mono',monospace;transition:all .15s}
    .be-hint-btn:hover{border-color:rgba(255,45,120,.4);color:var(--g3)}
    .be-hint-box{display:none;margin-bottom:18px;border-radius:10px;background:rgba(255,122,69,.08);border:1px solid rgba(255,122,69,.25);padding:12px 16px;font-size:12px;color:var(--g3);line-height:1.5}
  </style>
  <div id="main-content" class="be-quiz-wrap">
    <div class="be-quiz-topbar">
      <button class="be-back-btn" onclick="navigate('lesson',{id:'${lessonId}'})">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
        Back to Lesson
      </button>
      <div style="flex:1;text-align:center;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--muted)">Day ${lesson.order} · ${getLessonTitle(lesson)}</div>
    </div>
    <div class="be-quiz-body">
      <div class="be-quiz-card">
        <div class="be-quiz-header">
          <div class="be-quiz-meta">Class Quiz</div>
          <div class="be-quiz-title">Test Your Knowledge</div>
          <div class="be-prog-track"><div id="progress-fill" class="be-prog-fill" style="width:0%"></div></div>
          <div class="be-prog-labels">
            <span id="q-counter" class="be-prog-label"></span>
            <span id="q-score" class="be-prog-label"></span>
          </div>
        </div>
        <div id="question-slot"></div>
      </div>
    </div>
  </div>`;

  function updateProgress(){
    document.getElementById("q-counter").textContent="Question "+(current+1)+" of "+total;
    document.getElementById("q-score").textContent=current>0?correct+" correct":"";
    document.getElementById("progress-fill").style.width=((current/total)*100)+"%";
  }

  function showQuestion(idx){
    answered=false;
    const q=QUESTIONS[idx];
    const hasHint=!!q.hint;
    document.getElementById("question-slot").innerHTML=
      (hasHint?'<button class="be-hint-btn" onclick="var hb=document.getElementById(\'hbox\');hb.style.display=hb.style.display===\'none\'?\'block\':\'none\'">Hint 💡</button><div id="hbox" class="be-hint-box">'+q.hint+'</div>':'')
      +'<div class="be-q-prompt">'+q.prompt+'</div>'
      +'<div id="options-list">'
      +q.options.map((opt,oi)=>'<button id="opt-'+oi+'" class="be-opt" onclick="pickAnswer('+oi+')">'
        +'<span class="be-opt-letter">'+String.fromCharCode(65+oi)+'</span>'
        +'<span>'+opt+'</span>'
        +'</button>').join("")
      +'</div>'
      +'<div id="feedback-box" style="display:none"></div>'
      +'<div id="next-wrap" style="display:none"><button class="be-next-btn" onclick="nextQuestion()">'+(idx<total-1?"Next Question →":"See Results")+'</button></div>';
    updateProgress();

    // SECURITY: q.answer is stripped from QUIZ_BANK — answers graded server-side only.
    // Collect student responses; submit all at end via submit-quiz Edge Function.
    window.pickAnswer=(oi)=>{
      if(answered)return;answered=true;
      // Record response (questionId = q.id if available, else positional index)
      var qid=q.id||String(idx);
      userResponses[qid]=oi;
      // Disable all buttons and mark selected (no correct/incorrect reveal — server grades)
      q.options.forEach((_,i)=>{
        const btn=document.getElementById("opt-"+i);btn.disabled=true;
        if(i===oi) btn.classList.add("selected");
        else btn.classList.add("dim");
      });
      const fb=document.getElementById("feedback-box");
      fb.style.cssText="display:flex;align-items:center;gap:10px;border-radius:12px;padding:14px 18px;margin-top:18px;font-size:13px;font-weight:600;background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.2);color:#a5b4fc";
      fb.innerHTML='<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg><span>Answer recorded. Results shown at the end.</span>';
      document.getElementById("next-wrap").style.display="block";
    };
  }

  window.nextQuestion=()=>{
    current++;
    if(current<total){showQuestion(current);document.querySelector(".be-quiz-body").scrollTo(0,0);}
    else showResults();
  };

  // Submit all answers server-side and show results
  async function showResults(){
    document.getElementById("progress-fill").style.width="100%";
    document.getElementById("q-counter").textContent="Grading…";
    document.getElementById("q-score").textContent="";
    document.getElementById("question-slot").innerHTML=
      '<div style="text-align:center;padding:40px 0">'
      +'<div style="font-size:14px;color:var(--muted)">Submitting answers…</div>'
      +'</div>';

    var lessonOrder=0;
    var _lesson=ALL_LESSONS.find(l=>l.id===lessonId);
    if(_lesson) lessonOrder=_lesson.order||0;

    var serverResult=null;
    try{
      var sess=null;
      if(typeof _sb!=='undefined'){
        var r=await _sb.auth.getSession();
        sess=r?.data?.session;
      }
      if(sess){
        var resp=await fetch(SUPABASE_URL.replace(/\/$/,'')+'/functions/v1/submit-quiz',{
          method:'POST',
          headers:{'Content-Type':'application/json','Authorization':'Bearer '+sess.access_token},
          body:JSON.stringify({lessonOrder:lessonOrder,responses:userResponses})
        });
        if(resp.ok) serverResult=await resp.json();
      }
    }catch(e){console.warn('submit-quiz error:',e);}

    // Fallback: if Edge Function unavailable, count how many answers match local total
    var serverAvailable=serverResult&&!serverResult.legacy;
    var finalCorrect=serverAvailable?Math.round((serverResult.score/100)*serverResult.total):0;
    var finalTotal=serverAvailable?serverResult.total:total;
    var finalScore=serverAvailable?serverResult.score:0;
    var passed=serverAvailable?serverResult.passed:false;

    // Update local progress
    if(currentSession?.studentId&&_lesson){
      saveAttemptedQuiz(currentSession.studentId, _lesson.order);
      if(passed) savePassedQuiz(currentSession.studentId, _lesson.order);
      if(typeof sbSaveQuizScore==='function'&&serverAvailable){
        sbSaveQuizScore(currentSession.studentId,_lesson.id,finalCorrect,finalTotal).catch(function(){});
      }
    }

    document.getElementById("q-counter").textContent="Complete";
    document.getElementById("q-score").textContent=serverAvailable?(finalCorrect+"/"+finalTotal+" correct"):"";
    var col=passed?"#4ade80":"var(--g1)";
    var borderCol=passed?"rgba(34,197,94,.4)":"rgba(255,45,120,.4)";
    var bgCol=passed?"rgba(34,197,94,.08)":"rgba(255,45,120,.08)";
    document.getElementById("question-slot").innerHTML=
      '<div style="text-align:center;padding:16px 0 40px">'
      +'<div style="width:100px;height:100px;border-radius:50%;margin:0 auto 24px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:'+bgCol+';border:2px solid '+borderCol+';box-shadow:0 0 40px '+borderCol+'">'
        +'<span style="font-family:JetBrains Mono,monospace;font-weight:800;font-size:26px;color:'+col+'">'+(serverAvailable?finalScore+'%':'✓')+'</span>'
        +'<span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:'+col+';opacity:.7">'+(serverAvailable?(passed?"Passed":"Failed"):"Submitted")+'</span>'
      +'</div>'
      +'<h2 style="font-family:Montserrat,sans-serif;font-weight:800;font-size:26px;color:#fff;margin-bottom:6px">'+(serverAvailable?(passed?"Great job! 🎉":"Keep practicing"):"Quiz Submitted")+'</h2>'
      +'<p style="color:var(--muted);font-size:13px;margin-bottom:36px">'+(serverAvailable?(finalCorrect+' of '+finalTotal+' correct — pass mark 70%'):"Your answers have been recorded.")+'</p>'
      +(serverAvailable?
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:32px">'
          +'<div style="border-radius:14px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);padding:20px;text-align:center">'
            +'<div style="font-family:JetBrains Mono,monospace;font-weight:800;font-size:28px;color:#4ade80">'+finalCorrect+'</div>'
            +'<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-top:4px">Correct</div>'
          +'</div>'
          +'<div style="border-radius:14px;background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.2);padding:20px;text-align:center">'
            +'<div style="font-family:JetBrains Mono,monospace;font-weight:800;font-size:28px;color:#f87171">'+(finalTotal-finalCorrect)+'</div>'
            +'<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-top:4px">Wrong</div>'
          +'</div>'
        +'</div>'
      :'')
      +'<div style="display:flex;flex-direction:column;gap:10px">'
        +(!passed&&serverAvailable?'<button id="retake-btn" class="be-next-btn">Retake Quiz</button>':'')
        +'<button id="dash-btn" style="background:none;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:13px;font-size:13px;color:var(--muted);cursor:pointer;font-family:Inter,sans-serif;transition:all .15s" onmouseover="this.style.borderColor=\'rgba(255,45,120,.3)\';this.style.color=\'#fff\'" onmouseout="this.style.borderColor=\'rgba(255,255,255,.1)\';this.style.color=\'var(--muted)\'">Back to Dashboard</button>'
      +'</div></div>';
    var rb=document.getElementById("retake-btn");
    if(rb) rb.addEventListener("click",function(){navigate("quiz",{lessonId:lessonId});});
    var db=document.getElementById("dash-btn");
    if(db) db.addEventListener("click",function(){navigate("dashboard");});
  }

  showQuestion(0);
}
