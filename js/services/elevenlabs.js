/* elevenlabs.js — extracted verbatim from the original single-file index.html.
   Source lines: 1380-1382, 7074-7243
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
// TTS Edge Function endpoint (ElevenLabs key lives server-side only)
var TTS_ENDPOINT = (typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'') + '/functions/v1/tts';

// ── ELEVENLABS ADMIN — key is a Supabase Edge Function secret ────────────────
// Admin saves only voice preference (not the API key) to DB.
// Set the API key: supabase secrets set ELEVENLABS_API_KEY=your_key
async function adminSaveELSettings(){
  var voice=document.getElementById('el-voice-id')?.value?.trim()||'21m00Tcm4TlvDq8ikWAM';
  var status=document.getElementById('el-status');
  EL_VOICE=voice;
  localStorage.setItem('brokeneng_el_voice',voice);
  if(status) status.textContent='Saving voice preference...';
  try{
    var err=await _sb.from('course_config').upsert({id:'el_voice_pref',data:{voice:voice},updated_at:new Date().toISOString()},{onConflict:'id'});
    if(err.error) throw err.error;
    if(status){status.textContent='✓ Voice saved — API key is set server-side';status.style.color='#4ade80';}
  }catch(e){
    if(status){status.textContent='Saved locally ('+e.message+')';status.style.color='var(--g1)';}
  }
}
async function adminTestEL(){
  var voice=document.getElementById('el-voice-id')?.value?.trim()||EL_VOICE;
  var status=document.getElementById('el-status');
  if(status)status.textContent='Testing TTS Edge Function...';
  try{
    var {data:{session}}=await _sb.auth.getSession();
    if(!session?.access_token)throw new Error('Not authenticated');
    var r=await fetch(TTS_ENDPOINT,{
      method:'POST',
      headers:{'Authorization':'Bearer '+session.access_token,'Content-Type':'application/json'},
      body:JSON.stringify({text:'Hello, welcome to Broken English.',voiceId:voice})
    });
    if(!r.ok)throw new Error('HTTP '+r.status);
    var buf=await r.arrayBuffer();
    new Audio(URL.createObjectURL(new Blob([buf],{type:'audio/mpeg'}))).play();
    if(status){status.textContent='✓ TTS Edge Function working!';status.style.color='#4ade80';}
  }catch(e){
    if(status){status.textContent='✗ '+e.message;status.style.color='#f87171';}
  }
}
async function sbLoadELSettings(){
  // API key never downloaded to browser — only voice preference
  try{
    if(typeof _sb==='undefined')return;
    var r=await _sb.from('course_config').select('data').eq('id','el_voice_pref').single();
    if(!r.error&&r.data&&r.data.data&&r.data.data.voice){
      EL_VOICE=r.data.data.voice;
      localStorage.setItem('brokeneng_el_voice',EL_VOICE);
    }
  }catch(e){}
}



// ── WORD VAULT PRONUNCIATION CHECKER ──────────────────────────────────────────
// ── ELEVENLABS PRONUNCIATION ENGINE ──────────────────────────────────────────
var _wvAudio=null,_wvSpeechWord='',_wvTimer=null;

// ElevenLabs voice — Rachel (natural British/American accent, great for pronunciation)
var EL_VOICE=localStorage.getItem('brokeneng_el_voice')||'21m00Tcm4TlvDq8ikWAM';

// ElevenLabs API key removed from browser localStorage — proxied via TTS Edge Function
function wvGetKey(){ return '_server'; } // key lives in Edge Function secrets only
function wvSetKey(k){ /* no-op: key is set via Supabase CLI secrets set */ }

function wvSpeakWord(){
  if(_wvAudio){ _wvAudio.currentTime=0; _wvAudio.play(); return; }
  if(window.speechSynthesis&&_wvSpeechWord){
    var u=new SpeechSynthesisUtterance(_wvSpeechWord);
    u.lang='en-US'; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
  }
}

// TTS is proxied via Edge Function — API key never reaches the browser
function wvPlayElevenLabs(word, onSuccess, onFail){
  if(!TTS_ENDPOINT||TTS_ENDPOINT==='/functions/v1/tts'){ onFail(); return; }
  _sb.auth.getSession().then(function(res){
    var token=res?.data?.session?.access_token;
    if(!token){ onFail(); return; }
    fetch(TTS_ENDPOINT,{
      method:'POST',
      headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({text:word,voiceId:EL_VOICE})
    })
    .then(function(r){
      if(!r.ok)throw new Error('TTS error '+r.status);
      return r.arrayBuffer();
    })
    .then(function(buf){
      var blob=new Blob([buf],{type:'audio/mpeg'});
      var url=URL.createObjectURL(blob);
      _wvAudio=new Audio(url);
      _wvAudio.play();
      onSuccess();
    })
    .catch(function(e){console.warn('TTS:',e);onFail();});
  }).catch(function(){onFail();});
}

// ElevenLabs API key settings panel removed — key is now a server-side secret.
// Students use TTS via the /functions/v1/tts Edge Function; no key in browser.
function wvShowKeySettings(){
  var el=document.getElementById('wv-el-settings');
  if(el){ el.remove(); return; }
  var panel=document.createElement('div');
  panel.id='wv-el-settings';
  panel.style.cssText='position:fixed;bottom:80px;right:24px;z-index:9999;background:rgba(13,13,28,.98);border:1px solid rgba(255,45,120,.3);border-radius:14px;padding:16px;width:320px;backdrop-filter:blur(30px);box-shadow:0 8px 32px rgba(0,0,0,.5)';
  panel.innerHTML='<div style="font-family:Montserrat,sans-serif;font-weight:700;font-size:13px;color:#fff;margin-bottom:8px">🎙 ElevenLabs TTS</div>'
    +'<p style="font-size:11px;color:rgba(255,255,255,.5);line-height:1.5;margin:0 0 10px">Voice is powered by the Broken English server. No API key needed here.</p>'
    +'<button onclick="document.getElementById(\'wv-el-settings\').remove()" style="width:100%;background:var(--grad);border:none;border-radius:8px;padding:8px;color:#fff;font-weight:700;font-size:12px;cursor:pointer;font-family:Montserrat,sans-serif">OK</button>';
  document.body.appendChild(panel);
}

function wvPronounce(word){
  clearTimeout(_wvTimer);
  var btn=document.getElementById('wv-speak-btn');
  var info=document.getElementById('wv-proninfo');
  if(!word||word.length<2){
    if(btn){ btn.style.display='none'; btn.style.visibility='hidden'; }
    if(info) info.style.display='none';
    _wvAudio=null; _wvSpeechWord=''; return;
  }
  _wvSpeechWord=word;
  if(btn){ btn.style.display='inline-flex'; btn.style.visibility='visible'; }
  _wvTimer=setTimeout(function(){
    var status=document.getElementById('wv-pron-status');
    if(status) status.textContent='Loading...';
    if(info) info.style.display='block';
    document.getElementById('wv-pron-word').textContent=word;
    document.getElementById('wv-pron-ipa').textContent='';

    // 1. Fetch IPA from Free Dictionary (display only)
    fetch('https://api.dictionaryapi.dev/api/v2/entries/en/'+encodeURIComponent(word))
      .then(function(r){return r.json();})
      .then(function(data){
        if(Array.isArray(data)&&data[0]){
          var entry=data[0], ipa='';
          (entry.phonetics||[]).forEach(function(p){ if(p.text&&!ipa) ipa=p.text; });
          if(!ipa&&entry.phonetic) ipa=entry.phonetic;
          document.getElementById('wv-pron-ipa').textContent=ipa||'';
        }
      }).catch(function(){});

    // 2. Play via ElevenLabs if key set, else browser TTS
    var key=wvGetKey();
    if(key){
      if(status) status.textContent='Generating with ElevenLabs...';
      wvPlayElevenLabs(word,
        function(){ if(status) status.textContent='🔊 Playing · ElevenLabs'; },
        function(){
          // Fallback
          _wvAudio=null;
          if(window.speechSynthesis){
            var u=new SpeechSynthesisUtterance(word); u.lang='en-US';
            window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
            if(status) status.textContent='▶ Browser voice (check API key)';
          }
        }
      );
    } else {
      // No key — use browser TTS and nudge to add key
      _wvAudio=null;
      if(window.speechSynthesis){
        var u=new SpeechSynthesisUtterance(word); u.lang='en-US';
        window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
        if(status) status.innerHTML='▶ Browser voice &nbsp;<button onclick="wvShowKeySettings()" style="background:var(--grad);border:none;border-radius:6px;color:#fff;font-size:10px;font-weight:700;padding:3px 8px;cursor:pointer">Add ElevenLabs key</button>';
      }
    }
  },500);
}
