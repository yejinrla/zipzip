import{normalizeName}from'./building-data.js';
const source='국토교통부 · 공동주택관리정보시스템(K-apt)';
const number=v=>v!==null&&v!==undefined&&String(v).trim()!==''&&Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;
const text=v=>typeof v==='string'&&v.trim()&&v.length<=200?v.trim():null;
function infoError(stage,kind){return Object.assign(new Error('단지 기본 정보 조회 실패'),{infoCode:stage+'_'+kind});}
async function request(url,env,stage){let r;try{r=await(env.fetch||fetch)(url,{signal:AbortSignal.timeout(3500)});}catch(e){throw infoError(stage,e.name==='TimeoutError'||e.name==='AbortError'?'TIMEOUT':'NETWORK');}if(!r.ok){const body=(await r.text().catch(()=>'')).replace(/serviceKey=[^&"\s]*/gi,'serviceKey=***').slice(0,200);console.warn('complex_info_provider',stage,r.status,body);throw infoError(stage,[401,403].includes(r.status)?'AUTH':r.status===429?'LIMIT':'HTTP');}try{return await r.json();}catch{throw infoError(stage,'FORMAT');}}
async function kapt(service,operation,params,env){const stage=operation.includes('Legaldong')?'KAPT_LIST':operation.includes('Bass')?'KAPT_BASIC':'KAPT_DETAIL';let key=String(env.DATA_GO_KR_SERVICE_KEY||'').trim();if(!key)throw infoError(stage,'NOKEY');if(/%[0-9A-Fa-f]{2}/.test(key)){try{key=decodeURIComponent(key);}catch{}}const url=new URL('https://apis.data.go.kr/1613000/'+service+'/'+operation);url.search=new URLSearchParams({serviceKey:key,_type:'json',...params});const data=await request(url,env,stage),r=data.response;const code=String(r?.header?.resultCode);if(!r)throw infoError(stage,'FORMAT');if(!['00','0','0000','NORMAL_SERVICE'].includes(code)){console.warn('complex_info_provider',stage,'result',code,String(r?.header?.resultMsg||'').slice(0,80));}if(!['00','0','0000','NORMAL_SERVICE'].includes(code))throw infoError(stage,['20','21','22','30','31','32','33'].includes(code)?'AUTH':['04','05'].includes(code)?'PARAMETER':code==='10'?'LIMIT':'PROVIDER');return r.body||{};}
const items=body=>{const value=Array.isArray(body.items)?body.items:body.items?.item??body.item;return Array.isArray(value)?value:value&&typeof value==='object'?[value]:[];};
export async function loadComplexInfo(c,env){
 const geo=new URL('https://api.vworld.kr/req/address');geo.search=new URLSearchParams({service:'address',request:'getAddress',version:'2.0',crs:'EPSG:4326',point:c.lng+','+c.lat,type:'PARCEL',format:'json',key:env.VWORLD_API_KEY,domain:env.VWORLD_DOMAIN||'https://zipzip-mu.vercel.app'});
 const data=await request(geo,env,'ADDRESS');if(data.response?.status==='NOT_FOUND')return null;if(data.response?.status!=='OK')throw infoError('ADDRESS','RESULT');
 const bjdCode=data.response.result?.[0]?.structure?.level4LC;if(!/^\d{10}$/.test(bjdCode||''))throw infoError('ADDRESS','RESULT');
 const list=await kapt('AptListService4','getLegaldongAptList4',{bjdCode,numOfRows:'1000',pageNo:'1'},env);if(Number(list.totalCount)>1000)throw infoError('KAPT_LIST','TOO_MANY');
 const candidates=items(list).filter(x=>normalizeName(x.kaptName)===normalizeName(c.name));
 if(candidates.length!==1||!/^\w{1,40}$/.test(candidates[0].kaptCode||''))return null;
 const kaptCode=candidates[0].kaptCode;
 const [basic,detail]=await Promise.all([kapt('AptBasisInfoServiceV5','getAphusBassInfoV5',{kaptCode},env),kapt('AptBasisInfoServiceV5','getAphusDtlInfoV5',{kaptCode},env).catch(()=>null)]);
 const b=items(basic)[0];if(!b||normalizeName(b.kaptName)!==normalizeName(c.name)||b.kaptCode!==kaptCode)return null;
 const d=detail?items(detail)[0]:null,date=String(b.kaptUsedate||'');
 let approvedDate=null;if(/^\d{8}$/.test(date)){const formatted=date.slice(0,4)+'-'+date.slice(4,6)+'-'+date.slice(6,8);const parsed=new Date(formatted);if(!Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===formatted)approvedDate=formatted;}
 const above=number(d?.kaptdPcnt),below=number(d?.kaptdPcntu);
 return {name:text(b.kaptName),approvedDate,households:number(b.kaptdaCnt),buildings:number(b.kaptDongCnt),heating:text(b.codeHeatNm),parking:above!==null&&below!==null?above+below:null,source,checkedAt:new Date().toISOString().slice(0,10)};
}
