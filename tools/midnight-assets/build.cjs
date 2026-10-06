const fs=require('node:fs'),path=require('node:path');
const modules=fs.existsSync(path.resolve(__dirname,'../stream-assets/node_modules'))?'../stream-assets/node_modules':'../stream-builder/node_modules';
const sharp=require(modules+'/sharp');
const {writePsdBuffer,readPsd}=require(modules+'/ag-psd');
sharp.cache(false);sharp.concurrency(2);
const ROOT=process.env.MIDNIGHT_CHILL_ROOT||path.resolve(__dirname,'../../outputs/Midnight-Chill-v1');
for(const d of ['PNG/Szenen','PNG/Overlays','PNG/Webcam','PNG/Panels','PNG/Elemente','PSD','Shop-Vorschauen'])fs.mkdirSync(path.join(ROOT,d),{recursive:true});
const assets=[],W=1920,H=1080;
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const svg=(w,h,body)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`);
const txt=(value,x,y,size=32,color='#e7e7e9',bold=false,italic=false,font='Arial')=>({value,x,y,size,color,bold,italic,font});
const textSvg=(w,h,t)=>svg(w,h,`<text x="${t.x}" y="${t.y}" fill="${t.color}" font-family="${t.font||'Arial'}" font-weight="${t.bold?700:400}" font-style="${t.italic?'italic':'normal'}" font-size="${t.size}">${esc(t.value)}</text>`);
const L=(name,input,left=0,top=0)=>({name,input,left,top});
async function canvas(w,h,layers){return sharp({create:{width:w,height:h,channels:4,background:'#00000000'}}).composite(layers.map(l=>({input:l.input,left:l.left||0,top:l.top||0}))).png().toBuffer();}
async function cutHoles(input,w,h,holes){return sharp(input).composite([{input:svg(w,h,holes.map(r=>`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="white"/>`).join('')),blend:'dest-out'}]).png().toBuffer();}
async function exportAsset(name,folder,w,h,layers,texts=[],holes=[]){
 const bare=await canvas(w,h,layers),image=await canvas(w,h,[L('Artwork',bare),...texts.map(t=>L('Text',textSvg(w,h,t)))]);
 const rel=`PNG/${folder}/${name}.png`;fs.writeFileSync(path.join(ROOT,rel),image);
 let noText=null;if(texts.length){noText=`PNG/${folder}/${name}-Ohne-Text.png`;fs.writeFileSync(path.join(ROOT,noText),bare);}
 const a={name,folder,w,h,layers,texts,holes,rel,noText,image,bare};assets.push(a);return a;
}
let frameBase,panelBase,garage;
async function frame(w,h,edge=64){
 // Nine-slice preserves the actual generated carbon/metal corners instead of stretching them.
 const meta=await sharp(frameBase).metadata(),sw=meta.width,sh=meta.height,s=92;
 const xs=[0,s,sw-s],ys=[0,s,sh-s],ws=[s,sw-2*s,s],hs=[s,sh-2*s,s];
 const dx=[0,edge,w-edge],dy=[0,edge,h-edge],dw=[edge,w-2*edge,edge],dh=[edge,h-2*edge,edge];
 const pieces=[];
 for(let y=0;y<3;y++)for(let x=0;x<3;x++){if(x===1&&y===1)continue;pieces.push(L('Metall',await sharp(frameBase).extract({left:xs[x],top:ys[y],width:ws[x],height:hs[y]}).resize(dw[x],dh[y],{fit:'fill'}).png().toBuffer(),dx[x],dy[y]));}
 // Opaque seating beneath the metal ensures a precise rectangular aperture.
 const backing=svg(w,h,`<path fill="#080914" fill-rule="evenodd" d="M12 0H${w-12}L${w} 12V${h-12}L${w-12} ${h}H12L0 ${h-12}V12ZM${edge} ${edge}V${h-edge}H${w-edge}V${edge}Z"/>`);
 return cutHoles(await canvas(w,h,[L('Fassung',backing),...pieces]),w,h,[{x:edge,y:edge,w:w-2*edge,h:h-2*edge}]);
}
async function plate(w,h){return sharp(panelBase).resize(w,h,{fit:'fill'}).png().toBuffer();}
const ICONS={
 About:'<circle cx="16" cy="10" r="5"/><path d="M5 30v-4c0-10 22-10 22 0v4Z"/>',
 Schedule:'<rect x="3" y="7" width="26" height="24" rx="2"/><path d="M3 14h26M9 3v8M23 3v8M9 20h3m5 0h3m5 0h1M9 26h3m5 0h3"/>',
 Rules:'<rect x="6" y="3" width="22" height="28" rx="2"/><path d="M11 10h12M11 17h12M11 24h12"/>',
 Socials:'<circle cx="7" cy="17" r="4"/><circle cx="25" cy="5" r="4"/><circle cx="25" cy="29" r="4"/><path d="m10 14 12-7M10 20l12 7"/>',
 Equipment:'<path d="m12 3 8 0 2 6 6 3v8l-6 3-2 6h-8l-2-6-6-3v-8l6-3Z"/><circle cx="16" cy="16" r="5"/>',
 Contact:'<rect x="2" y="6" width="28" height="22" rx="2"/><path d="m3 7 13 11L29 7"/>',
 Support:'<path d="M16 29C-10 12 4-4 16 9 28-4 42 12 16 29Z"/>',
 Discord:'<path d="M8 5h16l6 20-7 4-3-5h-8l-3 5-7-4Z"/><circle cx="11" cy="17" r="2"/><circle cx="21" cy="17" r="2"/>',
 Videos:'<rect x="2" y="7" width="28" height="21" rx="4"/><path d="m13 12 9 6-9 5Z"/>',
 Music:'<path d="M13 25V5l16-3v19M13 9l16-3"/><ellipse cx="8" cy="26" rx="5" ry="4"/><ellipse cx="24" cy="22" rx="5" ry="4"/>',
 Clips:'<rect x="3" y="8" width="26" height="23" rx="2"/><path d="M3 15h26M4 8l5-6M14 8l5-6M24 8l5-6m-17 18 8 4-8 4Z"/>',
 Commands:'<path d="m4 7 9 9-9 9M17 27h12"/>',
};
function icon(key,w,h,x=34,y=52,size=34){return svg(w,h,`<g transform="translate(${x} ${y}) scale(${size/32})" stroke="#efeff1" stroke-width="1.7" fill="none" stroke-linejoin="round" stroke-linecap="round">${ICONS[key]||ICONS.Support}</g>`);}
async function psd(file,w,h,layers,texts,groups){
 async function pixel(l){const {data,info}=await sharp(l.input).ensureAlpha().raw().toBuffer({resolveWithObject:true});let minX=info.width,minY=info.height,maxX=-1,maxY=-1;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>0){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
  if(maxX<0)return {name:l.name,left:0,top:0,imageData:{width:1,height:1,data:new Uint8ClampedArray(4)}};
  const ww=maxX-minX+1,hh=maxY-minY+1,out=new Uint8ClampedArray(ww*hh*4);
  for(let y=0;y<hh;y++)out.set(data.subarray(((y+minY)*info.width+minX)*4,((y+minY)*info.width+minX+ww)*4),y*ww*4);
  return {name:l.name,left:(l.left||0)+minX,top:(l.top||0)+minY,imageData:{width:ww,height:hh,data:out}};
 }
 async function types(ts,ww,hh){const out=[];for(const t of ts){const p=await pixel(L('TEXT – '+t.value,textSvg(ww,hh,t)));out.push({...p,text:{text:t.value,transform:[1,0,0,1,t.x,t.y],shapeType:'point',pointBase:[0,0],style:{font:{name:t.font==='Georgia'?'Georgia':t.bold?(t.italic?'Arial-BoldItalicMT':'Arial-BoldMT'):'ArialMT'},fontSize:t.size,fillColor:{r:parseInt(t.color.slice(1,3),16),g:parseInt(t.color.slice(3,5),16),b:parseInt(t.color.slice(5,7),16)},autoKerning:true},paragraphStyle:{justification:'left'},antiAlias:'smooth'}});}return out;}
 let children=[],composite;
 if(groups){for(let i=0;i<groups.length;i++){const a=groups[i];const nodes=[];for(const l of a.layers)nodes.push(await pixel(l));nodes.push(...await types(a.texts,a.w,a.h));children.push({name:a.name,children:nodes,hidden:i!==0,opened:false});}const a=groups[0];composite=await canvas(w,h,[L('Visible',a.image)]);}
 else {for(const l of layers)children.push(await pixel(l));children.push(...await types(texts,w,h));composite=await canvas(w,h,[...layers,...texts.map(t=>L('Text',textSvg(w,h,t)))]);}
 // Native Photoshop layer styles remain editable together with the headline text.
 for(const node of children){if(node.text?.style.fontSize>=80){const red=false;
  const colors=red?[[255,130,130],[244,44,48],[116,5,12],[255,45,54],[139,8,16]]:[[243,237,255],[203,195,237],[156,169,224],[245,241,255],[189,181,226]];
  node.effects={scale:1,gradientOverlay:[{enabled:true,blendMode:'normal',opacity:1,align:true,scale:1,type:'linear',angle:90,gradient:{name:red?'Midnight Violet':'Moonlight Pearl',type:'solid',smoothness:1,colorStops:colors.map((c,i)=>({color:{r:c[0],g:c[1],b:c[2]},location:[0,.46,.5,.54,1][i],midpoint:.5})),opacityStops:[{opacity:1,location:0,midpoint:.5},{opacity:1,location:1,midpoint:.5}]}}],stroke:[{enabled:true,position:'outside',fillType:'color',blendMode:'normal',opacity:1,size:{units:'Pixels',value:.5},color:{r:200,g:201,b:205}}],dropShadow:[{enabled:true,blendMode:'multiply',opacity:.9,color:{r:0,g:0,b:0},angle:135,useGlobalLight:false,distance:{units:'Pixels',value:4},size:{units:'Pixels',value:5}}]};
  for(const k of ['gradientOverlay','stroke','dropShadow'])for(const effect of node.effects[k]){effect.present=true;effect.showInDialog=true;}
 }}
 const raw=await sharp(composite).ensureAlpha().raw().toBuffer();const result=writePsdBuffer({width:w,height:h,children,imageData:{width:w,height:h,data:new Uint8ClampedArray(raw)}},{noBackground:true,generateThumbnail:false,compress:false});
 fs.writeFileSync(path.join(ROOT,'PSD',file),result);const r=readPsd(result,{skipLayerImageData:true,skipCompositeImageData:true,skipThumbnail:true});if(r.width!==w||r.height!==h)throw Error('PSD dimensions');console.log('PSD '+file+' '+result.length);
}
(async()=>{
 frameBase=await sharp(path.join(ROOT,'Quellen/Glasrahmen.png')).extract({left:12,top:10,width:1648,height:922}).resize(900,494,{fit:'fill'}).png().toBuffer();
 panelBase=await sharp(path.join(ROOT,'Quellen/Glaspanel.png')).extract({left:10,top:138,width:2150,height:440}).png().toBuffer();
 garage=await sharp(path.join(ROOT,'Quellen/Citynight.png')).resize(W,H,{fit:'cover'}).png().toBuffer();
 await exportAsset('Citynight','Szenen',W,H,[L('Citynight – KI-Artwork',garage)]);
 const tint=svg(W,H,'<defs><linearGradient id="shade" x2="0" y2="1"><stop stop-color="#03030b" stop-opacity=".2"/><stop offset=".6" stop-color="#03030b" stop-opacity="0"/></linearGradient></defs><rect width="1920" height="1080" fill="url(#shade)"/>');
 const statuses=[['Starting-Soon','STARTING SOON','GLEICH GEHT ES LOS'],['Be-Right-Back','BE RIGHT BACK','EIN MOMENT ZUM DURCHATMEN'],['Stream-Ended','STREAM ENDED','DANKE FÜRS DABEISEIN'],['Offline','CURRENTLY OFFLINE','BIS ZUR NÄCHSTEN NACHT']];
 const scenes=[];
 for(const [name,title,sub] of statuses){const layers=[L('Citynight',garage),L('Atmosphäre',tint),L('Namensleiste',await plate(640,110),640,900)];
 const size=title.length>16?88:96;
 const metrics=await sharp(textSvg(W,H,txt(title,0,120,size,'#efe9ff',false,false,'Georgia'))).trim().metadata();
 const widths={'STARTING SOON':850,'BE RIGHT BACK':850,'STREAM ENDED':820,'CURRENTLY OFFLINE':1040};
 const texts=[txt(title,Math.round((W-widths[title])/2),365,size,'#efe9ff',false,false,'Georgia'),txt('MIDNIGHT CHILL',795,425,28,'#b6b9ff'),txt(sub,735,477,20,'#bdc4e6'),txt('DEIN KANAL',817,970,33),txt('@DEINHANDLE',837,1053,22,'#b6b9ff')];
 scenes.push(await exportAsset(name,'Szenen',W,H,layers,texts));}
 const main={x:424,y:212,w:1008,h:567},cam={x:1536,y:212,w:320,h:180},chat={x:1536,y:482,w:320,h:442};
 async function live(name,chatting){const holes=[main,...(chatting?[]:[cam]),chat];const layers=[L('Citynight mit echten Ausschnitten',await cutHoles(garage,W,H,holes)),L('Hauptfenster – Glasrahmen',await frame(1072,631,32),392,180),L('Chat – Glasrahmen',await frame(384,506,32),1504,450),L('Namensschild',await plate(800,104),540,52)];
  if(!chatting)layers.push(L('Webcam – Glasrahmen',await frame(384,244,32),1504,180));
  else layers.push(L('Citynight-Karte',await plate(384,244),1504,180));
  for(let i=0;i<3;i++)layers.push(L('Info '+i,await plate(350,90),392+i*361,884));
  const texts=[txt('DEIN KANAL',740,122,42,'#efe9ff'),txt('MIDNIGHT CHILL',28,1025,20,'#b8a9f2'),txt('LIVE CHAT',1564,473,17),txt(chatting?'TAKE IT SLOW':'WEBCAM',1564,202,17),txt('FOLLOWER',432,940,21),txt('SUB',793,940,21),txt('SUPPORT',1154,940,21)];return exportAsset(name,'Overlays',W,H,layers,texts,holes);}
 const liveAsset=await live('Live-Overlay',false),chatAsset=await live('Just-Chatting-Overlay',true);scenes.push(liveAsset,chatAsset);
 const fullHole={x:160,y:64,w:1600,h:900};
 const game=await exportAsset('Gameplay-Overlay','Overlays',W,H,[L('Gameplay-Rahmen',await frame(1728,1028),96,0),L('Kanalname',await plate(680,86),620,982)],[txt('DEIN KANAL',766,1038,35,'#eee9ff')],[fullHole]);scenes.push(game);
 const elements=[];
 for(const [name,w,h,e] of [['Webcam-16x9',704,424,32],['Webcam-Quadrat',576,576,32],['Webcam-Hochformat',424,704,32]])elements.push(await exportAsset(name,'Webcam',w,h,[L('Glasrahmen',await frame(w,h,e))],[],[{x:e,y:e,w:w-2*e,h:h-2*e}]));
 elements.push(await exportAsset('Kanalname','Elemente',960,140,[L('Glas und Licht',await plate(960,140))],[txt('DEIN KANAL',208,90,49,'#eee9ff')]));
 elements.push(await exportAsset('Bauchbinde','Elemente',960,180,[L('Glas und Licht',await plate(960,180))],[txt('DEIN KANAL',75,85,42),txt('@DEINHANDLE',77,130,25,'#b3a4f5')]));
 for(const [name,label] of [['Follower','NEUER FOLLOWER'],['Subscriber','NEUER SUB'],['Donation','VIELEN DANK'],['Raid','WILLKOMMEN RAID']])elements.push(await exportAsset('Alert-'+name,'Elemente',640,160,[L('Alert-Karte',await plate(640,160))],[txt(label,63,72,25),txt('DEIN NAME',65,115,27,'#b3a4f5')]));
 const panels=[];for(const [key,label] of [['About','ÜBER MICH'],['Schedule','ZEITPLAN'],['Rules','REGELN'],['Socials','SOCIALS'],['Equipment','SETUP'],['Contact','KONTAKT'],['Support','SUPPORT'],['Discord','DISCORD'],['Videos','VIDEOS'],['Music','MUSIK'],['Clips','CLIPS'],['Commands','BEFEHLE']]){
  const a=await exportAsset('Panel-'+key,'Panels',640,160,[L('Glas und Garage',await plate(640,160)),L('Symbol',icon(key,640,160,35,57,38)),L('Lichtakzent',svg(640,160,'<path d="M102 108h92" stroke="#9b8bf0" stroke-width="3"/>'))],[txt(label,103,92,30)]);panels.push(a);
  fs.writeFileSync(path.join(ROOT,'PNG/Panels',a.name+'-320.png'),await sharp(a.image).resize(320,80).png().toBuffer());
 }
 await exportAsset('Profil-Banner','Szenen',1200,480,[L('Garage',await sharp(garage).resize(1200,480,{fit:'cover'}).png().toBuffer()),L('Namensleiste',await plate(640,110),60,190)],[txt('DEIN KANAL',110,265,44,'#eee9ff'),txt('MIDNIGHT CHILL',65,85,24),txt('@DEINHANDLE',66,420,23)]);
 for(const a of scenes)await psd(a.name+'.psd',W,H,a.layers,a.texts);
 await psd('Panels.psd',640,160,null,null,panels);
 await psd('Elemente.psd',960,704,null,null,elements);
 // Real exports, not the approved concept board, are used for the shop previews.
 async function preview(a,file,title){let image=a.image;if(a.holes.length){const demos=a.holes.map((r,i)=>L('Demo',svg(r.w,r.h,`<rect width="${r.w}" height="${r.h}" fill="#101318"/><path d="M0 ${r.h}L${r.w} 0" stroke="#292e34" stroke-width="1"/><text x="24" y="${r.h/2}" fill="#b7bec8" font-family="Arial" font-size="${Math.max(15,Math.min(32,r.w/15))}">${i===0?'SPIEL / KAMERA':r.h>r.w?'LIVE CHAT':'WEBCAM'}</text><text x="24" y="${r.h/2+30}" fill="#6e7783" font-family="Arial" font-size="14">DEMO-PLATZHALTER</text>`),r.x,r.y));image=await canvas(a.w,a.h,[...demos,L('Overlay',a.image)]);}
  const out=await sharp(image).resize(1100,null,{withoutEnlargement:true}).flatten({background:'#08090b'}).jpeg({quality:91}).toBuffer();fs.writeFileSync(path.join(ROOT,'Shop-Vorschauen',file),out);
 }
 await preview(liveAsset,'01-Live.jpg');await preview(scenes[0],'02-Starting-Soon.jpg');await preview(chatAsset,'03-Chatting.jpg');await preview(scenes[1],'04-Pause.jpg');
 // Panel overview uses customer PNGs, downscaled proportionally.
 const panelLayers=[];for(let i=0;i<panels.length;i++)panelLayers.push(L(panels[i].name,await sharp(panels[i].image).resize(640,160).png().toBuffer(),20+(i%2)*660,20+Math.floor(i/2)*175));
 const panelView=await canvas(1340,1080,panelLayers);fs.writeFileSync(path.join(ROOT,'Shop-Vorschauen/05-Panels.jpg'),await sharp(panelView).flatten({background:'#08090b'}).resize(1100).jpeg({quality:91}).toBuffer());
 const cameraLayers=[];for(let i=0;i<3;i++)cameraLayers.push(L(elements[i].name,await sharp(elements[i].image).resize({width:i===2?300:550}).png().toBuffer(),20+i*575,50));
 const cameraView=await canvas(1750,690,cameraLayers);fs.writeFileSync(path.join(ROOT,'Shop-Vorschauen/06-Webcam.jpg'),await sharp(cameraView).flatten({background:'#14161b'}).resize(1100).jpeg({quality:91}).toBuffer());
 const report=assets.map(a=>({name:a.name,file:a.rel,noText:a.noText,width:a.w,height:a.h,windows:a.holes,texts:a.texts.map(t=>t.value)}));fs.writeFileSync(path.join(ROOT,'Asset-Manifest.json'),JSON.stringify(report,null,2));
 fs.writeFileSync(path.join(ROOT,'OBS-Positionen.json'),JSON.stringify({'Live-Overlay':{Gameplay:main,Webcam:cam,Chat:chat},'Just-Chatting-Overlay':{Kamera:main,Chat:chat},'Gameplay-Overlay':{Gameplay:fullHole}},null,2));
 console.log(JSON.stringify({assets:assets.length,psd:scenes.length+2,root:ROOT}));
})().catch(e=>{console.error(e);process.exitCode=1});
