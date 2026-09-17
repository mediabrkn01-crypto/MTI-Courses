/* supabase-client.js — extracted verbatim from the original single-file index.html.
   Source lines: 626-640, 656-671, 942-951
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
// ─── SUPABASE ────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://rbhxufnfzsmkzenqavmf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiaHh1Zm5menNta3plbnFhdm1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0NjMyOTcsImV4cCI6MjA5ODAzOTI5N30.JTZd6bNmsOrqclSuB44ezsCB542OrqdYxtvXvHzAlF0';
const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Suppress Supabase realtime DataCloneError (harmless Headers postMessage warning)
(function(){
  var _cw = console.warn.bind(console);
  console.warn = function(){
    var msg = arguments[0];
    if(typeof msg === 'string' && (msg.indexOf('DataCloneError') !== -1 || msg.indexOf('postMessage') !== -1)) return;
    _cw.apply(console, arguments);
  };
})();

// Save full student record to Supabase


// Wait for the Supabase client to become available (slow networks load the lib late)
function waitForSb(maxMs){
  return new Promise(function(res){
    var waited=0,step=400;
    (function chk(){
      if(typeof _sb!=='undefined')return res(true);
      waited+=step;
      if(waited>=(maxMs||30000))return res(false);
      setTimeout(chk,step);
    })();
  });
}

// Log quiz score to Supabase
// Test connection on load
(async function(){
  try{
    var r=await _sb.from('students').select('id').limit(1);
    if(r.error) console.warn('Supabase connection warning:', r.error.message);
    else console.log('Supabase connected OK');
  }catch(e){console.warn('Supabase init error:',e);}
})();
