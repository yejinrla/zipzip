Deno.serve(()=>Response.json({error:'공개 공유 기능이 종료됐어요. 회원으로 로그인해 주세요.'},{status:410,headers:{'cache-control':'no-store'}}));
