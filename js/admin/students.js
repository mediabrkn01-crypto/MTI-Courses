/* students.js — extracted verbatim from the original single-file index.html.
   Source lines: 2861-3013, 3323-3420
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
// ── PDF STUDENT IMPORT ───────────────────────────────────────────────────────
var _pdfImportRows=[];
function _loadPdfJs(cb){
  if(window.pdfjsLib){cb();return;}
  var sc=document.createElement('script');
  sc.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  sc.onload=function(){
    window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    cb();
  };
  sc.onerror=function(){alert('Could not load PDF reader. Check internet connection.');};
  document.head.appendChild(sc);
}

window.handleStudentPDF=function(evt){
  var file=evt.target.files&&evt.target.files[0];
  evt.target.value='';
  if(!file)return;
  _loadPdfJs(function(){
    var reader=new FileReader();
    reader.onload=function(e){
      pdfjsLib.getDocument({data:new Uint8Array(e.target.result)}).promise.then(function(pdf){
        var pages=[];
        for(var i=1;i<=pdf.numPages;i++)pages.push(pdf.getPage(i));
        Promise.all(pages).then(function(pgs){
          return Promise.all(pgs.map(function(pg){return pg.getTextContent();}));
        }).then(function(contents){
          // rebuild lines using Y position
          var lines=[];
          contents.forEach(function(tc){
            var rows={};
            tc.items.forEach(function(it){
              if(!it.str.trim())return;
              var y=Math.round(it.transform[5]);
              (rows[y]=rows[y]||[]).push({x:it.transform[4],t:it.str});
            });
            Object.keys(rows).map(Number).sort(function(a,b){return b-a;}).forEach(function(y){
              lines.push(rows[y].sort(function(a,b){return a.x-b.x;}).map(function(r){return r.t;}).join(' ').trim());
            });
          });
          _pdfParseStudents(lines);
        });
      }).catch(function(err){alert('Could not read PDF: '+err.message);});
    };
    reader.readAsArrayBuffer(file);
  });
};

function _pdfParseStudents(lines){
  var emailRe=/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  var existing=Object.values(loadStudents());
  var rows=[];var seen={};
  lines.forEach(function(line){
    var clean=line.replace(/\s+/g,' ').trim();
    if(!clean||clean.length<3)return;
    // skip obvious headers
    if(/^(name|student|email|sl\.?\s*no|s\.?no|#|list|roll|class|batch|date|page)\b/i.test(clean)&&!emailRe.test(clean))return;
    if(/^(contact list|student list|contacts|students)$/i.test(clean))return;
    var email='';var m=clean.match(emailRe);
    if(m){email=m[0].toLowerCase();}
    // name: remove email, leading numbering, phone numbers, extra symbols
    var name=clean.replace(emailRe,'')
      .replace(/^\s*\d+[\.\)\-:]?\s*/,'')
      .replace(/\+?\d[\d\s\-()]{7,}\d/g,'')
      .replace(/[|,;:_]+/g,' ')
      .replace(/\s+/g,' ').trim();
    // strip ALL special characters — keep only letters, spaces and dots inside the name
    name=name.replace(/[^a-zA-Z\s.]/g,' ')
      .replace(/\s*\.\s*(?=\s|$)/g,' ')      // lone dots
      .replace(/\s+/g,' ').trim()
      .replace(/[\s.]+$/,'').replace(/^[\s.]+/,'');
    if(!name||name.length<2)return;
    if(name.split(' ').length>6)return; // paragraph junk
    if(!email){
      // auto email from name
      email=name.toLowerCase().replace(/[^a-z]+/g,'.').replace(/^\.|\.$/g,'')+'@student.brokenenglish.in';
    }
    var key=email;
    if(seen[key])return;seen[key]=1;
    var dup=existing.find(function(s){return s.email&&s.email.toLowerCase()===email;});
    rows.push({name:name,email:email,dup:!!dup,include:!dup});
  });
  if(!rows.length){alert('No student names found in this PDF. Make sure it has selectable text (not a scanned image).');return;}
  _pdfImportRows=rows;
  _pdfShowPreview();
}

function _pdfShowPreview(){
  var rows=_pdfImportRows;
  var overlay=document.getElementById('pdf-import-modal');
  if(overlay)overlay.remove();
  var div=document.createElement('div');
  div.id='pdf-import-modal';
  div.style.cssText='position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.65);backdrop-filter:blur(8px);padding:16px';
  var inner='<div class="lg" style="width:100%;max-width:560px;max-height:85vh;display:flex;flex-direction:column;padding:26px">'
    +'<h2 style="font-size:18px;font-weight:800;color:#fff;margin:0 0 4px;font-family:Montserrat,sans-serif">Import Students from PDF</h2>'
    +'<p style="font-size:12px;color:var(--muted);margin:0 0 16px">'+rows.filter(function(r){return r.include;}).length+' new students found. After import, use <b style="color:#fff">Manage → Set Password</b> for each student to enable login. Untick any you don\'t want.</p>'
    +'<div style="flex:1;overflow-y:auto;border:1px solid rgba(255,255,255,.08);border-radius:12px;margin-bottom:16px">'
    +rows.map(function(r,i){
      var num=rows.slice(0,i+1).filter(function(x){return x.include;}).length;
      return '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.05);'+(r.dup?'opacity:.45':'')+'">'
        +'<span id="pdf-num-'+i+'" style="min-width:26px;text-align:center;font-family:JetBrains Mono,monospace;font-size:12px;font-weight:700;color:'+(r.include?'var(--g1)':'rgba(255,255,255,.2)')+'">'+(r.include?num:'—')+'</span>'
        +'<input type="checkbox" '+(r.include?'checked':'')+' '+(r.dup?'disabled':'')+' onchange="_pdfImportRows['+i+'].include=this.checked;_pdfUpdateCount()" style="accent-color:#ff2d78;width:16px;height:16px;flex-shrink:0;cursor:pointer"/>'
        +'<span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px">'
          +'<input type="text" value="'+r.name.replace(/"/g,'&quot;')+'" oninput="_pdfImportRows['+i+'].name=this.value" '+(r.dup?'disabled':'')+' style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#fff;font-size:13px;font-weight:600;padding:6px 10px;outline:none;width:100%;box-sizing:border-box" onfocus="this.style.borderColor=&apos;var(--g1)&apos;" onblur="this.style.borderColor=&apos;rgba(255,255,255,.1)&apos;"/>'
          +'<input type="text" value="'+r.email.replace(/"/g,'&quot;')+'" oninput="_pdfImportRows['+i+'].email=this.value.trim().toLowerCase()" '+(r.dup?'disabled':'')+' style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:8px;color:var(--muted);font-size:11px;padding:5px 10px;outline:none;width:100%;box-sizing:border-box;font-family:JetBrains Mono,monospace" onfocus="this.style.borderColor=&apos;var(--g1)&apos;;this.style.color=&apos;#fff&apos;" onblur="this.style.borderColor=&apos;rgba(255,255,255,.08)&apos;;this.style.color=&apos;var(--muted)&apos;"/>'
        +'</span>'
        +(r.dup?'<span style="font-size:10px;color:#fbbf24;font-family:JetBrains Mono,monospace;flex-shrink:0">EXISTS</span>':'')
      +'</div>';
    }).join('')
    +'</div>'
    +'<div style="display:flex;gap:10px;justify-content:flex-end">'
      +'<button onclick="document.getElementById(\'pdf-import-modal\').remove()" style="padding:11px 20px;border-radius:12px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);color:var(--muted);font-size:13px;font-weight:700;cursor:pointer">Cancel</button>'
      +'<button id="pdf-import-confirm" onclick="_pdfConfirmImport()" style="padding:11px 22px;border-radius:12px;background:var(--grad);border:none;color:#fff;font-size:13px;font-weight:800;cursor:pointer;font-family:Montserrat,sans-serif;box-shadow:0 4px 20px rgba(255,45,120,.35)">Create '+rows.filter(function(r){return r.include;}).length+' Students</button>'
    +'</div>'
  +'</div>';
  div.innerHTML=inner;
  document.body.appendChild(div);
}

window._pdfUpdateCount=function(){
  var n=_pdfImportRows.filter(function(r){return r.include;}).length;
  var b=document.getElementById('pdf-import-confirm');
  if(b)b.textContent='Create '+n+' Students';
  // renumber serials
  var c=0;
  _pdfImportRows.forEach(function(r,i){
    var el=document.getElementById('pdf-num-'+i);
    if(!el)return;
    if(r.include){c++;el.textContent=c;el.style.color='var(--g1)';}
    else{el.textContent='—';el.style.color='rgba(255,255,255,.2)';}
  });
};

window._pdfConfirmImport=function(){
  var students=loadStudents();
  var n=0;
  _pdfImportRows.forEach(function(r){
    if(!r.include)return;
    r.name=(r.name||'').trim();r.email=(r.email||'').trim().toLowerCase();
    if(!r.name||!r.email)return;
    var id=genId();
    var _d=new Date();_d.setDate(_d.getDate()+90);
    // No password stored locally — Admin must use "Set Password" in Manage Student
    var st={id:id,name:r.name,email:r.email,accessList:[1],validUntil:_d.toISOString().slice(0,10),createdAt:new Date().toISOString()};
    students[id]=st;
    if(typeof sbSaveStudent==='function') sbSaveStudent(st);
    n++;
  });
  saveStudents(students);
  var m=document.getElementById('pdf-import-modal');if(m)m.remove();
  navigate('admin',{tab:'students'});
};

async function renderAdminStudent(id){
  const students=loadStudents();
  const s=students[id];
  if(!s){navigate('admin');return;}
  const access=new Set(s.accessList||[]);
  const locked=new Set(getLockedVideos(id));
  const quizLocked=new Set(getLockedQuizzes(id));
  const{validUntil,expired}=getValidity(s);

  // Fetch auth link status from Supabase
  var authLinked=false;
  if(typeof _sb!=='undefined'&&s.email){
    try{
      var sr=await _sb.from('students').select('auth_user_id').eq('id',id).maybeSingle();
      authLinked=!!(sr.data&&sr.data.auth_user_id);
    }catch(e){}
  }

  const unlockedN=access.size, totalN=ALL_LESSONS.length;
  const classCard=l=>{
    const granted=access.has(l.order);
    const vidLk=locked.has(l.order);
    const qLk=quizLocked.has(l.order);
    const hasQuiz=hasRealQuiz(l);
    return `<div class="ms-card${granted?' on':''}">
      <div class="ms-top">
        <span class="adm-day">${l.order}</span>
        <button type="button" class="adm-track${granted?' on':''}" role="switch" aria-checked="${granted}" aria-label="Access to class ${l.order}" title="${granted?'Lock class':'Unlock class'}" onclick="toggleAccess('${id}',${l.order})"><span class="adm-thumb"></span></button>
      </div>
      <p class="ms-title" title="${escapeAttr(l.title)}">${escapeHtml(l.title)}</p>
      ${granted
        ? `<div class="ms-locks">
            <button type="button" class="ms-chip${vidLk?' lk':''}" onclick="toggleVideoLock('${id}',${l.order})" title="${vidLk?'Video is locked — click to allow':'Click to lock the video'}">${vidLk?'Video locked':'Video on'}</button>
            ${hasQuiz?`<button type="button" class="ms-chip${qLk?' lk':''}" onclick="toggleQuizLock('${id}',${l.order})" title="${qLk?'Quiz is locked — click to allow':'Click to lock the quiz'}">${qLk?'Quiz locked':'Quiz on'}</button>`:''}
          </div>`
        : '<p class="ms-off">No access</p>'}
    </div>`;
  };

  app.innerHTML=adminTopBar('students')+`
  <div class="adm-page">
    <button onclick="navigate('admin',{tab:'students'})" class="adm-btn" style="margin-bottom:18px">
      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
      Back to Students
    </button>

    <div class="adm-card adm-card-pad" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:14px;min-width:0">
          <div class="ms-av">${stuTableAvatar(s)}</div>
          <div style="min-width:0">
            <h1 class="adm-title" style="font-size:22px">${escapeHtml(s.name)}</h1>
            <p class="adm-meta" style="font-size:13px">${escapeHtml(s.email)}</p>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="adm-btn" onclick="revokeAll('${id}')">Lock all classes</button>
          <button class="adm-btn adm-btn-primary" onclick="grantAll('${id}')">Unlock all classes</button>
        </div>
      </div>
      <div class="ms-facts">
        <div><span class="adm-label">Validity</span>${admValidityCell(s)}</div>
        <div><span class="adm-label">Classes unlocked</span><div style="display:flex;align-items:center;gap:10px"><div class="adm-meter${unlockedN>=totalN?' ok':''}" style="max-width:140px"><span style="width:${Math.round(unlockedN/totalN*100)}%"></span></div><span class="adm-num">${unlockedN}/${totalN}</span></div></div>
        <div><span class="adm-label">Restrictions</span>${locked.size||quizLocked.size
          ? (locked.size?`<span class="adm-badge warn nodot">${locked.size} video${locked.size>1?'s':''} locked</span> `:'')+(quizLocked.size?`<span class="adm-badge info nodot">${quizLocked.size} quiz${quizLocked.size>1?'zes':''} locked</span>`:'')
          : '<span class="adm-muted" style="font-size:13px">None</span>'}</div>
        <div><span class="adm-label">Login</span>${authLinked?'<span class="adm-badge ok">Auth linked</span>':'<span class="adm-badge warn">Not linked</span>'}</div>
      </div>
    </div>

    <div class="ms-two">
      <div class="adm-card adm-card-pad">
        <h2 class="adm-card-title" style="margin-bottom:4px">Course validity</h2>
        <p class="adm-hint" style="margin:0 0 14px">Extend from the current end date, or set an exact date.</p>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
          ${[['7','+1 week'],['30','+1 month'],['90','+3 months'],['365','+1 year']].map(([d,l])=>`<button class="adm-btn" onclick="extendValidity('${id}',${d})">${l}</button>`).join('')}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <input id="ext-date" type="date" class="adm-input" style="width:auto;padding:8px 12px;color-scheme:dark"/>
          <button class="adm-btn adm-btn-primary" onclick="setCustomValidity('${id}')">Set date</button>
          <button class="adm-btn" onclick="clearValidity('${id}')">Remove expiry</button>
        </div>
      </div>

      <div class="adm-card adm-card-pad">
        <h2 class="adm-card-title" style="margin-bottom:4px">Login password</h2>
        <p class="adm-hint" style="margin:0 0 14px">The student signs in with their email and this password on any device.${authLinked?'':' A Supabase Auth account will be created automatically.'}</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px" class="ms-pw">
          <input id="sp-pass" type="password" autocomplete="new-password" placeholder="New password (min 6)" class="adm-input"/>
          <input id="sp-pass2" type="password" autocomplete="new-password" placeholder="Confirm password" class="adm-input"/>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <button id="sp-btn" onclick="adminSaveStudentPassword('${id}')" class="adm-btn adm-btn-primary">Set password</button>
          <div id="sp-msg" style="display:none;font-size:13px"></div>
        </div>
      </div>
    </div>

    ${SECTIONS.map(section=>{
      const on=section.lessons.filter(l=>access.has(l.order)).length;
      return `<div class="adm-section">
        <div class="ms-sec-head">
          ${admSectionLabel(section.title, on+'/'+section.lessons.length+' unlocked')}
          <div style="display:flex;gap:6px">
            <button class="adm-btn" onclick="revokeSection('${id}','${section.id}')">Lock all</button>
            <button class="adm-btn" onclick="grantSection('${id}','${section.id}')">Unlock all</button>
          </div>
        </div>
        <div class="ms-grid">${section.lessons.map(classCard).join('')}</div>
      </div>`;
    }).join('')}

    <div style="display:flex;justify-content:flex-end;margin-top:8px">
      <button class="adm-btn adm-btn-primary adm-btn-lg" onclick="navigate('admin',{tab:'students'})">Done</button>
    </div>
  </div>`;

  window.adminSaveStudentPassword=async function(sid){
    var pass=document.getElementById('sp-pass')?.value||'';
    var pass2=document.getElementById('sp-pass2')?.value||'';
    var msg=document.getElementById('sp-msg');
    var btn=document.getElementById('sp-btn');
    if(!pass||pass.length<6){if(msg){msg.textContent='Password must be at least 6 characters.';msg.style.color='#f87171';msg.style.display='block';}return;}
    if(pass!==pass2){if(msg){msg.textContent='Passwords do not match.';msg.style.color='#f87171';msg.style.display='block';}return;}
    if(btn){btn.disabled=true;btn.textContent='Saving...';}
    if(msg)msg.style.display='none';
    var result=await window.adminSetStudentPassword(sid,pass);
    if(result.success){
      if(msg){msg.textContent='✓ Login password updated. Student can now sign in on any device.'+(result.warning?' (Note: '+result.warning+')':'');msg.style.color='#4ade80';msg.style.display='block';}
      if(document.getElementById('sp-pass'))document.getElementById('sp-pass').value='';
      if(document.getElementById('sp-pass2'))document.getElementById('sp-pass2').value='';
      // Offer the onboarding guide with the password Supabase just accepted (memory only, this page only).
      var _stu=loadStudents()[sid]||{};
      var _creds={name:_stu.name||'',email:_stu.email||'',password:pass};
      if(msg&&_creds.name&&_creds.email){
        var gb=document.createElement('button');
        gb.type='button'; gb.className='adm-btn adm-btn-primary'; gb.style.marginTop='10px';
        gb.innerHTML='<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path d="M12 4v12m0 0l-4-4m4 4l4-4M4 18v1a2 2 0 002 2h12a2 2 0 002-2v-1"/></svg>Download Student Guide';
        gb.onclick=function(){ downloadStudentGuide(_creds,gb).catch(function(e){ msg.appendChild(document.createTextNode(' — Could not create the PDF: '+(e.message||e))); }); };
        msg.appendChild(document.createElement('br')); msg.appendChild(gb);
      }
    }else{
      if(msg){msg.textContent='Failed: '+(result.error||'unknown error');msg.style.color='#f87171';msg.style.display='block';}
    }
    if(btn){btn.disabled=false;btn.textContent='Set Password';}
  };
  window.extendValidity=(sid,days)=>{const st=loadStudents();const base=st[sid].validUntil?new Date(st[sid].validUntil):new Date();if(base<new Date())base.setTime(new Date().getTime());base.setDate(base.getDate()+Number(days));st[sid].validUntil=base.toISOString().slice(0,10);saveStudents(st);renderAdminStudent(sid);};
  window.setCustomValidity=(sid)=>{const val=document.getElementById('ext-date').value;if(!val)return;const st=loadStudents();st[sid].validUntil=val;saveStudents(st);renderAdminStudent(sid);};
  window.clearValidity=(sid)=>{const st=loadStudents();st[sid].validUntil=null;saveStudents(st);renderAdminStudent(sid);};
  window.toggleAccess=(sid,classOrder)=>{const st=loadStudents();const list=new Set(st[sid].accessList||[]);list.has(classOrder)?list.delete(classOrder):list.add(classOrder);st[sid].accessList=[...list];saveStudents(st);renderAdminStudent(sid);};
  window.toggleVideoLock=(sid,classOrder)=>{const lk=new Set(getLockedVideos(sid));lk.has(classOrder)?lk.delete(classOrder):lk.add(classOrder);saveLockedVideos(sid,[...lk]);renderAdminStudent(sid);};
  window.toggleQuizLock=(sid,classOrder)=>{const lk=new Set(getLockedQuizzes(sid));lk.has(classOrder)?lk.delete(classOrder):lk.add(classOrder);saveLockedQuizzes(sid,[...lk]);renderAdminStudent(sid);};
  window.grantAll=(sid)=>{const st=loadStudents();st[sid].accessList=ALL_LESSONS.map(l=>l.order);saveStudents(st);renderAdminStudent(sid);};
  window.revokeAll=(sid)=>{const st=loadStudents();st[sid].accessList=[];saveStudents(st);renderAdminStudent(sid);};
  window.grantSection=(sid,secId)=>{const st=loadStudents();const orders=SECTIONS.find(s=>s.id===secId).lessons.map(l=>l.order);const list=new Set(st[sid].accessList||[]);orders.forEach(o=>list.add(o));st[sid].accessList=[...list];saveStudents(st);renderAdminStudent(sid);};
  window.revokeSection=(sid,secId)=>{const st=loadStudents();const orders=SECTIONS.find(s=>s.id===secId).lessons.map(l=>l.order);const list=new Set(st[sid].accessList||[]);orders.forEach(o=>list.delete(o));st[sid].accessList=[...list];saveStudents(st);renderAdminStudent(sid);};
}
