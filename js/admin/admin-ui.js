/* admin-ui.js — ADMIN app only (admin.html).
   Admin top bar, admin design-system helpers and the Students table helpers.
   Moved out of js/components/topbar.js and js/utils/formatting.js so the
   student app no longer ships admin UI code. */
function adminTopBar(tab){
  const I=function(d){return '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">'+d+'</svg>';};
  const tabs=[
    {id:'students',label:'Students',icon:I('<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>')},
    {id:'progress',label:'Progress',icon:I('<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>')},
    {id:'classes',label:'Classes & Videos',icon:I('<rect x="2" y="5" width="15" height="14" rx="2"/><path d="M17 10l5-3v10l-5-3"/>')},
    {id:'quiz',label:'Quizzes',icon:I('<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9"/>')},
    {id:'images',label:'Images',icon:I('<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>')},
    {id:'demo',label:'Demo Access',icon:I('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>')},
    {id:'settings',label:'Settings',icon:I('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/>')}
  ];
  // On narrow screens the nav scrolls sideways — bring the current tab into view.
  setTimeout(function(){
    var nav=document.querySelector('.atb-nav'), on=nav&&nav.querySelector('.atb-tab.on');
    if(on&&nav.scrollWidth>nav.clientWidth) nav.scrollLeft=on.offsetLeft-(nav.clientWidth-on.offsetWidth)/2;
  },0);
  return`<header class="admin-top-bar">
    <div class="atb-brand">
      <img src="${getLogoSrc()}" alt="${escapeAttr(SITE_NAME)}" class="atb-logo" onerror="this.style.display='none'"/>
      <span class="atb-sep" aria-hidden="true"></span>
      <span class="atb-role">Admin</span>
      <span id="admin-maint-badge" class="atb-maint" style="display:${_maintenanceActive?'inline-flex':'none'}">Maintenance on</span>
    </div>
    <nav class="atb-nav" aria-label="Admin sections">
      ${tabs.map(t=>`<button type="button" onclick="navigate('admin',{tab:'${t.id}'})" class="atb-tab${tab===t.id?' on':''}"${tab===t.id?' aria-current="page"':''}>${t.icon}<span>${t.label}</span></button>`).join('')}
    </nav>
    <button type="button" onclick="adminLogout()" class="atb-out" title="Sign out">
      <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg><span>Sign out</span>
    </button>
  </header>`;
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

