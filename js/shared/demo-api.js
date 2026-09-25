/* demo-api.js — thin client for the demo-access Edge Function (deployed as `clever-api`).
   Shared by the student demo runtime (js/services/demo.js: activate/validate)
   and the admin Demo Access panel (js/admin/demo-access.js: create/list/revoke/delete).
   Admin actions pass the admin's Supabase Auth JWT; the Edge Function verifies it
   against admin_users server-side. No secrets here. */
var DEMO_ENDPOINT = SUPABASE_URL + '/functions/v1/clever-api';
async function _demoApi(payload, authToken){
  var res = await fetch(DEMO_ENDPOINT, {
    method:'POST',
    headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':'Bearer '+(authToken||SUPABASE_KEY)},
    body: JSON.stringify(payload)
  });
  var out;
  try{ out = await res.json(); }catch(e){ out = {}; }
  out._httpStatus = res.status;
  return out;
}
