import test from 'node:test';
import assert from 'node:assert/strict';
import {readWishlist,productBadge,relatedProducts,updateNotice} from '../dist/discovery.js';
test('wishlist tolerates blocked storage, rejects malformed IDs and bounds saved selections',()=>{
 assert.deepEqual(readWishlist({getItem(){throw Error('blocked')}}),[]);
 assert.deepEqual(readWishlist({getItem:()=>'{broken'}),[]);
 assert.deepEqual(readWishlist({getItem:()=>JSON.stringify(['aurora','aurora',null,'<script>','flow'])}),['aurora','flow']);
 assert.equal(readWishlist({getItem:()=>JSON.stringify(Array.from({length:300},(_,i)=>'p-'+i))}).length,200);
});
test('new badges expire and do not mark future or historical placeholder dates as new',()=>{
 const now=1800000000000;
 assert.equal(productBadge({createdAt:now-1000},now),'Neu');
 assert.equal(productBadge({createdAt:now+1},now),'');
 assert.equal(productBadge({createdAt:3},now),'');
 assert.equal(productBadge({createdAt:now-31*86400000},now),'');
 assert.equal(productBadge({releaseLabel:'Erweitert'},now),'Erweitert');
});
test('recommendations honor manual ordering, exclude current/missing products and fall back to category',()=>{
 const p={id:'main',category:'Wallpaper',relatedIds:'b, main, unavailable, a'};
 const list=[p,{id:'a',category:'Wallpaper'},{id:'b',category:'Other'},{id:'c',category:'Wallpaper'}];
 assert.deepEqual(relatedProducts(p,list).map(x=>x.id),['b','a']);
 assert.deepEqual(relatedProducts({...p,relatedIds:''},list).map(x=>x.id),['a','c']);
});
test('update descriptions render as text rather than executable markup and empty metadata stays hidden',()=>{
 assert.equal(updateNotice({}),'');
 const html=updateNotice({version:'<img src=x>',changeNotes:'<script>alert(1)</script>'});
 assert.ok(!html.includes('<script>'));
 assert.ok(html.includes('&lt;script&gt;'));
 assert.ok(!html.includes('<img'));
});
