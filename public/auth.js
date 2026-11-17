import {createClient} from '@supabase/supabase-js';
const $=s=>document.querySelector(s);
let client=null,resolveReady,mode='signin',settled=false;
const ready=new Promise(resolve=>resolveReady=resolve);
function settle(user){if(!settled){settled=true;resolveReady(user);}}
function message(text){$('#auth-message').textContent=text;}
function show(modeNext){$('#auth-gate').hidden=false;$('#app-shell').hidden=true;mode=modeNext;$('#auth-title').textContent={signin:'나의 임장 기록으로',signup:'나만의 기록장 만들기',recover:'비밀번호 재설정',update:'새 비밀번호 설정'}[mode];$('#auth-submit').textContent={signin:'로그인',signup:'회원가입',recover:'재설정 메일 보내기',update:'비밀번호 변경'}[mode];$('#auth-password-row').hidden=mode==='recover';$('#auth-email-row').hidden=mode==='update';$('#auth-password').autocomplete=mode==='signin'?'current-password':'new-password';$('#auth-password').required=mode!=='recover';$('#auth-email').required=mode!=='update';message('');}
window.zipzipAuth={ready,async token(){if(!client)return null;const{data:{session}}=await client.auth.getSession();return session?.access_token||null;},async signout(){if(!client)return;const{error}=await client.auth.signOut();if(error){message('로그아웃하지 못했어요. 다시 시도해 주세요.');return;}location.reload();}};
$('#auth-form').onsubmit=async e=>{e.preventDefault();if(!client)return;const button=$('#auth-submit');button.disabled=true;message('처리 중…');try{
 const email=$('#auth-email').value.trim(),password=$('#auth-password').value;
 let result;
 if(mode==='signup')result=await client.auth.signUp({email,password,options:{emailRedirectTo:location.origin+'/'}});
 else if(mode==='recover')result=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/?recovery=1'});
 else if(mode==='update')result=await client.auth.updateUser({password});
 else result=await client.auth.signInWithPassword({email,password});
 if(result.error)throw result.error;
 if(mode==='recover'){message('가입된 이메일이라면 재설정 메일이 발송됩니다. 메일함을 확인해 주세요.');return;}
 if(mode==='signup'&&!result.data.session){message('인증 메일을 확인해 주세요. 메일의 링크를 누른 뒤 로그인할 수 있어요.');return;}
 location.replace(location.origin+'/');
 }catch(error){message(error.status===429?'요청이 많아요. 잠시 후 다시 시도해 주세요.':mode==='signin'?'로그인하지 못했어요. 이메일·비밀번호와 메일 인증 여부를 확인해 주세요.':mode==='update'?'비밀번호를 변경하지 못했어요. 새 재설정 메일을 요청해 주세요.':'처리하지 못했어요. 이메일과 비밀번호(8자 이상)를 확인해 주세요.');}finally{button.disabled=false;}};
$('#auth-signup').onclick=()=>show('signup');$('#auth-signin').onclick=()=>show('signin');$('#auth-recover').onclick=()=>show('recover');$('#signout').onclick=()=>{if(window.confirm('로그아웃할까요? 저장하지 않은 내용은 사라져요.'))window.zipzipAuth.signout();};
(async()=>{try{const res=await fetch('/api/config');if(!res.ok)throw new Error();const config=await res.json();if(!config.configured){$('#auth-gate').hidden=false;$('#auth-card').hidden=true;$('#setup-card').hidden=false;settle(null);return;}
 client=createClient(config.url,config.anonKey,{auth:{detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
 client.auth.onAuthStateChange((event)=>{if(event==='PASSWORD_RECOVERY'){show('update');$('#auth-gate').hidden=false;$('#app-shell').hidden=true;}if(event==='SIGNED_OUT'){location.reload();}});
 const{data:{session},error}=await client.auth.getSession();if(error)throw error;
 if(new URLSearchParams(location.search).has('recovery')){show(session?'update':'recover');$('#auth-gate').hidden=false;$('#app-shell').hidden=true;settle(null);return;}
 if(session){$('#auth-gate').hidden=true;$('#app-shell').hidden=false;$('#account-email').textContent=session.user.email||'내 계정';settle(session.user);}else{show('signin');settle(null);}
 }catch{$('#auth-gate').hidden=false;$('#app-shell').hidden=true;$('#auth-card').hidden=false;message('인증 서비스에 연결하지 못했어요. 배포 설정과 네트워크를 확인해 주세요.');settle(null);}finally{$('#auth-loading').hidden=true;}})();
