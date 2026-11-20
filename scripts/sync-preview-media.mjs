import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import path from 'node:path';
const source=JSON.parse(await readFile(new URL('../public/api/data',import.meta.url),'utf8'));
const root=path.resolve('uploads');const urls=new Set();
function scan(value){if(typeof value==='string'&&value.startsWith('/api/uploads/'))urls.add(value);else if(value&&typeof value==='object')for(const child of Object.values(value))scan(child);}
scan(source);
let downloaded=0,skipped=0;const failures=[];const queue=[...urls];
async function worker(){while(queue.length){const sourceUrl=queue.shift();const relative=decodeURIComponent(sourceUrl.slice('/api/uploads/'.length));const target=path.resolve(root,relative);if(!target.startsWith(root+path.sep)||relative.includes('..'))throw Error('Media path is outside uploads');try{if((await stat(target)).isFile()){skipped++;continue;}}catch{}
  try{const response=await fetch('https://uletayapp.ru'+sourceUrl,{signal:AbortSignal.timeout(30000)});if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))throw Error(`HTTP ${response.status}`);const body=Buffer.from(await response.arrayBuffer());if(body.length>20*1024*1024)throw Error('Image exceeds preview size limit');await mkdir(path.dirname(target),{recursive:true});await writeFile(target,body);downloaded++;}catch(error){failures.push({path:sourceUrl,error:error.message});}
}}
await Promise.all(Array.from({length:4},worker));
await mkdir('artifacts/web-redesign-2026-11-20',{recursive:true});await writeFile('artifacts/web-redesign-2026-11-20/media-sync.json',JSON.stringify({downloaded,skipped,failures},null,2));
console.log(JSON.stringify({downloaded,skipped,failed:failures.length}));if(failures.length)console.log(JSON.stringify(failures.slice(0,8)));
