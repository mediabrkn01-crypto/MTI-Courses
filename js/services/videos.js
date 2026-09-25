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

async function sbLoadVideos(){
  try{
    const{data,error}=await _sb.from('course_config').select('data').eq('id','videos').single();
    if(error||!data||!data.data) return;
    _videoData=data.data;
    try{localStorage.setItem('brokeneng_videos',JSON.stringify(data.data));}catch(e){}
    refreshLessonThumbs();
  }catch(e){console.warn('Supabase load videos error:',e);}
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
