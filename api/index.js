import {handleRequest} from '../src/vercel-api.js';
export default async function handler(req,res) {
 try {
  const host=req.headers.host,proto=req.headers['x-forwarded-proto']||'https';
  const headers=new Headers();for(const[k,v]of Object.entries(req.headers))if(v)headers.set(k,Array.isArray(v)?v.join(','):v);
  const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>5*1024*1024){res.statusCode=413;res.end(JSON.stringify({error:'업로드할 내용이 너무 큽니다.'}));return;}chunks.push(chunk);}
  const r=await handleRequest(new Request(proto+'://'+host+req.url,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)}));
  res.statusCode=r.status;for(const[k,v]of r.headers)res.setHeader(k,v);res.end(Buffer.from(await r.arrayBuffer()));
 }catch{res.statusCode=500;res.setHeader('content-type','application/json');res.end(JSON.stringify({error:'요청을 처리하지 못했어요.'}));}
}
export const config={api:{bodyParser:false}};
