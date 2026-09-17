/* images.js — extracted verbatim from the original single-file index.html.
   Source lines: 3726-3865
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
// ── SETTINGS ──────────────────────────────────────────────────────────────────
function renderAdminImages(){
  const videos=loadVideos();

  // Build rows for all 30 lessons
  var rows='';
  ALL_LESSONS.forEach(function(l){
    var v=videos[l.order]||{};
    var thumb=v.thumb||'';
    rows+='<div style="display:flex;align-items:center;gap:14px;padding:14px 20px;border-bottom:1px solid rgba(255,255,255,.06);transition:background .15s" onmouseover="this.style.background=\'rgba(255,255,255,.03)\'" onmouseout="this.style.background=\'\'">'+
      // Thumbnail preview
      '<div style="width:120px;height:68px;border-radius:10px;overflow:hidden;flex-shrink:0;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);position:relative">'+
        (thumb
          ?'<img src="'+thumb+'" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display=\'none\'"/>'
          :'<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:22px">📷</div>'
        )+
        '<div style="position:absolute;top:4px;left:5px;font-size:9px;font-weight:700;font-family:JetBrains Mono,monospace;color:rgba(255,255,255,.7);background:rgba(0,0,0,.6);padding:2px 5px;border-radius:4px">D'+String(l.order).padStart(2,'0')+'</div>'+
      '</div>'+
      // Title + URL input
      '<div style="flex:1;min-width:0">'+
        '<div style="font-weight:700;font-size:13px;color:#fff;margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+getLessonTitle(l)+'</div>'+
        '<div style="display:flex;gap:8px;align-items:center">'+
          '<input id="img-url-'+l.order+'" type="text" value="'+thumb+'" placeholder="Paste image URL or upload below…"'+
            ' style="flex:1;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:7px 10px;color:#fff;font-size:12px;font-family:Inter,sans-serif;outline:none;min-width:0"'+
            ' onfocus="this.style.borderColor=\'rgba(255,45,120,.4)\'" onblur="this.style.borderColor=\'rgba(255,255,255,.12)\'"'+
          '/>'+
          '<button onclick="saveImgUrl('+l.order+')" style="padding:7px 14px;background:var(--grad);border:none;border-radius:8px;color:#fff;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:Montserrat,sans-serif;flex-shrink:0">Save</button>'+
          '<label style="padding:7px 12px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:8px;color:var(--muted);font-size:11px;cursor:pointer;white-space:nowrap;font-family:Montserrat,sans-serif;flex-shrink:0">'+
            '📁 Upload'+
            '<input type="file" accept="image/*" style="display:none" onchange="handleImgUpload(event,'+l.order+')"/>'+
          '</label>'+
        '</div>'+
      '</div>'+
    '</div>';
  });

  // WV rows
  var wvRows='';
  WV_DATA.forEach(function(f,i){
    var wvOrder=100+i+1;
    var v=videos[wvOrder]||{};
    var thumb=v.thumb||'';
    wvRows+='<div style="display:flex;align-items:center;gap:14px;padding:14px 20px;border-bottom:1px solid rgba(255,255,255,.06);transition:background .15s" onmouseover="this.style.background=\'rgba(255,255,255,.03)\'" onmouseout="this.style.background=\'\'">'+
      '<div style="width:120px;height:68px;border-radius:10px;overflow:hidden;flex-shrink:0;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);position:relative">'+
        (thumb
          ?'<img src="'+thumb+'" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display=\'none\'"/>'
          :'<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:22px">'+f.icon+'</div>'
        )+
        '<div style="position:absolute;top:4px;left:5px;font-size:9px;font-weight:700;font-family:JetBrains Mono,monospace;color:rgba(255,255,255,.7);background:rgba(0,0,0,.6);padding:2px 5px;border-radius:4px">WV'+(i+1)+'</div>'+
      '</div>'+
      '<div style="flex:1;min-width:0">'+
        '<div style="font-weight:700;font-size:13px;color:#fff;margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+f.icon+' '+f.title+'</div>'+
        '<div style="display:flex;gap:8px;align-items:center">'+
          '<input id="img-url-'+wvOrder+'" type="text" value="'+thumb+'" placeholder="Paste image URL…"'+
            ' style="flex:1;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:7px 10px;color:#fff;font-size:12px;font-family:Inter,sans-serif;outline:none;min-width:0"'+
            ' onfocus="this.style.borderColor=\'rgba(255,45,120,.4)\'" onblur="this.style.borderColor=\'rgba(255,255,255,.12)\'"'+
          '/>'+
          '<button onclick="saveImgUrl('+wvOrder+')" style="padding:7px 14px;background:var(--grad);border:none;border-radius:8px;color:#fff;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:Montserrat,sans-serif;flex-shrink:0">Save</button>'+
          '<label style="padding:7px 12px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:8px;color:var(--muted);font-size:11px;cursor:pointer;white-space:nowrap;font-family:Montserrat,sans-serif;flex-shrink:0">'+
            '📁 Upload'+
            '<input type="file" accept="image/*" style="display:none" onchange="handleImgUpload(event,'+wvOrder+')"/>'+
          '</label>'+
        '</div>'+
      '</div>'+
    '</div>';
  });

  app.innerHTML=adminTopBar('images')+`
  <div id="main-content" style="padding:24px 28px 80px">
    <h2 style="font-family:Montserrat,sans-serif;font-weight:800;font-size:22px;color:#fff;margin-bottom:4px">Class Images</h2>
    <p style="font-size:13px;color:var(--muted);margin-bottom:24px">Paste an image URL or upload a file for each class. Shown in lesson view, sidebar, and dashboard cards.</p>

    <!-- ACCENT JOURNEY -->
    <div style="margin-bottom:28px">
      <div style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:12px;font-family:JetBrains Mono,monospace">ACCENT JOURNEY — 20 Classes</div>
      <div class="lg" style="overflow:hidden;border-radius:16px">${rows}</div>
    </div>

    <!-- WORD VAULT -->
    <div style="margin-bottom:28px">
      <div style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:12px;font-family:JetBrains Mono,monospace">PRONUNCIATION WORKSHOP — 10 Classes</div>
      <div class="lg" style="overflow:hidden;border-radius:16px">${wvRows}</div>
    </div>
  </div>`;

  // Save URL helper
  window.saveImgUrl=function(order){
    var inp=document.getElementById('img-url-'+order);
    if(!inp) return;
    var url=inp.value.trim();
    var vids=loadVideos();
    if(!vids[order]) vids[order]={};
    vids[order].thumb=url;
    saveVideos(vids);
    // Flash feedback
    var btn=inp.nextElementSibling;
    if(btn){var orig=btn.textContent;btn.textContent='✓ Saved';btn.style.background='rgba(34,197,94,.8)';setTimeout(function(){btn.textContent=orig;btn.style.background='var(--grad)';},1500);}
    // Refresh preview
    var preview=inp.closest('div[style*="display:flex"]').previousElementSibling;
    if(preview){
      var img=preview.querySelector('img');
      if(img){img.src=url;}
      else if(url){preview.innerHTML='<img src="'+url+'" style="width:100%;height:100%;object-fit:cover"/><div style="position:absolute;top:4px;left:5px;font-size:9px;font-weight:700;font-family:JetBrains Mono,monospace;color:rgba(255,255,255,.7);background:rgba(0,0,0,.6);padding:2px 5px;border-radius:4px">'+preview.querySelector('div[style*="position:absolute"]').textContent+'</div>';}
    }
  };

  // File upload — compress locally and save (no external service)
  window.handleImgUpload=function(evt,order){
    var file=evt.target.files[0];
    if(!file) return;
    var label=evt.target.closest('label');
    function resetLabel(){
      if(label){label.innerHTML='📁 Upload<input type="file" accept="image/*" style="display:none" onchange="handleImgUpload(event,\''+order+'\')"/>';label.style.color='var(--muted)';}
    }
    if(label){label.textContent='⏳ Uploading…';label.style.color='var(--g3)';}
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
        var url=c.toDataURL('image/jpeg',0.8);
        var inp=document.getElementById('img-url-'+order);
        if(inp){inp.value=url;}
        saveImgUrl(order);
        resetLabel();
      };
      img.onerror=function(){alert('Could not read that image.');resetLabel();};
      img.src=e.target.result;
    };
    r.onerror=function(){alert('Could not read the file.');resetLabel();};
    r.readAsDataURL(file);
  };
}
