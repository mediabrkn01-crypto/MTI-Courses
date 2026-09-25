/* supabase-config.js — shared by the student app (index.html) and the admin app (admin.html).
   Only the PUBLIC project URL and anon key live here. The anon key is designed to be public;
   every privileged operation is enforced by RLS or by Edge Functions that verify the caller's JWT.
   Each app creates its OWN Supabase client (js/supabase-client.js / js/admin/admin-supabase.js)
   with its own storage key, so student and admin sessions never share browser storage. */
const SUPABASE_URL = 'https://rbhxufnfzsmkzenqavmf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiaHh1Zm5menNta3plbnFhdm1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0NjMyOTcsImV4cCI6MjA5ODAzOTI5N30.JTZd6bNmsOrqclSuB44ezsCB542OrqdYxtvXvHzAlF0';

// Suppress Supabase realtime DataCloneError (harmless Headers postMessage warning)
(function(){
  var _cw = console.warn.bind(console);
  console.warn = function(){
    var msg = arguments[0];
    if(typeof msg === 'string' && (msg.indexOf('DataCloneError') !== -1 || msg.indexOf('postMessage') !== -1)) return;
    _cw.apply(console, arguments);
  };
})();

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
