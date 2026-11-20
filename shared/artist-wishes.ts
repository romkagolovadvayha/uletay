export type WishArtist = {
  id:string; name:string; imageUrl:string; confirmed:boolean; aliases?:string[];
  votes:number; communityRequests:number; support:number;
  vkSupport?:number; telegramSupport?:number; vkLikeSupport?:number;
};
export type WishFeed = {year:number;artists:WishArtist[];sources:{platform:'vk'|'telegram';url:string;mentions:number}[];updatedAt:string;coverage?:{vkPosts:number;vkComments:number;telegramComments:number}};
export type WishVoteResult = {artistId:string;voted:boolean;votes:number;communityRequests:number;support:number};
export type ArtistExpectationRating = {artistId:string;year:number;support:number;rank:number|null;totalArtists:number};
/** Competition rank keeps artists with equal support at the same place. */
export function getArtistExpectationRating(feed:WishFeed,artistId:string):ArtistExpectationRating|null {
  const artist=feed.artists.find(item=>item.id===artistId);if(!artist)return null;
  return {artistId,year:feed.year,support:artist.support,rank:artist.support>0?1+feed.artists.filter(item=>item.support>artist.support).length:null,totalArtists:feed.artists.length};
}
export function formatWishVoteCount(count:number):string {
  const value=Math.max(0,Math.trunc(count));
  const word=value%100>=11&&value%100<=14?'голосов':value%10===1?'голос':value%10>=2&&value%10<=4?'голоса':'голосов';
  return `${value.toLocaleString('ru')} ${word}`;
}
export function sortWishArtists(artists:WishArtist[]){return [...artists].sort((a,b)=>b.support-a.support||b.votes-a.votes||a.name.localeCompare(b.name,'ru')||a.id.localeCompare(b.id));}
export function readWishVoteInput(input:unknown):{artistId:string;voted:boolean;year?:number}{
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Неверный формат голоса');
  const value=input as Record<string,unknown>;
  if(typeof value.artistId!=='string'||!value.artistId||value.artistId.length>191||/[\u0000-\u001f\u007f]/.test(value.artistId)||typeof value.voted!=='boolean')throw Error('Выберите артиста и действие');
  if(value.year!==undefined&&(typeof value.year!=='number'||!Number.isInteger(value.year)||value.year<2000||value.year>2100))throw Error('Неверный год фестиваля');
  return {artistId:value.artistId,voted:value.voted,...(value.year!==undefined?{year:value.year as number}:{})};
}
export function normalizeWishArtistName(name:string){return name.normalize('NFKC').toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');}
/** Prefer the complete artist name over a shorter name nested inside it. */
export function findWishArtistIds(text:string,aliases:{id:string;keys:string[]}[]):Set<string>{
  const input=` ${normalizeWishArtistName(text)} `;const candidates:{id:string;start:number;end:number}[]=[];
  for(const {id,keys} of aliases)for(const key of keys){if(!key)continue;const needle=` ${key} `;let position=input.indexOf(needle);while(position>=0){candidates.push({id,start:position+1,end:position+1+key.length});position=input.indexOf(needle,position+1);}}
  candidates.sort((a,b)=>(b.end-b.start)-(a.end-a.start)||a.start-b.start||a.id.localeCompare(b.id));
  const accepted:typeof candidates=[];for(const match of candidates)if(!accepted.some(previous=>match.start<previous.end&&match.end>previous.start))accepted.push(match);
  return new Set(accepted.map(match=>match.id));
}
