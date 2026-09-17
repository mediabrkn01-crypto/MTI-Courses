/* students.js — extracted verbatim from the original single-file index.html.
   Source lines: 641-655, 672-843, 952-958
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
// ── Supabase helpers ──────────────────────────────────────────────────────────
// Save student progress to Supabase (non-blocking, fires and forgets)
async function sbSaveProgress(studentId, lessonId){
  // Demo progress is temporary/local only — never write it to permanent records.
  if(studentId==='__demo__'||isDemoSession())return;
  try{
    const{error}=await _sb.from('student_progress').upsert({
      student_id: studentId,
      lesson_id: lessonId,
      completed_at: new Date().toISOString()
    }, {onConflict:'student_id,lesson_id'});
    if(error) console.warn('Supabase progress save error:', error.message);
  }catch(e){console.warn('Supabase error:', e);}
}

async function sbLoadAllStudents(){
  try{
    if(typeof _sb==='undefined')return false;
    // SECURITY: never select password_hash — students table RLS restricts reads anyway
    const{data,error}=await _sb.from('students').select('id,name,email,valid_until,access_list,created_at,completed_at');
    if(error||!data)return false;
    var local=loadStudents();
    data.forEach(function(d){
      local[d.id]={
        id:d.id,
        name:d.name,
        email:d.email,
        // password intentionally omitted — never bring credentials to browser
        validUntil:d.valid_until||null,
        accessList:d.access_list||[1],
        createdAt:d.created_at||new Date().toISOString(),
        completedAt:d.completed_at||null
      };
    });
    localStorage.setItem('brokeneng_students',JSON.stringify(local));
    return true;
  }catch(e){console.warn('student list sync:',e);return false;}
}

async function sbSaveStudent(student){
  try{
    // SECURITY: never write password_hash from browser — passwords managed server-side via Supabase Auth
    const{error}=await _sb.from('students').upsert({
      id: student.id,
      name: student.name,
      email: student.email,
      valid_until: student.validUntil||null,
      access_list: student.accessList||[1],
      completed_at: student.completedAt||null,
      created_at: student.createdAt||new Date().toISOString()
    }, {onConflict:'id'});
    if(error) console.warn('Supabase student save error:', error.message);
    else console.log('Student synced to Supabase:', student.name);
  }catch(e){console.warn('Supabase error:', e);}
}

// Delete student from Supabase
async function sbDeleteStudent(studentId){
  try{
    await _sb.from('students').delete().eq('id', studentId);
    await _sb.from('student_progress').delete().eq('student_id', studentId);
  }catch(e){console.warn('Supabase error:', e);}
}

// Load all progress for a student from Supabase (sync to localStorage)
async function sbLoadProgress(studentId){
  try{
    // Find all student IDs sharing the same email (handles duplicate imports)
    var allIds=[studentId];
    try{
      var myEmail=''; var myName='';
      var stu=loadStudents()[studentId];
      if(stu){
        if(stu.email) myEmail=stu.email.toLowerCase().trim();
        if(stu.name) myName=stu.name.toLowerCase().trim();
      } else {
        // Student not in localStorage — fetch from Supabase by ID
        var stuRes=await _sb.from('students').select('email,name').eq('id',studentId).limit(1);
        if(!stuRes.error&&stuRes.data&&stuRes.data.length>0){
          if(stuRes.data[0].email) myEmail=stuRes.data[0].email.toLowerCase().trim();
          if(stuRes.data[0].name) myName=stuRes.data[0].name.toLowerCase().trim();
        }
      }
      // Find duplicate IDs by email (if has email) OR by name (if name-only account)
      if(myEmail){
        var dupRes=await _sb.from('students').select('id').ilike('email',myEmail);
        if(!dupRes.error&&dupRes.data) dupRes.data.forEach(function(r){if(r.id&&allIds.indexOf(r.id)<0) allIds.push(r.id);});
      } else if(myName){
        // Name-only student: find duplicates by name
        var dupResN=await _sb.from('students').select('id').ilike('name',myName);
        if(!dupResN.error&&dupResN.data) dupResN.data.forEach(function(r){if(r.id&&allIds.indexOf(r.id)<0) allIds.push(r.id);});
      }
    }catch(e){}

    console.log('[sbLoadProgress] Querying for IDs:',allIds);
    // Also find all student IDs that have progress linked to ANY of our IDs
    // (catches quiz scores saved under other duplicate IDs)
    var extraIds=[];
    try{
      var extraProg=await _sb.from('student_progress').select('student_id').in('student_id',allIds);
      if(!extraProg.error&&extraProg.data){
        extraProg.data.forEach(function(r){if(r.student_id&&allIds.indexOf(r.student_id)<0)extraIds.push(r.student_id);});
      }
    }catch(e){}
    var queryIds=allIds.concat(extraIds);

    // Fetch progress AND quiz scores for all IDs
    const[progRes,quizRes]=await Promise.all([
      _sb.from('student_progress').select('lesson_id').in('student_id',queryIds),
      _sb.from('quiz_scores').select('lesson_id,pct,student_id').in('student_id',queryIds)
    ]);
    console.log('[sbLoadProgress] Got',progRes.data&&progRes.data.length,'progress rows,',quizRes.data&&quizRes.data.length,'quiz rows for IDs:',queryIds);
    if(progRes.data) console.log('[sbLoadProgress] Progress lesson_ids:',progRes.data.map(function(r){return r.lesson_id;}));
    if(!progRes.error&&progRes.data){
      const ids=progRes.data.map(r=>r.lesson_id);
      // Trust Supabase data — don't filter by validCore (avoids dropping valid lesson IDs)
      const existing=new Set(ids);
      // Also merge any local progress
      try{
        var localRaw=JSON.parse(localStorage.getItem('brokeneng_progress_'+studentId)||'[]');
        localRaw.forEach(function(id){existing.add(id);});
      }catch(e){}
      _progressCache[studentId]=existing;
      try{localStorage.setItem('brokeneng_progress_'+studentId,JSON.stringify([...existing]));}catch(e){}
      console.log('[sbLoadProgress] Parsed lesson IDs into cache:',ids);
    }
    if(!quizRes.error&&quizRes.data){
      var passedKey='brokeneng_passed_quizzes_'+studentId;
      var attempted='brokeneng_attempted_quizzes_'+studentId;
      var existingPassed=new Set(JSON.parse(localStorage.getItem(passedKey)||'[]'));
      var existingAttempted=new Set(JSON.parse(localStorage.getItem(attempted)||'[]'));
      quizRes.data.forEach(function(r){
        // Add both the lesson_id string AND the order number so getUnlockedSet works
        existingAttempted.add(r.lesson_id);
        var lesson=ALL_LESSONS.find(function(l){return l.id===r.lesson_id;});
        if(lesson){
          existingAttempted.add(lesson.order); // order number used by getUnlockedSet
          if(r.pct>=70){
            existingPassed.add(r.lesson_id);
            existingPassed.add(lesson.order);
          }
        }
      });
      _quizPassedCache[studentId]=existingPassed;
      _quizAttemptedCache[studentId]=existingAttempted;
      try{
        localStorage.setItem(passedKey,JSON.stringify([...existingPassed]));
        localStorage.setItem(attempted,JSON.stringify([...existingAttempted]));
      }catch(e){}
    }
    // Restore last watched lesson from Supabase
    try{
      var lastRes=await _sb.from('course_config').select('data').eq('id','lastlesson_'+studentId).limit(1);
      if(!lastRes.error&&lastRes.data&&lastRes.data.length>0&&lastRes.data[0].data&&lastRes.data[0].data.lessonId){
        try{localStorage.setItem('brokeneng_lastlesson_'+studentId, lastRes.data[0].data.lessonId);}catch(e){}
      }
    }catch(e){}
    // Load drip unlock state from Supabase into memory
    try{
      var todayStr=new Date().toISOString().slice(0,10);
      // Load drip for ALL matching student IDs (cross-device duplicate handling)
      var dripPromises=allIds.map(function(sid){
        return _sb.from('course_config').select('id,data').like('id','drip_'+sid+'_%');
      });
      var dripResults=await Promise.all(dripPromises);
      if(!_dripCache[studentId]) _dripCache[studentId]={};
      dripResults.forEach(function(dripRes,ri){
        var sid=allIds[ri];
        if(!dripRes.error&&dripRes.data){
          dripRes.data.forEach(function(r){
            var date=r.id.replace('drip_'+sid+'_','');
            // Merge into primary studentId cache
            if(!_dripCache[studentId][date]) _dripCache[studentId][date]=new Set();
            (r.data||[]).forEach(function(o){_dripCache[studentId][date].add(o);});
            try{localStorage.setItem('brokeneng_drip_'+studentId+'_'+date,JSON.stringify([..._dripCache[studentId][date]]));}catch(e){}
          });
        }
      });
    }catch(e){}
    // Guarantee cache entries exist for this studentId (prevents undefined reads)
    if(!_progressCache[studentId]) _progressCache[studentId]=new Set();
    if(!_quizAttemptedCache[studentId]) _quizAttemptedCache[studentId]=new Set();
    if(!_quizPassedCache[studentId]) _quizPassedCache[studentId]=new Set();
    console.log('[Supabase] Progress loaded for',studentId,'— lessons:',_progressCache[studentId].size,'quizAttempted:',_quizAttemptedCache[studentId].size);
  }catch(e){console.warn('Supabase load error:',e);}
}

async function sbSaveDripUnlock(studentId, dateStr, orders){
  try{
    var key='drip_'+studentId+'_'+dateStr;
    await _sb.from('course_config').upsert({id:key,data:[...orders]},{onConflict:'id'});
  }catch(e){console.warn('Drip save error:',e);}
}
