/* formatting.js — extracted verbatim from the original single-file index.html.
   Source lines: 1677-1692, 1810, 2541-2554, 5805-5810, 6034-6038
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
function avatarHtml(student,size=64,fontSize=24){
  const p=getPhoto(student.id);
  const i=student.name.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2);
  const sz=typeof size==='string'?'64':size;
  return p
    ?`<img src="${p}" style="width:${sz}px;height:${sz}px;border-radius:14px;object-fit:cover;flex-shrink:0" alt="${student.name}"/>`
    :`<div style="width:${sz}px;height:${sz}px;border-radius:14px;background:var(--grad);display:flex;align-items:center;justify-content:center;color:#fff;font-size:${fontSize}px;font-weight:800;font-family:'Montserrat',sans-serif;flex-shrink:0;box-shadow:0 4px 16px rgba(255,45,120,.3)">${i}</div>`;
}
function avatarSmallHtml(student){
  const p=getPhoto(student.id);
  const i=student.name.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2);
  return p
    ?`<img src="${p}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0" alt="${student.name}"/>`
    :`<div style="width:36px;height:36px;border-radius:50%;background:var(--grad);display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:800;font-family:'Montserrat',sans-serif;flex-shrink:0;box-shadow:0 2px 10px rgba(255,45,120,.3)">${i}</div>`;
}

function formatDate(d){return d.toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"});}
function getValidity(student){
  if(!student.validUntil)return{validUntil:null,expired:false};
  const d=new Date(student.validUntil); d.setHours(23,59,59,0);
  if(student.completedAt)return{validUntil:d,expired:false};
  return{validUntil:d,expired:today>d};
}
function validityBadge(student){
  const{validUntil,expired}=getValidity(student);
  if(!validUntil)return`<span style="border-radius:99px;padding:2px 8px;font-size:10px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);color:var(--muted)">No expiry</span>`;
  if(expired)return`<span style="border-radius:99px;padding:2px 8px;font-size:10px;font-weight:600;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.28);color:#fca5a5">Expired ${validUntil.toLocaleDateString()}</span>`;
  const days=Math.ceil((validUntil-today)/86400000);
  return`<span style="border-radius:99px;padding:2px 8px;font-size:10px;font-weight:600;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.25);color:#4ade80">${days}d left — ${validUntil.toLocaleDateString()}</span>`;
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
    +glassBtn('Manage',"navigate('admin-student',{id:'"+sid+"'})",'ghost')
    +'<button class="stu-overflow-btn" data-sid="'+sid+'" onclick="event.stopPropagation();toggleStuMenu(this)">⋮</button>'
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

function _fmtClock(ms){
  var s = Math.max(0, Math.round(ms/1000));
  var m = Math.floor(s/60); s = s%60;
  return (m<10?'0':'')+m+':'+(s<10?'0':'')+s;
}

function _demoFmtTime(iso){
  if(!iso) return '—';
  try{ return new Date(iso).toLocaleString(undefined,{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
  catch(e){ return iso; }
}
