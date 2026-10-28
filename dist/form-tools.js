let scriptPromise,configPromise;
function style(){if(document.querySelector('link[data-form-tools]'))return;const link=document.createElement('link');link.rel='stylesheet';link.href='/form-tools.css';link.dataset.formTools='';document.head.append(link)}
function loadTurnstile(){
 if(window.turnstile)return Promise.resolve();
 return scriptPromise??=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.onload=()=>resolve();script.onerror=()=>{scriptPromise=null;script.remove();reject(Error('Die Mensch-Prüfung konnte nicht geladen werden. Bitte lade die Seite neu.'))};document.head.append(script)});
}
export function mountHumanCheck(form,action){
 style();let token='',id=null;const submit=form.querySelector('[type=submit]'),slot=document.createElement('div');slot.className='shop-human-check';slot.setAttribute('aria-label','Cloudflare Mensch-Prüfung');slot.textContent='Mensch-Prüfung wird geladen …';submit.before(slot);submit.disabled=true;
 const refresh=()=>{token='';submit.disabled=true};
 (async()=>{try{const config=await (configPromise??=fetch('/api/form-security').then(async r=>{if(!r.ok)throw Error('Die Sicherheitsprüfung ist gerade nicht verfügbar.');return r.json()}));if(!config.enabled||!config.siteKey)throw Error('Die Sicherheitsprüfung ist gerade nicht verfügbar.');await loadTurnstile();if(!form.isConnected)return;slot.textContent='';id=window.turnstile.render(slot,{sitekey:config.siteKey,action,theme:'dark',size:'flexible',language:'de',callback:value=>{token=value;submit.disabled=false},'expired-callback':refresh,'timeout-callback':refresh,'error-callback':()=>{refresh();slot.setAttribute('aria-label','Bitte die Mensch-Prüfung erneut versuchen.')}})}catch(error){slot.textContent=error.message;slot.setAttribute('role','alert');configPromise=null}})();
 const observer=new MutationObserver(()=>{if(!form.isConnected){if(id!==null&&window.turnstile)window.turnstile.remove(id);observer.disconnect();}});observer.observe(document.body,{childList:true,subtree:true});
 return {token(){if(!token)throw Error('Bitte bestätige zuerst, dass du ein Mensch bist.');return token},ready:()=>!!token,reset(){refresh();if(id!==null&&window.turnstile)window.turnstile.reset(id)},destroy(){observer.disconnect();if(id!==null&&window.turnstile)window.turnstile.remove(id)}};
}
export function mountFilePicker(form){
 style();let files=[];const label=document.createElement('label');label.className='shop-file-picker';label.innerHTML='<input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.txt,.zip"><span class="shop-file-plus" aria-hidden="true">＋</span><span><strong>Dateien hinzufügen</strong><small>PDF, PNG, JPG, TXT oder ZIP · max. 5 Dateien · zusammen max. 25 MB</small></span>';
 const list=document.createElement('div');list.className='shop-file-list';const error=document.createElement('p');error.className='shop-file-error';error.setAttribute('role','alert');
 const position=form.querySelector('.wishes-privacy,.check,[type=submit]');position.before(label,list,error);
 const input=label.querySelector('input');
 const render=()=>{list.replaceChildren();files.forEach((file,i)=>{const row=document.createElement('div'),name=document.createElement('span'),remove=document.createElement('button');name.textContent=file.name+' · '+(file.size/1048576).toLocaleString('de-DE',{maximumFractionDigits:2})+' MB';remove.type='button';remove.textContent='×';remove.setAttribute('aria-label',file.name+' entfernen');remove.onclick=()=>{files.splice(i,1);error.textContent='';render()};row.append(name,remove);list.append(row)})};
 input.onchange=()=>{const next=[...files,...Array.from(input.files)];input.value='';if(next.length>5){error.textContent='Bitte höchstens fünf Dateien auswählen.';return}if(next.some(f=>!f.size||!(/\.(pdf|png|jpe?g|txt|zip)$/i.test(f.name)))){error.textContent='Bitte nicht leere PDF-, PNG-, JPG-, TXT- oder ZIP-Dateien auswählen.';return}if(next.reduce((n,f)=>n+f.size,0)>25*1024*1024){error.textContent='Die Dateien dürfen zusammen höchstens 25 MB groß sein.';return}files=next;error.textContent='';render()};
 return {files:()=>files,clear(){files=[];error.textContent='';render()}};
}
