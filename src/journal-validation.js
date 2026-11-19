const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const str=(v,max)=>typeof v==='string'&&v.length<=max;
const id=v=>typeof v==='string'&&/^[\w-]{1,80}$/.test(v);
const coord=v=>Number.isFinite(v.lat)&&v.lat>=33&&v.lat<=39.5&&Number.isFinite(v.lng)&&v.lng>=124&&v.lng<=132;
const DETAIL_CHOICES={decision:['패스'],deal:['매매','전세','월세'],renovation:['올수리','부분수리','수리 안 됨'],expansion:['확장','부분확장','비확장'],facing:['남향','남동향','남서향','동향','서향','북동향','북서향','북향'],outlook:['트임','일부 가림','막힘'],noise:['조용함','보통','시끄러움'],mold:['없음','조금 있음','심함']};
for(const key of ['cTransport','cInfra','cEnvironment','cManagement','cParking','cComfort'])DETAIL_CHOICES[key]=['좋음','보통','아쉬움'];
const DETAIL_TEXT={cWalk:40,unit:20,price:40,renovatedWhen:20,view:100,moldNote:300};
function validDetails(d){if(d===undefined)return true;if(!d||typeof d!=='object'||Array.isArray(d))return false;return Object.entries(d).every(([k,v])=>DETAIL_CHOICES[k]?DETAIL_CHOICES[k].includes(v):DETAIL_TEXT[k]?str(v,DETAIL_TEXT[k])&&v.trim().length>0:false);}
export function validate(state){
 if(!state||!Array.isArray(state.complexes)||state.complexes.length>200)fail('단지 정보를 확인해 주세요.');
 const seen=new Set();const unique=v=>{if(!id(v)||seen.has(v))fail('중복되거나 올바르지 않은 항목입니다.');seen.add(v);};
 for(const c of state.complexes){unique(c.id);if(!str(c.name,120)||!c.name.trim()||!str(c.address,300)||!coord(c)||!Array.isArray(c.buildings)||c.buildings.length>300)fail('단지 이름과 위치를 확인해 주세요.');
 for(const b of c.buildings){unique(b.id);if(!str(b.name,40)||!b.name.trim()||!coord(b)||!Array.isArray(b.visits)||b.visits.length>500)fail('동 이름과 위치를 확인해 주세요.');
 for(const v of b.visits){unique(v.id);if(!/^\d{4}-\d{2}-\d{2}$/.test(v.date)||Number.isNaN(Date.parse(v.date))||new Date(v.date).toISOString().slice(0,10)!==v.date||!str(v.memo,10000)||!Array.isArray(v.photos)||v.photos.length>12||!v.photos.every(id)||!validDetails(v.details))fail('방문일, 메모 또는 사진을 확인해 주세요.');}}}
}
