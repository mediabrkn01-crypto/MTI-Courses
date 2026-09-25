/* effects.js — extracted verbatim from the original single-file index.html.
   Source lines: 7244-7447
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
// ── DOCK MAGNIFICATION (macOS-style hover scaling) ──────────────────────────
function initDockMagnify(row, mode, opts){
  if(!row || row.dataset.dockInit) return;
  row.dataset.dockInit = '1';
  mode = mode || 'row'; // 'row' = horizontal strip, 'col' = vertical list
  if(!opts && row.dataset.dockOpts){ try{ opts = JSON.parse(row.dataset.dockOpts); }catch(e){} }
  opts = opts || {};

  var maxScale = opts.maxScale || (mode === 'col' ? 1.11 : 1.14); // noticeable pop, kept inside the gaps
  var influence = opts.influence || (mode === 'col' ? 120 : 140); // reach
  var maxLift = opts.maxLift != null ? opts.maxLift : (mode === 'col' ? 6 : 10); // px the hovered item shifts by, dock-style
  var isSingleRow = getComputedStyle(row).display.indexOf('grid') === -1;
  var origin = opts.origin || (mode === 'col' ? 'center left' : (isSingleRow ? 'bottom center' : 'center center'));

  var children = Array.prototype.slice.call(row.children);
  var state = children.map(function(){ return {current: 1, target: 1}; });
  var mouseX = null, mouseY = null, rafId = null, isAnimating = false;

  children.forEach(function(child){
    child.style.transformOrigin = origin;
    child.style.willChange = 'transform';
    // No CSS transition — animation is driven by JS rAF loop for true dock-like spring motion
    child.style.transition = 'none';
  });

  // Gaussian-like falloff: smooth bell curve, not a hard linear cutoff —
  // this is what gives the Dock its soft "wave" look instead of a sharp pop.
  function falloff(dist, radius){
    if(dist >= radius) return 0;
    var x = dist / radius;
    // Smoothstep-based bell curve, eases in and out softly
    var t = 1 - x;
    return t * t * (3 - 2 * t);
  }

  function computeTargets(){
    children.forEach(function(child, i){
      var rect = child.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      var dist;
      if(mode === 'col'){
        // Vertical list — only vertical distance matters, ignore horizontal mouse position
        dist = Math.abs(mouseY - cy);
      } else {
        var dx = mouseX - cx;
        var dy = isSingleRow ? 0 : (mouseY - cy);
        dist = Math.sqrt(dx*dx + dy*dy);
      }
      var t = falloff(dist, influence);
      state[i].target = 1 + (maxScale - 1) * t;
    });
  }

  function animate(){
    var stillMoving = false;
    children.forEach(function(child, i){
      var s = state[i];
      var diff = s.target - s.current;
      // Spring-like lerp — fast catch-up, snappy settle (mimics dock's springy ease)
      s.current += diff * 0.3;
      if(Math.abs(diff) > 0.001) stillMoving = true;
      else s.current = s.target;
      var liftT = (s.current - 1) / (maxScale - 1); // 0..1 progress toward full scale
      var lift = maxLift * liftT;
      child.style.transform = mode === 'col'
        ? 'translateX(' + lift.toFixed(2) + 'px) scale(' + s.current.toFixed(4) + ')'
        : 'translateY(-' + lift.toFixed(2) + 'px) scale(' + s.current.toFixed(4) + ')';
      child.style.zIndex = s.current > 1.01 ? '40' : '1';
    });
    if(stillMoving){
      rafId = requestAnimationFrame(animate);
    } else {
      isAnimating = false;
    }
  }

  function kickAnimation(){
    if(!isAnimating){
      isAnimating = true;
      rafId = requestAnimationFrame(animate);
    }
  }

  row.addEventListener('mousemove', function(e){
    mouseX = e.clientX;
    mouseY = e.clientY;
    computeTargets();
    kickAnimation();
  });

  row.addEventListener('mouseleave', function(){
    children.forEach(function(_, i){ state[i].target = 1; });
    kickAnimation();
  });

  // Recompute on scroll too, since card positions shift under a static cursor
  row.addEventListener('scroll', function(){
    if(mouseX !== null){ computeTargets(); kickAnimation(); }
  });
}

function applyDockMagnifyToAll(){
  document.querySelectorAll('.dock-row').forEach(function(el){ initDockMagnify(el, 'row'); });
  document.querySelectorAll('.dock-col').forEach(function(el){ initDockMagnify(el, 'col'); });
}

function initBorderGlow(el){
  if(!el || el.dataset.glowInit) return;
  el.dataset.glowInit = '1';
  el.classList.add('border-glow-card');
  // The outer glow layer extends beyond the card's own box (negative inset).
  // overflow:hidden on the card would clip it invisible, so force it visible.
  if(el.style.overflow === 'hidden') el.style.overflow = 'visible';
  var span = document.createElement('span');
  span.className = 'edge-light';
  el.appendChild(span);

  function getCenter(){
    var r = el.getBoundingClientRect();
    return [r.width/2, r.height/2];
  }
  function getEdgeProximity(x,y){
    var c = getCenter(); var cx=c[0], cy=c[1];
    var dx = x-cx, dy = y-cy;
    var kx = Infinity, ky = Infinity;
    if(dx!==0) kx = cx/Math.abs(dx);
    if(dy!==0) ky = cy/Math.abs(dy);
    return Math.min(Math.max(1/Math.min(kx,ky),0),1);
  }
  function getCursorAngle(x,y){
    var c = getCenter(); var cx=c[0], cy=c[1];
    var dx=x-cx, dy=y-cy;
    if(dx===0&&dy===0) return 0;
    var deg = Math.atan2(dy,dx)*(180/Math.PI)+90;
    if(deg<0) deg+=360;
    return deg;
  }
  el.addEventListener('pointermove', function(e){
    var r = el.getBoundingClientRect();
    var x = e.clientX - r.left, y = e.clientY - r.top;
    var edge = getEdgeProximity(x,y);
    var angle = getCursorAngle(x,y);
    el.style.setProperty('--edge-proximity', (edge*100).toFixed(3));
    el.style.setProperty('--cursor-angle', angle.toFixed(3)+'deg');
  });
}

// Auto-apply to .lg cards AND any element with a visible rounded border (inline-styled cards)
function removeBorderGlowFromAdmin(){
  document.querySelectorAll('.border-glow-card[data-glow-init]').forEach(function(el){
    el.classList.remove('border-glow-card');
    delete el.dataset.glowInit;
    var span = el.querySelector(':scope > .edge-light');
    if(span) span.remove();
  });
}

function applyBorderGlowToAll(){
  // Student-only effect — skip entirely (and clean up) when in admin role/views
  if(currentSession && currentSession.role === 'admin'){
    removeBorderGlowFromAdmin();
    return;
  }

  // Explicit .lg cards
  document.querySelectorAll('.lg:not([data-glow-init])').forEach(initBorderGlow);

  // Any div with both border-radius and a border in its inline style (covers stat cards,
  // phase cards, mission rows, sidebar widgets etc rendered via inline CSS)
  document.querySelectorAll('div[style]:not([data-glow-init])').forEach(function(el){
    var s = el.getAttribute('style') || '';
    var hasBorder = /border\s*:\s*1px solid/i.test(s);
    var hasRadius = /border-radius\s*:/i.test(s);
    var hasBg = /background\s*:/i.test(s);
    var rect = el.getBoundingClientRect();
    if(hasBorder && hasRadius && hasBg && rect.width > 60 && rect.height > 30){
      initBorderGlow(el);
    }
  });
}

// Run after each render via MutationObserver on #app
(function(){
  var appEl = document.getElementById('app');
  if(!appEl) return;
  var debounceTimer = null;
  var observer = new MutationObserver(function(){
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function(){
      applyBorderGlowToAll();
      applyDockMagnifyToAll();
    }, 150);
  });
  observer.observe(appEl, {childList:true, subtree:true});
  // Run immediately, then again after a short delay to catch the initial boot render
  applyBorderGlowToAll();
  applyDockMagnifyToAll();
  setTimeout(applyBorderGlowToAll, 300);
  setTimeout(applyDockMagnifyToAll, 300);
  setTimeout(applyBorderGlowToAll, 1500);
  setTimeout(applyDockMagnifyToAll, 1500);
  setTimeout(applyBorderGlowToAll, 3000);
  setTimeout(applyDockMagnifyToAll, 3000);
})();
