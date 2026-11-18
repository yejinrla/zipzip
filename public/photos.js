import{PhotoLoader}from'../src/photo-loader.js';
// Photos come straight from Supabase Storage with the user's own session (RLS applies);
// the /api/photos route stays as a fallback.
const loader=new PhotoLoader({token:()=>window.zipzipAuth.token(),download:id=>window.zipzipWorkspace?.active()?null:window.zipzipAuth.photo?window.zipzipAuth.photo(id):null,fetcher:(path,options)=>fetch(window.zipzipWorkspace?.photoPath(decodeURIComponent(path.split('/').pop()))||path,options)});
const targets=new WeakMap();
// A failed photo shows a retry button with a short reason code instead of a broken image.
function showFailure(img,id,anchor,error){const holder=anchor||img;holder.hidden=true;const fail=document.createElement('button');fail.type='button';fail.className='photo-failed';fail.textContent='사진을 불러오지 못했어요. 눌러서 다시 시도';if(error?.code){const code=document.createElement('small');code.textContent=error.code;fail.append(code);}fail.onclick=()=>{fail.remove();holder.hidden=false;load(img,id,anchor);};holder.after(fail);}
function load(img,id,anchor){loader.load(id).then(url=>{if(url&&img.isConnected){img.src=url;if(anchor)anchor.href=url;}}).catch(error=>{if(img.isConnected)showFailure(img,id,anchor,error);});}
const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;observer.unobserve(entry.target);const{img,id,anchor}=targets.get(entry.target);load(img,id,anchor);}},{rootMargin:'100px'});
window.zipzipPhotos={attach(img,id,anchor){if(id.startsWith('blob:')){img.src=id;if(anchor)anchor.href=id;return;}img.loading='lazy';targets.set(img,{img,id,anchor});observer.observe(img);},reset(){observer.disconnect();loader.clear();}};
