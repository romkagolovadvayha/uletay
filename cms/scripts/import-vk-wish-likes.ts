import './load-env';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';
import type {RowDataPacket} from 'mysql2';
import {normalizeWishArtistName as norm} from '../../shared/artist-wishes';
async function main(){
 const reportDir=path.resolve(__dirname,'../../artifacts/artist-wishes-2026-11-20');
 const db=await mysql.createConnection({host:'127.0.0.1',port:3352,user:'root',database:'uletay_web_design'});
 try{
  const [columns]=await db.query<RowDataPacket[]>("SHOW COLUMNS FROM artist_wish_mentions LIKE 'kind'");if(!columns.length)await db.query("ALTER TABLE artist_wish_mentions ADD COLUMN kind ENUM('request','like') NOT NULL DEFAULT 'request' AFTER source_key");
  const [rows]=await db.query<RowDataPacket[]>('SELECT content FROM app_content WHERE id=1');const data=JSON.parse(rows[0].content);const byName=new Map<string,string>(data.headliners.map((artist:any)=>[norm(artist.name),artist.id]));
  const classified=JSON.parse(await readFile(path.join(reportDir,'vk-classified-wishes.json'),'utf8'));const requests=new Map<string,{postId:number;artists:string[]}>(classified.map((row:any)=>[String(row.id),row]));
  const likes=JSON.parse(await readFile(path.join(reportDir,'vk-like-supporters.json'),'utf8'));const records=new Map<string,{artistId:string;authorHash:string;url:string;commentId:string}>();
  for(const comment of likes.comments){const request=requests.get(comment.commentId);if(!request)continue;for(const name of request.artists){const artistId=byName.get(norm(name));if(!artistId)continue;for(const authorHash of comment.supporters){if(!/^[a-f0-9]{64}$/.test(authorHash))throw Error('Invalid anonymized supporter');records.set(artistId+':'+authorHash,{artistId,authorHash,url:`https://vk.com/wall-10571147_${request.postId}`,commentId:comment.commentId});}}}
  const urls=[...new Set([...requests.values()].map(row=>`https://vk.com/wall-10571147_${row.postId}`))];
  const [before]=await db.query<RowDataPacket[]>('SELECT * FROM artist_wish_mentions WHERE festival_year=? AND platform=?',[data.festival.year,'vk']);await writeFile(path.join(reportDir,'vk-support-before-likes.json'),JSON.stringify(before,null,2));
  await db.beginTransaction();
  try{
   if(urls.length)await db.execute(`DELETE FROM artist_wish_mentions WHERE festival_year=? AND platform='vk' AND kind='like' AND source_url IN (${urls.map(()=>'?').join(',')})`,[data.festival.year,...urls]);
   const all=[...records.values()];for(let offset=0;offset<all.length;offset+=300){const batch=all.slice(offset,offset+300);await db.execute(`INSERT IGNORE INTO artist_wish_mentions(festival_year,artist_id,platform,author_hash,source_url,source_key,kind) VALUES ${batch.map(()=>"(?,?,'vk',?,?,?,'like')").join(',')}`,batch.flatMap(row=>[data.festival.year,row.artistId,row.authorHash,row.url,row.commentId]));}
   await db.commit();
  }catch(error){await db.rollback();throw error;}
  const [stats]=await db.query<RowDataPacket[]>("SELECT kind,COUNT(*) AS supports,COUNT(DISTINCT author_hash) AS accounts FROM artist_wish_mentions WHERE festival_year=? AND platform='vk' GROUP BY kind",[data.festival.year]);
  const report={comments:likes.comments.length,rawCommentLikes:likes.comments.reduce((n:number,row:any)=>n+row.count,0),candidateArtistSupports:records.size,stored:stats,collectedAt:likes.collectedAt,method:'One VK account per artist across request authors and comment likers. A like supports all artists requested in its comment. App votes and Telegram requests remain separate.'};
  await writeFile(path.join(reportDir,'vk-likes-import-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await db.end();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
