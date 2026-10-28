import {limitedText} from './request-body.mjs';
export const MAX_FILES=5,MAX_FILE_TOTAL=25*1024*1024;
const types={pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',txt:'text/plain',zip:'application/zip'};
export async function validateInquiryFiles(files){
 if(files.length>MAX_FILES)throw Error('Bitte höchstens fünf Dateien auswählen.');
 if(files.reduce((sum,file)=>sum+file.size,0)>MAX_FILE_TOTAL)throw Error('Die Dateien dürfen zusammen höchstens 25 MB groß sein.');
 const result=[];
 for(const file of files){
  const name=file.name.replace(/\\/g,'/').split('/').pop().replace(/[\x00-\x1f\x7f]/g,'').trim(),ext=name.split('.').pop().toLowerCase();
  if(!name||name.length>240||!types[ext]||file.size<=0)throw Error('Erlaubt sind nicht leere PDF-, PNG-, JPG-, TXT- oder ZIP-Dateien.');
  const head=new Uint8Array(await file.slice(0,512).arrayBuffer());
  const starts=bytes=>bytes.every((v,i)=>head[i]===v);
  let valid=ext==='pdf'?starts([37,80,68,70,45]):ext==='png'?starts([137,80,78,71,13,10,26,10]):['jpg','jpeg'].includes(ext)?starts([255,216,255]):ext==='zip'?starts([80,75,3,4])||starts([80,75,5,6]):true;
  if(ext==='txt'){const reader=file.stream().getReader(),decoder=new TextDecoder('utf-8',{fatal:true});try{while(true){const {done,value}=await reader.read();if(done)break;if(value.includes(0)){valid=false;await reader.cancel();break}decoder.decode(value,{stream:true});}decoder.decode()}catch{valid=false;await reader.cancel().catch(()=>{})}finally{reader.releaseLock()}}
  if(!valid)throw Error('Der Dateiinhalt passt nicht zum erlaubten Dateiformat: '+name);
  result.push({file,name,contentType:types[ext]});
 }
 return result;
}
export async function purgeInquiryFiles(env){
 const abandoned=(await env.DB.prepare('SELECT object_key FROM shop_inquiry_uploads WHERE created_at<? LIMIT 100').bind(Date.now()-86400000).all()).results;
 for(const row of abandoned){try{if(!env.PRODUCT_FILES?.delete)continue;await env.PRODUCT_FILES.delete(row.object_key);await env.DB.prepare('DELETE FROM shop_inquiry_uploads WHERE object_key=?').bind(row.object_key).run()}catch{/* Keep the journal for the next cleanup. */}}
 const rows=(await env.DB.prepare('SELECT id,object_key FROM shop_inquiry_files WHERE created_at<? LIMIT 100').bind(Date.now()-90*86400000).all()).results;
 for(const row of rows){try{if(!env.PRODUCT_FILES?.delete)continue;await env.PRODUCT_FILES.delete(row.object_key);await env.DB.prepare('DELETE FROM shop_inquiry_files WHERE id=?').bind(row.id).run()}catch{/* Retry on the next scheduled cleanup. */}}
}
export async function readInquiry(request){
 if(request.headers.get('Content-Type')?.startsWith('multipart/form-data')){
  const limit=MAX_FILE_TOTAL+65536;
  if(Number(request.headers.get('Content-Length'))>limit)throw Error('UPLOAD_TOO_LARGE');
  let received=0;
  const bounded=request.body.pipeThrough(new TransformStream({transform(chunk,controller){received+=chunk.byteLength;if(received>limit)throw Error('UPLOAD_TOO_LARGE');controller.enqueue(chunk)}}));
  let form;try{form=await new Response(bounded,{headers:{'Content-Type':request.headers.get('Content-Type')}}).formData()}catch(error){if(received>limit)throw Error('UPLOAD_TOO_LARGE');throw error}
  const b={},files=[];
  for(const [key,value] of form){if(typeof value!=='string'){if(key!=='attachments')throw Error('Unerwartete Datei.');files.push(value)}else{if(Object.hasOwn(b,key))throw Error('Doppelte Formulareingabe.');b[key]=value}}
  b.consent=b.consent==='true';return {b,files};
 }
 const raw=await limitedText(request,8192);
 return {b:JSON.parse(raw),files:[]};
}
