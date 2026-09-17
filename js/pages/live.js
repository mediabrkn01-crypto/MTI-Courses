/* live.js — extracted verbatim from the original single-file index.html.
   Source lines: 1907-1959
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
function navigateLive(completedCount){
  var wvCompleted=typeof WV_DATA!=='undefined'?WV_DATA.filter(function(f){return isCompleted(f.id);}).length:0;
  var totalDone=completedCount+wvCompleted;
  var coreLeft=Math.max(0,20-completedCount);
  var wvLeft=Math.max(0,10-wvCompleted);
  if(totalDone<30){
    var msg=document.createElement('div');
    msg.className='modal-lock';
    msg.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;background:rgba(13,13,28,.97);border:1px solid rgba(255,45,120,.3);border-radius:16px;padding:28px 32px;max-width:340px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.5)';
    var remaining='';
    if(coreLeft>0) remaining+='<div style="font-size:12px;color:rgba(255,255,255,.5);margin-bottom:4px">\u{1F4DA} '+coreLeft+' core class'+(coreLeft>1?'es':'')+' remaining</div>';
    if(wvLeft>0) remaining+='<div style="font-size:12px;color:rgba(255,255,255,.5);margin-bottom:4px">\u{1F50A} '+wvLeft+' Pronunciation Workshop video'+(wvLeft>1?'s':'')+' remaining</div>';
    msg.innerHTML='<div style="font-size:32px;margin-bottom:12px"><img src="data:image/png;base64,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" style="width:22px;height:22px;object-fit:contain;vertical-align:middle;filter:brightness(1.4) drop-shadow(0 0 3px rgba(255,255,255,.3))"/></div>'
      +'<div style="font-family:Montserrat,sans-serif;font-weight:800;font-size:18px;color:#fff;margin-bottom:8px">Live With Sreekanth</div>'
      +'<div style="font-size:13px;color:rgba(255,255,255,.6);line-height:1.6;margin-bottom:12px">Complete all 30 classes to unlock live sessions.</div>'
      +remaining
      +'<div style="font-size:11px;color:var(--g1);font-weight:700;margin:12px 0">'+totalDone+'/30 complete</div>'
      +'<button onclick="document.querySelector(\'.modal-lock\').remove()" class="btn-primary" style="width:auto;padding:10px 24px">Got it</button>';
    document.body.appendChild(msg);
    msg.addEventListener('click',function(e){if(e.target===msg)msg.remove();});
    return;
  }
  navigate('live');
}

function renderLive(){
  if(!_viewGuardOk()){navigate('login');return;}
  var student=loadStudents()[currentSession.studentId];
  if(!student){logout();return;}
  var sessions=JSON.parse(localStorage.getItem('brokeneng_live_sessions')||'[]');
  var sessionsHtml='';
  if(sessions.length===0){
    sessionsHtml='<div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:24px;text-align:center;color:var(--muted);font-size:13px">No live sessions scheduled yet. Check back soon!</div>';
  } else {
    sessionsHtml=sessions.map(function(s){
      return '<div style="background:rgba(255,45,120,.06);border:1px solid rgba(255,45,120,.15);border-radius:14px;padding:20px;margin-bottom:12px">'
        +'<div style="font-family:Montserrat,sans-serif;font-weight:800;font-size:16px;color:#fff;margin-bottom:4px">'+s.title+'</div>'
        +'<div style="font-size:13px;color:var(--muted);margin-bottom:12px">'+s.date+'</div>'
        +(s.link?'<a href="'+s.link+'" target="_blank" style="display:inline-block;background:var(--grad);border-radius:8px;color:#fff;font-size:12px;font-weight:700;padding:8px 18px;text-decoration:none;font-family:Montserrat,sans-serif">Register \u2192</a>':'<span style="font-size:12px;color:var(--muted);font-style:italic">Meeting link coming soon</span>')
        +'</div>';
    }).join('');
  }
  app.innerHTML=sidebarHtml('live')
    +'<div id="main-content">'
    +topBarHtml(student)
    +mobileNavHtml('live')
    +'<div style="padding:28px 32px 80px">'
    +'<h1 style="font-family:Montserrat,sans-serif;font-weight:800;font-size:28px;color:#fff;margin-bottom:4px">Live With Sreekanth</h1>'
    +'<p style="font-size:14px;color:var(--muted);margin-bottom:28px">Join exclusive live sessions directly with Sreekanth.</p>'
    +sessionsHtml
    +'</div></div>';
}
