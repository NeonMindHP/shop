import {readFile,writeFile} from 'node:fs/promises';
const resources={};
for(const [name,type] of [['showcase-entry.js','text/javascript'],['showcase.js','text/javascript'],['showcase.css','text/css']])resources['/'+name]={type:type+'; charset=utf-8',body:await readFile(new URL('../dist/'+name,import.meta.url),'utf8')};
await writeFile(new URL('../worker/showcase-resources.mjs',import.meta.url),'export const showcaseResources='+JSON.stringify(resources)+';\n');
