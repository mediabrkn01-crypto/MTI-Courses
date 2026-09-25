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
    +'<div class="adm-img-prev" id="img-prev-'+order+'"><span class="adm-img-tag">'+tag+'</span>'
      +(thumb?'<img src="'+escapeAttr(thumb)+'" alt="" loading="lazy" onerror="this.remove()"/>':fallback+'<span>No image yet</span>')
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
        +(thumb?'<button class="adm-btn adm-btn-danger adm-icon-btn" aria-label="Remove image" title="Remove image" onclick="clearImg('+order+')">'+ADM_ICON.trash+'</button>':'')
      +'</div>'
    +'</div>'
  +'</div>';
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

  window.clearImg=function(order){
    if(!confirm('Remove this image?')) return;
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
      img.onerror=function(){alert('Could not read that image.');renderAdminImages();};
      img.src=e.target.result;
    };
    r.onerror=function(){alert('Could not read the file.');renderAdminImages();};
    r.readAsDataURL(file);
  };
}
