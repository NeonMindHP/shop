import {purgeInquiryFiles} from './inquiry-files.mjs';
import {digest} from './auth.mjs';
import {customerMessage} from './customer-mail.mjs';
const enc=new TextEncoder();
const hosts={gmx:'mail.gmx.net',ionos:'smtp.ionos.de'};
async function key(env){return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',enc.encode(env.AUTH_PEPPER+'|shop-smtp-v1')),{name:'AES-GCM'},false,['encrypt','decrypt']);}
export async function seal(value,env){const iv=crypto.getRandomValues(new Uint8Array(12)),cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(env),enc.encode(JSON.stringify(value))));return JSON.stringify({iv:Array.from(iv),cipher:Array.from(cipher)});}
export async function unseal(value,env){const v=JSON.parse(value);return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(v.iv)},await key(env),new Uint8Array(v.cipher))));}
export async function mailConfig(env){const row=await env.DB.prepare("SELECT value FROM shop_settings WHERE key='smtp'").first();return row?unseal(row.value,env):null;}
export function validMailbox(value){return typeof value==='string'&&value.length<=254&&/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);}
const base64=value=>btoa(String.fromCharCode(...enc.encode(value)));
export async function sendNotice(env,kind){
 const label={wish:'Neue Wunschanfrage',contact:'Neue Kontakt-Nachricht',purchase:'Neue bestätigte Bestellung',demo:'Neue Testbestellung',test:'Versandtest'}[kind]||'Neue Bewegung';
 return sendMail(env,{to:'info@neonmind-ai.com',kind,subject:'NeonMind Shop · '+label,text:label+' im NeonMind Onlineshop.\r\n\r\nZum geschützten Postfach: https://shop.neonmind-ai.com/admin\r\n\r\nDiese Nachricht enthält keine Kundendaten.'});
}
export async function sendMail(env,message){
 const c=await mailConfig(env);if(!c)throw Error('Versandzugang fehlt');
 if(!validMailbox(c.user)||!validMailbox(message.to)||/[\r\n]/.test(message.subject))throw Error('Ungültige Mailadresse oder Betreff');
 const outgoing={...message,from:c.user,replyTo:c.user};
 if(env.TEST_SEND_MAIL)return env.TEST_SEND_MAIL(outgoing);
 const {connect}=env.TEST_CONNECT?{connect:env.TEST_CONNECT}:await import('cloudflare:sockets');
 let socket=connect({hostname:hosts[c.provider],port:587},{secureTransport:'starttls'}),reader=socket.readable.getReader(),writer=socket.writable.getWriter(),buffer='';
 const decoder=new TextDecoder();
 const reply=async()=>{for(;;){const lines=buffer.split('\r\n');for(let i=0;i<lines.length-1;i++)if(/^\d{3} /.test(lines[i])){const text=lines.slice(0,i+1).join('\n');buffer=lines.slice(i+1).join('\r\n');if(!/^[23]/.test(lines[i]))throw Error('SMTP hat den Versand abgelehnt');return text;}const r=await reader.read();if(r.done)throw Error('SMTP-Verbindung beendet');buffer+=decoder.decode(r.value,{stream:true});if(buffer.length>32768)throw Error('Ungültige SMTP-Antwort');}};
 const command=async text=>{await writer.write(enc.encode(text+'\r\n'));return reply();};
 const deadline=setTimeout(()=>socket.close().catch(()=>{}),10000);
 try{
  await reply();const hello=await command('EHLO shop.neonmind-ai.com');if(!hello.includes('STARTTLS'))throw Error('SMTP bietet keine sichere Verbindung');await command('STARTTLS');reader.releaseLock();writer.releaseLock();socket=socket.startTls();reader=socket.readable.getReader();writer=socket.writable.getWriter();buffer='';
  await command('EHLO shop.neonmind-ai.com');await command('AUTH LOGIN');await command(btoa(c.user));await command(btoa(c.password));await command('MAIL FROM:<'+c.user+'>');await command('RCPT TO:<'+message.to+'>');await command('DATA');
  const boundary='NeonMind_'+crypto.randomUUID();
  const content=value=>base64(value).match(/.{1,76}/g)?.join('\r\n')||'';
  const headers=['From: NeonMind Shop <'+c.user+'>','Reply-To: '+c.user,'To: '+message.to,'Subject: =?UTF-8?B?'+base64(message.subject)+'?=','Date: '+new Date().toUTCString(),'Message-ID: <'+(message.id?await crypto.subtle.digest('SHA-256',enc.encode(message.id)).then(v=>Array.from(new Uint8Array(v),b=>b.toString(16).padStart(2,'0')).join('')):crypto.randomUUID())+'@shop.neonmind-ai.com>','MIME-Version: 1.0'];
  const parts=message.html?['Content-Type: multipart/alternative; boundary="'+boundary+'"','','--'+boundary,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',content(message.text),'--'+boundary,'Content-Type: text/html; charset=UTF-8','Content-Transfer-Encoding: base64','',content(message.html),'--'+boundary+'--']:['Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',content(message.text)];
  await command([...headers,...parts].join('\r\n')+'\r\n.');try{await command('QUIT')}catch{}
 }finally{clearTimeout(deadline);try{reader.releaseLock();writer.releaseLock();await socket.close();}catch{}}
}
export async function customerMailStatement(env,{id,kind,to,payload,created_at=Date.now()},paidOrder=null){
 if(!validMailbox(to))throw Error('Ungültige Empfängeradresse');
 const encrypted=await seal(payload,env);
 let condition='1=1',args=[id,kind,to,encrypted,created_at];
 if(paidOrder){condition="EXISTS(SELECT 1 FROM customer_orders o JOIN shop_payments p ON p.order_id=o.id WHERE o.id=? AND o.status='paid' AND p.mode='live')";args.push(paidOrder);}
 else if(kind==='inquiry'&&!['withdrawal','password_reset'].includes(payload.inquiryKind)){condition="(SELECT count(*) FROM shop_customer_mail WHERE recipient=? AND kind='inquiry' AND id LIKE 'inquiry:%' AND created_at>?)<3";args.push(to,created_at-900000);}
 return env.DB.prepare('INSERT OR IGNORE INTO shop_customer_mail(id,kind,recipient,payload,created_at) SELECT ?,?,?,?,? WHERE '+condition).bind(...args);
}
export async function messageStatements(env,m){
 const statements=[env.DB.prepare('INSERT OR IGNORE INTO shop_messages(id,kind,name,email,subject,body,created_at) VALUES(?,?,?,?,?,?,?)').bind(m.id,m.kind,m.name||'',m.email||'',m.subject,m.body,m.created_at||Date.now()),env.DB.prepare('INSERT OR IGNORE INTO shop_notifications(message_id) VALUES(?)').bind(m.id)];
 if(['wish','contact'].includes(m.kind))statements.push(await customerMailStatement(env,{id:'inquiry:'+m.id,kind:'inquiry',to:m.email,payload:{reference:m.id,name:m.name,inquiryKind:m.kind},created_at:m.created_at||Date.now()}));
 return statements;
}
export async function queueMessage(env,m){await env.DB.batch(await messageStatements(env,m));}
export async function flushCustomerMail(env,deadline=Date.now()+25000,onlyId=null){
 if(!await mailConfig(env))return;
 await env.DB.prepare("DELETE FROM shop_customer_mail WHERE created_at<?").bind(Date.now()-90*86400000).run();
 const rows=(await env.DB.prepare("SELECT * FROM shop_customer_mail WHERE state IN ('pending','sending') AND next_at<=?"+(onlyId?" AND id=?":"")+" ORDER BY created_at LIMIT 10").bind(...(onlyId?[Date.now(),onlyId]:[Date.now()])).all()).results;
 for(const row of rows){
  if(Date.now()+10000>deadline)break;
  const now=Date.now(),claim=await env.DB.prepare("UPDATE shop_customer_mail SET state='sending',next_at=?,attempts=attempts+1 WHERE id=? AND state IN ('pending','sending') AND next_at<=?").bind(now+120000,row.id,now).run();if(!claim.meta?.changes&&!claim.changes)continue;
  try{
   const payload=await unseal(row.payload,env);
   if(payload.inquiryKind==='password_reset'){const reset=await env.DB.prepare('SELECT token_hash FROM shop_password_resets WHERE token_hash=? AND used_at IS NULL AND expires_at>? AND NOT EXISTS(SELECT 1 FROM shop_user_state WHERE customer_id=shop_password_resets.customer_id AND blocked=1)').bind(await digest(payload.token),Date.now()).first();if(!reset){await env.DB.prepare("UPDATE shop_customer_mail SET state='skipped',last_error='' WHERE id=?").bind(row.id).run();continue;}}
   if(row.kind==='payment'){
    const order=await env.DB.prepare("SELECT o.status,p.mode FROM customer_orders o JOIN shop_payments p ON p.order_id=o.id WHERE o.id=?").bind(payload.reference).first();
    if(order?.status!=='paid'||order?.mode!=='live'){await env.DB.prepare("UPDATE shop_customer_mail SET state='skipped',last_error='' WHERE id=?").bind(row.id).run();continue;}
   }
   await sendMail(env,{id:row.id,kind:'customer_'+row.kind,to:row.recipient,...customerMessage(row.kind,payload)});
   await env.DB.batch([env.DB.prepare("UPDATE shop_customer_mail SET state='sent',sent_at=?,last_error='' WHERE id=?").bind(Date.now(),row.id),...(row.kind==='payment'?[env.DB.prepare("UPDATE shop_order_legal SET confirmation_sent_at=coalesce(confirmation_sent_at,?) WHERE order_id=?").bind(Date.now(),payload.reference)]:[])]);
  }catch{await env.DB.prepare("UPDATE shop_customer_mail SET state=?,last_error='Versand fehlgeschlagen. Zugang und SMTP-Freigabe prüfen.',next_at=? WHERE id=?").bind(row.attempts+1>=6?'failed':'pending',Date.now()+Math.min(3600000,60000*2**row.attempts),row.id).run();}
 }
}
export async function flushNotifications(env){
 const deadline=Date.now()+25000;
 await purgeInquiryFiles(env);
 await env.DB.prepare('DELETE FROM shop_password_resets WHERE expires_at<?').bind(Date.now()).run();
 await env.DB.batch([env.DB.prepare("DELETE FROM shop_notifications WHERE message_id IN (SELECT id FROM shop_messages WHERE kind IN ('wish','contact') AND created_at<? AND NOT EXISTS(SELECT 1 FROM shop_inquiry_files f WHERE f.message_id=shop_messages.id))").bind(Date.now()-90*86400000),env.DB.prepare("DELETE FROM shop_messages WHERE kind IN ('wish','contact') AND created_at<? AND NOT EXISTS(SELECT 1 FROM shop_inquiry_files f WHERE f.message_id=shop_messages.id)").bind(Date.now()-90*86400000),env.DB.prepare('DELETE FROM customization_inquiries WHERE created_at<?').bind(Date.now()-90*86400000)]);
 if(!await mailConfig(env))return;
 const rows=(await env.DB.prepare("SELECT n.message_id,m.kind FROM shop_notifications n JOIN shop_messages m ON m.id=n.message_id WHERE n.state='pending' AND n.next_at<=? ORDER BY m.created_at LIMIT 10").bind(Date.now()).all()).results;
 for(const r of rows){
  if(Date.now()+10000>deadline)break;
  const claim=await env.DB.prepare("UPDATE shop_notifications SET next_at=?,attempts=attempts+1 WHERE message_id=? AND state='pending' AND next_at<=?").bind(Date.now()+300000,r.message_id,Date.now()).run();if(!claim.meta?.changes&&!claim.changes)continue;
  try{await sendNotice(env,r.kind);await env.DB.prepare("UPDATE shop_notifications SET state='sent',sent_at=?,last_error='' WHERE message_id=?").bind(Date.now(),r.message_id).run();}catch{await env.DB.prepare("UPDATE shop_notifications SET last_error='Versand fehlgeschlagen. Zugang und SMTP-Freigabe prüfen.',next_at=? WHERE message_id=?").bind(Date.now()+900000,r.message_id).run();}
 }
 await flushCustomerMail(env,deadline);
}
