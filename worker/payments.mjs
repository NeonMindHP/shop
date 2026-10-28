import {taxCategories} from '../dist/tax-categories.js';
import {legalVersion,orderLegalSnapshot} from '../dist/commerce-legal.js';
import {customerMailStatement,unseal,validMailbox} from './mail.mjs';
import {catalog} from './admin.mjs';
import {isAdmin,maintenance} from './core.mjs';
import {randomToken,digest,normalizeEmail} from './auth.mjs';
import {validateDesign} from './design.mjs';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
async function mailOrderPayload(env,order,selected=null){
 if(!selected){
  const previous=await env.DB.prepare('SELECT payload FROM shop_customer_mail WHERE id=?').bind('order:'+order.id).first();
  if(previous)return unseal(previous.payload,env);
  const catalogItems=await catalog(env.DB),items=(await env.DB.prepare('SELECT product_id,price FROM customer_order_items WHERE order_id=?').bind(order.id).all()).results;
  selected=items.map(i=>({id:i.product_id,name:catalogItems.find(p=>p.id===i.product_id)?.name||i.product_id,price:i.price,category:catalogItems.find(p=>p.id===i.product_id)?.category}));
 }
 const legal=await env.DB.prepare('SELECT snapshot FROM shop_order_legal WHERE order_id=?').bind(order.id).first();
 return {...(legal?{legal:JSON.parse(legal.snapshot)}:{}),reference:order.id,amount:order.amount,purchaseMode:order.customer_id?'account':'guest',items:selected.map(p=>({name:p.name,price:p.price,service:p.category==='Designservice'}))};
}
export function secretStatus(value,prefix){return {present:typeof value==='string'&&value.length>0,formatValid:typeof value==='string'&&(value.startsWith(prefix)||(prefix.startsWith('sk_')&&value.startsWith('rk_'+prefix.slice(3)))),outerWhitespace:typeof value==='string'&&value!==value.trim()};}
export async function verifyLiveConnection(env){
 if(!secretStatus(env.STRIPE_SECRET_KEY,'sk_live_').formatValid)return {ok:false,status:'key_missing_or_invalid'};
 try{
  const response=await (env.TEST_STRIPE_FETCH||fetch)('https://api.stripe.com/v1/checkout/sessions?limit=1',{method:'GET',signal:AbortSignal.timeout(15000),headers:{Authorization:'Bearer '+env.STRIPE_SECRET_KEY}});
  if(!response.ok)return {ok:false,status:response.status===401?'authentication_failed':response.status===403?'permission_denied':'stripe_unavailable'};
  const data=await response.json();return data.object==='list'&&Array.isArray(data.data)?{ok:true,status:'connected'}:{ok:false,status:'unexpected_response'};
 }catch{return {ok:false,status:'stripe_unavailable'}}
}
export async function paymentState(env){
 const row=await env.DB?.prepare("SELECT value FROM shop_settings WHERE key='payments'").first();
 const enabled=row?JSON.parse(row.value).enabled===true:false;
 return {provider:'stripe',paymentsEnabled:enabled&&/^(?:sk|rk)_live_/.test(env.STRIPE_SECRET_KEY||'')&&/^whsec_/.test(env.STRIPE_WEBHOOK_SECRET||''),liveConfigured:/^(?:sk|rk)_live_/.test(env.STRIPE_SECRET_KEY||'')&&/^whsec_/.test(env.STRIPE_WEBHOOK_SECRET||''),sandboxConfigured:/^(?:sk|rk)_test_/.test(env.STRIPE_TEST_SECRET_KEY||'')&&/^whsec_/.test(env.STRIPE_TEST_WEBHOOK_SECRET||''),enabled};
}
export async function verifyStripeSignature(raw,header,secret,now=Date.now()){
 if(!secret||!header)return false;
 const parts=header.split(',').map(p=>p.split('=')),timestamps=parts.filter(p=>p[0]==='t');
 if(timestamps.length!==1||!/^\d+$/.test(timestamps[0][1]))return false;
 const time=Number(timestamps[0][1]);if(Math.abs(now/1000-time)>300)return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(time+'.'+raw)));
 return parts.filter(p=>p[0]==='v1'&&/^[a-f0-9]{64}$/.test(p[1])).some(p=>{let diff=0;for(let i=0;i<32;i++)diff|=signature[i]^parseInt(p[1].slice(i*2,i*2+2),16);return diff===0});
}
async function stripe(env,key,path,params,id){
 const response=await (env.TEST_STRIPE_FETCH||fetch)('https://api.stripe.com/v1/'+path,{method:'POST',signal:AbortSignal.timeout(15000),headers:{Authorization:'Bearer '+key,'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':id},body:params.toString()});
 const data=await response.json();if(!response.ok)throw new Error('STRIPE_UNAVAILABLE');return data;
}
export async function stripeWebhook(request,env){
 const test=new URL(request.url).pathname.endsWith('/test'),secret=test?env.STRIPE_TEST_WEBHOOK_SECRET:env.STRIPE_WEBHOOK_SECRET;
 const raw=await request.text();if(raw.length>262144)return json({error:'Anfrage zu groß.'},413);
 if(!await verifyStripeSignature(raw,request.headers.get('Stripe-Signature'),secret))return json({error:'Ungültige Zahlungssignatur.'},400);
 let event;try{event=JSON.parse(raw)}catch{return json({error:'Ungültige Nachricht.'},400)}
 if(typeof event.id!=='string'||event.livemode!==!test)return json({error:'Falscher Zahlungsmodus.'},400);
 const db=env.DB;if(await db.prepare('SELECT id FROM shop_payment_events WHERE id=?').bind(event.id).first())return json({ok:true,duplicate:true});
 const object=event.data?.object;if(!object||object.livemode!==!test)return json({error:'Ungültiges Ereignis.'},400);
 let statements=[];
 if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)){
  const payment=await db.prepare('SELECT * FROM shop_payments WHERE checkout_id=?').bind(object.id).first();
  if(!payment)return json({error:'Bestellung noch nicht zugeordnet. Bitte erneut zustellen.'},503);
  const order=await db.prepare('SELECT * FROM customer_orders WHERE id=?').bind(payment.order_id).first();
  if(payment.mode!==(test?'test':'live')||object.client_reference_id!==order.id||object.amount_total!==order.amount||object.currency!=='eur'||object.livemode!==!test||typeof object.payment_intent!=='string')return json({error:'Zahlung passt nicht zur Bestellung.'},400);
  const tax=await db.prepare('SELECT automatic_tax FROM shop_order_tax WHERE order_id=?').bind(order.id).first();
  if(object.payment_status==='paid'&&tax?.automatic_tax&&(object.automatic_tax?.status!=='complete'||!Number.isSafeInteger(object.total_details?.amount_tax)||object.total_details.amount_tax<0||object.total_details.amount_tax>order.amount))return json({error:'Steuerberechnung ist noch nicht vollständig bestätigt.'},400);
  if(object.payment_status==='paid'){
   if(tax?.automatic_tax)statements.push(db.prepare('UPDATE shop_order_tax SET amount_tax=?,country=?,calculation_status=?,updated_at=? WHERE order_id=?').bind(object.total_details.amount_tax,object.customer_details?.address?.country||null,'complete',Date.now(),order.id));
   statements.push(db.prepare('UPDATE shop_payments SET payment_intent=? WHERE order_id=?').bind(object.payment_intent,order.id),db.prepare("UPDATE customer_orders SET status=coalesce((SELECT status FROM shop_payment_revocations WHERE payment_intent=? AND mode=?),?) WHERE id=? AND status='pending'").bind(object.payment_intent,payment.mode,test?'test_paid':'paid',order.id));
   if(order.status==='pending')statements.push(db.prepare("UPDATE shop_messages SET email=?,body=body || char(10) || 'Produkte: ' || coalesce((SELECT group_concat(product_id, ', ') FROM customer_order_items WHERE order_id=?),'') || char(10) || coalesce((SELECT 'Designentwurf (JSON):' || char(10) || design FROM customer_order_designs WHERE order_id=?),'') || char(10) || CASE WHEN coalesce((SELECT json_extract(snapshot,'$.serviceEarlyStart') FROM shop_order_legal WHERE order_id=?),0)=1 THEN 'Persönliche Leistungen: vorzeitiger Beginn ausdrücklich verlangt; gesetzliche Voraussetzungen beachten.' ELSE 'Persönliche Leistungen: erst nach Ablauf der Widerrufsfrist beginnen; kein vorzeitiger Beginn verlangt.' END WHERE id=?").bind(payment.email,order.id,order.id,order.id,'paid:'+order.id));
   if(order.status==='pending'&&!test)statements.push(await customerMailStatement(env,{id:'payment:'+order.id,kind:'payment',to:payment.email,payload:{...await mailOrderPayload(env,order),...(tax?.automatic_tax?{tax:{amount:object.total_details.amount_tax,country:object.customer_details?.address?.country||null}}:{})}},order.id));
  }
 }else if(['charge.refunded','charge.dispute.created'].includes(event.type)){
  const intent=typeof object.payment_intent==='string'?object.payment_intent:object.payment_intent?.id;
  if(intent){const status=event.type==='charge.refunded'?'refunded':'disputed';statements.push(db.prepare('INSERT INTO shop_payment_revocations VALUES(?,?,?) ON CONFLICT(payment_intent,mode) DO UPDATE SET status=excluded.status').bind(intent,test?'test':'live',status));const payment=await db.prepare('SELECT * FROM shop_payments WHERE payment_intent=?').bind(intent).first();if(payment&&payment.mode===(test?'test':'live'))statements.push(db.prepare("UPDATE customer_orders SET status=? WHERE id=? AND status IN ('paid','test_paid','pending')").bind(status,payment.order_id));}
 }else if(['checkout.session.expired','checkout.session.async_payment_failed'].includes(event.type)){
  statements.push(db.prepare("UPDATE customer_orders SET status=? WHERE status='pending' AND id IN (SELECT order_id FROM shop_payments WHERE checkout_id=? AND mode=?)").bind(event.type==='checkout.session.expired'?'expired':'failed',object.id,test?'test':'live'));
 }
 statements.push(db.prepare('INSERT OR IGNORE INTO shop_payment_events VALUES(?,?)').bind(event.id,Date.now()));
 await db.batch(statements);return json({ok:true});
}
export async function checkoutApi(request,env,user){
 const db=env.DB,url=new URL(request.url),admin=await isAdmin(env,user),state=await paymentState(env);
 if(url.pathname==='/api/admin/payment-audit'){
  if(!admin)return json({error:'Nur für Betreiber.'},403);
  const list=await catalog(db),results=[];
  for(let start=0;start<list.length;start+=6)results.push(...await Promise.all(list.slice(start,start+6).map(async p=>{if(p.category==='Designservice')return {id:p.id,service:true};const file=await db.prepare('SELECT * FROM product_files WHERE product_id=?').bind(p.id).first();const object=file&&await env.PRODUCT_FILES?.head(file.object_key);return {id:p.id,ready:!!object&&object.size===file.size,bytes:object?.size||0};})));
  return json({products:list.length,downloadProducts:results.filter(r=>!r.service).length,services:results.filter(r=>r.service).length,ready:results.filter(r=>r.ready).length,missing:results.filter(r=>!r.service&&!r.ready).map(r=>r.id)});
 }
 if(url.pathname==='/api/admin/payments'){
  if(!admin)return json({error:'Nur für Betreiber.'},403);
  if(request.method==='GET')return json({...state,...(url.searchParams.get('verify')==='true'?{connection:await verifyLiveConnection(env)}:{}),adminTestAvailable:true,automaticTaxEnabled:env.STRIPE_AUTOMATIC_TAX==='true',configuration:{liveKey:secretStatus(env.STRIPE_SECRET_KEY,'sk_live_'),liveWebhook:secretStatus(env.STRIPE_WEBHOOK_SECRET,'whsec_'),sandboxKey:secretStatus(env.STRIPE_TEST_SECRET_KEY,'sk_test_'),sandboxWebhook:secretStatus(env.STRIPE_TEST_WEBHOOK_SECRET,'whsec_')},webhook:'https://shop.neonmind-ai.com/api/payments/stripe/webhook',sandboxWebhook:'https://shop.neonmind-ai.com/api/payments/stripe/webhook/test'});
  const b=await request.json();if(typeof b.enabled!=='boolean')return json({error:'Ungültige Einstellung.'},400);
  if(b.enabled&&!state.liveConfigured)return json({error:'Live-Schlüssel und Webhook fehlen noch.'},409);
  if(b.enabled&&b.readinessConfirmed!==true)return json({error:'Bitte Betreiberangaben, Verkaufsbedingungen und Lieferablauf vor der Freischaltung bestätigen.'},400);
  await db.prepare("INSERT INTO shop_settings VALUES('payments',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify({enabled:b.enabled,confirmedAt:Date.now(),operator:user.id})).run();return json({ok:true});
 }
 if(request.method!=='POST')return json({error:'Nicht gefunden.'},404);
 const raw=await request.text();if(raw.length>8192)return json({error:'Anfrage zu groß.'},413);const b=JSON.parse(raw);
 const testing=url.pathname==='/api/admin/test-order'||b.test===true;
 if(testing&&!admin)return json({error:'Testkäufe sind nur für Betreiber freigeschaltet.'},403);
 if(!testing&&(!state.paymentsEnabled||(await maintenance(env)).enabled))return json({error:'Echte Zahlungen sind noch nicht freigeschaltet.'},503);
 if(!Array.isArray(b.items)||!b.items.length||b.items.length>50||new Set(b.items).size!==b.items.length)return json({error:'Ungültiger Warenkorb.'},400);
 if(!testing&&b.consent!==true)return json({error:'Bitte die Hinweise zur digitalen Lieferung bestätigen.'},400);
 if(!['guest','account'].includes(b.purchaseMode)||b.purchaseMode==='account'&&!user)return json({error:'Bitte anmelden oder Gastkauf wählen.'},401);
 const email=normalizeEmail(user?.email||b.email);if(!validMailbox(email))return json({error:'Bitte eine gültige E-Mail-Adresse eingeben.'},400);
 const current=await catalog(db),selected=b.items.map(id=>current.find(p=>p.id===id));
 if(selected.some(p=>!p||!Number.isSafeInteger(p.price)||p.price<=0))return json({error:'Ungültiges Produkt.'},400);
 if(!testing&&(b.legalVersion!==legalVersion||(selected.some(p=>p.category!=='Designservice')&&b.digitalConsent!==true)))return json({error:'Bitte die aktuellen Verbraucherhinweise und die ausdrückliche Zustimmung für sofortige Downloads bestätigen.'},400);
 if(env.STRIPE_AUTOMATIC_TAX==='true'&&selected.some(p=>!taxCategories.some(([code])=>code===p.taxCode)))return json({error:'Die Steuerkategorie eines Produkts ist noch nicht vollständig eingerichtet.'},409);
 if(selected.some(p=>p.category!=='Designservice'&&!p.packageReady))return json({error:'Ein Produktpaket ist noch nicht lieferbar.'},409);
 let design;try{design=validateDesign(b.design,b.items)}catch{return json({error:'Ungültiger Designentwurf.'},400)}
 if(b.items.includes('designstudio')&&design?.productId!=='designstudio')return json({error:'Bitte deinen Entwurf im Gestalter sichern.'},400);
 const id=crypto.randomUUID(),guestKey=randomToken(),now=Date.now(),amount=selected.reduce((s,p)=>s+p.price,0),mode=url.pathname==='/api/admin/test-order'?'admin':testing?'test':'live';
 const scenarios={success:'test_paid',pending:'pending',failed:'failed',refunded:'refunded'};
 if(mode==='admin'&&b.result!==undefined&&!Object.hasOwn(scenarios,b.result))return json({error:'Ungültiger Testablauf.'},400);
 const status=mode==='admin'?scenarios[b.result||'success']:'pending';
 await db.batch([db.prepare('INSERT INTO customer_orders VALUES(?,?,?,?,?,?)').bind(id,testing||b.purchaseMode==='account'?user.id:null,await digest(guestKey),amount,status,now),...selected.map(p=>db.prepare('INSERT INTO customer_order_items VALUES(?,?,?)').bind(id,p.id,p.price)),...(design?[db.prepare('INSERT INTO customer_order_designs VALUES(?,?)').bind(id,JSON.stringify(design))]:[]),db.prepare('INSERT INTO shop_payments(order_id,mode,email,consent_at) VALUES(?,?,?,?)').bind(id,mode,email,now),db.prepare('INSERT INTO shop_order_legal(order_id,version,snapshot,created_at) VALUES(?,?,?,?)').bind(id,legalVersion,JSON.stringify(orderLegalSnapshot(selected,{digital:b.digitalConsent===true,service:b.serviceEarlyStart===true,at:now})),now),db.prepare('INSERT INTO shop_order_tax(order_id,automatic_tax,updated_at) VALUES(?,?,?)').bind(id,env.STRIPE_AUTOMATIC_TAX==='true'?1:0,now)]);
 const receipt={order:{id,amount,status,created_at:now,design,items:selected.map(p=>({product_id:p.id,price:p.price}))},guestKey:!testing&&b.purchaseMode==='guest'?guestKey:null};
 if(mode==='admin')return json(receipt,201);
 const key=testing?env.STRIPE_TEST_SECRET_KEY:env.STRIPE_SECRET_KEY;
 if(testing&&!state.sandboxConfigured){await db.prepare("UPDATE customer_orders SET status='failed' WHERE id=?").bind(id).run();return json({error:'Stripe-Sandbox noch nicht eingerichtet.'},503)}
 const params=new URLSearchParams({mode:'payment',client_reference_id:id,customer_email:email,success_url:url.origin+(receipt.guestKey?'/guest':'/downloads'),cancel_url:url.origin+'/checkout','allowed_payment_method_types[0]':'card','payment_method_options[card][request_three_d_secure]':'automatic','metadata[order_id]':id,'payment_intent_data[metadata][order_id]':id});
 if(env.STRIPE_AUTOMATIC_TAX==='true')params.set('automatic_tax[enabled]','true');
 selected.forEach((p,i)=>{params.set(`line_items[${i}][price_data][currency]`,'eur');params.set(`line_items[${i}][price_data][unit_amount]`,String(p.price));params.set(`line_items[${i}][price_data][tax_behavior]`,'inclusive');params.set(`line_items[${i}][price_data][product_data][name]`,p.name);if(/^txcd_[0-9]{8}$/.test(p.taxCode||''))params.set(`line_items[${i}][price_data][product_data][tax_code]`,p.taxCode);params.set(`line_items[${i}][quantity]`,'1')});
 try{const session=await stripe(env,key,'checkout/sessions',params,id);if(!/^https:\/\/checkout\.stripe\.com\//.test(session.url||'')||!/^cs_/.test(session.id||'')||session.livemode!==!testing)throw Error('INVALID_SESSION');await db.batch([db.prepare('UPDATE shop_payments SET checkout_id=? WHERE order_id=?').bind(session.id,id),...(mode==='live'?[await customerMailStatement(env,{id:'order:'+id,kind:'order',to:email,payload:await mailOrderPayload(env,{id,amount,customer_id:b.purchaseMode==='account'?user.id:null},selected)})]:[])]);return json({...receipt,checkoutUrl:session.url},201)}catch{await db.prepare("UPDATE customer_orders SET status='failed' WHERE id=? AND status='pending'").bind(id).run();return json({error:'Der Zahlungsanbieter ist derzeit nicht erreichbar. Es wurde kein Download freigegeben.'},502)}
}
