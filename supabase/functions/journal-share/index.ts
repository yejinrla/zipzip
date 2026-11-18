import {handleSharedRead} from './handler.js';
Deno.serve((request:Request)=>handleSharedRead(request,{url:Deno.env.get('SUPABASE_URL'),serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}));
