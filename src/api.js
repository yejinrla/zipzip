import {validate} from './journal-validation.js';
import {loadComplexInfo} from './complex-info.js';
import {loadBuildingData} from './building-data.js';
const json=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const str=(v,max)=>typeof v==='string'&&v.length<=max;
const id=v=>typeof v==='string'&&/^[\w-]{1,80}$/.test(v);
const coord=v=>Number.isFinite(v.lat)&&v.lat>=33&&v.lat<=39.5&&Number.isFinite(v.lng)&&v.lng>=124&&v.lng<=132;
async function limitedJson(request,max=1024*1024){const t=await request.text();if(t.length>max)fail('저장할 내용이 너무 많습니다.',413);try{return JSON.parse(t);}catch{fail('요청 형식을 확인해 주세요.');}}
async function settings(env,key){const o=await env.BUCKET.get(key+'/settings');return o?await o.json():{};}
export async function handleApi(request,env){try{
 const user=env.userId;if(!user)return json({error:'로그인이 필요합니다.'},401);
 if(!env.BUCKET)return json({error:'서버 저장소가 연결되지 않았습니다.'},503);
 const owner='users/'+encodeURIComponent(user),url=new URL(request.url),p=url.pathname,method=request.method;
 if(!['GET','HEAD'].includes(method)&&request.headers.get('origin')&&request.headers.get('origin')!==url.origin)return json({error:'허용되지 않은 요청입니다.'},403);
 if(p==='/api/settings'){
 const current=await settings(env,owner);
 if(method==='GET')return json({mapKey:current.mapKey||env.NAVER_MAP_KEY||'',searchConfigured:!!((current.searchId||env.NAVER_SEARCH_ID)&&(current.searchSecret||env.NAVER_SEARCH_SECRET))});
 if(method==='POST'){const s=await limitedJson(request,10000);if(!str(s.mapKey,200)||!str(s.searchId,200)||!str(s.searchSecret,500))fail('키 형식을 확인해 주세요.');await env.BUCKET.put(owner+'/settings',JSON.stringify({mapKey:s.mapKey.trim(),searchId:s.searchId.trim()||current.searchId||'',searchSecret:s.searchSecret.trim()||current.searchSecret||''}));return json({ok:true});}
 }
 if(p==='/api/recent'){
 if(method==='GET'){const o=await env.BUCKET.get(owner+'/recent'),saved=o?await o.json():{};return json({ids:Array.isArray(saved.ids)?saved.ids.filter(id).slice(0,8):[]});}
 if(method==='PUT'){const {ids}=await limitedJson(request,10000);if(!Array.isArray(ids)||ids.length>8||!ids.every(id)||new Set(ids).size!==ids.length)fail('최근 검색 목록을 확인해 주세요.');await env.BUCKET.put(owner+'/recent',JSON.stringify({ids}));return json({ok:true});}
 }
 if(p==='/api/state'){
 const key=owner+'/state',old=await env.BUCKET.get(key);
 if(method==='GET')return json({state:old?await old.json():{complexes:[]},revision:old?.etag||null});
 if(method==='PUT'){const {state,revision}=await limitedJson(request);validate(state);if((old?.etag||null)!==revision)return json({error:'다른 화면에서 기록이 변경됐어요. 내용을 복사한 뒤 새로고침해 주세요.'},409);
 const saved=await env.BUCKET.put(key,JSON.stringify(state),{onlyIf:revision?{etagMatches:revision}:{etagDoesNotMatch:'*'},httpMetadata:{contentType:'application/json'}});if(!saved)return json({error:'다른 화면에서 변경됐어요. 새로고침 후 다시 시도해 주세요.'},409);return json({revision:saved.etag});}
 }
 if(p==='/api/complex-info'&&method==='GET'){
 const saved=await env.BUCKET.get(owner+'/state'),state=saved?await saved.json():{complexes:[]},c=state.complexes.find(c=>c.id===url.searchParams.get('complex'));
 if(!c)return json({error:'단지를 찾을 수 없습니다.'},404);
 if(!env.DATA_GO_KR_SERVICE_KEY||!env.VWORLD_API_KEY)return json({error:'단지 기본 정보 연결을 준비 중이에요.',code:'NOT_CONFIGURED'},503);
 try{return json({info:await loadComplexInfo(c,env)});}catch(e){const stages=['ADDRESS','KAPT_LIST','KAPT_BASIC','KAPT_DETAIL'],kinds=['TIMEOUT','NETWORK','AUTH','LIMIT','HTTP','FORMAT','PARAMETER','PROVIDER','RESULT','TOO_MANY'];const code=stages.some(s=>kinds.some(k=>e.infoCode===s+'_'+k))?e.infoCode:'INFO_UNKNOWN';console.warn('complex_info_failed',code);const help=code.endsWith('_AUTH')?'API 인증키와 서비스 활용승인 상태를 확인해야 해요.':code.endsWith('_TIMEOUT')?'외부 API 응답이 지연되고 있어요. 다시 시도해 주세요.':'단지 기본 정보를 불러오지 못했어요. 다시 시도해 주세요.';return json({error:help+' ['+code+']',code},502);}
 }
 if(p==='/api/buildings'&&method==='GET'){
 const saved=await env.BUCKET.get(owner+'/state'),state=saved?await saved.json():{complexes:[]};
 const c=state.complexes.find(c=>c.id===url.searchParams.get('complex'));
 if(!c)return json({error:'단지를 찾을 수 없습니다.'},404);
 if(!env.VWORLD_API_KEY)return json({error:'자동 동 조회를 연결하려면 브이월드 인증키 설정이 필요해요.'},503);
 try{const found=await loadBuildingData(c,env);return json({items:found.items,candidates:found.candidates,source:'행정안전부 도로명주소 건물 · 브이월드'});}catch(e){const code=e.buildingCode||'PROVIDER_ERROR';console.warn('building_lookup_failed',code);return json({error:e.buildingCode?e.message+' ['+code+']':'건물 정보를 처리하지 못했어요. [PROVIDER_ERROR]',code},502);}
 }
 if(p==='/api/search'&&method==='GET'){
 const q=url.searchParams.get('q')?.trim();if(!q||q.length>100)fail('검색어를 1~100자로 입력해 주세요.');const s=await settings(env,owner),clientId=s.searchId||env.NAVER_SEARCH_ID,secret=s.searchSecret||env.NAVER_SEARCH_SECRET;if(!clientId||!secret)return json({error:'설정에서 네이버 지역 검색 Client ID와 Client Secret을 연결해 주세요.'},503);
 const target=new URL('https://naverapihub.apigw.ntruss.com/search/v1/local');target.search=new URLSearchParams({query:q,display:'5',sort:'random',format:'json'});let res;try{res=await (env.fetch||fetch)(target,{headers:{'X-NCP-APIGW-API-KEY-ID':clientId,'X-NCP-APIGW-API-KEY':secret},signal:AbortSignal.timeout(10000)});}catch{return json({error:'검색 서비스 연결이 지연되고 있어요. 다시 시도해 주세요.'},502);}if(!res.ok)return json({error:'네이버 검색 요청을 처리하지 못했어요. API 키와 사용량을 확인해 주세요.'},502);
 const data=await res.json();return json({items:(data.items||[]).map(x=>({name:x.title.replace(/<[^>]*>/g,''),address:x.roadAddress||x.address,lat:Math.abs(Number(x.mapy))>90?Number(x.mapy)/1e7:Number(x.mapy),lng:Math.abs(Number(x.mapx))>180?Number(x.mapx)/1e7:Number(x.mapx)})).filter(coord)});
 }
 if(p==='/api/photos'&&method==='POST'){
 const type=request.headers.get('content-type')?.split(';')[0];if(!['image/jpeg','image/png','image/webp'].includes(type))fail('JPG, PNG, WebP 사진을 선택해 주세요.');
 if(Number(request.headers.get('content-length'))>4*1024*1024)fail('사진은 한 장당 4MB 이하로 올려 주세요.',413);const bytes=await request.arrayBuffer();if(bytes.byteLength>4*1024*1024||bytes.byteLength<8)fail('사진은 한 장당 4MB 이하로 올려 주세요.',413);
 const a=new Uint8Array(bytes),valid=type==='image/jpeg'?a[0]===255&&a[1]===216:type==='image/png'?a[0]===137&&a[1]===80&&a[2]===78&&a[3]===71:String.fromCharCode(...a.slice(0,4))==='RIFF'&&String.fromCharCode(...a.slice(8,12))==='WEBP';if(!valid)fail('유효한 사진 파일을 선택해 주세요.');
 const photoId=crypto.randomUUID();await env.BUCKET.put(owner+'/photos/'+photoId,bytes,{httpMetadata:{contentType:type}});return json({id:photoId});
 }
 if(p.startsWith('/api/photos/')&&method==='GET'){const photoId=p.slice(12);if(!id(photoId))return json({error:'사진을 찾을 수 없습니다.',code:'PHOTO_BAD_ID'},404);let obj;try{obj=await env.BUCKET.get(owner+'/photos/'+photoId);}catch(e){return json({error:'사진 저장소에서 읽지 못했어요.',code:'PHOTO_READ_'+(e.photoStatus||'ERROR')},502);}if(!obj)return json({error:'사진을 찾을 수 없습니다.',code:'PHOTO_NOT_FOUND'},404);return new Response(obj.body,{headers:{'content-type':obj.httpMetadata?.contentType||'application/octet-stream','cache-control':'no-store','x-content-type-options':'nosniff'}});}
 return json({error:'요청을 찾을 수 없습니다.'},404);
 }catch(e){return json({error:e.status?e.message:'요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.'},e.status||500);}}
