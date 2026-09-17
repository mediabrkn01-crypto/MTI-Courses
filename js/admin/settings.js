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
  alert('To change admin password, use "Admin Forgot Password" on the login screen.\nAdmin credentials are managed via Supabase Auth — not stored in this app.');
};
async function sbSaveAdminCred(){ /* removed */ }
async function sbLoadAdminCred(){ /* removed — admin_cred row should be deleted from course_config */ }

function renderAdminSettings(){
  // SECURITY: API key never stored in browser — only voice preference
  var elVoice=localStorage.getItem('brokeneng_el_voice')||'21m00Tcm4TlvDq8ikWAM';
  app.innerHTML=adminTopBar('settings')+`
  <div style="padding:24px;max-width:1280px;position:relative;z-index:1">
    <h1 style="font-size:22px;font-weight:800;color:#fff;margin-bottom:4px;font-family:'Montserrat',sans-serif">Settings</h1>
    <p style="font-size:13px;color:var(--muted);margin-bottom:24px">Global course configuration.</p>
    <div class="settings-grid">

    <!-- MAINTENANCE MODE SECTION -->
    <div class="lg" id="maint-section" style="padding:20px;margin-bottom:20px;border:1px solid rgba(255,100,0,.3);background:rgba(255,100,0,.05)">
      <p style="font-weight:700;font-size:15px;color:#f97316;margin-bottom:4px">🚧 System Maintenance</p>
      <p style="font-size:12px;color:var(--muted);margin-bottom:16px">Global maintenance blocks ALL students and demo users. One selected test account bypasses it for production verification. Admin always has access.</p>

      <div id="maint-status-row" style="margin-bottom:14px;font-size:12px;color:var(--muted)">Loading status...</div>
      <div id="maint-active-info" style="display:none;margin-bottom:14px;padding:12px 14px;background:rgba(255,100,0,.08);border:1px solid rgba(255,100,0,.2);border-radius:8px;font-size:12px;line-height:1.8">
        <div style="color:#f97316;font-weight:700;margin-bottom:4px">🔴 Maintenance is ACTIVE</div>
        <div style="color:rgba(255,255,255,.7)">Students Blocked: <strong style="color:#fff">All Students &amp; Demo Users</strong></div>
        <div id="maint-active-bypass-info" style="color:rgba(255,255,255,.7)">Maintenance Bypass: <strong style="color:#4ade80" id="maint-active-bypass-name">—</strong></div>
      </div>

      <div id="maint-bypass-section" style="margin-bottom:16px;padding:14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:10px">
        <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);display:block;margin-bottom:6px;font-family:JetBrains Mono,monospace">Test Account Bypass</label>
        <p style="font-size:12px;color:rgba(255,255,255,.5);margin-bottom:10px">This student gets full access during maintenance. Required before enabling.</p>
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <input id="maint-bypass-search" type="text" placeholder="Search student by name or email…" oninput="adminSearchBypassStudent(this.value)"
            style="flex:1;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;font-size:12px;padding:9px 12px;outline:none;box-sizing:border-box"/>
        </div>
        <div id="maint-bypass-results" style="margin-bottom:8px"></div>
        <div id="maint-bypass-selected" style="padding:10px 12px;background:rgba(255,255,255,.04);border:1px dashed rgba(255,255,255,.1);border-radius:8px;font-size:12px;color:var(--muted)">No test account selected — select one before enabling maintenance.</div>
      </div>

      <div style="margin-bottom:14px">
        <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);display:block;margin-bottom:6px;font-family:JetBrains Mono,monospace">Student-facing Message (optional)</label>
        <input id="maint-msg" type="text" placeholder="We're updating the platform. Access will be restored shortly." style="width:100%;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;font-size:12px;padding:10px 14px;outline:none;box-sizing:border-box"/>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        <button id="maint-toggle-btn" onclick="adminToggleMaintenance()" style="width:auto;padding:9px 20px;font-size:13px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);border-radius:8px;color:#fff;font-weight:700;cursor:pointer">Loading...</button>
        <span id="maint-action-status" style="font-size:12px;color:var(--muted)"></span>
      </div>
    </div>

    <!-- ELEVENLABS VOICE SECTION -->
    <div class="lg" style="padding:20px;margin-bottom:20px;border:1px solid rgba(255,45,120,.25);background:rgba(255,45,120,.05)">
      <p style="font-weight:700;font-size:15px;color:var(--g1);margin-bottom:4px">🎙 ElevenLabs Voice Engine</p>
      <p style="font-size:12px;color:var(--muted);margin-bottom:16px">Set once here — all students get your custom voice model automatically.</p>
      <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);border-radius:8px;margin-bottom:12px">
        <svg width="16" height="16" fill="none" stroke="#4ade80" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
        <span style="font-size:12px;color:#4ade80;font-weight:600">API key configured server-side — rotate it via ElevenLabs dashboard + <code style="background:rgba(0,0,0,.3);padding:1px 5px;border-radius:4px">supabase secrets set ELEVENLABS_API_KEY=...</code></span>
      </div>
      <div style="margin-bottom:12px">
        <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);display:block;margin-bottom:6px;font-family:JetBrains Mono,monospace">Voice ID</label>
        <input id="el-voice-id" type="text" value="${elVoice}" placeholder="21m00Tcm4TlvDq8ikWAM"
          style="width:100%;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;font-size:12px;padding:10px 14px;outline:none;box-sizing:border-box;font-family:JetBrains Mono,monospace"/>
        <div style="font-size:10px;color:var(--muted);margin-top:4px">Default: Rachel (21m00Tcm4TlvDq8ikWAM). Find voice IDs at elevenlabs.io/voice-library</div>
      </div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <button onclick="adminSaveELSettings()" class="btn-primary" style="width:auto;padding:9px 20px;font-size:13px">Save Voice Preference</button>
        <button onclick="adminTestEL()" style="padding:9px 16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;font-size:12px;cursor:pointer;font-weight:600">🔊 Test Voice</button>
        <span id="el-status" style="font-size:12px;color:var(--muted)"></span>
      </div>
    </div>

      <!-- SUPABASE SYNC SECTION -->
      <div class="lg" style="padding:20px;margin-bottom:20px;border:1px solid rgba(255,165,0,.25);background:rgba(255,165,0,.05)">
        <p style="font-weight:700;font-size:15px;color:var(--g3);margin-bottom:8px">🔄 Supabase Sync</p>
        <div id="sync-status" style="font-size:12px;color:var(--muted);margin-bottom:14px;line-height:1.6">Click Check to verify connection...</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button onclick="checkSupabaseSync()" class="btn-primary" style="width:auto;padding:8px 16px;font-size:12px">Check Supabase</button>
          <button onclick="forcePushVideos()" style="padding:8px 16px;background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.3);border-radius:8px;color:#4ade80;font-size:12px;cursor:pointer;font-weight:600">⬆ Push Videos to Supabase</button>
          <button onclick="forcePullVideos()" style="padding:8px 16px;background:rgba(59,130,246,.15);border:1px solid rgba(59,130,246,.3);border-radius:8px;color:#60a5fa;font-size:12px;cursor:pointer;font-weight:600">⬇ Pull from Supabase</button>
        </div>
      </div>

    <!-- LIVE SESSIONS SECTION -->
    <div class="lg" style="padding:20px;margin-bottom:20px;border:1px solid rgba(99,179,237,.25);background:rgba(99,179,237,.05)">
      <p style="font-weight:700;font-size:15px;color:#63b3ed;margin-bottom:4px">📡 Live With Sreekanth</p>
      <p style="font-size:12px;color:var(--muted);margin-bottom:16px">Manage live session dates. Students who complete all 30 classes can register.</p>
      <div id="live-sessions-list" style="margin-bottom:14px"></div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">
        <input id="ls-title" type="text" placeholder="Session title (e.g. Live Class — Week 1)" style="width:100%;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;font-size:12px;padding:10px 14px;outline:none;box-sizing:border-box"/>
        <input id="ls-date" type="text" placeholder="Date & time (e.g. Saturday, August 10 — 7:00 PM IST)" style="width:100%;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;font-size:12px;padding:10px 14px;outline:none;box-sizing:border-box"/>
        <input id="ls-link" type="text" placeholder="Zoom / Google Meet link (e.g. https://zoom.us/j/...)" style="width:100%;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;font-size:12px;padding:10px 14px;outline:none;box-sizing:border-box"/>
      </div>
      <button onclick="adminAddLiveSession()" class="btn-primary" style="width:auto;padding:9px 20px;font-size:13px">Add Session</button>
    </div>

    ${[
      {
        title:'Daily Drip Limit',
        body:`<p style="font-size:13px;color:rgba(255,255,255,0.65);margin-bottom:12px">Students can unlock up to <strong style="color:#FF7100">${DAILY_DRIP} new classes per day</strong>. Change the <code style="background:rgba(255,255,255,0.1);padding:1px 5px;border-radius:4px;font-size:12px">DAILY_DRIP</code> constant in the source code to adjust.</p>
        <div style="background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:12px 16px;font-family:monospace;font-size:12px;color:rgba(255,255,255,0.7)">const DAILY_DRIP = ${DAILY_DRIP};</div>`
      },
      {
        title:'Admin Credentials',
        body:`<p style="font-size:13px;color:rgba(255,255,255,0.65);margin-bottom:14px">Admin authentication is now managed via Supabase Auth.</p>
        <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);border-radius:8px;margin-bottom:14px">
          <svg width="16" height="16" fill="none" stroke="#4ade80" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
          <span style="font-size:12px;color:#4ade80;font-weight:600">Credentials managed server-side — no passwords stored in browser</span>
        </div>
        <p style="font-size:12px;color:var(--muted);line-height:1.6">To change the admin password: use <strong style="color:#fff">Admin Forgot Password</strong> on the login screen, or update directly in Supabase Auth → Users dashboard.</p>`
      },
      {
        title:'Data Management',
        body:`<p style="font-size:13px;color:rgba(255,255,255,0.65);margin-bottom:14px">Student data is stored in browser localStorage. Export to JSON for backup.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          ${glassBtn('Export All Data','exportData()')}
          ${glassBtn('Import Data','importDataPrompt()')}
        </div>
        <input id="import-file" type="file" accept=".json" style="display:none" onchange="doImport(event)"/>`
      }
    ].map(s=>`<div class="lg" style="padding:20px;margin-bottom:16px">
      <p style="font-size:13px;font-weight:700;color:var(--brand-2);margin-bottom:10px">${s.title}</p>
      ${s.body}
    </div>`).join('')}
  </div>
  </div>`;

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
        alert('Import successful!');renderAdminSettings();
      }catch{alert('Invalid JSON file.');}
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

    // Status badge
    statusRow.innerHTML=enabled
      ?'<span style="display:inline-flex;align-items:center;gap:6px;background:rgba(255,100,0,.15);border:1px solid rgba(255,100,0,.4);border-radius:6px;padding:4px 10px;font-size:12px;color:#f97316;font-weight:700">🚧 MAINTENANCE IS ON</span>'
      :'<span style="display:inline-flex;align-items:center;gap:6px;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.25);border-radius:6px;padding:4px 10px;font-size:12px;color:#4ade80;font-weight:700">✓ App is LIVE</span>';

    // Active info panel
    if(activeInfo) activeInfo.style.display=enabled?'block':'none';
    var bypassNameEl=document.getElementById('maint-active-bypass-name');
    if(bypassNameEl) bypassNameEl.textContent=bypassName?(bypassName+(bypassEmail?' ('+bypassEmail+')':'')):'None selected';

    // Bypass section — show/hide search depending on state
    if(bypassSection) bypassSection.style.display=enabled?'none':'block';

    // If config has a bypass student, prefill _maintSelectedBypass
    if(bypassAuthUid&&bypassName&&!window._maintSelectedBypass){
      window._maintSelectedBypass={authUserId:bypassAuthUid,name:bypassName,email:bypassEmail||''};
      _renderBypassSelected();
    }

    // Toggle button
    btn.textContent=enabled?'Disable Maintenance':'Enable Maintenance';
    btn.style.background=enabled?'rgba(34,197,94,.15)':'rgba(255,100,0,.2)';
    btn.style.borderColor=enabled?'rgba(34,197,94,.4)':'rgba(255,100,0,.5)';
    btn.style.color=enabled?'#4ade80':'#f97316';

    // Admin top-bar badge
    var badge=document.getElementById('admin-maint-badge');
    if(badge){
      badge.style.display=enabled?'inline-flex':'none';
      badge.textContent=enabled?('🚧 MAINTENANCE ON'+(bypassName?' | Bypass: '+bypassName:'')):'';
    }
  }catch(e){
    if(statusRow) statusRow.textContent='Error loading status: '+e.message;
  }
}

function _renderBypassSelected(){
  var el=document.getElementById('maint-bypass-selected');
  if(!el) return;
  var bp=window._maintSelectedBypass;
  if(!bp){
    el.innerHTML='<span style="color:var(--muted)">No test account selected — select one before enabling maintenance.</span>';
    return;
  }
  el.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;gap:10px">'
    +'<div><div style="color:#4ade80;font-weight:700;font-size:12px">✓ '+escapeHtml(bp.name)+'</div>'
    +'<div style="color:var(--muted);font-size:11px">'+escapeHtml(bp.email)+'</div></div>'
    +'<button onclick="adminClearBypassStudent()" style="padding:4px 10px;background:rgba(255,0,0,.1);border:1px solid rgba(255,0,0,.2);border-radius:6px;color:#f87171;font-size:11px;cursor:pointer">Remove</button>'
    +'</div>';
}

window.adminSearchBypassStudent=async function(query){
  var results=document.getElementById('maint-bypass-results');
  if(!results) return;
  if(!query||query.trim().length<2){results.innerHTML='';return;}
  if(typeof _sb==='undefined'){results.innerHTML='<div style="font-size:12px;color:#f87171;padding:6px">Supabase not connected.</div>';return;}
  try{
    var q=query.trim();
    var r=await _sb.from('students').select('id,name,email,auth_user_id')
      .or('name.ilike.%'+q+'%,email.ilike.%'+q+'%').limit(6);
    if(r.error||!r.data||!r.data.length){
      results.innerHTML='<div style="font-size:12px;color:var(--muted);padding:6px 0">No students found.</div>';
      return;
    }
    results.innerHTML=r.data.map(function(s){
      var hasAuth=!!s.auth_user_id;
      var uid=hasAuth?s.auth_user_id:'';
      var name=escapeHtml(s.name||'');
      var email=escapeHtml(s.email||'');
      return '<div onclick="'+(hasAuth?'adminSelectBypassStudent(\''+uid+'\',\''+name+'\',\''+email+'\')':'alert(\'This student has no Supabase Auth account and cannot be used as a bypass account.\')')+'"'
        +' style="cursor:'+(hasAuth?'pointer':'default')
        +';padding:8px 10px;border-radius:6px;margin-bottom:4px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);font-size:12px'
        +(hasAuth?'':';opacity:.5')+'">'
        +'<strong style="color:#fff">'+name+'</strong> <span style="color:var(--muted)">'+email+'</span>'
        +(hasAuth?'':'<span style="color:#f87171;font-size:10px;margin-left:6px">(no auth account)</span>')
        +'</div>';
    }).join('');
  }catch(e){
    results.innerHTML='<div style="font-size:12px;color:#f87171;padding:6px">Error: '+e.message+'</div>';
  }
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
  if(typeof _sb==='undefined'){alert('Supabase not connected.');return;}
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
  if(!title||!date){alert('Title and date required.');return;}
  var sessions=JSON.parse(localStorage.getItem('brokeneng_live_sessions')||'[]');
  sessions.push({title:title,date:date,link:link});
  localStorage.setItem('brokeneng_live_sessions',JSON.stringify(sessions));
  document.getElementById('ls-title').value='';
  document.getElementById('ls-date').value='';
  document.getElementById('ls-link').value='';
  refreshLiveSessionsList();
}
function adminRemoveLiveSession(idx){
  var sessions=JSON.parse(localStorage.getItem('brokeneng_live_sessions')||'[]');
  sessions.splice(idx,1);
  localStorage.setItem('brokeneng_live_sessions',JSON.stringify(sessions));
  refreshLiveSessionsList();
}
function refreshLiveSessionsList(){
  var liveSessions=JSON.parse(localStorage.getItem('brokeneng_live_sessions')||'[]');
  var liveSessionsHtml=liveSessions.map(function(s,i){
    return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'
      +'<div style="flex:1;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:8px 12px;font-size:12px;color:rgba(255,255,255,.7)">'
      +'<strong style="color:#fff">'+s.title+'</strong> — '+s.date+(s.link?' — <a href="'+s.link+'" target="_blank" style="color:var(--g1)">'+s.link+'</a>':'')
      +'</div>'
      +'<button onclick="adminRemoveLiveSession('+i+')" style="background:rgba(255,0,0,.15);border:1px solid rgba(255,0,0,.25);border-radius:8px;color:#f87171;font-size:11px;padding:6px 10px;cursor:pointer;white-space:nowrap">Remove</button>'
      +'</div>';
  }).join('') || '<div style="font-size:12px;color:var(--muted);margin-bottom:8px">No sessions yet.</div>';
  document.getElementById('live-sessions-list').innerHTML=liveSessionsHtml;
}
