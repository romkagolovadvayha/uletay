import type {RowDataPacket} from 'mysql2';
import {getPool} from './db';
import {getClientAppData} from './app-data';
import {ChatError,requireChatUser} from './chat';
import {consumeRateLimit,RateLimitError,requestSource} from './rate-limit';
import {readRequestJson,RequestJsonError} from './request-json';
import {jsonResponse} from './api-response';
import {readWishVoteInput,sortWishArtists,getArtistExpectationRating,type WishFeed,type WishVoteResult} from '../../../shared/artist-wishes';
import wishIdentities from '../../data/wish-artist-identities.json';
import wishSearchAliases from '../../data/wish-artist-search-aliases.json';
import coverage from '../../data/wish-community-coverage.json';
import {resolveArtistProfile} from '../../../shared/artist-identity';
const aliases:Record<string,string>=wishIdentities;
const searchAliases:Record<string,string[]>=wishSearchAliases;
const ballotId=(id:string)=>aliases[id]||id;

export class WishError extends Error{constructor(message:string,public status=400){super(message);}}
export function wishResponse(value:unknown,status=200){const response=jsonResponse(value,status);response.headers.set('Cache-Control','no-store');response.headers.set('Vary','Cookie, Authorization');return response;}
export function wishFailure(error:unknown){
  if(error instanceof RateLimitError){const response=wishResponse({error:error.message},429);response.headers.set('Retry-After',String(error.retryAfter));return response;}
  if(error instanceof WishError||error instanceof ChatError)return wishResponse({error:error.message},error.status);
  if(error instanceof RequestJsonError)return wishResponse({error:'Неверный формат или размер запроса'},error.status);
  console.error('[artist-wishes] Request failed:',error instanceof Error?error.name:'UnknownError');
  return wishResponse({error:'Голосование временно недоступно. Попробуйте ещё раз.'},503);
}
async function wishUser(request:Request){try{return await requireChatUser(request);}catch(error){if(error instanceof ChatError&&error.status===401)throw new WishError('Войдите через VK, чтобы голосовать',401);throw error;}}
function countRows(rows:RowDataPacket[]){return new Map(rows.map(row=>[String(row.artist_id),Number(row.total)]));}
export async function getArtistWishes(requestedYear?:number):Promise<WishFeed>{
  const data=await getClientAppData();const year=requestedYear??data.festival.year;const pool=getPool();
  if(!Number.isInteger(year)||year<data.festival.year||year>data.festival.year+1)throw new WishError('Выберите текущий или следующий фестиваль',400);
  const [[voteRows],[mentionRows],[sourceRows]]=await Promise.all([
    pool.execute<RowDataPacket[]>('SELECT artist_id,COUNT(*) AS total FROM artist_wish_votes WHERE festival_year=? GROUP BY artist_id',[year]),
    pool.execute<RowDataPacket[]>("SELECT artist_id,COUNT(*) AS total,SUM(platform='vk') AS vk_support,SUM(platform='telegram') AS telegram_support,SUM(platform='vk' AND kind='like') AS vk_like_support FROM artist_wish_mentions WHERE festival_year=? GROUP BY artist_id",[year]),
    pool.execute<RowDataPacket[]>('SELECT platform,source_url,COUNT(*) AS total FROM artist_wish_mentions WHERE festival_year=? GROUP BY platform,source_url ORDER BY total DESC LIMIT 100',[year]),
  ]);
  const votes=countRows(voteRows),mentions=countRows(mentionRows);
  const sourceDetails=new Map(mentionRows.map(row=>[String(row.artist_id),{vkSupport:Number(row.vk_support),telegramSupport:Number(row.telegram_support),vkLikeSupport:Number(row.vk_like_support)}]));
  return {year,coverage:year===data.festival.year?coverage:undefined,updatedAt:new Date().toISOString(),artists:sortWishArtists(data.headliners.filter(artist=>ballotId(artist.id)===artist.id).map(artist=>{const profile=resolveArtistProfile(data.headliners,artist.id)||artist;const count=votes.get(artist.id)||0,communityRequests=mentions.get(artist.id)||0;const imageUrl=profile.imageUrl?.replace(/(-wish(?:-[a-f0-9]{8})?)\.webp$/,'$1-list.webp')||'';return {id:artist.id,...(sourceDetails.get(artist.id)||{vkSupport:0,telegramSupport:0,vkLikeSupport:0}),name:profile.name,aliases:searchAliases[artist.id]||artist.alternateNames||[],imageUrl,confirmed:profile.years.includes(year),votes:count,communityRequests,support:count+communityRequests};})),sources:sourceRows.map(row=>({platform:row.platform,url:row.source_url,mentions:Number(row.total)}))};
}
export async function getArtistWishRating(artistId:string,year?:number){
  if(!artistId||artistId.length>191||/[\u0000-\u001f\u007f]/.test(artistId))throw new WishError('Выберите артиста',400);
  const rating=getArtistExpectationRating(await getArtistWishes(year),ballotId(artistId));
  if(!rating)throw new WishError('Артист не найден',404);
  return rating;
}
export async function getMyArtistWishes(request:Request){
  const user=await wishUser(request);const currentYear=(await getClientAppData()).festival.year;
  const rawYear=new URL(request.url).searchParams.get('year');const year=rawYear===null?currentYear:Number(rawYear);
  if((rawYear!==null&&!/^\d{4}$/.test(rawYear))||!Number.isInteger(year)||year<currentYear||year>currentYear+1)throw new WishError('Выберите текущий или следующий фестиваль',400);
  const [rows]=await getPool().execute<RowDataPacket[]>('SELECT artist_id FROM artist_wish_votes WHERE festival_year=? AND user_id=? ORDER BY artist_id',[year,user.id]);
  return {year,artistIds:rows.map(row=>String(row.artist_id))};
}
export async function saveArtistWishVote(request:Request):Promise<WishVoteResult>{
  const user=await wishUser(request);
  let input;try{input=readWishVoteInput(await readRequestJson(request,4096));}catch(error){if(error instanceof RequestJsonError)throw error;throw new WishError((error as Error).message);}
  input.artistId=ballotId(input.artistId);
  const data=await getClientAppData();if(!data.headliners.some(artist=>artist.id===input.artistId))throw new WishError('Артист не найден. Обновите список.',404);
  consumeRateLimit('artist-wish-vote',String(user.id),60,60000);consumeRateLimit('artist-wish-source',requestSource(request.headers),5000,60000);
  const year=input.year??data.festival.year;const pool=getPool();
  if(year<data.festival.year||year>data.festival.year+1)throw new WishError('Выберите текущий или следующий фестиваль',400);
  if(input.voted)await pool.execute('INSERT IGNORE INTO artist_wish_votes(festival_year,artist_id,user_id) VALUES(?,?,?)',[year,input.artistId,user.id]);
  else await pool.execute('DELETE FROM artist_wish_votes WHERE festival_year=? AND artist_id=? AND user_id=?',[year,input.artistId,user.id]);
  const [[rows],[mentions]]=await Promise.all([
    pool.execute<RowDataPacket[]>('SELECT COUNT(*) AS total FROM artist_wish_votes WHERE festival_year=? AND artist_id=?',[year,input.artistId]),
    pool.execute<RowDataPacket[]>('SELECT COUNT(*) AS total FROM artist_wish_mentions WHERE festival_year=? AND artist_id=?',[year,input.artistId]),
  ]);
  const votes=Number(rows[0].total),communityRequests=Number(mentions[0].total);
  return {artistId:input.artistId,voted:input.voted,votes,communityRequests,support:votes+communityRequests};
}
