export const products = Object.freeze([
 {id:'aurora',name:'Aurora Nights',category:'Wallpaper',price:990,image:'assets/aurora.png',description:'Polarlichter, stille Bergseen und tiefe Nachtfarben. Eine Kollektion für deinen digitalen Rückzugsort.',contents:'Geplant: 12 Wallpaper · PC & Smartphone',formats:'Geplant: JPG / PNG, Desktop und Hochformat',demo:'assets/aurora.png'},
 {id:'flow',name:'Neon Flow',category:'Wallpaper',price:790,image:'assets/flow.png',description:'Fließendes Licht in Cyan, Violett und Pink. Abstrakte Formen mit der Energie von NeonMind.',contents:'Geplant: 10 Wallpaper · PC & Smartphone',formats:'Geplant: JPG / PNG, Desktop und Hochformat',demo:'assets/flow.png'},
 {id:'stream',name:'Stream Essentials',category:'Streaming',price:1990,image:'assets/stream.png',description:'Ein zusammenhängender Look für deinen Stream: klare Flächen, feine Leuchtrahmen und Neon-Akzente.',contents:'Geplant: Overlays · Panels · Screens',formats:'Geplant: PNG mit Transparenz und Hintergrundbilder',demo:'assets/stream.png'}
]);
export const money = cents => new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(cents / 100);
