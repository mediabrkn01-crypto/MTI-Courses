/* settings.js — extracted verbatim from the original single-file index.html.
   Source lines: 3282-3297, 3866-4110
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
// ── PER-STUDENT MANAGE ────────────────────────────────────────────────────────
window.checkSupabaseSync = async function(){
  var el = document.getElementById('sync-status');
  if(!el) return;
  el.textContent = 'Checking...';
  try{
    var r = await _sb.from('course_config').select('id,updated_at,data').eq('id','videos').single();
    if(r.error){ el.textContent = '✗ Error: '+r.error.message; el.style.color='#f87171'; return; }
    if(!r.data){ el.textContent = '✗ No data in Supabase. Click "Force Push Videos".'; el.style.color='#fbbf24'; return; }
    var keys = Object.keys(r.data.data||{});
    el.textContent = '✓ Supabase has '+keys.length+' video entries. Last updated: '+(r.data.updated_at||'unknown');
    el.style.color='#4ade80';
    console.log('Supabase video data:', r.data.data);
  }catch(e){ el.textContent='✗ '+e.message; el.style.color='#f87171'; }
};

// Admin credential functions removed — admin now authenticates via Supabase Auth.
// Run scripts/bootstrap-admin.js to set up the admin account.
// Delete course_config WHERE id = 'admin_cred' after bootstrap.
function getAdminCredentials(){ return {email:'',password:''}; } // stub for any remaining references
window.saveAdminCredentials=function(){
  // Admin password changes are now done via Supabase Auth (password reset flow)
  uiAlert('To change admin password, use "Admin Forgot Password" on the login screen.\nAdmin credentials are managed via Supabase Auth — not stored in this app.');
};
async function sbSaveAdminCred(){ /* removed */ }
async function sbLoadAdminCred(){ /* removed — admin_cred row should be deleted from course_config */ }

function renderAdminSettings(){
  // SECURITY: API key never stored in browser — only voice preference
  var elVoice=localStorage.getItem('brokeneng_el_voice')||'21m00Tcm4TlvDq8ikWAM';
  var SI={
    wrench:'<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 005.4-5.4l-2.5 2.5-2.4-.6-.6-2.4 2.5-2.5z"/></svg>',
    mic:'<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0014 0M12 17v5"/></svg>',
    sync:'<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12a9 9 0 01-15.5 6.2M3 12A9 9 0 0118.5 5.8"/><path d="M21 3v5h-5M3 21v-5h5"/></svg>',
    live:'<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="6" width="14" height="12" rx="2"/><path d="M16 10l6-3v10l-6-3"/></svg>',
    clock:'<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    shield:'<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg>',
    db:'<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>'
  };
  var okCheck='<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;margin-top:1px"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg>';
  var NAV=[['st-maint','wrench','Maintenance'],['st-live','live','Live sessions'],['st-voice','mic','Voice engine'],['st-course','clock','Course rules'],['st-data','db','Data & sync'],['st-security','shield','Security']];
  // One settings section: title + description on the left, controls on the right.
  function sec(id,icon,tone,title,desc,body){
    return '<section class="st-sec" id="'+id+'"><div class="st-sec-head"><span class="adm-set-ico '+tone+'">'+SI[icon]+'</span>'
      +'<div style="min-width:0"><h2 class="st-sec-title">'+title+'</h2><p class="st-sec-desc">'+desc+'</p></div></div>'
      +'<div class="st-sec-body">'+body+'</div></section>';
  }
  function row(label,hint,control){
    return '<div class="st-row"><div class="st-row-l"><p class="st-row-t">'+label+'</p>'+(hint?'<p class="st-row-h">'+hint+'</p>':'')+'</div><div class="st-row-c">'+control+'</div></div>';
  }

  app.innerHTML=adminTopBar('settings')+`
  <div class="adm-page">
    ${admHead('Settings','Platform-wide configuration for students, classes and data.')}
    <div class="st-layout">
      <nav class="st-nav" aria-label="Settings sections">
        ${NAV.map(function(n,i){return '<a href="#'+n[0]+'" class="st-nav-a'+(i===0?' on':'')+'" onclick="event.preventDefault();stGo(\''+n[0]+'\')">'+SI[n[1]]+'<span>'+n[2]+'</span></a>';}).join('')}
      </nav>
      <div class="st-main">

      ${sec('st-maint','wrench','orange','System maintenance','Blocks students and demo visitors while you update the platform. Admins and one chosen test account keep access.',
        `<div id="maint-section" class="st-maint">
          <div class="st-maint-top">
            <div id="maint-status-row" class="st-maint-state"><span class="adm-skel"></span></div>
            <button id="maint-toggle-btn" type="button" onclick="adminToggleMaintenance()" class="adm-btn adm-btn-lg" disabled>Loading…</button>
          </div>
          <p id="maint-action-status" class="st-action-msg"></p>
          <div id="maint-active-info" style="display:none" class="st-bypass-on">
            <span class="st-k">Maintenance bypass account</span>
            <p id="maint-active-bypass-name" class="st-bypass-name">—</p>
            <p class="st-row-h" style="margin:0">Only this student can access the platform during maintenance.</p>
          </div>
        </div>
        <div id="maint-bypass-section">
          ${row('Test account bypass','Required before enabling. This student signs in with their normal password and keeps full access.',
            `<div class="st-picker">
              ${admSearch('maint-bypass-search','Search student by name or email…','adminSearchBypassStudent(this.value)')}
              <div id="maint-bypass-results" class="st-results"></div>
              <div id="maint-bypass-selected" class="st-selected"></div>
            </div>`)}
        </div>
        ${row('Message shown to students','Optional. Appears under the maintenance notice on the login page.',
          `<input id="maint-msg" type="text" class="adm-input" placeholder="We're updating the platform. Access will be restored shortly."/>`)}`)}

      ${sec('st-live','live','blue','Live With Sreekanth','Upcoming live sessions. Students who complete all 30 classes can register.',
        `<div id="live-sessions-list" class="st-sessions"></div>
        <div class="st-add">
          <p class="st-row-t" style="margin-bottom:10px">Add a session</p>
          <div class="st-add-grid">
            <input id="ls-title" type="text" class="adm-input" placeholder="Title — e.g. Live Class, Week 1"/>
            <input id="ls-date" type="text" class="adm-input" placeholder="When — e.g. Sat, 10 Aug · 7:00 PM IST"/>
            <input id="ls-link" type="url" class="adm-input" placeholder="Zoom / Google Meet link"/>
          </div>
          <p id="ls-err" class="st-action-msg" style="color:#fb7185"></p>
          <button onclick="adminAddLiveSession()" class="adm-btn adm-btn-primary">${ADM_ICON.plus}Add session</button>
        </div>`)}

      ${sec('st-voice','mic','pink','ElevenLabs voice engine','The voice every student hears in pronunciation playback.',
        `${row('Voice ID','Default: Rachel (21m00Tcm4TlvDq8ikWAM). Find IDs at elevenlabs.io/voice-library.',
          `<input id="el-voice-id" type="text" class="adm-input st-mono" value="${escapeAttr(elVoice)}" placeholder="21m00Tcm4TlvDq8ikWAM"/>
           <div class="st-btns"><button onclick="adminSaveELSettings()" class="adm-btn adm-btn-primary">Save voice</button><button onclick="adminTestEL()" class="adm-btn">Test voice</button><span id="el-status" class="st-inline-msg"></span></div>`)}
        <div class="adm-callout ok">${okCheck}<span>The API key is stored server-side. To rotate it, change it in the ElevenLabs dashboard, then run <code>supabase secrets set ELEVENLABS_API_KEY=…</code></span></div>`)}

      ${sec('st-course','clock','grey','Course rules','How the course opens up for students.',
        row('Daily unlock limit','New classes a student can unlock per day. Set by the DAILY_DRIP constant in the code.',
          `<div class="st-stat"><b>${DAILY_DRIP}</b><span>classes / day</span></div>`))}

      ${sec('st-data','db','blue','Data & sync','Check the server connection, sync the video list, or back up everything.',
        `${row('Server connection','Verifies the video list stored in Supabase.',
          `<div class="st-btns"><button onclick="checkSupabaseSync()" class="adm-btn">Check connection</button><button onclick="forcePushVideos()" class="adm-btn">${ADM_ICON.upload}Push videos</button><button onclick="forcePullVideos()" class="adm-btn"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="transform:rotate(180deg)"><path d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>Pull videos</button></div>
           <p id="sync-status" class="st-row-h" style="margin-top:10px"></p>`)}
        ${row('Backup','Download students, videos and progress as a JSON file, or restore from one.',
          `<div class="st-btns"><button onclick="exportData()" class="adm-btn">Export all data</button><button onclick="importDataPrompt()" class="adm-btn">Import data</button></div>
           <input id="import-file" type="file" accept=".json" style="display:none" onchange="doImport(event)"/>`)}`)}

      ${sec('st-security','shield','green','Security','How admin access is managed.',
        `<div class="adm-callout ok">${okCheck}<span>Admin sign-in uses Supabase Auth — no passwords are stored in the browser.</span></div>
        <p class="st-row-h" style="margin:12px 0 0">To change the admin password, use <strong style="color:#fff">Forgot password</strong> on the admin login screen, or update it in Supabase → Authentication → Users.</p>`)}

      </div>
    </div>
  </div>`;

  // Left nav: smooth-scroll to a section and highlight the one in view.
  window.stGo=function(id){ var el=document.getElementById(id); if(el) window.scrollTo({top:el.getBoundingClientRect().top+window.scrollY-90,behavior:'smooth'}); };
  try{
    var _stObs=new IntersectionObserver(function(es){
      es.forEach(function(e){ if(e.isIntersecting){ [].forEach.call(document.querySelectorAll('.st-nav-a'),function(a){ a.classList.toggle('on',a.getAttribute('href')==='#'+e.target.id); }); } });
    },{rootMargin:'-90px 0px -60% 0px'});
    [].forEach.call(document.querySelectorAll('.st-sec'),function(s){ _stObs.observe(s); });
  }catch(e){}
  _renderBypassSelected();

  window.exportData=()=>{
    const students=loadStudents();
    const progressData={};
    Object.keys(students).forEach(sid=>{progressData[sid]=[...loadProgress(sid)];});
    const data={students,videos:loadVideos(),progress:progressData};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);
    a.download='broken-english-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();
  };
  window.importDataPrompt=()=>document.getElementById('import-file').click();
  window.doImport=(e)=>{
    const file=e.target.files[0];if(!file)return;
    const r=new FileReader();
    r.onload=(ev)=>{
      try{
        const data=JSON.parse(ev.target.result);
        if(data.students)saveStudents(data.students);
        if(data.videos)saveVideos(data.videos);
        if(data.progress){Object.entries(data.progress).forEach(([sid,arr])=>{saveProgress(sid,new Set(arr));});}
        uiAlert('Students, videos and progress were restored from the backup.',{title:'Import complete',tone:'ok'});renderAdminSettings();
      }catch{uiAlert('Invalid JSON file.',{tone:'error'});}
    };
    r.readAsText(file);
  };
  refreshLiveSessionsList();
  adminLoadMaintenanceStatus();
}

// In-memory state for the currently selected bypass student (admin UI only)
window._maintSelectedBypass=null; // {authUserId, name, email} or null

async function adminLoadMaintenanceStatus(){
  var statusRow=document.getElementById('maint-status-row');
  var btn=document.getElementById('maint-toggle-btn');
  var msgInput=document.getElementById('maint-msg');
  var activeInfo=document.getElementById('maint-active-info');
  var bypassSection=document.getElementById('maint-bypass-section');
  if(!statusRow||!btn) return;
  if(typeof _sb==='undefined'){statusRow.textContent='Supabase not connected.';return;}
  try{
    var r=await _sb.from('course_config').select('data').eq('id','maintenance_mode').maybeSingle();
    var cfg=(r.data&&r.data.data)||{};
    var enabled=!!cfg.enabled;
    var msg=cfg.message||'';
    var bypassAuthUid=cfg.bypass_auth_user_id||null;
    var bypassName=cfg.bypass_student_name||null;
    var bypassEmail=cfg.bypass_student_email||null;
    _maintenanceActive=enabled;
    _maintBypassAuthUserId=bypassAuthUid;

    // Populate UI
    if(msgInput&&!msgInput.value) msgInput.value=msg;

    // Status
    statusRow.innerHTML=enabled
      ?'<span class="st-dot on"></span><div><b>Maintenance is ON</b><span>Students and demo visitors are blocked.</span></div>'
      :'<span class="st-dot"></span><div><b>App is live</b><span>Everyone can sign in normally.</span></div>';
    var maintCard=document.getElementById('maint-section');
    if(maintCard) maintCard.classList.toggle('maint-on',enabled);

    if(activeInfo) activeInfo.style.display=enabled?'block':'none';
    var bypassNameEl=document.getElementById('maint-active-bypass-name');
    if(bypassNameEl) bypassNameEl.innerHTML=bypassName?('<b>'+escapeHtml(bypassName)+'</b>'+(bypassEmail?'<span>'+escapeHtml(bypassEmail)+'</span>':'')):'None selected';

    if(bypassSection) bypassSection.style.display=enabled?'none':'block';

    if(bypassAuthUid&&bypassName&&!window._maintSelectedBypass){
      window._maintSelectedBypass={authUserId:bypassAuthUid,name:bypassName,email:bypassEmail||''};
      _renderBypassSelected();
    }

    btn.disabled=false;
    btn.textContent=enabled?'Turn maintenance off':'Turn maintenance on';
    btn.className='adm-btn adm-btn-lg '+(enabled?'st-btn-off':'st-btn-on');

    // Admin top-bar badge
    var badge=document.getElementById('admin-maint-badge');
    if(badge){
      badge.style.display=enabled?'inline-flex':'none';
      badge.textContent=enabled?('Maintenance on'+(bypassName?' · Bypass: '+bypassName:'')):'';
    }
  }catch(e){
    if(statusRow) statusRow.textContent='Error loading status: '+e.message;
  }
}

function _renderBypassSelected(){
  var el=document.getElementById('maint-bypass-selected');
  if(!el) return;
  var bp=window._maintSelectedBypass;
  if(!bp){ el.className='st-selected empty'; el.textContent='No test account selected yet.'; return; }
  el.className='st-selected';
  el.innerHTML='<span class="st-sel-av">'+escapeHtml((bp.name||'?').trim().charAt(0).toUpperCase())+'</span>'
    +'<div style="min-width:0;flex:1"><b>'+escapeHtml(bp.name)+'</b><span>'+escapeHtml(bp.email)+'</span></div>'
    +'<button type="button" class="adm-btn" onclick="adminClearBypassStudent()">Change</button>';
}

var _bypassResults=[];
window.adminSearchBypassStudent=async function(query){
  var results=document.getElementById('maint-bypass-results');
  if(!results) return;
  if(!query||query.trim().length<2){results.innerHTML='';return;}
  if(typeof _sb==='undefined'){results.innerHTML='<p class="st-row-h" style="color:#fb7185">Supabase not connected.</p>';return;}
  try{
    var q=query.trim().replace(/[,()%]/g,' ');
    var r=await _sb.from('students').select('id,name,email,auth_user_id')
      .or('name.ilike.%'+q+'%,email.ilike.%'+q+'%').limit(6);
    if(r.error||!r.data||!r.data.length){ results.innerHTML='<p class="st-row-h" style="padding:6px 2px">No students found.</p>'; return; }
    _bypassResults=r.data;
    results.innerHTML=r.data.map(function(s,i){
      var ok=!!s.auth_user_id;
      return '<button type="button" class="st-res'+(ok?'':' off')+'" onclick="adminPickBypass('+i+')"'+(ok?'':' title="No login account yet — set a password for this student first"')+'>'
        +'<b>'+escapeHtml(s.name||'')+'</b><span>'+escapeHtml(s.email||'')+'</span>'+(ok?'':'<em>No login yet</em>')+'</button>';
    }).join('');
  }catch(e){
    results.innerHTML='<p class="st-row-h" style="color:#fb7185">Error: '+escapeHtml(e.message)+'</p>';
  }
};
window.adminPickBypass=function(i){
  var s=_bypassResults[i]; if(!s) return;
  if(!s.auth_user_id){ uiAlert('This student has no login account yet, so they cannot be the bypass account. Set a password for them first from Manage.',{title:'No login account'}); return; }
  adminSelectBypassStudent(s.auth_user_id,s.name||'',s.email||'');
};

window.adminSelectBypassStudent=function(authUserId,name,email){
  window._maintSelectedBypass={authUserId:authUserId,name:name,email:email};
  var results=document.getElementById('maint-bypass-results');
  if(results) results.innerHTML='';
  var searchInput=document.getElementById('maint-bypass-search');
  if(searchInput) searchInput.value='';
  _renderBypassSelected();
};

window.adminClearBypassStudent=function(){
  window._maintSelectedBypass=null;
  _renderBypassSelected();
};

async function adminToggleMaintenance(){
  if(typeof _sb==='undefined'){uiAlert('Supabase not connected.');return;}
  var statusEl=document.getElementById('maint-action-status');
  var msgInput=document.getElementById('maint-msg');
  if(statusEl) statusEl.textContent='';
  try{
    var r=await _sb.from('course_config').select('data').eq('id','maintenance_mode').maybeSingle();
    var currentEnabled=!!(r.data&&r.data.data&&r.data.data.enabled);
    var newEnabled=!currentEnabled;
    var msgVal=(msgInput&&msgInput.value.trim())||'';

    // Require bypass student selected before enabling
    if(newEnabled&&!window._maintSelectedBypass){
      if(statusEl) statusEl.innerHTML='<span style="color:#f87171">Select a Test Account before enabling Maintenance Mode.</span>';
      return;
    }

    var bp=window._maintSelectedBypass;
    var bypassDesc=bp?bp.name+' ('+bp.email+')':'None';
    var action=newEnabled?'ENABLE':'DISABLE';

    showDemoConfirm({
      title:(newEnabled?'Enable':'Disable')+' Maintenance Mode',
      message:newEnabled
        ?'All student accounts and demo users will be blocked.\n\nTest Account:\n'+bypassDesc+'\n\nwill remain accessible for production testing.'
        :'All students will regain full access automatically.',
      confirmText:action,
      type:newEnabled?'danger':'warn',
      onConfirm:async function(){
        var btn=document.getElementById('maint-toggle-btn');
        if(btn){btn.disabled=true;btn.textContent='Saving...';}
        try{
          var newData={
            enabled:newEnabled,
            message:msgVal,
            bypass_auth_user_id:newEnabled&&bp?bp.authUserId:null,
            bypass_student_name:newEnabled&&bp?bp.name:null,
            bypass_student_email:newEnabled&&bp?bp.email:null,
            enabled_at:newEnabled?new Date().toISOString():null,
            enabled_by:currentSession&&currentSession.authUserId||'admin',
            updated_at:new Date().toISOString()
          };
          await _sb.from('course_config').upsert(
            {id:'maintenance_mode',data:newData},
            {onConflict:'id'}
          );
          _maintenanceActive=newEnabled;
          _maintBypassAuthUserId=newEnabled&&bp?bp.authUserId:null;
          if(!newEnabled) window._maintSelectedBypass=null;
          if(statusEl) statusEl.innerHTML='<span style="color:'+(newEnabled?'#f97316':'#4ade80')+'">'+(newEnabled?'Maintenance enabled.':'Maintenance disabled.')+'</span>';
          await adminLoadMaintenanceStatus();
        }catch(e){
          if(statusEl) statusEl.textContent='Error: '+e.message;
          if(btn) btn.disabled=false;
          await adminLoadMaintenanceStatus();
        }
      }
    });
  }catch(e){
    if(statusEl) statusEl.textContent='Error: '+e.message;
  }
}

function adminAddLiveSession(){
  var title=document.getElementById('ls-title').value.trim();
  var date=document.getElementById('ls-date').value.trim();
  var link=document.getElementById('ls-link').value.trim();
  var err=document.getElementById('ls-err');
  if(!title||!date){ if(err) err.textContent='Add a title and a date & time.'; (title?document.getElementById('ls-date'):document.getElementById('ls-title')).focus(); return; }
  if(link&&!/^https?:\/\//i.test(link)){ if(err) err.textContent='The meeting link must start with https://'; document.getElementById('ls-link').focus(); return; }
  if(err) err.textContent='';
  var sessions=JSON.parse(localStorage.getItem('brokeneng_live_sessions')||'[]');
  sessions.push({title:title,date:date,link:link});
  localStorage.setItem('brokeneng_live_sessions',JSON.stringify(sessions));
  document.getElementById('ls-title').value='';
  document.getElementById('ls-date').value='';
  document.getElementById('ls-link').value='';
  refreshLiveSessionsList();
}
async function adminRemoveLiveSession(idx){
  var sessions=JSON.parse(localStorage.getItem('brokeneng_live_sessions')||'[]');
  var s=sessions[idx]; if(!s) return;
  if(!(await uiConfirm('Remove "'+s.title+'" ('+s.date+')?',{title:'Remove session',danger:true,okText:'Remove'}))) return;
  sessions.splice(idx,1);
  localStorage.setItem('brokeneng_live_sessions',JSON.stringify(sessions));
  refreshLiveSessionsList();
}
function refreshLiveSessionsList(){
  var el=document.getElementById('live-sessions-list'); if(!el) return;
  var list=JSON.parse(localStorage.getItem('brokeneng_live_sessions')||'[]');
  el.innerHTML=list.length?list.map(function(s,i){
    var safeLink=/^https?:\/\//i.test(s.link||'')?s.link:'';
    return '<div class="st-session"><span class="st-session-ic">'+(i+1)+'</span><div style="min-width:0;flex:1">'
      +'<b>'+escapeHtml(s.title)+'</b><span>'+escapeHtml(s.date)+'</span>'
      +(safeLink?'<a href="'+escapeAttr(safeLink)+'" target="_blank" rel="noopener">'+escapeHtml(safeLink.replace(/^https?:\/\//,''))+'</a>':'')+'</div>'
      +'<button type="button" class="adm-btn adm-btn-danger adm-icon-btn" onclick="adminRemoveLiveSession('+i+')" aria-label="Remove session" title="Remove">'+ADM_ICON.trash+'</button></div>';
  }).join(''):'<div class="st-none">No sessions scheduled yet.</div>';
}
