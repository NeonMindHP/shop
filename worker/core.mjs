import {mailConfig,seal,sendNotice,flushNotifications} from './mail.mjs';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
export async function maintenance(env){const r=await env.DB?.prepare("SELECT value FROM shop_settings WHERE key='maintenance'").first();return r?JSON.parse(r.value):{enabled:false,info:'',status:''};}
export async function isAdmin(env,user){return !!(user&&await env.DB.prepare('SELECT customer_id FROM shop_admins WHERE customer_id=?').bind(user.id).first());}
export async function coreApi(request,env,user){const path=new URL(request.url).pathname;if(!await isAdmin(env,user))return json({error:'Bitte mit deinem freigeschalteten Betreiberkonto anmelden.'},403);const db=env.DB;
 if(path==='/api/admin/core'&&request.method==='GET'){const config=await mailConfig(env);return json({unread:(await db.prepare("SELECT count(*) AS n FROM shop_messages WHERE read_at IS NULL AND folder='inbox'").first()).n,recent:(await db.prepare("SELECT id,kind,subject,created_at FROM shop_messages WHERE folder='inbox' ORDER BY created_at DESC LIMIT 4").all()).results,maintenance:await maintenance(env),mail:{configured:!!config,provider:config?.provider||'gmx',user:config?.user||'',recipient:'info@neonmind-ai.com'},customerNotifications:(await db.prepare("SELECT state,count(*) AS n FROM shop_customer_mail GROUP BY state").all()).results,customerFailures:(await db.prepare("SELECT id,last_error FROM shop_customer_mail WHERE state='failed' LIMIT 5").all()).results,notifications:(await db.prepare("SELECT state,count(*) AS n FROM shop_notifications GROUP BY state").all()).results,failures:(await db.prepare("SELECT message_id,last_error FROM shop_notifications WHERE last_error<>'' LIMIT 5").all()).results});}
 if(path==='/api/admin/mailbox'&&request.method==='GET'){const folder=new URL(request.url).searchParams.get('folder')||'inbox';if(!['inbox','saved','trash'].includes(folder))return json({error:'Ungültiger Ordner'},400);return json({messages:(await db.prepare('SELECT * FROM shop_messages WHERE folder=? ORDER BY created_at DESC LIMIT 200').bind(folder).all()).results});}
 if(path==='/api/admin/users'&&request.method==='GET')return json({users:(await db.prepare('SELECT c.id,c.email,c.created_at,coalesce(s.blocked,0) AS blocked,CASE WHEN a.customer_id IS NULL THEN 0 ELSE 1 END AS admin,(SELECT count(*) FROM customer_orders o WHERE o.customer_id=c.id) AS orders FROM customers c LEFT JOIN shop_user_state s ON s.customer_id=c.id LEFT JOIN shop_admins a ON a.customer_id=c.id ORDER BY c.created_at DESC LIMIT 500').all()).results});
 if(request.method!=='POST')return json({error:'Nicht gefunden'},404);let b;try{b=await request.json()}catch{return json({error:'Ungültige Anfrage'},400)}
 if(path==='/api/admin/mailbox'){
  if(typeof b.id!=='string'||!['read','unread','save','trash','restore'].includes(b.action))return json({error:'Ungültige Aktion'},400);
  const row=await db.prepare('SELECT id FROM shop_messages WHERE id=?').bind(b.id).first();if(!row)return json({error:'Nachricht nicht gefunden'},404);
  if(['read','unread'].includes(b.action))await db.prepare('UPDATE shop_messages SET read_at=? WHERE id=?').bind(b.action==='read'?Date.now():null,b.id).run();else await db.prepare('UPDATE shop_messages SET folder=? WHERE id=?').bind({save:'saved',trash:'trash',restore:'inbox'}[b.action],b.id).run();return json({ok:true});
 }
 if(path==='/api/admin/maintenance'){
  if(typeof b.enabled!=='boolean'||typeof b.info!=='string'||b.info.length>2000||typeof b.status!=='string'||b.status.length>2000)return json({error:'Texte bitte auf jeweils 2000 Zeichen begrenzen.'},400);
  await db.prepare("INSERT INTO shop_settings(key,value) VALUES('maintenance',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify({enabled:b.enabled,info:b.info.trim(),status:b.status.trim()})).run();return json({ok:true});
 }
 if(path==='/api/admin/users'){
  if(typeof b.blocked!=='boolean'||typeof b.id!=='string')return json({error:'Ungültige Aktion'},400);const target=await db.prepare('SELECT id FROM customers WHERE id=?').bind(b.id).first();if(!target)return json({error:'Konto nicht gefunden'},404);if(await isAdmin(env,target))return json({error:'Betreiberkonten können hier nicht gesperrt werden.'},409);
  await db.prepare('INSERT INTO shop_user_state VALUES(?,?) ON CONFLICT(customer_id) DO UPDATE SET blocked=excluded.blocked').bind(b.id,b.blocked?1:0).run();if(b.blocked)await db.prepare('DELETE FROM customer_sessions WHERE customer_id=?').bind(b.id).run();return json({ok:true});
 }
 if(path==='/api/admin/mail-settings'){
  if(!['gmx','ionos'].includes(b.provider)||typeof b.user!=='string'||!/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(b.user)||b.user.length>180)return json({error:'Anbieter und vollständige Absenderadresse prüfen.'},400);
  const previous=await mailConfig(env);const password=typeof b.password==='string'&&b.password?b.password:previous?.user===b.user&&previous?.provider===b.provider?previous.password:'';
  if(!password||password.length>256||/[^\x20-\x7e]/.test(password))return json({error:'Bitte ein SMTP-Passwort eintragen.'},400);
  await db.prepare("INSERT INTO shop_settings VALUES('smtp',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(await seal({provider:b.provider,user:b.user,password},env)).run();return json({ok:true});
 }
 if(path==='/api/admin/mail-test'){try{await sendNotice(env,'test');return json({ok:true,message:'Testmail vom Mailserver angenommen. Bitte auch im Spamordner prüfen.'})}catch{return json({error:'Versand nicht bestätigt. Zugang und SMTP-Freigabe beim Anbieter prüfen.'},502)}}
 if(path==='/api/admin/mail-retry'){await db.prepare("UPDATE shop_customer_mail SET state='pending',attempts=0,next_at=0,last_error='' WHERE state='failed'").run();await flushNotifications(env);return json({ok:true})}
 return json({error:'Nicht gefunden'},404);
}
