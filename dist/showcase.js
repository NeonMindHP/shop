if(document.body.hasAttribute('data-showcase')){
 document.body.insertAdjacentHTML('afterbegin','<aside class="showcase-notice" aria-label="Vorführansicht"><span>Vorführansicht · Einkaufen ist deaktiviert</span><button type="button">Ansicht beenden ×</button></aside>');
 document.querySelector('.showcase-notice button').onclick=async()=>{const r=await fetch('/api/showcase/end',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(r.ok)location.assign('/')};
 document.addEventListener('click',e=>{if(e.target.closest('[data-add],#cartButton,#checkoutLink')){e.preventDefault();e.stopImmediatePropagation()}},true);
}
