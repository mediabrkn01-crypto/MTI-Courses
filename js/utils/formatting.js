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
