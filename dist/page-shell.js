// Main and footer share one outline on the requested shop pages.
// The home page retains its existing slider and shelves composition.
const framedPages=new Set(['passwort-vergessen','passwort-zuruecksetzen','collections','wuensche','account','login','register','checkout','studio','product','downloads']);
export function updatePageFrame(page) {
  const shell=document.querySelector('.shell');if(!shell)return;
  let frame=shell.querySelector(':scope > .shop-page-frame');
  if(!frame){
    const main=shell.querySelector(':scope > main'),footer=shell.querySelector(':scope > .shop-footer');
    if(!main||!footer)return;
    frame=document.createElement('div');frame.className='shop-page-frame';
    shell.insertBefore(frame,main);frame.append(main,footer);
  }
  page??=shell.classList.contains('studio-shell')?'studio':location.pathname.replace(/^\//,'').split('/')[0]||'home';
  frame.dataset.page=page;frame.classList.toggle('is-framed',framedPages.has(page));
}
