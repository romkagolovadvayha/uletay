import './load-env';
import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import mysql from 'mysql2/promise';
import type {RowDataPacket,ResultSetHeader} from 'mysql2';
import sharp from 'sharp';
import {normalizeWishArtistName as norm} from '../../shared/artist-wishes';

async function main(){
 const root=path.resolve(__dirname,'../..');const reportDir=path.join(root,'artifacts/artist-wishes-2026-11-20');const imageDir=path.join(root,'uploads/images');
 const db=await mysql.createConnection({host:'127.0.0.1',port:3352,user:'root',database:'uletay_web_design'});
 try{
  const [rows]=await db.query<RowDataPacket[]>('SELECT content,SHA2(content,256) AS revision FROM app_content WHERE id=1');const data=JSON.parse(rows[0].content);
  const photos=JSON.parse(await readFile(path.join(reportDir,'photo-sources.json'),'utf8'));const report=JSON.parse(await readFile(path.join(reportDir,'import-report.json'),'utf8'));
  await writeFile(path.join(reportDir,'catalog-before-media-finalization.json'),JSON.stringify(data,null,2));
  // This phrase has no verified musical identity; preserve the raw requests for review.
  const unresolved=data.headliners.filter((artist:any)=>artist.name==='Выставка Кошек');data.headliners=data.headliners.filter((artist:any)=>artist.name!=='Выставка Кошек');
  const graphics:string[]=[];let versioned=0;
  for(const artist of data.headliners){
   if(photos[artist.id]){
    const record=photos[artist.id];const original=path.join(root,'uploads',record.imageUrl.replace('/api/uploads/',''));const bytes=await readFile(original);const hash=createHash('sha256').update(bytes).digest('hex').slice(0,8);const filename=`${artist.id}-wish-${hash}.webp`;const target=path.join(imageDir,filename);if(original!==target)await copyFile(original,target);
    await sharp(bytes).resize(160,160,{fit:'cover'}).webp({quality:82}).toFile(path.join(imageDir,filename.replace('.webp','-list.webp')));artist.imageUrl=`/api/uploads/images/${filename}`;record.imageUrl=artist.imageUrl;versioned++;
   }else if(!artist.imageUrl){
    const name=artist.name.replace(/[&<>"']/g,'').slice(0,64);const initials=name.split(/\s+/).slice(0,2).map((word:string)=>word[0]).join('').toUpperCase();const palette=parseInt(createHash('sha256').update(artist.name).digest('hex').slice(0,4),16)%3;const colors=['#711d47','#403478','#24686c'];
    const svg=`<svg width="720" height="720" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="g"><stop stop-color="${colors[palette]}"/><stop offset="1" stop-color="#150b13"/></radialGradient></defs><rect width="720" height="720" fill="url(#g)"/><circle cx="570" cy="90" r="240" fill="none" stroke="#ffda00" stroke-opacity=".18" stroke-width="2"/><circle cx="570" cy="90" r="200" fill="none" stroke="#ffda00" stroke-opacity=".12" stroke-width="2"/><path d="M30 600 690 100M30 650 690 150" stroke="#ffda00" stroke-opacity=".1"/><text x="55" y="450" fill="#ffda00" font-family="Arial" font-style="italic" font-weight="900" font-size="230">${initials}</text><text x="60" y="550" fill="#fff7f2" font-family="Arial" font-weight="700" font-size="${name.length>28?23:34}">${name}</text><text x="60" y="655" fill="#cbbbc8" font-family="Arial" font-size="16" letter-spacing="4">ПОЖЕЛАНИЯ УЛЕТАЯ</text></svg>`;
    const bytes=await sharp(Buffer.from(svg)).webp({quality:90}).toBuffer();const hash=createHash('sha256').update(bytes).digest('hex').slice(0,8);const filename=`${artist.id}-wish-${hash}.webp`;await writeFile(path.join(imageDir,filename),bytes);await sharp(bytes).resize(160,160).webp({quality:85}).toFile(path.join(imageDir,filename.replace('.webp','-list.webp')));artist.imageUrl=`/api/uploads/images/${filename}`;graphics.push(artist.name);
   }
  }
  const definitions=(await readFile(path.join(root,'cms/data/wish-artist-aliases.txt'),'utf8')).split(/\r?\n/).filter(line=>line&&!line.startsWith('#')).map(line=>line.split('|'));
  const identity=new Map<string,any>();const names=new Map<string,Set<string>>();for(const artist of data.headliners){const parts=[artist.name,...artist.name.split(' / ')];parts.forEach(name=>{if(!identity.has(norm(name)))identity.set(norm(name),artist);});names.set(artist.id,new Set(parts));}
  for(const parts of definitions){const artist=parts.map(name=>identity.get(norm(name))).find(Boolean);if(!artist)continue;const set=names.get(artist.id)!;parts.forEach(name=>{set.add(name);if(!identity.has(norm(name)))identity.set(norm(name),artist);});}
  const [saved]=await db.execute<ResultSetHeader>('UPDATE app_content SET content=?,updated_at=NOW() WHERE id=1 AND SHA2(content,256)=?',[JSON.stringify(data),rows[0].revision]);if(saved.affectedRows!==1)throw Error('Catalog changed concurrently');
  for(const artist of unresolved)await db.execute('DELETE FROM artist_wish_mentions WHERE festival_year=2027 AND artist_id=?',[artist.id]);
  await writeFile(path.join(root,'cms/data/wish-artist-search-aliases.json'),JSON.stringify(Object.fromEntries([...names].map(([id,aliases])=>[id,[...aliases]])),null,2));
  await writeFile(path.join(root,'cms/data/wish-community-coverage.json'),JSON.stringify({vkPosts:report.vk.posts,vkComments:report.vk.comments,telegramComments:report.observedTextComments}));
  await writeFile(path.join(reportDir,'photo-sources.json'),JSON.stringify(photos,null,2));
  await writeFile(path.join(reportDir,'media-report.json'),JSON.stringify({versioned,originalPhotographsAndArtistArtwork:versioned,typographicCovers:graphics,unresolvedNames:unresolved.map((artist:any)=>artist.name),scope:'Local preview only. Typographic covers identify artists without inventing portraits. Content hashes prevent stale photos in browser caches.'},null,2));
  for(let attempt=0;attempt<10;attempt++){try{await writeFile(path.join(root,'public/api/data'),JSON.stringify(data));break;}catch(error){if(attempt===9)throw error;await new Promise(resolve=>setTimeout(resolve,200));}}
  console.log(JSON.stringify({artists:data.headliners.length,versioned,typographicCovers:graphics.length,unresolvedNames:unresolved.map((artist:any)=>artist.name)},null,2));
 }finally{await db.end();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
