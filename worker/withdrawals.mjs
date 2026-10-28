import {customerMailStatement,flushCustomerMail,seal,unseal,validMailbox} from './mail.mjs';
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store'}});
const clean=(s,max)=>typeof s==='string'?s.trim().replace(/[\x00-\x1f\x7f]/g,' ').slice(0,max+1):'';
export async function withdrawalApi(request,env){
 const raw=await request.text();if(raw.length>4096)return json({error:'Die Eingaben sind zu lang.'},413);
 let b;try{b=JSON.parse(raw)}catch{return json({error:'Ungültige Eingaben.'},400)}
 if(!b||typeof b!=='object'||Array.isArray(b))return json({error:'Ungültige Eingaben.'},400);
 const id=clean(b.id,36),name=clean(b.name,100),email=clean(b.email,180).toLowerCase(),contract=clean(b.contract,240),parts=clean(b.parts,400);
 if(b.website||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id)||!name||name.length>100||!validMailbox(email)||email.length>180||!contract||contract.length>240||parts.length>400)return json({error:'Bitte Name, Vertragsangabe und eine gültige E-Mail-Adresse prüfen.'},400);
 let row=await env.DB.prepare('SELECT payload,created_at FROM shop_withdrawals WHERE id=?').bind(id).first(),payload;
 if(row){payload=await unseal(row.payload,env);if(payload.name!==name||payload.email!==email||payload.contract!==contract||payload.parts!==parts)return json({error:'Bitte senden Sie die geänderte Erklärung erneut.'},409)}
 else{
  const now=Date.now(),timestamp=new Intl.DateTimeFormat('de-DE',{dateStyle:'full',timeStyle:'long',timeZone:'Europe/Berlin'}).format(now);
  const declaration='Hiermit widerrufe ich den bezeichneten Vertrag beziehungsweise die angegebenen Leistungen.';
  const receipt='NeonMind · Eingangsbestätigung Ihrer Widerrufserklärung\nReferenz: '+id+'\nEingang: '+timestamp+' (Europe/Berlin)\nName: '+name+'\nVertrag: '+contract+'\nBetroffene Leistungen: '+(parts||'gesamter bezeichneter Vertrag')+'\nE-Mail: '+email+'\n\n'+declaration+'\n\nDiese Bestätigung dokumentiert den Eingang Ihrer Erklärung. Sie enthält noch keine Entscheidung über deren rechtliche Wirkung oder eine Erstattung.\nMarkus Niggemeier / NeonMind, Bauhofstraße 11, 01159 Dresden, info@neonmind-ai.com';
  payload={reference:id,name,email,contract,parts,inquiryKind:'withdrawal',receipt,receivedAt:now};
  await env.DB.batch([
   env.DB.prepare('INSERT INTO shop_withdrawals VALUES(?,?,?)').bind(id,await seal(payload,env),now),
   env.DB.prepare('INSERT INTO shop_messages(id,kind,name,email,subject,body,created_at) VALUES(?,?,?,?,?,?,?)').bind('withdrawal:'+id,'withdrawal',name,email,'Widerruf · '+id.slice(0,8),receipt,now),
   env.DB.prepare('INSERT INTO shop_notifications(message_id) VALUES(?)').bind('withdrawal:'+id),
   await customerMailStatement(env,{id:'withdrawal:'+id,kind:'inquiry',to:email,payload,created_at:now})
  ]);
 }
 // Attempt the durable acknowledgement now; the existing retry queue handles SMTP failures.
 await flushCustomerMail(env,Date.now()+25000,'withdrawal:'+id);
 const sent=await env.DB.prepare('SELECT state FROM shop_customer_mail WHERE id=?').bind('withdrawal:'+id).first();
 return json({ok:true,id,receivedAt:payload.receivedAt,receipt:payload.receipt,mailSent:sent?.state==='sent'},row?200:201);
}
