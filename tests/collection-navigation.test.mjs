import test from 'node:test';
import assert from 'node:assert/strict';
import {collectionPath,collectionReturn} from '../dist/collection-navigation.js';

test('category and search survive product navigation as a shareable collection URL',()=>{
 const path=collectionPath('Flyer & Werbung','Neon & Nacht');
 assert.equal(decodeURIComponent(new URL(path,'https://shop.neonmind-ai.com').pathname.split('/')[2]),'Flyer & Werbung');
 assert.equal(new URL(path,'https://shop.neonmind-ai.com').searchParams.get('q'),'Neon & Nacht');
 assert.equal(collectionReturn(path,'Wallpaper'),path);
 assert.equal(collectionPath('Alle',''),'/collections');
});
test('a directly opened product returns to its category without requiring prior history',()=>{
 assert.equal(collectionReturn(undefined,'Wallpaper'),'/collections/Wallpaper');
 assert.equal(collectionReturn(null,'Artist & Branding'),'/collections/Artist%20%26%20Branding');
});
test('collection return links cannot navigate to external origins or unrelated shop pages',()=>{
 for(const value of ['https://example.com/collections','//example.com/collections','/checkout','/collections-evil','javascript:alert(1)','/collections/Wallpaper#bad'])assert.equal(collectionReturn(value,'Wallpaper'),'/collections/Wallpaper');
});
