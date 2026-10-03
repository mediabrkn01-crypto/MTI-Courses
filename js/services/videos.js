/* videos.js — extracted verbatim from the original single-file index.html.
   Source lines: 876-887, 896-941, 2509-2514
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
async function sbSaveVideos(videos){
  try{
    const{error}=await _sb.from('course_config').upsert({
      id:'videos',
      data: videos,
      updated_at: new Date().toISOString()
    },{onConflict:'id'});
    if(error) console.warn('Supabase videos save error:',error.message);
    else console.log('Videos synced to Supabase');
  }catch(e){console.warn('Supabase error:',e);}
}

// ── Course videos/thumbnails cache ──
// The course_config 'videos' row holds every class's video link, text and thumbnail
// (thumbnails are base64, ~4.5 MB in total). It is too big for localStorage, so it was
// re-downloaded on every visit — up to three times per login — and the dashboard was
// drawn before it arrived and never refreshed. Now:
//  • one shared request at a time (no duplicates);
//  • the row is cached in IndexedDB and shown instantly on the next visit;
//  • a ~100-byte updated_at check skips the download when nothing changed
//    (every app writer — sbSaveVideos, Classes & Videos, Images — sets updated_at);
//  • when data arrives or changes, the open dashboard / course page re-renders.
var _videoStamp=null, _vidLoadPromise=null;
var _VidIDB={
  _db:null,
  open:function(){
    var self=this;
    if(self._db) return self._db;
    self._db=new Promise(function(res,rej){
      try{
        var r=indexedDB.open('brokeneng-cache',1);
        r.onupgradeneeded=function(){ r.result.createObjectStore('kv'); };
        r.onsuccess=function(){ res(r.result); };
        r.onerror=function(){ rej(r.error); };
      }catch(e){ rej(e); }
    });
    return self._db;
  },
  get:function(key){
    return this.open().then(function(db){ return new Promise(function(res){
      try{ var q=db.transaction('kv','readonly').objectStore('kv').get(key); q.onsuccess=function(){res(q.result||null);}; q.onerror=function(){res(null);}; }catch(e){ res(null); }
    }); }).catch(function(){ return null; });
  },
  set:function(key,val){
    return this.open().then(function(db){ try{ db.transaction('kv','readwrite').objectStore('kv').put(val,key); }catch(e){} }).catch(function(){});
  }
};
function _videosChanged(){
  refreshLessonThumbs();
  // Re-draw screens that show thumbnails/titles, keeping the scroll position.
  try{
    if(typeof currentSession==='undefined'||!currentSession||currentSession.role==='admin') return;
    var scr=(history.state&&history.state.screen)||'';
    var fn=scr==='dashboard'?window.renderDashboard:scr==='courses'?window.renderMyCourses:null;
    if(typeof fn!=='function'||!document.getElementById('main-content')) return;
    var y=window.scrollY;
    fn();
    window.scrollTo(0,y);
  }catch(e){}
}
// Instant start from the cache (no network) — only if nothing newer is in memory yet.
var _vidCacheReady=_VidIDB.get('videos').then(function(c){
  if(c&&c.data&&!Object.keys(_videoData).length){
    _videoData=c.data; _videoStamp=c.stamp||null;
    _videosChanged();
  }
});
async function sbLoadVideos(){
  if(_vidLoadPromise) return _vidLoadPromise;
  _vidLoadPromise=(async function(){
    try{
      await _vidCacheReady;
      // Cheap freshness check first; download the full row only when it changed.
      if(_videoStamp&&Object.keys(_videoData).length){
        var st=await _sb.from('course_config').select('updated_at').eq('id','videos').maybeSingle();
        if(!st.error&&st.data&&st.data.updated_at===_videoStamp) return;
      }
      const{data,error}=await _sb.from('course_config').select('data,updated_at').eq('id','videos').maybeSingle();
      if(error||!data||!data.data) return;
      _videoData=data.data; _videoStamp=data.updated_at||null;
      _VidIDB.set('videos',{data:data.data,stamp:_videoStamp});
      _videosChanged();
    }catch(e){console.warn('Supabase load videos error:',e);}
  })().finally(function(){ _vidLoadPromise=null; });
  return _vidLoadPromise;
}

// Re-sync course data whenever the app comes back to foreground (long-open tabs / installed PWAs)
var _lastVisible=Date.now();
document.addEventListener('visibilitychange',function(){
  if(document.hidden){ _lastVisible=Date.now(); return; }
  // Only re-sync if tab was actually hidden for >5 seconds (not mobile scroll jank)
  if(Date.now()-_lastVisible>5000&&currentSession){
    waitForSb(8000).then(function(ok){if(ok)sbLoadVideos().catch(function(){});});
  }
});

// After videos sync, update any visible thumbs/images without re-rendering
function refreshLessonThumbs(){
  try{
    // Update right panel thumbnails (mp-item images)
    document.querySelectorAll('[data-lesson-order]').forEach(function(el){
      var order=parseInt(el.dataset.lessonOrder);
      var v=loadVideos()[order]||{};
      if(v.thumb&&el.tagName==='IMG') el.src=v.thumb;
    });
    // Update video player thumb if showing placeholder
    var playerWrap=document.getElementById('player-wrapper');
    if(playerWrap){
      var lessonOrder=playerWrap.dataset.lessonOrder;
      if(lessonOrder){
        var v=loadVideos()[lessonOrder]||{};
        if(v.src){
          // Re-render lesson to get the video
          if(currentSession&&currentSession.lessonId){
            if(typeof renderLesson==='function') renderLesson(currentSession.lessonId);
          }
        }
      }
    }
  }catch(e){}
}

// ─── ADMIN PANEL ─────────────────────────────────────────────────────────────
function loadVideos(){if(Object.keys(_videoData).length>0)return _videoData;try{return JSON.parse(localStorage.getItem("brokeneng_videos")||"{}");}catch{return{};}}
function saveVideos(v){
  localStorage.setItem("brokeneng_videos",JSON.stringify(v));
  if(typeof _sb!=="undefined") sbSaveVideos(v);
}

// Get admin-set title for a lesson (falls back to lesson.title)
function getLessonTitle(lesson){
  if(!lesson) return '';
  var vm=loadVideos()[lesson.order]||{};
  return vm.panelTitle||vm.title||lesson.title;
}
