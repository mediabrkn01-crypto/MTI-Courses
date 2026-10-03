/* progress.js — extracted verbatim from the original single-file index.html.
   Source lines: 3014-3281
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
// ── SHARED PROGRESS SOURCE ───────────────────────────────────────────────────
// The Progress list and the per-student page both read progress through here, so
// they always agree. Server rows (student_progress + quiz_scores) are the source of
// truth — the same tables the student's own dashboard loads via sbLoadProgress().
// A student can have duplicate profile rows with the same email; their progress is merged.
var AdmProgress=(function(){
  // Supabase caps a select at 1000 rows — page through so large classes aren't cut off.
  async function fetchAll(table, cols, filter){
    var out=[], from=0, PAGE=1000;
    for(;;){
      var q=_sb.from(table).select(cols).range(from, from+PAGE-1);
      if(filter) q=filter(q);
      var res=await q;
      if(res.error) throw new Error(res.error.message||('Could not load '+table));
      out=out.concat(res.data||[]);
      if(!res.data||res.data.length<PAGE) return out;
      from+=PAGE;
    }
  }
  // Returns {prog:{studentId:Set(lessonId)}, quiz:{studentId:{lessonId:bestPct}},
  //          drip:{studentId:Set(lessonOrder)}}. Throws on failure.
  // drip = classes the course has already opened for the student (written by the
  // student app's getUnlockedSet into course_config as drip_<studentId>_<date>).
  // opts.quiz===false skips quiz_scores (pages that only need completion/unlocks).
  async function load(ids, opts){
    if(typeof _sb==='undefined') throw new Error('Not connected to the server');
    var byIds=ids?function(q){return q.in('student_id',ids);}:null;
    var r=await Promise.all([
      fetchAll('student_progress','student_id,lesson_id',byIds),
      (opts&&opts.quiz===false)?Promise.resolve([]):fetchAll('quiz_scores','student_id,lesson_id,pct',byIds),
      fetchAll('course_config','id,data',function(q){return q.like('id','drip_%');})
    ]);
    var prog={}, quiz={}, drip={};
    r[0].forEach(function(x){ (prog[x.student_id]=prog[x.student_id]||new Set()).add(x.lesson_id); });
    r[1].forEach(function(x){ var m=quiz[x.student_id]=quiz[x.student_id]||{}; m[x.lesson_id]=Math.max(m[x.lesson_id]||0, x.pct||0); });
    r[2].forEach(function(x){
      var m=/^drip_(.+)_(\d{4}-\d{2}-\d{2})$/.exec(x.id||''); if(!m) return;
      if(ids&&ids.indexOf(m[1])<0) return;
      var set=drip[m[1]]=drip[m[1]]||new Set();
      (Array.isArray(x.data)?x.data:[]).forEach(function(o){ set.add(Number(o)); });
    });
    return {prog:prog, quiz:quiz, drip:drip};
  }
  function mergedIds(sid, students){
    var st=students[sid]; if(!st) return [sid];
    var email=(st.email||'').toLowerCase().trim(); if(!email) return [sid];
    var ids=Object.values(students).filter(function(x){return (x.email||'').toLowerCase().trim()===email;}).map(function(x){return x.id;});
    if(ids.indexOf(sid)<0) ids.unshift(sid);
    return ids;
  }
  function wvList(){ return typeof WV_DATA!=='undefined'?WV_DATA:[]; }
  function totals(){
    return { lessons: ALL_LESSONS.length+wvList().length, core: ALL_LESSONS.length, wv: wvList().length,
             quizzes: ALL_LESSONS.filter(function(l){return hasRealQuiz(l);}).length };
  }
  // One calculation for every view.
  function compute(sid, students, data){
    var ids=mergedIds(sid, students), done=new Set(), quiz={}, opened=new Set([1]);
    ids.forEach(function(id){
      ((data.drip||{})[id]||new Set()).forEach(function(o){opened.add(o);});
      (data.prog[id]||new Set()).forEach(function(x){done.add(x);});
      loadProgress(id).forEach(function(x){done.add(x);}); // not-yet-synced local rows, if any
      var q=data.quiz[id]||{};
      Object.keys(q).forEach(function(k){ quiz[k]=Math.max(quiz[k]||0, q[k]); });
    });
    var core=ALL_LESSONS.filter(function(l){return done.has(l.id);});
    var wv=wvList().filter(function(w){return done.has(w.id);});
    var t=totals(), completed=core.length+wv.length, last=null;
    // Unlocked exactly as the student app sees it: Day 1 + drip-opened + already completed.
    var unlocked=ALL_LESSONS.filter(function(l){return opened.has(l.order)||done.has(l.id);}).length;
    core.forEach(function(l){ if(!last||l.order>last.order) last=l; });
    return {
      done:done, quiz:quiz, completed:completed, coreDone:core.length, wvDone:wv.length,
      total:t.lessons, quizTotal:t.quizzes,
      pct: t.lessons ? Math.min(100, Math.round(completed/t.lessons*100)) : 0,
      passed: ALL_LESSONS.filter(function(l){return (quiz[l.id]||0)>=70;}).length,
      last:last, unlocked:unlocked,
      // per-class state for the Manage page: lesson order → 'done' | 'open' | 'locked'
      classState:function(order){ var l=ALL_LESSONS.find(function(x){return x.order===order;});
        return l&&done.has(l.id)?'done':opened.has(order)?'open':'locked'; }
    };
  }
  // ── Admin class access ──
  // The student app opens a class if it is Day 1, completed, or listed in one of the
  // student's drip rows (course_config drip_<id>_<date>). Admin unlocks are written to a
  // dedicated drip row dated 0000-00-00: the student app honours it like any other drip
  // row, and the old date never blocks the daily phase release. Locking removes the class
  // from every drip row, which returns it to the normal course order (completed classes
  // always stay open).
  var ADMIN_DRIP_DATE='0000-00-00';
  async function setClassAccess(sid, students, orders, open){
    var ids=mergedIds(sid, students);
    if(open){
      var key='drip_'+sid+'_'+ADMIN_DRIP_DATE;
      var cur=await _sb.from('course_config').select('data').eq('id',key).limit(1);
      if(cur.error) throw new Error(cur.error.message);
      var set=new Set(((cur.data&&cur.data[0]&&cur.data[0].data)||[]).map(Number));
      orders.forEach(function(o){set.add(o);});
      var up=await _sb.from('course_config').upsert({id:key,data:[...set].sort(function(a,b){return a-b;})},{onConflict:'id'});
      if(up.error) throw new Error(up.error.message);
      return;
    }
    for(var i=0;i<ids.length;i++){
      var rows=await _sb.from('course_config').select('id,data').like('id','drip_'+ids[i]+'_%');
      if(rows.error) throw new Error(rows.error.message);
      for(var j=0;j<(rows.data||[]).length;j++){
        var r=rows.data[j], before=(Array.isArray(r.data)?r.data:[]).map(Number);
        var after=before.filter(function(o){return orders.indexOf(o)<0;});
        if(after.length===before.length) continue;
        var res=after.length
          ? await _sb.from('course_config').update({data:after}).eq('id',r.id)
          : await _sb.from('course_config').delete().eq('id',r.id);
        if(res.error) throw new Error(res.error.message);
      }
    }
  }
  return {load:load, compute:compute, mergedIds:mergedIds, totals:totals, wvList:wvList, setClassAccess:setClassAccess};
})();

function _admProgError(msg, retry){
  return '<div class="adm-card adm-empty"><p style="color:#fb7185;font-weight:600;margin:0 0 6px">Could not load progress</p>'
    +'<p class="adm-meta" style="margin:0 0 14px">'+escapeHtml(msg||'Unknown error')+'. Nothing is shown so a failed load never looks like zero progress.</p>'
    +'<button class="adm-btn" onclick="'+retry+'">'+ADM_ICON.refresh+' Try again</button></div>';
}

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
  const T = AdmProgress.totals();
  const TOTAL_LESSONS = T.lessons;

  app.innerHTML = adminTopBar('progress') + '<div class="adm-page"><div id="prog-loading" class="adm-card adm-empty">Loading progress from server…</div></div>';

  (async function(){
    var data, err=null;
    try{ data = await AdmProgress.load(); }
    catch(e){ err=e; }
    // The admin may have opened a student or another tab while this was loading — don't overwrite it.
    if(!document.getElementById('prog-loading')) return;
    if(err){
      var e=err; console.warn('Progress fetch error:',e);
      app.innerHTML = adminTopBar('progress') + '<div class="adm-page">'+_admProgError(e.message,"renderAdminProgress()")+'</div>';
      return;
    }
    const quizTotal = T.quizzes;
    // Compute once per student — rows and stats both read from this.
    var stats = {};
    list.forEach(function(st){ stats[st.id] = AdmProgress.compute(st.id, students, data); });
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

// Lessons / Pronunciation Workshop tabs on the student detail page — client-side only.
window.pdShowTab=function(which){
  ['lessons','workshop'].forEach(function(k){
    var t=document.getElementById('pd-tab-'+k), p=document.getElementById('pd-panel-'+k);
    if(!t||!p) return;
    var on=k===which;
    t.classList.toggle('on',on); t.setAttribute('aria-selected',on?'true':'false'); p.hidden=!on;
  });
};

// ── PER-STUDENT PROGRESS DETAIL ──────────────────────────────────────────────
// Same data + same calculation as the list (AdmProgress), fetched for this student's
// merged ids only. Shows a loading state first and an error state on failure — never
// placeholder zeros.
function renderAdminProgressStudent(id){
  const students = loadStudents();
  const st = students[id];
  if(!st){ navigate('admin',{tab:'progress'}); return; }
  const T = AdmProgress.totals();

  function page(statsHtml, meterPct, body){
    return adminTopBar('progress') + `
  <div class="adm-page" style="max-width:960px">
    <button onclick="navigate('admin',{tab:'progress'})" class="adm-btn" style="margin-bottom:20px">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      Back to Progress
    </button>

    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
      ${stuTableAvatar(st)}
      <div style="min-width:0">
        <h1 class="adm-title" style="font-size:20px">${escapeHtml(st.name)}</h1>
        <p class="adm-meta">${escapeHtml(st.email||'')}</p>
      </div>
    </div>

    ${statsHtml}

    <div class="adm-meter${meterPct>=100?' ok':''}" style="max-width:none;height:8px;margin-bottom:20px"><span style="width:${meterPct}%"></span></div>

    ${body}
  </div>`;
  }

  const sk='<span class="adm-skel"></span>';
  app.innerHTML = page(admStats([['Progress',sk],['Lessons done',sk],['Quizzes passed',sk]]), 0,
    '<div id="prog-detail-loading" data-sid="'+escapeHtml(st.id)+'" class="adm-card adm-empty">Loading '+escapeHtml(st.name)+'\'s progress…</div>');

  (async function(){
    var data, err=null;
    try{ data = await AdmProgress.load(AdmProgress.mergedIds(st.id, students)); }
    catch(e){ err=e; console.warn('Progress detail fetch error:',e); }
    // Only render if this student's loading screen is still the one showing.
    var marker=document.getElementById('prog-detail-loading');
    if(!marker || marker.getAttribute('data-sid')!==st.id) return;
    if(err){
      app.innerHTML = page(admStats([['Progress','—'],['Lessons done','—'],['Quizzes passed','—']]), 0,
        _admProgError(err.message,"renderAdminProgressStudent('"+st.id+"')"));
      return;
    }
    const s = AdmProgress.compute(st.id, students, data);

    function circle(label, done){
      return `<div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;margin:auto;
          background:${done?'rgba(74,222,128,.15)':'rgba(255,255,255,.06)'};
          border:1.5px solid ${done?'rgba(74,222,128,.5)':'rgba(255,255,255,.1)'};
          color:${done?'#4ade80':'rgba(255,255,255,.3)'}">${done?'✓':label}</div>`;
    }
    function doneCell(done){
      return done
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    }
    function titleCell(title, done, extra){
      return `<span style="font-size:13px;font-weight:${done?'600':'400'};color:${done?'#fff':'rgba(255,255,255,.4)'}">${escapeHtml(title)}</span>${extra||''}`;
    }
    function lessonRow(l){
      const done = s.done.has(l.id);
      const pct = s.quiz[l.id];
      const isLast = s.last && l.id === s.last.id;
      return `<tr>
      <td style="width:40px;text-align:center">${circle(l.order, done)}</td>
      <td>${titleCell(getLessonTitle(l)||'Day '+l.order, done,
        isLast?'<span style="margin-left:6px;font-size:10px;padding:2px 7px;border-radius:99px;background:rgba(255,45,120,.15);border:1px solid rgba(255,45,120,.3);color:var(--g3);font-weight:700">CURRENT</span>':'')}</td>
      <td class="center">
        ${pct!=null
          ? (pct>=70
            ? '<span class="pill pill-green" style="font-size:10px">Passed · '+pct+'%</span>'
            : '<span class="pill pill-red" style="font-size:10px">Attempted · '+pct+'%</span>')
          : '<span style="font-size:11px;color:rgba(255,255,255,'+(hasRealQuiz(l)?'.25':'.15')+')">—</span>'}
      </td>
      <td class="center">${doneCell(done)}</td>
    </tr>`;
    }
    function wvRow(w, i){
      const done = s.done.has(w.id);
      return `<tr>
      <td style="width:40px;text-align:center">${circle('W'+(i+1), done)}</td>
      <td>${titleCell(w.title, done)}</td>
      <td class="center"><span style="font-size:11px;color:rgba(255,255,255,.15)">—</span></td>
      <td class="center">${doneCell(done)}</td>
    </tr>`;
    }
    const wv = AdmProgress.wvList();

    function panelHead(done, total, noun){
      const p = total ? Math.round(done/total*100) : 0;
      return `<div class="pd-sum"><span><b>${done}</b> of ${total} ${noun} completed</span>
        <div class="adm-meter${done&&done>=total?' ok':''}" style="max-width:220px"><span style="width:${p}%"></span></div></div>`;
    }

    app.innerHTML = page(admStats([
      ['Progress', s.pct, s.pct>=100?'ok':'', '%'],
      ['Lessons done', s.completed, '', '/'+s.total],
      ['Quizzes passed', s.passed, '', '/'+s.quizTotal]
    ]), s.pct, `
    <div class="pd-tabs" role="tablist" aria-label="Progress sections">
      <button type="button" role="tab" id="pd-tab-lessons" class="pd-tab on" aria-selected="true" aria-controls="pd-panel-lessons" onclick="pdShowTab('lessons')">Lessons <span class="n">${s.coreDone}/${ALL_LESSONS.length}</span></button>
      ${wv.length?`<button type="button" role="tab" id="pd-tab-workshop" class="pd-tab" aria-selected="false" aria-controls="pd-panel-workshop" onclick="pdShowTab('workshop')">Pronunciation Workshop <span class="n">${s.wvDone}/${wv.length}</span></button>`:''}
    </div>

    <div id="pd-panel-lessons" role="tabpanel" aria-labelledby="pd-tab-lessons">
      ${panelHead(s.coreDone, ALL_LESSONS.length, 'lessons')}
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
    </div>

    ${wv.length?`<div id="pd-panel-workshop" role="tabpanel" aria-labelledby="pd-tab-workshop" hidden>
      ${panelHead(s.wvDone, wv.length, 'workshop classes')}
      <div class="adm-card admin-table-wrap">
        <table class="admin-table" style="min-width:400px">
          <thead><tr>
            <th style="width:48px"></th>
            <th>Workshop class</th>
            <th class="center">Quiz</th>
            <th class="center">Done</th>
          </tr></thead>
          <tbody>${wv.map(wvRow).join('')}</tbody>
        </table>
      </div>
    </div>`:''}`);
  })();
}
