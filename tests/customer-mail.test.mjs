import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {queueMessage,flushCustomerMail,seal,unseal,sendMail,validMailbox} from '../worker/mail.mjs';
import {customerMessage} from '../worker/customer-mail.mjs';

function fixture(){
 const sql=new DatabaseSync(':memory:');
 for(const file of readdirSync(new URL('../migrations/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync(new URL('../migrations/'+file,import.meta.url),'utf8'));
 const wrap=(query,args=[])=>({bind:(...v)=>wrap(query,v),first:async()=>sql.prepare(query).get(...args)||null,all:async()=>({results:sql.prepare(query).all(...args)}),run:async()=>sql.prepare(query).run(...args)});
 const sent=[],env={AUTH_PEPPER:'isolated-customer-mail-test',DB:{prepare:q=>wrap(q),batch:async statements=>{sql.exec('BEGIN');try{const r=[];for(const s of statements)r.push(await s.run());sql.exec('COMMIT');return r}catch(e){sql.exec('ROLLBACK');throw e}}},TEST_SEND_MAIL:async m=>{sent.push(m)}};
 return {sql,env,sent,configure:async()=>sql.prepare("INSERT INTO shop_settings VALUES('smtp',?)").run(await seal({provider:'ionos',user:'info@neonmind-ai.de',password:'fixture-only'},env)),close:()=>sql.close()};
}
const inquiry=(id,email='customer@example.com')=>({id,kind:'contact',email,name:'Markus',subject:'Do not relay this subject',body:'Do not relay arbitrary customer content'});

test('customer receipts are encrypted, event-deduplicated and use the configured sender and reply address',async()=>{
 const f=fixture();try{
  await f.configure();await queueMessage(f.env,inquiry('reference-1'));await queueMessage(f.env,inquiry('reference-1'));
  const row=f.sql.prepare('SELECT * FROM shop_customer_mail').get();assert.equal(row.id,'inquiry:reference-1');assert.ok(!row.payload.includes('Markus'));assert.equal((await unseal(row.payload,f.env)).reference,'reference-1');
  await flushCustomerMail(f.env);await flushCustomerMail(f.env);
  assert.equal(f.sent.length,1);const m=f.sent[0];assert.equal(m.to,'customer@example.com');assert.equal(m.from,'info@neonmind-ai.de');assert.equal(m.replyTo,m.from);assert.match(m.text,/reference-1/);assert.ok(!m.text.includes('Do not relay'));assert.match(m.html,/NEON/);assert.equal(f.sql.prepare('SELECT state FROM shop_customer_mail').get().state,'sent');
 }finally{f.close()}
});
test('inquiry acknowledgement cap preserves all operator messages and isolates recipients',async()=>{
 const f=fixture();try{await f.configure();for(let n=0;n<4;n++)await queueMessage(f.env,inquiry('r'+n));await queueMessage(f.env,inquiry('other','other@example.com'));assert.equal(f.sql.prepare('SELECT count(*) n FROM shop_messages').get().n,5);assert.equal(f.sql.prepare('SELECT count(*) n FROM shop_customer_mail').get().n,4);await flushCustomerMail(f.env);assert.equal(f.sent.length,4);assert.equal(f.sent.filter(m=>m.to==='other@example.com').length,1)}finally{f.close()}
});
test('missing SMTP retains pending receipts; transient failures retry and exhausted failures stop',async()=>{
 const f=fixture();try{await queueMessage(f.env,inquiry('retry'));await flushCustomerMail(f.env);assert.equal(f.sent.length,0);await f.configure();f.env.TEST_SEND_MAIL=async()=>{throw Error('secret error must not persist')};await flushCustomerMail(f.env);let row=f.sql.prepare('SELECT * FROM shop_customer_mail').get();assert.equal(row.state,'pending');assert.equal(row.attempts,1);assert.ok(row.next_at>Date.now());assert.ok(!row.last_error.includes('secret'));f.sql.prepare("UPDATE shop_customer_mail SET attempts=5,next_at=0").run();await flushCustomerMail(f.env);assert.equal(f.sql.prepare('SELECT state FROM shop_customer_mail').get().state,'failed');await flushCustomerMail(f.env);assert.equal(f.sql.prepare('SELECT attempts FROM shop_customer_mail').get().attempts,6)}finally{f.close()}
});
test('expired sending leases recover while active leases are not sent twice',async()=>{
 const f=fixture();try{await f.configure();await queueMessage(f.env,inquiry('lease'));f.sql.prepare("UPDATE shop_customer_mail SET state='sending',next_at=?").run(Date.now()+120000);await flushCustomerMail(f.env);assert.equal(f.sent.length,0);f.sql.prepare('UPDATE shop_customer_mail SET next_at=0').run();await flushCustomerMail(f.env);assert.equal(f.sent.length,1)}finally{f.close()}
});
test('templates escape names and products, distinguish unpaid orders, and keep guest secrets out',()=>{
 const p={reference:'order-12345678',amount:990,purchaseMode:'guest',items:[{name:'<script>alert(1)</script>',price:990,service:true}],guestKey:'secret-key'};
 const unpaid=customerMessage('order',p),paid=customerMessage('payment',p);assert.match(unpaid.text,/noch keine Zahlungsbestätigung/);assert.match(paid.text,/nach der vereinbarten Bearbeitung/);assert.ok(!paid.text.includes('Downloadpakete sind'));assert.ok(!paid.html.includes('<script>'));assert.match(paid.html,/&lt;script&gt;/);assert.ok(!paid.text.includes('secret-key'));assert.match(paid.html,/https:\/\/shop.neonmind-ai.com\/guest/);assert.match(customerMessage('payment',{...p,purchaseMode:'account'}).html,/\/downloads/);assert.ok(!customerMessage('inquiry',{name:'<img src=x>',reference:'r'}).html.includes('<img src=x>'));
});
test('SMTP rejects injected recipient and subject before connecting',async()=>{
 const f=fixture();try{await f.configure();assert.equal(validMailbox('x@example.com\r\nBcc: victim@example.com'),false);await assert.rejects(sendMail(f.env,{to:'x@example.com',subject:'ok\r\nBcc: x',text:'test'}));await assert.rejects(sendMail(f.env,{to:'x@example.com\r\n',subject:'ok',text:'test'}));assert.equal(f.sent.length,0)}finally{f.close()}
});
