import {createHash} from 'node:crypto';
const normalize=value=>String(value||'').replace(/아파트|[\s·ㆍ()]/g,'').toLowerCase();
const point=p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1])&&p[0]>=124&&p[0]<=132&&p[1]>=33&&p[1]<=39.5;
export async function loadBuildingData(c,env){
 const target=new URL('https://api.vworld.kr/req/data');
 target.search=new URLSearchParams({service:'data',request:'GetFeature',version:'2.0',data:'LT_C_SPBD',key:env.VWORLD_API_KEY,domain:env.VWORLD_DOMAIN||'https://zipzip-mu.vercel.app',format:'json',crs:'EPSG:4326',size:'1000',page:'1',geometry:'true',attribute:'true',geomFilter:`BOX(${c.lng-.01},${c.lat-.008},${c.lng+.01},${c.lat+.008})`});
 const queryName=c.name.replace(/아파트/g,'').replace(/[^\p{L}\p{N}\s]/gu,'').trim();
 if(!queryName)return [];
 target.searchParams.set('attrFilter','buld_nm:like:'+queryName);
 const res=await (env.fetch||fetch)(target,{signal:AbortSignal.timeout(10000)});
 if(!res.ok)throw Error('provider');
 const {response:r}=await res.json();
 if(r?.status==='NOT_FOUND')return [];
 if(r?.status!=='OK')throw Error('provider');
 if(Number(r.record?.total)>1000)throw Error('Too many buildings');
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
