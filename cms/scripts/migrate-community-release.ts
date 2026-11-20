import './load-env';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';
import type {RowDataPacket,ResultSetHeader} from 'mysql2';
import {mergeCommunityRelease,type CommunityReleaseSeed} from '../../shared/community-release';
import {validateAppData} from '../../shared/app-data-validation';
async function main(){
 if(!process.argv.includes('--apply-production')||process.env.NODE_ENV!=='production')throw Error('Explicit production migration is required');
 const seed=JSON.parse(await readFile(path.resolve('data/community-release-20261121.json'),'utf8')) as CommunityReleaseSeed;
 const mentions=JSON.parse(await readFile(path.resolve('data/community-mentions-20261121.json'),'utf8')) as {festival_year:number;artist_id:string;platform:string;author_hash:string;source_url:string;source_key:string;kind:string}[];
 const db=await mysql.createConnection({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),database:process.env.DB_NAME,user:process.env.DB_USER,password:process.env.DB_PASS});
 try{await db.beginTransaction();const [rows]=await db.query<RowDataPacket[]>('SELECT content FROM app_content WHERE id=1 FOR UPDATE');
  if(!rows[0])throw Error('Production catalog is empty');const current=JSON.parse(rows[0].content),next=mergeCommunityRelease(current,seed);
  if(Number(current.festival.year)!==seed.festivalYear){await db.rollback();console.log('Community release skipped: a different festival is active');return;}
  if(!validateAppData(next))throw Error('Merged community catalog is invalid');
  const changed=JSON.stringify(next)!==JSON.stringify(current);
  if(changed){const directory=path.resolve('../backups/community');await mkdir(directory,{recursive:true,mode:0o700});await writeFile(path.join(directory,`${seed.version}-${Date.now()}.json`),JSON.stringify(current),{mode:0o600,flag:'wx'});await db.execute('UPDATE app_content SET content=?,updated_at=NOW() WHERE id=1',[JSON.stringify(next)]);}
  let inserted=0;
  for(let offset=0;offset<mentions.length;offset+=400){const batch=mentions.slice(offset,offset+400);if(batch.some(row=>row.festival_year!==seed.festivalYear||!['vk','telegram'].includes(row.platform)||!/^[a-f0-9]{64}$/.test(row.author_hash)))throw Error('Invalid reviewed community support row');
    const [result]=await db.query<ResultSetHeader>(`INSERT IGNORE INTO artist_wish_mentions(festival_year,artist_id,platform,author_hash,source_url,source_key,kind) VALUES ${batch.map(()=>'(?,?,?,?,?,?,?)').join(',')}`,batch.flatMap(row=>[row.festival_year,row.artist_id,row.platform,row.author_hash,row.source_url,row.source_key,row.kind]));inserted+=result.affectedRows;
  }
  await db.commit();console.log(JSON.stringify({communityRelease:seed.version,artistsBefore:current.headliners.length,artistsAfter:next.headliners.length,reviewedSupportAdded:inserted,catalogChanged:changed,appVotesPreserved:true}));
 }catch(error){await db.rollback();throw error;}finally{await db.end();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
