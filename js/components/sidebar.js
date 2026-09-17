/* sidebar.js — extracted verbatim from the original single-file index.html.
   Source lines: 1960-2128
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
// ─── SIDEBAR HTML ────────────────────────────────────────────────────────────
function mobileNavHtml(active){
  var ic={
    dashboard:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
    courses:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20"/>',
    wordvault:'<rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0"/><path d="M12 18v3.5"/>',
    more:'<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>'
  };
  const items=[
    {id:"dashboard",label:"Home",action:"navigate('dashboard')"},
    {id:"courses",label:"Course",action:"navigate('courses')"},
    {id:"wordvault",label:"Workshop",action:"navigate('wordvault')"},
    {id:"more",label:"More",action:"openSidebar()"},
  ];
  return `<div style="display:none;position:fixed;bottom:0;left:0;right:0;z-index:200;background:rgba(13,13,28,.94);border-top:1px solid rgba(255,255,255,.08);backdrop-filter:blur(30px);-webkit-backdrop-filter:blur(30px);padding:6px 6px calc(8px + env(safe-area-inset-bottom))" id="mob-nav">
    <div style="display:flex;align-items:center;justify-content:space-around">
      ${items.map(it=>`<button onclick="${it.action}" aria-label="${it.label}" style="display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 8px;border-radius:12px;border:none;background:${active===it.id?'rgba(255,45,120,.12)':'transparent'};cursor:pointer;min-width:60px;transition:all .15s">
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="${active===it.id?'var(--g1)':'var(--muted)'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ic[it.id]}</svg>
        <span style="font-size:9.5px;font-weight:${active===it.id?'700':'500'};color:${active===it.id?'var(--g1)':'var(--muted)'};font-family:'Montserrat',sans-serif;letter-spacing:.02em">${it.label}</span>
      </button>`).join('')}
    </div>
  </div>`;
}

function sidebarHtml(active){
  const stu=currentSession?.studentId?loadStudents()[currentSession.studentId]:null;
  const avLetter=stu?stu.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2):'?';
  const uName=stu?stu.name:'';
  const progress=stu?loadProgress(stu.id):new Set();
  const completedCount=ALL_LESSONS.filter(l=>progress.has(l.id)).length;
  const pct=Math.round(completedCount/ALL_LESSONS.length*100);
  const vsArc=163.4*(1-pct/100);
  const earnedBadges=BADGES.filter(b=>b.check&&b.check({completed:completedCount,quizzes:0})).length;

  return `
  <div id="sidebar" onpointerenter="sbHoverExpand()" onpointerleave="sbHoverCollapse()" onfocusin="sbHoverExpand()" onfocusout="sbHoverCollapse()">
    <!-- BRAND -->
    <div class="sb-brand">
      <div class="sb-logo" onclick="closeSidebar();navigate('dashboard')" style="cursor:pointer;display:flex;align-items:center;min-width:0">
        <img class="sb-logo-img" src="${getLogoSrc()}" alt="Broken English" onerror="this.style.display='none'"/>
      </div>
      <button class="sb-toggle" onclick="toggleSidebarCollapse()" aria-label="Toggle navigation sidebar" title="Toggle sidebar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></svg>
      </button>
    </div>

    <!-- VOICE SCORE WIDGET -->
    <div class="sb-voice" data-tip="Voice Score ${pct}%">
      <div class="sb-voice-ring" style="width:36px;height:36px;position:relative;flex-shrink:0">
        <svg width="36" height="36" viewBox="0 0 36 36" style="position:absolute;inset:0">
          <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="3"/>
          <circle cx="18" cy="18" r="14" fill="none" stroke="url(#sbvgr)" stroke-width="3"
            stroke-linecap="round" stroke-dasharray="87.96" stroke-dashoffset="${87.96*(1-pct/100)}"
            transform="rotate(-90 18 18)"/>
          <defs><linearGradient id="sbvgr" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#FF2D78"/><stop offset="100%" stop-color="#FF8C00"/>
          </linearGradient></defs>
        </svg>
      </div>
      <div class="sb-voice-info">
        <div class="sv-label">VOICE SCORE</div>
        <div class="sv-val">${pct}%</div>
      </div>
    </div>

    <!-- CURRENT LESSON BANNER -->
    ${(function(){
      var al=typeof activeLesson!=="undefined"?activeLesson:null;
      if(!al) return "";
      var vm=loadVideos()[al.order]||{};
      var thumb=vm.thumb||al.thumbnailUrl||"";
      return "<div class=\"sb-nowplaying\" style=\"margin:10px 12px;border-radius:12px;overflow:hidden;position:relative;height:90px;cursor:pointer;border:1px solid rgba(255,255,255,.1)\" onclick=\"navigate(\'lesson\',{id:\'"+al.id+"\'})\">"+
        "<img src=\""+thumb+"\" style=\"width:100%;height:100%;object-fit:cover\" onerror=\"this.parentElement.style.display=\'none\'\"/>"+
        "<div style=\"position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.8) 0%,transparent 60%)\"></div>"+
        "<div style=\"position:absolute;bottom:6px;left:8px;right:8px\">"+
          "<div style=\"font-size:8px;color:rgba(255,255,255,.6);font-family:JetBrains Mono,monospace;text-transform:uppercase;letter-spacing:.07em\">NOW PLAYING</div>"+
          "<div style=\"font-size:11px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis\">"+((loadVideos()[al.order]||{}).panelTitle||(loadVideos()[al.order]||{}).title||al.title)+"</div>"+
        "</div>"+
      "</div>";
    })()}

    <!-- NAV -->
    <nav class="sb-nav">
      <div class="sb-sec">Core</div>
      <div class="sb-item ${active==='dashboard'?'active':''}" data-tip="Dashboard" title="Dashboard" onclick="closeSidebar();navigate('dashboard')">
        <span class="sb-icon"><svg class="nav-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg></span><div class="sb-lbl">Dashboard</div>
      </div>
      <div class="sb-item ${active==='courses'?'active':''}" data-tip="The Course" title="The Course" onclick="closeSidebar();navigate('courses')">
        <span class="sb-icon"><svg class="nav-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20"/></svg></span><div class="sb-lbl">The Course</div>
      </div>
      <div class="sb-item ${active==='wordvault'?'active':''}" data-tip="Pronunciation Workshop" title="Pronunciation Workshop" onclick="closeSidebar();navigate('wordvault')">
        <span class="sb-icon"><svg class="nav-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0"/><path d="M12 18v3.5"/></svg></span><div class="sb-lbl">Pronunciation Workshop</div>
      </div>
      <div class="sb-item ${active==='live'?'active':''}" data-tip="Live With Sreekanth" title="Live With Sreekanth" onclick="closeSidebar();navigateLive(${completedCount})">
        <span class="sb-icon"><svg class="nav-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6" width="13" height="12" rx="2.5"/><path d="m16 10 5-3v10l-5-3z"/></svg></span><div class="sb-lbl">Live With Sreekanth</div>
        ${(completedCount+(typeof WV_DATA!=='undefined'?WV_DATA.filter(function(f){return isCompleted(f.id);}).length:0))>=30?'':'<span class="sb-lock-ic"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></span>'}
      </div>
      <div class="sb-sec">You</div>
      <div class="sb-item ${active==='achievements'?'active':''}" data-tip="Achievements" title="Achievements" onclick="closeSidebar();navigate('achievements')">
        <span class="sb-icon"><svg class="nav-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M7 6H4.5a2.5 2.5 0 0 0 3 4.5"/><path d="M17 6h2.5a2.5 2.5 0 0 1-3 4.5"/><path d="M9 20h6"/><path d="M12 13v7"/></svg></span><div class="sb-lbl">Achievements</div>
        ${(function(){
          var earnedNow = BADGES.filter(function(b){return b.check&&b.check({completed:completedCount,quizzes:0});}).map(function(b){return b.id;});
          var seenKey = stu ? 'brokeneng_badgeseen_'+stu.id : null;
          var seen = [];
          if(seenKey){ try{ seen = JSON.parse(localStorage.getItem(seenKey)||'[]'); }catch(e){} }
          var newCount = earnedNow.filter(function(id){return seen.indexOf(id)===-1;}).length;
          return newCount>0 ? '<div class="sb-bdg">'+newCount+'</div>' : '';
        })()}
      </div>
    </nav>

    <!-- FOOTER USER -->
    <div class="sb-foot">
      <div class="sb-user" data-tip="${uName||'Profile'}" onclick="closeSidebar();navigate('profile')">
        <div style="overflow:hidden;display:flex;align-items:center;justify-content:center;flex-shrink:0">${stu?avatarSmallHtml(stu):'<div style=\"width:32px;height:32px;border-radius:50%;background:var(--grad);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;color:#fff;flex-shrink:0\">?</div>'}</div>
        <div class="sb-uname" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:600;color:var(--text)">${uName}</div>
        <div class="sb-out" onclick="event.stopPropagation();logout()" title="Sign out" style="color:var(--muted);cursor:pointer;font-size:16px;flex-shrink:0;padding:4px;transition:color .15s" onmouseover="this.style.color='var(--g1)'" onmouseout="this.style.color='var(--muted)'">⇥</div>
      </div>
    </div>
  </div>
  <div id="sidebar-overlay" onclick="closeSidebar()"></div>
  ${mobileNavHtml(active)}`;
}

function closeSidebar(){
  const sb=document.getElementById("sidebar");
  const ov=document.getElementById("sidebar-overlay");
  if(sb){sb.classList.remove("open");}
  if(ov){ov.classList.remove("open");ov.style.display="";}
}
// Desktop collapsible sidebar — preference in localStorage, default COLLAPSED.
function applySidebarPref(){
  var collapsed=true;
  try{ var v=localStorage.getItem('brokeneng_sidebar_state'); if(v==='expanded') collapsed=false; }catch(e){}
  document.documentElement.classList.toggle('sb-collapsed', collapsed);
}
function toggleSidebarCollapse(){
  var el=document.documentElement;
  var nowCollapsed=!el.classList.contains('sb-collapsed');
  el.classList.toggle('sb-collapsed', nowCollapsed);
  try{ localStorage.setItem('brokeneng_sidebar_state', nowCollapsed?'collapsed':'expanded'); }catch(e){}
}
// Desktop sidebar hover expand/collapse — pointer devices only, no mobile
var _sbHoverT=null;
function _sbIsPointer(){return window.matchMedia('(hover:hover) and (pointer:fine)').matches;}
function sbHoverExpand(){
  if(!_sbIsPointer())return;
  clearTimeout(_sbHoverT);
  document.documentElement.classList.remove('sb-collapsed');
}
function sbHoverCollapse(){
  if(!_sbIsPointer())return;
  clearTimeout(_sbHoverT);
  _sbHoverT=setTimeout(function(){
    var sb=document.getElementById('sidebar');
    if(sb&&sb.contains(document.activeElement))return; // keep open for keyboard nav
    document.documentElement.classList.add('sb-collapsed');
  },200);
}
applySidebarPref();
// Escape closes the mobile drawer
document.addEventListener('keydown', function(e){ if(e.key==='Escape'){ var sb=document.getElementById('sidebar'); if(sb&&sb.classList.contains('open')) closeSidebar(); } });
function openSidebar(){
  const sb=document.getElementById("sidebar");
  const ov=document.getElementById("sidebar-overlay");
  if(sb){sb.classList.add("open");}
  if(ov){ov.classList.add("open");ov.style.display="block";}
}
