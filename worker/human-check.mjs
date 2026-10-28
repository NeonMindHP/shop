export const turnstileConfigured=env=>!!(env.TURNSTILE_SITE_KEY&&env.TURNSTILE_SECRET);
export async function verifyHuman(request,env,token,action){
 if(!turnstileConfigured(env)||typeof token!=='string'||!token||token.length>2048)return false;
 try{
  const secret=typeof env.TURNSTILE_SECRET==='string'?env.TURNSTILE_SECRET:await env.TURNSTILE_SECRET.get();
  if(!secret)return false;
  const response=await (env.TEST_TURNSTILE_FETCH||fetch)('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({secret,response:token,remoteip:request.headers.get('CF-Connecting-IP')||''})});
  if(!response.ok)return false;
  const result=await response.json();
  return result.success===true&&result.action===action&&result.hostname===new URL(request.url).hostname;
 }catch{return false}
}
