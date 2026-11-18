import {readShared,manageShare} from './sharing.js';
import {handleApi} from './api.js';
import {createUserStorage} from './supabase.js';
const json=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
export async function handleRequest(request,env=process.env,fetcher=fetch) {
 const url=new URL(request.url);
 const configured=!!(env.SUPABASE_URL&&env.SUPABASE_ANON_KEY);
 if(url.pathname==='/api/config'&&request.method==='GET')return json({configured,url:env.SUPABASE_URL||'',anonKey:env.SUPABASE_ANON_KEY||''});
 if(!configured)return json({error:'Supabase 연결이 필요해요. 배포 환경변수를 설정해 주세요.'},503);
 if(url.pathname==='/api/shared')return readShared(request,env,fetcher);
 const match=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i);
 if(!match)return json({error:'로그인이 필요합니다.'},401);
 try{
  const r=await fetcher(env.SUPABASE_URL.replace(/\/$/,'')+'/auth/v1/user',{headers:{apikey:env.SUPABASE_ANON_KEY,Authorization:'Bearer '+match[1]},signal:AbortSignal.timeout(10000)});
  if(!r.ok)return json({error:'로그인이 만료되었어요. 다시 로그인해 주세요.'},r.status===401||r.status===403?401:502);
  const user=await r.json();if(!user.id)return json({error:'사용자를 확인하지 못했어요.'},401);
  if(url.pathname==='/api/shares')return manageShare(request,env,user.id,match[1],fetcher);
  return await handleApi(request,{...env,userId:user.id,BUCKET:createUserStorage(env,match[1],user.id,fetcher)});
 }catch{return json({error:'서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.'},502);}
}
