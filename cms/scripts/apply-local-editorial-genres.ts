import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { normalizeManualArtistGenres } from '../../shared/music-genres';
import type { AppData } from '../src/types';

async function main(){
 if(process.env.DB_NAME!=='uletay_web_design'||process.env.DB_PORT!=='3352')throw Error('Only isolated local preview is allowed');
 const directory=resolve('../artifacts/artist-redesign-2026-11-20');
 const rows=JSON.parse(await readFile(resolve(directory,'editorial-genres-reviewed.json'),'utf8')) as {id:string;name:string;genres:string[]}[];
 const reviewed=new Map(rows.map(a=>[a.id,a]));if(rows.length!==870||reviewed.size!==rows.length)throw Error('Unexpected catalog size');
 for(const a of rows)if(normalizeManualArtistGenres(a.genres).length!==a.genres.length)throw Error(`Invalid genre: ${a.name}`);
 const db=await mysql.createConnection({host:'127.0.0.1',port:3352,user:'root',database:'uletay_web_design'});
 try{
  await db.beginTransaction();const [records]=await db.query<RowDataPacket[]>('SELECT content FROM app_content WHERE id=1 FOR UPDATE');
  const raw=records[0].content as string,data=JSON.parse(raw) as AppData;
  await writeFile(resolve(directory,`editorial-genres-backup-${Date.now()}.json`),raw,{flag:'wx'});
  let filled=0;for(const a of data.headliners){const proposal=reviewed.get(a.id);if(proposal?.genres.length){a.genres=proposal.genres;filled++;}}
  await db.execute('UPDATE app_content SET content=?,updated_at=NOW() WHERE id=1',[JSON.stringify(data)]);await db.commit();
  const report={artists:data.headliners.length,filled,needsIdentityReview:rows.filter(a=>!a.genres.length).map(a=>({id:a.id,name:a.name})),scope:'isolated-local-preview',lastfmGenreSync:false};
  await writeFile(resolve(directory,'editorial-genres-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }catch(error){await db.rollback();throw error;}finally{await db.end();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
