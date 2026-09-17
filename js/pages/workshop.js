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
      return '<div data-wv-card="'+f.id+'" '+(onclick?'onclick="'+onclick+'"':'')+' style="border-radius:16px;overflow:hidden;cursor:'+(locked?'default':'pointer')+';position:relative;background:rgba(255,255,255,.05);border:1px solid '+(done?'rgba(34,197,94,.3)':(locked?'rgba(255,255,255,.06)':'rgba(255,255,255,.09)'))+';transition:transform .15s,border-color .15s" '+(locked?'':' onmouseover="this.style.transform=\'scale(1.02)\'" onmouseout="this.style.transform=\'scale(1)\'"')+'>'
        +'<div style="position:relative;width:100%;aspect-ratio:16/9;background:rgba(255,255,255,.06);overflow:hidden">'
          +(thumb?'<img src="'+thumb+'" style="width:100%;height:100%;object-fit:cover;display:block;opacity:'+(locked?.4:1)+'" onerror="this.style.display=\'none\'"/>':'<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:36px;background:rgba(255,255,255,.04)">'+f.icon+'</div>')
          +'<div data-wv-tick="'+f.id+'" style="position:absolute;top:8px;right:8px;background:rgba(34,197,94,.9);border-radius:50%;width:28px;height:28px;display:'+(done?'flex':'none')+';align-items:center;justify-content:center;font-size:14px;font-weight:900;color:#fff">\u2713</div>'
          +(locked?'<div style="position:absolute;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;font-size:28px"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFUAAAB4CAYAAACDx76yAAAKMWlDQ1BJQ0MgUHJvZmlsZQAAeJydlndUU9kWh8+9N71QkhCKlNBraFICSA29SJEuKjEJEErAkAAiNkRUcERRkaYIMijggKNDkbEiioUBUbHrBBlE1HFwFBuWSWStGd+8ee/Nm98f935rn73P3Wfvfda6AJD8gwXCTFgJgAyhWBTh58WIjYtnYAcBDPAAA2wA4HCzs0IW+EYCmQJ82IxsmRP4F726DiD5+yrTP4zBAP+flLlZIjEAUJiM5/L42VwZF8k4PVecJbdPyZi2NE3OMErOIlmCMlaTc/IsW3z2mWUPOfMyhDwZy3PO4mXw5Nwn4405Er6MkWAZF+cI+LkyviZjg3RJhkDGb+SxGXxONgAoktwu5nNTZGwtY5IoMoIt43kA4EjJX/DSL1jMzxPLD8XOzFouEiSniBkmXFOGjZMTi+HPz03ni8XMMA43jSPiMdiZGVkc4XIAZs/8WRR5bRmyIjvYODk4MG0tbb4o1H9d/JuS93aWXoR/7hlEH/jD9ld+mQ0AsKZltdn6h21pFQBd6wFQu/2HzWAvAIqyvnUOfXEeunxeUsTiLGcrq9zcXEsBn2spL+jv+p8Of0NffM9Svt3v5WF485M4knQxQ143bmZ6pkTEyM7icPkM5p+H+B8H/nUeFhH8JL6IL5RFRMumTCBMlrVbyBOIBZlChkD4n5r4D8P+pNm5lona+BHQllgCpSEaQH4eACgqESAJe2Qr0O99C8ZHA/nNi9GZmJ37z4L+fVe4TP7IFiR/jmNHRDK4ElHO7Jr8WgI0IABFQAPqQBvoAxPABLbAEbgAD+ADAkEoiARxYDHgghSQAUQgFxSAtaAYlIKtYCeoBnWgETSDNnAYdIFj4DQ4By6By2AE3AFSMA6egCnwCsxAEISFyBAVUod0IEPIHLKFWJAb5AMFQxFQHJQIJUNCSAIVQOugUqgcqobqoWboW+godBq6AA1Dt6BRaBL6FXoHIzAJpsFasBFsBbNgTzgIjoQXwcnwMjgfLoK3wJVwA3wQ7oRPw5fgEVgKP4GnEYAQETqiizARFsJGQpF4JAkRIauQEqQCaUDakB6kH7mKSJGnyFsUBkVFMVBMlAvKHxWF4qKWoVahNqOqUQdQnag+1FXUKGoK9RFNRmuizdHO6AB0LDoZnYsuRlegm9Ad6LPoEfQ4+hUGg6FjjDGOGH9MHCYVswKzGbMb0445hRnGjGGmsVisOtYc64oNxXKwYmwxtgp7EHsSewU7jn2DI+J0cLY4X1w8TogrxFXgWnAncFdwE7gZvBLeEO+MD8Xz8MvxZfhGfA9+CD+OnyEoE4wJroRIQiphLaGS0EY4S7hLeEEkEvWITsRwooC4hlhJPEQ8TxwlviVRSGYkNimBJCFtIe0nnSLdIr0gk8lGZA9yPFlM3kJuJp8h3ye/UaAqWCoEKPAUVivUKHQqXFF4pohXNFT0VFysmK9YoXhEcUjxqRJeyUiJrcRRWqVUo3RU6YbStDJV2UY5VDlDebNyi/IF5UcULMWI4kPhUYoo+yhnKGNUhKpPZVO51HXURupZ6jgNQzOmBdBSaaW0b2iDtCkVioqdSrRKnkqNynEVKR2hG9ED6On0Mvph+nX6O1UtVU9Vvuom1TbVK6qv1eaoeajx1UrU2tVG1N6pM9R91NPUt6l3qd/TQGmYaYRr5Grs0Tir8XQObY7LHO6ckjmH59zWhDXNNCM0V2ju0xzQnNbS1vLTytKq0jqj9VSbru2hnaq9Q/uE9qQOVcdNR6CzQ+ekzmOGCsOTkc6oZPQxpnQ1df11Jbr1uoO6M3rGelF6hXrtevf0Cfos/ST9Hfq9+lMGOgYhBgUGrQa3DfGGLMMUw12G/YavjYyNYow2GHUZPTJWMw4wzjduNb5rQjZxN1lm0mByzRRjyjJNM91tetkMNrM3SzGrMRsyh80dzAXmu82HLdAWThZCiwaLG0wS05OZw2xljlrSLYMtCy27LJ9ZGVjFW22z6rf6aG1vnW7daH3HhmITaFNo02Pzq62ZLde2xvbaXPJc37mr53bPfW5nbse322N3055qH2K/wb7X/oODo4PIoc1h0tHAMdGx1vEGi8YKY21mnXdCO3k5rXY65vTW2cFZ7HzY+RcXpkuaS4vLo3nG8/jzGueNueq5clzrXaVuDLdEt71uUnddd457g/sDD30PnkeTx4SnqWeq50HPZ17WXiKvDq/XbGf2SvYpb8Tbz7vEe9CH4hPlU+1z31fPN9m31XfKz95vhd8pf7R/kP82/xsBWgHcgOaAqUDHwJWBfUGkoAVB1UEPgs2CRcE9IXBIYMj2kLvzDecL53eFgtCA0O2h98KMw5aFfR+OCQ8Lrwl/GGETURDRv4C6YMmClgWvIr0iyyLvRJlESaJ6oxWjE6Kbo1/HeMeUx0hjrWJXxl6K04gTxHXHY+Oj45vipxf6LNy5cDzBPqE44foi40V5iy4s1licvvj4EsUlnCVHEtGJMYktie85oZwGzvTSgKW1S6e4bO4u7hOeB28Hb5Lvyi/nTyS5JpUnPUp2Td6ePJninlKR8lTAFlQLnqf6p9alvk4LTduf9ik9Jr09A5eRmHFUSBGmCfsytTPzMoezzLOKs6TLnJftXDYlChI1ZUPZi7K7xTTZz9SAxESyXjKa45ZTk/MmNzr3SJ5ynjBvYLnZ8k3LJ/J9879egVrBXdFboFuwtmB0pefK+lXQqqWrelfrry5aPb7Gb82BtYS1aWt/KLQuLC98uS5mXU+RVtGaorH1futbixWKRcU3NrhsqNuI2ijYOLhp7qaqTR9LeCUXS61LK0rfb+ZuvviVzVeVX33akrRlsMyhbM9WzFbh1uvb3LcdKFcuzy8f2x6yvXMHY0fJjpc7l+y8UGFXUbeLsEuyS1oZXNldZVC1tep9dUr1SI1XTXutZu2m2te7ebuv7PHY01anVVda926vYO/Ner/6zgajhop9mH05+x42Rjf2f836urlJo6m06cN+4X7pgYgDfc2Ozc0tmi1lrXCrpHXyYMLBy994f9Pdxmyrb6e3lx4ChySHHn+b+O31w0GHe4+wjrR9Z/hdbQe1o6QT6lzeOdWV0iXtjusePhp4tLfHpafje8vv9x/TPVZzXOV42QnCiaITn07mn5w+lXXq6enk02O9S3rvnIk9c60vvG/wbNDZ8+d8z53p9+w/ed71/LELzheOXmRd7LrkcKlzwH6g4wf7HzoGHQY7hxyHui87Xe4Znjd84or7ldNXva+euxZw7dLI/JHh61HXb95IuCG9ybv56Fb6ree3c27P3FlzF3235J7SvYr7mvcbfjT9sV3qID0+6j068GDBgztj3LEnP2X/9H686CH5YcWEzkTzI9tHxyZ9Jy8/Xvh4/EnWk5mnxT8r/1z7zOTZd794/DIwFTs1/lz0/NOvm1+ov9j/0u5l73TY9P1XGa9mXpe8UX9z4C3rbf+7mHcTM7nvse8rP5h+6PkY9PHup4xPn34D94Tz+6TMXDkAAAeiSURBVHja7ZxdjF1VFcd/635MPyi2UtIPKaaQYFAkEgKJQcSQQAhBjfBQwJQY/IAQE3gwoIaQ+GIKxCde4Y0Ygy/AQ0GbwIiJICWIVg3Og47BorQWi4V+zMy95+/DXbuzc8JonXvOvWfurH9ycu4995x99v7vtddee621LwQCgUAgEAgEAoFAIBAIBAKBQCAQCAQCgUAgEAgEAoFAIBBYGbCmVkySAa0l6iigMDMFqWdOpMysOIP7E+mNItgaRGjbzPrZ983AxcAFwBZgA/A+cBj4MzBjZkeXen5VQ1LLJRRJ6yTtlrRX0hH9dxyS9Iyk2yStTZLu0ruqCW1nn++UNFMibl7SKUlz/nnOv8+X7ntT0p0fVu6qJFTSDknPZwTNfQhpSyERnbBP0s5xE2vjItTM+pKuAJ4GdgA9n9W7ftsfgX3AfuBvwEngbODjwBXAdcCn/N4FP3eBd4BbzOyVVaNnMwm9XNLRTOIK//yypC9K6vyPcjqSbpQ0XZJcSTom6bOrQhWkSUnSNkkHS0T0JT2QJq2MuI6ktj/bTtdK5X5b0slSeYcknT/xk1cmpT8vSegJSTdlxLfPtLxEmKRrXPKLjNgXndT2pBN6R0Zoz0n4kv/WXWbZXT9fK2nBy03Efm0i1YBLi0laL+mvJWn6gd8zNeQ7ErH3l0bBrNu/lquWSSC1U5LSOW/wHzKdaRV0XNK9v8veI0m35/WYmAnKzz9zMlNjd1XZ2Kzzbi913t6JUgHZEnSzpPcy8+ctSWurHJaZmjlL0jvZu45KOievT50YhamR3vFJYGNmqO8zs1NAuyoPk5fTMrPjwC+zhcEm4JJRtXkUpCbJuNDPaYXzak1SkyT/N6X3XTSqVeQojeKtpUbNumRV7gf1ct8qXd4+qoaOktSNJVJP1KXG/Xys9L6zJpHUqRE7c8YWCRglqY2MJ610UkeN7rhePM4VRgqjVL18bEkqgHXjGiGjILUtCQZO6FyXHvdZulfxYqNnZpJUnqgKX3G1JfXrjL7WRqovTWVmc/79oyXJ2S5pDdDObMlK2iSpB5xfVgdm1kudKKl1JmHwYQzzqgk9HcaQ9AXgFuAbwPrsvSeAIzXVQcA2tzhSJ/4LeArYCzzv0rwywi2Z3/Rzkl4qBep62VGoXhSl9+XY753dfCdLRug9Hh6RO43n1AzkkdpC0l11EGtVD3lJtwE/AQrXlcm0OQzMMsgyqdPutSVWcxcCmzMnS9tNypvN7JnGqYIsoLdd0r9dChZcImYk7ZK0acx13Ox+1plsBBWSDks6p3GRgcw5vMcrfMrPv5d0bnafeQeM+rASuQdK9fx+3o6mkGoeFpnJpLQv6Sr/fWrcUuB1nPLPV2X1LDz80mqMpGahkguySkrSG/nvQ6qWTp4DUFF9D2QT1klJ51VR36rW/ql3t/hiIq2Q3sjyTZcrWS0zK8yslx39IRufnnvdz31gLYv+1qGltUod0inNyu+6gb0sQpMDW9KngWsY5FC9C+w3s5fMrBhyVXS4VN9u1UQ0xtWXCHVr4THgq27+5PdMA980s78MQezJUj0r8wU0yvWXea3OZpDxd4cPx7ns6AHXAi9I2jqEKqhtJdU0f2qSuoeBK53EFrAmOzrAPLATeMTvX44etIkn1Yd9X9LHgK/7iqzrw/Ix4CvAHl8Ndfz3XZK2+XONMdyblAbT9qF9pc/G8+5letzM7vN7nnVb8zv++zrgcuA5F5BGLDOrlNSqJGWLS2ciKNm7m1waD/j1wu/bWvdwXuk6FTebzEeRgLslbTSz91yC78ok29wnW+ns3aThP6ykJLPo1z5BJb35GWC/pBfcXr3EpbgNfOD358+HpJ7ukYEx3zazvwM/yiSxAD4B3JMRWnjdHzGzf/pzEympVTSqcJvzISf0uyzGsOREtv14Avih+wKKJumvVpNINbO0J9XM7EEG23qOOcFpH+rbwG4z+1bqiKZt/G1kMoWrgikz+4VLZMtNKAP2mNmPJXW9EzTGkbVySC2pgpnS9QUf8o1NI2p02o+rgqLk9Gh8WHkl5FKd8mHfy84EqcPZra/75w3+/bWK7FKrayVWq0k1jJPDJyszszclXQdcD0yb2W/9+rJJ9XqtK13uN4nURObxkvTvcGezhiBWTuA0MJ0IGdKEkpe7M6tvwWI+wvgnwGxLz7m+eznhoKQ1FW08a1cU9Esb2NaXtgQdkrRh2NFVmU71Xm+Z2REGO0LkNuV5wH0+U+c7of/vw8ssBm1eduy/A3S8Pve6d2vOy37VzD5o1HI3S6bYne0L7fv51ibNfl7HvH7KdnBXEmKpMpeq5ZL/MgNH8wKLEcqngCeBP7mJNFJzF/gIcCmDIOKX/Xpygu8zsxuqzFetlFSfsS8CXmGQDJYnguHfx2Fnrs3a2vdjikHC3NXAP9zf0CxSS8ReBvyUxV1285m1MQ4PfeGd2cpGz2vArWY2W2dWdVXEphzVTZIe9Zm1SZiV9D1PjaeOvwKpKz39dM971t/ngct8xu2O2BY01+MHfXX2K98QTOMldCmbsKmjqc6Qto2CXJb+d8mR80mD/80yEAgEAoFAIBAIBAKBQCAQCAQCgUAgEAgEAoFAIBAIjA3/AToLP0WYaKd1AAAAAElFTkSuQmCC" style="width:22px;height:22px;object-fit:contain;vertical-align:middle;filter:brightness(1.4) drop-shadow(0 0 3px rgba(255,255,255,.3))"/></div>':'')
        +'</div>'
        +'<div style="padding:12px 14px">'
          +'<div style="font-size:9px;font-weight:700;color:'+(done?'#4ade80':'var(--g1)')+';font-family:JetBrains Mono,monospace;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">'+f.cat+'</div>'
          +'<div style="font-family:Montserrat,sans-serif;font-weight:700;font-size:13px;color:'+(done?'rgba(255,255,255,.7)':'#fff')+';line-height:1.3;margin-bottom:6px">'+f.title+'</div>'
          +'<div style="display:flex;align-items:center;justify-content:space-between">'
            +'<span style="font-size:11px;color:var(--muted)">'+f.dur+'</span>'
            +'<span data-wv-xp="'+f.id+'" style="font-size:10px;color:'+(done?'#4ade80':'var(--g1)')+';font-weight:700">'+(done?'\u2713 Done':'+'+f.xp+' XP')+'</span>'
          +'</div>'
        +'</div>'
      +'</div>';
    }).join('');
    document.getElementById('wv-list').innerHTML=cards?('<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px">'+cards+'</div>'):'<div style="color:var(--muted);font-size:14px;padding:32px">No results found.</div>';
  }

  app.innerHTML=sidebarHtml("wordvault")
    +'<div id="main-content">'
    +topBarHtml(student)
    +mobileNavHtml("wordvault")
    +'<div style="padding:28px 32px 80px">'
    +'<h1 style="font-family:Montserrat,sans-serif;font-weight:800;font-size:28px;color:#fff;margin-bottom:4px">Pronunciation Workshop</h1>'
    +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:24px">'
      +'<p style="font-size:14px;color:var(--muted);margin:0">Fix the words you&#39;ve been saying wrong your entire life.</p>'
    +'</div>'

    // ── FILTER CHIPS ──
    +'<div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;margin-bottom:20px">'
    +['All'].concat(WV_DATA.map(function(f){return f.cat;}).filter(function(c,i,a){return a.indexOf(c)===i;})).map(function(c){
      return '<button class="wv-chip'+(c==='All'?' active':'')+'" onclick="wvSetFilter(&apos;'+c+'&apos;)" style="padding:7px 14px;border-radius:20px;border:1px solid '+(c==='All'?'rgba(255,45,120,.3)':'var(--border)')+';background:'+(c==='All'?'rgba(255,45,120,.1)':'rgba(255,255,255,.04)')+';color:'+(c==='All'?'var(--text)':'var(--muted)')+';font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap;transition:all .15s;backdrop-filter:blur(10px);flex-shrink:0">'+c+'</button>';
    }).join('')
    +'</div>'

    // ── LIST ──
    +'<div id="wv-list"></div>'
    +'</div></div>';

  window.wvSetFilter=function(cat){
    activeFilter=cat;
    document.querySelectorAll('.wv-chip').forEach(function(btn){
      var a=btn.textContent===cat;
      btn.style.borderColor=a?'rgba(255,45,120,.3)':'var(--border)';
      btn.style.background=a?'rgba(255,45,120,.1)':'rgba(255,255,255,.04)';
      btn.style.color=a?'var(--text)':'var(--muted)';
    });
    buildList();
  };
  window.buildList=buildList;
  buildList();
}
