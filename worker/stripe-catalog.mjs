import {digest} from './auth.mjs';
export const stripeApiVersion='2025-03-31.basil';
// Conservative supported subset, reviewed against Stripe eligibility on 2026-11-25.
// A supported tax code does not replace the operator's product/business eligibility review.
export const managedTaxCodes=new Set(['txcd_10501000','txcd_10505000','txcd_10505001','txcd_10202000','txcd_10202001','txcd_10202003','txcd_10000000']);
export const paymentSystem=p=>p.paymentMode||'standard';
export function eligibility(p){
 const reasons=[];
 if(p.category==='Designservice')reasons.push('Persönliche Dienstleistungen werden nicht über Managed Payments angeboten.');
 if(!managedTaxCodes.has(p.taxCode))reasons.push('Steuerkategorie ist nicht für Managed Payments freigegeben.');
 if(p.managedEligibilityConfirmed!==true)reasons.push('Produktberechtigung muss vom Betreiber geprüft werden.');
 return {eligible:!reasons.length,reasons};
}
export function stripeKey(env,mode){const key=mode==='test'?env.STRIPE_TEST_SECRET_KEY:env.STRIPE_SECRET_KEY;if(!new RegExp('^(sk|rk)_'+mode+'_').test(key||''))throw Error('STRIPE_KEY_MISSING');return key;}
export async function stripeRequest(env,mode,path,params=null,id=null){
 const headers={Authorization:'Bearer '+stripeKey(env,mode),'Stripe-Version':stripeApiVersion};
 if(params){headers['Content-Type']='application/x-www-form-urlencoded';if(id)headers['Idempotency-Key']=id;}
 const r=await (env.TEST_STRIPE_FETCH||fetch)('https://api.stripe.com/v1/'+path,{method:params?'POST':'GET',headers,signal:AbortSignal.timeout(15000),...(params?{body:params.toString()}:{})});
 const data=await r.json();if(!r.ok)throw Error(r.status===404?'STRIPE_OBJECT_NOT_FOUND':'STRIPE_REQUEST_FAILED');return data;
}
export async function productFingerprint(p,origin){return digest(JSON.stringify([p.id,p.name,p.description||'',new URL(p.image||'/',origin).href,p.price,'eur',p.taxCode||'',!!p.published,!!p.deletedAt,paymentSystem(p)]));}
export async function syncProduct(env,p,mode,origin,mapping=null){
 if(!['test','live'].includes(mode))throw Error('INVALID_MODE');
 // This release writes only to sandbox. Live catalog changes require a separate release step.
 if(mode==='live')throw Error('LIVE_SYNC_LOCKED');
 if(paymentSystem(p)==='managed'&&!eligibility(p).eligible)throw Error('PRODUCT_NOT_ELIGIBLE');
 if(!Number.isSafeInteger(p.price)||p.price<=0||!/^txcd_[0-9]{8}$/.test(p.taxCode||''))throw Error('PRODUCT_INCOMPLETE');
 const db=env.DB,old=await db.prepare('SELECT * FROM shop_stripe_products WHERE product_id=? AND mode=?').bind(p.id,mode).first();
 if(mapping&&old?.fingerprint&&mapping!==old.stripe_product_id)throw Error('PRODUCT_MAPPING_LOCKED');
 const fingerprint=await productFingerprint(p,origin),active=p.published&&!p.deletedAt&&paymentSystem(p)!=='disabled';
 const productId=mapping||old?.stripe_product_id||('nm_'+mode+'_'+p.id.replaceAll('-','_'));
 if(!/^prod_[A-Za-z0-9]+$/.test(productId)&&!/^nm_test_[a-z0-9_]+$/.test(productId))throw Error('INVALID_PRODUCT_ID');
 const conflict=await db.prepare('SELECT product_id FROM shop_stripe_products WHERE mode=? AND stripe_product_id=? AND product_id<>?').bind(mode,productId,p.id).first();if(conflict)throw Error('PRODUCT_ALREADY_MAPPED');
 // Reserve mapping before external writes. UNIQUE protects concurrent assignments.
 await db.prepare("INSERT INTO shop_stripe_products(product_id,mode,stripe_product_id,status,updated_at) VALUES(?,?,?,'pending',?) ON CONFLICT(product_id,mode) DO UPDATE SET stripe_product_id=excluded.stripe_product_id,status='pending',error=NULL,updated_at=excluded.updated_at").bind(p.id,mode,productId,Date.now()).run();
 try{
  let remote;try{remote=await stripeRequest(env,mode,'products/'+encodeURIComponent(productId));}catch(e){if(e.message!=='STRIPE_OBJECT_NOT_FOUND'||mapping||old?.stripe_product_id?.startsWith('prod_'))throw e;}
  if(remote?.deleted)throw Error('STRIPE_OBJECT_DELETED');
  if(remote&&remote.livemode!==false)throw Error('STRIPE_MODE_MISMATCH');
  if(remote?.metadata?.neonmind_product_id&&remote.metadata.neonmind_product_id!==p.id)throw Error('PRODUCT_ALREADY_MAPPED');
  const params=new URLSearchParams({name:p.name,description:(p.description||'').slice(0,2000),tax_code:p.taxCode,active:String(!!active),'metadata[neonmind_product_id]':p.id,'metadata[neonmind_payment_system]':paymentSystem(p),'images[0]':new URL(p.image||'/',origin).href});
  if(!remote)params.set('id',productId);
  remote=await stripeRequest(env,mode,remote?'products/'+encodeURIComponent(productId):'products',params,'nm-product-'+(remote?'update-':'create-')+mode+'-'+productId+'-'+(remote?crypto.randomUUID():fingerprint));
  if(remote.id!==productId||remote.livemode!==false)throw Error('STRIPE_MODE_MISMATCH');
  const lookup='nm_'+mode+'_'+await digest(JSON.stringify([productId,p.price,'eur','inclusive']));
  const found=await stripeRequest(env,mode,'prices?lookup_keys%5B%5D='+lookup+'&limit=1');let price=found.data?.[0];
  if(!price)price=await stripeRequest(env,mode,'prices',new URLSearchParams({product:productId,currency:'eur',unit_amount:String(p.price),tax_behavior:'inclusive',lookup_key:lookup}),'nm-price-'+lookup);
  if(price.product!==productId||price.unit_amount!==p.price||price.currency!=='eur'||price.tax_behavior!=='inclusive'||price.livemode!==false||price.active!==true||price.recurring)throw Error('STRIPE_PRICE_MISMATCH');
  await db.prepare("UPDATE shop_stripe_products SET stripe_product_id=?,stripe_price_id=?,fingerprint=?,status='synced',error=NULL,updated_at=? WHERE product_id=? AND mode=?").bind(productId,price.id,fingerprint,Date.now(),p.id,mode).run();
  return {ok:true,productId,priceId:price.id};
 }catch(e){await db.prepare("UPDATE shop_stripe_products SET status='error',error=?,updated_at=? WHERE product_id=? AND mode=?").bind(/^[A-Z_]+$/.test(e.message)?e.message:'SYNC_FAILED',Date.now(),p.id,mode).run();throw e;}
}
