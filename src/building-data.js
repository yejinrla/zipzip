import {createHash} from 'node:crypto';
const point=p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1])&&p[0]>=124&&p[0]<=132&&p[1]>=33&&p[1]<=39.5;
const messages={
 INCORRECT_KEY:'브이월드 인증이 거절됐어요. 인증키와 등록된 서비스 URL을 확인해 주세요.',
 INVALID_KEY:'브이월드 인증키를 확인해 주세요.',
 UNAVAILABLE_KEY:'브이월드 인증키의 사용 상태와 허용 API를 확인해 주세요.',
 OVER_REQUEST_LIMIT:'브이월드 조회 한도를 초과했어요. 잠시 후 다시 시도해 주세요.',
 INVALID_RANGE:'건물 조회의 지도 범위 형식을 확인해야 해요.',
 INVALID_PARAMETER:'건물 조회 요청의 설정을 확인해야 해요.',
 INVALID_REQUEST:'건물 조회 요청 형식을 확인해야 해요.',
 INVALID_TYPE:'건물 데이터 종류 설정을 확인해야 해요.',
 NETWORK_ERROR:'브이월드에 연결하지 못했어요. 잠시 후 다시 조회해 주세요.',
 TIMEOUT:'브이월드 응답이 지연되고 있어요. 다시 조회해 주세요.',
 INVALID_RESPONSE:'브이월드에서 올바른 건물 데이터를 받지 못했어요.',
 TOO_MANY_RESULTS:'건물 조회 결과가 너무 많아 범위를 조정해야 해요.',
 HTTP_ERROR:'브이월드 서버가 요청을 처리하지 못했어요.',
 PROVIDER_ERROR:'브이월드가 건물 조회를 거절했어요. 서비스 설정을 확인해야 해요.'
};
function providerError(code){const safe=Object.hasOwn(messages,code)?code:'PROVIDER_ERROR';return Object.assign(new Error(messages[safe]),{buildingCode:safe});}
// Names differ between Naver search and the road-address building DB
// (spacing, brand spelling, word order), so fetch every building around the
// complex and match the building name loosely instead of filtering by name.
export const normalizeName=value=>String(value||'').toLowerCase().replace(/이편한세상/g,'e편한세상').replace(/아파트|apt/g,'').replace(/[^\p{L}\p{N}]/gu,'');
function bigrams(s){const out=new Set();for(let i=0;i<s.length-1;i++)out.add(s.slice(i,i+2));return out;}
export function nameSimilarity(a,b){a=normalizeName(a);b=normalizeName(b);if(!a||!b)return 0;if(a===b)return 1;if(Math.min(a.length,b.length)>=3&&(a.includes(b)||b.includes(a)))return .9;const A=bigrams(a),B=bigrams(b);let n=0;for(const x of A)if(B.has(x))n++;return A.size+B.size?2*n/(A.size+B.size):0;}
const BOX={lat:.0045,lng:.0055},PAGE=1000,MAX_PAGES=4,MIN_SCORE=.5;
async function fetchPage(c,env,page){
 const target=new URL('https://api.vworld.kr/req/data');
 target.search=new URLSearchParams({service:'data',request:'GetFeature',version:'2.0',data:'LT_C_SPBD',key:env.VWORLD_API_KEY,domain:env.VWORLD_DOMAIN||'https://zipzip-mu.vercel.app',format:'json',crs:'EPSG:4326',size:String(PAGE),page:String(page),geometry:'true',attribute:'true',geomFilter:`BOX(${c.lng-BOX.lng},${c.lat-BOX.lat},${c.lng+BOX.lng},${c.lat+BOX.lat})`});
 let res;try{res=await (env.fetch||fetch)(target,{signal:AbortSignal.timeout(12000)});}catch(e){throw providerError(e.name==='TimeoutError'||e.name==='AbortError'?'TIMEOUT':'NETWORK_ERROR');}
 if(!res.ok)throw providerError(res.status===429?'OVER_REQUEST_LIMIT':'HTTP_ERROR');
 let r;try{({response:r}=await res.json());}catch{throw providerError('INVALID_RESPONSE');}
 if(r?.status==='NOT_FOUND')return {features:[],total:0};
 if(r?.status!=='OK')throw providerError(r?.error?.code);
 return {features:r.result?.featureCollection?.features||[],total:Number(r.record?.total)||0};
}
function footprint(f,c){
 const p=Object.fromEntries(Object.entries(f.properties||{}).map(([k,v])=>[k.toLowerCase(),v]));
 const building=String(p.buld_nm||'').trim(),name=String(p.buld_nm_dc||'').trim();
 if(!building||!name||name.length>40||!f.id)return null;
 const geometry=f.geometry,polygons=geometry?.type==='Polygon'?[geometry.coordinates]:geometry?.type==='MultiPolygon'?geometry.coordinates:[];
 if(!Array.isArray(polygons)||polygons.length>50)return null;
 const paths=polygons.flatMap(p=>Array.isArray(p)?p:[]);
 if(!paths.length||paths.some(r=>!Array.isArray(r)||r.length<4||r.length>3000||!r.every(point)))return null;
 const points=paths[0];const lng=points.reduce((s,p)=>s+p[0],0)/points.length,lat=points.reduce((s,p)=>s+p[1],0)/points.length;
 if(Math.abs(lat-c.lat)>BOX.lat||Math.abs(lng-c.lng)>BOX.lng)return null;
 return {building,item:{id:'vw_'+createHash('sha256').update(String(f.id)).digest('hex').slice(0,24),name,lat,lng,paths}};
}
export async function loadBuildingData(c,env){
 const first=await fetchPage(c,env,1);let features=first.features;
 const pages=Math.min(MAX_PAGES,Math.ceil(first.total/PAGE));
 if(pages>1){const rest=await Promise.all(Array.from({length:pages-1},(_,i)=>fetchPage(c,env,i+2)));for(const r of rest)features=features.concat(r.features);}
 const groups=new Map();
 for(const f of features){const fp=footprint(f,c);if(!fp)continue;const key=normalizeName(fp.building);if(!key)continue;if(!groups.has(key))groups.set(key,{name:fp.building,items:[],score:nameSimilarity(fp.building,c.name)});groups.get(key).items.push(fp.item);}
 const all=[...groups.values()];const best=Math.max(0,...all.map(g=>g.score));
 const matched=best>=MIN_SCORE?all.filter(g=>g.score>=best-.05):[];
 const items=matched.flatMap(g=>g.items).slice(0,300);
 const near=g=>Math.min(...g.items.map(x=>Math.hypot(x.lat-c.lat,x.lng-c.lng)));
 const candidates=items.length?[]:all.sort((a,b)=>near(a)-near(b)).slice(0,5).map(g=>g.name);
 return {items,candidates};
}
