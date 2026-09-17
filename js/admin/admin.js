/* admin.js — extracted verbatim from the original single-file index.html.
   Source lines: 2582-2860
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
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

  app.innerHTML=adminTopBar('students')+`
  <div style="padding:24px;position:relative;z-index:1">
    <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:16px;flex-wrap:wrap">
      <div>
        <h1 style="font-size:22px;font-weight:800;color:#fff;margin-bottom:2px;font-family:'Montserrat',sans-serif">Students</h1>
        <p style="font-size:13px;color:var(--muted)">${list.length} enrolled</p>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button onclick="document.getElementById('pdf-import-input').click()" style="display:flex;align-items:center;gap:8px;padding:11px 20px;border-radius:12px;background:rgba(255,255,255,.07);color:#fff;font-size:14px;font-weight:700;border:1px solid rgba(255,255,255,.15);cursor:pointer;transition:all .18s;font-family:'Montserrat',sans-serif" onmouseover="this.style.background='rgba(255,255,255,.12)'" onmouseout="this.style.background='rgba(255,255,255,.07)'">
        <svg style="width:16px;height:16px" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>
        Import PDF
      </button>
      <input id="pdf-import-input" type="file" accept="application/pdf" style="display:none" onchange="handleStudentPDF(event)"/>
      <button onclick="openAddStudent()" style="display:flex;align-items:center;gap:8px;padding:11px 20px;border-radius:12px;background:var(--grad);color:#fff;font-size:14px;font-weight:700;border:1px solid rgba(255,255,255,.2);box-shadow:0 4px 20px rgba(255,45,120,.35),inset 0 1px 0 rgba(255,255,255,.2);cursor:pointer;transition:all .18s;font-family:'Montserrat',sans-serif">
        <svg style="width:16px;height:16px" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
        Add Student
      </button>
      </div>
    </div>

    <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
      <input id="stu-search" placeholder="Search by name or email..." oninput="applyStuFilters()" style="flex:1;min-width:200px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);border-radius:10px;color:#fff;font-size:13px;padding:10px 14px;outline:none"/>
      <select id="stu-sort" onchange="applyStuFilters()" style="background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);border-radius:10px;color:#fff;font-size:13px;padding:10px 14px;outline:none;cursor:pointer">
        <option value="newest">Newest First</option>
        <option value="oldest">Oldest First</option>
        <option value="az">A → Z</option>
        <option value="za">Z → A</option>
      </select>
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
      ?`<div class="lg" style="padding:48px;text-align:center"><p style="color:var(--muted);font-size:15px;font-weight:500">No students yet</p><p style="color:var(--muted);font-size:13px;margin-top:4px;opacity:.6">Add your first student to get started.</p></div>`
      :`<div class="lg admin-table-wrap" style="overflow:hidden;border-radius:20px">
          <div id="bulk-bar" style="display:none;align-items:center;gap:14px;padding:12px 18px;background:rgba(255,45,120,.08);border-bottom:1px solid rgba(255,45,120,.2)">
            <span id="bulk-count" style="font-size:13px;font-weight:700;color:#fff;font-family:'JetBrains Mono',monospace">0 selected</span>
            <button onclick="bulkDeleteStudents()" style="padding:8px 18px;border-radius:10px;background:rgba(248,113,113,.15);border:1px solid rgba(248,113,113,.4);color:#f87171;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s" onmouseover="this.style.background='rgba(248,113,113,.28)'" onmouseout="this.style.background='rgba(248,113,113,.15)'">Delete Selected</button>
            <button onclick="bulkClearSelection()" style="padding:8px 14px;border-radius:10px;background:none;border:1px solid rgba(255,255,255,.15);color:var(--muted);font-size:13px;font-weight:600;cursor:pointer">Clear</button>
          </div>
          <table class="admin-table" style="min-width:660px">
            <thead><tr>
              <th style="width:38px"><input type="checkbox" id="bulk-all" onchange="bulkToggleAll(this.checked)" style="accent-color:#ff2d78;width:16px;height:16px;cursor:pointer"/></th>
              <th>Student</th><th>Validity</th>
              <th class="center">Access</th><th class="center">Status</th>
              <th class="right">Actions</th>
            </tr></thead>
            <tbody id="stu-tbody">
              ${list.map((s,i)=>{
                const{expired}=getValidity(s);
                const locked=getLockedVideos(s.id);
                return`<tr>
                  <td><input type="checkbox" class="bulk-chk" data-sid="${s.id}" onchange="bulkUpdateBar()" style="accent-color:#ff2d78;width:16px;height:16px;cursor:pointer"/></td>
                  <td><p style="font-weight:600;color:#fff">${s.name}</p><p style="font-size:12px;color:rgba(255,255,255,0.45);margin-top:1px">${s.email}</p></td>
                  <td>${validityBadge(s)}</td>
                  <td class="center"><span class="pill pill-orange">${(s.accessList||[]).length}/${ALL_LESSONS.length}</span></td>
                  <td class="center">
                    ${expired?'<span class="pill pill-red">Expired</span>':'<span class="pill pill-green">Active</span>'}
                    ${locked.length>0?`<span class="pill pill-yellow" style="margin-left:4px">${locked.length} locked</span>`:''}
                  </td>
                  <td class="right" style="white-space:nowrap">
                    <div style="display:inline-flex;gap:6px">
                      ${glassBtn('Manage',`navigate('admin-student',{id:'${s.id}'})`,'ghost')}
                      ${glassBtn('Edit',`openEditStudent('${s.id}')`,'ghost')}
                      ${glassBtn('Delete',`confirmDelete('${s.id}')`,'danger')}
                    </div>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`}
  </div>`;

  // Search + sort for students tab
  window._stuList = list;
  window.applyStuFilters = function(){
    var q=(document.getElementById('stu-search')||{}).value||'';
    var sort=(document.getElementById('stu-sort')||{}).value||'newest';
    q=q.trim().toLowerCase();
    var filtered=window._stuList.filter(function(s){
      return !q||(s.name||'').toLowerCase().includes(q)||(s.email||'').toLowerCase().includes(q);
    });
    if(sort==='az') filtered.sort(function(a,b){return (a.name||'').localeCompare(b.name||'');});
    else if(sort==='za') filtered.sort(function(a,b){return (b.name||'').localeCompare(a.name||'');});
    else if(sort==='oldest') filtered.sort(function(a,b){return (a.createdAt||'').localeCompare(b.createdAt||'');});
    else filtered.sort(function(a,b){return (b.createdAt||'').localeCompare(a.createdAt||'');});
    var tbody=document.getElementById('stu-tbody');
    if(!tbody)return;
    tbody.innerHTML=filtered.map(function(s){
      var v=getValidity(s); var expired=v.expired;
      var locked=getLockedVideos(s.id);
      return '<tr>'+
        '<td><input type="checkbox" class="bulk-chk" data-sid="'+s.id+'" onchange="bulkUpdateBar()" style="accent-color:#ff2d78;width:16px;height:16px;cursor:pointer"/></td>'+
        '<td><p style="font-weight:600;color:#fff">'+s.name+'</p><p style="font-size:12px;color:rgba(255,255,255,0.45);margin-top:1px">'+s.email+'</p></td>'+
        '<td>'+validityBadge(s)+'</td>'+
        '<td class="center"><span class="pill pill-orange">'+(s.accessList||[]).length+'/'+ALL_LESSONS.length+'</span></td>'+
        '<td class="center">'+(expired?'<span class="pill pill-red">Expired</span>':'<span class="pill pill-green">Active</span>')+(locked.length>0?'<span class="pill pill-yellow" style="margin-left:4px">'+locked.length+' locked</span>':'')+'</td>'+
        '<td class="right" style="white-space:nowrap"><div style="display:inline-flex;gap:6px">'+
          glassBtn('Manage',"navigate('admin-student',{id:'"+s.id+"'})",'ghost')+
          glassBtn('Edit',"openEditStudent('"+s.id+"')",'ghost')+
          glassBtn('Delete',"confirmDelete('"+s.id+"')",'danger')+
        '</div></td>'+
      '</tr>';
    }).join('');
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
    document.getElementById('s-pass').value=s.password;
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
  window.saveStudent=()=>{
    const students=loadStudents();
    const id=document.getElementById('s-id').value||genId();
    const name=document.getElementById('s-name').value.trim();
    const email=document.getElementById('s-email').value.trim().toLowerCase();
    const pass=document.getElementById('s-pass').value.trim();
    if(!name||!email||!pass)return;
    const dup=Object.values(students).find(s=>s.email.toLowerCase()===email&&s.id!==id);
    if(dup){document.getElementById('modal-err').style.display='block';return;}
    let validUntil=students[id]?.validUntil||null;
    const valSel=document.getElementById('s-validity').value;
    if(valSel==='custom'){validUntil=document.getElementById('s-custom-date').value||null;}
    else if(valSel){const d=new Date();d.setDate(d.getDate()+Number(valSel));validUntil=d.toISOString().slice(0,10);}
    else{validUntil=null;}
    students[id]={...(students[id]||{}),id,name,email,password:pass,accessList:students[id]?.accessList||[1],validUntil,createdAt:students[id]?.createdAt||new Date().toISOString()};
    saveStudents(students);closeModal();navigate('admin',{tab:'students'});
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
