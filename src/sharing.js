const json=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','x-robots-tag':'noindex, nofollow'}});
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export async function readShared(request,env,fetcher=fetch){
 if(request.method!=='GET')return json({error:'읽기 전용 링크입니다.'},405);
 const token=request.headers.get('x-share-token'),photo=new URL(request.url).searchParams.get('photo');if(!uuid(token)||(photo!==null&&!uuid(photo)))return json({error:'공유 링크를 확인해 주세요.'},404);
 try{const r=await fetcher(env.SUPABASE_URL.replace(/\/$/,'')+'/functions/v1/journal-share',{method:'POST',headers:{apikey:env.SUPABASE_ANON_KEY,'content-type':'application/json'},body:JSON.stringify({token,...(photo?{photo}:{})}),signal:AbortSignal.timeout(25000)});return new Response(r.body,{status:r.status,headers:{'content-type':r.headers.get('content-type')||'application/json','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','x-robots-tag':'noindex, nofollow'}});}catch{return json({error:'공유 기록을 불러오지 못했어요.'},502);}
}
export async function manageShare(request,env,userId,accessToken,fetcher=fetch){
 const url=new URL(request.url),cid=url.searchParams.get('complex');
 if(!cid||!/^[-\w]{1,80}$/.test(cid))return json({error:'단지를 확인해 주세요.'},400);
 if(!['GET','POST','DELETE'].includes(request.method))return json({error:'허용되지 않은 요청입니다.'},405);
 if(request.method!=='GET'&&request.headers.get('origin')&&request.headers.get('origin')!==url.origin)return json({error:'허용되지 않은 요청입니다.'},403);
 const auth={apikey:env.SUPABASE_ANON_KEY,Authorization:'Bearer '+accessToken};
 const rest=async(table,params,opts={})=>{const target=new URL(env.SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/'+table);target.search=new URLSearchParams(params);const r=await fetcher(target,{...opts,headers:{...auth,...opts.headers},signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('database');if(r.status===204)return null;const body=await r.text();return body?JSON.parse(body):null;};
 try{
 const rows=await rest('complexes',{id:'eq.'+cid,user_id:'eq.'+userId,select:'id',limit:'1'});if(!rows.length)return json({error:'단지를 찾을 수 없어요.'},404);
 const params={user_id:'eq.'+userId,complex_id:'eq.'+cid,select:'token'};
 if(request.method==='DELETE'){await rest('journal_shares',params,{method:'DELETE'});return json({token:null});}
 let shares=await rest('journal_shares',params);if(request.method==='POST'&&!shares.length){await rest('journal_shares',{on_conflict:'user_id,complex_id'},{method:'POST',headers:{'content-type':'application/json',Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify({user_id:userId,complex_id:cid})});shares=await rest('journal_shares',params);}
 return json({token:shares[0]?.token||null});
 }catch{return json({error:'공유 설정을 처리하지 못했어요. 다시 시도해 주세요.'},502);}
}
