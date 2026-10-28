let scriptPromise,configPromise;
function style(){if(document.querySelector('link[data-form-tools]'))return;const link=document.createElement('link');link.rel='stylesheet';link.href='/form-tools.css';link.dataset.formTools='';document.head.append(link)}
function loadTurnstile(){
 if(window.turnstile)return Promise.resolve();
 return scriptPromise??=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.onload=()=>resolve();script.onerror=()=>{scriptPromise=null;script.remove();reject(Error('Die Mensch-Prüfung konnte nicht geladen werden. Bitte lade die Seite neu.'))};document.head.append(script)});
}
export function mountHumanCheck(form,action){
 style();let token='',id=null,visibilityObserver=null,releaseVisibility=null;
 const submit=form.querySelector('[type=submit]'),slot=document.createElement('div'),widget=document.createElement('div'),notice=document.createElement('p'),retry=document.createElement('button');
 slot.className='shop-human-check';slot.setAttribute('aria-label','Cloudflare Mensch-Prüfung');notice.className='shop-human-status';notice.setAttribute('role','status');notice.textContent='Mensch-Prüfung wird geladen …';retry.type='button';retry.className='button';retry.textContent='Prüfung neu laden';retry.hidden=true;slot.append(widget,notice,retry);submit.before(slot);submit.disabled=true;
 const refresh=()=>{token='';submit.disabled=true};
 retry.onclick=()=>{refresh();retry.hidden=true;notice.textContent='Mensch-Prüfung wird neu geladen …';if(id!==null&&window.turnstile)window.turnstile.reset(id);else location.reload()};
 (async()=>{try{
  const config=await (configPromise??=fetch('/api/form-security').then(async r=>{if(!r.ok)throw Error('Die Sicherheitsprüfung ist gerade nicht verfügbar.');return r.json()}));if(!config.enabled||!config.siteKey)throw Error('Die Sicherheitsprüfung ist gerade nicht verfügbar.');
  await loadTurnstile();if(!form.isConnected)return;
  await new Promise(resolve=>{releaseVisibility=resolve;visibilityObserver=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){visibilityObserver.disconnect();resolve()}},{rootMargin:'100px'});visibilityObserver.observe(slot)});
  if(!form.isConnected)return;
  notice.textContent='Bitte schließe die Mensch-Prüfung ab.';
  id=window.turnstile.render(widget,{sitekey:config.siteKey,action,theme:'dark',size:'flexible',language:'de',callback:value=>{token=value;submit.disabled=false;notice.textContent='Mensch-Prüfung erfolgreich.';retry.hidden=true},'expired-callback':()=>{refresh();notice.textContent='Die Prüfung ist abgelaufen. Bitte bestätige sie erneut.';retry.hidden=false},'timeout-callback':()=>{refresh();notice.textContent='Die Mensch-Prüfung wurde nicht abgeschlossen. Bitte erneut versuchen.';retry.hidden=false},'error-callback':()=>{refresh();notice.textContent='Die Mensch-Prüfung konnte nicht abgeschlossen werden. Bitte erneut versuchen.';retry.hidden=false;return true}});
 }catch(error){notice.textContent=error.message;retry.hidden=false;configPromise=null}})();
 const observer=new MutationObserver(()=>{if(!form.isConnected){visibilityObserver?.disconnect();releaseVisibility?.();if(id!==null&&window.turnstile)window.turnstile.remove(id);observer.disconnect()}});observer.observe(document.body,{childList:true,subtree:true});
 return {token(){if(!token)throw Error('Bitte bestätige zuerst, dass du ein Mensch bist.');return token},ready:()=>!!token,reset(){refresh();notice.textContent='Bitte schließe die Mensch-Prüfung erneut ab.';if(id!==null&&window.turnstile)window.turnstile.reset(id)},destroy(){observer.disconnect();visibilityObserver?.disconnect();releaseVisibility?.();if(id!==null&&window.turnstile)window.turnstile.remove(id)}};
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
