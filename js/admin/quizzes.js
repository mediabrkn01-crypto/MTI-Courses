/* quizzes.js — extracted verbatim from the original single-file index.html.
   Source lines: 6663-6981
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
// ── ADMIN QUIZ UPLOAD FUNCTIONS ───────────────────────────────────────────────
window.vmQuizFileSelected=function(input){
  var file=input.files[0];
  if(!file) return;
  document.getElementById('vm-quiz-filename').textContent=file.name;
  document.getElementById('vm-quiz-upload-btn').style.display='flex';
};

window.vmUploadQuiz=async function(){
  var order=Number(document.getElementById('vm-order').value);
  if(!order) return;
  var file=document.getElementById('vm-quiz-file').files[0];
  if(!file){alert('Please choose a file first.');return;}
  var status=document.getElementById('vm-quiz-status');
  var btn=document.getElementById('vm-quiz-upload-btn');

  status.style.display='block';
  status.style.background='rgba(255,255,255,.07)';
  status.style.color='rgba(255,255,255,.7)';
  status.textContent='Reading file...';
  btn.disabled=true; btn.textContent='Processing...';

  try{
    // Read file as text
    var text=await new Promise(function(resolve,reject){
      if(file.name.endsWith('.docx')){
        // Use mammoth to extract text from DOCX
        var r=new FileReader();
        r.onload=function(e){
          if(typeof mammoth!=='undefined'){
            mammoth.extractRawText({arrayBuffer:e.target.result}).then(function(res){resolve(res.value);}).catch(reject);
          } else { reject(new Error('mammoth.js not loaded')); }
        };
        r.onerror=reject; r.readAsArrayBuffer(file);
      } else if(file.name.endsWith('.pdf')){
        reject(new Error('PDF upload not supported in browser. Please use TXT or DOCX format.'));
      } else {
        var r=new FileReader(); r.onload=function(e){resolve(e.target.result);}; r.onerror=reject; r.readAsText(file);
      }
    });

    status.textContent='Sending to Claude AI to extract questions...';

    // Build messages for Claude
    // Parse questions locally from text (no external API needed)
    var plainText=text.startsWith('__PDF__:')?'[PDF - cannot parse in browser]':text;
    var questions=file.name.endsWith('.json')?parseQuizFromJSON(plainText):parseQuizFromText(plainText);

    if(!Array.isArray(questions)||questions.length===0) throw new Error('No questions found in file');

    // Save to Supabase
    status.textContent='Saving '+questions.length+' questions to Supabase...';
    await sbSaveQuiz(order, questions);

    status.style.background='rgba(34,197,94,.1)';
    status.style.color='#4ade80';
    status.textContent='✓ '+questions.length+' questions saved for Day '+order;
    btn.disabled=false; btn.textContent='⚡ Process & Save Quiz';
    document.getElementById('vm-quiz-filename').textContent='Choose PDF, DOCX, or TXT file...';
    document.getElementById('vm-quiz-file').value='';
    btn.style.display='none';
    document.getElementById('vm-quiz-delete-btn').style.display='block';
    document.getElementById('vm-quiz-current').innerHTML='<div style="font-size:11px;color:rgba(255,255,255,.5);padding:6px 0">Current: <b style="color:#4ade80">'+questions.length+' questions (dynamic)</b></div>';

  }catch(e){
    status.style.background='rgba(239,68,68,.1)';
    status.style.color='#f87171';
    status.textContent='Error: '+e.message+'. Check file format and try again.';
    btn.disabled=false; btn.textContent='⚡ Process & Save Quiz';
  }
};

window.vmDeleteQuiz=async function(){
  var order=Number(document.getElementById('vm-order').value);
  if(!order||!confirm('Remove dynamic quiz for Day '+order+'? The hardcoded quiz will be used instead.')) return;
  await sbDeleteQuiz(order);
  var status=document.getElementById('vm-quiz-status');
  status.style.display='block';
  status.style.background='rgba(255,255,255,.07)';
  status.style.color='rgba(255,255,255,.6)';
  status.textContent='Dynamic quiz removed. Using hardcoded quiz.';
  document.getElementById('vm-quiz-delete-btn').style.display='none';
  document.getElementById('vm-quiz-current').innerHTML='<div style="font-size:11px;color:rgba(255,255,255,.4);padding:6px 0">Current: <span style="color:rgba(255,255,255,.4)">using hardcoded quiz</span></div>';
};


function renderAdminQuiz(){
  app.innerHTML=adminTopBar('quiz')+'<div style="padding:48px;text-align:center"><p style="color:var(--muted);font-size:14px">Loading quizzes...</p></div>';

  // Load all dynamic quizzes fresh then render
  sbLoadAllDynamicQuizzes().catch(function(){}).finally(function(){

    var nDyn=0,nHard=0,nNone=0,nQ=0;
    var rows=ALL_LESSONS.map(function(lesson){
      var hasDynamic=!!_dynamicQuizCache[lesson.order];
      var hasHard=!!QUIZ_BANK[lesson.order];
      var count=hasDynamic?_dynamicQuizCache[lesson.order].length:hasHard?QUIZ_BANK[lesson.order].length:0;
      if(hasDynamic)nDyn++;else if(hasHard)nHard++;else nNone++;
      nQ+=count;
      var badge=hasDynamic
        ?'<span class="adm-badge ok">Uploaded</span>'
        :hasHard
          ?'<span class="adm-badge warn">Built-in</span>'
          :'<span class="adm-badge muted">No quiz</span>';
      var title=getLessonTitle(lesson)||lesson.title||'Day '+lesson.order;
      var uploadInput='<input type="file" accept=".pdf,.docx,.txt,.json" style="display:none" onchange="adminQuizUploadDirect(this,'+lesson.order+')"/>';
      var actions=hasDynamic
        ?'<button onclick="adminQuizPreview('+lesson.order+')" class="adm-btn">'+ADM_ICON.eye+'Preview</button>'
         +'<label class="adm-btn">'+ADM_ICON.upload+'Replace'+uploadInput+'</label>'
         +'<button onclick="adminQuizDelete('+lesson.order+')" class="adm-btn adm-btn-danger adm-icon-btn" aria-label="Delete quiz" title="Delete quiz">'+ADM_ICON.trash+'</button>'
        :hasHard
          ?'<button onclick="adminQuizEditHardcoded('+lesson.order+')" class="adm-btn">'+ADM_ICON.edit+'Edit</button>'
           +'<label class="adm-btn adm-btn-primary">'+ADM_ICON.upload+'Upload'+uploadInput+'</label>'
          :'<label class="adm-btn adm-btn-primary">'+ADM_ICON.upload+'Upload'+uploadInput+'</label>';
      return '<tr id="quiz-row-'+lesson.order+'">'
        +'<td><span class="adm-day">'+lesson.order+'</span></td>'
        +'<td><p class="adm-name">'+escapeHtml(title)+'</p></td>'
        +'<td><span class="adm-num">'+(count||'—')+'</span></td>'
        +'<td>'+badge+'<div id="quiz-status-'+lesson.order+'" class="adm-meta" style="white-space:normal"></div></td>'
        +'<td class="right"><div style="display:inline-flex;gap:6px;align-items:center">'+actions+'</div></td>'
        +'</tr>';
    }).join('');

    app.innerHTML=adminTopBar('quiz')+`
    <div class="adm-page">
      ${admHead('Quizzes','Upload a PDF, DOCX or TXT and Claude extracts the questions. An uploaded quiz replaces the built-in one for that day.')}
      ${admStats([
        ['Uploaded quizzes', nDyn, 'ok', '/'+ALL_LESSONS.length],
        ['Built-in only', nHard, nHard?'warn':''],
        ['No quiz', nNone, nNone?'bad':''],
        ['Total questions', nQ]
      ])}
      <div id="quiz-global-status" style="display:none;margin-bottom:16px;padding:12px 16px;border-radius:10px;font-size:13px"></div>
      <div class="adm-card admin-table-wrap"><div style="overflow-x:auto">
        <table class="admin-table" style="min-width:680px">
          <thead><tr>
            <th style="width:56px">Day</th>
            <th>Lesson</th>
            <th style="width:100px">Questions</th>
            <th style="width:200px">Status</th>
            <th class="right">Actions</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div></div>
    </div>`;

    // wire preview modal if needed
  });
}

window.adminQuizUploadDirect=async function(input,order){
  var file=input.files[0]; if(!file) return;
  var statusEl=document.getElementById('quiz-status-'+order);
  var globalEl=document.getElementById('quiz-global-status');
  if(statusEl) statusEl.textContent='Reading...';
  try{
    var text=await new Promise(function(resolve,reject){
      if(file.name.endsWith('.pdf')){
        var r=new FileReader();
        r.onload=function(e){ resolve('__PDF__:'+e.target.result.split(',')[1]); };
        r.onerror=reject; r.readAsDataURL(file);
      } else {
        var r=new FileReader();
        r.onload=function(e){ resolve(e.target.result); };
        r.onerror=reject; r.readAsText(file);
      }
    });
    if(statusEl) statusEl.textContent='Parsing questions from file...';
    var plainText=text.startsWith('__PDF__:')?'[PDF - cannot parse in browser]':text;
    var questions=file.name.endsWith('.json')?parseQuizFromJSON(plainText):parseQuizFromText(plainText);
    if(!Array.isArray(questions)||!questions.length) throw new Error('No questions found');
    if(statusEl) statusEl.textContent='Saving '+questions.length+' questions...';
    await sbSaveQuiz(order,questions);
    if(statusEl) statusEl.textContent='';
    // Show global success and re-render
    if(globalEl){
      globalEl.style.display='block';
      globalEl.style.background='rgba(34,197,94,.1)';
      globalEl.style.color='#4ade80';
      globalEl.style.border='1px solid rgba(34,197,94,.2)';
      globalEl.textContent='✓ Day '+order+' quiz saved — '+questions.length+' questions';
    }
    renderAdminQuiz();
  }catch(e){
    if(statusEl) statusEl.textContent='Error: '+e.message;
    if(globalEl){
      globalEl.style.display='block';
      globalEl.style.background='rgba(239,68,68,.1)';
      globalEl.style.color='#f87171';
      globalEl.style.border='1px solid rgba(239,68,68,.2)';
      globalEl.textContent='Error for Day '+order+': '+e.message;
    }
  }
};

window.adminQuizDelete=async function(order){
  if(!confirm('Delete dynamic quiz for Day '+order+'? Hardcoded quiz will be used instead.')) return;
  await sbDeleteQuiz(order);
  renderAdminQuiz();
};

window.adminQuizEditHardcoded=function(order){
  // Convert hardcoded quiz format (answer as index) to dynamic format (answer as string)
  var raw=QUIZ_BANK[order];
  if(!raw||!raw.length){alert('No hardcoded quiz for Day '+order);return;}
  // Deep copy and normalise
  var qs=raw.map(function(q,i){
    var opts=Array.isArray(q.options)?q.options.slice():[];
    var ans=typeof q.answer==='number'?(opts[q.answer]||opts[0]):q.answer;
    return {id:q.id||('q'+(i+1)),prompt:q.prompt||'',options:opts,answer:ans};
  });
  // Load into dynamic cache so adminQuizPreview can open it
  _dynamicQuizCache[order]=qs;
  adminQuizPreview(order);
};

window.adminQuizPreview=function(order){
  var qs=_dynamicQuizCache[order]?JSON.parse(JSON.stringify(_dynamicQuizCache[order])):[];
  if(!qs.length){alert('No dynamic quiz for Day '+order);return;}

  var overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto';

  function renderEditor(){
    var container=document.getElementById('qeditor-wrap');
    if(!container) return;
    container.innerHTML=qs.map(function(q,qi){
      var optHtml=q.options.map(function(o,oi){
        return '<div draggable="true" data-qi="'+qi+'" data-oi="'+oi+'" style="display:flex;align-items:center;gap:6px;margin-bottom:4px">'
          +'<span style="color:rgba(255,255,255,.3);cursor:grab;font-size:14px">⠿</span>'
          +'<input data-opt="'+qi+'-'+oi+'" value="'+o.replace(/"/g,'&quot;')+'" style="flex:1;background:rgba(255,255,255,'+(o===q.answer?'.12':'.05')+');border:1px solid rgba(255,255,255,'+(o===q.answer?'.4':'.1')+');border-radius:6px;color:#fff;font-size:12px;padding:5px 8px;outline:none"/>'
          +'<button onclick="setAnswer('+qi+','+oi+')" title="Set as correct" style="background:'+(o===q.answer?'rgba(34,197,94,.3)':'rgba(255,255,255,.08)')+';border:1px solid rgba(255,255,255,.1);border-radius:6px;color:'+(o===q.answer?'#4ade80':'rgba(255,255,255,.4)')+';font-size:11px;padding:3px 7px;cursor:pointer">'+(o===q.answer?'✓':'○')+'</button>'
          +'<button onclick="delOption('+qi+','+oi+')" style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);border-radius:6px;color:#f87171;font-size:11px;padding:3px 7px;cursor:pointer">✕</button>'
          +'</div>';
      }).join('');
      return '<div style="margin-bottom:14px;padding:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:10px">'
        +'<div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:8px">'
        +'<span style="color:rgba(255,255,255,.5);font-size:12px;font-weight:700;flex-shrink:0;margin-top:6px">'+(qi+1)+'.</span>'
        +'<textarea data-prompt="'+qi+'" rows="2" style="flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);border-radius:6px;color:#fff;font-size:12px;padding:6px 8px;outline:none;resize:vertical">'+q.prompt+'</textarea>'
        +'<button onclick="delQuestion('+qi+')" style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);border-radius:8px;color:#f87171;font-size:11px;padding:4px 8px;cursor:pointer;flex-shrink:0">🗑</button>'
        +'</div>'
        +'<div id="opts-'+qi+'">'+ optHtml+'</div>'
        +'<button onclick="addOption('+qi+')" style="margin-top:4px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:6px;color:rgba(255,255,255,.5);font-size:11px;padding:3px 10px;cursor:pointer">+ Add option</button>'
        +'</div>';
    }).join('');

    // Wire drag-and-drop for options
    var dragQi=null,dragOi=null;
    container.querySelectorAll('[data-oi]').forEach(function(el){
      el.addEventListener('dragstart',function(e){dragQi=parseInt(el.dataset.qi);dragOi=parseInt(el.dataset.oi);el.style.opacity='.4';e.dataTransfer.effectAllowed='move';});
      el.addEventListener('dragend',function(){el.style.opacity='1';});
      el.addEventListener('dragover',function(e){e.preventDefault();if(parseInt(el.dataset.qi)===dragQi)el.style.outline='1px solid rgba(255,45,120,.5)';});
      el.addEventListener('dragleave',function(){el.style.outline='none';});
      el.addEventListener('drop',function(e){
        e.preventDefault();el.style.outline='none';
        var tQi=parseInt(el.dataset.qi),tOi=parseInt(el.dataset.oi);
        if(dragQi===null||tQi!==dragQi||tOi===dragOi) return;
        var moved=qs[dragQi].options.splice(dragOi,1)[0];
        var wasAnswer=(moved===qs[dragQi].answer);
        qs[dragQi].options.splice(tOi,0,moved);
        if(wasAnswer) qs[dragQi].answer=moved;
        dragQi=null;dragOi=null;renderEditor();
      });
    });
  }

  // Collect edits from inputs before any action
  function collectEdits(){
    qs.forEach(function(q,qi){
      var pEl=document.querySelector('[data-prompt="'+qi+'"]');
      if(pEl) q.prompt=pEl.value.trim();
      q.options.forEach(function(o,oi){
        var iEl=document.querySelector('[data-opt="'+qi+'-'+oi+'"]');
        if(iEl){
          var newVal=iEl.value.trim();
          if(q.answer===q.options[oi]) q.answer=newVal;
          q.options[oi]=newVal;
        }
      });
    });
  }

  window.delQuestion=function(qi){collectEdits();qs.splice(qi,1);renderEditor();};
  window.delOption=function(qi,oi){collectEdits();qs[qi].options.splice(oi,1);if(!qs[qi].options.includes(qs[qi].answer))qs[qi].answer=qs[qi].options[0]||'';renderEditor();};
  window.setAnswer=function(qi,oi){collectEdits();qs[qi].answer=qs[qi].options[oi];renderEditor();};
  window.addOption=function(qi){collectEdits();qs[qi].options.push('New option');renderEditor();};
  window.addQuestion=function(){
    collectEdits();
    qs.push({id:'q'+(qs.length+1),prompt:'New question?',options:['Option A','Option B','Option C','Option D'],answer:'Option A'});
    renderEditor();
    setTimeout(function(){overlay.scrollTop=overlay.scrollHeight;},50);
  };

  overlay.innerHTML='<div style="background:#12121f;border:1px solid rgba(255,255,255,.15);border-radius:20px;padding:20px;width:100%;max-width:600px;margin:auto">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'
    +'<h3 style="font-family:Montserrat,sans-serif;font-weight:800;color:#fff;font-size:15px">⚡ Day '+order+' Quiz Editor</h3>'
    +'<button onclick="window._closeQuizPreview()" style="background:rgba(255,255,255,.1);border:none;border-radius:8px;color:#fff;font-size:14px;padding:4px 10px;cursor:pointer">✕</button>'
    +'</div>'
    +'<p style="font-size:11px;color:rgba(255,255,255,.35);margin-bottom:12px">Edit questions/options inline • Drag ⠿ to reorder options • ○ to set correct answer • ✕ to delete</p>'
    +'<div id="qeditor-wrap"></div>'
    +'<button onclick="addQuestion()" style="width:100%;margin-top:6px;background:rgba(255,255,255,.07);border:1px dashed rgba(255,255,255,.2);border-radius:10px;color:rgba(255,255,255,.5);font-size:12px;padding:8px;cursor:pointer">+ Add Question</button>'
    +'<div style="display:flex;gap:8px;margin-top:12px">'
    +'<button onclick="window._saveQuizOrder('+order+')" style="flex:1;background:var(--grad);border:none;border-radius:10px;color:#fff;font-size:13px;font-weight:700;padding:10px;cursor:pointer;font-family:Montserrat,sans-serif">💾 Save All Changes</button>'
    +'</div>'
    +'<div id="qpreview-save-status" style="font-size:12px;text-align:center;margin-top:8px"></div>'
    +'</div>';

  window._closeQuizPreview=function(){try{overlay.remove();}catch(e){}};
  window._saveQuizOrder=async function(ord){
    collectEdits();
    var st=document.getElementById('qpreview-save-status');
    if(st) st.textContent='Saving...';
    try{
      await sbSaveQuiz(ord,qs);
      _dynamicQuizCache[ord]=qs;
      if(st){st.style.color='#4ade80';st.textContent='✓ Saved to Supabase!';}
      setTimeout(function(){renderAdminQuiz();},800);
    }catch(e){
      if(st){st.style.color='#f87171';st.textContent='Error: '+e.message;}
    }
  };
  document.body.appendChild(overlay);
  renderEditor();
};
