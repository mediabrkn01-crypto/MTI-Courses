/* protection.js — extracted verbatim from the original single-file index.html.
   Source lines: 584-621
   NOT an ES module: globals stay on `window`. */
(function(){
  // Note: F12/DevTools/right-click blocking removed — not real security.
  // Real protection is via Supabase Auth + server-authoritative access checks.
  // Kept: drag/PiP/tab-blur as harmless deterrents only.

  // 3. Block text selection on video areas
  document.addEventListener('selectstart',e=>{
    var _t=e.target; if(!_t||!_t.closest)return;
    if(_t.closest('#player-wrapper')||_t.closest('#yt-player')){
      e.preventDefault();
    }
  });

  // 4. Blur video when tab is hidden (blocks most screen recorders that need focus)
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){
      document.body.classList.add('tab-hidden');
    } else {
      document.body.classList.remove('tab-hidden');
    }
  });

  // 5. Detect picture-in-picture (common screen recording method)
  document.addEventListener('enterpictureinpicture',e=>{
    e.target.pause?.();
    e.target.requestFullscreen?.().catch(()=>{});
  },true);

  // 6. Block drag of video/images
  document.addEventListener('dragstart',e=>{
    if(e.target.tagName==='VIDEO'||e.target.tagName==='IMG'||e.target.tagName==='IFRAME'){
      e.preventDefault();
    }
  });

  // DevTools detection removed — breaks legitimate users (accessibility tools,
  // browser extensions) and provides no real security. Authorization is server-side.
})();
