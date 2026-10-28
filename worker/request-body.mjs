export async function limitedText(request,maxBytes){
 if(Number(request.headers.get('Content-Length'))>maxBytes)throw Error('UPLOAD_TOO_LARGE');
 if(!request.body)return '';
 const reader=request.body.getReader(),decoder=new TextDecoder();let total=0,text='';
 try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>maxBytes){await reader.cancel();throw Error('UPLOAD_TOO_LARGE')}text+=decoder.decode(value,{stream:true})}return text+decoder.decode()}finally{reader.releaseLock()}
}
