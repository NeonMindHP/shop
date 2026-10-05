import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { products } from '../dist/catalog.js';
const hash=value=>createHash('sha256').update(value).digest('hex');
export function createStore(path=':memory:') {
 const db=new DatabaseSync(path);
 db.exec(`PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY, access_hash TEXT NOT NULL, amount INTEGER NOT NULL, currency TEXT NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS items(order_id TEXT NOT NULL REFERENCES orders(id), product_id TEXT NOT NULL, price INTEGER NOT NULL, PRIMARY KEY(order_id,product_id)); CREATE TABLE IF NOT EXISTS payment_events(id TEXT PRIMARY KEY,order_id TEXT NOT NULL REFERENCES orders(id),created_at INTEGER NOT NULL);`);
 function createOrder(ids) {
  if(!Array.isArray(ids)||!ids.length||ids.length>products.length||new Set(ids).size!==ids.length)throw new Error('INVALID_CART');
  const selected=ids.map(id=>products.find(p=>p.id===id));if(selected.some(p=>!p))throw new Error('INVALID_PRODUCT');
  const order={id:randomUUID(),amount:selected.reduce((n,p)=>n+p.price,0),currency:'EUR',status:'pending',created_at:Date.now()};const access=randomBytes(32).toString('base64url');
  db.exec('BEGIN');try{db.prepare('INSERT INTO orders VALUES(?,?,?,?,?,?)').run(order.id,hash(access),order.amount,order.currency,order.status,order.created_at);for(const p of selected)db.prepare('INSERT INTO items VALUES(?,?,?)').run(order.id,p.id,p.price);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}return {...order,access};
 }
 function getOrder(id,access){const order=db.prepare('SELECT id,amount,currency,status,created_at FROM orders WHERE id=? AND access_hash=?').get(id,hash(access||''));if(!order)return null;return {...order,items:db.prepare('SELECT product_id,price FROM items WHERE order_id=?').all(id)}}
 // Only a future provider adapter may call this after cryptographic provider verification.
 // No public API accepts an asserted payment status from the browser.
 function recordVerifiedPayment(event){if(event.verified!==true||!event.id||!event.orderId)throw new Error('UNVERIFIED_PAYMENT');const order=db.prepare('SELECT * FROM orders WHERE id=?').get(event.orderId);if(!order||order.amount!==event.amount||order.currency!==event.currency)throw new Error('PAYMENT_MISMATCH');const seen=db.prepare('SELECT order_id FROM payment_events WHERE id=?').get(event.id);if(seen){if(seen.order_id!==order.id)throw new Error('PAYMENT_MISMATCH');return {duplicate:true}}if(!['succeeded','pending','failed','refunded'].includes(event.status))throw new Error('INVALID_STATUS');db.exec('BEGIN');try{db.prepare('INSERT INTO payment_events VALUES(?,?,?)').run(event.id,order.id,Date.now());if(event.status==='refunded')db.prepare('UPDATE orders SET status=? WHERE id=?').run('refunded',order.id);else if(event.status==='succeeded'&&order.status!=='refunded')db.prepare('UPDATE orders SET status=? WHERE id=?').run('paid',order.id);else if(order.status!=='paid'&&order.status!=='refunded')db.prepare('UPDATE orders SET status=? WHERE id=?').run(event.status,order.id);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}return {duplicate:false}}
 return {createOrder,getOrder,recordVerifiedPayment,canDownload:(orderId,productId)=>!!db.prepare("SELECT 1 FROM orders JOIN items ON orders.id=items.order_id WHERE orders.id=? AND orders.status='paid' AND items.product_id=?").get(orderId,productId),listOrders:()=>db.prepare('SELECT id,amount,currency,status,created_at FROM orders ORDER BY created_at DESC LIMIT 100').all(),close:()=>db.close()};
}
