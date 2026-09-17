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

  app.innerHTML=adminTopBar('students')+`
  <div style="padding:24px;position:relative;z-index:1">
    <button onclick="navigate('admin',{tab:'students'})" style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--muted);background:none;border:none;cursor:pointer;margin-bottom:20px;transition:color .18s" onmouseover="this.style.color='var(--g3)'" onmouseout="this.style.color='var(--muted)'">
      <svg style="width:14px;height:14px" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
      Back to Students
    </button>

    <div class="lg" style="padding:20px;margin-bottom:20px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap">
        <div>
          <h1 style="font-size:20px;font-weight:800;color:#fff;font-family:'Montserrat',sans-serif">${s.name}</h1>
          <p style="font-size:13px;color:rgba(255,255,255,0.45);margin-top:2px">${s.email}</p>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">
            ${validityBadge(s)}
            <span class="pill pill-orange">${access.size}/${ALL_LESSONS.length} unlocked</span>
            ${locked.size>0?`<span class="pill pill-yellow">${locked.size} video${locked.size>1?'s':''} locked</span>`:''}
            ${quizLocked.size>0?`<span class="pill" style="background:rgba(139,92,246,0.14);border:1px solid rgba(139,92,246,0.3);color:#c4b5fd">${quizLocked.size} quiz${quizLocked.size>1?'zes':''} locked</span>`:''}
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;flex-shrink:0">
          ${glassBtn('Unlock All',`grantAll('${id}')`,'brand')}
          ${glassBtn('Lock All',`revokeAll('${id}')`,'ghost')}
        </div>
      </div>
      <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.1)">
        <p style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:10px">Extend / Set Validity</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          ${[['7','+ 1 Wk'],['30','+ 1 Mo'],['90','+ 3 Mo'],['365','+ 1 Yr']].map(([d,l])=>glassBtn(l,`extendValidity('${id}',${d})`,'ghost')).join('')}
          <input id="ext-date" type="date" class="glass-input" style="width:auto;padding:8px 12px;font-size:12px"/>
          ${glassBtn('Set Date',`setCustomValidity('${id}')`,'brand')}
          ${glassBtn('Remove Expiry',`clearValidity('${id}')`,'ghost')}
        </div>
      </div>
    </div>

    <div class="lg" style="padding:20px;margin-bottom:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <p style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,0.4)">Authentication</p>
        <span style="font-size:12px;font-weight:700;padding:3px 10px;border-radius:99px;${authLinked?'background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.3);color:#4ade80':'background:rgba(255,113,0,.12);border:1px solid rgba(255,113,0,.35);color:#fb923c'}">
          ${authLinked?'✓ Auth Linked':'⚠ Not Linked'}
        </span>
      </div>
      <p style="font-size:12px;color:rgba(255,255,255,.45);margin-bottom:14px;line-height:1.6">
        Set a new login password for this student. After saving, student can sign in with their email + this password on any device.<br>
        <span style="color:rgba(255,255,255,.3);font-size:11px">If "Not Linked", a Supabase Auth account will be created automatically.</span>
      </p>
      <div style="display:flex;flex-direction:column;gap:10px;max-width:360px">
        <input id="sp-pass" type="password" autocomplete="new-password" placeholder="New password (min 6 characters)" class="glass-input" style="font-size:14px"/>
        <input id="sp-pass2" type="password" autocomplete="new-password" placeholder="Confirm new password" class="glass-input" style="font-size:14px"/>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <button id="sp-btn" onclick="adminSaveStudentPassword('${id}')" style="background:var(--grad);border:none;border-radius:10px;color:#fff;font-size:13px;font-weight:700;padding:10px 20px;cursor:pointer;font-family:Montserrat,sans-serif">Set Password</button>
        </div>
        <div id="sp-msg" style="display:none;font-size:13px;margin-top:4px"></div>
      </div>
    </div>

    ${SECTIONS.map(section=>`
      <div style="margin-bottom:24px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <p style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,0.4)">${section.title}</p>
          <div style="display:flex;gap:12px">
            <button onclick="grantSection('${id}','${section.id}')" style="font-size:12px;color:var(--g3);background:none;border:none;cursor:pointer;font-weight:600;font-family:'JetBrains Mono',monospace">Unlock all</button>
            <span style="color:rgba(255,255,255,0.2)">|</span>
            <button onclick="revokeSection('${id}','${section.id}')" style="font-size:12px;color:var(--muted);background:none;border:none;cursor:pointer;font-weight:600;font-family:'JetBrains Mono',monospace">Lock all</button>
          </div>
        </div>
        <div class="class-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px">
          ${section.lessons.map(l=>{
            const granted=access.has(l.order);
            const vidLk=locked.has(l.order);
            const qLk=quizLocked.has(l.order);
            const hasQuiz=hasRealQuiz(l);
            const cardCls=granted?(vidLk?'class-card vid-locked':qLk?'class-card quiz-locked':'class-card unlocked'):'class-card';
            const labelCol=granted?(vidLk?'#facc15':qLk?'#c4b5fd':'#4ade80'):'rgba(255,255,255,0.35)';
            return`<div class="${cardCls}">
              <p style="font-weight:700;font-size:12px;color:${labelCol};margin-bottom:2px">Class ${l.order}</p>
              <p style="font-size:10px;color:rgba(255,255,255,0.5);line-height:1.35;margin-bottom:10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${l.title}</p>
              <div style="display:flex;flex-direction:column;gap:5px">
                <button onclick="toggleAccess('${id}',${l.order})" style="padding:5px;border-radius:8px;font-size:10px;font-weight:700;cursor:pointer;border:1px solid;transition:all .15s;${granted?'background:rgba(34,197,94,0.14);border-color:rgba(34,197,94,0.32);color:#4ade80':'background:rgba(255,255,255,0.07);border-color:rgba(255,255,255,0.15);color:rgba(255,255,255,0.45)'}">
                  ${granted?'✓ Unlocked':'<img src="data:image/png;base64,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" style="width:22px;height:22px;object-fit:contain;vertical-align:middle;filter:brightness(1.4) drop-shadow(0 0 3px rgba(255,255,255,.3))"/> Locked'}
                </button>
                ${granted?`<button onclick="toggleVideoLock('${id}',${l.order})" style="padding:5px;border-radius:8px;font-size:10px;font-weight:700;cursor:pointer;border:1px solid;transition:all .15s;${vidLk?'background:rgba(234,179,8,0.14);border-color:rgba(234,179,8,0.32);color:#facc15':'background:rgba(255,255,255,0.07);border-color:rgba(255,255,255,0.15);color:rgba(255,255,255,0.4)'}">
                  ▶ ${vidLk?'Video Locked':'Lock Video'}
                </button>`:''}
                ${granted&&hasQuiz?`<button onclick="toggleQuizLock('${id}',${l.order})" style="padding:5px;border-radius:8px;font-size:10px;font-weight:700;cursor:pointer;border:1px solid;transition:all .15s;${qLk?'background:rgba(139,92,246,0.14);border-color:rgba(139,92,246,0.32);color:#c4b5fd':'background:rgba(255,255,255,0.07);border-color:rgba(255,255,255,0.15);color:rgba(255,255,255,0.4)'}">
                  ✎ ${qLk?'Quiz Locked':'Lock Quiz'}
                </button>`:''}
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`).join('')}

    <div style="display:flex;justify-content:flex-end;margin-top:8px">
      ${glassBtn('Done',`navigate('admin',{tab:'students'})`,'brand')}
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
      if(msg){msg.textContent='✓ Login password updated. Student can now sign in on any device.';msg.style.color='#4ade80';msg.style.display='block';}
      if(document.getElementById('sp-pass'))document.getElementById('sp-pass').value='';
      if(document.getElementById('sp-pass2'))document.getElementById('sp-pass2').value='';
      if(result.warning&&msg)msg.textContent+=' (Note: '+result.warning+')';
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
