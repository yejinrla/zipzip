import {createHash} from 'node:crypto';
const normalize=value=>String(value||'').replace(/아파트|[\s·ㆍ()]/g,'').toLowerCase();
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
export async function loadBuildingData(c,env){
 const target=new URL('https://api.vworld.kr/req/data');
 target.search=new URLSearchParams({service:'data',request:'GetFeature',version:'2.0',data:'LT_C_SPBD',key:env.VWORLD_API_KEY,domain:env.VWORLD_DOMAIN||'https://zipzip-mu.vercel.app',format:'json',crs:'EPSG:4326',size:'1000',page:'1',geometry:'true',attribute:'true',geomFilter:`BOX(${c.lng-.01},${c.lat-.008},${c.lng+.01},${c.lat+.008})`});
 const queryName=c.name.replace(/아파트/g,'').replace(/[^\p{L}\p{N}\s]/gu,'').trim();
 if(!queryName)return [];
 target.searchParams.set('attrFilter','buld_nm:like:'+queryName);
 let res;try{res=await (env.fetch||fetch)(target,{signal:AbortSignal.timeout(10000)});}catch(e){throw providerError(e.name==='TimeoutError'||e.name==='AbortError'?'TIMEOUT':'NETWORK_ERROR');}
 if(!res.ok)throw providerError(res.status===429?'OVER_REQUEST_LIMIT':'HTTP_ERROR');
 let r;try{({response:r}=await res.json());}catch{throw providerError('INVALID_RESPONSE');}
 if(r?.status==='NOT_FOUND')return [];
 if(r?.status!=='OK')throw providerError(r?.error?.code);
 if(Number(r.record?.total)>1000)throw providerError('TOO_MANY_RESULTS');
 const items=[];
 for(const f of r.result?.featureCollection?.features||[]){
  const p=Object.fromEntries(Object.entries(f.properties||{}).map(([k,v])=>[k.toLowerCase(),v]));
  if(normalize(p.buld_nm)!==normalize(c.name))continue;
  const name=String(p.buld_nm_dc||'').trim();
  if(!name||name.length>40||!f.id)continue;
  const geometry=f.geometry,polygons=geometry?.type==='Polygon'?[geometry.coordinates]:geometry?.type==='MultiPolygon'?geometry.coordinates:[];
  if(!Array.isArray(polygons)||polygons.length>50)continue;
  const paths=polygons.flatMap(p=>Array.isArray(p)?p:[]);
  if(!paths.length||paths.some(r=>!Array.isArray(r)||r.length<4||r.length>3000||!r.every(point)))continue;
  const points=paths[0];const lng=points.reduce((s,p)=>s+p[0],0)/points.length,lat=points.reduce((s,p)=>s+p[1],0)/points.length;
  if(Math.abs(lat-c.lat)>.008||Math.abs(lng-c.lng)>.01)continue;
  items.push({id:'vw_'+createHash('sha256').update(String(f.id)).digest('hex').slice(0,24),name,lat,lng,paths});
 }
 return items.slice(0,300);
}
