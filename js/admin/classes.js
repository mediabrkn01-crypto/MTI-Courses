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

    <!-- Lesson Panel Edit Modal -->
    <div id="video-modal" style="display:none;position:fixed;inset:0;z-index:50;align-items:flex-start;justify-content:center;background:rgba(0,0,0,0.75);backdrop-filter:blur(10px);padding:16px;overflow-y:auto">
      <div class="lg" style="width:100%;max-width:720px;margin:24px auto">
        <!-- Header -->
        <div style="padding:22px 24px 0;display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <div>
            <h2 style="font-size:18px;font-weight:700;color:#fff">Edit Class <span id="vm-class-label" style="color:var(--brand-2)"></span></h2>
            <p style="font-size:12px;color:rgba(255,255,255,0.4);margin-top:3px">These appear in the lesson preview panel and on the lesson page.</p>
          </div>
          <button onclick="document.getElementById('video-modal').style.display='none'" style="width:32px;height:32px;border-radius:99px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:rgba(255,255,255,0.6);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">✕</button>
        </div>
        <input id="vm-order" type="hidden"/>

        <div style="display:flex;gap:20px;padding:0 24px 22px;flex-wrap:wrap">
          <!-- LEFT: form fields -->
          <div style="flex:1;min-width:260px;display:flex;flex-direction:column;gap:13px">

            <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:12px 14px">
              <p style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--brand-2);margin-bottom:10px">📋 Lesson Panel Info</p>

              <div style="margin-bottom:11px">
                <label style="display:block;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,0.45);margin-bottom:5px">Panel Title</label>
                <input id="vm-panelTitle" type="text" placeholder="e.g. Pronunciation Essentials" class="glass-input" oninput="updateVmPreview()"/>
              </div>

              <div style="margin-bottom:11px">
                <label style="display:block;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,0.45);margin-bottom:5px">Instructor Name</label>
                <input id="vm-instructor" type="text" placeholder="e.g. Broken English Team" class="glass-input" oninput="updateVmPreview()"/>
              </div>

              <div style="margin-bottom:11px">
                <label style="display:block;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,0.45);margin-bottom:5px">Duration</label>
                <input id="vm-dur" type="text" placeholder="e.g. 18 min" class="glass-input" oninput="updateVmPreview()"/>
              </div>

              <div>
                <label style="display:block;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,0.45);margin-bottom:5px">Bullet Points <span style="color:rgba(255,255,255,0.3);font-weight:400;text-transform:none;font-size:9px">— one per line</span></label>
                <textarea id="vm-bullets" rows="4" placeholder="Pronunciation patterns&#10;Stress & intonation&#10;Common mistakes&#10;Real-world examples" class="glass-input" style="resize:vertical" oninput="updateVmPreview()"></textarea>
              </div>
            </div>

            <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:12px 14px">
              <p style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--brand-2);margin-bottom:10px">🎬 Video & Media</p>

              <div style="margin-bottom:11px">
                <label style="display:block;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,0.45);margin-bottom:5px">Video URL (MP4)</label>
                <input id="vm-src" type="text" placeholder="https://..." class="glass-input"/>
              </div>

              <div style="margin-bottom:11px">
                <label style="display:block;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,0.45);margin-bottom:5px">Thumbnail / Panel Image URL</label>
                <input id="vm-thumb" type="text" placeholder="https://i.imgur.com/..." class="glass-input" oninput="updateVmPreview()"/>
                <p style="font-size:10px;color:rgba(255,255,255,0.3);margin-top:4px">Upload to <a href="https://imgur.com" target="_blank" style="color:var(--brand-2)">imgur.com</a> → right-click image → Copy image address</p>
              </div>

              <div>
                <label style="display:block;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,0.45);margin-bottom:5px">Lesson Page Description</label>
                <textarea id="vm-desc" rows="2" placeholder="Short description shown on the lesson page..." class="glass-input" style="resize:none"></textarea>
              </div>
            </div>

            <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:12px 14px">
              <p style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--brand-2);margin-bottom:10px">⚡ Quiz Upload</p>
              <p style="font-size:11px;color:rgba(255,255,255,.4);margin-bottom:10px">Upload a PDF, DOCX, or TXT file. Claude AI will extract the questions automatically.</p>
              <div id="vm-quiz-status" style="display:none;font-size:12px;margin-bottom:10px;padding:8px 10px;border-radius:8px"></div>
              <div id="vm-quiz-current" style="margin-bottom:10px"></div>
              <label style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.07);border:1px dashed rgba(255,255,255,.2);border-radius:10px;padding:12px 14px;cursor:pointer;font-size:12px;color:rgba(255,255,255,.6);transition:border-color .2s" onmouseover="this.style.borderColor='rgba(255,45,120,.5)'" onmouseout="this.style.borderColor='rgba(255,255,255,.2)'">
                <span style="font-size:18px">📄</span>
                <span id="vm-quiz-filename">Choose PDF, DOCX, or TXT file...</span>
                <input id="vm-quiz-file" type="file" accept=".pdf,.docx,.txt,.json" style="display:none" onchange="vmQuizFileSelected(this)"/>
              </label>
              <div style="display:flex;gap:8px;margin-top:10px">
                <button id="vm-quiz-upload-btn" onclick="vmUploadQuiz()" style="display:none;flex:1;background:var(--grad);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;padding:9px 14px;cursor:pointer;font-family:Montserrat,sans-serif">⚡ Process & Save Quiz</button>
                <button id="vm-quiz-delete-btn" onclick="vmDeleteQuiz()" style="display:none;background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);border-radius:8px;color:#ef4444;font-size:12px;font-weight:700;padding:9px 14px;cursor:pointer">🗑 Remove Quiz</button>
              </div>
            </div>
          </div>

          <!-- RIGHT: live preview -->
          <div style="width:210px;flex-shrink:0">
            <p style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:10px">👁 Live Preview</p>
            <div id="vm-preview" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.14);border-radius:16px;overflow:hidden">
              <div style="height:110px;background:linear-gradient(135deg,#1a1a2e,#16213e);display:flex;align-items:center;justify-content:center">
                <svg style="width:28px;height:28px;color:rgba(255,255,255,0.2)" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              </div>
              <div style="padding:12px">
                <p id="pvw-title" style="font-size:12px;font-weight:700;color:#fff;margin-bottom:2px">—</p>
                <p id="pvw-instructor" style="font-size:10px;color:var(--brand-2);margin-bottom:10px">Instructor: —</p>
                <div style="background:rgba(255,255,255,0.07);border-radius:10px;padding:10px;margin-bottom:8px">
                  <p style="font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:6px">In This Lesson</p>
                  <div id="pvw-bullets" style="display:flex;flex-direction:column;gap:4px"></div>
                </div>
                <div style="background:rgba(255,255,255,0.07);border-radius:10px;padding:10px;text-align:center">
                  <p style="font-size:9px;color:rgba(255,255,255,0.4);margin-bottom:2px">Duration</p>
                  <p id="pvw-dur" style="font-size:13px;font-weight:700;color:#fff">—</p>
                </div>
              </div>
            </div>
            <p style="font-size:10px;color:rgba(255,255,255,0.3);margin-top:8px;text-align:center">Updates as you type</p>
          </div>
        </div>

        <div style="padding:0 24px 22px;display:flex;gap:10px">
          <button onclick="saveVideo()" class="btn-primary" style="flex:1;padding:12px;font-size:14px">Save Changes</button>
          <button onclick="document.getElementById('video-modal').style.display='none'" class="btn-ghost" style="flex:1;padding:12px;font-size:14px">Cancel</button>
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
                const count=students.filter(s=>(s.accessList||[]).includes(l.order)).length;
                const pct=students.length?Math.round(count/students.length*100):0;
                return`<tr>
                  <td><span class="adm-day">${l.order}</span></td>
                  <td><div style="display:flex;align-items:center;gap:12px;min-width:0">
                    ${thumbCell(v.thumb, ADM_ICON.image)}
                    <div style="min-width:0"><p class="adm-name">${escapeHtml(v.title||l.title)}</p>
                    <p class="adm-meta">${v.duration?escapeHtml(v.duration):'<span style="color:#fbbf24">Duration not set</span>'}</p></div>
                  </div></td>
                  <td>${v.src?'<span class="adm-badge ok">Uploaded</span>':'<span class="adm-badge warn">Missing</span>'}</td>
                  <td><div style="display:flex;align-items:center;gap:10px"><div class="adm-meter${count&&count===students.length?' ok':''}"><span style="width:${pct}%"></span></div><span class="adm-num">${count}/${students.length}</span></div></td>
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

  window.openVideoModal=(order)=>{
    const v=loadVideos()[order]||{};
    const lesson=ALL_LESSONS.find(l=>l.order===order);
    // WV items have order 101-110
    const wvItem=(order>=101&&order<=110)?WV_DATA[order-101]:null;
    document.getElementById('vm-order').value=order;
    document.getElementById('vm-class-label').textContent=wvItem?('Pronunciation Workshop — '+wvItem.title):`Day ${order} — ${lesson?.title||''}`;
    document.getElementById('vm-panelTitle').value=v.panelTitle||(wvItem?wvItem.title:lesson?lesson.title:'');
    document.getElementById('vm-instructor').value=v.instructor||'';
    document.getElementById('vm-src').value=v.src||'';
    document.getElementById('vm-dur').value=v.duration||'';
    document.getElementById('vm-bullets').value=v.bullets||'';
    document.getElementById('vm-thumb').value=v.thumb||'';
    document.getElementById('vm-desc').value=v.desc||'';
    document.getElementById('video-modal').style.display='flex';
    updateVmPreview();
    // Populate quiz status
    var qStatus=document.getElementById('vm-quiz-status');
    var qCurrent=document.getElementById('vm-quiz-current');
    var qDelBtn=document.getElementById('vm-quiz-delete-btn');
    var qFileBtn=document.getElementById('vm-quiz-upload-btn');
    var qFilename=document.getElementById('vm-quiz-filename');
    if(qStatus){qStatus.style.display='none';}
    if(qFileBtn){qFileBtn.style.display='none';}
    if(qFilename){qFilename.textContent='Choose PDF, DOCX, or TXT file...';}
    if(document.getElementById('vm-quiz-file')) document.getElementById('vm-quiz-file').value='';
    if(qCurrent){
      var hasDynamic=!!_dynamicQuizCache[order];
      var hasHardcoded=!!QUIZ_BANK[order];
      if(hasDynamic){
        qCurrent.innerHTML='<div style="font-size:11px;color:rgba(255,255,255,.6);padding:6px 0">Current: <b style="color:#4ade80">'+_dynamicQuizCache[order].length+' questions (dynamic ✓)</b></div>';
        if(qDelBtn) qDelBtn.style.display='block';
      } else if(hasHardcoded){
        qCurrent.innerHTML='<div style="font-size:11px;color:rgba(255,255,255,.4);padding:6px 0">Current: <span style="color:rgba(255,200,80,.7)">hardcoded quiz ('+QUIZ_BANK[order].length+' questions)</span> — upload to override</div>';
        if(qDelBtn) qDelBtn.style.display='none';
      } else {
        qCurrent.innerHTML='<div style="font-size:11px;color:rgba(255,255,255,.3);padding:6px 0">No quiz yet — upload a file to add one</div>';
        if(qDelBtn) qDelBtn.style.display='none';
      }
    }
  };
  window.updateVmPreview=()=>{
    const title=document.getElementById('vm-panelTitle').value||'Panel Title';
    const instr=document.getElementById('vm-instructor').value||'Broken English Team';
    const dur=document.getElementById('vm-dur').value||'18 min';
    const bulletsRaw=document.getElementById('vm-bullets').value||'Pronunciation patterns\nStress & intonation\nCommon mistakes\nReal-world examples';
    const thumb=document.getElementById('vm-thumb').value;
    const bullets=bulletsRaw.split('\n').filter(b=>b.trim()).slice(0,5);
    document.getElementById('pvw-title').textContent=title;
    document.getElementById('pvw-instructor').textContent='Instructor: '+instr;
    document.getElementById('pvw-dur').textContent=dur;
    document.getElementById('pvw-bullets').innerHTML=bullets.map(b=>
      `<div style="display:flex;align-items:center;gap:5px;font-size:10px;color:rgba(255,255,255,0.7)">
        <span style="width:4px;height:4px;border-radius:50%;background:var(--brand-2);flex-shrink:0"></span>${b}
      </div>`).join('');
    // Update preview thumbnail
    const previewBg=document.querySelector('#vm-preview>div:first-child');
    if(previewBg){
      if(thumb){previewBg.style.backgroundImage=`url('${thumb}')`;previewBg.style.backgroundSize='cover';previewBg.style.backgroundPosition='center';}
      else{previewBg.style.backgroundImage='';previewBg.style.background='linear-gradient(135deg,#1a1a2e,#16213e)';}
    }
  };
  window.saveVideo=()=>{
    const order=Number(document.getElementById('vm-order').value);
    const vids=loadVideos();
    vids[order]={
      panelTitle: document.getElementById('vm-panelTitle').value.trim()||document.getElementById('vm-class-label').textContent.split('—')[1]?.trim()||'',
      instructor: document.getElementById('vm-instructor').value.trim(),
      src:        document.getElementById('vm-src').value.trim(),
      duration:   document.getElementById('vm-dur').value.trim(),
      bullets:    document.getElementById('vm-bullets').value.trim(),
      thumb:      document.getElementById('vm-thumb').value.trim(),
      desc:       document.getElementById('vm-desc').value.trim(),
      // keep legacy title field for lesson page compat
      title:      document.getElementById('vm-panelTitle').value.trim(),
    };
    // Save to localStorage immediately
    localStorage.setItem('brokeneng_videos', JSON.stringify(vids));

    // Push to Supabase with visible feedback
    const saveBtn = document.getElementById('vm-save-btn');
    const origText = saveBtn ? saveBtn.textContent : '';
    if(saveBtn){ saveBtn.textContent='Saving...'; saveBtn.disabled=true; }

    async function doSave(){
      try{
        if(typeof _sb !== 'undefined'){
          const{error} = await _sb.from('course_config').upsert({
            id: 'videos',
            data: vids,
            updated_at: new Date().toISOString()
          }, {onConflict:'id'});
          if(error){
            if(saveBtn){ saveBtn.textContent='✗ Error'; saveBtn.style.background='rgba(237,31,81,.6)'; }
            setTimeout(function(){
              if(saveBtn){ saveBtn.textContent=origText; saveBtn.style.background=''; saveBtn.disabled=false; }
            }, 2000);
            console.error('Supabase save error:', error.message);
            alert('Supabase error: '+error.message+' - Make sure RLS is disabled on course_config table.');
            return;
          } else {
            if(saveBtn){ saveBtn.textContent='✓ Saved!'; saveBtn.style.background='rgba(34,197,94,.7)'; }
            setTimeout(function(){
              if(saveBtn){ saveBtn.textContent=origText; saveBtn.style.background=''; saveBtn.disabled=false; }
            }, 1500);
            console.log('✓ Video saved to Supabase — students will see changes immediately');
          }
        } else {
          // No Supabase — local only
          if(saveBtn){ saveBtn.textContent='✓ Saved locally'; }
          setTimeout(function(){
            if(saveBtn){ saveBtn.textContent=origText; saveBtn.disabled=false; }
          }, 1500);
        }
      } catch(e){
        alert('Save failed: ' + e.message);
        if(saveBtn){ saveBtn.textContent=origText; saveBtn.disabled=false; }
        return;
      }
      document.getElementById('video-modal').style.display='none';
      renderAdminClasses();
    }
    doSave();
  };
}
