/* admin.js — extracted verbatim from the original single-file index.html.
   Source lines: 2582-2860
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */

// ── Admin Edge Function helpers ───────────────────────────────────────────────
// Update a student's LOGIN credentials in Supabase Auth via the admin-set-student-password
// Edge Function. changes: {newPassword?, newEmail?}. The function verifies the admin JWT,
// updates Auth first and only then the students row, so login and profile never drift apart.
window.adminUpdateStudentLogin=async function(studentId, changes){
  try{
    if(typeof _sb==='undefined') return {success:false,error:'Supabase not ready'};
    var body={studentId:studentId};
    if(changes&&changes.newPassword) body.newPassword=changes.newPassword;
    if(changes&&changes.newEmail) body.newEmail=changes.newEmail;
    var {data,error}=await _sb.functions.invoke('admin-set-student-password',{body:body});
    if(error){
      var status=error.context&&error.context.status;
      // Prefer the server's own message ("Another student already uses this email", …).
      var serverMsg=null;
      try{ if(error.context&&typeof error.context.json==='function'){ var j=await error.context.json(); serverMsg=j&&j.error; } }catch(e){}
      var msg;
      if(serverMsg) msg=serverMsg;
      else if(!status) msg='Unable to reach the login service. Check your connection.';
      else if(status===401) msg='Admin session expired. Please sign out and sign back in.';
      else if(status===403) msg='Admin permission denied.';
      else if(status===404) msg='Login service not deployed. Contact support.';
      else if(status===429) msg='Too many requests. Try again shortly.';
      else msg='Unable to update login (HTTP '+status+').';
      return {success:false,error:msg,status:status};
    }
    return {success:true,authUserId:data&&data.authUserId,warning:data&&data.warning,emailChanged:!!(data&&data.emailChanged)};
  }catch(e){
    return {success:false,error:'Unable to reach the login service: '+e.message};
  }
};
// Kept for existing callers (Manage Student → Set Password).
window.adminSetStudentPassword=function(studentId, newPassword){
  return adminUpdateStudentLogin(studentId,{newPassword:newPassword});
};

// ── STUDENTS TAB ──────────────────────────────────────────────────────────────
function renderAdmin(tab){
  if(!window._admStudentsSynced){
    window._admStudentsSynced=true;
    sbLoadAllStudents().then(function(ok){
      if(ok&&currentSession&&currentSession.role==='admin'){
        var t=(history.state&&history.state.params&&history.state.params.tab)||'students';
        // Don't re-render under an open dialog — it would replace the form being edited.
        var dlgOpen=[].some.call(document.querySelectorAll('#student-modal,#delete-modal'),function(m){return m.style.display&&m.style.display!=='none';});
        if(!dlgOpen&&(t==='students'||t==='progress'))renderAdmin(t);
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

    <div id="student-modal" class="qe-overlay sm-overlay" style="display:none" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <form id="sm-form" class="qe-panel sm-panel" novalidate onsubmit="event.preventDefault();saveStudent();">
        <div class="qe-head">
          <div>
            <h2 id="modal-title" class="adm-card-title" style="font-size:18px">Add student</h2>
            <p id="sm-sub" class="adm-hint" style="margin:3px 0 0">They sign in with this email and password on any device.</p>
          </div>
          <button type="button" class="adm-btn adm-icon-btn" onclick="closeModal()" aria-label="Close">✕</button>
        </div>
        <input id="s-id" type="hidden"/>
        <div class="qe-body sm-body" id="sm-body">
          <div id="modal-err" class="adm-callout sm-err" role="alert" style="display:none"></div>

          <div class="sm-field">
            <label for="s-name" class="adm-label">Full name</label>
            <input id="s-name" class="adm-input" type="text" autocomplete="off" placeholder="e.g. Hiba Fathima"/>
          </div>
          <div class="sm-field">
            <label for="s-email" class="adm-label">Email</label>
            <input id="s-email" class="adm-input" type="email" inputmode="email" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="student@email.com"/>
            <p id="s-email-hint" class="adm-hint">This is also their sign-in email.</p>
          </div>
          <div class="sm-field">
            <div class="sm-label-row">
              <label for="s-pass" class="adm-label" id="s-pass-label">Password</label>
              <button type="button" class="sm-linkbtn" onclick="smGeneratePassword()">Generate</button>
            </div>
            <div class="sm-pass-wrap">
              <input id="s-pass" class="adm-input" type="password" autocomplete="new-password" placeholder="At least 6 characters"/>
              <button type="button" class="sm-eye" onclick="togglePw('s-pass',this)" aria-label="Show password"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg></button>
            </div>
            <p id="s-pass-hint" class="adm-hint">Minimum 6 characters.</p>
          </div>
          <div class="sm-field">
            <span class="adm-label">Course access</span>
            <div class="sm-chips" id="sm-validity-chips" role="radiogroup" aria-label="Course access"></div>
            <div id="s-custom-date-wrap" style="display:none;margin-top:8px">
              <input id="s-custom-date" type="date" class="adm-input" style="color-scheme:dark" aria-label="Access end date" oninput="smUpdateValidityPreview()"/>
            </div>
            <p id="sm-validity-preview" class="sm-preview"></p>
          </div>
        </div>

        <div class="qe-body sm-done" id="sm-done" style="display:none"></div>

        <div class="qe-foot" id="sm-foot">
          <button type="button" class="adm-btn" onclick="closeModal()">Cancel</button>
          <button type="submit" id="sm-save" class="adm-btn adm-btn-primary adm-btn-lg">Add student</button>
        </div>
      </form>
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

  // ── ADD / EDIT STUDENT ─────────────────────────────────────────────────────
  // Login credentials (email + password) are written to Supabase Auth through the
  // admin-set-student-password Edge Function. Nothing credential-related is kept in the browser.
  var SM_OPTIONS=[['keep','Keep current'],['none','No expiry'],['30','1 month'],['90','3 months'],['180','6 months'],['365','1 year'],['custom','Pick date']];
  var _sm={mode:'add',validity:'90',orig:null};
  function _smEl(id){return document.getElementById(id);}
  function _smFmt(d){return d.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});}
  function _smEndDate(){
    var v=_sm.validity;
    if(v==='none') return null;
    if(v==='keep') return _sm.orig&&_sm.orig.validUntil?new Date(_sm.orig.validUntil):null;
    if(v==='custom'){ var c=_smEl('s-custom-date').value; return c?new Date(c+'T00:00:00'):undefined; }
    var d=new Date(); d.setDate(d.getDate()+Number(v)); return d;
  }
  window.smUpdateValidityPreview=function(){
    var d=_smEndDate(), el=_smEl('sm-validity-preview');
    if(d===undefined){ el.textContent='Choose an end date.'; el.className='sm-preview warn'; return; }
    if(d===null){ el.textContent='Access never expires.'; el.className='sm-preview'; return; }
    var days=Math.floor((d-new Date(new Date().toDateString()))/86400000);
    el.textContent=(days<0?'Expired on ':'Access until ')+_smFmt(d)+(days>=0?' · '+days+' day'+(days===1?'':'s'):'');
    el.className='sm-preview'+(days<0?' bad':'');
  };
  window.smPickValidity=function(v){
    _sm.validity=v;
    [].forEach.call(document.querySelectorAll('#sm-validity-chips .adm-chip'),function(b){
      var on=b.dataset.v===v; b.classList.toggle('on',on); b.setAttribute('aria-checked',on);
    });
    _smEl('s-custom-date-wrap').style.display=v==='custom'?'block':'none';
    if(v==='custom'){ var i=_smEl('s-custom-date'); i.min=new Date().toISOString().slice(0,10); if(!i.value&&_sm.orig&&_sm.orig.validUntil) i.value=_sm.orig.validUntil.slice(0,10); setTimeout(function(){i.focus();},0); }
    smUpdateValidityPreview();
  };
  function _smRenderChips(){
    _smEl('sm-validity-chips').innerHTML=SM_OPTIONS
      .filter(function(o){return o[0]!=='keep'||_sm.mode==='edit';})
      .map(function(o){return '<button type="button" class="adm-chip" role="radio" data-v="'+o[0]+'" onclick="smPickValidity(\''+o[0]+'\')">'+o[1]+'</button>';}).join('');
  }
  window.smGeneratePassword=function(){
    // Easy to read aloud / type on a phone: no 0/O, 1/l/I.
    var chars='abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var buf=new Uint32Array(10); crypto.getRandomValues(buf);
    var pw=''; for(var i=0;i<buf.length;i++) pw+=chars[buf[i]%chars.length];
    var inp=_smEl('s-pass'); inp.value=pw; inp.type='text';
    var eye=inp.parentElement.querySelector('.sm-eye'); if(eye) (eye.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>');
    _smFieldErr('s-pass',false);
  };
  function _smFieldErr(id,on){ var el=_smEl(id); if(el) el.classList.toggle('invalid',!!on); }
  function _smShowErr(msg){
    var e=_smEl('modal-err');
    if(!msg){ e.style.display='none'; e.textContent=''; return; }
    e.className='adm-callout warn sm-err'; e.textContent=msg; e.style.display='flex';
    _smEl('sm-body').scrollTop=0;
  }
  function _smBusy(label){
    var b=_smEl('sm-save'); if(!b) return;
    b.disabled=!!label;
    b.innerHTML=label?'<span class="auth-spin" style="width:14px;height:14px"></span>'+label:(_sm.mode==='edit'?'Save changes':'Add student');
    [].forEach.call(document.querySelectorAll('#sm-form input,#sm-form .adm-chip,#sm-form .sm-linkbtn'),function(x){x.disabled=!!label;});
  }
  // Dialogs live inside .adm-page (its own stacking context, below the sticky top bar),
  // so move them to <body> when shown. Stale copies from earlier renders are removed first.
  function _admPortal(id){
    var m=document.getElementById(id);
    if(m&&m.parentElement!==document.body){
      [].forEach.call(document.querySelectorAll('body > #'+id),function(x){x.remove();});
      document.body.appendChild(m);
    }
    return m;
  }
  window._admPortal=_admPortal;
  function _smOpen(){
    _admPortal('student-modal');
    _smShowErr(''); ['s-name','s-email','s-pass'].forEach(function(id){_smFieldErr(id,false);});
    _smEl('sm-body').style.display=''; _smEl('sm-done').style.display='none'; _smEl('sm-foot').style.display='';
    var p=_smEl('s-pass'); p.type='password';
    _smRenderChips(); smPickValidity(_sm.validity); _smBusy(null);
    _smEl('student-modal').style.display='flex';
    document.addEventListener('keydown',_smEsc);
    setTimeout(function(){_smEl('s-name').focus();},30);
  }
  function _smEsc(e){ if(e.key==='Escape') closeModal(); }
  window.openAddStudent=()=>{
    _sm={mode:'add',validity:'90',orig:null};
    _smEl('modal-title').textContent='Add student';
    _smEl('sm-sub').textContent='They sign in with this email and password on any device.';
    ['s-id','s-name','s-email','s-pass','s-custom-date'].forEach(function(id){_smEl(id).value='';});
    _smEl('s-pass-label').textContent='Password';
    _smEl('s-pass').placeholder='At least 6 characters';
    _smEl('s-pass-hint').textContent='Minimum 6 characters. You can share it with the student after saving.';
    _smEl('s-email-hint').textContent='This is also their sign-in email.';
    _smOpen();
  };
  window.openEditStudent=(id)=>{
    const s=loadStudents()[id];if(!s)return;
    _sm={mode:'edit',validity:'keep',orig:{name:s.name,email:(s.email||'').toLowerCase(),validUntil:s.validUntil||null}};
    _smEl('modal-title').textContent='Edit student';
    _smEl('sm-sub').textContent=s.email||'';
    _smEl('s-id').value=s.id; _smEl('s-name').value=s.name||''; _smEl('s-email').value=s.email||'';
    _smEl('s-pass').value=''; _smEl('s-custom-date').value='';
    _smEl('s-pass-label').textContent='New password';
    _smEl('s-pass').placeholder='Leave blank to keep the current password';
    _smEl('s-pass-hint').textContent='Only fill this in to change their password.';
    _smEl('s-email-hint').textContent='Changing this also changes the email they sign in with.';
    _smOpen();
  };
  window.closeModal=()=>{
    _smGuideCreds=null; window._smCreds='';
    _smEl('student-modal').style.display='none';
    document.removeEventListener('keydown',_smEsc);
    var p=_smEl('s-pass'); if(p){p.value='';p.type='password';}
  };
  // Credentials for the guide exist only in this closure while the success screen is open.
  var _smGuideCreds=null;
  function _smDone(name,email,pass,isNew){
    _smEl('sm-body').style.display='none'; _smEl('sm-foot').style.display='none';
    var d=_smEl('sm-done'); d.style.display='';
    _smGuideCreds=pass?{name:name,email:email,password:pass}:null;
    d.innerHTML='<div class="sm-ok"><div class="sm-ok-ic"><svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.6" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg></div>'
      +'<h3>'+(isNew?'Student created successfully':(pass?'Password updated':'Changes saved'))+'</h3>'
      +'<p class="adm-hint" style="margin:4px 0 16px">'+escapeHtml(name)+(pass?' can now sign in with these details on any device.':'.')+'</p>'
      +(pass?'<div class="sm-cred"><div><span>Student</span><b style="font-family:inherit">'+escapeHtml(name)+'</b></div><div><span>Email</span><b>'+escapeHtml(email)+'</b></div><div><span>Password</span><b id="sm-cred-pass">'+escapeHtml(pass)+'</b></div></div>'
        +'<button type="button" id="sm-guide-btn" class="adm-btn adm-btn-primary adm-btn-lg" style="width:100%;margin-bottom:8px" onclick="smDownloadGuide(this)">'
          +'<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path d="M12 4v12m0 0l-4-4m4 4l4-4M4 18v1a2 2 0 002 2h12a2 2 0 002-2v-1"/></svg>Download Student Guide</button>'
        +'<p id="sm-guide-err" class="adm-hint" style="display:none;color:#fb7185;margin:0 0 8px"></p>'
        +'<button type="button" class="adm-btn" style="width:100%;margin-bottom:10px" onclick="smCopyCreds(this)">Copy sign-in details</button>':'')
      +'<button type="button" class="adm-btn'+(pass?'':' adm-btn-primary adm-btn-lg')+'" style="width:100%" onclick="closeModal();navigate(\'admin\',{tab:\'students\'})">Done</button></div>';
    window._smCreds=pass?('Email: '+email+'\nPassword: '+pass+'\nSign in at: '+new URL('./',location.href).href):'';
  }
  window.smDownloadGuide=async function(btn){
    var err=_smEl('sm-guide-err'); if(err) err.style.display='none';
    if(!_smGuideCreds) return;
    try{ await downloadStudentGuide(_smGuideCreds,btn); }
    catch(e){ if(err){ err.textContent='Could not create the PDF: '+(e.message||e); err.style.display='block'; } }
  };
  // Update ONLY this student in the local cache (saveStudents() would re-upload every student).
  function _smCacheStudent(stu){
    try{ var all=loadStudents(); all[stu.id]=stu; localStorage.setItem('brokeneng_students',JSON.stringify(all)); }catch(e){}
  }
  window.saveStudent=async()=>{
    const students=loadStudents();
    const existingId=_smEl('s-id').value;
    const isNew=!existingId;
    const id=existingId||genId();
    const name=_smEl('s-name').value.trim().replace(/\s+/g,' ');
    const email=_smEl('s-email').value.trim().toLowerCase();
    const pass=_smEl('s-pass').value;
    _smShowErr(''); ['s-name','s-email','s-pass'].forEach(function(x){_smFieldErr(x,false);});

    // ── validate ──
    var problems=[];
    if(!name){problems.push('Enter the student\'s full name.');_smFieldErr('s-name',true);}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)){problems.push('Enter a valid email address.');_smFieldErr('s-email',true);}
    if(isNew&&!pass){problems.push('Set a password so the student can sign in.');_smFieldErr('s-pass',true);}
    else if(pass&&pass.length<6){problems.push('Password must be at least 6 characters.');_smFieldErr('s-pass',true);}
    if(pass&&/^\s|\s$/.test(pass)){problems.push('Password can\'t start or end with a space.');_smFieldErr('s-pass',true);}
    const dup=Object.values(students).find(s=>(s.email||'').toLowerCase()===email&&s.id!==id);
    if(dup){problems.push('Another student already uses this email ('+dup.name+').');_smFieldErr('s-email',true);}
    var end=_smEndDate();
    if(end===undefined) problems.push('Pick an end date for course access.');
    if(problems.length){_smShowErr(problems.join(' '));return;}
    const validUntil=end?new Date(end.getTime()-end.getTimezoneOffset()*60000).toISOString().slice(0,10):null;

    const prev=students[id]||{};
    var stu={...prev,id,name,email,accessList:prev.accessList||[1],validUntil,createdAt:prev.createdAt||new Date().toISOString()};
    delete stu.password; // legacy field — passwords never live in the browser

    if(isNew){
      // 1. Profile row first — the Edge Function looks the student up by id.
      _smBusy('Saving…');
      var saved=await sbSaveStudent(stu);
      if(!saved||!saved.ok){_smShowErr('Could not create the student: '+((saved&&saved.error)||'unknown error')+'. Nothing was saved.');_smBusy(null);return;}
      _smCacheStudent(stu);
      // From here the student exists; a retry must update, not create a duplicate.
      _smEl('s-id').value=id; _sm.mode='edit'; _sm.orig={name:name,email:email,validUntil:validUntil};
      // 2. Create their Supabase Auth login.
      _smBusy('Creating login…');
      var r=await adminUpdateStudentLogin(id,{newPassword:pass});
      if(!r.success){
        _smShowErr('The student was added, but their login could not be created: '+(r.error||'unknown error')+'. Fix the problem and press Save again, or set a password later from Manage.');
        _smBusy(null);return;
      }
      _smBusy(null);
      _smDone(name,email,pass,true);
      return;
    }

    // Existing student: change login email/password FIRST. If that fails, nothing changes.
    const emailChanged=!!(_sm.orig&&email!==_sm.orig.email);
    if(emailChanged||pass){
      _smBusy(emailChanged?'Updating sign-in email…':'Updating password…');
      var r2=await adminUpdateStudentLogin(id,{newEmail:emailChanged?email:undefined,newPassword:pass||undefined});
      if(!r2.success){
        _smShowErr((emailChanged?'Email not changed: ':'Password not changed: ')+(r2.error||'unknown error'));
        if(/email/i.test(r2.error||'')) _smFieldErr('s-email',true);
        _smBusy(null);return;
      }
    }
    _smBusy('Saving…');
    var saved2=await sbSaveStudent(stu);
    if(!saved2||!saved2.ok){
      _smShowErr((emailChanged||pass?'Login updated, but ':'')+'the profile could not be saved: '+((saved2&&saved2.error)||'unknown error')+'. Press Save again.');
      _smBusy(null);return;
    }
    _smCacheStudent(stu);
    _smBusy(null);
    if(pass) _smDone(name,email,pass,false);
    else { closeModal(); navigate('admin',{tab:'students'}); if(typeof demoToast==='function') demoToast('Saved '+name); }
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
    const modal=_admPortal('delete-modal');
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
