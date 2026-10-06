const fs=require('node:fs'),path=require('node:path');
const modules=fs.existsSync(path.resolve(__dirname,'../stream-assets/node_modules'))?'../stream-assets/node_modules':'../stream-builder/node_modules';
const sharp=require(modules+'/sharp');
const {readPsd,writePsdBuffer,initializeCanvas}=require(modules+'/ag-psd');
initializeCanvas(()=>{throw Error('Canvas rendering is not used');},(width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4)}));
const root=process.env.NEONMIND_PITLANE_ROOT||path.resolve(__dirname,'../../outputs/NeonMind-Pitlane-v1');
(async()=>{for(const name of ['Starting-Soon','Be-Right-Back','Stream-Ended','Offline']){
 const file=path.join(root,'PSD',name+'.psd');
 const psd=readPsd(fs.readFileSync(file),{useImageData:true,skipThumbnail:true});
 const {data,info}=await sharp(path.join(root,'PNG/Szenen',name+'.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 psd.imageData={width:info.width,height:info.height,data:new Uint8ClampedArray(data)};
 fs.writeFileSync(file,writePsdBuffer(psd,{noBackground:true,generateThumbnail:false,compress:false}));
}})().catch(e=>{console.error(e);process.exitCode=1});
