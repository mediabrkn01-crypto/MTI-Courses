/* quizzes.js — extracted verbatim from the original single-file index.html.
   Source lines: 848-875, 959-971, 1811-1813, 2517-2540, 6982-7073
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
// Admin quiz writes go through admin_save_quiz (DB function, admin only). It validates every
// question (text, ≥2 unique options, exactly one correct option) and writes the private answer
// key (quiz_answers) plus the public display copy without answers, in one transaction.
// Throws with the validation message so the editor can show it — nothing is saved on error.
async function sbSaveQuiz(lessonOrder, questions){
  var clean=(questions||[]).map(function(q,i){
    return {id:String(q.id||('q'+(i+1))),prompt:String(q.prompt||'').trim(),options:(q.options||[]).map(function(o){return String(o).trim();}),answer:String(q.answer==null?'':q.answer).trim(),hint:q.hint||undefined};
  });
  const{error}=await _sb.rpc('admin_save_quiz',{p_lesson:lessonOrder,p_questions:clean});
  if(error) throw new Error(error.message||'Could not save the quiz');
  _dynamicQuizCache[lessonOrder]=clean.map(function(q){return {id:q.id,prompt:q.prompt,options:q.options};});
}
// Admin only: the quiz students currently get for a day, WITH its answer key.
async function sbLoadQuizKey(lessonOrder){
  const{data,error}=await _sb.rpc('admin_get_quiz_key',{p_lesson:lessonOrder});
  if(error) throw new Error(error.message||'Could not load the answer key');
  return data||{source:'builtin',questions:[]};
}

async function sbLoadAllDynamicQuizzes(){
  try{
    const{data,error}=await _sb.from('course_config').select('id,data').like('id','quiz_%');
    if(error||!data) return;
    data.forEach(function(r){
      var order=parseInt((r.id||'').replace('quiz_',''));
      if(!isNaN(order)&&r.data) _dynamicQuizCache[order]=r.data;
    });
    console.log('Dynamic quizzes loaded:',Object.keys(_dynamicQuizCache).length);
  }catch(e){console.warn('Dynamic quiz load error:',e);}
}

async function sbDeleteQuiz(lessonOrder){
  const{error}=await _sb.rpc('admin_delete_quiz',{p_lesson:lessonOrder});
  if(error) throw new Error(error.message||'Could not delete the quiz');
  delete _dynamicQuizCache[lessonOrder];
}

async function sbSaveQuizScore(studentId, lessonId, score, total){
  try{
    const{error}=await _sb.from('quiz_scores').upsert({
      student_id: studentId,
      lesson_id: lessonId,
      score: score,
      total: total,
      pct: Math.round(score/total*100),
      submitted_at: new Date().toISOString()
    }, {onConflict:'student_id,lesson_id'});
    if(error) console.warn('Supabase quiz save error:', error.message);
  }catch(e){console.warn('Supabase error:', e);}
}
function getQuiz(l){return _dynamicQuizCache[l.dayNumber]||QUIZ_BANK[l.dayNumber]||PLACEHOLDER_QUIZ;}
function hasRealQuiz(l){return!!(_dynamicQuizCache[l.dayNumber]||QUIZ_BANK[l.dayNumber]);}

function getLockedQuizzes(sid){try{return JSON.parse(localStorage.getItem("brokeneng_quizlock_"+sid)||"[]");}catch{return[];}}
function getPassedQuizzes(sid){if(_quizPassedCache[sid])return _quizPassedCache[sid];try{return new Set(JSON.parse(localStorage.getItem("brokeneng_quizpassed_"+sid)||"[]"));}catch{return new Set();}}
function savePassedQuiz(sid,order){var p=getPassedQuizzes(sid);p.add(order);_quizPassedCache[sid]=p;try{localStorage.setItem("brokeneng_quizpassed_"+sid,JSON.stringify([...p]));}catch(e){}}
function hasPassedQuiz(lessonOrder){
  if(!currentSession?.studentId) return false;
  return getPassedQuizzes(currentSession.studentId).has(lessonOrder);
}
function getAttemptedQuizzes(sid){if(_quizAttemptedCache[sid])return _quizAttemptedCache[sid];try{return new Set(JSON.parse(localStorage.getItem("brokeneng_quizattempt_"+sid)||"[]"));}catch{return new Set();}}
function saveAttemptedQuiz(sid,order){var a=getAttemptedQuizzes(sid);a.add(order);_quizAttemptedCache[sid]=a;try{localStorage.setItem("brokeneng_quizattempt_"+sid,JSON.stringify([...a]));}catch(e){}}
function hasAttemptedQuiz(lessonOrder){
  if(!currentSession?.studentId) return false;
  return getAttemptedQuizzes(currentSession.studentId).has(lessonOrder);
}
function saveLockedQuizzes(sid,arr){localStorage.setItem("brokeneng_quizlock_"+sid,JSON.stringify(arr));}
function isQuizAccessible(lesson){
  if(!hasRealQuiz(lesson))return false;
  if(!isCompleted(lesson.id))return false; 
  if(currentSession?.role==="student"){
    const locked=getLockedQuizzes(currentSession.studentId);
    if(locked.includes(lesson.order))return false;
  }
  return true;
}

// ── LOCAL QUIZ TEXT PARSER ────────────────────────────────────────────────────
// Format: numbered questions, A) B) C) D) options, ANSWER KEY section at end
// e.g. "1. B 2. B 3. C ..." all on one line or separate lines
function parseQuizFromText(text){
  // Strip markdown bold markers from mammoth output
  text=text.replace(/\*\*/g,'').replace(/\*/g,'');

  var lines=text.split('\n').map(function(l){return l.trim();}).filter(Boolean);

  // ── Step 1: extract answer key ──
  var answerKey={};
  var ansKeyLineIdx=-1;
  for(var i=0;i<lines.length;i++){
    if(/ANSWER KEY/i.test(lines[i])){ ansKeyLineIdx=i; break; }
  }
  if(ansKeyLineIdx>=0){
    // Everything after ANSWER KEY line — may be one line "1. B 2. B 3. C 4. C 5. B 6. A 7. B"
    var ansBlock=lines.slice(ansKeyLineIdx+1).join(' ');
    var ansMatches=ansBlock.match(/(\d+)\.\s*([A-D])/g)||[];
    ansMatches.forEach(function(m){
      var p=m.match(/(\d+)\.\s*([A-D])/);
      if(p) answerKey[parseInt(p[1])]=p[2];
    });
    lines=lines.slice(0,ansKeyLineIdx); // remove answer key section
  }

  // ── Step 2: parse questions and options ──
  var questions=[];
  var current=null;

  lines.forEach(function(line){
    // Question: starts with digit + dot, not followed by A-D) pattern
    var qMatch=line.match(/^(\d+)\.\s+(.+)/);
    if(qMatch&&!/^\d+\.\s*[A-D][).]/.test(line)){
      if(current) questions.push(current);
      current={id:'',prompt:qMatch[2].trim(),options:[],answer:''};
      return;
    }
    // Option: A) text  or  A. text
    var optMatch=line.match(/^([A-D])[).\s]\s*(.+)/);
    if(optMatch&&current){
      current.options.push(optMatch[2].trim());
      return;
    }
    // Skip non-matching lines (title, subtitle etc)
  });
  if(current&&current.options.length>=2) questions.push(current);

  // ── Step 3: apply answer key to set correct answer string ──
  questions.forEach(function(q,i){
    var num=i+1;
    q.id='q'+num;
    var letter=answerKey[num];
    var idx=letter?{A:0,B:1,C:2,D:3}[letter]:-1;
    q.answer=(idx>=0&&q.options[idx])?q.options[idx]:(q.options[0]||'');
  });

  return questions;
}

function parseQuizFromJSON(text){
  try{
    var data=JSON.parse(text);
    var arr=Array.isArray(data)?data:(data.questions||data.quiz||[]);
    if(!arr.length) throw new Error('No questions found in JSON');
    return arr.map(function(q,i){
      var prompt=(q.prompt||q.question||q.text||'').replace(/^\d+\.\s*/,'').trim();
      // options can be array OR object {"A":"...","B":"..."}
      var optionsRaw=q.options||q.choices||q.answers||[];
      var optionsArr;
      var letterMap={};
      if(Array.isArray(optionsRaw)){
        optionsArr=optionsRaw;
      } else {
        // object format: {A:"...", B:"...", C:"...", D:"..."}
        optionsArr=['A','B','C','D'].filter(function(k){return optionsRaw[k]!=null;}).map(function(k){
          letterMap[k]=optionsRaw[k]; return optionsRaw[k];
        });
      }
      // answer can be letter "B" or full text
      var rawAnswer=q.answer||q.correct||q.correctAnswer||q.correct_answer||'';
      var answer=rawAnswer;
      if(rawAnswer.length===1&&letterMap[rawAnswer]){
        answer=letterMap[rawAnswer]; // map "B" → full option text
      } else if(rawAnswer.length===1&&optionsArr[{A:0,B:1,C:2,D:3}[rawAnswer]]!=null){
        answer=optionsArr[{A:0,B:1,C:2,D:3}[rawAnswer]];
      }
      return {id:q.id||('q'+(i+1)),prompt:prompt,options:optionsArr,answer:answer};
    }).filter(function(q){return q.prompt&&q.options.length>=2;});
  }catch(e){ throw new Error('Invalid JSON: '+e.message); }
}

// ── Learner quiz engine (every MTI quiz uses this) ──────────────────────────────
// One request per action, straight to Postgres (quiz_start / quiz_answer / quiz_finish
// RPCs — 20261020_quiz_fast_rpc.sql). The learner payload never contains the answer key;
// a question's correct option comes back only after that question is answered.
// prefetch(order) is called from the lesson page so the quiz opens from memory.
// Falls back to the `quiz` Edge Function if the RPCs are not installed yet.
var QuizEngine=(function(){
  var MAX_AGE=10*60*1000, TIMEOUT=12000;
  var cache={};          // lessonOrder -> {p: Promise(startPayload), at: ms}
  var useEdge=false;
  var MSG={unauthorized:'Your session has expired. Please sign in again.',session_expired:'Your session has expired. Please sign in again.',
    no_student:'This account is not linked to a student profile.',attempt_finished:'This quiz attempt is already finished.',
    attempt_not_found:'This quiz attempt could not be found.',server_error:'Something went wrong on our side. Please try again.'};
  function friendly(code){ code=String(code||''); if(/jwt/i.test(code)) return MSG.unauthorized; return MSG[code]||code; }
  function perfOn(){ try{ return location.hostname==='localhost'||localStorage.getItem('be_quiz_perf')==='1'; }catch(e){ return false; } }
  function perf(label,ms){
    if(!perfOn()) return;
    (window.__quizPerf=window.__quizPerf||[]).push({label:label,ms:Math.round(ms),at:Date.now()});
    console.info('[quiz-perf] '+label+': '+Math.round(ms)+' ms');
  }
  async function edge(payload){
    var r=await _sb.auth.getSession(); var sess=r&&r.data&&r.data.session;
    if(!sess) throw new Error(MSG.unauthorized);
    var ctl=new AbortController(), t=setTimeout(function(){ctl.abort();},TIMEOUT);
    try{
      var resp=await fetch(SUPABASE_URL.replace(/\/$/,'')+'/functions/v1/quiz',{method:'POST',signal:ctl.signal,
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+sess.access_token,'apikey':SUPABASE_KEY},body:JSON.stringify(payload)});
      var data=null; try{ data=await resp.json(); }catch(e){}
      if(!resp.ok) throw new Error(friendly((data&&data.error)||('HTTP '+resp.status)));
      return data;
    }catch(e){ if(e.name==='AbortError') throw new Error('timeout'); throw e; }
    finally{ clearTimeout(t); }
  }
  async function call(fn,args,edgePayload){
    if(!useEdge){
      var ctl=new AbortController(), t=setTimeout(function(){ctl.abort();},TIMEOUT);
      try{
        var res=await _sb.rpc(fn,args).abortSignal(ctl.signal);
        if(!res.error) return res.data;
        var m=res.error.message||'';
        if(res.error.code==='PGRST202'||/could not find the function/i.test(m)) useEdge=true;
        else if(/abort/i.test(m)||res.error.name==='AbortError') throw new Error('timeout');
        else throw new Error(friendly(m));
      }finally{ clearTimeout(t); }
    }
    return edge(edgePayload);
  }
  function start(order){
    var t0=performance.now();
    return call('quiz_start',{p_lesson:order},{action:'start',lessonOrder:order})
      .then(function(d){ perf('start request (lesson '+order+')',performance.now()-t0); return d; });
  }
  // Background load of one lesson's quiz (questions + this student's attempt state).
  function prefetch(order){
    if(!order||typeof _sb==="undefined"||currentSession?.role!=="student") return null;
    var c=cache[order];
    if(c&&Date.now()-c.at<MAX_AGE) return c.p;
    var p=start(order); cache[order]={p:p,at:Date.now()};
    p.catch(function(){ if(cache[order]&&cache[order].p===p) delete cache[order]; });
    return p;
  }
  // Quiz screen: use the prefetched payload (or start now). Consumed once so the next
  // visit reloads the attempt state from the server.
  function take(order){
    var c=cache[order], p=(c&&Date.now()-c.at<MAX_AGE)?c.p:start(order);
    delete cache[order];
    return p;
  }
  function answer(attemptId,q,oi){
    var t0=performance.now();
    return call('quiz_answer',{p_attempt:attemptId,p_question:q.id,p_option_index:oi,p_option_text:q.options[oi]},
      {action:'answer',attemptId:attemptId,questionId:q.id,optionIndex:oi,optionText:q.options[oi]})
      .then(function(d){ perf('answer request',performance.now()-t0); return d; });
  }
  function finish(attemptId){ return call('quiz_finish',{p_attempt:attemptId},{action:'finish',attemptId:attemptId}); }
  function invalidate(order){ delete cache[order]; }
  return {prefetch:prefetch,take:take,answer:answer,finish:finish,invalidate:invalidate,perf:perf};
})();
