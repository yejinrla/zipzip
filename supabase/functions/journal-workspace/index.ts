import{handleWorkspace}from'./handler.js';
Deno.serve((request:Request)=>handleWorkspace(request,{url:Deno.env.get('SUPABASE_URL'),key:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}));
