/* images.js — Class Images admin tab.
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
function _imgSourceLabel(url){
  if(!url) return '<span class="adm-badge muted">No image</span>';
  if(url.indexOf('data:')===0){
    var kb=Math.round(url.length*0.75/1024);
    return '<span class="adm-badge ok">Uploaded</span><span class="adm-meta" style="display:inline;margin-left:6px">'+kb+' KB</span>';
  }
  var host='';try{host=new URL(url).hostname;}catch(e){}
  return '<span class="adm-badge info">Linked</span><span class="adm-meta" style="display:inline;margin-left:6px">'+escapeHtml(host)+'</span>';
}

function _imgCard(order,tag,title,thumb,fallback){
  var isData=thumb.indexOf('data:')===0;
  return '<div class="adm-img-card" id="img-card-'+order+'">'
    +'<div class="adm-img-prev'+(thumb?' zoom':'')+'" id="img-prev-'+order+'"'
      +(thumb?' role="button" tabindex="0" aria-label="Preview image" onclick="openImgPreview('+order+')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();openImgPreview('+order+')}"':'')+'>'
      +'<span class="adm-img-tag">'+tag+'</span>'
      +(thumb?'<img src="'+escapeAttr(thumb)+'" alt=""'+thumbPosAttr(order)+' loading="lazy" onerror="this.remove()"/>':fallback+'<span>No image yet</span>')
    +'</div>'
    +'<div class="adm-img-body">'
      +'<p class="adm-name" title="'+escapeAttr(title)+'">'+escapeHtml(title)+'</p>'
      +'<div id="img-src-'+order+'">'+_imgSourceLabel(thumb)+'</div>'
      +'<div class="adm-img-url" id="img-url-row-'+order+'">'
        +'<input id="img-url-'+order+'" class="adm-input" style="padding:8px 10px;font-size:12px" type="text" value="'+(isData?'':escapeAttr(thumb))+'" placeholder="https://…" onkeydown="if(event.key===\'Enter\')saveImgUrl('+order+')"/>'
        +'<button class="adm-btn adm-btn-primary" onclick="saveImgUrl('+order+')">Save</button>'
      +'</div>'
      +'<div class="adm-img-actions">'
        +'<label class="adm-btn" style="flex:1" id="img-up-'+order+'">'+ADM_ICON.upload+'Upload<input type="file" accept="image/*" style="display:none" onchange="handleImgUpload(event,'+order+')"/></label>'
        +'<button class="adm-btn" style="flex:1" onclick="toggleImgUrl('+order+')">'+ADM_ICON.link+'Paste URL</button>'
        +(thumb?'<button class="adm-btn adm-icon-btn" aria-label="Adjust image position" title="Adjust position — choose which part shows on the course page" onclick="openImgPosition('+order+')"><svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg></button>':'')
        +(thumb?'<button class="adm-btn adm-btn-danger adm-icon-btn" aria-label="Remove image" title="Remove image" onclick="clearImg('+order+')">'+ADM_ICON.trash+'</button>':'')
      +'</div>'
    +'</div>'
  +'</div>';
}

// ── Image preview lightbox ──
// Opened only by clicking a thumbnail; Upload / Paste URL / Delete are untouched.
function openImgPreview(order){
  var url=((loadVideos()[order])||{}).thumb||'';
  var card=document.getElementById('img-card-'+order);
  if(!url||!card) return;
  var tag=card.querySelector('.adm-img-tag').textContent;
  var title=card.querySelector('.adm-name').textContent;
  closeImgPreview(true);
  var lb=document.createElement('div');
  lb.id='img-lightbox'; lb.className='img-lb';
  lb.setAttribute('role','dialog'); lb.setAttribute('aria-modal','true'); lb.setAttribute('aria-label',tag+' — '+title);
  lb.innerHTML='<div class="img-lb-box">'
    +'<div class="img-lb-head"><div style="min-width:0"><span class="img-lb-code">'+escapeHtml(tag)+'</span>'
    +'<p class="img-lb-title">'+escapeHtml(title)+'</p></div>'
    +'<button type="button" class="img-lb-x" aria-label="Close preview" onclick="closeImgPreview()">'
    +'<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>'
    +'<div class="img-lb-stage"><img alt="'+escapeAttr(tag+' — '+title)+'"/></div></div>';
  lb.querySelector('img').src=url; // set as a property — never parsed as HTML
  lb.addEventListener('click',function(e){ if(e.target===lb) closeImgPreview(); });
  document.body.appendChild(lb);
  window._imgLbScroll=document.body.style.overflow;
  document.body.style.overflow='hidden';
  document.addEventListener('keydown',_imgLbKey);
  window._imgLbReturn=document.activeElement;
  requestAnimationFrame(function(){ lb.classList.add('open'); lb.querySelector('.img-lb-x').focus(); });
}
function _imgLbKey(e){ if(e.key==='Escape') closeImgPreview(); }
function closeImgPreview(instant){
  var lb=document.getElementById('img-lightbox'); if(!lb) return;
  document.removeEventListener('keydown',_imgLbKey);
  document.body.style.overflow=window._imgLbScroll||'';
  lb.id='';
  if(instant){ lb.remove(); return; }
  lb.classList.remove('open');
  setTimeout(function(){ lb.remove(); },200);
  if(window._imgLbReturn&&window._imgLbReturn.focus) try{window._imgLbReturn.focus();}catch(e){}
}

// ── Image position (focal point) editor ──
// Saves videos[order].thumbPos = {x,y} (percent). Students' cards use it as
// object-position with object-fit:cover, so the image itself is never cropped or resized.
// The frame below is 16:9 — the same shape as the course page card.
function openImgPosition(order){
  var url=((loadVideos()[order])||{}).thumb||'';
  var card=document.getElementById('img-card-'+order);
  if(!url||!card) return;
  var tag=card.querySelector('.adm-img-tag').textContent, title=card.querySelector('.adm-name').textContent;
  var cur=thumbPos(order)||{x:50,y:50};
  var st={x:cur.x,y:cur.y,ovX:0,ovY:0};
  var old=document.getElementById('imgpos-modal'); if(old) old.remove();
  var m=document.createElement('div'); m.id='imgpos-modal'; m.className='qe-overlay';
  var arrow=function(d){return '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" viewBox="0 0 24 24"><path d="'+d+'"/></svg>';};
  m.innerHTML='<div class="qe-panel ip-panel" role="dialog" aria-modal="true" aria-labelledby="ip-t">'
    +'<div class="qe-head"><div style="min-width:0"><p class="cm-kicker">'+escapeHtml(tag)+' · Image position</p><h2 class="cm-title" id="ip-t">'+escapeHtml(title)+'</h2></div>'
    +'<button type="button" class="qe-x" data-close aria-label="Close">×</button></div>'
    +'<div class="qe-body" style="padding:18px 20px">'
      +'<p class="adm-hint" style="margin:0 0 10px">Drag the image to choose what students see. The frame matches the course card shape; the image itself is not changed.</p>'
      +'<div class="ip-frame" id="ip-frame"><img alt="" draggable="false"/><span class="ip-cross"></span></div>'
      +'<div class="ip-ctrl">'
        +'<div class="ip-row"><span class="adm-label" style="margin:0">Horizontal</span><button type="button" class="ip-step" data-ax="x" data-d="-5" aria-label="Left">'+arrow('M15 18l-6-6 6-6')+'</button><input type="range" id="ip-x" min="0" max="100" step="1"/><button type="button" class="ip-step" data-ax="x" data-d="5" aria-label="Right">'+arrow('M9 18l6-6-6-6')+'</button><span class="ip-val" id="ip-xv"></span></div>'
        +'<div class="ip-row"><span class="adm-label" style="margin:0">Vertical</span><button type="button" class="ip-step" data-ax="y" data-d="-5" aria-label="Up">'+arrow('M18 15l-6-6-6 6')+'</button><input type="range" id="ip-y" min="0" max="100" step="1"/><button type="button" class="ip-step" data-ax="y" data-d="5" aria-label="Down">'+arrow('M6 9l6 6 6-6')+'</button><span class="ip-val" id="ip-yv"></span></div>'
        +'<p class="adm-hint" id="ip-fit" style="margin:2px 0 0"></p>'
        +'<div class="ip-presets">'+[['Center',50,50],['Top',null,0],['Bottom',null,100],['Left',0,null],['Right',100,null]].map(function(p){return '<button type="button" class="adm-chip" data-px="'+(p[1]==null?'':p[1])+'" data-py="'+(p[2]==null?'':p[2])+'">'+p[0]+'</button>';}).join('')+'</div>'
      +'</div>'
      +'<div class="ip-small"><span class="adm-label" style="margin:0 0 6px">On the course page</span><div class="ip-mini"><img alt=""/></div></div>'
    +'</div>'
    +'<div class="qe-foot" style="justify-content:flex-end"><span id="ip-msg" class="adm-hint" style="margin:0 auto 0 0"></span>'
      +'<button type="button" class="adm-btn adm-btn-lg" data-close>Cancel</button>'
      +'<button type="button" class="adm-btn adm-btn-primary adm-btn-lg" id="ip-save">Save position</button></div>'
  +'</div>';
  document.body.appendChild(m);
  var frame=m.querySelector('#ip-frame'), img=frame.querySelector('img'), mini=m.querySelector('.ip-mini img');
  var sx=m.querySelector('#ip-x'), sy=m.querySelector('#ip-y');
  img.src=url; mini.src=url;
  function apply(){
    st.x=Math.round(Math.max(0,Math.min(100,st.x))); st.y=Math.round(Math.max(0,Math.min(100,st.y)));
    var pos=st.x+'% '+st.y+'%';
    img.style.objectPosition=pos; mini.style.objectPosition=pos;
    sx.value=st.x; sy.value=st.y;
    m.querySelector('#ip-xv').textContent=st.x+'%'; m.querySelector('#ip-yv').textContent=st.y+'%';
  }
  // How far the covered image overflows the frame on each axis (only that axis can move).
  function measure(){
    var nw=img.naturalWidth, nh=img.naturalHeight, fw=frame.clientWidth, fh=frame.clientHeight;
    if(!nw||!nh||!fw||!fh) return;
    var sc=Math.max(fw/nw, fh/nh);
    st.ovX=Math.max(0,nw*sc-fw); st.ovY=Math.max(0,nh*sc-fh);
    sx.disabled=st.ovX<1; sy.disabled=st.ovY<1;
    m.querySelector('#ip-fit').textContent=st.ovX<1&&st.ovY<1?'This image fits the frame exactly — there is nothing to move.'
      : st.ovX<1?'The image fills the full width, so only the vertical position changes what shows.'
      : st.ovY<1?'The image fills the full height, so only the horizontal position changes what shows.':'';
  }
  img.onload=measure; if(img.complete) measure();
  requestAnimationFrame(measure); window.addEventListener('resize',measure);
  // Drag: moving the image right reveals more of its left side (lower x).
  var drag=null;
  frame.addEventListener('pointerdown',function(e){ measure(); drag={px:e.clientX,py:e.clientY,x:st.x,y:st.y}; frame.setPointerCapture(e.pointerId); frame.classList.add('drag'); });
  frame.addEventListener('pointermove',function(e){
    if(!drag) return;
    if(st.ovX>=1) st.x=drag.x-(e.clientX-drag.px)/st.ovX*100;
    if(st.ovY>=1) st.y=drag.y-(e.clientY-drag.py)/st.ovY*100;
    apply();
  });
  var end=function(){ drag=null; frame.classList.remove('drag'); };
  frame.addEventListener('pointerup',end); frame.addEventListener('pointercancel',end);
  sx.oninput=function(){ st.x=+sx.value; apply(); }; sy.oninput=function(){ st.y=+sy.value; apply(); };
  [].forEach.call(m.querySelectorAll('.ip-step'),function(b){ b.onclick=function(){ st[b.dataset.ax]+=+b.dataset.d; apply(); }; });
  [].forEach.call(m.querySelectorAll('.ip-presets .adm-chip'),function(b){ b.onclick=function(){ if(b.dataset.px!=='') st.x=+b.dataset.px; if(b.dataset.py!=='') st.y=+b.dataset.py; apply(); }; });
  var close=function(){ document.removeEventListener('keydown',esc); window.removeEventListener('resize',measure); document.body.style.overflow=''; m.remove(); };
  var esc=function(e){ if(e.key==='Escape') close(); if(e.key==='ArrowLeft'&&e.target.tagName!=='INPUT'){st.x-=1;apply();} if(e.key==='ArrowRight'&&e.target.tagName!=='INPUT'){st.x+=1;apply();} if(e.key==='ArrowUp'&&e.target.tagName!=='INPUT'){e.preventDefault();st.y-=1;apply();} if(e.key==='ArrowDown'&&e.target.tagName!=='INPUT'){e.preventDefault();st.y+=1;apply();} };
  [].forEach.call(m.querySelectorAll('[data-close]'),function(b){ b.onclick=close; });
  m.addEventListener('click',function(e){ if(e.target===m) close(); });
  document.addEventListener('keydown',esc);
  document.body.style.overflow='hidden';
  m.querySelector('#ip-save').onclick=function(){
    var vids=loadVideos();
    if(!vids[order]) vids[order]={};
    // Centre is the default, so it is stored as "no position" — existing behaviour.
    if(st.x===50&&st.y===50) delete vids[order].thumbPos; else vids[order].thumbPos={x:st.x,y:st.y};
    saveVideos(vids);
    var ci=document.querySelector('#img-prev-'+order+' img'); if(ci) ci.style.objectPosition=st.x+'% '+st.y+'%';
    close();
  };
  apply();
}

function renderAdminImages(){
  const videos=loadVideos();
  var core=ALL_LESSONS.map(function(l){
    return _imgCard(l.order,'D'+String(l.order).padStart(2,'0'),getLessonTitle(l)||l.title,(videos[l.order]||{}).thumb||'',ADM_ICON.image);
  }).join('');
  var wv=WV_DATA.map(function(f,i){
    var o=101+i;
    return _imgCard(o,'W'+(i+1),f.title,(videos[o]||{}).thumb||'','<span style="font-size:24px">'+f.icon+'</span>');
  }).join('');
  var coreSet=ALL_LESSONS.filter(function(l){return (videos[l.order]||{}).thumb;}).length;
  var wvSet=WV_DATA.filter(function(f,i){return (videos[101+i]||{}).thumb;}).length;

  app.innerHTML=adminTopBar('images')+`
  <div class="adm-page">
    ${admHead('Class Images','Upload a file or paste an image URL for each class. Shown in the lesson view, sidebar and dashboard cards.')}
    ${admStats([
      ['Class images', coreSet, coreSet<ALL_LESSONS.length?'warn':'ok', '/'+ALL_LESSONS.length],
      ['Workshop images', wvSet, wvSet<WV_DATA.length?'warn':'ok', '/'+WV_DATA.length]
    ])}
    <div class="adm-section">
      ${admSectionLabel('Accent Journey', ALL_LESSONS.length+' classes')}
      <div class="adm-img-grid">${core}</div>
    </div>
    <div class="adm-section">
      ${admSectionLabel('Pronunciation Workshop', WV_DATA.length+' classes')}
      <div class="adm-img-grid">${wv}</div>
    </div>
  </div>`;

  window.toggleImgUrl=function(order){
    var row=document.getElementById('img-url-row-'+order);
    if(!row) return;
    row.classList.toggle('open');
    if(row.classList.contains('open')) document.getElementById('img-url-'+order).focus();
  };

  function _applyImg(order,url){
    var vids=loadVideos();
    if(!vids[order]) vids[order]={};
    vids[order].thumb=url;
    saveVideos(vids);
    var card=document.getElementById('img-card-'+order);
    if(!card) return;
    var tag=card.querySelector('.adm-img-tag').textContent;
    var title=card.querySelector('.adm-name').textContent;
    var fb=order>100?'<span style="font-size:24px">'+WV_DATA[order-101].icon+'</span>':ADM_ICON.image;
    var tmp=document.createElement('div');
    tmp.innerHTML=_imgCard(order,tag,title,url,fb);
    card.replaceWith(tmp.firstChild);
  }

  window.saveImgUrl=function(order){
    var inp=document.getElementById('img-url-'+order);
    if(!inp) return;
    var url=inp.value.trim();
    if(url && !/^https?:\/\//i.test(url)){ inp.style.borderColor='#fb7185'; return; }
    _applyImg(order,url);
  };

  window.clearImg=async function(order){
    if(!(await uiConfirm('Remove this image? Students will see the placeholder instead.',{title:'Remove image',danger:true,okText:'Remove'}))) return;
    _applyImg(order,'');
  };

  // File upload — compress locally and save (no external service)
  window.handleImgUpload=function(evt,order){
    var file=evt.target.files[0];
    if(!file) return;
    var label=document.getElementById('img-up-'+order);
    if(label){label.firstChild&&label.childNodes.forEach(function(n){if(n.nodeType===3)n.textContent='Uploading…';});label.style.pointerEvents='none';}
    var r=new FileReader();
    r.onload=function(e){
      var img=new Image();
      img.onload=function(){
        // resize to max 800px wide, JPEG 0.8 — small enough to store & sync
        var maxW=800;
        var w=img.width,h=img.height;
        if(w>maxW){h=Math.round(h*maxW/w);w=maxW;}
        var c=document.createElement('canvas');c.width=w;c.height=h;
        c.getContext('2d').drawImage(img,0,0,w,h);
        _applyImg(order,c.toDataURL('image/jpeg',0.8));
      };
      img.onerror=function(){uiAlert('Could not read that image.',{tone:'error'});renderAdminImages();};
      img.src=e.target.result;
    };
    r.onerror=function(){uiAlert('Could not read the file.',{tone:'error'});renderAdminImages();};
    r.readAsDataURL(file);
  };
}
