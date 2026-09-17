/* storage.js — extracted verbatim from the original single-file index.html.
   Source lines: 1323-1339, 1611-1676, 2515-2516
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
// ─── ADMIN SYSTEM ─────────────────────────────────────────────────────────────
function loadStudents(){
  var base;
  try{base=JSON.parse(localStorage.getItem("brokeneng_students")||"{}");}catch(e){base={};}
  // Inject the synthetic, in-memory demo student so demo sessions can render the
  // real course UI without creating a permanent student record. Never persisted.
  if(typeof _demoStudent!=='undefined'&&_demoStudent){ base=Object.assign({},base); base[_demoStudent.id]=_demoStudent; }
  return base;
}
function saveStudents(s){
  localStorage.setItem("brokeneng_students",JSON.stringify(s));
  // Sync each student to Supabase
  if(typeof _sb!=='undefined'){
    Object.values(s).forEach(function(st){ sbSaveStudent(st); });
  }
}
function genId(){return"s_"+Math.random().toString(36).slice(2,9);}
// ─── PROGRESS STORE (persisted per student in localStorage) ──────────────────
function getProgressKey(sid){return "brokeneng_progress_"+sid;}
function loadProgress(sid){
  // Supabase is the ONLY source of truth — _progressCache populated at login/refresh
  if(_progressCache[sid]) return _progressCache[sid];
  // Fallback: localStorage (same device, before Supabase loads) — never used as primary source
  try{
    var raw=JSON.parse(localStorage.getItem(getProgressKey(sid))||'[]');
    var validCore=new Set(ALL_LESSONS.map(function(l){return l.id;}));
    var validWV=typeof WV_DATA!=='undefined'?new Set(WV_DATA.map(function(f){return f.id;})):new Set();
    var fromLocal=new Set(raw.filter(function(id){return validCore.has(id)||validWV.has(id);}));
    return fromLocal;
  }
  catch{return new Set();}
}
function saveProgress(sid,setObj){
  _progressCache[sid]=setObj; // keep memory in sync
  try{localStorage.setItem(getProgressKey(sid),JSON.stringify([...setObj]));}catch(e){}
}
// Returns true if lesson is completed by current student
function isCompleted(lessonId){
  if(!currentSession?.studentId) return false;
  return loadProgress(currentSession.studentId).has(lessonId);
}
// Mark a lesson complete for current student
function markLessonComplete(lessonId){
  if(!currentSession?.studentId) return;
  const p=loadProgress(currentSession.studentId);
  p.add(lessonId);
  saveProgress(currentSession.studentId,p);
  // Sync to Supabase
  sbSaveProgress(currentSession.studentId, lessonId);
}

// ─── PROFILE PHOTO ────────────────────────────────────────────────────────────
function getPhoto(sid){return localStorage.getItem("brokeneng_photo_"+sid)||null;}
function savePhoto(sid,dataUrl){try{localStorage.setItem("brokeneng_photo_"+sid,dataUrl);}catch(e){console.warn("Photo storage error",e);}}


// ── PROFILE PHOTO UPLOAD ─────────────────────────────────────────────────────
window.handlePhotoUpload=function(evt,studentId){
  var file=evt.target.files&&evt.target.files[0];
  if(!file) return;
  var reader=new FileReader();
  reader.onload=function(e){
    var img=new Image();
    img.onload=function(){
      // Resize to max 300px square to keep localStorage small
      var size=300;
      var canvas=document.createElement('canvas');
      canvas.width=size;canvas.height=size;
      var ctx=canvas.getContext('2d');
      var min=Math.min(img.width,img.height);
      var sx=(img.width-min)/2, sy=(img.height-min)/2;
      ctx.drawImage(img,sx,sy,min,min,0,0,size,size);
      var dataUrl=canvas.toDataURL('image/jpeg',0.85);
      savePhoto(studentId,dataUrl);
      navigate('profile'); // re-render to show new photo
    };
    img.onerror=function(){alert('Could not read that image. Try another one.');};
    img.src=e.target.result;
  };
  reader.onerror=function(){alert('Could not read the file.');};
  reader.readAsDataURL(file);
};

function getLockedVideos(sid){try{return JSON.parse(localStorage.getItem("brokeneng_locked_"+sid)||"[]");}catch{return[];}}
function saveLockedVideos(sid,arr){localStorage.setItem("brokeneng_locked_"+sid,JSON.stringify(arr));}
