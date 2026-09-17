/* router.js — extracted verbatim from the original single-file index.html.
   Source lines: 1831-1906, 6559-6567
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
var ASYNC_SCREENS=['dashboard','courses','lesson'];
var _fromPop=false;
function navigate(screen,params){
  document.body.style.overflow=''; // restore scroll when leaving lesson
  if(ASYNC_SCREENS.indexOf(screen)!==-1) showAppLoader();
  // Push into browser history so phone back button navigates in-app instead of closing
  if(!_fromPop){
    try{history.pushState({screen:screen,params:params||{}},'','#'+screen);}catch(e){}
  }
  render(screen,params||{});
  window.scrollTo(0,0);
  // Render is now instant — hide loader on next paint
  requestAnimationFrame(function(){ requestAnimationFrame(hideAppLoader); });
}
window.addEventListener('popstate',function(e){
  _fromPop=true;
  var target,targetParams;

  if(e.state&&e.state.screen){
    target=e.state.screen;
    targetParams=e.state.params||{};
  } else {
    // Safari sometimes loses state — fall back to hash or dashboard
    var hash=(location.hash||'').replace('#','');
    var validScreens=['dashboard','courses','lesson','wordvault','achievements','login'];
    if(hash&&validScreens.indexOf(hash)>=0){
      target=hash; targetParams={};
    } else if(currentSession){
      target='dashboard'; targetParams={};
    } else {
      target='login'; targetParams={};
    }
  }

  // Guard: authenticated student must never popstate-navigate to login.
  // This is the last line of defence against the iOS swipe-back / Android back-button
  // race during the boot splash animation.
  if((target==='login'||target==='admin-login')&&currentSession&&currentSession.role==='student'){
    try{ history.replaceState({screen:'dashboard',params:{}},'','#dashboard'); }catch(er){}
    target='dashboard'; targetParams={};
  }

  navigate(target,targetParams);
  _fromPop=false;
});
function render(screen,params){
  if(screen==="login")        { renderLogin(); return; }
  if(screen==="admin-login")  { renderAdminLogin(); return; }
  if(screen==="admin")        { renderAdmin(params.tab||"students"); return; }
  if(screen==="admin-student"){ renderAdminStudent(params.id); return; }
  if(screen==="admin-progress-student"){ renderAdminProgressStudent(params.id); return; }
  if(screen==="dashboard"){
    if(typeof _sb!=="undefined"){
      renderDashboard(); hideAppLoader(); if(!_videosBootLoaded){sbLoadVideos().catch(function(){});}else{_videosBootLoaded=false;}
    } else { renderDashboard(); hideAppLoader(); }
    return;
  }
  if(screen==="courses"){
    if(typeof _sb!=="undefined"){
      renderMyCourses(); hideAppLoader(); if(!_videosBootLoaded){sbLoadVideos().catch(function(){});}else{_videosBootLoaded=false;}
    } else { renderMyCourses(); hideAppLoader(); }
    return;
  }
  if(screen==="quizzes")      { renderQuizzes(); return; }
  if(screen==="achievements") { renderAchievements(); return; }
  if(screen==="wordvault")    { renderWordVault(); return; }
  if(screen==="profile")      { renderProfile(); return; }
  if(screen==="lesson"){
    if(typeof _sb!=="undefined"){
      // If video data already in memory — render immediately, no flash
      if(Object.keys(_videoData).length>0){
        renderLesson(params.id); hideAppLoader();
      } else {
        // No video data yet — show skeleton in player area while fetching, then render once
        showAppLoader();
        sbLoadVideos().catch(function(){}).finally(function(){
          renderLesson(params.id); hideAppLoader();
        });
      }
    } else {
      renderLesson(params.id); hideAppLoader();
    }
    return;
  }
  if(screen==="quiz")         { renderQuiz(params.lessonId); return; }
  if(screen==="live")         { renderLive(); return; }
}


window.navigateToPhase=function(phaseIndex){
  navigate('courses');
  // After courses page renders, scroll to the correct phase
  setTimeout(function(){
    var el=document.getElementById('phase-'+phaseIndex);
    if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
  },300);
};
