/* topbar.js — extracted verbatim from the original single-file index.html.
   Source lines: 2129-2223, 2555-2581, 5714-5724
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
// ─── TOP BAR ─────────────────────────────────────────────────────────────────
function getNotifications(student){
  // Build simple notifications based on student state
  var notifs=[];
  var unlocked=getUnlockedSet(student);
  var newlyUnlocked=ALL_LESSONS.filter(function(l){return unlocked.has(l.order)&&!isCompleted(l.id);});
  if(newlyUnlocked.length>0){
    var nl=newlyUnlocked[0];
    notifs.push({id:'unlock-'+nl.order,icon:'🔓',text:'Day '+nl.order+' is unlocked — '+getLessonTitle(nl),time:'now'});
  }
  var{expired,daysLeft}=getValidity(student);
  if(!expired&&daysLeft!=null&&daysLeft<=3){
    notifs.push({id:'expiry',icon:'⏰',text:'Your access expires in '+daysLeft+' day'+(daysLeft===1?'':'s'),time:'now'});
  }
  var completedCount=ALL_LESSONS.filter(function(l){return isCompleted(l.id);}).length;
  if(completedCount>0&&completedCount%5===0){
    notifs.push({id:'milestone-'+completedCount,icon:'🎉',text:'You completed '+completedCount+' missions! Keep going.',time:'now'});
  }
  return notifs;
}

function topBarHtml(student){
  var notifs=getNotifications(student);
  var seenKey='brokeneng_notifseen_'+student.id;
  var seen=[];
  try{seen=JSON.parse(localStorage.getItem(seenKey)||'[]');}catch(e){}
  var unseenCount=notifs.filter(function(n){return seen.indexOf(n.id)===-1;}).length;

  return `
  <div class="top-bar">
    <div style="display:flex;align-items:center;gap:12px;min-width:0">
      <button onclick="openSidebar()" id="mob-menu-btn" style="padding:8px;border-radius:10px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);cursor:pointer;flex-shrink:0;display:none">
        <svg style="width:18px;height:18px;color:var(--muted2)" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>
      <div style="min-width:0">
        
        <p style="font-size:14px;font-weight:700;color:var(--text);font-family:'Montserrat',sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${student.name}</p>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;position:relative">
      <button id="notif-bell-btn" onclick="toggleNotifPanel(event)" style="position:relative;padding:8px;border-radius:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);cursor:pointer;display:flex;align-items:center;justify-content:center">
        <svg style="width:18px;height:18px;color:var(--muted2)" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
        ${unseenCount>0?'<span id="notif-dot" style="position:absolute;top:5px;right:5px;width:8px;height:8px;border-radius:50%;background:var(--g1);box-shadow:0 0 0 2px rgba(13,13,28,.9)"></span>':''}
      </button>
      <div id="notif-panel" style="display:none;position:absolute;top:48px;right:0;width:300px;max-width:80vw;background:rgba(20,20,32,.97);border:1px solid rgba(255,255,255,.1);border-radius:14px;backdrop-filter:blur(20px);box-shadow:0 12px 40px rgba(0,0,0,.5);z-index:200;overflow:hidden">
        <div style="padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.08);font-weight:700;font-size:13px;color:#fff">Notifications</div>
        <div style="max-height:320px;overflow-y:auto">
          ${notifs.length===0?'<div style="padding:24px 16px;text-align:center;color:var(--muted);font-size:12px">No notifications</div>':
            notifs.map(function(n){
              return '<div style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.05);display:flex;gap:10px;align-items:flex-start">'
                +'<span style="font-size:16px;flex-shrink:0">'+n.icon+'</span>'
                +'<div style="flex:1;min-width:0"><div style="font-size:12px;color:#fff;line-height:1.4">'+n.text+'</div>'
                +'<div style="font-size:10px;color:var(--muted);margin-top:2px">'+n.time+'</div></div>'
                +'</div>';
            }).join('')
          }
        </div>
      </div>
      <button onclick="navigate('profile')" style="border-radius:50%;overflow:hidden;border:2px solid rgba(255,45,120,.3);background:var(--grad);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;width:38px;height:38px">${avatarSmallHtml(student)}</button>
    </div>
  </div>`;
}

window.toggleNotifPanel=function(evt){
  evt.stopPropagation();
  var panel=document.getElementById('notif-panel');
  if(!panel) return;
  var isOpen=panel.style.display==='block';
  if(isOpen){
    panel.style.display='none';
  } else {
    panel.style.display='block';
    // Mark all current notifications as seen
    if(currentSession&&currentSession.studentId){
      var student=loadStudents()[currentSession.studentId];
      if(student){
        var notifs=getNotifications(student);
        var seenKey='brokeneng_notifseen_'+student.id;
        localStorage.setItem(seenKey, JSON.stringify(notifs.map(function(n){return n.id;})));
        var dot=document.getElementById('notif-dot');
        if(dot) dot.remove();
      }
    }
    // Close on outside click
    setTimeout(function(){
      document.addEventListener('click', function closeNotif(e){
        if(!panel.contains(e.target) && e.target.id!=='notif-bell-btn'){
          panel.style.display='none';
          document.removeEventListener('click', closeNotif);
        }
      });
    },10);
  }
};

function adminTopBar(tab){
  const tabs=[{id:'students',label:'Students'},{id:'progress',label:'Progress'},{id:'classes',label:'Classes & Videos'},{id:'quiz',label:'⚡ Quizzes'},{id:'images',label:'🖼 Images'},{id:'demo',label:'🎟 Demo Access'},{id:'settings',label:'Settings'}];
  return`<div class="admin-top-bar">
    <div style="display:flex;align-items:center;gap:12px">
      <img src="${getLogoSrc()}" style="height:34px;max-width:160px;object-fit:contain;display:block" onerror="this.style.display='none'"/>
      <div>
        <div style="font-family:'Montserrat',sans-serif;font-weight:800;font-size:14px;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent">${SITE_NAME}</div>
        <div style="font-size:9px;color:var(--muted);font-family:'JetBrains Mono',monospace;letter-spacing:.07em">VOICE OS</div>
      </div>
      <span class="pill pill-red" style="font-size:9px;letter-spacing:.08em;text-transform:uppercase;font-family:'JetBrains Mono',monospace">Admin</span>
      <span id="admin-maint-badge" style="display:${_maintenanceActive?'inline-flex':'none'};align-items:center;gap:5px;background:rgba(255,100,0,.15);border:1px solid rgba(255,100,0,.4);border-radius:6px;padding:3px 9px;font-size:10px;font-family:JetBrains Mono,monospace;color:#f97316;font-weight:700">🚧 MAINTENANCE ON</span>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      ${tabs.map(t=>`<button onclick="navigate('admin',{tab:'${t.id}'})"
        class="${tab===t.id?'btn-primary':'btn-ghost'}"
        style="padding:6px 12px;width:auto;font-size:11px;font-family:'Montserrat',sans-serif;white-space:nowrap">${t.label}</button>`).join('')}
    </div>
    <button onclick="logout()" style="font-size:12px;color:var(--muted);background:none;border:none;cursor:pointer;transition:color .18s;font-family:'JetBrains Mono',monospace" onmouseover="this.style.color='var(--g1)'" onmouseout="this.style.color='var(--muted)'">Sign out</button>
  </div>`;
}

function glassBtn(label,onclick,variant='ghost'){
  if(variant==='brand') return`<button onclick="${onclick}" style="padding:7px 14px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;background:var(--grad);color:#fff;border:1px solid rgba(255,255,255,.2);box-shadow:0 4px 14px rgba(255,45,120,.3),inset 0 1px 0 rgba(255,255,255,.2);transition:all .18s;font-family:'Montserrat',sans-serif">${label}</button>`;
  if(variant==='danger') return`<button onclick="${onclick}" style="padding:7px 14px;border-radius:10px;font-size:12px;font-weight:600;cursor:pointer;background:rgba(237,31,81,.12);color:var(--g1);border:1px solid rgba(237,31,81,.25);transition:all .18s">${label}</button>`;
  return`<button onclick="${onclick}" style="padding:7px 14px;border-radius:10px;font-size:12px;font-weight:600;cursor:pointer;background:rgba(255,255,255,.07);color:rgba(255,255,255,.8);border:1px solid rgba(255,255,255,.14);box-shadow:inset 0 1px 0 rgba(255,255,255,.1);transition:all .18s">${label}</button>`;
}

// ─── BOOT ─────────────────────────────────────────────────────────────────────
function setupTopBar(student){
  // Show mobile menu button on small screens
  const btn = document.getElementById("mob-menu-btn");
  if(btn) btn.style.display = window.innerWidth < 768 ? "flex" : "none";
  window.addEventListener("resize", ()=>{
    const b = document.getElementById("mob-menu-btn");
    if(b) b.style.display = window.innerWidth < 768 ? "flex" : "none";
  }, {once:true});
}
