import {limitedText} from './request-body.mjs';
import {digest,randomToken,normalizeEmail,validPassword,hashPassword} from './auth.mjs';
import {customerMailStatement,validMailbox} from './mail.mjs';
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store'}});
const generic={ok:true,message:'Wenn ein aktives Konto zu dieser Adresse vorhanden ist, erhältst du eine E-Mail mit einem Link zum Zurücksetzen. Bitte prüfe auch deinen Spamordner.'};
async function allowRequest(db,key,max){
 const now=Date.now(),hash=await digest(key);
 await db.prepare('INSERT INTO auth_attempts VALUES(?,1,?) ON CONFLICT(key_hash) DO UPDATE SET attempts=CASE WHEN window_start<? THEN 1 ELSE attempts+1 END,window_start=CASE WHEN window_start<? THEN excluded.window_start ELSE window_start END').bind(hash,now,now-900000,now-900000).run();
 return (await db.prepare('SELECT attempts FROM auth_attempts WHERE key_hash=?').bind(hash).first()).attempts<=max;
}
export async function passwordResetApi(request,env){
 if(!env.AUTH_PEPPER||env.AUTH_PEPPER.length<32)return json({error:'Die Kontofunktion ist gerade nicht verfügbar.'},503);
 let raw;try{raw=await limitedText(request,2048)}catch{return json({error:'Anfrage zu groß.'},413)}
 let b;try{b=JSON.parse(raw)}catch{return json({error:'Bitte deine Eingaben prüfen.'},400)}
 if(!b||typeof b!=='object'||Array.isArray(b))return json({error:'Bitte deine Eingaben prüfen.'},400);
 const db=env.DB,now=Date.now(),ip=request.headers.get('CF-Connecting-IP')||'local';
 if(new URL(request.url).pathname==='/api/password-reset/request'){
  const email=normalizeEmail(b.email);
  if(!validMailbox(email))return json({error:'Bitte eine gültige E-Mail-Adresse eingeben.'},400);
  const limits=await Promise.all([allowRequest(db,'reset-ip:'+ip,10),allowRequest(db,'reset-email:'+email,3)]);
  if(limits.some(ok=>!ok))return json(generic,202);
  const user=await db.prepare('SELECT id,email FROM customers WHERE email=? AND NOT EXISTS(SELECT 1 FROM shop_user_state WHERE customer_id=customers.id AND blocked=1)').bind(email).first();
  if(user){
   const token=randomToken(),tokenHash=await digest(token);
   await db.batch([db.prepare('DELETE FROM shop_password_resets WHERE customer_id=? OR expires_at<?').bind(user.id,now),db.prepare('INSERT INTO shop_password_resets VALUES(?,?,?,?,NULL)').bind(tokenHash,user.id,now+1800000,now),await customerMailStatement(env,{id:'password-reset:'+crypto.randomUUID(),kind:'inquiry',to:user.email,payload:{reference:user.id,inquiryKind:'password_reset',token,expiresAt:now+1800000}})]);
  }
  return json(generic,202);
 }
 if(!await allowRequest(db,'reset-complete:'+ip,10))return json({error:'Zu viele Versuche. Bitte warte 15 Minuten.'},429);
 if(typeof b.token!=='string'||!/^[a-f0-9]{64}$/.test(b.token)||!validPassword(b.password))return json({error:'Bitte einen gültigen Link und ein Passwort mit 12 bis 128 Zeichen verwenden.'},400);
 const tokenHash=await digest(b.token),row=await db.prepare('SELECT r.customer_id,c.email FROM shop_password_resets r JOIN customers c ON c.id=r.customer_id WHERE r.token_hash=? AND r.used_at IS NULL AND r.expires_at>? AND NOT EXISTS(SELECT 1 FROM shop_user_state WHERE customer_id=c.id AND blocked=1)').bind(tokenHash,now).first();
 if(!row)return json({error:'Dieser Link ist ungültig, abgelaufen oder wurde bereits verwendet. Bitte fordere einen neuen Link an.'},400);
 const passwordHash=await hashPassword(b.password,env.AUTH_PEPPER);
 const result=await db.batch([
  db.prepare('UPDATE customers SET password_hash=? WHERE id=? AND EXISTS(SELECT 1 FROM shop_password_resets WHERE token_hash=? AND used_at IS NULL AND expires_at>?) AND NOT EXISTS(SELECT 1 FROM shop_user_state WHERE customer_id=customers.id AND blocked=1)').bind(passwordHash,row.customer_id,tokenHash,Date.now()),
  db.prepare('DELETE FROM customer_sessions WHERE customer_id=? AND EXISTS(SELECT 1 FROM customers WHERE id=? AND password_hash=?)').bind(row.customer_id,row.customer_id,passwordHash),
  db.prepare('UPDATE shop_password_resets SET used_at=? WHERE customer_id=? AND EXISTS(SELECT 1 FROM customers WHERE id=? AND password_hash=?)').bind(Date.now(),row.customer_id,row.customer_id,passwordHash)
 ]);
 if(!(result[0].meta?.changes||result[0].changes))return json({error:'Dieser Link wurde bereits verwendet. Bitte fordere einen neuen Link an.'},400);
 return json({ok:true,message:'Dein Passwort wurde geändert. Bitte melde dich mit deinem neuen Passwort an.'});
}
