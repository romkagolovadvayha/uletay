import './load-env';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,copyFile,access} from 'node:fs/promises';
import path from 'node:path';
import mysql,{type RowDataPacket,type ResultSetHeader} from 'mysql2/promise';
import sharp from 'sharp';

async function main(){
  assert(process.env.DB_NAME==='uletay_web_design'&&process.env.DB_PORT==='3352','Only the isolated preview database may be repaired');
  const root=path.resolve(__dirname,'../..'),reportDir=path.join(root,'artifacts/qa-seo-2026-11-20');
  const audit=JSON.parse(await readFile(path.join(reportDir,'media-http.json'),'utf8'));
  const sources=JSON.parse(await readFile(path.join(root,'artifacts/artist-wishes-2026-11-20/photo-sources.json'),'utf8'));
  const production=await (await fetch('https://uletayapp.ru/api/data',{signal:AbortSignal.timeout(15000)})).json();
  const db=await mysql.createConnection({host:'127.0.0.1',port:3352,user:'root',database:'uletay_web_design'});
  const updated=[];
  try{
    const [rows]=await db.query<RowDataPacket[]>('SELECT content,SHA2(content,256) AS revision FROM app_content WHERE id=1');
    const data=JSON.parse(rows[0].content);
    await writeFile(path.join(reportDir,'catalog-before-portrait-repair.json'),JSON.stringify(data));
    await writeFile(path.join(reportDir,'photo-sources-before-repair.json'),JSON.stringify(sources));
    for(const {id} of audit.imagesBelow320){
      const artist=data.headliners.find((a:{id:string})=>a.id===id);assert(artist);
      const previous=artist.imageUrl;
      const existing=production.headliners.find((a:{id:string})=>a.id===id);
      let next:string,source:string;
      if(existing?.imageUrl?.startsWith('/api/uploads/images/')){
        const local=path.join(root,'uploads',decodeURIComponent(existing.imageUrl.replace('/api/uploads/','')));
        const metadata=await sharp(local).metadata();assert(Math.min(metadata.width!,metadata.height!)>=320,id);
        next=existing.imageUrl;source='Existing public CMS original';
      }else{
        const original=new URL(sources[id]?.original);assert(/(^|\.)userapi\.com$/.test(original.hostname));
        const sizes=(original.searchParams.get('as')||'').split(',').filter(size=>/^\d+x\d+$/.test(size)).sort((a,b)=>Number(b.split('x')[0])-Number(a.split('x')[0]));
        assert(sizes.length&&Number(sizes[0].split('x')[0])>=320,id);
        original.searchParams.set('cs',sizes[0]);
        const result=await fetch(original,{signal:AbortSignal.timeout(20000)});assert.equal(result.status,200,id);
        const bytes=Buffer.from(await result.arrayBuffer()),metadata=await sharp(bytes).metadata();assert(Math.min(metadata.width!,metadata.height!)>=320,id);
        const encoded=await sharp(bytes).webp({quality:90}).toBuffer();
        const hash=createHash('sha256').update(encoded).digest('hex').slice(0,12);
        const filename=`${id}-portrait-${hash}.webp`;
        await writeFile(path.join(root,'uploads/images',filename),encoded);
        const oldThumbnail=path.join(root,'uploads',previous.replace('/api/uploads/','').replace(/\.webp$/,'-list.webp'));
        await access(oldThumbnail);await copyFile(oldThumbnail,path.join(root,'uploads/images',filename.replace('.webp','-list.webp')));
        next=`/api/uploads/images/${filename}`;source=original.href;
      }
      artist.imageUrl=next;if(sources[id])sources[id].imageUrl=next;updated.push({id,name:artist.name,previous,imageUrl:next,source});
    }
    const [saved]=await db.execute<ResultSetHeader>('UPDATE app_content SET content=? WHERE id=1 AND SHA2(content,256)=?',[JSON.stringify(data),rows[0].revision]);
    assert.equal(saved.affectedRows,1,'Catalog changed concurrently; repair was not saved');
    await writeFile(path.join(root,'artifacts/artist-wishes-2026-11-20/photo-sources.json'),JSON.stringify(sources,null,2)+'\n');
    await writeFile(path.join(reportDir,'portrait-repair.json'),JSON.stringify({scope:'isolated-local-database-only',updated},null,2)+'\n');
    console.log(`Restored ${updated.length} artist portraits from existing originals or explicitly available larger source sizes; no production writes.`);
  }finally{await db.end();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
