/* progress.js — extracted verbatim from the original single-file index.html.
   Source lines: 3014-3281
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
// ── PROGRESS TAB ─────────────────────────────────────────────────────────────
function renderAdminProgress(){
  const students = loadStudents();
  // Deduplicate by email — keep the record with the most progress (highest ID = most recent import)
  var _seenEmail={};
  const list = Object.values(students).filter(function(s){
    var key=(s.email||s.id).toLowerCase().trim();
    if(_seenEmail[key]) return false;
    _seenEmail[key]=true; return true;
  });
  const TOTAL_LESSONS = ALL_LESSONS.length + (typeof WV_DATA!=='undefined'?WV_DATA.length:0); // 20 core + 10 WV = 30

  app.innerHTML = adminTopBar('progress') + '<div style="padding:48px;text-align:center"><p style="color:var(--muted);font-size:14px">Loading progress from server...</p></div>';

  (async function(){
    // Fetch progress from Supabase
    var sbProgress = {};
    var sbQuizPassed = {};
    var sbLastLesson = {};
    try{
      if(typeof _sb !== 'undefined'){
        const [progRes, quizRes] = await Promise.all([
          _sb.from('student_progress').select('student_id,lesson_id'),
          _sb.from('quiz_scores').select('student_id,lesson_id,pct')
        ]);
        if(!progRes.error && progRes.data){
          progRes.data.forEach(function(r){
            if(!sbProgress[r.student_id]) sbProgress[r.student_id] = new Set();
            sbProgress[r.student_id].add(r.lesson_id);
          });
        }
        if(!quizRes.error && quizRes.data){
          quizRes.data.forEach(function(r){
            if(!sbQuizPassed[r.student_id]) sbQuizPassed[r.student_id] = new Set();
            if(r.pct>=70) sbQuizPassed[r.student_id].add(r.lesson_id);
          });
        }
      }
    }catch(e){console.warn('Supabase progress fetch error:',e);}

    // Build email→[ids] map to merge progress across duplicate Supabase records
    var _emailToIds={};
    list.forEach(function(st){
      var email=(st.email||'').toLowerCase().trim();
      if(!_emailToIds[email]) _emailToIds[email]=[];
      _emailToIds[email].push(st.id);
    });
    // Also include all Supabase student_ids that map to the same email
    Object.values(students).forEach(function(st){
      var email=(st.email||'').toLowerCase().trim();
      if(!_emailToIds[email]) _emailToIds[email]=[];
      if(_emailToIds[email].indexOf(st.id)<0) _emailToIds[email].push(st.id);
    });

    function getMergedIds(sid){
      var st=students[sid]; if(!st) return [sid];
      var email=(st.email||'').toLowerCase().trim();
      return _emailToIds[email]||[sid];
    }
    function getStudentProgress(sid){
      var merged=new Set();
      getMergedIds(sid).forEach(function(id){
        var sb=sbProgress[id]||new Set();
        sb.forEach(function(x){merged.add(x);});
        loadProgress(id).forEach(function(x){merged.add(x);});
      });
      return merged;
    }
    function getStudentQuizPassed(sid){
      var merged=new Set();
      getMergedIds(sid).forEach(function(id){
        var sb=sbQuizPassed[id]||new Set();
        sb.forEach(function(x){merged.add(x);});
        getPassedQuizzes(id).forEach(function(x){merged.add(x);});
      });
      return merged;
    }
    function getLastLesson(sid, progress){
      // Find highest completed lesson order
      var maxOrder = 0; var lastL = null;
      ALL_LESSONS.forEach(function(l){
        if(progress.has(l.id) && l.order > maxOrder){ maxOrder=l.order; lastL=l; }
      });
      return lastL;
    }

    function progressRow(st){
      const progress = getStudentProgress(st.id);
      const completed = progress.size;
      const pct = TOTAL_LESSONS ? Math.min(100,Math.round(completed/TOTAL_LESSONS*100)) : 0;
      const passed = getStudentQuizPassed(st.id);
      const quizTotal = ALL_LESSONS.filter(l=>hasRealQuiz(l)).length;
      const lastLesson = getLastLesson(st.id, progress);
      const barColor = pct===100?'#4ade80':pct>50?'#a78bfa':'var(--g3)';
      return `<tr onclick="navigate('admin-progress-student',{id:'${st.id}'})" style="cursor:pointer">
        <td>
          <p style="font-weight:600;color:#fff;margin:0">${st.name}</p>
          <p style="font-size:11px;color:rgba(255,255,255,.4);margin:2px 0 0">${st.email}</p>
        </td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="flex:1;height:6px;background:rgba(255,255,255,.1);border-radius:99px;overflow:hidden;min-width:80px">
              <div style="height:100%;width:${pct}%;background:${barColor};border-radius:99px;transition:width .4s"></div>
            </div>
            <span style="font-size:12px;font-weight:700;color:${barColor};min-width:34px;text-align:right">${pct}%</span>
          </div>
          <p style="font-size:11px;color:rgba(255,255,255,.35);margin:3px 0 0">${completed}/${TOTAL_LESSONS} lessons</p>
        </td>
        <td class="center"><span class="pill pill-orange">${passed.size}/${quizTotal}</span></td>
        <td style="font-size:12px;color:rgba(255,255,255,.5)">${lastLesson ? `<span style="color:#fff;font-weight:600">Day ${lastLesson.order}</span><br><span style="font-size:11px">${getLessonTitle(lastLesson)||''}</span>` : '<span style="color:rgba(255,255,255,.25)">—</span>'}</td>
      </tr>`;
    }

    var sortedList = list.slice();

    function applyFilters(){
      var q = (document.getElementById('prog-search')||{}).value||'';
      var sort = (document.getElementById('prog-sort')||{}).value||'newest';
      q = q.trim().toLowerCase();
      var filtered = q ? sortedList.filter(function(st){
        return (st.name||'').toLowerCase().includes(q)||(st.email||'').toLowerCase().includes(q);
      }) : sortedList.slice();
      if(sort==='az') filtered.sort(function(a,b){return (a.name||'').localeCompare(b.name||'');});
      else if(sort==='za') filtered.sort(function(a,b){return (b.name||'').localeCompare(a.name||'');});
      else if(sort==='oldest') filtered.sort(function(a,b){return (a.createdAt||'').localeCompare(b.createdAt||'');});
      else filtered.sort(function(a,b){return (b.createdAt||'').localeCompare(a.createdAt||'');});
      var tbody = document.getElementById('prog-tbody');
      if(tbody) tbody.innerHTML = filtered.map(progressRow).join('');
    }

    app.innerHTML = adminTopBar('progress') + `
    <div style="padding:24px;position:relative;z-index:1">
      <div style="margin-bottom:16px">
        <h1 style="font-size:22px;font-weight:800;color:#fff;margin-bottom:2px;font-family:'Montserrat',sans-serif">Student Progress</h1>
        <p style="font-size:13px;color:var(--muted)">${list.length} students · ${TOTAL_LESSONS} total lessons</p>
      </div>
      <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
        <input id="prog-search" placeholder="Search by name or email..." oninput="applyFilters()" style="flex:1;min-width:200px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);border-radius:10px;color:#fff;font-size:13px;padding:10px 14px;outline:none"/>
        <select id="prog-sort" onchange="applyFilters()" style="background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);border-radius:10px;color:#fff;font-size:13px;padding:10px 14px;outline:none;cursor:pointer">
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="az">A → Z</option>
          <option value="za">Z → A</option>
        </select>
      </div>
      ${list.length===0
        ? `<div class="lg" style="padding:48px;text-align:center"><p style="color:var(--muted);font-size:15px">No students yet</p></div>`
        : `<div class="lg admin-table-wrap" style="overflow:hidden;border-radius:20px">
            <table class="admin-table" style="min-width:620px">
              <thead><tr>
                <th>Student</th>
                <th>Overall Progress</th>
                <th class="center">Quizzes Passed</th>
                <th>Currently On</th>
              </tr></thead>
              <tbody id="prog-tbody">${sortedList.map(progressRow).join('')}</tbody>
            </table>
          </div>`}
    </div>`;

    window.applyFilters = applyFilters;
    applyFilters();
  })();
}

// ── PER-STUDENT PROGRESS DETAIL ──────────────────────────────────────────────
function renderAdminProgressStudent(id){
  const students = loadStudents();
  const st = students[id];
  if(!st){ navigate('admin',{tab:'progress'}); return; }

  const progress = loadProgress(st.id);
  const passed = getPassedQuizzes(st.id);
  const attempted = getAttemptedQuizzes(st.id);
  const lastId = localStorage.getItem('brokeneng_lastlesson_'+st.id);
  const total = ALL_LESSONS.length;
  const completed = progress.size;
  const pct = total ? Math.round(completed/total*100) : 0;
  const quizTotal = ALL_LESSONS.filter(l=>hasRealQuiz(l)).length;
  const barColor = pct===100?'#4ade80':pct>50?'#a78bfa':'var(--g3)';

  function lessonRow(l){
    const done = progress.has(l.id);
    const isLast = l.id === lastId;
    const hasQ = hasRealQuiz(l);
    const quizPassed = hasQ && passed.has(l.order);
    const quizTried = hasQ && attempted.has(l.order);
    return `<tr>
      <td style="width:40px;text-align:center">
        <div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;margin:auto;
          background:${done?'rgba(74,222,128,.15)':'rgba(255,255,255,.06)'};
          border:1.5px solid ${done?'rgba(74,222,128,.5)':'rgba(255,255,255,.1)'};
          color:${done?'#4ade80':'rgba(255,255,255,.3)'}">
          ${done?'✓':l.order}
        </div>
      </td>
      <td>
        <span style="font-size:13px;font-weight:${done?'600':'400'};color:${done?'#fff':'rgba(255,255,255,.4)'}">${getLessonTitle(l)||'Day '+l.order}</span>
        ${isLast?'<span style="margin-left:6px;font-size:10px;padding:2px 7px;border-radius:99px;background:rgba(255,45,120,.15);border:1px solid rgba(255,45,120,.3);color:var(--g3);font-weight:700">CURRENT</span>':''}
      </td>
      <td class="center">
        ${hasQ
          ? quizPassed
            ? '<span class="pill pill-green" style="font-size:10px">Passed</span>'
            : quizTried
              ? '<span class="pill pill-red" style="font-size:10px">Attempted</span>'
              : '<span style="font-size:11px;color:rgba(255,255,255,.25)">—</span>'
          : '<span style="font-size:11px;color:rgba(255,255,255,.15)">—</span>'}
      </td>
      <td class="center">
        ${done
          ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
          : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'}
      </td>
    </tr>`;
  }

  app.innerHTML = adminTopBar('progress') + `
  <div style="padding:24px;position:relative;z-index:1;max-width:800px">
    <button onclick="navigate('admin',{tab:'progress'})" style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--muted);background:none;border:none;cursor:pointer;margin-bottom:20px;transition:color .18s" onmouseover="this.style.color='var(--g3)'" onmouseout="this.style.color='var(--muted)'">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      Back to Progress
    </button>

    <div style="display:flex;align-items:center;gap:14px;margin-bottom:24px">
      ${avatarSmallHtml(st)}
      <div>
        <h1 style="font-size:20px;font-weight:800;color:#fff;margin:0;font-family:'Montserrat',sans-serif">${st.name}</h1>
        <p style="font-size:12px;color:var(--muted);margin:3px 0 0">${st.email}</p>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:24px">
      ${[
        ['📚','Lessons Done',completed+'/'+total],
        ['📊','Progress',pct+'%'],
        ['📝','Quizzes Passed',passed.size+'/'+quizTotal],
      ].map(([icon,label,val])=>`
        <div class="lg" style="padding:16px;text-align:center">
          <div style="font-size:20px;margin-bottom:4px">${icon}</div>
          <div style="font-size:20px;font-weight:800;color:#fff;font-family:'Montserrat',sans-serif">${val}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">${label}</div>
        </div>`).join('')}
    </div>

    <div style="margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-bottom:6px">
        <span>Overall Progress</span><span style="color:${barColor};font-weight:700">${pct}%</span>
      </div>
      <div style="height:8px;background:rgba(255,255,255,.08);border-radius:99px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${barColor};border-radius:99px"></div>
      </div>
    </div>

    <div class="lg admin-table-wrap" style="overflow:hidden;border-radius:20px">
      <table class="admin-table" style="min-width:400px">
        <thead><tr>
          <th style="width:48px"></th>
          <th>Lesson</th>
          <th class="center">Quiz</th>
          <th class="center">Done</th>
        </tr></thead>
        <tbody>${ALL_LESSONS.map(lessonRow).join('')}</tbody>
      </table>
    </div>
  </div>`;
}
