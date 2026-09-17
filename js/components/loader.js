/* loader.js — extracted verbatim from the original single-file index.html.
   Source lines: 1819-1830
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
function showAppLoader(){
  var ov=document.getElementById('app-loader');
  if(!ov)return;
  ov.style.display='flex';
  requestAnimationFrame(function(){ ov.style.opacity='1'; });
}
function hideAppLoader(){
  var ov=document.getElementById('app-loader');
  if(!ov)return;
  ov.style.opacity='0';
  setTimeout(function(){ ov.style.display='none'; },120);
}
