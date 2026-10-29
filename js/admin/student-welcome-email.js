/* student-welcome-email.js — ADMIN app only. Student onboarding after a login is created.

   onStudentCreated(ctx) runs once a NEW student's Supabase Auth login exists:
     1. builds the personalised Student Guide PDF once (student-guide.js → prepareStudentGuide)
     2. sendWelcomeEmail(): the send-student-welcome-email Edge Function emails that same PDF
        through Brevo (key server-side; recipient = the student's Auth email, chosen server-side)
     3. shows the result, with Retry and Download Student Guide PDF (same bytes as the email).
   Future channels (WhatsApp/SMS) go in CHANNELS next to sendWelcomeEmail; each runs on its own,
   so one missing provider never blocks another.

   ctx = {studentId, name, email, password, kind:'welcome'|'credentials', autoSend:boolean}
   The password and PDF live only in this module's memory while the result screen is open
   (release() drops them). Nothing is written to storage or the console. */
var StudentOnboarding=(function(){
  var FN='send-student-welcome-email';
  var active=null;   // the one ctx currently on screen

  var IC={
    ok:'<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>',
    bad:'<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    mail:'<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>'
  };
  function spin(){ return '<span class="auth-spin" style="width:14px;height:14px"></span>'; }
  function uuid(){
    if(crypto.randomUUID) return crypto.randomUUID();
    var b=crypto.getRandomValues(new Uint8Array(16)); b[6]=b[6]&15|64; b[8]=b[8]&63|128;
    var h=[].map.call(b,function(x){return (x+256).toString(16).slice(1);}).join('');
    return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
  }
  function fmtTime(iso){ try{ return new Date(iso).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}); }catch(e){ return ''; } }

  // ── PDF (built once per ctx) ──
  function guide(ctx){
    if(!ctx.guidePromise){
      ctx.guidePromise=prepareStudentGuide({name:ctx.name,email:ctx.email,password:ctx.password});
      ctx.guidePromise.catch(function(){ ctx.guidePromise=null; }); // allow "Try again"
    }
    return ctx.guidePromise;
  }

  // ── Edge Function call ──
  async function callFn(body){
    var r=await _sb.auth.getSession(); var sess=r&&r.data&&r.data.session;
    if(!sess) return {ok:false,code:'session_expired',message:'Your admin session expired. Sign out and back in.'};
    var ctl=new AbortController(), t=setTimeout(function(){ctl.abort();},45000);
    try{
      var resp=await fetch(SUPABASE_URL.replace(/\/$/,'')+'/functions/v1/'+FN,{method:'POST',signal:ctl.signal,
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+sess.access_token,'apikey':SUPABASE_KEY},
        body:JSON.stringify(body)});
      var data=null; try{ data=await resp.json(); }catch(e){}
      if(data&&typeof data.ok==='boolean') return data;
      if(resp.status===404) return {ok:false,code:'function_missing',message:'The email function is not deployed yet (send-student-welcome-email).'};
      return {ok:false,code:'http_'+resp.status,message:'The email service returned an error ('+resp.status+'). Please try again.'};
    }catch(e){
      return {ok:false,code:'timeout',message:e&&e.name==='AbortError'
        ?'No response from the email service. Retry — the same email will not be sent twice.'
        :'Could not reach the email service. Check your connection and retry.'};
    }finally{ clearTimeout(t); }
  }

  // ── Channels ──
  async function sendWelcomeEmail(ctx){
    if(ctx.email_state==='sending'||ctx.email_state==='sent') return;
    ctx.requestId=ctx.requestId||uuid();   // one id per credentials + PDF: retries reuse it
    set(ctx,{email_state:'preparing'});
    var g;
    try{ g=await guide(ctx); }
    catch(e){ set(ctx,{email_state:'pdf_failed',pdf_error:(e&&e.message)||String(e)}); return; }
    set(ctx,{email_state:'sending'});
    var res=await callFn({action:'send',studentId:ctx.studentId,requestId:ctx.requestId,pdfBase64:g.base64,kind:ctx.kind});
    if(res.ok&&res.status==='sent') set(ctx,{email_state:'sent',sent_at:res.sentAt,recipient:res.recipient||ctx.email});
    else if(res.code==='in_progress') { set(ctx,{email_state:'sending'}); setTimeout(function(){ if(active===ctx&&ctx.email_state==='sending'){ ctx.email_state='failed'; sendWelcomeEmail(ctx); } },8000); }
    else set(ctx,{email_state:'failed',error_code:res.code,error:res.message||'The email could not be sent.'});
  }
  // Future: async function sendWelcomeMessage(ctx){ … }  (not active)
  var CHANNELS=[sendWelcomeEmail];

  function onStudentCreated(ctx){
    CHANNELS.forEach(function(ch){ try{ ch(ctx); }catch(e){} });
  }

  // ── UI ──
  function set(ctx,patch){ Object.assign(ctx,patch); if(active===ctx) paint(ctx); }

  function emailHtml(ctx){
    var to=escapeHtml(ctx.recipient||ctx.email);
    switch(ctx.email_state){
      case 'preparing': return '<div class="we-row">'+spin()+'<div><b>Welcome email</b><span>Preparing the Student Guide PDF…</span></div></div>';
      case 'sending':   return '<div class="we-row">'+spin()+'<div><b>Welcome email</b><span>Sending to '+to+'…</span></div></div>';
      case 'sent':      return '<div class="we-row ok"><i>'+IC.ok+'</i><div><b>Welcome email — Sent</b><span>Accepted by Brevo for '+to+(ctx.sent_at?' at '+escapeHtml(fmtTime(ctx.sent_at)):'')+'. Inbox delivery is not confirmed.</span></div></div>';
      case 'failed':    return '<div class="we-row bad"><i>'+IC.bad+'</i><div><b>'+(ctx.kind==='welcome'?'Student account created successfully, but the welcome email could not be sent.':'The email could not be sent.')+'</b><span>'+escapeHtml(ctx.error||'')+'</span></div></div>'
                          +'<button type="button" class="adm-btn we-btn" data-we="send">Retry email</button>';
      case 'pdf_failed':return '<div class="we-row bad"><i>'+IC.bad+'</i><div><b>Couldn\'t create the Student Guide PDF.</b><span>'+escapeHtml(ctx.pdf_error||'')+(ctx.kind==='welcome'?' The student account is saved and can sign in.':'')+' No email was sent.</span></div></div>'
                          +'<button type="button" class="adm-btn we-btn" data-we="send">Try again</button>';
      default:          return '<div class="we-row"><i>'+IC.mail+'</i><div><b>Email the guide</b><span>Send this guide with the new sign-in details to '+to+'.</span></div></div>'
                          +'<button type="button" class="adm-btn we-btn" data-we="send">Send email</button>';
    }
  }
  function paint(ctx){
    var box=ctx.el&&ctx.el.querySelector('.we-box'); if(!box) return;
    box.innerHTML=emailHtml(ctx);
    var b=box.querySelector('[data-we="send"]'); if(b) b.onclick=function(){ b.disabled=true; sendWelcomeEmail(ctx); };
  }

  // Render the guide card + email status into `el`. Auto-sends once for new students.
  function mount(el,ctx){
    if(!el||!ctx||!ctx.studentId) return;
    if(active&&active!==ctx) release();
    active=ctx; ctx.el=el; ctx.kind=ctx.kind==='credentials'?'credentials':'welcome';
    var ids='we-'+Math.random().toString(36).slice(2,8);
    el.innerHTML=guideCardHtml({btnId:ids+'-dl',errId:ids+'-err',onclick:'',name:ctx.name})+'<div class="we-box" aria-live="polite"></div>';
    var dl=el.querySelector('#'+ids+'-dl'), err=el.querySelector('#'+ids+'-err');
    if(dl) dl.onclick=async function(){
      err.style.display='none'; var label=dl.innerHTML; dl.disabled=true; dl.innerHTML=spin()+'Preparing PDF…';
      try{ savePreparedGuide(await guide(ctx)); dl.innerHTML='Downloaded ✓'; setTimeout(function(){dl.disabled=false;dl.innerHTML=label;},1800); }
      catch(e){ dl.disabled=false; dl.innerHTML=label; err.textContent='Could not create the PDF: '+((e&&e.message)||e)+'. Try again.'; err.style.display='block'; }
    };
    paint(ctx);
    if(ctx.autoSend&&!ctx.autoStarted){ ctx.autoStarted=true; onStudentCreated(ctx); }
  }

  // Drop the credentials and PDF (result screen closed / replaced).
  function release(){
    if(!active) return;
    ['password','guidePromise','el'].forEach(function(k){ active[k]=null; });
    active=null;
  }

  return {mount:mount,release:release,onStudentCreated:onStudentCreated,sendWelcomeEmail:sendWelcomeEmail};
})();
