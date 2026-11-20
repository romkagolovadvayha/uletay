import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const base=resolve('../artifacts/artist-redesign-2026-11-20');
const key=(s:string)=>s.toLowerCase().replace(/ё/g,'е').replace(/[^\p{L}\p{N}]/gu,'');
async function main(){
 const rows=JSON.parse(await readFile(resolve(base,'editorial-genres-reviewed.json'),'utf8')).filter((a:{genres:string[]})=>!a.genres.length);
 const evidence=JSON.parse(await readFile(resolve(base,'genre-source-evidence.json'),'utf8'));
 const groups=JSON.parse(await readFile(resolve('../artifacts/artist-wishes-2026-11-20/vk-community-images.json'),'utf8'));
 const token=(await readFile(resolve('../tmp/vk-user-token.txt'),'utf8')).replace(/^\uFEFF/,'').trim();
 const matches=rows.flatMap((a:{id:string;name:string})=>groups.filter((g:{name:string;labels:string[]})=>[g.name,...g.labels].some(n=>key(n)===key(a.name))).map((g:{id:number})=>({artist:a,groupId:g.id})));
 if(matches.length){const result=await fetch('https://api.vk.com/method/groups.getById',{method:'POST',body:new URLSearchParams({access_token:token,v:'5.199',group_ids:matches.map((m:{groupId:number})=>m.groupId).join(','),fields:'description,status,activity'}),signal:AbortSignal.timeout(20000)}).then(r=>r.json());if(!result.error)for(const g of result.response.groups||result.response){const m=matches.find((m:{groupId:number})=>m.groupId===g.id);if(m)evidence[m.artist.id]={name:m.artist.name,provider:'vk',url:`https://vk.com/club${g.id}`,providerArtist:g.name,description:[g.description,g.status,g.activity].filter(Boolean).join('\n')};}}
 for(const a of rows){
  try{
   const result=await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(a.name)}&entity=album&limit=15&country=ru`,{signal:AbortSignal.timeout(20000)}).then(r=>r.json());
   const hit=result.results?.find((r:{artistName:string;primaryGenreName:string})=>key(r.artistName)===key(a.name)&&r.primaryGenreName);
   if(hit){evidence[a.id]={name:a.name,provider:'apple',providerArtist:hit.artistName,url:hit.collectionViewUrl,genres:[hit.primaryGenreName]};console.log(`${a.name}: ${hit.primaryGenreName}`);}
  }catch{console.log(`${a.name}: needs manual research`);}
  await writeFile(resolve(base,'genre-source-evidence.json'),JSON.stringify(evidence,null,2));
  await new Promise(r=>setTimeout(r,2700));
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
