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

    const quizTotal = ALL_LESSONS.filter(l=>hasRealQuiz(l)).length;
    // Compute once per student — rows and stats both read from this.
    var stats = {};
    list.forEach(function(st){
      var progress = getStudentProgress(st.id);
      var completed = progress.size;
      stats[st.id] = {
        completed: completed,
        pct: TOTAL_LESSONS ? Math.min(100,Math.round(completed/TOTAL_LESSONS*100)) : 0,
        passed: getStudentQuizPassed(st.id).size,
        last: getLastLesson(st.id, progress)
      };
    });
    function stage(st){ var p=stats[st.id].pct; return p===0?'none':p>=100?'done':'going'; }
    var counts={all:list.length,none:0,going:0,done:0}, pctSum=0, quizSum=0;
    list.forEach(function(st){ counts[stage(st)]++; pctSum+=stats[st.id].pct; quizSum+=stats[st.id].passed; });
    var avgPct = list.length ? Math.round(pctSum/list.length) : 0;

    function progressRow(st){
      const s = stats[st.id];
      const quizPct = quizTotal ? Math.round(s.passed/quizTotal*100) : 0;
      return `<tr onclick="navigate('admin-progress-student',{id:'${st.id}'})" style="cursor:pointer">
        <td><div style="display:flex;align-items:center;gap:12px;min-width:0">${stuTableAvatar(st)}
          <div style="min-width:0"><p class="adm-name">${escapeHtml(st.name)}</p><p class="adm-meta">${escapeHtml(st.email)}</p></div></div></td>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="adm-meter${s.pct>=100?' ok':''}"><span style="width:${s.pct}%"></span></div>
            <span class="adm-num" style="min-width:36px;text-align:right;color:${s.pct?'#fff':'var(--muted)'}">${s.pct}%</span>
          </div>
          <p class="adm-meta">${s.completed} of ${TOTAL_LESSONS} lessons</p>
        </td>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="adm-meter${s.passed&&s.passed>=quizTotal?' ok':''}" style="max-width:90px"><span style="width:${quizPct}%"></span></div>
            <span class="adm-num">${s.passed}/${quizTotal}</span>
          </div>
        </td>
        <td>${s.last
          ? `<div style="display:flex;align-items:center;gap:10px;min-width:0"><span class="adm-day">${s.last.order}</span><p class="adm-meta" style="margin:0;color:rgba(255,255,255,.7)">${escapeHtml(getLessonTitle(s.last)||'')}</p></div>`
          : '<span class="adm-badge muted">Not started</span>'}</td>
        <td class="right adm-muted" style="width:40px">${ADM_ICON.chevron}</td>
      </tr>`;
    }

    var sortedList = list.slice();
    window._progStage = window._progStage || 'all';

    function applyFilters(){
      var q = (document.getElementById('prog-search')||{}).value||'';
      var sort = (document.getElementById('prog-sort')||{}).value||'newest';
      var stg = window._progStage;
      q = q.trim().toLowerCase();
      var filtered = sortedList.filter(function(st){
        if(stg!=='all' && stage(st)!==stg) return false;
        return !q||(st.name||'').toLowerCase().includes(q)||(st.email||'').toLowerCase().includes(q);
      });
      if(sort==='az') filtered.sort(function(a,b){return (a.name||'').localeCompare(b.name||'');});
      else if(sort==='za') filtered.sort(function(a,b){return (b.name||'').localeCompare(a.name||'');});
      else if(sort==='progress') filtered.sort(function(a,b){return stats[b.id].pct-stats[a.id].pct;});
      else if(sort==='oldest') filtered.sort(function(a,b){return (a.createdAt||'').localeCompare(b.createdAt||'');});
      else filtered.sort(function(a,b){return (b.createdAt||'').localeCompare(a.createdAt||'');});
      var tbody = document.getElementById('prog-tbody');
      if(tbody) tbody.innerHTML = filtered.length ? filtered.map(progressRow).join('') : '<tr><td colspan="5" class="adm-empty">No students match this filter.</td></tr>';
    }

    app.innerHTML = adminTopBar('progress') + `
    <div class="adm-page">
      ${admHead('Student Progress', list.length+' students · '+TOTAL_LESSONS+' lessons · '+quizTotal+' quizzes')}
      ${admStats([
        ['Average progress', avgPct, '', '%'],
        ['Not started', counts.none, counts.none?'warn':''],
        ['In progress', counts.going, 'info'],
        ['Completed course', counts.done, 'ok'],
        ['Quizzes passed', quizSum]
      ])}
      <div class="adm-toolbar">
        ${admSearch('prog-search','Search by name or email…','applyFilters()')}
        <div class="adm-chips" id="prog-chips">
          ${[['all','All'],['none','Not started'],['going','In progress'],['done','Completed']].map(function(c){
            return '<button class="adm-chip'+(window._progStage===c[0]?' on':'')+'" onclick="window._progStage=\''+c[0]+'\';[].forEach.call(document.querySelectorAll(\'#prog-chips .adm-chip\'),function(b){b.classList.toggle(\'on\',b===this)},this);applyFilters()">'+c[1]+'<span class="n">'+counts[c[0]]+'</span></button>';
          }).join('')}
        </div>
        <select id="prog-sort" onchange="applyFilters()" class="adm-select">
          <option value="newest">Newest first</option>
          <option value="progress">Most progress</option>
          <option value="oldest">Oldest first</option>
          <option value="az">Name A → Z</option>
          <option value="za">Name Z → A</option>
        </select>
      </div>
      ${list.length===0
        ? `<div class="adm-card adm-empty">No students yet</div>`
        : `<div class="adm-card admin-table-wrap">
            <table class="admin-table" style="min-width:720px">
              <thead><tr>
                <th>Student</th>
                <th style="width:26%">Overall progress</th>
                <th style="width:160px">Quizzes passed</th>
                <th>Currently on</th>
                <th></th>
              </tr></thead>
              <tbody id="prog-tbody"></tbody>
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
  <div class="adm-page" style="max-width:960px">
    <button onclick="navigate('admin',{tab:'progress'})" class="adm-btn" style="margin-bottom:20px">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      Back to Progress
    </button>

    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
      ${stuTableAvatar(st)}
      <div style="min-width:0">
        <h1 class="adm-title" style="font-size:20px">${escapeHtml(st.name)}</h1>
        <p class="adm-meta">${escapeHtml(st.email)}</p>
      </div>
    </div>

    ${admStats([
      ['Progress', pct, pct>=100?'ok':'', '%'],
      ['Lessons done', completed, '', '/'+total],
      ['Quizzes passed', passed.size, '', '/'+quizTotal]
    ])}

    <div class="adm-meter${pct>=100?' ok':''}" style="height:8px;margin-bottom:20px"><span style="width:${pct}%"></span></div>

    <div class="adm-card admin-table-wrap">
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
