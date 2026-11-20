/** One-time research file only: never writes the app catalog or touches Last.fm. */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const base=resolve('../artifacts/artist-redesign-2026-11-20');
type Evidence={name:string;url:string;provider:string;providerArtist?:string;genres?:string[];description?:string;error?:string};
async function main(){
 const p=await (await fetch('http://127.0.0.1:3000/api/data')).json();const data=p.data||p;
 const photos=JSON.parse(await readFile(resolve('../artifacts/artist-wishes-2026-11-20/photo-sources.json'),'utf8'));
 let results:Record<string,Evidence>={};try{results=JSON.parse(await readFile(resolve(base,'genre-source-evidence.json'),'utf8'));}catch{}
 const token=(await readFile(resolve('../tmp/vk-user-token.txt'),'utf8')).replace(/^\uFEFF/,'').trim();
 const vkArtists=data.headliners.filter((a:{id:string})=>/vk\.(com|ru)/.test(photos[a.id]?.source||'')&&!results[a.id]);
 for(let offset=0;offset<vkArtists.length;offset+=100){
  const batch=vkArtists.slice(offset,offset+100),ids=batch.map((a:{id:string})=>new URL(photos[a.id].source).pathname.slice(1).replace(/^(public|club)/,''));
  const r=await fetch('https://api.vk.com/method/groups.getById',{method:'POST',body:new URLSearchParams({access_token:token,v:'5.199',group_ids:ids.join(','),fields:'description,status,activity,site'}),signal:AbortSignal.timeout(25000)}).then(r=>r.json());
  if(r.error)console.log(`VK metadata error ${r.error.error_code}`);else{const groups=r.response.groups||r.response;for(let i=0;i<batch.length;i++){const g=groups.find((g:{id:number;screen_name:string})=>String(g.id)===ids[i]||g.screen_name===ids[i]);if(g)results[batch[i].id]={name:batch[i].name,url:photos[batch[i].id].source,provider:'vk',providerArtist:g.name,description:[g.description,g.status,g.activity].filter(Boolean).join('\n')};}}
 }
 const queue=data.headliners.filter((a:{id:string})=>!results[a.id]||results[a.id].provider==='unresolved'||results[a.id].error);let cursor=0,done=0;
 let nextRequest=Date.now();
 async function metadata(url:string):Promise<any>{
  for(let attempt=0;attempt<3;attempt++){
   const at=Math.max(Date.now(),nextRequest);nextRequest=at+190;
   await new Promise(r=>setTimeout(r,Math.max(0,at-Date.now())));
   const result=await fetch(url,{signal:AbortSignal.timeout(15000)}).then(r=>r.json());
   if(result.error?.message?.includes('Quota')){nextRequest=Date.now()+5500;continue;}
   return result;
  }throw Error('Deezer quota retries exhausted');
 }
 async function worker(){while(cursor<queue.length){const artist=queue[cursor++],source=photos[artist.id]?.source||'';try{
   let match=source.match(/deezer\.com\/(album|artist)\/(\d+)/), url='';
   const apple=source.match(/music\.apple\.com\/.*\/(\d+)(?:\?|$)/);
   if(apple){const payload=await metadata(`https://itunes.apple.com/lookup?id=${apple[1]}&entity=album`);const album=payload.results?.find((x:{collectionId:number})=>String(x.collectionId)===apple[1]);if(album?.primaryGenreName){results[artist.id]={name:artist.name,url:source,provider:'apple',providerArtist:album.artistName,genres:[album.primaryGenreName]};continue;}}
   if(!match){const search=await metadata(`https://api.deezer.com/search/artist?q=${encodeURIComponent(artist.name.split(' / ').pop())}&limit=5`);const norm=(s:string)=>s.toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');const found=search.data?.find((x:{name:string})=>[artist.name,...(artist.alternateNames||[]),...artist.name.split(' / ')].some(n=>norm(n)===norm(x.name)));if(found)match=['','artist',String(found.id)];}
   if(!match){results[artist.id]={name:artist.name,url:'',provider:'unresolved'};continue;}
   if(match[1]==='artist'){const albums=await metadata(`https://api.deezer.com/artist/${match[2]}/albums?limit=1`);if(!albums.data?.[0]?.id)throw Error('No album');url=`https://api.deezer.com/album/${albums.data[0].id}`;}else url=`https://api.deezer.com/album/${match[2]}`;
   const album=await metadata(url);
   results[artist.id]={name:artist.name,url:album.link||url,provider:'deezer',providerArtist:album.artist?.name,genres:album.genres?.data?.map((g:{name:string})=>g.name)||[],...(album.error?{error:album.error.message}:{})};
  }catch(error){results[artist.id]={name:artist.name,url:source,provider:'unresolved',error:String(error)};}finally{done++;if(done%40===0){await writeFile(resolve(base,'genre-source-evidence.json'),JSON.stringify(results,null,2));console.log(`Genre evidence ${done}/${queue.length}`);}}
 }}
 await Promise.all(Array.from({length:6},worker));await writeFile(resolve(base,'genre-source-evidence.json'),JSON.stringify(results,null,2));console.log(`Saved ${Object.keys(results).length} artist research entries; catalog unchanged.`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
