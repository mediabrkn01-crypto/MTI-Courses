/* admin-ui.js — ADMIN app only (admin.html).
   Admin top bar, admin design-system helpers and the Students table helpers.
   Moved out of js/components/topbar.js and js/utils/formatting.js so the
   student app no longer ships admin UI code. */
function adminTopBar(tab){
  const tabs=[{id:'students',label:'Students'},{id:'progress',label:'Progress'},{id:'classes',label:'Classes & Videos'},{id:'quiz',label:'Quizzes'},{id:'images',label:'Images'},{id:'demo',label:'Demo Access'},{id:'settings',label:'Settings'}];
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
        class="tab-glass${tab===t.id?' active':''}"
        style="padding:7px 14px;font-size:12px;font-family:'Montserrat',sans-serif">${t.label}</button>`).join('')}
    </div>
    <button onclick="adminLogout()" style="font-size:12px;color:var(--muted);background:none;border:none;cursor:pointer;transition:color .18s;font-family:'JetBrains Mono',monospace" onmouseover="this.style.color='var(--g1)'" onmouseout="this.style.color='var(--muted)'">Sign out</button>
  </div>`;
}

function glassBtn(label,onclick,variant='ghost'){
  if(variant==='brand') return`<button onclick="${onclick}" style="padding:7px 14px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;background:var(--grad);color:#fff;border:1px solid rgba(255,255,255,.2);box-shadow:0 4px 14px rgba(255,45,120,.3),inset 0 1px 0 rgba(255,255,255,.2);transition:all .18s;font-family:'Montserrat',sans-serif">${label}</button>`;
  if(variant==='danger') return`<button onclick="${onclick}" style="padding:7px 14px;border-radius:10px;font-size:12px;font-weight:600;cursor:pointer;background:rgba(237,31,81,.12);color:var(--g1);border:1px solid rgba(237,31,81,.25);transition:all .18s">${label}</button>`;
  return`<button onclick="${onclick}" style="padding:7px 14px;border-radius:10px;font-size:12px;font-weight:600;cursor:pointer;background:rgba(255,255,255,.07);color:rgba(255,255,255,.8);border:1px solid rgba(255,255,255,.14);box-shadow:inset 0 1px 0 rgba(255,255,255,.1);transition:all .18s">${label}</button>`;
}

// ─── ADMIN PAGE PRIMITIVES (styles in css/admin.css "ADMIN DESIGN SYSTEM") ───
function admHead(title,sub,actions){
  return '<div class="adm-head"><div><h1 class="adm-title">'+title+'</h1>'+(sub?'<p class="adm-sub">'+sub+'</p>':'')+'</div>'
    +(actions?'<div class="adm-head-actions">'+actions+'</div>':'')+'</div>';
}
// stats: [[label, value, tone?, suffix?]]  tone: ok|warn|bad|info
function admStats(stats){
  return '<div class="adm-stats">'+stats.map(function(s){
    return '<div class="adm-stat '+(s[2]||'')+'"><div class="adm-stat-label">'+s[0]+'</div><div class="adm-stat-val">'+s[1]+(s[3]?'<small>'+s[3]+'</small>':'')+'</div></div>';
  }).join('')+'</div>';
}
function admSearch(id,placeholder,oninput){
  return '<div class="adm-search"><svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>'
    +'<input id="'+id+'" placeholder="'+placeholder+'" oninput="'+oninput+'" autocomplete="off"/></div>';
}
function admSortSelect(id,onchange){
  return '<select id="'+id+'" onchange="'+onchange+'" class="adm-select"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="az">Name A → Z</option><option value="za">Name Z → A</option></select>';
}
function admSectionLabel(label,count){
  return '<p class="adm-section-label">'+label+(count!=null?'<span class="cnt">'+count+'</span>':'')+'</p>';
}
var ADM_ICON={
  edit:'<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  trash:'<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',
  upload:'<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>',
  eye:'<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  link:'<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10 13a5 5 0 007.07 0l3-3a5 5 0 00-7.07-7.07l-1 1"/><path d="M14 11a5 5 0 00-7.07 0l-3 3a5 5 0 007.07 7.07l1-1"/></svg>',
  image:'<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
  chevron:'<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>',
  refresh:'<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12a9 9 0 11-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>',
  plus:'<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>'
};


function admValidityCell(student){
  var v=getValidity(student);
  if(!v.validUntil) return '<span class="adm-badge muted">No expiry</span>';
  var date=v.validUntil.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
  if(v.expired) return '<span class="adm-badge bad">Expired</span><p class="adm-meta">'+date+'</p>';
  var days=Math.ceil((v.validUntil-today)/86400000);
  return '<span class="adm-badge '+(days<=14?'warn':'ok')+'">'+days+' day'+(days===1?'':'s')+' left</span><p class="adm-meta">until '+date+'</p>';
}

var _stuAvatarColors=['#6366f1','#8b5cf6','#d946ef','#ec4899','#f43f5e','#f97316','#eab308','#22c55e','#14b8a6','#06b6d4','#3b82f6'];
function stuTableAvatar(student){
  var i=(student.name||'').split(' ').map(function(n){return n[0]||'';}).join('').toUpperCase().slice(0,2);
  var hash=0;for(var c=0;c<(student.email||student.name||'').length;c++)hash=((hash<<5)-hash)+(student.email||student.name).charCodeAt(c);
  var bg=_stuAvatarColors[Math.abs(hash)%_stuAvatarColors.length];
  var p=getPhoto(student.id);
  if(p) return '<img src="'+p+'" class="stu-avatar" style="object-fit:cover" alt=""/>';
  return '<div class="stu-avatar" style="background:'+bg+'">'+i+'</div>';
}

function stuOverflowBtn(sid){
  return '<div class="stu-actions">'
    +'<button class="adm-btn" onclick="navigate(\'admin-student\',{id:\''+sid+'\'})">Manage</button>'
    +'<button class="adm-btn adm-icon-btn" aria-label="More actions" data-sid="'+sid+'" onclick="event.stopPropagation();toggleStuMenu(this)">⋮</button>'
  +'</div>';
}

// Single menu attached to <body>: the .lg table wrapper's backdrop-filter makes it
// the containing block for fixed children, so an in-row menu gets clipped.
window.toggleStuMenu=function(btn){
  var sid=btn.getAttribute('data-sid');
  var menu=document.getElementById('stu-overflow-menu');
  var wasOpen=menu&&menu.classList.contains('open')&&menu.getAttribute('data-sid')===sid;
  closeStuMenus();
  if(wasOpen) return;
  if(!menu){
    menu=document.createElement('div');
    menu.id='stu-overflow-menu';
    menu.className='stu-overflow-menu';
    menu.addEventListener('click',function(e){e.stopPropagation();});
    document.body.appendChild(menu);
  }
  menu.setAttribute('data-sid',sid);
  menu.innerHTML=
    '<button onclick="closeStuMenus();openEditStudent(\''+sid+'\')"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit</button>'
    +'<button class="danger-item" onclick="closeStuMenus();confirmDelete(\''+sid+'\')"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>Delete</button>';
  var r=btn.getBoundingClientRect();
  menu.classList.add('open');
  var mh=menu.offsetHeight;
  var top=(r.bottom+4+mh>window.innerHeight)?(r.top-4-mh):(r.bottom+4);
  menu.style.top=top+'px';
  menu.style.left=Math.min(window.innerWidth-menu.offsetWidth-8,Math.max(8,r.right-menu.offsetWidth))+'px';
};
window.addEventListener('scroll',function(){closeStuMenus();},true);
window.closeStuMenus=function(){
  [].slice.call(document.querySelectorAll('.stu-overflow-menu.open')).forEach(function(m){m.classList.remove('open');});
};
document.addEventListener('click',function(e){
  if(!e.target.closest('.stu-actions')) closeStuMenus();
});

