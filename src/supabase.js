// All requests use the visitor's access token. RLS remains active; no admin key.
export function createUserStorage(env, token, userId, fetcher=fetch) {
 const base=env.SUPABASE_URL.replace(/\/$/,''), headers={apikey:env.SUPABASE_ANON_KEY,Authorization:'Bearer '+token};
 async function call(path,options={}) {
  const r=await fetcher(base+path,{...options,headers:{...headers,...options.headers},signal:AbortSignal.timeout(15000)});
  if(!r.ok){const error=Object.assign(new Error('저장소 요청을 처리하지 못했어요.'),{status:r.status===401?401:502});throw error;}return r;
 }
 const prefix='users/'+encodeURIComponent(userId)+'/';
 const pathFor=key=>{if(!key.startsWith(prefix))throw new Error('Owner mismatch');return key.slice(prefix.length);};
 return {
 async get(key){const p=pathFor(key);
  if(p==='state'){const r=await call('/rest/v1/rpc/journal_load',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}),data=await r.json();return data.revision===null?null:{etag:data.revision,json:async()=>data.state};}
  if(p==='settings'){const r=await call('/rest/v1/user_settings?select=map_key,search_id,search_secret&user_id=eq.'+encodeURIComponent(userId));const [s]=await r.json();return s?{json:async()=>({mapKey:s.map_key,searchId:s.search_id,searchSecret:s.search_secret})}:null;}
  if(p.startsWith('photos/')){const r=await fetcher(base+'/storage/v1/object/authenticated/journal-photos/'+userId+'/'+encodeURIComponent(p.slice(7)),{headers,signal:AbortSignal.timeout(15000)});if(r.status===404||r.status===400)return null;if(!r.ok)throw new Error('Photo read failed');return{body:r.body,httpMetadata:{contentType:r.headers.get('content-type')}};}
  return null;
 },
 async put(key,body,options={}){const p=pathFor(key);
  if(p==='state'){const r=await call('/rest/v1/rpc/journal_save',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({p_state:JSON.parse(body),p_revision:options.onlyIf?.etagMatches||null})});const result=await r.json();return result.conflict?null:{etag:result.revision};}
  if(p==='settings'){const s=JSON.parse(body);await call('/rest/v1/user_settings?on_conflict=user_id',{method:'POST',headers:{'content-type':'application/json',Prefer:'resolution=merge-duplicates'},body:JSON.stringify({user_id:userId,map_key:s.mapKey,search_id:s.searchId,search_secret:s.searchSecret})});return{};}
  if(p.startsWith('photos/')){await call('/storage/v1/object/journal-photos/'+userId+'/'+encodeURIComponent(p.slice(7)),{method:'POST',headers:{'content-type':options.httpMetadata.contentType},body});return{};}
  throw new Error('Unsupported storage path');
 }
 };
}
