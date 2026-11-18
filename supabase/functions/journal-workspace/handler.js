import{validate}from'../../../src/journal-validation.js';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const json=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
export async function handleWorkspace(request,env,fetcher=fetch){
 const bearer=request.headers.get('authorization');if(!/^Bearer \S+$/i.test(bearer||''))return json({error:'로그인이 필요해요.'},401);
 try{
 const service={apikey:env.key,Authorization:'Bearer '+env.key},auth=await fetcher(env.url+'/auth/v1/user',{headers:{apikey:env.key,Authorization:bearer},signal:AbortSignal.timeout(8000)});if(!auth.ok)return json({error:'로그인이 필요해요.'},401);const user=await auth.json();if(!uuid(user.id))return json({error:'로그인이 필요해요.'},401);
 const rpc=async(name,args)=>{const r=await fetcher(env.url+'/rest/v1/rpc/'+name,{method:'POST',headers:{...service,'content-type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(15000)});if(!r.ok){let code='';try{code=(await r.json()).code;}catch{}throw Object.assign(Error('workspace'),{status:code==='42501'?403:502});}const body=await r.text();return body?JSON.parse(body):null;};
 const url=new URL(request.url),action=url.searchParams.get('action');
 if(action==='list'&&request.method==='GET'){if(user.email_confirmed_at&&user.email)await rpc('workspace_claim',{p_actor:user.id,p_email:user.email.toLowerCase()});return json({items:await rpc('workspace_list',{p_actor:user.id})});}
 const owner=url.searchParams.get('owner'),cid=url.searchParams.get('complex');if(!uuid(owner)||!/^[-\w]{1,80}$/.test(cid||''))return json({error:'아파트를 확인해 주세요.'},400);
 const args={p_actor:user.id,p_owner:owner,p_complex:cid};
 if(action==='load'&&request.method==='GET')return json(await rpc('workspace_load',args));
 if(action==='save'&&request.method==='PUT'){
 const text=await request.text();if(text.length>1048576)return json({error:'저장할 내용이 너무 많아요.'},413);let data;try{data=JSON.parse(text);}catch{return json({error:'기록 형식을 확인해 주세요.'},400);}validate(data.state);if(data.state.complexes.length!==1||data.state.complexes[0].id!==cid)return json({error:'아파트 범위를 확인해 주세요.'},400);
 const result=await rpc('workspace_save',{...args,p_state:data.state,p_revision:typeof data.revision==='string'?data.revision:null});if(result.conflict)return json({error:'다른 회원이 기록을 변경했어요. 작성 내용을 복사한 뒤 새로고침해 주세요.'},409);return json(result);
 }
 if(action==='photo'&&request.method==='POST'){
 if(!await rpc('workspace_access',args))return json({error:'이 아파트에 접근할 수 없어요.'},403);
 const type=request.headers.get('content-type')?.split(';')[0],bytes=new Uint8Array(await request.arrayBuffer());if(bytes.length>4194304||bytes.length<12)return json({error:'사진은 4MB 이하로 선택해 주세요.'},400);
 const ok=type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:type==='image/png'?[137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n):type==='image/webp'?String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP':false;if(!ok)return json({error:'JPG, PNG, WebP 사진을 선택해 주세요.'},400);
 const id=crypto.randomUUID();const r=await fetcher(env.url+'/storage/v1/object/journal-photos/'+owner+'/'+id,{method:'POST',headers:{...service,'content-type':type},body:bytes,signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('upload');await rpc('workspace_upload',{...args,p_photo:id});return json({id});
 }
 if(action==='photo'&&request.method==='GET'){
 const photo=url.searchParams.get('photo');if(!uuid(photo))return json({error:'사진을 찾을 수 없어요.'},404);const data=await rpc('workspace_load',args);if(!data.state.complexes[0].buildings.some(b=>b.visits.some(v=>v.photos.includes(photo))))return json({error:'사진을 찾을 수 없어요.'},404);
 const r=await fetcher(env.url+'/storage/v1/object/authenticated/journal-photos/'+owner+'/'+photo,{headers:service,signal:AbortSignal.timeout(15000)});if(!r.ok)return json({error:'사진을 불러오지 못했어요.'},404);const type=r.headers.get('content-type')?.split(';')[0];if(!['image/jpeg','image/png','image/webp'].includes(type))return json({error:'사진을 불러오지 못했어요.'},404);return new Response(r.body,{headers:{'content-type':type,'cache-control':'no-store','x-content-type-options':'nosniff'}});
 }
 return json({error:'허용되지 않은 요청이에요.'},405);
 }catch(e){return json({error:e.status===403?'초대가 취소되었거나 접근 권한이 없어요.':e.status===400?e.message:'함께 쓰는 기록을 처리하지 못했어요. 다시 시도해 주세요.'},e.status||502);}
}
