import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(path.resolve('cms/package.json'));
const mysql=require('mysql2/promise');
const db=await mysql.createConnection({host:'127.0.0.1',port:3352,user:'root',database:'uletay_web_design'});
try{
 const [[row]]=await db.query('SELECT content FROM app_content WHERE id=1');
 const local=JSON.parse(row.content),baseline=JSON.parse(fs.readFileSync('artifacts/store-2026-11-21/production-catalog-before.json'));
 const known=new Map(baseline.headliners.map(artist=>[artist.id,artist]));
 const mediaDirectory=path.resolve('assets/community-20261121');fs.mkdirSync(mediaDirectory,{recursive:true});
 const missing=[];let copied=0,totalBytes=0;
 for(const artist of local.headliners){
  if(known.get(artist.id)?.imageUrl===artist.imageUrl)continue;
  const url=artist.imageUrl;if(!url?.startsWith('/api/uploads/images/'))continue;
  const filename=decodeURIComponent(url.slice('/api/uploads/images/'.length));
  if(path.basename(filename)!==filename)throw Error('Invalid media filename');
  for(const candidate of [filename,filename.replace(/\.webp$/,'-list.webp')]){
   const source=path.resolve('uploads/images',candidate);
   if(!fs.existsSync(source)){if(candidate===filename)missing.push(artist.id);continue;}
   fs.copyFileSync(source,path.join(mediaDirectory,candidate));copied++;totalBytes+=fs.statSync(source).size;
  }
  artist.imageUrl=`/api/fest-assets/community-20261121/${filename}`;
 }
 if(missing.length)throw Error('Missing full images for '+missing.length+' artists');
 const artists=local.headliners.filter(artist=>!known.has(artist.id));
 const updates=local.headliners.filter(artist=>known.has(artist.id)).map(artist=>({id:artist.id,before:{genres:known.get(artist.id).genres,imageUrl:known.get(artist.id).imageUrl},after:{genres:artist.genres,imageUrl:artist.imageUrl}}));
 fs.writeFileSync('cms/data/community-release-20261121.json',JSON.stringify({version:'community-20261121-v1',festivalYear:2027,artists,updates}));
 const [mentions]=await db.query('SELECT festival_year,artist_id,platform,author_hash,source_url,source_key,kind FROM artist_wish_mentions WHERE festival_year=2027 ORDER BY artist_id,platform,author_hash');
 fs.writeFileSync('cms/data/community-mentions-20261121.json',JSON.stringify(mentions));
 fs.writeFileSync('public/api/data',JSON.stringify(local));
 const report={newArtists:artists.length,reviewedExisting:updates.length,externalSupport:mentions.length,copiedImages:copied,mediaMiB:Math.round(totalBytes/1024/1024)};
 fs.writeFileSync('artifacts/store-2026-11-21/community-export-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await db.end();}
