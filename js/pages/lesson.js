/* lesson.js — extracted verbatim from the original single-file index.html.
   Source lines: 4902-5505
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
function renderLesson(lessonId){
  document.body.style.overflow=window.innerWidth<=820?'':'hidden'; // internal scroll on desktop, natural scroll on mobile
  // Remove stale player from DOM immediately when switching lessons
  var existingPlayer=document.getElementById('player-wrapper');
  if(existingPlayer){
    var existingIframe=existingPlayer.querySelector('iframe');
    var existingVideo=existingPlayer.querySelector('video');
    if(existingIframe) existingIframe.src='about:blank';
    if(existingVideo){ existingVideo.pause(); existingVideo.src=''; }
    existingPlayer.innerHTML='<div style="width:100%;height:100%;background:#000;display:flex;align-items:center;justify-content:center"><div style="width:32px;height:32px;border:3px solid rgba(255,255,255,.15);border-top-color:rgba(255,255,255,.6);border-radius:50%;animation:spin .7s linear infinite"></div></div>';
  }
  // Check if this is a Word Vault item (f01-f10)
  var wvItem = (typeof WV_DATA !== 'undefined') ? WV_DATA.find(function(f){return f.id===lessonId;}) : null;
  if(wvItem){
    var day5=ALL_LESSONS.find(function(l){return l.order===4;});
    var wvUnlocked=isDemoSession()||!!(day5&&isCompleted(day5.id));
    if(!wvUnlocked){
      app.innerHTML='<div style="min-height:100vh;background:var(--bg);display:flex;align-items:center;justify-content:center"><div style="text-align:center;max-width:340px;padding:24px"><p style="color:var(--g1);font-size:14px;margin-bottom:16px">Complete Phase 1 (Day 4) to unlock Pronunciation Workshop.</p><button onclick="navigate(\'dashboard\')" class="btn-primary" style="width:auto;padding:10px 24px">Dashboard</button></div></div>';
      return;
    }
    // Build a pseudo-lesson object for the WV player
    var wvLesson = {id:wvItem.id,title:wvItem.title,description:wvItem.desc,order:0,dayNumber:0};
    activeLesson = wvLesson;
    renderWVPlayer(wvItem);
    return;
  }
  var lesson=ALL_LESSONS.find(function(l){return l.id===lessonId;});
  if(lesson){
    activeLesson=lesson; // update NOW PLAYING in sidebar
    if(currentSession&&currentSession.studentId){
      try{localStorage.setItem('brokeneng_lastlesson_'+currentSession.studentId, lesson.id);}catch(e){}
      // Also save to Supabase course_config for cross-device sync
      if(typeof _sb!=='undefined'){
        (async function(){ try{ await _sb.from('course_config').upsert({id:'lastlesson_'+currentSession.studentId,data:{lessonId:lesson.id}},{onConflict:'id'}); }catch(e){} })();
      }
    }
  }
  if(!lesson||!isUnlocked(lesson)){
    app.innerHTML='<div style="min-height:100vh;background:var(--bg);display:flex;align-items:center;justify-content:center"><div style="text-align:center;max-width:340px;padding:24px"><p style="color:var(--g1);font-size:14px;margin-bottom:16px">This class is not unlocked yet.</p><button onclick="navigate(\'dashboard\')" class="btn-primary" style="width:auto;padding:10px 24px">Dashboard</button></div></div>';
    return;
  }
  if(!isVideoAccessible(lesson)){
    app.innerHTML='<div style="min-height:100vh;background:var(--bg);display:flex;align-items:center;justify-content:center"><div style="text-align:center;max-width:340px;padding:24px"><div style="width:52px;height:52px;border-radius:14px;background:rgba(234,179,8,.1);border:1px solid rgba(234,179,8,.25);display:flex;align-items:center;justify-content:center;margin:0 auto 16px"><svg style="width:24px;height:24px;color:#fbbf24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg></div><h2 style="font-family:Montserrat,sans-serif;font-weight:800;font-size:18px;color:#fff;margin-bottom:8px">Video Temporarily Locked</h2><p style="color:var(--muted);font-size:13px;margin-bottom:24px;line-height:1.6">Your admin has temporarily locked this video.</p><button onclick="navigate(\'dashboard\')" class="btn-primary" style="width:auto;padding:10px 24px">Back</button></div></div>';
    return;
  }
  if(currentSession) currentSession.lessonId=lesson.id;
  var completed=isCompleted(lesson.id);
  var section=SECTIONS.find(function(s){return s.id===lesson.sectionId;});
  var realQuiz=hasRealQuiz(lesson);
  if(!_viewGuardOk()){navigate("login");return;}
  var student=loadStudents()[currentSession.studentId];
  var videoMeta=loadVideos()[lesson.order]||{};
  var videoSrc=videoMeta.src||SAMPLE_VIDEO;
  var videoDur=videoMeta.duration||"18 min";
  var videoTitle=videoMeta.panelTitle||videoMeta.title||lesson.title; // use admin-set title
  var videoDesc=videoMeta.desc||lesson.description;
  var bullets=videoMeta.bullets?videoMeta.bullets.split("\n").filter(function(b){return b.trim();}):DAY_BULLETS[lesson.order]||["Pronunciation patterns","Stress & intonation","Common mistakes","Real-world examples"];
  var thumbUrl=videoMeta.thumb||lesson.thumbnailUrl||"";
  var ytId=getYouTubeId(videoSrc);
  var bunnyUrl=getBunnyEmbedUrl(videoSrc);
  var videoHtml='';
  if(ytId){
    videoHtml='<iframe style="position:absolute;inset:0;width:100%;height:100%;border:none" src="https://www.youtube-nocookie.com/embed/'+ytId+'?rel=0&modestbranding=1&controls=1&playsinline=1&color=white" allow="accelerometer;autoplay;encrypted-media;gyroscope;picture-in-picture;fullscreen" allowfullscreen referrerpolicy="strict-origin"></iframe>';
  } else if(bunnyUrl){
    videoHtml='<iframe style="position:absolute;inset:0;width:100%;height:100%;border:none" src="'+bunnyUrl+'" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
  } else {
    videoHtml='<video id="video" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" controls controlsList="nodownload noremoteplayback noplaybackrate" disablepictureinpicture playsinline><source id="video-source" src="'+videoSrc+'"/></video>'
      +'<div style="position:absolute;top:8px;left:8px;right:8px;display:flex;align-items:center;justify-content:space-between;pointer-events:none">'
      +'<div id="quality-buttons" style="pointer-events:auto;display:flex;gap:4px;border-radius:20px;background:rgba(0,0,0,.5);padding:3px 6px;backdrop-filter:blur(8px)"></div>'
      +'<button id="fullscreen-btn" style="pointer-events:auto;border-radius:20px;background:rgba(0,0,0,.5);padding:3px 10px;font-size:11px;color:rgba(255,255,255,.7);border:none;cursor:pointer">⛶</button>'
      +'</div>';
  }

  var lessonIdx=section.lessons.findIndex(function(l){return l.id===lesson.id;});
  var prevL=lessonIdx>0?section.lessons[lessonIdx-1]:null;
  var nextL=lessonIdx<section.lessons.length-1?section.lessons[lessonIdx+1]:null;

  var missionList='';
  section.lessons.forEach(function(l){
    var lDone=isCompleted(l.id);
    var lUnlocked=isUnlocked(l);
    var isCur=l.id===lesson.id;
    var lvm=loadVideos()[l.order]||{};
    var lThumb=lvm.thumb||'';
    var _prev2=ALL_LESSONS[ALL_LESSONS.indexOf(l)-1];
    var _needsQuiz=_prev2&&hasRealQuiz(_prev2)&&isCompleted(_prev2.id)&&!hasAttemptedQuiz(_prev2.order);
    var lOnclick=lUnlocked
      ?"navigate('lesson',{id:'"+l.id+"'})"
      :(_needsQuiz?"showQuizGateMsg('Day "+l.order+"')":'');
    var imgBg=lThumb
      ?'<img src="'+lThumb+'" style="width:100%;height:100%;object-fit:cover;opacity:'+(lUnlocked||lDone?'1':'.35')+'"/>'+((!lUnlocked&&!lDone)?'<div style="position:absolute;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font-size:22px"><img src="data:image/png;base64,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" style="width:22px;height:22px;object-fit:contain;vertical-align:middle;filter:brightness(1.4) drop-shadow(0 0 3px rgba(255,255,255,.3))"/></div>':'')
      :'<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:18px;color:rgba(255,255,255,.15)">'+(lUnlocked||lDone?'▶':'<img src="data:image/png;base64,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" style="width:22px;height:22px;object-fit:contain;vertical-align:middle;filter:brightness(1.4) drop-shadow(0 0 3px rgba(255,255,255,.3))"/>')+'</div>';
    var titleColor=isCur?'#fff':lDone?'rgba(255,255,255,.5)':'rgba(255,255,255,.85)';
    missionList+='<div class="mp-item'+(isCur?' mp-active':'')+'" onclick="'+lOnclick+'" style="display:block;cursor:'+(lUnlocked?'pointer':'default')+';opacity:'+(lUnlocked?'1':'.45')+';border-bottom:1px solid rgba(255,255,255,.06);overflow:hidden">'
      +'<div style="position:relative;width:100%;height:88px;background:rgba(255,255,255,.06);overflow:hidden">'
        +imgBg
        +'<div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(13,13,28,.9) 0%,transparent 55%)"></div>'
        +'<div style="position:absolute;bottom:7px;left:9px;right:9px;display:flex;align-items:flex-end;justify-content:space-between">'
          +'<div style="min-width:0">'
            +'<div style="font-size:8px;font-weight:700;color:rgba(255,255,255,.45);font-family:JetBrains Mono,monospace;text-transform:uppercase;letter-spacing:.07em;margin-bottom:2px">DAY '+l.order+'</div>'
            +'<div style="font-size:12px;font-weight:700;color:'+titleColor+';line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px">'+getLessonTitle(l)+'</div>'
          +'</div>'
          +(lDone?'<div style="font-size:12px;color:var(--g1);flex-shrink:0;margin-left:6px">✓</div>':'')
        +'</div>'
      +'</div>'
      +'</div>';
  });


  app.innerHTML=sidebarHtml("")
    +'<div id="main-content" class="lesson-root" style="display:flex;flex-direction:column;height:100vh;overflow:hidden">'
    +'<div style="display:flex;align-items:center;gap:12px;padding:12px 20px;border-bottom:1px solid var(--border);background:rgba(13,13,28,.85);backdrop-filter:blur(20px);position:sticky;top:0;z-index:50;flex-shrink:0">'
      +'<button type="button" onclick="navigate(\'dashboard\')" style="padding:6px 12px;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,.05);color:var(--muted);font-size:12px;cursor:pointer;backdrop-filter:blur(10px);font-family:JetBrains Mono,monospace;white-space:nowrap" onmouseover="this.style.borderColor=\'rgba(255,45,120,.3)\';this.style.color=\'var(--text)\'" onmouseout="this.style.borderColor=\'var(--border)\';this.style.color=\'var(--muted)\'">← Back</button>'
      +'<div style="font-size:11px;color:var(--muted);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:JetBrains Mono,monospace;min-width:0">Day '+lesson.order+': <span style="color:var(--text)">'+getLessonTitle(lesson).slice(0,20)+(getLessonTitle(lesson).length>20?"…":"")+'</span></div>'
      +'<div style="display:flex;gap:4px;flex-shrink:0;flex-wrap:wrap">'
        +(prevL&&isUnlocked(prevL)?'<button type="button" onclick="navigate(\'lesson\',{id:\''+prevL.id+'\'})" style="padding:6px 12px;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,.05);color:var(--muted);font-size:12px;cursor:pointer;font-family:JetBrains Mono,monospace">← Prev</button>':'')
        +'<button type="button" id="mark-complete-btn" style="'+(completed?'background:rgba(34,197,94,.1);color:#4ade80;border:1px solid rgba(34,197,94,.25)':'background:var(--grad);color:#fff;border:none;box-shadow:0 4px 14px rgba(255,45,120,.3);cursor:pointer')+';padding:6px 12px;border-radius:8px;font-size:11px;font-weight:700;font-family:Montserrat,sans-serif">'+(completed?'Completed ✓':'Mark Complete ✓')+'</button>'
        +(nextL&&isUnlocked(nextL)?'<button type="button" onclick="navigate(\'lesson\',{id:\''+nextL.id+'\'})" style="padding:6px 12px;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,.05);color:var(--muted);font-size:12px;cursor:pointer;font-family:JetBrains Mono,monospace">Next →</button>':'')
      +'</div>'
    +'</div>'
    +'<div class="lesson-body-split" style="display:flex;flex:1;min-height:0;overflow:hidden">'
      +'<div class="lesson-left-col" style="flex:1;overflow-y:auto;min-width:0;padding-bottom:80px">'
        +'<div style="background:#000;position:relative">'
          +'<div id="player-wrapper" class="no-select" data-lesson-order="'+lesson.order+'" style="position:relative;width:100%;aspect-ratio:16/9;background:#000;overflow:hidden">'
            +videoHtml
            +'<div id="wm-container" style="position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:99">'
              +'<div id="wm-1" style="position:absolute;font-family:monospace;font-size:11px;font-weight:600;color:rgba(255,255,255,.18);white-space:nowrap;user-select:none"></div>'
              +'<div id="wm-2" style="position:absolute;font-family:monospace;font-size:11px;color:rgba(255,255,255,.14);white-space:nowrap;user-select:none"></div>'
              +'<div id="wm-corner" style="position:absolute;bottom:8px;right:8px;font-family:monospace;font-size:9px;font-weight:700;color:rgba(255,255,255,.12);user-select:none;text-align:right"></div>'
            +'</div>'
          +'</div>'
        +'</div>'
        +'<div style="padding:24px 28px">'
          +'<div style="display:inline-flex;align-items:center;gap:6px;background:rgba(255,45,120,.1);border:1px solid rgba(255,45,120,.2);border-radius:6px;padding:4px 10px;font-size:10px;font-family:JetBrains Mono,monospace;color:var(--g1);text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px">🎯 MISSION '+lesson.order+'</div>'
          +'<h1 style="font-family:Montserrat,sans-serif;font-weight:800;font-size:26px;color:#fff;margin-bottom:8px;line-height:1.2">'+videoTitle+'</h1>'
          +'<p style="font-size:14px;color:var(--muted2);line-height:1.7;margin-bottom:22px">'+videoDesc+'</p>'
          +'<div style="font-family:Montserrat,sans-serif;font-weight:700;font-size:14px;margin-bottom:12px">Mission Objectives</div>'
          +'<div style="display:flex;flex-direction:column;gap:9px;margin-bottom:24px">'
            +bullets.map(function(b){return '<div style="display:flex;gap:10px;align-items:flex-start;font-size:13.5px;color:var(--muted2);line-height:1.5"><span style="width:6px;height:6px;border-radius:50%;background:var(--gradh);flex-shrink:0;margin-top:6px;box-shadow:0 0 6px rgba(255,45,120,.5)"></span>'+b+'</div>';}).join('')
          +'</div>'
          +'<div style="background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:var(--r);padding:22px;backdrop-filter:blur(14px);position:relative;overflow:hidden">'
            +'<div style="position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.1),transparent)"></div>'
            +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">'
              +'<div style="font-family:Montserrat,sans-serif;font-weight:700;font-size:16px">⚡ Mission Challenge</div>'
              +(realQuiz?'<div style="font-size:9px;font-family:JetBrains Mono,monospace;background:rgba(240,88,37,.12);color:var(--g3);border-radius:5px;padding:3px 8px;text-transform:uppercase;letter-spacing:.07em">7 Questions</div>':'')
            +'</div>'
            +'<div id="ch-sub" style="font-size:12px;color:var(--muted);margin-bottom:16px">'+(completed?'Lesson complete — test what you learned.':'Complete the mission video to unlock the challenge.')+'</div>'
            +(realQuiz?'<button type="button" id="ch-btn" onclick="navigate(\'quiz\',{lessonId:\''+lesson.id+'\'})" '+(completed?'':'disabled')
              +' style="'+(completed?'background:var(--grad);cursor:pointer;box-shadow:0 2px 14px rgba(255,45,120,.3)':'background:rgba(255,255,255,.05);cursor:not-allowed;opacity:.4')
              +';display:flex;align-items:center;gap:8px;padding:12px 22px;border:none;border-radius:9px;color:#fff;font-family:Montserrat,sans-serif;font-weight:800;font-size:13px">⚡ '+(completed?'Start Challenge':'Unlock Challenge')+'</button>':'')
          +'</div>'
        +'</div>'
        +''
      +'</div>'
      +'<div style="width:280px;flex-shrink:0;border-left:1px solid var(--border);background:rgba(13,13,28,.6);overflow-y:auto;padding:16px 0;backdrop-filter:blur(20px);display:flex;flex-direction:column" id="mp-right" class="mp-right-panel">'
        
        +'<div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);padding:12px 16px 8px;font-family:JetBrains Mono,monospace">All Missions</div>'
        +'<div class="dock-col" style="display:flex;flex-direction:column;padding:6px 6px 6px 20px;margin-left:-14px">'+missionList+'</div>'
      +'</div>'
    +'</div>'
    +'</div>';
  // Force dock magnify on sidebar after DOM is ready
  requestAnimationFrame(function(){
    var col=document.querySelector('#mp-right .dock-col');
    if(col) initDockMagnify(col,'col');
  });

  setupPlayer(lesson,student);
}



// Extract YouTube video ID from any YouTube URL format
function getYouTubeId(url){
  if(!url)return null;
  const patterns=[
    /youtu\.be\/([^?&\s]+)/,
    /youtube\.com\/watch\?v=([^&\s]+)/,
    /youtube\.com\/embed\/([^?&\s]+)/,
    /youtube\.com\/v\/([^?&\s]+)/,
    /youtube\.com\/shorts\/([^?&\s]+)/,
  ];
  for(const p of patterns){const m=url.match(p);if(m)return m[1];}
  return null;
}

// Convert any Bunny.net URL to embed format
function getBunnyEmbedUrl(url){
  if(!url) return null;
  url = url.trim();

  // Already an embed iframe URL — return as-is
  if(url.includes('iframe.mediadelivery.net/embed')) return url;

  // Format: https://iframe.mediadelivery.net/play/LIBID/VIDEOID
  // Format: https://video.bunnycdn.com/play/LIBID/VIDEOID
  var m = url.match(/(?:iframe\.mediadelivery\.net\/play|video\.bunnycdn\.com\/play)\/(\d+)\/([a-f0-9-]{36})/i);
  if(m) return 'https://iframe.mediadelivery.net/embed/'+m[1]+'/'+m[2]+'?autoplay=false&loop=false&muted=false&preload=true&responsive=true';

  // Format: https://PULLZONE.b-cdn.net/VIDEOID/play_... or playlist.m3u8
  // Extract GUID from b-cdn.net URLs
  var m2 = url.match(/b-cdn\.net\/([a-f0-9-]{36})\//i);
  if(m2){
    // Can't get library ID from CDN URL — store as direct video source
    return null; // fallback to <video> tag
  }

  // Format: mediadelivery.net with /LIBID/VIDEOID path
  var m3 = url.match(/mediadelivery\.net[^?]*\/(\d+)\/([a-f0-9-]{36})/i);
  if(m3) return 'https://iframe.mediadelivery.net/embed/'+m3[1]+'/'+m3[2]+'?autoplay=false&loop=false&muted=false&preload=true&responsive=true';

  // Any URL containing a UUID-style video ID and a library number
  var m4 = url.match(/\/(\d{4,8})\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
  if(m4) return 'https://iframe.mediadelivery.net/embed/'+m4[1]+'/'+m4[2]+'?autoplay=false&loop=false&muted=false&preload=true&responsive=true';

  return null;
}

function setupPlayer(lesson,student){try{
  const wrapper=document.getElementById("player-wrapper");
  const videoMeta=loadVideos()[lesson.order]||{};
  const realSrc=videoMeta.src||SAMPLE_VIDEO;

  // Mark complete + auto quiz setup (works for ALL video types)
  const markBtn2=document.getElementById("mark-complete-btn");
  var autoCompleted=false;

  function doMarkAndQuiz(){
    if(autoCompleted||isCompleted(lesson.id)) return;
    autoCompleted=true;
    markLessonComplete(lesson.id);
    if(markBtn2){
      markBtn2.disabled=true;
      markBtn2.textContent='Completed ✓';
      markBtn2.style.background='rgba(34,197,94,.1)';
      markBtn2.style.color='#4ade80';
      markBtn2.style.border='1px solid rgba(34,197,94,.25)';
      markBtn2.style.cursor='default';
      markBtn2.style.boxShadow='none';
    }
    renderQuizCta(lesson,true);
    // Real-time quiz button unlock
    var chBtn=document.getElementById('ch-btn');
    var chSub=document.getElementById('ch-sub');
    if(chBtn){
      chBtn.disabled=false;
      chBtn.style.background='var(--grad)';
      chBtn.style.cursor='pointer';
      chBtn.style.boxShadow='0 2px 14px rgba(255,45,120,.3)';
      chBtn.style.opacity='1';
      chBtn.textContent='⚡ Start Challenge';
    }
    if(chSub) chSub.textContent='Lesson complete — test what you learned.';
    // Update right panel unlock states
    if(currentSession?.role==="student"){
      var sts=loadStudents();var ss=sts[currentSession.studentId];
      if(ss){
        var unlockedNow=ALL_LESSONS.filter(function(l){return isUnlocked(l);});
        document.querySelectorAll('[data-lesson-order]').forEach(function(el){
          var ord=parseInt(el.dataset.lessonOrder);
          if(unlockedNow.find(function(l){return l.order===ord;})){el.style.opacity='1';el.style.cursor='pointer';}
        });
      }
    }
  }

  // Always wire manual mark complete click
  if(markBtn2&&!isCompleted(lesson.id)){
    markBtn2.addEventListener('click',function(){doMarkAndQuiz();});
  }

  // If YouTube or Bunny.net iframe
  if(getYouTubeId(realSrc)||getBunnyEmbedUrl(realSrc)){
    wrapper.addEventListener("contextmenu",e=>e.preventDefault());
    const vmeta2=loadVideos()[lesson.order]||{};
    const durStr2=vmeta2.duration||'18 min';
    const mins2=parseFloat(durStr2)||18;
    const totalSec=mins2*60;

    // Listen for Bunny postMessage events
    function onBunnyMsg(e){
      try{
        var d=typeof e.data==='string'?JSON.parse(e.data):e.data;
        if(!d||!d.event) return;
        // Time progress — unlock button at 80%
        if(d.event==='onTimeUpdate'&&d.seconds&&totalSec>0){
          var pct=d.seconds/totalSec;
          if(pct>=0.80&&markBtn2&&!isCompleted(lesson.id)){
            unlockBtn();
          }
          if(pct>=0.95&&!isCompleted(lesson.id)){
            doMarkAndQuiz();
          }
        }
        // Pause/play — pause the fallback timer
        if(d.event==='onPause'||d.event==='pause'){
          if(autoTimer){clearTimeout(autoTimer);timerRemaining-=(Date.now()-timerStart);autoTimer=null;}
        }
        if(d.event==='onPlay'||d.event==='play'){
          if(!autoTimer&&timerRemaining>0) startAutoTimer(timerRemaining);
        }
        // Video ended
        if(d.event==='onVideoEnd'||d.event==='ended'){
          if(!isCompleted(lesson.id)) doMarkAndQuiz();
        }
      }catch(ex){}
    }
    window.addEventListener('message', onBunnyMsg);

    // Fallback timer — unlock button after 80% of duration regardless
    var unlockTimer=setTimeout(function(){
      if(markBtn2&&!isCompleted(lesson.id)) unlockBtn();
    }, Math.round(totalSec*0.80)*1000);

    // Fallback auto-complete after 95% of duration — pauses with video
    var autoTimer=null;
    var timerStart=null;
    var timerRemaining=Math.round(totalSec*0.95)*1000;
    function startAutoTimer(remaining){
      timerStart=Date.now();
      autoTimer=setTimeout(function(){
        if(!isCompleted(lesson.id)) doMarkAndQuiz();
      }, remaining);
    }
    startAutoTimer(timerRemaining);

    return;
  }

  function unlockBtn(){
    if(!markBtn2||isCompleted(lesson.id)) return;
    markBtn2.disabled=false;
    markBtn2.textContent='Mark Complete ✓';
    markBtn2.style.background='var(--grad)';
    markBtn2.style.color='#fff';
    markBtn2.style.border='none';
    markBtn2.style.cursor='pointer';
    markBtn2.style.boxShadow='0 4px 14px rgba(255,45,120,.3)';
  }

  const video=document.getElementById("video");
  const source=document.getElementById("video-source");
  if(!video||!source)return;

  // ── UNIVERSAL VIDEO LOADER (HLS + MP4, all browsers/devices) ──
  var hlsInstance=null;
  function isHlsUrl(u){return /\.m3u8($|\?)/i.test(u||'');}
  function loadVideoSrc(src,resumeTime){
    if(hlsInstance){try{hlsInstance.destroy();}catch(e){} hlsInstance=null;}
    if(isHlsUrl(src)){
      if(video.canPlayType('application/vnd.apple.mpegurl')){
        // Safari / iOS: native HLS
        source.src=src; video.src=src; video.load();
      } else if(window.Hls && Hls.isSupported()){
        // Chrome / Firefox / Edge / Android: hls.js
        source.removeAttribute('src'); video.removeAttribute('src');
        hlsInstance=new Hls({maxBufferLength:30});
        hlsInstance.loadSource(src);
        hlsInstance.attachMedia(video);
        hlsInstance.on(Hls.Events.ERROR,function(ev,data){
          if(data&&data.fatal){
            if(data.type===Hls.ErrorTypes.NETWORK_ERROR){hlsInstance.startLoad();}
            else if(data.type===Hls.ErrorTypes.MEDIA_ERROR){hlsInstance.recoverMediaError();}
            else{try{hlsInstance.destroy();}catch(e){} source.src=src; video.load();}
          }
        });
      } else {
        // Very old browsers: last-resort direct assignment
        source.src=src; video.load();
      }
    } else {
      source.src=src; video.load();
    }
    if(resumeTime){
      video.addEventListener('loadedmetadata',function(){try{video.currentTime=resumeTime;}catch(e){}},{once:true});
    }
  }

  if(!source.src||source.src===window.location.href){
    loadVideoSrc(realSrc);
  }
  // Always reset to start — prevents browser resuming previous student's position
  video.addEventListener('loadedmetadata', function(){ video.currentTime=0; }, {once:true});

  wrapper.addEventListener("contextmenu",e=>e.preventDefault());
  video.addEventListener("dragstart",e=>e.preventDefault());

  const qualitySrcs=realSrc!==SAMPLE_VIDEO
    ?[{label:"1080p",src:realSrc},{label:"720p",src:realSrc},{label:"480p",src:realSrc}]
    :QUALITIES;

  const qBtns=document.getElementById("quality-buttons");
  if(qBtns){
    qBtns.innerHTML=qualitySrcs.map((q,i)=>
      `<button data-i="${i}" class="qbtn" style="border-radius:12px;padding:2px 8px;font-size:10px;border:none;cursor:pointer;font-weight:600;${i===0?'background:var(--grad);color:#fff':'background:rgba(255,255,255,.1);color:rgba(255,255,255,.7)'}">${q.label}</button>`
    ).join("");
    let qi=0;
    qBtns.querySelectorAll(".qbtn").forEach(btn=>{
      btn.addEventListener("click",()=>{
        const i=Number(btn.dataset.i);if(i===qi)return;
        const t=video.currentTime,playing=!video.paused;
        qi=i;loadVideoSrc(qualitySrcs[i].src,t);
        if(playing)video.play().catch(()=>{});
        qBtns.querySelectorAll(".qbtn").forEach(b=>{
          b.style.cssText=`border-radius:12px;padding:2px 8px;font-size:10px;border:none;cursor:pointer;font-weight:600;${Number(b.dataset.i)===i?'background:var(--grad);color:#fff':'background:rgba(255,255,255,.1);color:rgba(255,255,255,.7)'}`;
        });
      });
    });
  }

  const fsBtn=document.getElementById("fullscreen-btn");
  if(fsBtn){
    fsBtn.addEventListener("click",()=>{document.fullscreenElement?document.exitFullscreen():wrapper.requestFullscreen?.().catch(()=>{});});
    document.addEventListener("fullscreenchange",()=>{fsBtn.textContent=document.fullscreenElement?"Exit ⛶":"⛶";});
  }

  // ── FORENSIC WATERMARK ──────────────────────────────────────────────────────
  // Floats over entire video — visible on any screen recording or phone camera
  const wmContainer = document.getElementById("wm-container");
  const wm1 = document.getElementById("wm-1");
  const wm2 = document.getElementById("wm-2");
  const wmCorner = document.getElementById("wm-corner");

  if(wm1 && wm2 && wmCorner && wmContainer){
    const wmText = `${student.name}  •  ${student.email}`;
    const wmShort = student.email;

    // Update corner stamp every second with time
    function updateCorner(){
      const now = new Date();
      wmCorner.innerHTML = `${wmShort}<br>${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
    }
    updateCorner();
    setInterval(updateCorner, 1000);

    // Slowly drift watermarks across the screen like Hotstar/Netflix
    let pos1 = {x:15, y:20};
    let pos2 = {x:55, y:65};
    let vel1 = {x:0.04, y:0.025};
    let vel2 = {x:-0.035, y:0.04};

    function moveWatermarks(){
      const W = wmContainer.offsetWidth || 640;
      const H = wmContainer.offsetHeight || 360;
      const wPct = 35; // approx width % of watermark text
      const hPct = 6;

      // Move
      pos1.x += vel1.x; pos1.y += vel1.y;
      pos2.x += vel2.x; pos2.y += vel2.y;

      // Bounce off edges
      if(pos1.x <= 0 || pos1.x >= (100-wPct)) vel1.x *= -1;
      if(pos1.y <= 0 || pos1.y >= (100-hPct)) vel1.y *= -1;
      if(pos2.x <= 0 || pos2.x >= (100-wPct)) vel2.x *= -1;
      if(pos2.y <= 0 || pos2.y >= (100-hPct)) vel2.y *= -1;

      // Apply positions
      wm1.style.left = pos1.x + '%';
      wm1.style.top  = pos1.y + '%';
      wm2.style.left = pos2.x + '%';
      wm2.style.top  = pos2.y + '%';

      requestAnimationFrame(moveWatermarks);
    }

    // Set text
    wm1.textContent = wmText;
    wm2.textContent = wmText;

    // Randomise starting positions
    pos1 = {x: 10 + Math.random()*40, y: 10 + Math.random()*30};
    pos2 = {x: 40 + Math.random()*40, y: 50 + Math.random()*30};

    moveWatermarks();
  }

  const markBtn=document.getElementById("mark-complete-btn");
  markBtn.disabled=isCompleted(lesson.id);
  function markComplete(){
    if(isCompleted(lesson.id))return;
    markLessonComplete(lesson.id); 
    markBtn.disabled=true;
    markBtn.innerHTML=`<svg style="width:16px;height:16px" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> Completed`;
    markBtn.className="shrink-0 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold bg-green-50 text-green-600 border border-green-200 cursor-default transition";
    renderQuizCta(lesson, true);

    // Update right panel to show newly unlocked lesson
    const newStudent=loadStudents()[currentSession.studentId];
    const newUnlocked=newStudent?getUnlockedSet(newStudent):null;
    if(newUnlocked){
      // Refresh the mission list panel
      const nextLesson=ALL_LESSONS.find(l=>newUnlocked.has(l.order)&&!isCompleted(l.id));
      // Update right panel items
      document.querySelectorAll('[data-lesson-order]').forEach(function(el){
        const order=parseInt(el.dataset.lessonOrder);
        if(newUnlocked.has(order)){
          el.style.opacity='1';
          el.style.cursor='pointer';
        }
      });
    }

    // Quiz unlocked — student clicks Start Quiz button to open
    renderQuizCta(lesson, true);
    var chBtn2=document.getElementById('ch-btn');
    var chSub2=document.getElementById('ch-sub');
    if(chBtn2){
      chBtn2.disabled=false;
      chBtn2.style.background='var(--grad)';
      chBtn2.style.cursor='pointer';
      chBtn2.style.boxShadow='0 2px 14px rgba(255,45,120,.3)';
      chBtn2.style.opacity='1';
      chBtn2.textContent='⚡ Start Challenge';
    }
    if(chSub2) chSub2.textContent='Lesson complete — test what you learned.';

    if(currentSession?.role==="student"){
      const students=loadStudents();
      const s=students[currentSession.studentId];
      if(s){
        const unlocked=ALL_LESSONS.filter(l=>isUnlocked(l));
        const allDone=unlocked.every(l=>isCompleted(l.id));
        if(allDone&&unlocked.length>0){
          if(!s.completedAt){
            s.completedAt=new Date().toISOString();
            students[s.id].completedAt=s.completedAt;
            saveStudents(students);
          }
          const banner=document.createElement("div");
          banner.className="fixed inset-x-0 top-16 z-50 mx-4 rounded-2xl bg-green-50 border border-green-200 shadow-xl p-5 flex items-center gap-4";
          banner.innerHTML=`<svg class="w-8 h-8 text-green-500 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <div class="flex-1 min-w-0">
              <p class="font-display font-bold text-green-800">Course Complete!</p>
              <p class="text-xs text-green-600 mt-0.5">Congratulations! You will be automatically logged out after 24 hours.</p>
            </div>
            <button onclick="this.parentElement.remove()" class="text-green-400 hover:text-green-600 shrink-0 text-xl leading-none">&#215;</button>`;
          document.body.appendChild(banner);
          if(!localStorage.getItem("brokeneng_logout_"+s.id)){
            localStorage.setItem("brokeneng_logout_"+s.id,String(Date.now()+24*60*60*1000));
          }
        }
      }
    }
  }
  // Auto-complete at 95% for MP4
  video.addEventListener("pause",function(){
    if(autoTimer){clearTimeout(autoTimer);timerRemaining-=(Date.now()-timerStart);autoTimer=null;}
  });
  video.addEventListener("play",function(){
    if(!autoTimer&&timerRemaining>0&&!isCompleted(lesson.id)) startAutoTimer(timerRemaining);
  });
  video.addEventListener("timeupdate",function(){
    if(!video.duration) return;
    const pct=video.currentTime/video.duration;
    if(pct>=0.80&&markBtn&&!isCompleted(lesson.id)){
      markBtn.disabled=false;
      markBtn.textContent='Mark Complete ✓';
      markBtn.style.background='var(--grad)';
      markBtn.style.color='#fff';
      markBtn.style.border='none';
      markBtn.style.cursor='pointer';
      markBtn.style.boxShadow='0 4px 14px rgba(255,45,120,.3)';
    }
    if(pct>=0.95&&!isCompleted(lesson.id)) doMarkAndQuiz();
  });
  video.addEventListener("ended",function(){
    if(!isCompleted(lesson.id)) doMarkAndQuiz();
  });
}catch(e){console.warn("setupPlayer error:",e);}}

function renderQuizCta(lesson,completed){try{
  const el=document.getElementById("quiz-cta");
  if(!hasRealQuiz(lesson)){el.innerHTML='';return;}
  const lessonDone=completed||isCompleted(lesson.id);
  const quizLocked=currentSession?.role==="student"&&getLockedQuizzes(currentSession.studentId).includes(lesson.order);
  const base='panel-card';
  if(!lessonDone){
    el.innerHTML=`<div class="${base}" style="padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:16px;opacity:.6;margin-top:12px">
      <div>
        <p style="font-weight:600;color:var(--muted);font-size:14px">Class Quiz</p>
        <p style="font-size:12px;color:var(--muted);margin-top:2px">Complete this lesson to unlock the quiz.</p>
      </div>
      <span style="flex-shrink:0;border-radius:8px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);padding:6px 14px;font-size:12px;color:var(--muted)"><img src="data:image/png;base64,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" style="width:22px;height:22px;object-fit:contain;vertical-align:middle;filter:brightness(1.4) drop-shadow(0 0 3px rgba(255,255,255,.3))"/> Locked</span>
    </div>`;
  } else if(quizLocked){
    el.innerHTML=`<div class="${base}" style="padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:12px">
      <div>
        <p style="font-weight:700;color:#fff;font-size:14px;font-family:'Montserrat',sans-serif">Class Quiz</p>
        <p style="font-size:12px;color:#fbbf24;margin-top:2px">Quiz temporarily locked by your admin.</p>
      </div>
      <span style="flex-shrink:0;border-radius:8px;background:rgba(234,179,8,.1);border:1px solid rgba(234,179,8,.25);padding:6px 14px;font-size:12px;font-weight:600;color:#fbbf24"><img src="data:image/png;base64,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" style="width:22px;height:22px;object-fit:contain;vertical-align:middle;filter:brightness(1.4) drop-shadow(0 0 3px rgba(255,255,255,.3))"/> Admin Locked</span>
    </div>`;
  } else {
    el.innerHTML=`<div class="${base}" style="padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:12px">
      <div>
        <p style="font-weight:700;color:#fff;font-size:14px;font-family:'Montserrat',sans-serif">Class Quiz</p>
        <p style="font-size:12px;color:var(--muted2);margin-top:2px">Lesson complete — test what you learned.</p>
      </div>
      <button onclick="navigate('quiz',{lessonId:'${lesson.id}'})" style="flex-shrink:0;background:var(--grad);color:#fff;border:none;border-radius:8px;padding:8px 18px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(255,45,120,.3);font-family:'Montserrat',sans-serif">Start Quiz</button>
    </div>`;
  }
}catch(e){console.warn("renderQuizCta error:",e);}}
