/* admin.js — extracted verbatim from the original single-file index.html.
   Source lines: 2582-2860
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */

// ── Admin Edge Function helpers ───────────────────────────────────────────────
// Calls the admin-set-student-password Edge Function.
// Requires admin to be logged in via Supabase Auth (doAdminLogin → JWT in session).
window.adminSetStudentPassword=async function(studentId, newPassword){
  try{
    if(typeof _sb==='undefined') return {success:false,error:'Supabase not ready'};
    var {data,error}=await _sb.functions.invoke('admin-set-student-password',{
      body:{studentId,newPassword}
    });
    if(error){
      var status=error.context&&error.context.status;
      var msg;
      if(!status) msg='Unable to reach password service. Check your connection.';
      else if(status===401) msg='Admin session expired. Please sign out and sign back in.';
      else if(status===403) msg='Admin permission denied.';
      else if(status===404) msg='Password service not deployed. Contact support.';
      else if(status===429) msg='Too many requests. Try again shortly.';
      else msg='Unable to update password (HTTP '+status+'). Check Edge Function logs.';
      // Try to surface server error detail if available
      var detail=error.message&&error.message!=='FunctionsHttpError'?error.message:null;
      return {success:false,error:detail||msg};
    }
    return {success:true,authUserId:data&&data.authUserId,warning:data&&data.warning};
  }catch(e){
    return {success:false,error:'Unable to reach password service: '+e.message};
  }
};

// ── STUDENTS TAB ──────────────────────────────────────────────────────────────
function renderAdmin(tab){
  if(!window._admStudentsSynced){
    window._admStudentsSynced=true;
    sbLoadAllStudents().then(function(ok){
      if(ok&&currentSession&&currentSession.role==='admin'){
        var t=(history.state&&history.state.params&&history.state.params.tab)||'students';
        if(t==='students'||t==='progress')renderAdmin(t);
      }
    }).catch(function(){});
  }
  if(tab==='progress') return renderAdminProgress();
  if(tab==='classes'){
    if(typeof _sb!=="undefined") sbLoadVideos().catch(function(){}).finally(function(){renderAdminClasses();});
    else renderAdminClasses();
    return;
  }
  if(tab==='quiz')     return renderAdminQuiz();
  if(tab==='settings') return renderAdminSettings();
  if(tab==='images')   return renderAdminImages();
  if(tab==='demo')     return renderDemoAdmin();

  const students=loadStudents();
  // Deduplicate by email — keep latest entry per email
  var _seen={};
  const list=Object.values(students).filter(function(s){
    var key=(s.email||s.name||s.id).toLowerCase();
    if(_seen[key]) return false;
    _seen[key]=true; return true;
  });

  function _stuState(s){
    var v=getValidity(s);
    if(v.expired) return 'expired';
    if(v.validUntil && Math.ceil((v.validUntil-today)/86400000)<=14) return 'expiring';
    return 'active';
  }
  var _stuCounts={all:list.length,active:0,expiring:0,expired:0};
  list.forEach(function(s){_stuCounts[_stuState(s)]++;});
  window._stuState=_stuState;
  window._stuStatus=window._stuStatus||'all';

  app.innerHTML=adminTopBar('students')+`
  <div class="adm-page">
    ${admHead('Students',_stuCounts.all+' enrolled',
      '<button onclick="document.getElementById(\'pdf-import-input\').click()" class="adm-btn adm-btn-lg">'+ADM_ICON.upload+'Import PDF</button>'
      +'<input id="pdf-import-input" type="file" accept="application/pdf" style="display:none" onchange="handleStudentPDF(event)"/>'
      +'<button onclick="openAddStudent()" class="adm-btn adm-btn-lg adm-btn-primary">'+ADM_ICON.plus+'Add Student</button>')}

    ${admStats([
      ['Total students',_stuCounts.all],
      ['Active',_stuCounts.active+_stuCounts.expiring,'ok'],
      ['Expiring in 14 days',_stuCounts.expiring,_stuCounts.expiring?'warn':''],
      ['Expired',_stuCounts.expired,_stuCounts.expired?'bad':'']
    ])}

    <div class="adm-toolbar">
      ${admSearch('stu-search','Search by name or email…','applyStuFilters()')}
      <div class="adm-chips" id="stu-chips">
        ${[['all','All'],['active','Active'],['expiring','Expiring'],['expired','Expired']].map(function(c){
          return '<button class="adm-chip'+(window._stuStatus===c[0]?' on':'')+'" data-k="'+c[0]+'" onclick="window._stuStatus=\''+c[0]+'\';[].forEach.call(document.querySelectorAll(\'#stu-chips .adm-chip\'),function(b){b.classList.toggle(\'on\',b===this)},this);applyStuFilters()">'+c[1]+'<span class="n">'+(c[0]==='active'?_stuCounts.active+_stuCounts.expiring:_stuCounts[c[0]])+'</span></button>';
        }).join('')}
      </div>
      ${admSortSelect('stu-sort','applyStuFilters()')}
    </div>

    <div id="student-modal" style="display:none;position:fixed;inset:0;z-index:50;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);padding:16px;overflow-y:auto">
      <div class="lg" style="width:100%;max-width:420px;padding:28px;margin:auto">
        <h2 id="modal-title" style="font-size:18px;font-weight:700;color:#fff;margin-bottom:20px">Add Student</h2>
        <input id="s-id" type="hidden"/>
        <div style="display:flex;flex-direction:column;gap:14px">
          ${[['s-name','Full Name','text','Jane Doe'],['s-email','Email','email','jane@email.com'],['s-pass','Password','text','Set a password']].map(([id,lbl,type,ph])=>`
          <div>
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,0.45);margin-bottom:7px">${lbl}</label>
            <input id="${id}" type="${type}" placeholder="${ph}" class="glass-input"/>
          </div>`).join('')}
          <div>
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,0.45);margin-bottom:7px">Course Validity</label>
            <select id="s-validity" onchange="document.getElementById('s-custom-date-wrap').style.display=this.value==='custom'?'block':'none'" class="glass-input" style="cursor:pointer">
              <option value="">No expiry</option>
              <option value="7">1 Week</option><option value="30">1 Month</option>
              <option value="60">2 Months</option><option value="90">3 Months</option>
              <option value="180">6 Months</option><option value="365">1 Year</option>
              <option value="custom">Custom date...</option>
            </select>
          </div>
          <div id="s-custom-date-wrap" style="display:none">
            <label style="display:block;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,0.45);margin-bottom:7px">Expiry Date</label>
            <input id="s-custom-date" type="date" class="glass-input"/>
          </div>
          <p id="modal-err" style="display:none;font-size:12px;color:#ff8070">Email already in use.</p>
        </div>
        <div style="display:flex;gap:10px;margin-top:20px">
          <button onclick="saveStudent()" class="btn-primary" style="flex:1;padding:12px;font-size:14px">Save</button>
          <button onclick="closeModal()" class="btn-ghost" style="flex:1;padding:12px;font-size:14px">Cancel</button>
        </div>
      </div>
    </div>

    <div id="delete-modal" style="display:none;position:fixed;inset:0;z-index:50;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);padding:16px">
      <div class="lg" style="width:100%;max-width:340px;padding:32px;text-align:center">
        <div style="width:48px;height:48px;border-radius:50%;background:rgba(232,52,26,0.15);border:1px solid rgba(232,52,26,0.3);display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
          <svg style="width:22px;height:22px;color:#ff8070" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </div>
        <p style="font-size:17px;font-weight:700;color:#fff;margin-bottom:6px">Delete Student?</p>
        <p style="font-size:13px;color:rgba(255,255,255,0.5);margin-bottom:24px">This permanently removes the student and all their data.</p>
        <div style="display:flex;gap:10px">
          <button id="confirm-delete-btn" class="btn-primary" style="flex:1;padding:11px;font-size:14px;background:linear-gradient(135deg,#c0392b,#E8341A)">Delete</button>
          <button onclick="document.getElementById('delete-modal').style.display='none'" class="btn-ghost" style="flex:1;padding:11px;font-size:14px">Cancel</button>
        </div>
      </div>
    </div>

    ${list.length===0
      ?`<div class="adm-card adm-empty"><p style="font-size:15px;color:#fff;font-weight:600;margin:0 0 4px">No students yet</p>Add your first student to get started.</div>`
      :`<div class="adm-card admin-table-wrap">
          <div id="bulk-bar" style="display:none;align-items:center;gap:10px;padding:10px 16px;background:rgba(237,31,81,.08);border-bottom:1px solid rgba(237,31,81,.2)">
            <span id="bulk-count" style="font-size:13px;font-weight:700;color:#fff;font-family:'JetBrains Mono',monospace;margin-right:auto">0 selected</span>
            <button onclick="bulkClearSelection()" class="adm-btn">Clear</button>
            <button onclick="bulkDeleteStudents()" class="adm-btn adm-btn-danger">${ADM_ICON.trash}Delete selected</button>
          </div>
          <table class="admin-table" style="min-width:640px">
            <thead><tr>
              <th style="width:38px"><input type="checkbox" id="bulk-all" onchange="bulkToggleAll(this.checked)" style="accent-color:#ff2d78;width:16px;height:16px;cursor:pointer"/></th>
              <th>Student</th><th>Validity</th>
              <th style="width:170px">Classes unlocked</th>
              <th class="right" style="width:120px">Actions</th>
            </tr></thead>
            <tbody id="stu-tbody"></tbody>
          </table>
        </div>`}
  </div>`;

  // Search + sort for students tab
  window._stuList = list;
  window.applyStuFilters = function(){
    var q=(document.getElementById('stu-search')||{}).value||'';
    var sort=(document.getElementById('stu-sort')||{}).value||'newest';
    q=q.trim().toLowerCase();
    var st=window._stuStatus||'all';
    var filtered=window._stuList.filter(function(s){
      if(st!=='all'){var k=window._stuState(s);if(st==='active'?k==='expired':k!==st)return false;}
      return !q||(s.name||'').toLowerCase().includes(q)||(s.email||'').toLowerCase().includes(q);
    });
    if(sort==='az') filtered.sort(function(a,b){return (a.name||'').localeCompare(b.name||'');});
    else if(sort==='za') filtered.sort(function(a,b){return (b.name||'').localeCompare(a.name||'');});
    else if(sort==='oldest') filtered.sort(function(a,b){return (a.createdAt||'').localeCompare(b.createdAt||'');});
    else filtered.sort(function(a,b){return (b.createdAt||'').localeCompare(a.createdAt||'');});
    var tbody=document.getElementById('stu-tbody');
    if(!tbody)return;
    if(!filtered.length){tbody.innerHTML='<tr><td colspan="5" class="adm-empty">No students match this filter.</td></tr>';if(window.bulkUpdateBar)bulkUpdateBar();return;}
    tbody.innerHTML=filtered.map(function(s){
      var locked=getLockedVideos(s.id);
      var n=(s.accessList||[]).length, tot=ALL_LESSONS.length;
      return '<tr onclick="navigate(\'admin-student\',{id:\''+s.id+'\'})" style="cursor:pointer">'+
        '<td onclick="event.stopPropagation()"><input type="checkbox" class="bulk-chk" data-sid="'+s.id+'" onchange="bulkUpdateBar()" style="accent-color:#ff2d78;width:16px;height:16px;cursor:pointer"/></td>'+
        '<td><div style="display:flex;align-items:center;gap:12px;min-width:0">'+stuTableAvatar(s)+
          '<div style="min-width:0"><p class="adm-name">'+escapeHtml(s.name)+'</p><p class="adm-meta">'+escapeHtml(s.email)+'</p></div></div></td>'+
        '<td>'+admValidityCell(s)+
          (locked.length>0?' <span class="adm-badge warn nodot" style="margin-top:4px">'+locked.length+' video'+(locked.length>1?'s':'')+' locked</span>':'')+'</td>'+
        '<td><div style="display:flex;align-items:center;gap:10px"><div class="adm-meter'+(n>=tot?' ok':'')+'"><span style="width:'+Math.round(n/tot*100)+'%"></span></div><span class="adm-num">'+n+'/'+tot+'</span></div></td>'+
        '<td class="right" style="white-space:nowrap" onclick="event.stopPropagation()">'+stuOverflowBtn(s.id)+'</td>'+
      '</tr>';
    }).join('');
    if(window.bulkUpdateBar) bulkUpdateBar();
  };
  applyStuFilters();

  window.openAddStudent=()=>{
    document.getElementById('modal-title').textContent='Add Student';
    document.getElementById('s-validity').value='90';
    ['s-id','s-name','s-email','s-pass'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    document.getElementById('s-validity').value='';
    document.getElementById('s-custom-date-wrap').style.display='none';
    document.getElementById('modal-err').style.display='none';
    document.getElementById('student-modal').style.display='flex';
  };
  window.openEditStudent=(id)=>{
    const s=loadStudents()[id];if(!s)return;
    document.getElementById('modal-title').textContent='Edit Student';
    document.getElementById('s-id').value=s.id;
    document.getElementById('s-name').value=s.name;
    document.getElementById('s-email').value=s.email;
    // Do NOT prefill password — Supabase Auth is the authority; use "Set Password" in Manage Student
    document.getElementById('s-pass').value='';
    var passInput=document.getElementById('s-pass');
    if(passInput){passInput.placeholder='Leave blank to keep existing password';}
    if(s.validUntil){
      document.getElementById('s-validity').value='custom';
      document.getElementById('s-custom-date').value=s.validUntil.slice(0,10);
      document.getElementById('s-custom-date-wrap').style.display='block';
    } else {
      document.getElementById('s-validity').value='';
      document.getElementById('s-custom-date-wrap').style.display='none';
    }
    document.getElementById('modal-err').style.display='none';
    document.getElementById('student-modal').style.display='flex';
  };
  window.closeModal=()=>{document.getElementById('student-modal').style.display='none';};
  window.saveStudent=async()=>{
    const students=loadStudents();
    const existingId=document.getElementById('s-id').value;
    const isNew=!existingId;
    const id=existingId||genId();
    const name=document.getElementById('s-name').value.trim();
    const email=document.getElementById('s-email').value.trim().toLowerCase();
    const pass=document.getElementById('s-pass').value.trim();
    var errEl=document.getElementById('modal-err');
    if(!name||!email){errEl.textContent='Name and email are required.';errEl.style.display='block';return;}
    if(isNew&&!pass){errEl.textContent='Password required for new students.';errEl.style.display='block';return;}
    const dup=Object.values(students).find(s=>s.email.toLowerCase()===email&&s.id!==id);
    if(dup){errEl.textContent='Email already in use.';errEl.style.display='block';return;}
    let validUntil=students[id]?.validUntil||null;
    const valSel=document.getElementById('s-validity').value;
    if(valSel==='custom'){validUntil=document.getElementById('s-custom-date').value||null;}
    else if(valSel){const d=new Date();d.setDate(d.getDate()+Number(valSel));validUntil=d.toISOString().slice(0,10);}
    else{validUntil=null;}
    // NEVER store password in localStorage — Supabase Auth is the only password authority
    var stu={...(students[id]||{}),id,name,email,accessList:students[id]?.accessList||[1],validUntil,createdAt:students[id]?.createdAt||new Date().toISOString()};
    delete stu.password; // remove legacy field if present
    students[id]=stu;
    saveStudents(students);
    // Sync profile to Supabase
    if(typeof sbSaveStudent==='function') sbSaveStudent({id,name,email,validUntil,accessList:stu.accessList,createdAt:stu.createdAt});
    // New student: create Supabase Auth user + set password via Edge Function
    if(isNew&&pass){
      var saveBtn=document.querySelector('#student-modal button.btn-primary');
      if(saveBtn){saveBtn.disabled=true;saveBtn.textContent='Creating...';}
      var pwResult=await adminSetStudentPassword(id,pass);
      if(!pwResult.success){
        errEl.textContent='Profile saved but Auth setup failed: '+(pwResult.error||'unknown')+'. Use "Set Password" in Manage Student.';
        errEl.style.display='block';
        if(saveBtn){saveBtn.disabled=false;saveBtn.textContent='Save';}
        // Still close — profile exists, password can be set from Manage
      }
    }
    closeModal();navigate('admin',{tab:'students'});
  };
  window.bulkUpdateBar=function(){
    var chks=[].slice.call(document.querySelectorAll('.bulk-chk:checked'));
    var bar=document.getElementById('bulk-bar');
    var cnt=document.getElementById('bulk-count');
    if(bar)bar.style.display=chks.length?'flex':'none';
    if(cnt)cnt.textContent=chks.length+' selected';
    var all=document.getElementById('bulk-all');
    var total=document.querySelectorAll('.bulk-chk').length;
    if(all)all.checked=chks.length===total&&total>0;
  };
  window.bulkToggleAll=function(on){
    [].slice.call(document.querySelectorAll('.bulk-chk')).forEach(function(c){c.checked=on;});
    bulkUpdateBar();
  };
  window.bulkClearSelection=function(){bulkToggleAll(false);};
  window.bulkDeleteStudents=function(){
    var ids=[].slice.call(document.querySelectorAll('.bulk-chk:checked')).map(function(c){return c.getAttribute('data-sid');});
    if(!ids.length)return;
    if(!confirm('Delete '+ids.length+' students permanently? This cannot be undone.'))return;
    var s=loadStudents();
    ids.forEach(function(id){
      delete s[id];
      localStorage.removeItem('brokeneng_photo_'+id);
      localStorage.removeItem('brokeneng_locked_'+id);
      localStorage.removeItem('brokeneng_quizlock_'+id);
      localStorage.removeItem(getProgressKey(id));
      localStorage.removeItem('brokeneng_logout_'+id);
      sbDeleteStudent(id);
    });
    saveStudents(s);
    navigate('admin',{tab:'students'});
  };
  window.confirmDelete=(id)=>{
    const modal=document.getElementById('delete-modal');
    modal.style.display='flex';
    document.getElementById('confirm-delete-btn').onclick=()=>{
      const s=loadStudents();delete s[id];saveStudents(s);
      localStorage.removeItem('brokeneng_photo_'+id);
      localStorage.removeItem('brokeneng_locked_'+id);
      localStorage.removeItem('brokeneng_quizlock_'+id);
      localStorage.removeItem(getProgressKey(id));
      localStorage.removeItem('brokeneng_logout_'+id);
      
      sbDeleteStudent(id);modal.style.display='none';navigate('admin',{tab:'students'});
    };
  };
}
