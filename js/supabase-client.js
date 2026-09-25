/* supabase-client.js — STUDENT app Supabase client (index.html only).
   URL/anon key + waitForSb() live in js/shared/supabase-config.js.
   Uses supabase-js's default session storage key. The admin app uses a separate key
   (see js/admin/admin-supabase.js), so an admin sign-in never replaces a student's session. */
const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Test connection on load
(async function(){
  try{
    var r=await _sb.from('students').select('id').limit(1);
    if(r.error) console.warn('Supabase connection warning:', r.error.message);
    else console.log('Supabase connected OK');
  }catch(e){console.warn('Supabase init error:',e);}
})();
