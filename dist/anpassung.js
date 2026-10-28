window.mountNeonMindInquiry=async function(root=document){
 const form=root.querySelector('#inquiry'),status=root.querySelector('#status');if(!form||form.dataset.mounted)return;form.dataset.mounted='true';
 try{
  const {mountFilePicker,mountHumanCheck}=await import('/form-tools.js');if(!form.isConnected)return;
  const picker=mountFilePicker(form),human=mountHumanCheck(form,'shop_inquiry');
  form.addEventListener('submit',async e=>{e.preventDefault();if(!form.reportValidity())return;const button=form.querySelector('button[type=submit]');button.disabled=true;status.textContent='Deine Anfrage und Anhänge werden übertragen …';
   try{const data=new FormData(form);data.set('consent',String(form.elements.consent.checked));data.set('turnstileToken',human.token());for(const file of picker.files())data.append('attachments',file,file.name);
    const r=await fetch('/api/inquiries',{method:'POST',body:data}),b=await r.json();if(!r.ok)throw Error(b.error||'Die Anfrage konnte nicht gespeichert werden.');form.reset();picker.clear();status.textContent='Deine Anfrage ist in unserer Shop-Verwaltung eingegangen. Referenz: '+b.id+(b.attachments?' · '+b.attachments+' Anhänge gespeichert.':'')+'\nBitte bewahre diese Referenz auf. Wir senden dir eine Eingangsbestätigung per E-Mail.';
   }catch(error){status.textContent=error.message+' Deine Eingaben und ausgewählten Dateien bleiben erhalten.'}finally{human.reset();button.disabled=!human.ready()}
  });
  const requested=new URLSearchParams(location.search).get('produkt');if(requested&&/^[a-z0-9-]{1,48}$/.test(requested)){fetch('/api/products').then(r=>r.json()).then(items=>{const item=items.find(p=>p.id===requested);if(item)form.elements.product.value=item.name}).catch(()=>{form.elements.product.value=requested})}
 }catch{status.textContent='Das Formular konnte gerade nicht geladen werden. Bitte lade die Seite erneut.'}
};window.mountNeonMindInquiry();
