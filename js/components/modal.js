/* modal.js — extracted verbatim from the original single-file index.html.
   Source lines: 6041-6097, 6317-6355
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
// ── Branded custom dropdown (no native <select>). Returns {value(), destroy()}. ──
var _demoDurationSelect = null;
var _bxOpenInstance = null;
function createBxSelect(containerId, options, defaultValue){
  var host = document.getElementById(containerId);
  if(!host) return null;
  var value = defaultValue, isOpen=false;
  function labelFor(v){ var o=options.find(function(x){return x.value===v;}); return o?o.label:String(v); }
  var wrap = document.createElement('div'); wrap.className='bx-select'; wrap.tabIndex=0;
  wrap.innerHTML =
    '<div class="bx-select-btn"><span class="bx-select-val">'+labelFor(value)+'</span>'+
      '<svg class="bx-select-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></div>';
  host.innerHTML=''; host.appendChild(wrap);
  var btn = wrap.querySelector('.bx-select-btn');
  var valEl = wrap.querySelector('.bx-select-val');
  // Menu is portalled to <body> so it floats above everything and never expands the card.
  var menu = document.createElement('div'); menu.className='bx-select-menu'; menu.setAttribute('role','listbox');
  menu.innerHTML = options.map(function(o){ return '<div class="bx-opt'+(o.value===value?' bx-sel':'')+'" data-v="'+o.value+'" role="option">'+o.label+'<span class="bx-check">✓</span></div>'; }).join('');
  document.body.appendChild(menu);
  function position(){
    var r = btn.getBoundingClientRect();
    menu.style.width = r.width+'px';
    menu.style.left = r.left+'px';
    var below = window.innerHeight - r.bottom, mh = Math.min(menu.scrollHeight, 300);
    if(below < mh+12 && r.top > below){ menu.style.top='auto'; menu.style.bottom=(window.innerHeight - r.top + 6)+'px'; }
    else { menu.style.bottom='auto'; menu.style.top=(r.bottom + 6)+'px'; }
  }
  function open(){
    if(_bxOpenInstance && _bxOpenInstance!==api) _bxOpenInstance.close();
    isOpen=true; wrap.classList.add('open'); menu.classList.add('bx-open'); position(); _bxOpenInstance=api;
    var sel = menu.querySelector('.bx-opt.bx-sel'); if(sel) sel.scrollIntoView({block:'center'});
  }
  function close(){ isOpen=false; wrap.classList.remove('open'); menu.classList.remove('bx-open'); if(_bxOpenInstance===api)_bxOpenInstance=null; }
  function pick(v){ value=v; valEl.textContent=labelFor(v);
    menu.querySelectorAll('.bx-opt').forEach(function(el){ el.classList.toggle('bx-sel', parseInt(el.dataset.v,10)===v); });
    close();
  }
  btn.addEventListener('click', function(e){ e.stopPropagation(); isOpen?close():open(); });
  menu.addEventListener('click', function(e){ var o=e.target.closest('.bx-opt'); if(o){ e.stopPropagation(); pick(parseInt(o.dataset.v,10)); } });
  wrap.addEventListener('keydown', function(e){
    if(e.key==='Escape'){ close(); }
    else if(e.key==='Enter'||e.key===' '){ e.preventDefault(); isOpen?close():open(); }
    else if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault();
      var idx=options.findIndex(function(x){return x.value===value;});
      idx += (e.key==='ArrowDown'?1:-1); idx=Math.max(0,Math.min(options.length-1,idx));
      pick(options[idx].value); if(!isOpen) open();
    }
  });
  var api = { value:function(){ return value; }, close:close, _reposition:function(){ if(isOpen) position(); },
    destroy:function(){ try{wrap.remove();}catch(e){} try{menu.remove();}catch(e){} if(_bxOpenInstance===api)_bxOpenInstance=null; } };
  return api;
}
// Global: outside-click closes; reposition on scroll/resize while open.
document.addEventListener('click', function(){ if(_bxOpenInstance) _bxOpenInstance.close(); });
window.addEventListener('scroll', function(){ if(_bxOpenInstance) _bxOpenInstance._reposition(); }, true);
window.addEventListener('resize', function(){ if(_bxOpenInstance) _bxOpenInstance._reposition(); });

function demoToast(msg, type){
  var wrap = document.getElementById('demo-toast-wrap');
  if(!wrap){ wrap=document.createElement('div'); wrap.id='demo-toast-wrap'; document.body.appendChild(wrap); }
  var t = document.createElement('div');
  t.className='demo-toast'+(type==='error'?' demo-toast-error':(type==='info'?' demo-toast-info':''));
  t.textContent = msg;
  wrap.appendChild(t);
  requestAnimationFrame(function(){ t.classList.add('show'); });
  setTimeout(function(){ t.classList.remove('show'); setTimeout(function(){ t.remove(); }, 300); }, 2600);
}

// Reusable branded confirm modal (replaces native confirm/alert for Demo Access).
function showDemoConfirm(opts){
  var ov = document.createElement('div');
  ov.className='demo-modal-ov';
  var danger = (opts.type!=='warn');
  ov.innerHTML =
    '<div class="demo-modal" role="dialog" aria-modal="true">'+
      '<h3>'+(opts.title||'Are you sure?')+'</h3>'+
      '<p>'+(opts.message||'')+'</p>'+
      '<div class="demo-modal-actions">'+
        '<button class="demo-mbtn demo-mbtn-cancel" data-act="cancel">'+(opts.cancelText||'Cancel')+'</button>'+
        '<button class="demo-mbtn '+(opts.type==='warn'?'demo-mbtn-warn':'demo-mbtn-danger')+'" data-act="ok">'+(opts.confirmText||'Confirm')+'</button>'+
      '</div>'+
    '</div>';
  document.body.appendChild(ov);
  requestAnimationFrame(function(){ ov.classList.add('show'); });
  function close(){ ov.classList.remove('show'); setTimeout(function(){ ov.remove(); document.removeEventListener('keydown',onKey); }, 200); }
  function onKey(e){ if(e.key==='Escape') close(); }
  document.addEventListener('keydown', onKey);
  ov.addEventListener('click', function(e){
    if(e.target===ov) return close();   // click outside cancels
    var b=e.target.closest('[data-act]'); if(!b) return;
    if(b.dataset.act==='ok'){ close(); if(opts.onConfirm) opts.onConfirm(); }
    else close();
  });
  setTimeout(function(){ var ok=ov.querySelector('[data-act=ok]'); if(ok) ok.focus(); }, 50);
}
