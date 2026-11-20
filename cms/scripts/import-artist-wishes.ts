import './load-env';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import mysql from 'mysql2/promise';
import type {RowDataPacket,ResultSetHeader} from 'mysql2';
import sharp from 'sharp';
import {validateAppData} from '../../shared/app-data-validation';
import {normalizeWishArtistName as norm,findWishArtistIds} from '../../shared/artist-wishes';

const reportDir=path.resolve(__dirname,'../../artifacts/artist-wishes-2026-11-20');
const sourcePath=path.join(reportDir,'telegram-comments-observed.json');
const aliasesPath=path.resolve(__dirname,'../data/wish-artist-aliases.txt');
const identitiesPath=path.resolve(__dirname,'../data/wish-artist-identities.json');
const photoCachePath=path.join(reportDir,'photo-sources.json');
type Artist={id:string;name:string;description:string;years:number[];imageTint:string;imageUrl?:string;alternateNames?:string[]};
type Comment={id:string;text:string;authorHash:string;timestamp:string};
type Photo={imageUrl:string;source:string;artistName:string;title?:string;original:string};
// Conversation about a band is not automatically a request to invite that band.
const excluded=new Set([9,14,44,50,54,57,60,71,78,86,92,96,101,103,104,106,108,109,113,115,116,117,119,120,122,124,126,129,130,131,133,136,140,141,145,149,150,154,155,158,160,161,163,164,165,166,167,168,169,170,174,181,182,184,186,189,218,219,220,222,223,224,225,228,236,237,238,241,242,243,246,251,266,270,283,287,297,298,299,300,302,308,309,316,318,354,361,362,363,365,386,388,389,390,393,394,397,406,408,418,425,433,440,448,451,453,462,485,487,513,515,516,517,524,525,529,542,551,564,567,568,573,578,580,583,593,605,617,620,621,622,623,625,626,627,628,629,630,636,641,642,643,645,646,648,650,651,652,653,654,655,656,657,658,659,661,674,678,683,687,690,695,697,704,705,735,736,737,738,739,748,756,757,759,763,764,773]);
async function json(url:string){const response=await fetch(url,{signal:AbortSignal.timeout(18000)});if(!response.ok)throw Error(`Photo catalog HTTP ${response.status}`);return response.json();}
const photoBytes=new Map<string,Buffer>();
async function usableImage(url:string){
  try{if(photoBytes.has(url))return true;const r=await fetch(url,{signal:AbortSignal.timeout(18000)});if(!r.ok)return false;const bytes=Buffer.from(await r.arrayBuffer());if(bytes.length>12*1024*1024)return false;const meta=await sharp(bytes).metadata();if(Math.min(meta.width||0,meta.height||0)<180)return false;const stats=await sharp(bytes).resize(96,96).stats();if(stats.entropy<1.1&&stats.channels.every(channel=>channel.mean>200&&channel.stdev<18))return false;photoBytes.set(url,bytes);return true;}catch{return false;}
}
const compact=(value:string)=>norm(value).replace(/ /g,'');
async function findPhoto(names:string[],russian:boolean):Promise<Omit<Photo,'imageUrl'>|null>{
  const valid=new Set(names.map(compact));
  for(const query of [...new Set(names)].slice(0,4)){
    try{
      const result=await json(`https://api.deezer.com/search/artist?q=${encodeURIComponent(query)}`);
      const exact=(result.data||[]).filter((row:any)=>valid.has(compact(row.name)));
      const matches=exact.filter((row:any)=>/\/artist\/[a-f0-9]{32}\//.test(row.picture_xl||''));
      if(matches.length){
        for(const row of matches)if(matches.length>1&&russian){const top=await json(`https://api.deezer.com/artist/${row.id}/top?limit=5`);row.ruScore=(top.data||[]).filter((track:any)=>/[а-яё]/i.test(track.title)).length;}
        matches.sort((a:any,b:any)=>(b.ruScore||0)-(a.ruScore||0)||(b.nb_fan||0)-(a.nb_fan||0));
        for(const row of matches)if(await usableImage(row.picture_xl))return {source:row.link,artistName:row.name,original:row.picture_xl};
      }
      for(const row of exact){const albums=await json(`https://api.deezer.com/artist/${row.id}/albums?limit=5`);for(const album of albums.data||[])if(/\/cover\/[a-f0-9]{32}\//.test(album.cover_xl||'')&&await usableImage(album.cover_xl))return {source:album.link,artistName:row.name,title:album.title,original:album.cover_xl};}
    }catch{/* Try the next known spelling, never a different artist. */}
  }
  for(const query of [...new Set(names)].slice(0,3)){
    try{const result=await json(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&limit=20&country=US`);const row=(result.results||[]).find((item:any)=>valid.has(compact(item.artistName))&&item.artworkUrl100);if(row)return {source:row.collectionViewUrl,artistName:row.artistName,title:row.collectionName,original:row.artworkUrl100.replace('100x100bb','600x600bb')};}catch{}
  }
  return null;
}
async function main(){
  // Intentionally fixed: this importer cannot modify production.
  const db=await mysql.createConnection({host:'127.0.0.1',port:3352,user:'root',database:'uletay_web_design',charset:'utf8mb4'});
  try{
    const [rows]=await db.query<RowDataPacket[]>('SELECT content,SHA2(content,256) AS revision FROM app_content WHERE id=1');const data=JSON.parse(rows[0].content);const before=structuredClone(data);
    await mkdir(reportDir,{recursive:true});try{await stat(path.join(reportDir,'catalog-before-wishes.json'));}catch{await writeFile(path.join(reportDir,'catalog-before-wishes.json'),JSON.stringify(before,null,2));}
    const previousImport=await readFile(path.join(reportDir,'import-report.json'),'utf8').then(JSON.parse).catch(()=>null);
    if(previousImport){const importedIds=new Set(previousImport.added.map((artist:Artist)=>artist.id));const [ballots]=await db.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM artist_wish_votes');if(Number(ballots[0].total)!==0)throw Error('Review existing ballots before rebuilding source identities');data.headliners=data.headliners.filter((artist:Artist)=>!importedIds.has(artist.id));}
    const observed=JSON.parse(await readFile(sourcePath,'utf8'));const comments:Comment[]=observed.comments;
    const definitions=(await readFile(aliasesPath,'utf8')).split(/\r?\n/).filter(line=>line.trim()&&!line.startsWith('#')).map(line=>line.split('|').map(part=>part.trim()));
    const artists:Artist[]=data.headliners;const identity=new Map<string,Artist>();const byId=new Map<string,string>();const namesById=new Map<string,Set<string>>();
    function register(artist:Artist,names:string[]){for(const name of names){if(!name)continue;const key=norm(name);if(!identity.has(key))identity.set(key,artist);}const namesSet=namesById.get(artist.id)||new Set<string>();names.forEach(name=>namesSet.add(name));namesById.set(artist.id,namesSet);byId.set(artist.id,artist.id);}
    for(const artist of artists){const names=[artist.name,...artist.name.split(' / ')];const previous=names.map(name=>identity.get(norm(name))).find(Boolean);if(previous){byId.set(artist.id,previous.id);register(previous,names);}else register(artist,names);}
    const newArtists:Artist[]=[];
    for(const names of definitions){let artist=names.map(name=>identity.get(norm(name))).find(Boolean);if(!artist){const id='wish-'+createHash('sha256').update(norm(names[0])).digest('hex').slice(0,16);artist={id,name:names[0],description:'Артист из пожеланий сообщества. Участие в фестивале не подтверждено.',years:[],imageTint:'#3A141F',alternateNames:names.slice(1)};newArtists.push(artist);register(artist,names);}else register(artist,names);}
    // Some catalog spellings are stored as separate historical records. Share one ballot identity.
    for(const artist of artists){const matched=[artist.name,...artist.name.split(' / ')].map(name=>identity.get(norm(name))).find(Boolean);if(matched)byId.set(artist.id,matched.id);}
    const mentions:{artistId:string;authorHash:string;sourceKey:string;platform:'telegram'|'vk';sourceUrl:string}[]=[];const matchedIds=new Set<string>();const unmatched:{index:number;text:string}[]=[];
    const matchers=[...namesById].map(([id,names])=>({id,keys:[...names].map(norm).filter(Boolean)}));
    for(let index=0;index<comments.length;index++){
      if(excluded.has(index))continue;const comment=comments[index];const hits=findWishArtistIds(comment.text,matchers);
      if(index===244)hits.add(identity.get(norm('Пушной'))!.id);
      if(index===234)hits.add(identity.get(norm('Алиса'))!.id);
      if(index===252)hits.add(identity.get(norm('25/17'))!.id);
      if(index===506)hits.add(identity.get(norm('5 DIEZ'))!.id);
      if(index===474)hits.add(identity.get(norm('Сова'))!.id);
      if(index===758)hits.add(identity.get(norm('Технология'))!.id);
      if(!hits.size)unmatched.push({index,text:comment.text});
      for(const artistId of hits){matchedIds.add(artistId);mentions.push({artistId,authorHash:comment.authorHash,sourceKey:comment.id,platform:'telegram',sourceUrl:observed.source});}
    }
    const vk=JSON.parse(await readFile(path.join(reportDir,'vk-comments-observed.json'),'utf8'));const vkAccepted:{id:string;postId:number;text:string;artists:string[]}[]=[];
    const negative=/не\s+(?:нуж(?:ен|на|ны)|надо|хоч(?:у|ем|ется)|зовите)|иноагент|не\s+выступа(?:ет|ют)|нет такой группы|почему.{0,20}удаля|не\s+могут\s+позвать|концертн.{0,20}деятельност.{0,20}нет/iu;
    const positive=/хоч|хотим|хотел|жд[еёу]|позов|приглас|верните|поддерж|плюс|да{2,}|очень\s+надо|было\s+бы/iu;
    for(const comment of vk.comments){
      if(comment.community)continue;const text=comment.text.replace(/\[id\d+\|[^\]]+\],?\s*/g,'').replace(/\[club\d+\|([^\]]+)\]/g,'$1').trim();
      if(negative.test(text)&&!positive.test(text))continue;
      const survey=comment.postId===543743;
      if(!survey&&!/(?:позов|приглас|верните|привез|жду.{0,30}анонс|на\s+(?:следующ.{0,8}\s+)?улет|на\s+фест|хочу\s+(?:снова\s+)?(?:увидеть|услышать)|хотел.{0,20}(?:увидеть|услышать))/iu.test(text))continue;
      if(survey&&comment.parentId&&!positive.test(text)&&text.length>75)continue;
      const hits=findWishArtistIds(text,matchers);
      if(/самойловых\s+(?:обоих|двух)|двух\s+братьев\s+самойловых/iu.test(text)){hits.add(identity.get(norm('Вадим Самойлов'))!.id);hits.add(identity.get(norm('Глеб Самойлов'))!.id);}
      if(text.includes('#####'))hits.add(identity.get(norm('5 DIEZ'))!.id);
      if(!hits.size)continue;vkAccepted.push({id:comment.id,postId:comment.postId,text,artists:[...hits].map(id=>[...identity.values()].find(artist=>artist.id===id)?.name||id)});
      for(const artistId of hits){matchedIds.add(artistId);mentions.push({artistId,authorHash:comment.authorHash,sourceKey:comment.id,platform:'vk',sourceUrl:comment.source});}
    }
    await writeFile(path.join(reportDir,'vk-classified-wishes.json'),JSON.stringify(vkAccepted,null,2));
    const added=newArtists.filter(artist=>matchedIds.has(artist.id));artists.push(...added);
    const photos:Record<string,Photo>=await readFile(photoCachePath,'utf8').then(JSON.parse).catch(()=>({}));
    const vkGroups=JSON.parse(await readFile(path.join(reportDir,'vk-community-images.json'),'utf8'));const communityPhotos=new Map<string,Omit<Photo,'imageUrl'>>();
    for(const group of vkGroups){for(const label of [group.name,...group.labels].flatMap((name:string)=>[name,...name.split('|')])){const name=norm(label).replace(/^группа\s+/,'');const artist=identity.get(name);if(!artist||!group.image)continue;const url=new URL(group.image);if(url.searchParams.get('as')?.split(',').includes('720x720'))url.searchParams.set('cs','720x720');communityPhotos.set(artist.id,{source:`https://vk.com/public${group.id}`,artistName:group.name,original:url.href});}}
    const photoQueue=artists.filter(artist=>matchedIds.has(artist.id)&&!artist.imageUrl?.includes('/official-'));const failures:string[]=[];let processed=0;
    await mkdir(path.resolve(__dirname,'../../uploads/images'),{recursive:true});
    async function photoWorker(){while(photoQueue.length){const artist=photoQueue.shift()!;try{const cached=photos[artist.id];const community=communityPhotos.get(artist.id);if(cached&&(!community||cached.source===community.source)){artist.imageUrl=cached.imageUrl;continue;}const names=[artist.name,...(namesById.get(artist.id)||[])];if(artist.name==='Б.А.У.')names.unshift('Бездна Анального Угнетения');const found=community&&await usableImage(community.original)?community:await findPhoto(names,/[а-яё]/i.test(artist.name)||!['Rammstein','Limp Bizkit','AC/DC','Depeche Mode','Metallica','Thirty Seconds to Mars','HIM','Rage','Nightwish','Pantera','Evanescence','Queen','Marilyn Manson','U.D.O.','Twisted Sister','Black Veil Brides','Ghost','Dethklok','Witchz','Guns N’ Roses','The Beatles','The Rolling Stones','Linkin Park','ZZ Top','Angine de Poitrine','The Offspring','Brazzaville','Cyaxares','Chthonic','Iron Maiden','Nirvana','Royal Blood'].includes(artist.name));if(!found){failures.push(artist.name);continue;}
      if(!await usableImage(found.original))throw Error('Image not suitable');const bytes=photoBytes.get(found.original)!;photoBytes.delete(found.original);const filename=`${artist.id}-wish.webp`;await sharp(bytes).rotate().resize({width:1000,height:1000,fit:'inside',withoutEnlargement:true}).webp({quality:86}).toFile(path.resolve(__dirname,'../../uploads/images',filename));await sharp(bytes).rotate().resize(160,160,{fit:'cover'}).webp({quality:82}).toFile(path.resolve(__dirname,'../../uploads/images',filename.replace('.webp','-list.webp')));artist.imageUrl=`/api/uploads/images/${filename}`;photos[artist.id]={...found,imageUrl:artist.imageUrl};
    }catch{failures.push(artist.name);}finally{processed++;if(processed%10===0){await writeFile(photoCachePath,JSON.stringify(photos,null,2));console.log(JSON.stringify({photosProcessed:processed,found:Object.keys(photos).length,failed:failures.length}));}}}}
    await Promise.all(Array.from({length:4},photoWorker));await writeFile(photoCachePath,JSON.stringify(photos,null,2));
    if(!validateAppData(data))throw Error('Imported catalog failed validation');
    await db.beginTransaction();
    try{const [saved]=await db.execute<ResultSetHeader>('UPDATE app_content SET content=?,updated_at=NOW() WHERE id=1 AND SHA2(content,256)=?',[JSON.stringify(data),rows[0].revision]);if(saved.affectedRows!==1)throw Error('Catalog changed concurrently');await db.execute('DELETE FROM artist_wish_mentions WHERE festival_year=? AND platform=? AND source_url=?',[data.festival.year,'telegram',observed.source]);for(const post of vk.posts)await db.execute('DELETE FROM artist_wish_mentions WHERE festival_year=? AND platform=? AND source_url=?',[data.festival.year,'vk',post.source]);for(const mention of mentions)await db.execute('INSERT IGNORE INTO artist_wish_mentions(festival_year,artist_id,platform,author_hash,source_url,source_key) VALUES(?,?,?,?,?,?)',[data.festival.year,mention.artistId,mention.platform,mention.authorHash,mention.sourceUrl,mention.sourceKey]);await db.commit();}catch(error){await db.rollback();throw error;}
    await writeFile(identitiesPath,JSON.stringify(Object.fromEntries([...byId].filter(([alias,id])=>alias!==id)),null,2));
    await writeFile(path.resolve(__dirname,'../data/wish-artist-search-aliases.json'),JSON.stringify(Object.fromEntries([...namesById].map(([id,names])=>[id,[...names]])),null,2));
    await writeFile(path.join(reportDir,'import-report.json'),JSON.stringify({source:observed.source,expectedComments:observed.expectedCommentCount,observedTextComments:comments.length,vk:{posts:vk.posts.length,comments:vk.comments.length,classifiedRequests:vkAccepted.length},scope:'Public Telegram wish thread and public VK comments on 69 festival posts from the 2027 cycle since 2026-07-12. No private chats or profiles imported.',counting:'Author requests are deduplicated per artist and platform. VK comment likers are imported by import-vk-wish-likes.ts. App ballots are stored separately; the interface shows a combined total.',added:added.map(artist=>({id:artist.id,name:artist.name,imageUrl:artist.imageUrl||null})),requestedArtists:matchedIds.size,mentions:mentions.length,unmatched,missingPhotos:failures,updatedAt:new Date().toISOString()},null,2));
    for(let attempt=0;attempt<10;attempt++){try{await writeFile(path.resolve(__dirname,'../../public/api/data'),JSON.stringify(data));break;}catch(error){if(attempt===9)throw error;await new Promise(resolve=>setTimeout(resolve,200));}}
    console.log(JSON.stringify({added:added.length,requestedArtists:matchedIds.size,mentions:mentions.length,unmatched,missingPhotos:failures},null,2));
  }finally{await db.end();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
