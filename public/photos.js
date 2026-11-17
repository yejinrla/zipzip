import{PhotoLoader}from'../src/photo-loader.js';
const loader=new PhotoLoader({token:()=>window.zipzipAuth.token()});
const targets=new WeakMap();
const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;const{img,id,anchor}=targets.get(entry.target);loader.load(id).then(url=>{if(url&&img.isConnected){img.src=url;if(anchor)anchor.href=url;}}).catch(()=>{img.alt='사진을 불러오지 못했어요. 기록장을 다시 열면 재시도합니다.';});}},{rootMargin:'100px'});
window.zipzipPhotos={attach(img,id,anchor){if(id.startsWith('blob:')){img.src=id;if(anchor)anchor.href=id;return;}img.loading='lazy';targets.set(img,{img,id,anchor});observer.observe(img);},reset(){observer.disconnect();loader.clear();}};
