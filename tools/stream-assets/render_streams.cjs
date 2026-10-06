const fs=require('node:fs'),path=require('node:path');
const sharp=require('sharp');const {writePsdBuffer,readPsd}=require('ag-psd');
sharp.cache(false);sharp.concurrency(2);
const root=path.resolve(__dirname,'../../outputs/NeonMind-Stream-Pakete-v1');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'Produktionsmanifest.json'),'utf8'));
const only=process.argv[2];
const rgba=h=>({r:parseInt(h.slice(1,3),16),g:parseInt(h.slice(3,5),16),b:parseInt(h.slice(5,7),16)});
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function textSvg(t,w,h){return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><text x="${t.x}" y="${t.y}" font-family="Arial" font-size="${t.size}" font-weight="${t.bold?700:400}" fill="${t.color}">${escape(t.value)}</text></svg>`}
async function bitmap(svg){
 const {data,info}=await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let minX=info.width,minY=info.height,maxX=-1,maxY=-1;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}
 if(maxX<0)return {left:0,top:0,imageData:{width:1,height:1,data:new Uint8ClampedArray(4)}};
 const w=maxX-minX+1,h=maxY-minY+1,pixels=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)pixels.set(data.subarray(((minY+y)*info.width+minX)*4,((minY+y)*info.width+minX+w)*4),y*w*4);
 return {left:minX,top:minY,imageData:{width:w,height:h,data:pixels}};
}
async function group(asset){
 const layers=[];
 for(const part of asset.layers)layers.push({name:part.name,...await bitmap(fs.readFileSync(part.svg,'utf8'))});
 for(const t of asset.texts){
  const pixels=await bitmap(textSvg(t,asset.width,asset.height));
  layers.push({name:'TEXT – '+t.value,...pixels,text:{text:t.value,transform:[1,0,0,1,t.x,t.y],shapeType:'point',pointBase:[0,0],style:{font:{name:t.bold?'Arial-BoldMT':'ArialMT'},fontSize:t.size,fillColor:rgba(t.color),autoKerning:true},paragraphStyle:{justification:'left'},antiAlias:'smooth'}});
 }
 return {name:asset.name,children:layers,hidden:true,opened:false};
}
async function master(file,w,h,assets,firstName){
 const groups=[];for(const a of assets)groups.push(await group(a));
 for(const g of groups)g.hidden=g.name!==firstName;
 const first=assets.find(a=>a.name===firstName),composite=await sharp(Buffer.from(fs.readFileSync(first.svg,'utf8'))).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let imageData;
 if(composite.info.width===w&&composite.info.height===h)imageData={width:w,height:h,data:new Uint8ClampedArray(composite.data)};
 else{const data=new Uint8ClampedArray(w*h*4);for(let y=0;y<composite.info.height;y++)data.set(composite.data.subarray(y*composite.info.width*4,(y+1)*composite.info.width*4),y*w*4);imageData={width:w,height:h,data};}
 const psd={width:w,height:h,children:groups,imageData,imageResources:{resolutionInfo:{horizontalResolution:72,horizontalResolutionUnit:'PPI',widthUnit:'Inches',verticalResolution:72,verticalResolutionUnit:'PPI',heightUnit:'Inches'}}};
 fs.writeFileSync(file,writePsdBuffer(psd,{noBackground:true,generateThumbnail:false,compress:false}));
 const loaded=readPsd(fs.readFileSync(file),{skipLayerImageData:true,skipCompositeImageData:true,skipThumbnail:true});
 const textCount=loaded.children.reduce((n,g)=>n+g.children.filter(l=>l.text).length,0);
 if(loaded.width!==w||loaded.height!==h||loaded.children.length!==assets.length)throw Error('PSD roundtrip mismatch: '+file);
 return {file:path.basename(file),groups:loaded.children.length,textLayers:textCount,bytes:fs.statSync(file).size};
}
(async()=>{
 for(const pack of manifest){if(only&&pack.id!==only)continue;
  for(const variant of pack.variants){
   const out=path.join(variant.folder,'PNG'),psds=path.join(variant.folder,'PSD');fs.mkdirSync(out,{recursive:true});fs.mkdirSync(psds,{recursive:true});
   let pngs=0;
   for(const a of variant.assets){
    const source=fs.readFileSync(a.svg,'utf8');await sharp(Buffer.from(source)).png({compressionLevel:9}).toFile(path.join(out,a.name+'.png'));pngs++;
    if(a.transparent&&a.texts.length){const bare=source.replace(/<text\b[^>]*>[\s\S]*?<\/text>/g,'');await sharp(Buffer.from(bare)).png({compressionLevel:9}).toFile(path.join(out,a.name+'-Ohne-Text.png'));fs.writeFileSync(path.join(variant.folder,'Quellen-SVG',a.name+'-Ohne-Text.svg'),bare);pngs++;}
   }
   const report=[];
   report.push(await master(path.join(psds,'01-Szenen.psd'),1920,1080,variant.assets.filter(a=>a.master),'Starting-Soon'));
   report.push(await master(path.join(psds,'02-Panels.psd'),320,120,variant.assets.filter(a=>a.name.startsWith('Panel-')),'Panel-About'));
   report.push(await master(path.join(psds,'03-Elemente.psd'),960,640,variant.assets.filter(a=>a.name.startsWith('Webcam-')||a.name==='Lower-Third'),'Lower-Third'));
   fs.writeFileSync(path.join(variant.folder,'PSD-Pruefung.json'),JSON.stringify(report,null,2));
   console.log(JSON.stringify({pack:pack.id,variant:variant.id,pngs,psds:report.length,textLayers:report.reduce((n,p)=>n+p.textLayers,0)}));
  }
 }
})().catch(e=>{console.error(e);process.exitCode=1});
