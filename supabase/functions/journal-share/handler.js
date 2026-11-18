const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const headers={'cache-control':'no-store','x-content-type-options':'nosniff','x-robots-tag':'noindex, nofollow','referrer-policy':'no-referrer'};
const json=(data,status=200)=>Response.json(data,{status,headers});
export async function handleSharedRead(request,env,fetcher=fetch){
 if(request.method!=='POST')return json({error:'읽기 전용 링크입니다.'},405);
 try{
  const text=await request.text();if(text.length>256)return json({error:'링크를 확인해 주세요.'},404);
  let input;try{input=JSON.parse(text);}catch{return json({error:'링크를 확인해 주세요.'},404);}
  const{token,photo}=input||{};if(!uuid(token)||(photo!==undefined&&!uuid(photo)))return json({error:'공유가 종료되었거나 올바르지 않은 링크예요.'},404);
  const auth={apikey:env.serviceKey,Authorization:'Bearer '+env.serviceKey};
  const read=async(table,params)=>{const url=new URL(env.url+'/rest/v1/'+table);url.search=new URLSearchParams(params);const r=await fetcher(url,{headers:auth,signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('database');return r.json();};
  const shares=await read('journal_shares',{token:'eq.'+token,select:'user_id,complex_id',limit:'1'});const share=shares[0];if(!share)return json({error:'공유가 종료되었거나 올바르지 않은 링크예요.'},404);
  const rows=await read('complexes',{user_id:'eq.'+share.user_id,id:'eq.'+share.complex_id,select:'id,name,address,lat,lng,buildings(id,name,lat,lng,visits(id,date,memo,photos,details))',limit:'1'});
  const complex=rows[0];if(!complex)return json({error:'공유가 종료되었거나 기록이 삭제됐어요.'},404);
  if(photo){
   if(!complex.buildings.some(b=>b.visits.some(v=>Array.isArray(v.photos)&&v.photos.includes(photo))))return json({error:'사진을 찾을 수 없어요.'},404);
   const r=await fetcher(env.url+'/storage/v1/object/authenticated/journal-photos/'+share.user_id+'/'+photo,{headers:auth,signal:AbortSignal.timeout(15000)});
   const type=r.headers.get('content-type')?.split(';')[0];if(!r.ok||!['image/jpeg','image/png','image/webp'].includes(type))return json({error:'사진을 불러오지 못했어요.'},404);
   return new Response(r.body,{headers:{...headers,'content-type':type}});
  }
  return json({complex});
 }catch{return json({error:'공유 기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'},502);}
}
