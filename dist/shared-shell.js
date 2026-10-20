import {setupShopCore} from './core.js';
import {setupIdentity} from './identity.js';
setupShopCore();setupIdentity();
let cart=[];try{cart=JSON.parse(localStorage.getItem('nm-cart')||'[]')}catch{}
document.querySelector('#cartCount').textContent=cart.length;
document.querySelector('#cartButton').onclick=()=>{location.href='/?cart=open'};
