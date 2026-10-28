const form=document.querySelector('#withdrawForm'),status=document.querySelector('#withdrawStatus');
let requestId=crypto.randomUUID(),receipt='';
form.addEventListener('input',()=>{requestId=crypto.randomUUID()});
form.onsubmit=async event=>{
 event.preventDefault();const button=form.querySelector('[type=submit]');button.disabled=true;status.textContent='Ihre Erklärung wird übermittelt …';
 try{
  const body={...Object.fromEntries(new FormData(form)),id:requestId};
  const response=await fetch('/api/withdrawals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),data=await response.json();
  if(!response.ok)throw Error(data.error||'Die Erklärung konnte nicht übermittelt werden. Bitte verwenden Sie alternativ info@neonmind-ai.com.');
  receipt=data.receipt;document.querySelector('#withdrawReceiptText').textContent=receipt;document.querySelector('#withdrawReceipt').hidden=false;
  status.textContent=data.mailSent?'Ihre Erklärung wurde gespeichert und die Eingangsbestätigung per E-Mail versendet.':'Ihre Erklärung wurde gespeichert. Die Eingangsbestätigung ist für den E-Mail-Versand vorgemerkt. Sie können die Bestätigung hier zusätzlich speichern.';
 }catch(error){status.textContent=error.message}finally{button.disabled=false}
};
document.querySelector('#saveWithdrawReceipt').onclick=()=>{const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([receipt],{type:'text/plain;charset=utf-8'}));link.download='NeonMind-Widerruf-'+requestId+'.txt';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000)};
