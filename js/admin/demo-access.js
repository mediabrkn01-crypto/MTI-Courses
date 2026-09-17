/* demo-access.js — extracted verbatim from the original single-file index.html.
   Source lines: 6023-6033, 6039-6040, 6098-6316
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
// ============================================================================
// ADMIN — DEMO ACCESS PANEL
// ============================================================================
var _demoAdminRows = [], _demoAdminServerOffset = 0, _demoAdminTick = null;

function _demoStatusPill(status){
  if(status==='active')   return '<span class="pill pill-green">Active</span>';
  if(status==='expired')  return '<span class="pill pill-red">Expired</span>';
  if(status==='revoked')  return '<span class="pill pill-yellow">Revoked</span>';
  return '<span class="pill pill-grey">Not Started</span>';
}
function _demoLinkUrl(token){ return location.origin + location.pathname + '?demo=' + token; }

function renderDemoAdmin(){
  app.innerHTML = adminTopBar('demo') + `
  <div style="padding:24px;position:relative;z-index:1">
    <div style="margin-bottom:16px">
      <h1 style="font-size:22px;font-weight:800;color:#fff;margin-bottom:2px;font-family:'Montserrat',sans-serif">Demo Access</h1>
      <p style="font-size:13px;color:var(--muted)">Generate secure, one-time demo class invitations (1–80 min). The countdown starts only when the student first opens the link.</p>
    </div>

    <div class="panel-card" style="padding:20px;margin-bottom:22px">
      <h2 style="font-size:15px;font-weight:800;color:#fff;margin-bottom:14px;font-family:'Montserrat',sans-serif">Generate Demo Link</h2>
      <div class="demo-gen-grid">
        <div><label style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;display:block;margin-bottom:6px">Student Name</label>
          <input id="demo-name" class="glass-input" placeholder="Optional"/></div>
        <div><label style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;display:block;margin-bottom:6px">Phone Number</label>
          <input id="demo-phone" class="glass-input" placeholder="Optional"/></div>
        <div><label style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;display:block;margin-bottom:6px">Email</label>
          <input id="demo-email" class="glass-input" placeholder="Optional"/></div>
        <div><label style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;display:block;margin-bottom:6px">Counsellor WhatsApp <span style="color:var(--g1)">*</span></label>
          <input id="demo-counsellor" class="glass-input" placeholder="+91 98765 43210" inputmode="tel"/></div>
        <div><label style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;display:block;margin-bottom:6px">Demo Duration</label>
          <div id="demo-duration-dd"></div></div>
        <div class="demo-gen-btn-cell"><button onclick="demoAdminCreate()" class="btn-primary" style="width:100%;padding:12px 20px">Generate Secure Demo Link</button></div>
      </div>
      <div id="demo-gen-result" style="display:none;margin-top:16px"></div>
    </div>

    <div class="panel-card" style="padding:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;flex-wrap:wrap">
        <h2 style="font-size:15px;font-weight:800;color:#fff;font-family:'Montserrat',sans-serif">Demo Links</h2>
        <button onclick="demoAdminRefresh()" class="btn-ghost" style="width:auto;padding:6px 12px;font-size:12px">↻ Refresh</button>
      </div>
      <div id="demo-links-wrap" style="overflow-x:auto"><p style="font-size:13px;color:var(--muted)">Loading…</p></div>
    </div>
  </div>`;
  // Branded custom duration dropdown (1–80 min, default 15) — replaces the native <select>.
  if(_demoDurationSelect && _demoDurationSelect.destroy) _demoDurationSelect.destroy();
  var _durOpts = [];
  for(var _m=1;_m<=80;_m++){ _durOpts.push({value:_m, label:_m+(_m===1?' Minute':' Minutes')}); }
  _demoDurationSelect = createBxSelect('demo-duration-dd', _durOpts, 15);
  demoAdminRefresh();
  if(_demoAdminTick) clearInterval(_demoAdminTick);
  _demoAdminTick = setInterval(function(){
    if(!(currentSession&&currentSession.role==='admin')){ clearInterval(_demoAdminTick); _demoAdminTick=null; return; }
    if(!document.getElementById('demo-links-wrap')){ clearInterval(_demoAdminTick); _demoAdminTick=null; return; }
    _demoAdminRenderTable();               // live countdown/status every second
  }, 1000);
}

window.demoAdminRefresh = async function(){
  var wrap = document.getElementById('demo-links-wrap');
  try{
    var cred = getAdminCredentials();
    var resp = await _demoApi({ action:'list', admin:{email:cred.email, password:cred.password} });
    if(resp && resp.error==='unauthorized'){ if(wrap) wrap.innerHTML='<p style="color:var(--g1);font-size:13px">Admin authorization failed. Sign out and sign in again to refresh credentials.</p>'; return; }
    _demoAdminRows = (resp && resp.links) || [];
    _demoAdminServerOffset = resp && resp.server_now ? (Date.parse(resp.server_now) - Date.now()) : 0;
    _demoAdminRenderTable();
  }catch(e){ if(wrap) wrap.innerHTML='<p style="color:var(--g1);font-size:13px">Could not reach the demo server.</p>'; }
};

function _demoAdminRemaining(row){
  if(row.status!=='active' || !row.expires_at) return null;
  var serverNow = Date.now() + _demoAdminServerOffset;
  return Math.max(0, Date.parse(row.expires_at) - serverNow);
}
function _demoStatusLabel(s){ return s==='active'?'Active':(s==='expired'?'Expired':(s==='revoked'?'Revoked':'Not Started')); }
function _demoRowParts(r){
  var rem = _demoAdminRemaining(r);
  var status = r.status;
  if(status==='active' && rem!==null && rem<=0) status='expired';
  var remTxt = (status==='active' && rem!==null) ? _fmtClock(rem) : (status==='expired'?'Ended':(status==='revoked'?'Revoked':'—'));
  var durTxt = (r.duration_minutes||15)+' min demo';
  var counsNum = r.counsellor_whatsapp ? normalizeWhatsApp(r.counsellor_whatsapp) : '';
  var actions = '';
  if(status==='not_started' || status==='active') actions += '<button onclick="demoAdminRevoke(\''+r.id+'\')" class="demo-abtn demo-abtn-revoke">Revoke</button>';
  actions += '<button onclick="demoAdminDelete(\''+r.id+'\')" class="demo-abtn demo-abtn-delete">Delete</button>';
  return {status:status, remTxt:remTxt, durTxt:durTxt, counsNum:counsNum, actions:actions};
}
function _demoAdminRenderTable(){
  var wrap = document.getElementById('demo-links-wrap');
  if(!wrap) return;
  if(!_demoAdminRows.length){ wrap.innerHTML='<p style="font-size:13px;color:var(--muted);padding:6px 2px">No demo links yet. Generate one above.</p>'; return; }
  var rows = _demoAdminRows.map(function(r){
    var p = _demoRowParts(r);
    var who = '<div style="font-weight:700;color:#fff;font-size:13.5px">'+(r.student_name||'Demo')+'</div>'+
              '<div style="font-size:10.5px;color:var(--muted);margin-top:2px">'+p.durTxt+'</div>'+
              (r.student_phone?'<div style="font-size:10px;color:var(--muted)">'+r.student_phone+'</div>':'');
    var couns = p.counsNum
      ? '<a href="https://wa.me/'+p.counsNum+'" target="_blank" rel="noopener" style="color:rgba(74,222,128,.9);text-decoration:none;font-size:12.5px">+'+p.counsNum+'</a>'
      : '<span style="color:var(--muted)">—</span>';
    var remCell = (p.status==='active') ? '<span style="font-family:\'JetBrains Mono\',monospace;color:#fff">'+p.remTxt+'</span>' : '<span style="color:var(--muted)">'+p.remTxt+'</span>';
    return '<tr>'+
      '<td>'+who+'</td>'+
      '<td style="white-space:nowrap">'+couns+'</td>'+
      '<td style="white-space:nowrap;color:rgba(255,255,255,.7)">'+_demoFmtTime(r.activated_at)+'</td>'+
      '<td style="white-space:nowrap;color:rgba(255,255,255,.7)">'+_demoFmtTime(r.expires_at)+'</td>'+
      '<td>'+remCell+'</td>'+
      '<td>'+_demoStatusPill(p.status)+'</td>'+
      '<td style="white-space:nowrap;text-align:right">'+p.actions+'</td>'+
    '</tr>';
  }).join('');
  // Mobile card layout (shown < 720px via the wrapper's own overflow; here we provide both)
  var cards = _demoAdminRows.map(function(r){
    var p = _demoRowParts(r);
    return '<div style="border:1px solid rgba(255,255,255,.09);border-radius:14px;padding:14px 16px;background:rgba(255,255,255,.02)">'+
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:10px">'+
        '<div><div style="font-weight:700;color:#fff;font-size:14px">'+(r.student_name||'Demo')+'</div>'+
             '<div style="font-size:11px;color:var(--muted);margin-top:2px">'+p.durTxt+'</div></div>'+
        _demoStatusPill(p.status)+'</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 12px;font-size:12px">'+
        '<div><div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Counsellor</div>'+(p.counsNum?'<a href="https://wa.me/'+p.counsNum+'" target="_blank" rel="noopener" style="color:rgba(74,222,128,.9);text-decoration:none">+'+p.counsNum+'</a>':'<span style="color:var(--muted)">—</span>')+'</div>'+
        '<div><div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Remaining</div><span style="color:#fff">'+p.remTxt+'</span></div>'+
        '<div><div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Started</div><span style="color:rgba(255,255,255,.75)">'+_demoFmtTime(r.activated_at)+'</span></div>'+
        '<div><div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Expires</div><span style="color:rgba(255,255,255,.75)">'+_demoFmtTime(r.expires_at)+'</span></div>'+
      '</div>'+
      '<div style="margin-top:12px;display:flex;justify-content:flex-end">'+p.actions+'</div>'+
    '</div>';
  }).join('');
  wrap.innerHTML =
    '<div class="demo-tbl-desktop" style="overflow-x:auto"><table class="demo-tbl">'+
      '<thead><tr><th>Student</th><th>Counsellor</th><th>Started</th><th>Expires</th><th>Remaining</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead>'+
      '<tbody>'+rows+'</tbody></table></div>'+
    '<div class="demo-tbl-cards" style="display:none;flex-direction:column;gap:12px">'+cards+'</div>';
}

window.demoAdminCreate = async function(){
  var btn = event && event.target ? event.target : null;
  // Validate counsellor WhatsApp (required) + duration (1–80) BEFORE any network call.
  var counsellorRaw = (document.getElementById('demo-counsellor').value||'').trim();
  var counsellorNum = normalizeWhatsApp(counsellorRaw);
  if(counsellorNum.length < 10 || counsellorNum.length > 15){
    demoToast('Enter a valid Counsellor WhatsApp number (e.g. +91 98765 43210)','error');
    document.getElementById('demo-counsellor').focus(); return;
  }
  var durMin = _demoDurationSelect ? _demoDurationSelect.value() : 15;
  if(!(durMin>=1 && durMin<=80)){ demoToast('Demo duration must be between 1 and 80 minutes','error'); return; }
  if(btn){ btn.disabled=true; btn.textContent='Generating…'; }
  try{
    var cred = getAdminCredentials();
    var resp = await _demoApi({
      action:'create',
      admin:{email:cred.email, password:cred.password},
      student_name: (document.getElementById('demo-name').value||'').trim(),
      student_phone:(document.getElementById('demo-phone').value||'').trim(),
      student_email:(document.getElementById('demo-email').value||'').trim(),
      counsellor_whatsapp: counsellorNum,
      duration_minutes: durMin
    });
    if(!resp || resp.error){
      var m = resp && resp.error==='unauthorized' ? 'Admin authorization failed. Sign out and back in.' : 'Could not generate link.';
      demoToast(m,'error'); return;
    }
    var url = _demoLinkUrl(resp.token);
    var box = document.getElementById('demo-gen-result');
    box.style.display='block';
    box.innerHTML =
      '<div style="border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:14px;background:rgba(255,255,255,.04)">'+
        '<div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Demo Link</div>'+
        '<div id="demo-gen-url" style="font-family:\'JetBrains Mono\',monospace;font-size:12px;color:#fff;word-break:break-all;background:rgba(0,0,0,.3);padding:10px;border-radius:8px">'+url+'</div>'+
        '<div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:12px">'+
          '<div><div style="font-size:10px;color:var(--muted);text-transform:uppercase">Status</div><div>'+_demoStatusPill('not_started')+'</div></div>'+
          '<div><div style="font-size:10px;color:var(--muted);text-transform:uppercase">Duration</div><div style="color:#fff;font-size:13px;padding-top:2px">'+durMin+(durMin===1?' Minute':' Minutes')+'</div></div>'+
          '<div><div style="font-size:10px;color:var(--muted);text-transform:uppercase">Counsellor</div><div style="color:#fff;font-size:13px;padding-top:2px">+'+counsellorNum+'</div></div>'+
          '<div><div style="font-size:10px;color:var(--muted);text-transform:uppercase">Created</div><div style="color:#fff;font-size:13px;padding-top:2px">'+_demoFmtTime(resp.link&&resp.link.created_at)+'</div></div>'+
        '</div>'+
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">'+
          '<button onclick="demoAdminCopy(\''+url.replace(/'/g,"\\'")+'\')" class="btn-primary" style="width:auto;padding:7px 14px;font-size:12px">Copy Link</button>'+
          '<button onclick="window.open(\''+url.replace(/'/g,"\\'")+'\',\'_blank\')" class="btn-ghost" style="width:auto;padding:7px 14px;font-size:12px">Open Link</button>'+
        '</div>'+
      '</div>';
    document.getElementById('demo-name').value='';
    document.getElementById('demo-phone').value='';
    document.getElementById('demo-email').value='';
    document.getElementById('demo-counsellor').value='';
    demoToast('Demo link created');
    demoAdminRefresh();
  }catch(e){ demoToast('Could not generate link','error'); }
  finally{ if(btn){ btn.disabled=false; btn.textContent='Generate Secure Demo Link'; } }
};

window.demoAdminCopy = function(url){
  function done(){ demoToast('Demo link copied'); }
  if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(url).then(done).catch(function(){ _demoCopyFallback(url); done(); }); }
  else { _demoCopyFallback(url); done(); }
};
function _demoCopyFallback(url){
  try{ var ta=document.createElement('textarea'); ta.value=url; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }catch(e){}
}
window.demoAdminRevoke = function(id){
  showDemoConfirm({
    title:'Revoke Demo Access?',
    message:'This will immediately revoke this demo invitation. If the student is currently using the demo, they will be locked out on the next validation check.',
    confirmText:'Revoke Access', cancelText:'Cancel', type:'warn',
    onConfirm: async function(){
      try{
        var cred = getAdminCredentials();
        var resp = await _demoApi({ action:'revoke', id:id, admin:{email:cred.email, password:cred.password} });
        if(resp && resp.error){ demoToast(resp.error==='unauthorized'?'Admin authorization failed':'Revoke failed','error'); return; }
        demoToast('Demo link revoked'); demoAdminRefresh();
      }catch(e){ demoToast('Revoke failed','error'); }
    }
  });
};
window.demoAdminDelete = function(id){
  showDemoConfirm({
    title:'Delete Demo Link?',
    message:'This demo record will be permanently removed. This cannot be undone.',
    confirmText:'Delete', cancelText:'Cancel', type:'danger',
    onConfirm: async function(){
      try{
        var cred = getAdminCredentials();
        var resp = await _demoApi({ action:'delete', id:id, admin:{email:cred.email, password:cred.password} });
        if(resp && resp.error){ demoToast(resp.error==='unauthorized'?'Admin authorization failed':'Delete failed','error'); return; }
        demoToast('Demo link deleted'); demoAdminRefresh();
      }catch(e){ demoToast('Delete failed','error'); }
    }
  });
};
