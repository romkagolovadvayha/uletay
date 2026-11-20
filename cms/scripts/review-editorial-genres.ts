import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ARTIST_GENRE_OPTIONS, getRussianGenres, normalizeManualArtistGenres } from '../../shared/music-genres';
const folder=resolve('../artifacts/artist-redesign-2026-11-20');
const key=(name:string)=>name.toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const providerLabels:Record<string,string[]>={
 'Rap/Hip Hop':['Хип-хоп','Рэп'],'Hip-Hop/Rap':['Хип-хоп','Рэп'],'Indie Rock/Rock pop':['Инди-рок'],'Indie Pop/Folk':['Инди-фолк'],
 'International Pop':['Поп'],'Electro':['Электроника'],'R&B':['Ритм-н-блюз'],'Singer & Songwriter':['Авторская песня'],
 'Rock in Russian':['Русский рок'],'Rock & Roll/Rockabilly':['Рок-н-ролл'],'Chill Out/Trip-Hop/Lounge':['Трип-хоп'],'Pop/Rock':['Поп-рок'],'Klassiek':['Классическая музыка'],
};
const english=['rock','indie','pop punk','punk rock','folk rock','folk metal','alternative metal','gothic metal','hard rock','punk','ska','metal','folkcore','folk','indie rock','alternative rock','industrial','reggae','rap','hip hop','electronic'];
async function main(){
 const payload=await(await fetch('http://127.0.0.1:3000/api/data')).json(),data=payload.data||payload;
 const evidence=JSON.parse(await readFile(resolve(folder,'genre-source-evidence.json'),'utf8'));
 const overrides=new Map((await readFile(resolve('data/editorial-genres-20261120.tsv'),'utf8')).split(/\r?\n/).filter(Boolean).map(line=>{const [name,list]=line.split('|'),genres=list.split(';');if(normalizeManualArtistGenres(genres).length!==genres.length)throw Error(`Unknown genre: ${name} ${list}`);return [key(name),genres];}));
 const output=data.headliners.map((artist:{id:string;name:string;genres?:string[]})=>{
  const source=evidence[artist.id];let genres=overrides.get(key(artist.name)),method='editorial-review';
  if(!genres&&source?.provider==='vk'){
   const text=` ${key((source.description||'').replace(/https?:\/\/\S+/g,''))} `;
   genres=ARTIST_GENRE_OPTIONS.filter(g=>text.includes(` ${key(g)} `));
   for(const term of english)if(text.includes(` ${key(term)} `))genres.push(...getRussianGenres([{name:term}]));
   genres=[...new Set(genres)].sort((a,b)=>b.length-a.length).slice(0,3);method='official-community-description';
  }
  if(!genres?.length&&artist.genres?.length){genres=artist.genres.slice(0,3);method='existing-editorial-genres';}
  if(!genres?.length&&source?.genres?.length){genres=source.genres.flatMap((name:string)=>providerLabels[name]||getRussianGenres([{name}]));method='release-metadata';}
  return {id:artist.id,name:artist.name,genres:normalizeManualArtistGenres(genres).slice(0,3),method,source:source?.url||''};
 });
 await writeFile(resolve(folder,'editorial-genres-reviewed.json'),JSON.stringify(output,null,2));
 const missing=output.filter((a:{genres:string[]})=>!a.genres.length);console.log({artists:output.length,classified:output.length-missing.length,missing:missing.length});console.log(missing.map((a:{id:string;name:string})=>`${a.id} | ${a.name}`).join('\n'));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
