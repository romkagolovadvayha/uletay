import './load-env';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import sharp from 'sharp';
import { config } from '../src/lib/config';

const sources=[
  {name:'ПИЛОТ',file:'official-pilot-20261120.webp',page:'https://pilot.spb.ru/',url:'https://pilot.spb.ru/assets/img/photo_1.png'},
  {name:'АРИЯ',file:'official-aria-20261120.webp',page:'https://aria.ru/',url:'https://aria.ru/upload/commonImage/bg_group%20(1).jpg'},
  {name:'ВЯЧЕСЛАВ БУТУСОВ',file:'official-butusov-20261120.webp',page:'https://butusov.ru/',url:'https://butusov.ru/wp-content/uploads/2017/04/image-0087207.jpg'},
];
async function main(){
  if(config.dbName!=='uletay_web_design'||!['localhost','127.0.0.1'].includes(config.dbHost))throw Error('Portrait import is restricted to the isolated local preview database');
  const uploadDir=path.isAbsolute(process.env.UPLOAD_DIR||'')?process.env.UPLOAD_DIR!:path.resolve(__dirname,'..',process.env.UPLOAD_DIR||'../uploads');
  const connection=await mysql.createConnection({host:config.dbHost,port:config.dbPort,database:config.dbName,user:config.dbUser,password:config.dbPass});
  try{
    const [rows]=await connection.query<RowDataPacket[]>('SELECT content,SHA2(content,256) AS revision FROM app_content WHERE id=1');
    const data=JSON.parse(rows[0].content);const updated=[];
    await mkdir(path.join(uploadDir,'images'),{recursive:true});
    for(const source of sources){
      const response=await fetch(source.url,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error(`Portrait source HTTP ${response.status}`);
      const bytes=Buffer.from(await response.arrayBuffer());
      const original=sharp(bytes).rotate();
      await original.clone().resize({width:1400,height:1400,fit:'inside',withoutEnlargement:true}).webp({quality:86}).toFile(path.join(uploadDir,'images',source.file));
      await original.clone().resize(160,160,{fit:'cover'}).webp({quality:82}).toFile(path.join(uploadDir,'images',source.file.replace('.webp','-list.webp')));
      for(const artist of data.headliners){if(artist.name===source.name){artist.imageUrl=`/api/uploads/images/${source.file}`;updated.push(artist.name);}}
    }
    const [saved]=await connection.execute<ResultSetHeader>('UPDATE app_content SET content=? WHERE id=1 AND SHA2(content,256)=?',[JSON.stringify(data),rows[0].revision]);
    if(!saved.affectedRows)throw Error('Local catalog changed concurrently; retry after review');
    const report=path.resolve(__dirname,'../../artifacts/web-redesign-2026-11-20');await mkdir(report,{recursive:true});await writeFile(path.join(report,'official-photo-sources.json'),JSON.stringify({updated,sources,scope:'local-preview-only',note:'Original public promotional photographs; encoded as WebP without enlargement. No changes made to production CMS.'},null,2));
    console.log(`Local official portraits imported: ${updated.join(', ')}`);
  }finally{await connection.end();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
