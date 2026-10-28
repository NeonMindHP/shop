import {verifyHuman,turnstileConfigured} from './human-check.mjs';
import {readInquiry,validateInquiryFiles} from './inquiry-files.mjs';
import {messageStatements,validMailbox} from './mail.mjs';
import {normalizeEmail} from './auth.mjs';
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store'}});
export async function inquiryApi(request,env){
 let b,files;
 try{({b,files}=await readInquiry(request))}catch(error){return json({error:error.message==='UPLOAD_TOO_LARGE'?'Die Dateien dürfen zusammen höchstens 25 MB groß sein.':'Bitte die Formulareingaben und Dateien prüfen.'},error.message==='UPLOAD_TOO_LARGE'?413:400)}
 if(!b||typeof b!=='object'||Array.isArray(b))return json({error:'Ungültige Anfrage.'},400);
 const contact=new URL(request.url).pathname==='/api/contact',clean=(v,max)=>typeof v==='string'?v.trim().slice(0,max+1):'';
 const name=clean(b.name,100),email=normalizeEmail(clean(b.email,180)),product=clean(contact?(b.subject||'Kontakt'):b.product,120),system=clean(contact?'Kontakt':b.system,180),message=clean(b.message,3000);
 if(b.website||b.consent!==true||name.length<2||name.length>100||!validMailbox(email)||email.length>180||!product||product.length>120||!system||system.length>180||message.length<20||message.length>3000)return json({error:'Bitte alle Pflichtfelder und die Datenschutzhinweise prüfen.'},400);
 let validated;try{validated=await validateInquiryFiles(files)}catch(error){return json({error:error.message},400)}
 if(!turnstileConfigured(env))return json({error:'Die Sicherheitsprüfung ist gerade nicht verfügbar. Bitte versuche es später erneut.'},503);
 if(!await verifyHuman(request,env,b.turnstileToken,contact?'shop_contact':'shop_inquiry'))return json({error:'Bitte die Mensch-Prüfung erneut abschließen.'},403);
 if(files.length&&!env.PRODUCT_FILES?.put)return json({error:'Die Dateiablage ist gerade nicht verfügbar.'},503);
 const id=crypto.randomUUID(),now=Date.now(),stored=[];
 try{
  for(const item of validated){const fileId=crypto.randomUUID(),key='inquiries/'+id+'/'+fileId;stored.push({id:fileId,key,name:item.name,contentType:item.contentType,size:item.file.size});await env.DB.prepare('INSERT INTO shop_inquiry_uploads VALUES(?,?)').bind(key,now).run();await env.PRODUCT_FILES.put(key,await item.file.arrayBuffer(),{httpMetadata:{contentType:item.contentType}})}
  const statements=await messageStatements(env,{id,kind:contact?'contact':'wish',name,email,subject:(contact?'Kontakt · ':'Wunschanfrage · ')+product,body:'Bereich: '+system+'\n'+message+(stored.length?'\n\nAnhänge: '+stored.map(f=>f.name).join(', '):''),created_at:now});
  await env.DB.batch([env.DB.prepare('DELETE FROM customization_inquiries WHERE created_at<?').bind(now-90*86400000),env.DB.prepare('INSERT INTO customization_inquiries VALUES(?,?,?,?,?,?,?)').bind(id,name,email,product,system,message,now),...statements,...stored.map(file=>env.DB.prepare('INSERT INTO shop_inquiry_files VALUES(?,?,?,?,?,?,?)').bind(file.id,id,file.key,file.name,file.contentType,file.size,now)),...stored.map(file=>env.DB.prepare('DELETE FROM shop_inquiry_uploads WHERE object_key=?').bind(file.key))]);
  return json({ok:true,id,attachments:stored.length},201);
 }catch{
  for(const file of stored){try{await env.PRODUCT_FILES.delete(file.key);await env.DB.prepare('DELETE FROM shop_inquiry_uploads WHERE object_key=?').bind(file.key).run()}catch{/* No public object URL; retry through operational cleanup if needed. */}}
  return json({error:'Die Anfrage konnte gerade nicht gespeichert werden. Deine Eingaben bleiben erhalten.'},503);
 }
}
