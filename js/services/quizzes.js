/* quizzes.js — extracted verbatim from the original single-file index.html.
   Source lines: 848-875, 959-971, 1811-1813, 2517-2540, 6982-7073
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
async function sbSaveQuiz(lessonOrder, questions){
  try{
    var key='quiz_'+lessonOrder;
    const{error}=await _sb.from('course_config').upsert({id:key,data:questions},{onConflict:'id'});
    if(error) console.warn('Quiz save error:',error.message);
    else{ _dynamicQuizCache[lessonOrder]=questions; console.log('Quiz saved for Day',lessonOrder); }
  }catch(e){console.warn('Quiz save error:',e);}
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
  try{
    await _sb.from('course_config').delete().eq('id','quiz_'+lessonOrder);
    delete _dynamicQuizCache[lessonOrder];
  }catch(e){}
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
