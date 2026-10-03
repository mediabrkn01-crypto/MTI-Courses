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
function renderAdminClasses(){
  const students=Object.values(loadStudents());
  const videos=loadVideos();

  const coreSet=ALL_LESSONS.filter(l=>(videos[l.order]||{}).src).length;
  const quizReady=ALL_LESSONS.filter(l=>hasRealQuiz(l)).length;
  const wvSet=WV_DATA.filter((f,i)=>(videos[101+i]||{}).src).length;
  const runtime=ALL_LESSONS.reduce((m,l)=>m+(parseInt((videos[l.order]||{}).duration,10)||0),0);
  const thumbCell=(thumb,fallback)=>'<div class="adm-cthumb">'+(thumb?'<img src="'+escapeAttr(thumb)+'" alt="" loading="lazy" onerror="this.remove()"/>':fallback)+'</div>';

  app.innerHTML=adminTopBar('classes')+`
  <div class="adm-page">
    ${admHead('Classes & Videos','Set video URLs, titles and durations for each class.')}
    ${admStats([
      ['Class videos', coreSet, coreSet<ALL_LESSONS.length?'warn':'ok', '/'+ALL_LESSONS.length],
      ['Quizzes ready', quizReady, '', '/'+ALL_LESSONS.length],
      ['Workshop videos', wvSet, wvSet<WV_DATA.length?'warn':'ok', '/'+WV_DATA.length],
      ['Total runtime', runtime>=60?Math.floor(runtime/60)+'h '+(runtime%60):runtime, '', runtime>=60?'m':' min']
    ])}

    <!-- Edit Class dialog (moved to <body> on open so the sticky top bar can't cover it) -->
    <div id="video-modal" class="qe-overlay" style="display:none" onclick="if(event.target===this)closeVideoModal()">
      <div class="qe-panel cm-panel" role="dialog" aria-modal="true" aria-labelledby="vm-title">
        <div class="qe-head">
          <div style="min-width:0">
            <p class="cm-kicker" id="vm-kicker">Day 1</p>
            <h2 class="cm-title" id="vm-title">Edit class</h2>
          </div>
          <button type="button" class="qe-x" onclick="closeVideoModal()" aria-label="Close">×</button>
        </div>
        <input id="vm-order" type="hidden"/>
        <input id="vm-class-label" type="hidden"/>

        <div class="qe-body cm-body">
          <div class="cm-form">
            <section class="cm-sec">
              <h3 class="cm-sec-title">Lesson details</h3>
              <div class="cm-field">
                <label class="adm-label" for="vm-panelTitle">Title</label>
                <input id="vm-panelTitle" type="text" class="adm-input" placeholder="e.g. Pronunciation Essentials" oninput="updateVmPreview()"/>
              </div>
              <div class="cm-row">
                <div class="cm-field">
                  <label class="adm-label" for="vm-instructor">Instructor</label>
                  <input id="vm-instructor" type="text" class="adm-input" placeholder="Broken English Team" oninput="updateVmPreview()"/>
                </div>
                <div class="cm-field" style="max-width:150px">
                  <label class="adm-label" for="vm-dur">Duration</label>
                  <input id="vm-dur" type="text" class="adm-input" placeholder="e.g. 14 min" oninput="updateVmPreview()"/>
                </div>
              </div>
              <div class="cm-field">
                <label class="adm-label" for="vm-bullets">In this lesson <span class="cm-opt">one point per line</span></label>
                <textarea id="vm-bullets" rows="4" class="adm-input" style="resize:vertical" placeholder="Pronunciation patterns&#10;Stress &amp; intonation&#10;Common mistakes&#10;Real-world examples" oninput="updateVmPreview()"></textarea>
              </div>
              <div class="cm-field" style="margin-bottom:0">
                <label class="adm-label" for="vm-desc">Lesson page description</label>
                <textarea id="vm-desc" rows="3" class="adm-input" style="resize:vertical" placeholder="Short description shown under the video on the lesson page"></textarea>
              </div>
            </section>

            <section class="cm-sec">
              <h3 class="cm-sec-title">Video</h3>
              <div class="cm-field">
                <div class="cm-label-row"><label class="adm-label" for="vm-src">Video link</label><span id="vm-src-kind"></span></div>
                <div class="cm-inline">
                  <input id="vm-src" type="url" class="adm-input" placeholder="https://player.mediadelivery.net/play/… or an .mp4 link" oninput="vmSrcCheck()"/>
                  <a id="vm-src-open" class="adm-btn" target="_blank" rel="noopener" style="display:none">Open</a>
                </div>
              </div>
              <div class="cm-field" style="margin-bottom:0">
                <label class="adm-label">Thumbnail</label>
                <input id="vm-thumb" type="hidden"/>
                <div class="cm-thumb">
                  <div id="vm-thumb-img" class="cm-thumb-img"></div>
                  <div class="cm-thumb-side">
                    <p id="vm-thumb-info" class="adm-hint" style="margin:0 0 8px">No thumbnail</p>
                    <div style="display:flex;gap:6px;flex-wrap:wrap">
                      <label class="adm-btn" style="cursor:pointer">${ADM_ICON.upload}Upload image<input type="file" accept="image/*" style="display:none" onchange="vmThumbFile(this)"/></label>
                      <button type="button" class="adm-btn" onclick="vmThumbUrl()">Use a link</button>
                      <button type="button" id="vm-thumb-clear" class="adm-btn adm-btn-danger" onclick="vmThumbSet('')" style="display:none">Remove</button>
                    </div>
                  </div>
                </div>
                <input id="vm-thumb-url" type="url" class="adm-input" placeholder="https://… image link" style="display:none;margin-top:8px" oninput="vmThumbSet(this.value.trim(),true)"/>
              </div>
            </section>

            <section class="cm-sec" id="vm-quiz-sec">
              <div class="cm-label-row" style="margin-bottom:10px"><h3 class="cm-sec-title" style="margin:0">Mission challenge quiz</h3><span id="vm-quiz-current"></span></div>
              <label class="cm-drop">
                ${ADM_ICON.upload}
                <span id="vm-quiz-filename">Choose a DOCX, TXT or JSON file</span>
                <input id="vm-quiz-file" type="file" accept=".docx,.txt,.json" style="display:none" onchange="vmQuizFileSelected(this)"/>
              </label>
              <p class="adm-hint" style="margin:6px 0 0">Questions are read from the file and replace this class's current quiz.</p>
              <div id="vm-quiz-status" class="cm-status" style="display:none"></div>
              <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
                <button type="button" id="vm-quiz-upload-btn" class="adm-btn adm-btn-primary" onclick="vmUploadQuiz()" style="display:none">Process &amp; save quiz</button>
                <button type="button" id="vm-quiz-delete-btn" class="adm-btn adm-btn-danger" onclick="vmDeleteQuiz()" style="display:none">${ADM_ICON.trash}Remove uploaded quiz</button>
              </div>
            </section>
          </div>

          <aside class="cm-side">
            <p class="adm-label" style="margin-bottom:8px">Preview</p>
            <div id="vm-preview" class="cm-pv">
              <div class="cm-pv-img"><span class="cm-pv-play"><svg width="16" height="16" viewBox="0 0 24 24" fill="#ED1F51"><path d="M8 5v14l11-7z"/></svg></span></div>
              <div class="cm-pv-body">
                <p id="pvw-title" class="cm-pv-title">—</p>
                <p id="pvw-instructor" class="cm-pv-by">—</p>
                <p class="cm-pv-k" id="pvw-bullets-k">In this lesson</p>
                <div id="pvw-bullets" class="cm-pv-list"></div>
                <div class="cm-pv-dur"><span>Duration</span><b id="pvw-dur">—</b></div>
              </div>
            </div>
            <p class="adm-hint" style="text-align:center">Updates as you type</p>
          </aside>
        </div>

        <div class="qe-foot" style="justify-content:flex-end">
          <span id="vm-save-msg" class="adm-hint" style="margin:0 auto 0 0"></span>
          <button type="button" class="adm-btn adm-btn-lg" onclick="closeVideoModal()">Cancel</button>
          <button type="button" id="vm-save-btn" class="adm-btn adm-btn-primary adm-btn-lg" onclick="saveVideo()">Save changes</button>
        </div>
      </div>
    </div>

    ${SECTIONS.map(section=>`
      <div class="adm-section">
        ${admSectionLabel(section.title, section.lessons.length+' classes')}
        <div class="adm-card admin-table-wrap"><div style="overflow-x:auto">
          <table class="admin-table" style="min-width:720px">
            <thead><tr>
              <th style="width:56px">Day</th><th>Class</th>
              <th style="width:120px">Video</th><th style="width:190px">Students with access</th>
              <th style="width:110px">Quiz</th><th class="right" style="width:90px"></th>
            </tr></thead>
            <tbody>
              ${section.lessons.map(l=>{
                const v=videos[l.order]||{};
                return`<tr>
                  <td><span class="adm-day">${l.order}</span></td>
                  <td><div style="display:flex;align-items:center;gap:12px;min-width:0">
                    ${thumbCell(v.thumb, ADM_ICON.image)}
                    <div style="min-width:0"><p class="adm-name">${escapeHtml(v.title||l.title)}</p>
                    <p class="adm-meta">${v.duration?escapeHtml(v.duration):'<span style="color:#fbbf24">Duration not set</span>'}</p></div>
                  </div></td>
                  <td>${v.src?'<span class="adm-badge ok">Uploaded</span>':'<span class="adm-badge warn">Missing</span>'}</td>
                  <td class="cls-access" data-order="${l.order}"><span class="adm-skel"></span></td>
                  <td>${hasRealQuiz(l)?'<span class="adm-badge ok">Ready</span>':'<span class="adm-badge muted">None</span>'}</td>
                  <td class="right"><button class="adm-btn" onclick="openVideoModal(${l.order})">${ADM_ICON.edit}Edit</button></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div></div>
      </div>`).join('')}

    <div class="adm-section">
      ${admSectionLabel('Pronunciation Workshop', WV_DATA.length+' classes')}
      <div class="adm-card admin-table-wrap"><div style="overflow-x:auto">
        <table class="admin-table" style="min-width:560px">
          <thead><tr><th style="width:56px">#</th><th>Workshop</th><th style="width:120px">Video</th><th class="right" style="width:90px"></th></tr></thead>
          <tbody>
            ${WV_DATA.map((f,i)=>{
              const v=videos[101+i]||{};
              return`<tr>
                <td><span class="adm-day" style="font-size:10px">W${i+1}</span></td>
                <td><div style="display:flex;align-items:center;gap:12px;min-width:0">
                  ${thumbCell(v.thumb,'<span style="font-size:18px">'+f.icon+'</span>')}
                  <div style="min-width:0"><p class="adm-name">${escapeHtml(f.title)}</p><p class="adm-meta">${escapeHtml(f.cat)} · ${escapeHtml(f.dur)}</p></div>
                </div></td>
                <td>${v.src?'<span class="adm-badge ok">Uploaded</span>':'<span class="adm-badge warn">Missing</span>'}</td>
                <td class="right"><button class="adm-btn" onclick="openVideoModal(${101+i})">${ADM_ICON.edit}Edit</button></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div></div>
    </div>
  </div>`;

  function _vmEl(id){return document.getElementById(id);}
  function _vmEsc(e){ if(e.key==='Escape') closeVideoModal(); }
  window.closeVideoModal=()=>{ var m=_vmEl('video-modal'); if(m) m.style.display='none'; document.removeEventListener('keydown',_vmEsc); };
  // Students with access = students who can open the class in the student app (same
  // AdmProgress rule as Students / Progress), not the legacy access_list field.
  AdmProgress.load().then(function(d){
    var all=loadStudents(), seen={}, list=Object.values(all).filter(function(x){var k=(x.email||x.id).toLowerCase().trim();if(seen[k])return false;return seen[k]=true;});
    var calc=list.map(function(x){return AdmProgress.compute(x.id, all, d);});
    [].forEach.call(document.querySelectorAll('.cls-access'),function(td){
      var o=Number(td.getAttribute('data-order'));
      var n=calc.filter(function(c){var st=c.classState(o);return st==='open'||st==='done';}).length, tot=list.length, pct=tot?Math.round(n/tot*100):0;
      td.innerHTML='<div style="display:flex;align-items:center;gap:10px"><div class="adm-meter'+(n&&n===tot?' ok':'')+'"><span style="width:'+pct+'%"></span></div><span class="adm-num">'+n+'/'+tot+'</span></div>';
    });
  },function(e){
    [].forEach.call(document.querySelectorAll('.cls-access'),function(td){ td.innerHTML='<span class="adm-muted" title="'+escapeHtml(e.message||'')+'">—</span>'; });
  });

  window.openVideoModal=(order)=>{
    var m=_vmEl('video-modal');
    if(m&&m.parentElement!==document.body){ [].forEach.call(document.querySelectorAll('body > #video-modal'),function(x){x.remove();}); document.body.appendChild(m); }
    const v=loadVideos()[order]||{};
    const lesson=ALL_LESSONS.find(l=>l.order===order);
    // WV items have order 101-110
    const wvItem=(order>=101&&order<=110)?WV_DATA[order-101]:null;
    const name=wvItem?wvItem.title:(lesson?lesson.title:'');
    _vmEl('vm-order').value=order;
    _vmEl('vm-class-label').value=name;
    _vmEl('vm-kicker').textContent=wvItem?'Pronunciation Workshop · W'+(order-100):'Day '+order;
    _vmEl('vm-title').textContent=name||'Edit class';
    _vmEl('vm-panelTitle').value=v.panelTitle||name;
    _vmEl('vm-instructor').value=v.instructor||'';
    _vmEl('vm-src').value=v.src||'';
    _vmEl('vm-dur').value=v.duration||'';
    _vmEl('vm-bullets').value=v.bullets||'';
    _vmEl('vm-bullets').placeholder=(DAY_BULLETS[order]||['Pronunciation patterns','Stress & intonation','Common mistakes','Real-world examples']).join('\n');
    _vmEl('vm-desc').value=v.desc||'';
    _vmEl('vm-thumb-url').style.display='none'; _vmEl('vm-thumb-url').value='';
    vmThumbSet(v.thumb||'');
    vmSrcCheck();
    _vmEl('vm-save-msg').textContent='';
    var sb=_vmEl('vm-save-btn'); sb.disabled=false; sb.textContent='Save changes';

    // Quiz (core classes only — workshop lessons have no quiz)
    _vmEl('vm-quiz-sec').style.display=wvItem?'none':'';
    _vmEl('vm-quiz-status').style.display='none';
    _vmEl('vm-quiz-upload-btn').style.display='none';
    _vmEl('vm-quiz-filename').textContent='Choose a DOCX, TXT or JSON file';
    _vmEl('vm-quiz-file').value='';
    var hasDynamic=!!_dynamicQuizCache[order], hasHard=!!QUIZ_BANK[order];
    _vmEl('vm-quiz-current').innerHTML=hasDynamic
      ? '<span class="adm-badge ok">Uploaded · '+_dynamicQuizCache[order].length+' questions</span>'
      : hasHard ? '<span class="adm-badge warn">Built-in · '+QUIZ_BANK[order].length+' questions</span>'
      : '<span class="adm-badge muted">No quiz</span>';
    _vmEl('vm-quiz-delete-btn').style.display=hasDynamic?'':'none';

    m.style.display='flex';
    document.addEventListener('keydown',_vmEsc);
    updateVmPreview();
    setTimeout(function(){ _vmEl('vm-panelTitle').focus(); },30);
  };
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
  // Thumbnail: an uploaded image is stored as a compressed data URL (as before); a link is stored as-is.
  window.vmThumbSet=(val,fromUrlBox)=>{
    _vmEl('vm-thumb').value=val||'';
    var img=_vmEl('vm-thumb-img'), info=_vmEl('vm-thumb-info');
    img.style.backgroundImage=val?'url("'+String(val).replace(/["\\]/g,'')+'")':'';
    img.classList.toggle('empty',!val);
    info.textContent=!val?'No thumbnail'
      : val.indexOf('data:')===0?'Uploaded image · '+Math.round(val.length*0.75/1024)+' KB'
      : val.replace(/^https?:\/\//,'').slice(0,48)+(val.length>56?'…':'');
    _vmEl('vm-thumb-clear').style.display=val?'':'none';
    if(!fromUrlBox&&!val){ _vmEl('vm-thumb-url').value=''; }
    updateVmPreview();
  };
  window.vmThumbUrl=()=>{
    var box=_vmEl('vm-thumb-url'), cur=_vmEl('vm-thumb').value;
    box.style.display=''; box.value=cur.indexOf('data:')===0?'':cur; box.focus();
  };
  window.vmThumbFile=(input)=>{
    var f=input.files&&input.files[0]; input.value='';
    if(!f) return;
    if(!/^image\//.test(f.type)){ alert('Please choose an image file.'); return; }
    var r=new FileReader();
    r.onload=function(){
      var im=new Image();
      im.onload=function(){
        var MAX=1280, sc=Math.min(1,MAX/Math.max(im.width,im.height));
        var c=document.createElement('canvas'); c.width=Math.round(im.width*sc); c.height=Math.round(im.height*sc);
        c.getContext('2d').drawImage(im,0,0,c.width,c.height);
        _vmEl('vm-thumb-url').style.display='none';
        vmThumbSet(c.toDataURL('image/jpeg',0.82));
      };
      im.onerror=function(){ alert('Could not read that image.'); };
      im.src=r.result;
    };
    r.readAsDataURL(f);
  };
  window.updateVmPreview=()=>{
    const title=_vmEl('vm-panelTitle').value.trim()||_vmEl('vm-class-label').value||'Lesson title';
    const instr=_vmEl('vm-instructor').value.trim()||'Broken English Team';
    const dur=_vmEl('vm-dur').value.trim()||'—';
    const own=(_vmEl('vm-bullets').value||'').split('\n').map(b=>b.trim()).filter(Boolean);
    // Same fallback as the lesson page (js/pages/lesson.js) when no points are entered.
    const order=Number(_vmEl('vm-order').value);
    const bullets=(own.length?own:(DAY_BULLETS[order]||['Pronunciation patterns','Stress & intonation','Common mistakes','Real-world examples'])).slice(0,5);
    _vmEl('pvw-bullets-k').textContent=own.length?'In this lesson':'In this lesson · default';
    const thumb=_vmEl('vm-thumb').value;
    _vmEl('pvw-title').textContent=title;
    _vmEl('pvw-instructor').textContent='Instructor: '+instr;
    _vmEl('pvw-dur').textContent=dur;
    _vmEl('pvw-bullets').innerHTML=bullets.length
      ? bullets.map(b=>'<div><span></span>'+escapeHtml(b)+'</div>').join('')
      : '';
    const bg=document.querySelector('#vm-preview .cm-pv-img');
    if(bg) bg.style.backgroundImage=thumb?'url("'+String(thumb).replace(/["\\]/g,'')+'")':'';
  };
  window.saveVideo=async()=>{
    const order=Number(_vmEl('vm-order').value);
    const src=_vmEl('vm-src').value.trim(), msg=_vmEl('vm-save-msg'), btn=_vmEl('vm-save-btn');
    msg.style.color=''; msg.textContent='';
    if(src&&!/^https?:\/\//i.test(src)){ msg.style.color='#fb7185'; msg.textContent='The video link must start with https://'; _vmEl('vm-src').focus(); return; }
    const vids=loadVideos();
    const title=_vmEl('vm-panelTitle').value.trim()||_vmEl('vm-class-label').value||'';
    vids[order]={
      ...(vids[order]||{}),
      panelTitle: title,
      instructor: _vmEl('vm-instructor').value.trim(),
      src:        src,
      duration:   _vmEl('vm-dur').value.trim(),
      bullets:    _vmEl('vm-bullets').value.trim(),
      thumb:      _vmEl('vm-thumb').value.trim(),
      desc:       _vmEl('vm-desc').value.trim(),
      // keep legacy title field for lesson page compat
      title:      _vmEl('vm-panelTitle').value.trim(),
    };
    btn.disabled=true; btn.textContent='Saving…';
    try{
      if(typeof _sb==='undefined') throw new Error('Not connected to the server');
      const{error}=await _sb.from('course_config').upsert({id:'videos',data:vids,updated_at:new Date().toISOString()},{onConflict:'id'});
      if(error) throw new Error(error.message);
    }catch(e){
      console.error('Video save error:',e);
      msg.style.color='#fb7185'; msg.textContent='Could not save: '+(e.message||e)+'. Nothing was changed for students.';
      btn.disabled=false; btn.textContent='Save changes';
      return;
    }
    // Server saved — update this browser's copy too.
    try{ localStorage.setItem('brokeneng_videos', JSON.stringify(vids)); }catch(e){}
    closeVideoModal();
    renderAdminClasses();
  };
}
