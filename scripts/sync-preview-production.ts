import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {mkdir,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {validateAppData} from '../shared/app-data-validation';

async function main(){
  const require=createRequire(path.resolve('cms/package.json'));
  const mysql=require('mysql2/promise');
  const origin='https://uletayapp.ru';
  const response=await fetch(`${origin}/api/data`,{headers:{Accept:'application/json','Cache-Control':'no-cache'},signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error(`Production catalog HTTP ${response.status}`);
  const remote=await response.json();
  if(!validateAppData(remote))throw Error('Production catalog did not pass the application validator');
  const {revision:productionRevision,...catalog}=remote;
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  const reportDir=path.resolve('artifacts',`preview-production-sync-${stamp}`);
  await mkdir(reportDir,{recursive:true});
  const uploads=path.resolve('uploads');const urls=new Set<string>();
  function scan(value:unknown){
    if(typeof value==='string'){
      const url=new URL(value,origin);
      if(url.origin===origin&&url.pathname.startsWith('/api/uploads/'))urls.add(url.pathname);
    }else if(value&&typeof value==='object')for(const child of Object.values(value))scan(child);
  }
  scan(catalog);
  const queue=[...urls];const failures:{path:string;error:string}[]=[];let downloaded=0,existing=0;
  async function worker(){while(queue.length){
    const remotePath=queue.shift()!;
    const target=path.resolve(uploads,decodeURIComponent(remotePath.slice('/api/uploads/'.length)));
    if(!target.startsWith(uploads+path.sep))throw Error('Media path escapes the local uploads directory');
    try{if((await stat(target)).isFile()){existing++;continue;}}catch{}
    try{
      const image=await fetch(origin+remotePath,{signal:AbortSignal.timeout(30000)});
      if(!image.ok||!image.headers.get('content-type')?.startsWith('image/'))throw Error(`HTTP ${image.status}`);
      const bytes=Buffer.from(await image.arrayBuffer());if(bytes.length>20*1024*1024)throw Error('Image exceeds 20 MiB');
      await mkdir(path.dirname(target),{recursive:true});await writeFile(target,bytes);downloaded++;
    }catch(error){failures.push({path:remotePath,error:(error as Error).message});}
  }}
  await Promise.all(Array.from({length:4},worker));
  // This target is deliberately fixed: the script cannot write to production.
  const connection=await mysql.createConnection({host:'127.0.0.1',port:3352,user:'root',database:'uletay_web_design',charset:'utf8mb4'});
  try{
    const [rows]=await connection.query('SELECT DATABASE() AS db');
    if(rows[0].db!=='uletay_web_design')throw Error('Unexpected database');
    const [beforeRows]=await connection.query('SELECT content,SHA2(content,256) AS revision FROM app_content WHERE id=1');
    const before=JSON.parse(beforeRows[0].content);
    await writeFile(path.join(reportDir,'local-catalog-before.json'),JSON.stringify(before,null,2));
    const json=JSON.stringify(catalog);
    const [saved]=await connection.execute('UPDATE app_content SET content=?,updated_at=NOW() WHERE id=1 AND SHA2(content,256)=?',[json,beforeRows[0].revision]);
    if(saved.affectedRows!==1)throw Error('Local catalog changed during synchronization; no concurrent edits overwritten');
    await writeFile(path.resolve('public/api/data'),json);
    await writeFile(path.join(reportDir,'production-catalog.json'),JSON.stringify(remote,null,2));
    const report={source:`${origin}/api/data`,syncedAt:new Date().toISOString(),target:'127.0.0.1:3352/uletay_web_design/app_content',productionRevision,localRevision:createHash('sha256').update(json).digest('hex'),before:{artists:before.headliners.length,schedule:before.schedule.length},after:{artists:catalog.headliners.length,schedule:catalog.schedule.length,autographs:catalog.autographs.length,foodcourt:catalog.foodcourt.length,zones:catalog.mapZones?.features.length,pois:catalog.mapPois?.features.length},media:{downloaded,existing,failures},scope:'Public application content only; no production writes or account/session copies'};
    await writeFile(path.join(reportDir,'report.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify({report:reportDir,...report.after,media:report.media},null,2));
  }finally{await connection.end();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
