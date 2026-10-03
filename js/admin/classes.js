/* classes.js — extracted verbatim from the original single-file index.html.
   Source lines: 3298-3322, 3421-3725
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
window.forcePushVideos = async function(){
  var el = document.getElementById('sync-status');
  var vids = loadVideos();
  var keys = Object.keys(vids);
  if(keys.length===0){ if(el) el.textContent='No videos in localStorage to push.'; return; }
  if(el) el.textContent = 'Pushing '+keys.length+' entries...';
  try{
    var r = await _sb.from('course_config').upsert({id:'videos',data:vids,updated_at:new Date().toISOString()},{onConflict:'id'});
    if(r.error){ if(el){el.textContent='✗ Push failed: '+r.error.message;el.style.color='#f87171';} return; }
    if(el){el.textContent='✓ Pushed '+keys.length+' videos to Supabase!';el.style.color='#4ade80';}
  }catch(e){ if(el){el.textContent='✗ '+e.message;el.style.color='#f87171';} }
};

window.forcePullVideos = async function(){
  var el = document.getElementById('sync-status');
  if(el) el.textContent = 'Pulling from Supabase...';
  try{
    var r = await _sb.from('course_config').select('data').eq('id','videos').single();
    if(r.error||!r.data||!r.data.data){ if(el){el.textContent='✗ Nothing to pull: '+(r.error?r.error.message:'empty');el.style.color='#fbbf24';} return; }
    localStorage.setItem('brokeneng_videos',JSON.stringify(r.data.data));
    var keys=Object.keys(r.data.data);
    if(el){el.textContent='✓ Pulled '+keys.length+' entries from Supabase into localStorage!';el.style.color='#4ade80';}
  }catch(e){ if(el){el.textContent='✗ '+e.message;el.style.color='#f87171';} }
};

// ── CLASSES & VIDEOS ──────────────────────────────────────────────────────────
// ── CLASSES & VIDEOS ─────────────────────────────────────────────────────────
// The course_config 'videos' row also stores every class thumbnail as a base64 image
// (~4.5 MB in total), so this page never downloads the whole row. It asks PostgREST for
// just the short text fields it shows (JSON-path select), and the Edit dialog reads the
// two fields it edits. Thumbnails are managed in Images, quizzes in Quizzes.
var _CLS_ORDERS=null;
function _clsOrders(){ return _CLS_ORDERS||(_CLS_ORDERS=ALL_LESSONS.map(function(l){return l.order;}).concat(WV_DATA.map(function(f,i){return 101+i;}))); }
// Each path expression re-reads the large jsonb value server-side, so more than ~30 in one
// query hits the statement timeout. Requests are split into chunks of 30 and run in parallel.
async function _clsFetchFields(orders, fields){
  var exprs=[];
  orders.forEach(function(o){ fields.forEach(function(f){ exprs.push(f+'_'+o+':data->"'+o+'"->>'+f); }); });
  var chunks=[]; for(var i=0;i<exprs.length;i+=30) chunks.push(exprs.slice(i,i+30));
  // Sequential: parallel chunks compete for the same large value and end up slower.
  var row={};
  for(var c=0;c<chunks.length;c++){
    var res=await _sb.from('course_config').select(chunks[c].join(',')).eq('id','videos').maybeSingle();
    if(res.error) throw new Error(res.error.message);
    Object.assign(row,res.data||{});
  }
  var out={};
  orders.forEach(function(o){ var v=out[o]={}; fields.forEach(function(f){ v[f]=row[f+'_'+o]||''; }); });
  return out;
}

// List data. Fast path: the course_videos_light() RPC (supabase/migrations/
// 20261003_course_videos_light.sql) returns the row minus thumbnails in one read.
// Until that function exists, fall back to chunked JSON-path selects.
var _clsRpcMissing=false;
async function _clsLoadList(fields){
  if(!_clsRpcMissing){
    var r=await _sb.rpc('course_videos_light');
    if(!r.error){
      var d=r.data||{}, out={};
      _clsOrders().forEach(function(o){ var v=d[o]||{}, x=out[o]={}; fields.forEach(function(f){ x[f]=v[f]||''; }); });
      return out;
    }
    if(r.error.code==='PGRST202'||/could not find the function|does not exist/i.test(r.error.message||'')) _clsRpcMissing=true;
    else throw new Error(r.error.message);
  }
  return _clsFetchFields(_clsOrders(), fields);
}

function renderAdminClasses(){
  var tab=window._clsTab==='workshop'?'workshop':'classes';
  window._clsTab=tab;
  var sk='<span class="adm-skel"></span>';

  app.innerHTML=adminTopBar('classes')+`
  <div class="adm-page">
    ${admHead('Classes & Videos','Set the video link and lesson description for each class. Images and quizzes have their own tabs.')}
    <div id="cls-stats">${admStats([['Class videos',sk],['Workshop videos',sk],['Total runtime',sk]])}</div>
    <div id="cls-err"></div>

    <div class="pd-tabs" role="tablist" aria-label="Class type">
      <button type="button" role="tab" id="cls-tab-classes" class="pd-tab${tab==='classes'?' on':''}" aria-selected="${tab==='classes'}" aria-controls="cls-panel-classes" onclick="clsShowTab('classes')">Classes <span class="n">${ALL_LESSONS.length}</span></button>
      <button type="button" role="tab" id="cls-tab-workshop" class="pd-tab${tab==='workshop'?' on':''}" aria-selected="${tab==='workshop'}" aria-controls="cls-panel-workshop" onclick="clsShowTab('workshop')">Pronunciation Workshop <span class="n">${WV_DATA.length}</span></button>
    </div>

    <div id="cls-panel-classes" role="tabpanel" aria-labelledby="cls-tab-classes"${tab==='classes'?'':' hidden'}>
      <div class="adm-card admin-table-wrap"><div style="overflow-x:auto">
        <table class="admin-table" style="min-width:640px">
          <thead><tr>
            <th style="width:56px">Day</th><th>Class</th>
            <th style="width:120px">Video</th><th style="width:190px">Students with access</th>
            <th class="right" style="width:90px"></th>
          </tr></thead>
          <tbody>${ALL_LESSONS.map(l=>`<tr>
            <td><span class="adm-day">${l.order}</span></td>
            <td><p class="adm-name" id="cls-title-${l.order}">${escapeHtml(l.title)}</p><p class="adm-meta" id="cls-dur-${l.order}">${sk}</p></td>
            <td id="cls-vid-${l.order}">${sk}</td>
            <td class="cls-access" data-order="${l.order}">${sk}</td>
            <td class="right"><button class="adm-btn" onclick="openVideoModal(${l.order})">${ADM_ICON.edit}Edit</button></td>
          </tr>`).join('')}</tbody>
        </table>
      </div></div>
    </div>

    <div id="cls-panel-workshop" role="tabpanel" aria-labelledby="cls-tab-workshop"${tab==='workshop'?'':' hidden'}>
      <div class="adm-card admin-table-wrap"><div style="overflow-x:auto">
        <table class="admin-table" style="min-width:520px">
          <thead><tr><th style="width:56px">#</th><th>Workshop</th><th style="width:120px">Video</th><th class="right" style="width:90px"></th></tr></thead>
          <tbody>${WV_DATA.map((f,i)=>`<tr>
            <td><span class="adm-day" style="font-size:10px">W${i+1}</span></td>
            <td><p class="adm-name">${escapeHtml(f.title)}</p><p class="adm-meta">${escapeHtml(f.cat)} · ${escapeHtml(f.dur)}</p></td>
            <td id="cls-vid-${101+i}">${sk}</td>
            <td class="right"><button class="adm-btn" onclick="openVideoModal(${101+i})">${ADM_ICON.edit}Edit</button></td>
          </tr>`).join('')}</tbody>
        </table>
      </div></div>
    </div>

    <!-- Edit dialog: video link + lesson description only (moved to <body> on open) -->
    <div id="video-modal" class="qe-overlay" style="display:none" onclick="if(event.target===this)closeVideoModal()">
      <div class="qe-panel cm-panel cm-slim" role="dialog" aria-modal="true" aria-labelledby="vm-title">
        <div class="qe-head">
          <div style="min-width:0">
            <p class="cm-kicker" id="vm-kicker">Day 1</p>
            <h2 class="cm-title" id="vm-title">Edit class</h2>
          </div>
          <button type="button" class="qe-x" onclick="closeVideoModal()" aria-label="Close">×</button>
        </div>
        <input id="vm-order" type="hidden"/>
        <div class="qe-body" style="padding:18px 20px">
          <div class="cm-field">
            <div class="cm-label-row"><label class="adm-label" for="vm-src">Video link</label><span id="vm-src-kind"></span></div>
            <div class="cm-inline">
              <input id="vm-src" type="url" class="adm-input" placeholder="https://player.mediadelivery.net/play/… or an .mp4 link" oninput="vmSrcCheck()"/>
              <a id="vm-src-open" class="adm-btn" target="_blank" rel="noopener" style="display:none">Open</a>
            </div>
          </div>
          <div class="cm-field" style="margin-bottom:0">
            <label class="adm-label" for="vm-desc">Lesson page description</label>
            <textarea id="vm-desc" rows="5" class="adm-input" style="resize:vertical" placeholder="Short description shown under the video on the lesson page"></textarea>
          </div>
        </div>
        <div class="qe-foot" style="justify-content:flex-end">
          <span id="vm-save-msg" class="adm-hint" style="margin:0 auto 0 0"></span>
          <button type="button" class="adm-btn adm-btn-lg" onclick="closeVideoModal()">Cancel</button>
          <button type="button" id="vm-save-btn" class="adm-btn adm-btn-primary adm-btn-lg" onclick="saveVideo()">Save changes</button>
        </div>
      </div>
    </div>
  </div>`;

  // ── 1. List data: src / duration / title per class (a few KB instead of ~4.5 MB) ──
  var token=window._clsToken=(window._clsToken||0)+1;
  var live=function(){ return token===window._clsToken&&document.getElementById('cls-panel-classes'); };
  function applyList(v){
    window._clsList=v;
    var coreSet=0, wvSet=0, runtime=0;
    _clsOrders().forEach(function(o){
      var x=v[o]||{}, cell=document.getElementById('cls-vid-'+o);
      if(x.src){ if(o>100) wvSet++; else coreSet++; }
      if(cell) cell.innerHTML=x.src?'<span class="adm-badge ok">Uploaded</span>':'<span class="adm-badge warn">Missing</span>';
      if(o<100){
        runtime+=parseInt(x.duration,10)||0;
        var d=document.getElementById('cls-dur-'+o);
        if(d) d.innerHTML=x.duration?escapeHtml(x.duration):'<span style="color:#fbbf24">Duration not set</span>';
        var t=document.getElementById('cls-title-'+o);
        if(t&&x.title) t.textContent=x.title;
      }
    });
    document.getElementById('cls-stats').innerHTML=admStats([
      ['Class videos', coreSet, coreSet<ALL_LESSONS.length?'warn':'ok', '/'+ALL_LESSONS.length],
      ['Workshop videos', wvSet, wvSet<WV_DATA.length?'warn':'ok', '/'+WV_DATA.length],
      ['Total runtime', runtime>=60?Math.floor(runtime/60)+'h '+(runtime%60):runtime, '', runtime>=60?'m':' min']
    ]);
  }
  // Revisits in the same session show the last list instantly, then refresh quietly.
  if(window._clsList) applyList(window._clsList);
  _clsLoadList(['src','duration','title']).then(function(v){
    if(live()) applyList(v);
  },function(e){
    if(!live()) return;
    console.warn('Classes list load failed:',e);
    if(window._clsList) return; // keep showing the last good list
    document.getElementById('cls-err').innerHTML='<div class="adm-card" style="padding:12px 16px;margin-bottom:16px;color:#fb7185;font-size:13px;display:flex;align-items:center;justify-content:space-between;gap:12px">Could not load video details: '+escapeHtml(e.message||'')+'<button class="adm-btn" onclick="renderAdminClasses()">'+ADM_ICON.refresh+'Try again</button></div>';
    _clsOrders().forEach(function(o){ var c=document.getElementById('cls-vid-'+o); if(c) c.innerHTML='<span class="adm-muted">—</span>'; var d=document.getElementById('cls-dur-'+o); if(d) d.textContent=''; });
  });

  // ── 2. Students with access: same unlock rule as Students / Progress (AdmProgress),
  //       loaded once per visit without quiz scores; tab switches never refetch. ──
  AdmProgress.load(null,{quiz:false}).then(function(d){
    if(!live()) return;
    var all=loadStudents(), seen={}, list=Object.values(all).filter(function(x){var k=(x.email||x.id).toLowerCase().trim();if(seen[k])return false;return seen[k]=true;});
    var calc=list.map(function(x){return AdmProgress.compute(x.id, all, d);});
    [].forEach.call(document.querySelectorAll('.cls-access'),function(td){
      var o=Number(td.getAttribute('data-order'));
      var n=calc.filter(function(c){var st=c.classState(o);return st==='open'||st==='done';}).length, tot=list.length, pct=tot?Math.round(n/tot*100):0;
      td.innerHTML='<div style="display:flex;align-items:center;gap:10px"><div class="adm-meter'+(n&&n===tot?' ok':'')+'"><span style="width:'+pct+'%"></span></div><span class="adm-num">'+n+'/'+tot+'</span></div>';
    });
  },function(e){
    if(!live()) return;
    [].forEach.call(document.querySelectorAll('.cls-access'),function(td){ td.innerHTML='<span class="adm-muted" title="'+escapeHtml(e.message||'')+'">—</span>'; });
  });

  window.clsShowTab=function(which){
    window._clsTab=which;
    ['classes','workshop'].forEach(function(k){
      var t=document.getElementById('cls-tab-'+k), p=document.getElementById('cls-panel-'+k);
      if(!t||!p) return;
      var on=k===which; t.classList.toggle('on',on); t.setAttribute('aria-selected',on?'true':'false'); p.hidden=!on;
    });
  };

  function _vmEl(id){return document.getElementById(id);}
  function _vmEsc(e){ if(e.key==='Escape') closeVideoModal(); }
  window.closeVideoModal=()=>{ var m=_vmEl('video-modal'); if(m) m.style.display='none'; document.removeEventListener('keydown',_vmEsc); window._vmOpenToken=null; };
  window.vmSrcCheck=()=>{
    var u=_vmEl('vm-src').value.trim(), k=_vmEl('vm-src-kind'), o=_vmEl('vm-src-open');
    var ok=/^https?:\/\//i.test(u);
    k.innerHTML=!u?'<span class="adm-badge warn">Missing</span>'
      : !ok?'<span class="adm-badge bad">Not a link</span>'
      : /mediadelivery\.net|b-cdn\.net|bunny/i.test(u)?'<span class="adm-badge ok">Bunny Stream</span>'
      : /\.mp4(\?|$)/i.test(u)?'<span class="adm-badge ok">MP4</span>'
      : '<span class="adm-badge info">Link</span>';
    o.style.display=ok?'':'none'; if(ok) o.href=u;
  };
  // Opening reads just this class's src + desc from the server (no thumbnails, no player).
  window.openVideoModal=(order)=>{
    var m=_vmEl('video-modal');
    if(m&&m.parentElement!==document.body){ [].forEach.call(document.querySelectorAll('body > #video-modal'),function(x){x.remove();}); document.body.appendChild(m); }
    const lesson=ALL_LESSONS.find(l=>l.order===order);
    const wvItem=(order>=101&&order<=110)?WV_DATA[order-101]:null;
    const cached=(window._clsList||{})[order]||{};
    _vmEl('vm-order').value=order;
    _vmEl('vm-kicker').textContent=wvItem?'Pronunciation Workshop · W'+(order-100):'Day '+order;
    _vmEl('vm-title').textContent=wvItem?wvItem.title:(cached.title||(lesson?lesson.title:'Edit class'));
    var src=_vmEl('vm-src'), desc=_vmEl('vm-desc'), btn=_vmEl('vm-save-btn'), msg=_vmEl('vm-save-msg');
    src.value=''; desc.value=''; src.disabled=desc.disabled=btn.disabled=true;
    src.placeholder='Loading…'; desc.placeholder='Loading…';
    msg.style.color=''; msg.textContent=''; btn.textContent='Save changes';
    vmSrcCheck(); _vmEl('vm-src-kind').innerHTML='';
    m.style.display='flex';
    document.addEventListener('keydown',_vmEsc);
    var t=window._vmOpenToken={};
    _clsFetchFields([order],['src','desc']).then(function(v){
      if(window._vmOpenToken!==t) return;
      src.value=v[order].src; desc.value=v[order].desc;
      src.disabled=desc.disabled=btn.disabled=false;
      src.placeholder='https://player.mediadelivery.net/play/… or an .mp4 link';
      desc.placeholder='Short description shown under the video on the lesson page';
      vmSrcCheck(); src.focus();
    },function(e){
      if(window._vmOpenToken!==t) return;
      msg.style.color='#fb7185'; msg.textContent='Could not load this class: '+(e.message||e);
    });
  };
  // Save changes ONLY src + desc. The row is re-read right before writing so thumbnails,
  // titles, quizzes-related fields and edits made elsewhere are kept exactly as they are.
  window.saveVideo=async()=>{
    const order=Number(_vmEl('vm-order').value);
    const src=_vmEl('vm-src').value.trim(), desc=_vmEl('vm-desc').value.trim(), msg=_vmEl('vm-save-msg'), btn=_vmEl('vm-save-btn');
    msg.style.color=''; msg.textContent='';
    if(src&&!/^https?:\/\//i.test(src)){ msg.style.color='#fb7185'; msg.textContent='The video link must start with https://'; _vmEl('vm-src').focus(); return; }
    btn.disabled=true; btn.textContent='Saving…';
    try{
      const cur=await _sb.from('course_config').select('data').eq('id','videos').maybeSingle();
      if(cur.error) throw new Error(cur.error.message);
      const vids=(cur.data&&cur.data.data)||{};
      vids[order]={...(vids[order]||{}), src:src, desc:desc};
      const{error}=await _sb.from('course_config').upsert({id:'videos',data:vids,updated_at:new Date().toISOString()},{onConflict:'id'});
      if(error) throw new Error(error.message);
      if(typeof _videoData!=='undefined') _videoData=vids; // keep this tab's copy current (Images etc.)
    }catch(e){
      console.error('Video save error:',e);
      msg.style.color='#fb7185'; msg.textContent='Could not save: '+(e.message||e)+'. Nothing was changed for students.';
      btn.disabled=false; btn.textContent='Save changes';
      return;
    }
    if(window._clsList){ window._clsList[order]=Object.assign({},window._clsList[order],{src:src}); }
    var cell=document.getElementById('cls-vid-'+order);
    if(cell) cell.innerHTML=src?'<span class="adm-badge ok">Uploaded</span>':'<span class="adm-badge warn">Missing</span>';
    closeVideoModal();
  };
}
