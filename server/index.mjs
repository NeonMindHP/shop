import { createServer } from 'node:http';
import { readFile, mkdir, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { timingSafeEqual } from 'node:crypto';
import { createStore } from './store.mjs';
import { signDownload, verifyDownload } from './downloads.mjs';
import { products } from '../dist/catalog.js';
const root=fileURLToPath(new URL('../',import.meta.url)),publicRoot=resolve(root,'dist'),dataRoot=resolve(root,'data'),privateRoot=resolve(root,'private');await mkdir(dataRoot,{recursive:true});const store=createStore(resolve(dataRoot,'shop.sqlite'));
const secret=process.env.DOWNLOAD_SIGNING_SECRET,admin=process.env.SHOP_ADMIN_TOKEN;
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))};
const equal=(a,b)=>{if(!a||!b)return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)};
const body=async req=>{let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>8192)throw new Error('BODY_TOO_LARGE')}return JSON.parse(raw||'{}')};
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');try{const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/api/health')return json(res,200,{mode:'preview',paymentsEnabled:false,privateDownloadsConfigured:!!secret&&secret.length>=32});
 if(url.pathname==='/api/products'&&req.method==='GET')return json(res,200,products);
 if(url.pathname==='/api/orders'&&req.method==='POST'){const input=await body(req);return json(res,201,store.createOrder(input.items))}
 if(url.pathname==='/api/payment'){return json(res,503,{error:'PAYMENT_PROVIDER_NOT_CONFIGURED'})}
 if(url.pathname==='/api/admin/orders'&&req.method==='GET'){if(!admin||admin.length<32||!equal(req.headers.authorization,`Bearer ${admin}`))return json(res,401,{error:'UNAUTHORIZED'});return json(res,200,store.listOrders())}
 if(url.pathname==='/api/order'&&req.method==='GET'){const token=(req.headers.authorization||'').replace(/^Bearer /,'');const order=store.getOrder(url.searchParams.get('id'),token);return json(res,order?200:404,order||{error:'NOT_FOUND'})}
 if(url.pathname==='/api/download-link'&&req.method==='POST'){const input=await body(req),access=(req.headers.authorization||'').replace(/^Bearer /,'');const order=store.getOrder(input.orderId,access);if(!order||order.status!=='paid'||!order.items.some(i=>i.product_id===input.productId))return json(res,403,{error:'DOWNLOAD_NOT_AUTHORIZED'});if(!secret||secret.length<32)return json(res,503,{error:'DOWNLOADS_NOT_CONFIGURED'});return json(res,200,{url:'/api/download?token='+encodeURIComponent(signDownload(secret,order.id,input.productId))})}
 if(url.pathname==='/api/download'&&req.method==='GET'){const grant=verifyDownload(secret,url.searchParams.get('token'));if(!grant)return json(res,403,{error:'INVALID_OR_EXPIRED_LINK'});if(!store.canDownload(grant.orderId,grant.productId))return json(res,403,{error:'DOWNLOAD_NOT_AUTHORIZED'});if(!products.some(p=>p.id===grant.productId))return json(res,404,{error:'NOT_FOUND'});const file=resolve(privateRoot,grant.productId+'.zip');try{const info=await stat(file);res.writeHead(200,{'Content-Type':'application/zip','Content-Disposition':`attachment; filename="NeonMind-${grant.productId}.zip"`,'Cache-Control':'no-store','Content-Length':info.size});createReadStream(file).pipe(res);return}catch{return json(res,404,{error:'PRODUCT_FILE_NOT_INSTALLED'})}}
 if(url.pathname.startsWith('/api/'))return json(res,404,{error:'NOT_FOUND'});
 if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{error:'METHOD_NOT_ALLOWED'});
 const file=resolve(publicRoot,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!file.startsWith(publicRoot+sep))return json(res,403,{error:'FORBIDDEN'});try{const data=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:data)}catch{return json(res,404,{error:'NOT_FOUND'})}
 }catch(e){json(res,e.message==='BODY_TOO_LARGE'?413:400,{error:'INVALID_REQUEST'})}});
server.listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log('NeonMind preview: http://127.0.0.1:'+(process.env.PORT||4173)));const close=()=>server.close(()=>{store.close();process.exit(0)});process.on('SIGINT',close);process.on('SIGTERM',close);
