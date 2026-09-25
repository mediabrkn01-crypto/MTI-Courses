/* workshop.js — extracted verbatim from the original single-file index.html.
   Source lines: 4207-4434
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
window.wvMarkComplete=function(lessonId){
  if(isCompleted(lessonId)) return;
  markLessonComplete(lessonId);
  // Update button in place — no re-render so video keeps playing
  var btn=document.getElementById('wv-mark-btn');
  if(btn){
    btn.outerHTML='<span id="wv-done-badge" style="background:rgba(34,197,94,.12);color:#4ade80;border:1px solid rgba(34,197,94,.3);border-radius:8px;font-size:11px;font-weight:700;padding:6px 14px">✓ Completed</span>';
  }
  // Update WV list cards
  var tick=document.querySelector('[data-wv-tick="'+lessonId+'"]');
  if(tick){tick.style.display='flex';}
  var card=document.querySelector('[data-wv-card="'+lessonId+'"]');
  if(card){card.style.borderColor='rgba(34,197,94,.3)';}
  var xp=document.querySelector('[data-wv-xp="'+lessonId+'"]');
  if(xp){xp.style.color='#4ade80';xp.textContent='\u2713 Done';}
  // Update dashboard preview cards instantly
  var dashTick=document.querySelector('[data-dash-wv-tick="'+lessonId+'"]');
  if(dashTick){dashTick.style.display='flex';}
  var dashCard=document.querySelector('[data-dash-wv-card="'+lessonId+'"]');
  if(dashCard){dashCard.style.borderColor='rgba(34,197,94,.3)';}
};

window.setupWVAutoComplete=function(lessonId){
  // Bunny/iframe postMessage ended event
  var _done=false;
  function _mark(){ if(!_done){_done=true;wvMarkComplete(lessonId);} }
  window.addEventListener('message',function _h(e){
    try{
      var d=typeof e.data==='string'?JSON.parse(e.data):e.data;
      if(d&&(d.event==='ended'||d.event==='finish'||d.type==='ended'||d.event==='timeupdate'&&d.data&&d.data.duration&&d.data.currentTime/d.data.duration>=0.95)){
        window.removeEventListener('message',_h);
        _mark();
      }
    }catch(err){}
  });
  // <video> fallback
  setTimeout(function(){
    var vid=document.querySelector('#player-wrapper video');
    if(vid){
      vid.addEventListener('ended',_mark);
      vid.addEventListener('timeupdate',function(){
        if(vid.duration&&vid.currentTime/vid.duration>=0.95) _mark();
      });
    }
  },800);
};

window.showQuizGateMsg=function(label){
  var existing=document.getElementById('quiz-gate-toast');
  if(existing) existing.remove();
  var toast=document.createElement('div');
  toast.id='quiz-gate-toast';
  toast.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;background:rgba(13,13,28,.97);border:1px solid rgba(255,45,120,.3);border-radius:16px;padding:24px 28px;max-width:320px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.6)';
  toast.innerHTML='<div style="font-size:28px;margin-bottom:10px">📝</div>'
    +'<div style="font-family:Montserrat,sans-serif;font-weight:800;font-size:16px;color:#fff;margin-bottom:8px">Complete the Quiz First</div>'
    +'<div style="font-size:12px;color:rgba(255,255,255,.55);line-height:1.6;margin-bottom:18px">Pass the quiz for the previous class to unlock '+label+'.</div>'
    +'<button onclick="document.getElementById(\'quiz-gate-toast\').remove()" style="background:var(--grad);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;padding:9px 22px;cursor:pointer;font-family:Montserrat,sans-serif">Got it</button>';
  document.body.appendChild(toast);
  toast.addEventListener('click',function(e){if(e.target===toast)toast.remove();});
  setTimeout(function(){if(document.getElementById('quiz-gate-toast'))document.getElementById('quiz-gate-toast').remove();},4000);
};

// ─── WORD VAULT PLAYER ───────────────────────────────────────────────────────
function renderWVPlayer(wvItem){
  if(!_viewGuardOk()){navigate("login");return;}
  document.body.style.overflow='hidden'; // player fixed — workshop list scrolls internally
  var student=loadStudents()[currentSession.studentId];
  if(!student){logout();return;}
  var vids=loadVideos();
  // WV videos stored at order 100+index
  var wvIdx=WV_DATA.findIndex(function(f){return f.id===wvItem.id;});
  var vid=vids[100+wvIdx+1]||{};
  console.log('[WV Player] item='+wvItem.id+' key='+(100+wvIdx+1)+' src='+vid.src+' allKeys='+Object.keys(vids).join(','));
  var src=vid.src||'';
  var thumb=vid.thumb||wvItem.thumb||'';
  var title=vid.title||wvItem.title;

  // Build mission list sidebar from all WV items
  var missionList='';
  var day5=ALL_LESSONS.find(function(l){return l.order===4;});
  var wvUnlocked=isDemoSession()||!!(day5&&isCompleted(day5.id));
  WV_DATA.forEach(function(f,i){
    var isActive=(f.id===wvItem.id);
    var isDone=isCompleted(f.id);
    var t=vids[100+i+1]||{};
    var tThumb=t.thumb||f.thumb||'';
    missionList+='<div onclick="navigate(\'lesson\',{id:\''+f.id+'\'})" style="cursor:pointer;border-bottom:1px solid rgba(255,255,255,.06);padding:10px 14px;background:'+(isActive?'rgba(255,45,120,.07)':(isDone?'rgba(34,197,94,.04)':'transparent'))+';transition:background .15s" onmouseover="this.style.background=\'rgba(255,255,255,.05)\'" onmouseout="this.style.background=\''+(isActive?'rgba(255,45,120,.07)':(isDone?'rgba(34,197,94,.04)':'transparent'))+'\'">'
      +'<div style="display:flex;gap:10px;align-items:center">'
        +'<div style="position:relative;flex-shrink:0">'
          +(tThumb?'<img src="'+tThumb+'" style="width:56px;height:38px;object-fit:cover;border-radius:6px"/>'
            :'<div style="width:56px;height:38px;background:'+(isDone?'rgba(34,197,94,.15)':'rgba(255,255,255,.1)')+';border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:18px">'+f.icon+'</div>')
          +(isDone?'<div style="position:absolute;inset:0;background:rgba(34,197,94,.4);border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:15px">✓</div>':'')
        +'</div>'
        +'<div style="flex:1;min-width:0">'
          +'<div style="font-size:9px;font-weight:700;color:'+(isDone?'#4ade80':'var(--muted)')+';font-family:JetBrains Mono,monospace;text-transform:uppercase;letter-spacing:.07em">'+(f.cat)+'</div>'
          +'<div style="font-size:12px;font-weight:700;color:'+(isDone?'rgba(255,255,255,.6)':'#fff')+';line-height:1.3;margin-top:1px">'+f.title+'</div>'
        +'</div>'
        +(isDone?'<span style="color:#4ade80;font-size:11px;font-weight:700;flex-shrink:0">✓</span>':'')
      +'</div>'
    +'</div>';
  });

  app.innerHTML=sidebarHtml('wordvault')
    +'<div id="main-content" class="wvp-root" style="display:flex;flex-direction:column;height:100vh;overflow:hidden">'
      +'<div style="display:flex;align-items:center;gap:14px;padding:14px 20px;border-bottom:1px solid rgba(255,255,255,.07);background:rgba(13,13,28,.9);backdrop-filter:blur(20px);flex-shrink:0">'
        +'<button onclick="navigate(\'wordvault\')" style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:8px 14px;font-size:12px;color:var(--muted);cursor:pointer;font-family:JetBrains Mono,monospace;transition:all .15s" onmouseover="this.style.borderColor=\'rgba(255,45,120,.35)\'" onmouseout="this.style.borderColor=\'rgba(255,255,255,.1)\'">'
          +'← Pronunciation Workshop'
        +'</button>'
        +'<div style="flex:1;font-family:Montserrat,sans-serif;font-weight:700;font-size:14px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+title+'</div>'
      +'</div>'
      +'<div class="wvp-split" style="flex:1;display:flex;overflow:hidden">'
        // Video + info area
        +'<div class="wvp-main" style="flex:1;overflow-y:auto;display:flex;flex-direction:column">'
          +(src
            ?'<div id="player-wrapper" style="width:100%;background:#000">'
              +(function(){
                var ytId=null;
                var ytM=src.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&\s?]{11})/);
                if(ytM) ytId=ytM[1];
                var bunnyUrl=getBunnyEmbedUrl(src);
                if(ytId) return '<iframe src="https://www.youtube-nocookie.com/embed/'+ytId+'?rel=0&modestbranding=1&controls=1&playsinline=1&color=white" style="width:100%;aspect-ratio:16/9;border:none" allow="accelerometer;autoplay;encrypted-media;gyroscope;picture-in-picture;fullscreen" allowfullscreen></iframe>';
                if(bunnyUrl) return '<div style="position:relative;width:100%;aspect-ratio:16/9"><iframe style="position:absolute;inset:0;width:100%;height:100%;border:none" src="'+bunnyUrl+'" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>';
                return '<video src="'+src+'" controls style="width:100%;aspect-ratio:16/9;background:#000"></video>';
              })()
            +'</div>'
            :(thumb?'<div style="width:100%;aspect-ratio:16/9;background:#000;position:relative"><img src="'+thumb+'" style="width:100%;height:100%;object-fit:cover;opacity:.5"/><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center"><span style="font-size:60px">'+wvItem.icon+'</span></div></div>':'<div style="width:100%;aspect-ratio:16/9;background:#111;display:flex;align-items:center;justify-content:center;font-size:60px">'+wvItem.icon+'</div>'))
          +'<div style="padding:20px 24px">'
            +'<div style="font-size:10px;font-weight:700;font-family:JetBrains Mono,monospace;text-transform:uppercase;letter-spacing:.1em;color:var(--g1);margin-bottom:6px">'+wvItem.cat+'</div>'
            +'<h1 style="font-family:Montserrat,sans-serif;font-weight:800;font-size:22px;color:#fff;margin-bottom:8px">'+title+'</h1>'
                        +'<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">'
              +'<span style="font-size:12px;color:var(--muted)">⏱ '+wvItem.dur+'</span>'
              +'<span style="font-size:12px;color:var(--g1);font-weight:700">+'+wvItem.xp+' XP</span>'
              +(isCompleted(wvItem.id)
                ?'<span id="wv-done-badge" style="background:rgba(34,197,94,.12);color:#4ade80;border:1px solid rgba(34,197,94,.3);border-radius:8px;font-size:11px;font-weight:700;padding:6px 14px">✓ Completed</span>'
                :'<button id="wv-mark-btn" onclick="wvMarkComplete(\''+wvItem.id+'\')" style="background:var(--grad);border:none;border-radius:8px;color:#fff;font-size:11px;font-weight:700;padding:6px 14px;cursor:pointer;font-family:Montserrat,sans-serif">Mark Complete ✓</button>'
              )
            +'</div>'
          +'</div>'
        +'</div>'
        // WV sidebar
        +'<div class="wvp-side" style="width:280px;flex-shrink:0;border-left:1px solid var(--border);background:rgba(13,13,28,.6);overflow-y:auto;backdrop-filter:blur(20px)">'
          +'<div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);padding:12px 14px 8px;font-family:JetBrains Mono,monospace">Pronunciation Workshop</div>'
          +missionList
        +'</div>'
      +'</div>'
    +'</div>';
  // Auto-complete setup
  if(!isCompleted(wvItem.id)) setTimeout(function(){setupWVAutoComplete(wvItem.id);},300);
}

// ─── WORD VAULT LIST VIEW ────────────────────────────────────────────────────
function renderWordVault(){
  if(!_viewGuardOk()){navigate("login");return;}
  var student=loadStudents()[currentSession.studentId];
  if(!student){logout();return;}

  var day5=ALL_LESSONS.find(function(l){return l.order===4;});
  var wvUnlocked=isDemoSession()||!!(day5&&isCompleted(day5.id));
  var activeFilter='All';
  var searchTerm='';
  var vids=loadVideos();

  function buildList(){
    var filtered=WV_DATA.filter(function(f){
      var matchCat=activeFilter==='All'||f.cat===activeFilter;
      var matchSearch=!searchTerm||f.title.toLowerCase().includes(searchTerm)||f.desc.toLowerCase().includes(searchTerm)||f.cat.toLowerCase().includes(searchTerm);
      return matchCat&&matchSearch;
    });
    var cards=filtered.map(function(f){
      var idx=WV_DATA.indexOf(f);
      var v=vids[100+idx+1]||{};
      var thumb=v.thumb||f.thumb||'';
      var locked=!wvUnlocked;
      var done=isCompleted(f.id);
      var onclick=locked?'':("navigate('lesson',{id:'"+f.id+"'})");
      return '<div data-wv-card="'+f.id+'" class="wvc wvg'+(done?' done':'')+(locked?' locked':'')+'"'+(onclick?' onclick="'+onclick+'" role="button" tabindex="0"':'')+'>'
        +'<div class="wvc-img">'
          +(thumb?'<img src="'+escapeAttr(thumb)+'" alt="" loading="lazy" onerror="this.remove()"/>':f.icon)
          +(locked?'<div class="wvc-lock"><span>'+WV_LOCK+'</span></div>':'')
          +'<div data-wv-tick="'+f.id+'" class="wvc-tick" style="display:'+(done?'flex':'none')+'"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div>'
        +'</div>'
        +'<div class="wvc-body">'
          +'<div class="wvc-cat">'+escapeHtml(f.cat)+'</div>'
          +'<div class="wvc-t">'+escapeHtml(f.title)+'</div>'
          +'<div class="wvg-meta"><span>'+escapeHtml(f.dur)+'</span><span data-wv-xp="'+f.id+'" class="wvg-xp'+(done?' done':'')+'">'+(done?'✓ Done':'+'+f.xp+' XP')+'</span></div>'
        +'</div>'
      +'</div>';
    }).join('');
    document.getElementById('wv-list').innerHTML=cards?('<div class="wvg-grid">'+cards+'</div>'):'<div style="color:var(--muted);font-size:14px;padding:32px">No results found.</div>';
  }

  var WV_LOCK='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  var wvDone=WV_DATA.filter(function(f){return isCompleted(f.id);}).length;
  var cats=['All'].concat(WV_DATA.map(function(f){return f.cat;}).filter(function(c,i,a){return a.indexOf(c)===i;}));

  app.innerHTML=sidebarHtml("wordvault")
    +'<div id="main-content">'
    +topBarHtml(student)
    +mobileNavHtml("wordvault")
    +'<div class="dsh-wrap">'
    +'<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:20px">'
      +'<div><h1 style="font-family:Montserrat,sans-serif;font-weight:800;font-size:30px;color:#fff;margin:0 0 6px">Pronunciation Workshop</h1>'
      +'<p style="font-size:14px;color:var(--muted2);margin:0">Fix the words you&#39;ve been saying wrong your entire life.</p></div>'
      +'<div class="dsh-card" style="padding:12px 16px;min-width:220px">'
        +'<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted2);margin-bottom:8px"><span>Workshops done</span><span class="dsh-mono" style="color:#fff">'+wvDone+'/'+WV_DATA.length+'</span></div>'
        +'<div class="dsh-bar"><span style="width:'+Math.round(wvDone/WV_DATA.length*100)+'%"></span></div>'
      +'</div>'
    +'</div>'
    +(!wvUnlocked
      ?'<div class="wvg-banner"><span class="wvg-banner-ic">'+WV_LOCK+'</span><div style="flex:1;min-width:0"><strong>Workshop unlocks after Day 4</strong><p>Finish the first four days of the course and every workshop opens up.</p></div>'
        +(day5?'<button class="cr-btn" onclick="navigate(\'courses\')">Go to the course →</button>':'')+'</div>'
      :'')
    +'<div class="wvg-chips">'
    +cats.map(function(c){
      return '<button type="button" class="wv-chip'+(c==='All'?' active':'')+'" data-cat="'+escapeAttr(c)+'" onclick="wvSetFilter(this.dataset.cat)">'+escapeHtml(c)+'</button>';
    }).join('')
    +'</div>'
    +'<div id="wv-list"></div>'
    +'</div></div>';

  window.wvSetFilter=function(cat){
    activeFilter=cat;
    document.querySelectorAll('.wv-chip').forEach(function(btn){ btn.classList.toggle('active',btn.dataset.cat===cat); });
    buildList();
  };
  window.buildList=buildList;
  buildList();
}
