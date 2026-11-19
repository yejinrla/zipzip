import {workspaceProxy,collaborators,workspaceInfo} from './workspace.js';
import {handleApi} from './api.js';
import {createUserStorage} from './supabase.js';
const json=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
export async function handleRequest(request,env=process.env,fetcher=fetch) {
 const url=new URL(request.url);
 const configured=!!(env.SUPABASE_URL&&env.SUPABASE_ANON_KEY);
 if(url.pathname==='/api/config'&&request.method==='GET')return json({configured,url:env.SUPABASE_URL||'',anonKey:env.SUPABASE_ANON_KEY||''});
 if(!configured)return json({error:'Supabase 연결이 필요해요. 배포 환경변수를 설정해 주세요.'},503);
 if(url.pathname==='/api/shared'||url.pathname==='/api/shares')return json({error:'공개 링크 공유가 종료됐어요. 로그인 후 함께 기록하기를 이용해 주세요.'},410);
 const match=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i);
 if(!match)return json({error:'로그인이 필요합니다.'},401);
 try{
  const r=await fetcher(env.SUPABASE_URL.replace(/\/$/,'')+'/auth/v1/user',{headers:{apikey:env.SUPABASE_ANON_KEY,Authorization:'Bearer '+match[1]},signal:AbortSignal.timeout(10000)});
  if(!r.ok)return json({error:'로그인이 만료되었어요. 다시 로그인해 주세요.'},r.status===401||r.status===403?401:502);
  const user=await r.json();if(!user.id)return json({error:'사용자를 확인하지 못했어요.'},401);
  if(['/api/workspace/buildings','/api/workspace/complex-info'].includes(url.pathname))return workspaceInfo(request,env,match[1],fetcher);
  if(url.pathname==='/api/collaborators')return collaborators(request,env,user,match[1],fetcher);
  if(['/api/workspace','/api/workspace/state','/api/workspace/photo','/api/workspace/members'].includes(url.pathname))return workspaceProxy(request,env,match[1],fetcher);
  return await handleApi(request,{...env,userId:user.id,BUCKET:createUserStorage(env,match[1],user.id,fetcher)});
 }catch{return json({error:'서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.'},502);}
}
