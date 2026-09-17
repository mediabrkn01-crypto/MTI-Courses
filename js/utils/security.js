/* security.js — extracted verbatim from the original single-file index.html.
   Source lines: 1135, 1366-1379, 5793-5801
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
function togglePw(id,el){var i=document.getElementById(id);if(!i)return;var show=i.type==="password";i.type=show?"text":"password";el.innerHTML=show?'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>':'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';}
// ── XSS SAFETY HELPERS ────────────────────────────────────────────────────────
// Use escapeHtml() whenever injecting user/DB data into innerHTML.
function escapeHtml(s){
  if(s==null)return'';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function escapeAttr(s){return escapeHtml(s);}
// Safe URL: allow only https: (and mailto: for email links). Reject javascript:/data:
function safeUrl(u){
  if(!u)return'#';
  try{var p=new URL(u);if(['https:','mailto:'].includes(p.protocol))return u;}catch(_){}
  return '#';
}
// Normalize a phone string to bare international digits for wa.me (strip +, spaces, dashes, brackets).
function normalizeWhatsApp(raw){ return String(raw||'').replace(/[^0-9]/g,''); }
function openCounsellorWhatsApp(){
  var num = normalizeWhatsApp(_demoCounsellor);
  if(num.length < 8){ alert('Please contact our support team.'); return; }
  var url = 'https://wa.me/' + num + '?text=' + encodeURIComponent(DEMO_WA_MESSAGE);
  try{ window.open(url, '_blank', 'noopener'); }catch(e){ location.href = url; }
}
window.openCounsellorWhatsApp = openCounsellorWhatsApp;
