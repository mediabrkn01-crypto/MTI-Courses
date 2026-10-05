/* demo-access.js — extracted verbatim from the original single-file index.html.
   Source lines: 6023-6033, 6039-6040, 6098-6316
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
// ============================================================================
// ADMIN — DEMO ACCESS PANEL
// ============================================================================
var _demoAdminRows = [], _demoAdminServerOffset = 0, _demoAdminTick = null;

function _demoStatusPill(status){
  if(status==='active')   return '<span class="adm-badge ok live">Live now</span>';
  if(status==='expired')  return '<span class="adm-badge muted">Ended</span>';
  if(status==='revoked')  return '<span class="adm-badge bad">Revoked</span>';
  return '<span class="adm-badge info">Not opened</span>';
}
var _demoFilter = 'all';
function _demoSetFilter(k){ _demoFilter=k; _demoAdminRenderTable(); }
// Demo links always point at the STUDENT app (index.html), never at admin.html.
function _demoLinkUrl(token){ return new URL('./', location.href).href + '?demo=' + token; }

// Admin actions authenticate with the real Supabase Auth session (same JWT the
// rest of the admin panel uses) — the legacy course_config.admin_cred email/
// password check was removed when admin auth migrated to Supabase Auth.
async function _demoAdminToken(){
  try{
    if(typeof _sb==='undefined') return null;
    var r = await _sb.auth.getSession();
    return (r && r.data && r.data.session && r.data.session.access_token) || null;
  }catch(e){ return null; }
}
function _demoAuthErrMsg(resp){
  if(!resp) return 'Unable to reach Demo Access service. Please retry.';
  var st = resp._httpStatus;
  if(st===401 || resp.error==='unauthorized') return 'Admin session expired. Please sign in again.';
  if(st===403 || resp.error==='forbidden') return 'Your account does not have permission to manage Demo Access.';
  if(st>=500) return 'Unable to generate Demo Link. Please try again.';
  return 'Unable to reach Demo Access service. Please retry.';
}

var _demoDur = 15, _demoQuery = '';
var _DEMO_PRESETS = [5,10,15,20,30,45,60];
var _DEMO_IC = {
  wa:'<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.12-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 01-4.79-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.38 9.38 0 01-1.44-5.01c0-5.19 4.23-9.41 9.42-9.41 2.51 0 4.88.98 6.65 2.76a9.35 9.35 0 012.75 6.66c0 5.19-4.23 9.41-9.42 9.41M20.06 3.98A11.27 11.27 0 0012.05.68C5.8.68.72 5.76.72 12a11.3 11.3 0 001.51 5.66L.62 23.5l5.98-1.57a11.3 11.3 0 005.41 1.38h.01c6.24 0 11.32-5.08 11.32-11.32 0-3.02-1.18-5.87-3.32-8.01"/></svg>',
  link:'<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" viewBox="0 0 24 24"><path d="M10 13a5 5 0 007.07 0l3-3a5 5 0 00-7.07-7.07l-1 1"/><path d="M14 11a5 5 0 00-7.07 0l-3 3a5 5 0 007.07 7.07l1-1"/></svg>',
  copy:'<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
  open:'<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>',
  shield:'<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>'
};
function _demoDurChips(){
  return _DEMO_PRESETS.map(function(m){
    return '<button type="button" class="adm-chip'+(_demoDur===m?' on':'')+'" onclick="demoPickDur('+m+')">'+m+' min</button>';
  }).join('');
}
window.demoPickDur=function(m){
  m=Math.round(Number(m));
  var c=document.getElementById('demo-dur-custom'), err=document.getElementById('demo-dur-err');
  if(!(m>=1&&m<=80)){ if(err) err.style.display='block'; return; }
  if(err) err.style.display='none';
  _demoDur=m;
  var chips=document.getElementById('demo-dur-chips'); if(chips) chips.innerHTML=_demoDurChips();
  if(c&&Number(c.value)!==m) c.value=_DEMO_PRESETS.indexOf(m)<0?m:'';
  var lab=document.getElementById('demo-dur-label'); if(lab) lab.textContent=m+(m===1?' minute':' minutes');
};

function renderDemoAdmin(){
  _demoQuery='';
  app.innerHTML = adminTopBar('demo') + `
  <div class="adm-page">
    ${admHead('Demo Access','One-time demo class invitations. The timer starts only when the student first opens the link, and is enforced by the server.')}

    <div id="demo-stats"></div>

    <div class="dm-grid">
      <div class="adm-card dm-form">
        <div class="adm-card-head"><h2 class="adm-card-title">Generate demo link</h2></div>
        <div class="adm-card-pad">
          <div class="dm-field">
            <label class="adm-label" for="demo-counsellor">Counsellor WhatsApp <span style="color:var(--g1)">*</span></label>
            <div class="dm-prefix"><span class="dm-wa">${_DEMO_IC.wa}</span><input id="demo-counsellor" class="adm-input" placeholder="+91 98765 43210" inputmode="tel" autocomplete="off"/></div>
            <p class="adm-hint">The student sees this number on the demo page to contact you.</p>
          </div>

          <p class="dm-sec">Student details <span>optional</span></p>
          <div class="dm-field"><label class="adm-label" for="demo-name">Name</label><input id="demo-name" class="adm-input" placeholder="e.g. Roshan" autocomplete="off"/></div>
          <div class="dm-two">
            <div class="dm-field"><label class="adm-label" for="demo-phone">Phone</label><input id="demo-phone" class="adm-input" placeholder="+91…" inputmode="tel" autocomplete="off"/></div>
            <div class="dm-field"><label class="adm-label" for="demo-email">Email</label><input id="demo-email" class="adm-input" placeholder="name@email.com" type="email" autocomplete="off"/></div>
          </div>

          <p class="dm-sec">Demo length <span id="demo-dur-label">${_demoDur} minutes</span></p>
          <div class="dm-dur">
            <div class="adm-chips" id="demo-dur-chips">${_demoDurChips()}</div>
            <div class="dm-custom"><input id="demo-dur-custom" class="adm-input" type="number" min="1" max="80" placeholder="Custom" oninput="if(this.value)demoPickDur(this.value)" aria-label="Custom minutes (1–80)"/><span>min</span></div>
          </div>
          <p id="demo-dur-err" class="adm-hint" style="display:none;color:#fb7185">Choose between 1 and 80 minutes.</p>

          <button type="button" id="demo-gen-btn" onclick="demoAdminCreate()" class="adm-btn adm-btn-primary adm-btn-lg dm-go">${_DEMO_IC.shield}Generate secure demo link</button>
        </div>
      </div>

      <div class="adm-card dm-out">
        <div class="adm-card-head"><h2 class="adm-card-title">Latest link</h2></div>
        <div class="adm-card-pad" id="demo-gen-result">
          <div class="dm-empty"><span>${_DEMO_IC.link}</span><p>Your new demo link appears here, ready to copy or send.</p></div>
        </div>
      </div>
    </div>

    <div class="adm-card">
      <div class="adm-card-head dm-list-head">
        <h2 class="adm-card-title">Demo links</h2>
        <div class="dm-tools">
          ${admSearch('demo-search','Search name, phone or number…','_demoQuery=this.value.trim().toLowerCase();_demoAdminRenderTable()')}
          <button onclick="demoAdminRefresh()" class="adm-btn">${ADM_ICON.refresh}Refresh</button>
        </div>
      </div>
      <div class="dm-chiprow"><div class="adm-chips" id="demo-chips"></div></div>
      <div id="demo-links-wrap"><p class="adm-empty">Loading…</p></div>
    </div>
  </div>`;
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
    var token = await _demoAdminToken();
    if(!token){ if(wrap) wrap.innerHTML='<p style="color:var(--g1);font-size:13px">Admin session expired. Please sign in again.</p>'; return; }
    var resp = await _demoApi({ action:'list' }, token);
    if(resp && resp.error){
      if(wrap) wrap.innerHTML='<p style="color:var(--g1);font-size:13px">Unable to load Demo Links: '+_demoAuthErrMsg(resp)+' <button onclick="demoAdminRefresh()" class="btn-ghost" style="width:auto;padding:4px 10px;font-size:12px;margin-left:6px">Retry</button></p>';
      return;
    }
    _demoAdminRows = (resp && resp.links) || [];
    _demoAdminServerOffset = resp && resp.server_now ? (Date.parse(resp.server_now) - Date.now()) : 0;
    _demoAdminRenderTable();
  }catch(e){ if(wrap) wrap.innerHTML='<p style="color:var(--g1);font-size:13px">Unable to reach Demo Access service. <button onclick="demoAdminRefresh()" class="btn-ghost" style="width:auto;padding:4px 10px;font-size:12px;margin-left:6px">Retry</button></p>'; }
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
  if(status==='not_started' || status==='active') actions += '<button onclick="demoAdminRevoke(\''+r.id+'\')" class="adm-btn">Revoke</button>';
  actions += '<button onclick="demoAdminDelete(\''+r.id+'\')" class="adm-btn adm-btn-danger adm-icon-btn" aria-label="Delete link" title="Delete link">'+ADM_ICON.trash+'</button>';
  actions = '<div style="display:inline-flex;gap:6px;align-items:center">'+actions+'</div>';
  return {status:status, remTxt:remTxt, durTxt:durTxt, counsNum:counsNum, actions:actions};
}
function _demoAdminRenderStats(parts){
  var c={all:parts.length,active:0,not_started:0,expired:0,revoked:0};
  parts.forEach(function(p){ c[p.status]=(c[p.status]||0)+1; });
  var statsEl=document.getElementById('demo-stats');
  var statsHtml=admStats([
    ['Live now', c.active, c.active?'ok':''],
    ['Not opened yet', c.not_started, c.not_started?'info':''],
    ['Ended', c.expired],
    ['Total links', c.all]
  ]);
  if(statsEl && statsEl.innerHTML!==statsHtml) statsEl.innerHTML=statsHtml;
  var chipsEl=document.getElementById('demo-chips');
  var chipsHtml=[['all','All'],['active','Live'],['not_started','Not opened'],['expired','Ended'],['revoked','Revoked']].map(function(k){
    return '<button class="adm-chip'+(_demoFilter===k[0]?' on':'')+'" onclick="_demoSetFilter(\''+k[0]+'\')">'+k[1]+'<span class="n">'+(c[k[0]]||0)+'</span></button>';
  }).join('');
  if(chipsEl && chipsEl.innerHTML!==chipsHtml) chipsEl.innerHTML=chipsHtml;
}
function _demoInitials(n){ var p=String(n||'').trim().split(/\s+/).filter(Boolean); return p.length?(p[0][0]+(p[1]?p[1][0]:'')).toUpperCase():'D'; }
function _demoTimeCell(r,p){
  if(p.status==='active'){
    var rem=_demoAdminRemaining(r)||0, tot=(r.duration_minutes||15)*60000, pct=Math.max(0,Math.min(100,rem/tot*100));
    return '<div class="dm-time"><span class="adm-num">'+p.remTxt+'</span><div class="adm-meter'+(pct<20?' low':'')+'"><span style="width:'+pct.toFixed(1)+'%"></span></div></div>';
  }
  return '<span class="adm-muted">'+(p.status==='not_started'?'Starts on open':'—')+'</span>';
}
function _demoAdminRenderTable(){
  var wrap = document.getElementById('demo-links-wrap');
  if(!wrap) return;
  var all = _demoAdminRows.map(function(r){ return {r:r, p:_demoRowParts(r)}; });
  _demoAdminRenderStats(all.map(function(x){return x.p;}));
  if(!_demoAdminRows.length){ wrap.innerHTML='<div class="dm-none">'+_DEMO_IC.link+'<p>No demo links yet</p><span>Generate one above — it will show up here with its live status.</span></div>'; return; }
  var q=_demoQuery;
  var shown = all.filter(function(x){
    if(_demoFilter!=='all' && x.p.status!==_demoFilter) return false;
    if(!q) return true;
    var r=x.r; return [r.student_name,r.student_phone,r.student_email,r.counsellor_whatsapp].some(function(v){return String(v||'').toLowerCase().indexOf(q)>=0;});
  });
  if(!shown.length){ wrap.innerHTML='<p class="adm-empty">'+(q?'No links match “'+escapeHtml(q)+'”.':'No links in this view.')+'</p>'; return; }
  var who=function(r,p){
    return '<div class="dm-who"><span class="dm-av s-'+p.status+'">'+escapeHtml(_demoInitials(r.student_name))+'</span><div style="min-width:0">'
      +'<p class="adm-name">'+escapeHtml(r.student_name||'Unnamed demo')+'</p>'
      +'<p class="adm-meta">'+p.durTxt+(r.student_phone?' · '+escapeHtml(r.student_phone):'')+'</p></div></div>';
  };
  var couns=function(p){ return p.counsNum
      ? '<a href="https://wa.me/'+p.counsNum+'" target="_blank" rel="noopener" class="dm-wa-link">'+_DEMO_IC.wa+'+'+p.counsNum+'</a>'
      : '<span class="adm-muted">—</span>'; };
  var opened=function(r){ return r.activated_at
      ? '<span class="dm-when">'+_demoFmtTime(r.activated_at)+'</span><p class="adm-meta">ends '+_demoFmtTime(r.expires_at)+'</p>'
      : '<span class="adm-muted">Not opened yet</span>'+(r.created_at?'<p class="adm-meta">created '+_demoFmtTime(r.created_at)+'</p>':''); };
  var rows = shown.map(function(x){
    var r=x.r, p=x.p, dim=(p.status==='expired'||p.status==='revoked')?' class="dm-dim"':'';
    return '<tr'+dim+'><td>'+who(r,p)+'</td><td>'+_demoStatusPill(p.status)+'</td><td>'+_demoTimeCell(r,p)+'</td>'
      +'<td style="white-space:nowrap">'+couns(p)+'</td><td style="white-space:nowrap">'+opened(r)+'</td>'
      +'<td class="right" style="white-space:nowrap">'+p.actions+'</td></tr>';
  }).join('');
  var cards = shown.map(function(x){
    var r=x.r, p=x.p;
    return '<div class="dm-card'+((p.status==='expired'||p.status==='revoked')?' dm-dim':'')+'">'
      +'<div class="dm-card-top">'+who(r,p)+_demoStatusPill(p.status)+'</div>'
      +'<div class="dm-card-grid">'
        +'<div><i class="dm-k">Time left</i>'+_demoTimeCell(r,p)+'</div>'
        +'<div><i class="dm-k">Counsellor</i>'+couns(p)+'</div>'
        +'<div style="grid-column:1/-1"><i class="dm-k">Opened</i>'+opened(r)+'</div>'
      +'</div>'
      +'<div class="dm-card-act">'+p.actions+'</div></div>';
  }).join('');
  wrap.innerHTML =
    '<div class="demo-tbl-desktop" style="overflow-x:auto"><table class="admin-table" style="min-width:760px">'+
      '<thead><tr><th>Student</th><th>Status</th><th style="width:150px">Time left</th><th>Counsellor</th><th>Opened</th><th class="right"></th></tr></thead>'+
      '<tbody>'+rows+'</tbody></table></div>'+
    '<div class="demo-tbl-cards dm-cards" style="display:none">'+cards+'</div>';
}

window.demoAdminCreate = async function(){
  var btn = document.getElementById('demo-gen-btn');
  // Validate counsellor WhatsApp (required) + duration (1–80) BEFORE any network call.
  var counsellorRaw = (document.getElementById('demo-counsellor').value||'').trim();
  var counsellorNum = normalizeWhatsApp(counsellorRaw);
  if(counsellorNum.length < 10 || counsellorNum.length > 15){
    demoToast('Enter a valid Counsellor WhatsApp number (e.g. +91 98765 43210)','error');
    document.getElementById('demo-counsellor').focus(); return;
  }
  var durMin = _demoDur;
  if(!(durMin>=1 && durMin<=80)){ demoToast('Demo duration must be between 1 and 80 minutes','error'); return; }
  if(btn){ btn.disabled=true; btn.innerHTML='<span class="auth-spin"></span>Generating…'; }
  try{
    var token = await _demoAdminToken();
    if(!token){ demoToast('Admin session expired. Please sign in again.','error'); return; }
    var resp = await _demoApi({
      action:'create',
      student_name: (document.getElementById('demo-name').value||'').trim(),
      student_phone:(document.getElementById('demo-phone').value||'').trim(),
      student_email:(document.getElementById('demo-email').value||'').trim(),
      counsellor_whatsapp: counsellorNum,
      duration_minutes: durMin
    }, token);
    if(!resp || resp.error){
      demoToast(_demoAuthErrMsg(resp),'error'); return;
    }
    var url = _demoLinkUrl(resp.token);
    var box = document.getElementById('demo-gen-result');
    var nm=(document.getElementById('demo-name').value||'').trim();
    var ph=normalizeWhatsApp((document.getElementById('demo-phone').value||'').trim());
    var msg='Hi'+(nm?' '+nm:'')+'! Here is your Broken English demo class ('+durMin+' min). The timer starts when you open it: '+url;
    var waHref='https://wa.me/'+(ph.length>=10?ph:'')+'?text='+encodeURIComponent(msg);
    var esc=url.replace(/'/g,"\\'");
    box.innerHTML =
      '<div class="dm-new">'
        +'<div class="dm-new-top"><span class="dm-new-ic">'+_DEMO_IC.link+'</span><div style="min-width:0"><p class="adm-name">'+escapeHtml(nm||'Unnamed demo')+'</p><p class="adm-meta">Created '+_demoFmtTime(resp.link&&resp.link.created_at)+'</p></div>'+_demoStatusPill('not_started')+'</div>'
        +'<div class="dm-url" id="demo-gen-url">'+escapeHtml(url)+'</div>'
        +'<div class="dm-facts"><div><span>Length</span><b>'+durMin+(durMin===1?' minute':' minutes')+'</b></div><div><i class="dm-k">Counsellor</i><b>+'+counsellorNum+'</b></div><div><span>Timer</span><b>On first open</b></div></div>'
        +'<div class="dm-actions">'
          +'<button onclick="demoAdminCopy(\''+esc+'\');this.classList.add(\'done\');this.lastChild.textContent=\'Copied\'" class="adm-btn adm-btn-primary">'+_DEMO_IC.copy+'<span>Copy link</span></button>'
          +'<a href="'+escapeAttr(waHref)+'" target="_blank" rel="noopener" class="adm-btn dm-wa-btn">'+_DEMO_IC.wa+'Send on WhatsApp</a>'
          +'<button onclick="window.open(\''+esc+'\',\'_blank\')" class="adm-btn" title="Opening it yourself starts the timer">'+_DEMO_IC.open+'Open</button>'
        +'</div>'
        +'<p class="adm-hint" style="margin:10px 0 0">Opening the link yourself starts its timer — use Copy or WhatsApp to send it.</p>'
      +'</div>';
    document.getElementById('demo-name').value='';
    document.getElementById('demo-phone').value='';
    document.getElementById('demo-email').value='';
    document.getElementById('demo-counsellor').value='';
    demoToast('Demo link created');
    demoAdminRefresh();
  }catch(e){ demoToast('Could not generate link','error'); }
  finally{ if(btn){ btn.disabled=false; btn.innerHTML=_DEMO_IC.shield+'Generate secure demo link'; } }
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
        var token = await _demoAdminToken();
        if(!token){ demoToast('Admin session expired. Please sign in again.','error'); return; }
        var resp = await _demoApi({ action:'revoke', id:id }, token);
        if(resp && resp.error){ demoToast(_demoAuthErrMsg(resp),'error'); return; }
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
        var token = await _demoAdminToken();
        if(!token){ demoToast('Admin session expired. Please sign in again.','error'); return; }
        var resp = await _demoApi({ action:'delete', id:id }, token);
        if(resp && resp.error){ demoToast(_demoAuthErrMsg(resp),'error'); return; }
        demoToast('Demo link deleted'); demoAdminRefresh();
      }catch(e){ demoToast('Delete failed','error'); }
    }
  });
};
