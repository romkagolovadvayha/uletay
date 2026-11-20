import type {AppData,Headliner} from '../src/types';
export type CommunityReleaseSeed={version:string;festivalYear:number;artists:Headliner[];updates:{id:string;before:{genres?:string[];imageUrl?:string};after:{genres?:string[];imageUrl?:string}}[]};
/** Merge the reviewed catalog without replacing festival settings or newer CMS edits. */
export function mergeCommunityRelease(current:AppData,seed:CommunityReleaseSeed):AppData{
  if(Number(current.festival.year)!==seed.festivalYear)return current;
  const updates=new Map(seed.updates.map(row=>[row.id,row]));
  const headliners=current.headliners.map(artist=>{
    const update=updates.get(artist.id);if(!update)return artist;const next={...artist};
    for(const key of ['genres','imageUrl'] as const){
      if(JSON.stringify(artist[key])!==JSON.stringify(update.before[key]))continue;
      if(key==='genres')next.genres=update.after.genres;
      else next.imageUrl=update.after.imageUrl;
    }
    return next;
  });
  const ids=new Set(headliners.map(artist=>artist.id));
  for(const artist of seed.artists)if(!ids.has(artist.id)){headliners.push(artist);ids.add(artist.id);}
  return {...current,headliners};
}
