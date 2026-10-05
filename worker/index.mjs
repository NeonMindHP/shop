import {adminApi, catalog} from './admin.mjs';
import {products} from '../dist/catalog.js';
import {randomToken,digest,hashPassword,verifyPassword,normalizeEmail,validEmail,validPassword} from './auth.mjs';
const sessionName='nm_session';
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const cookie=(token,maxAge)=>`${sessionName}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
async function input(request){const raw=await request.text();if(raw.length>8192)throw new Error('INPUT_TOO_LARGE');return JSON.parse(raw||'{}')}
async function session(request,db){const token=request.headers.get('Cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(sessionName+'='))?.slice(sessionName.length+1);if(!token||!/^[a-f0-9]{64}$/.test(token))return null;return db.prepare('SELECT customers.id,customers.email FROM customer_sessions JOIN customers ON customers.id=customer_sessions.customer_id WHERE token_hash=? AND expires_at>?').bind(await digest(token),Date.now()).first()}
async function sessionHeaders(db,user){const token=randomToken();await db.prepare('INSERT INTO customer_sessions VALUES(?,?,?)').bind(await digest(token),user.id,Date.now()+1209600000).run();return {'Set-Cookie':cookie(token,1209600)}}
async function limited(request,db,email){const key=await digest((request.headers.get('CF-Connecting-IP')||'local')+'|'+email),now=Date.now();await db.prepare('INSERT INTO auth_attempts(key_hash,attempts,window_start) VALUES(?,1,?) ON CONFLICT(key_hash) DO UPDATE SET attempts=CASE WHEN window_start<? THEN 1 ELSE attempts+1 END,window_start=CASE WHEN window_start<? THEN excluded.window_start ELSE window_start END').bind(key,now,now-900000,now-900000).run();const row=await db.prepare('SELECT attempts FROM auth_attempts WHERE key_hash=?').bind(key).first();return row.attempts>10}
async function items(db,id){return (await db.prepare('SELECT product_id,price FROM customer_order_items WHERE order_id=?').bind(id).all()).results}
async function orderResult(db,row){return {...row,items:await items(db,row.id)}}
export default {async fetch(request,env){const url=new URL(request.url);if(url.pathname==='/admin')return Response.redirect(url.origin+'/#admin',302);if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);try{
 const db=env.DB;
 if(url.pathname==='/api/health')return json({mode:'preview',paymentsEnabled:false,accountsEnabled:!!db&&!!env.AUTH_PEPPER&&env.AUTH_PEPPER.length>=32,guestOrdersEnabled:!!db});
 if(url.pathname==='/api/products')return json(await catalog(db));
 if(!db)return json({error:'DATABASE_NOT_CONFIGURED'},503);
 if(request.method==='POST'&&request.headers.get('Origin')!==url.origin)return json({error:'INVALID_ORIGIN'},403);
 if(request.method==='POST'&&!url.pathname.startsWith('/api/admin/upload/')&&!url.pathname.startsWith('/api/admin/upload-preview/')&&!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'JSON_REQUIRED'},415);
 if(url.pathname.startsWith('/api/preview/')&&request.method==='GET'){const id=url.pathname.split('/').pop();const row=await db.prepare('SELECT object_key FROM product_previews WHERE product_id=?').bind(id).first();const object=row&&await env.PRODUCT_FILES?.get(row.object_key);if(!object)return new Response('Nicht gefunden',{status:404});return new Response(object.body,{headers:{'Content-Type':object.httpMetadata.contentType,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}});}
 const user=await session(request,db);
 if(url.pathname.startsWith('/api/admin/'))return adminApi(request,env,user);
 if(url.pathname==='/api/download'&&request.method==='POST'){const body=await input(request);const order=await db.prepare('SELECT * FROM customer_orders WHERE id=?').bind(body.orderId||'').first();if(!order||order.status!=='paid'||(order.customer_id?order.customer_id!==user?.id:await digest(body.key||'')!==order.guest_key_hash))return json({error:'Kein bezahlter Downloadzugang.'},403);const item=await db.prepare('SELECT product_id FROM customer_order_items WHERE order_id=? AND product_id=?').bind(order.id,body.productId||'').first();const file=item&&await db.prepare('SELECT * FROM product_files WHERE product_id=?').bind(item.product_id).first();const object=file&&await env.PRODUCT_FILES?.get(file.object_key);if(!object)return json({error:'Datei nicht verfügbar.'},404);return new Response(object.body,{headers:{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="'+file.filename+'"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}
 if(url.pathname==='/api/me'&&request.method==='GET')return json({user});
 if(['/api/register','/api/login'].includes(url.pathname)&&request.method==='POST'){
  if(!env.AUTH_PEPPER||env.AUTH_PEPPER.length<32)return json({error:'AUTH_NOT_CONFIGURED'},503);
  const body=await input(request),email=normalizeEmail(body.email);if(!validEmail(email)||!validPassword(body.password))return json({error:'E-Mail und Passwort prüfen. Das Passwort braucht 12 bis 128 Zeichen.'},400);
  if(await limited(request,db,email)||await limited(request,db,'*'))return json({error:'Zu viele Versuche. Bitte in 15 Minuten erneut versuchen.'},429);
  let account=await db.prepare('SELECT id,email,password_hash FROM customers WHERE email=?').bind(email).first();
  if(url.pathname==='/api/register'){
   if(account)return json({error:'Konto konnte nicht angelegt werden. Bitte anmelden oder andere E-Mail verwenden.'},409);
   account={id:crypto.randomUUID(),email,password_hash:await hashPassword(body.password,env.AUTH_PEPPER)};
   try{await db.prepare('INSERT INTO customers VALUES(?,?,?,?)').bind(account.id,email,account.password_hash,Date.now()).run()}catch{return json({error:'Konto konnte nicht angelegt werden.'},409)}
  }else{
   const fallback='v1$'+'0'.repeat(64)+'$'+'0'.repeat(64);
   if(!await verifyPassword(body.password,account?.password_hash||fallback,env.AUTH_PEPPER)||!account)return json({error:'E-Mail oder Passwort ist nicht korrekt.'},401);
  }
  return json({user:{id:account.id,email:account.email}},200,await sessionHeaders(db,account));
 }
 if(url.pathname==='/api/logout'&&request.method==='POST'){const token=request.headers.get('Cookie')?.match(/(?:^|;\s*)nm_session=([a-f0-9]{64})/)?.[1];if(token)await db.prepare('DELETE FROM customer_sessions WHERE token_hash=?').bind(await digest(token)).run();return json({ok:true},200,{'Set-Cookie':cookie('',0)})}
 if(url.pathname==='/api/orders'&&request.method==='GET'){if(!user)return json({error:'UNAUTHORIZED'},401);const rows=(await db.prepare('SELECT id,amount,status,created_at FROM customer_orders WHERE customer_id=? ORDER BY created_at DESC LIMIT 100').bind(user.id).all()).results;return json({orders:await Promise.all(rows.map(row=>orderResult(db,row)))})}
 if(url.pathname==='/api/orders/demo'&&request.method==='POST'){
  const body=await input(request);if(!['guest','account'].includes(body.purchaseMode)||body.purchaseMode==='account'&&!user)return json({error:'Bitte anmelden oder Gastkauf wählen.'},401);
  if(!Array.isArray(body.items)||!body.items.length||body.items.length>100||new Set(body.items).size!==body.items.length)return json({error:'INVALID_CART'},400);
  const current=await catalog(db);const selected=body.items.map(id=>current.find(p=>p.id===id));if(selected.some(p=>!p))return json({error:'INVALID_PRODUCT'},400);
  if(body.result!=='success')return json({error:body.result==='pending'?'Zahlung ausstehend. Kein neuer Download freigegeben.':'Testzahlung fehlgeschlagen. Kein neuer Download freigegeben.'},409);
  const id=crypto.randomUUID(),key=randomToken(),amount=selected.reduce((n,p)=>n+p.price,0),created=Date.now();
  await db.batch([db.prepare('INSERT INTO customer_orders VALUES(?,?,?,?,?,?)').bind(id,body.purchaseMode==='account'?user.id:null,await digest(key),amount,'demo',created),...selected.map(p=>db.prepare('INSERT INTO customer_order_items VALUES(?,?,?)').bind(id,p.id,p.price))]);
  return json({order:{id,amount,status:'demo',created_at:created,items:selected.map(p=>({product_id:p.id,price:p.price}))},guestKey:body.purchaseMode==='guest'?key:null},201);
 }
 if(['/api/guest/order','/api/guest/claim'].includes(url.pathname)&&request.method==='POST'){
  const body=await input(request);if(typeof body.key!=='string'||!/^[a-f0-9]{64}$/.test(body.key))return json({error:'Bestellschlüssel ist nicht gültig.'},400);
  if(await limited(request,db,'guest'))return json({error:'Zu viele Versuche. Bitte später erneut versuchen.'},429);
  const row=await db.prepare('SELECT id,amount,status,created_at,customer_id FROM customer_orders WHERE guest_key_hash=?').bind(await digest(body.key)).first();if(!row||row.customer_id&&row.customer_id!==user?.id)return json({error:'Bestellung nicht gefunden.'},404);
  if(url.pathname==='/api/guest/claim'){if(!user)return json({error:'Bitte zuerst anmelden.'},401);await db.prepare('UPDATE customer_orders SET customer_id=? WHERE id=? AND customer_id IS NULL').bind(user.id,row.id).run();const owner=await db.prepare('SELECT customer_id FROM customer_orders WHERE id=?').bind(row.id).first();if(owner.customer_id!==user.id)return json({error:'Bestellung nicht verfügbar.'},409)}
  const result=await orderResult(db,row);delete result.customer_id;return json({order:result});
 }
 return json({error:'NOT_FOUND'},404);
 }catch(error){return json({error:error.message==='INPUT_TOO_LARGE'?'Anfrage ist zu groß.':'Anfrage konnte nicht verarbeitet werden.'},error.message==='INPUT_TOO_LARGE'?413:400)}}};
