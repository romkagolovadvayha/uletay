import './load-env';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {sealData} from 'iron-session';
import mysql from 'mysql2/promise';
import type {ResultSetHeader} from 'mysql2';
import {readWishVoteInput,sortWishArtists,findWishArtistIds,type WishFeed} from '../../shared/artist-wishes';
async function main(){
 const origin=process.env.WISH_TEST_ORIGIN||'http://localhost:3000';
 if(process.env.DB_NAME!=='uletay_web_design'||process.env.DB_PORT!=='3352'||!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw Error('Wish tests require isolated local database');
 const db=await mysql.createConnection({host:'127.0.0.1',port:3352,user:'root',database:'uletay_web_design'});const users:number[]=[];const csrf=randomBytes(24).toString('base64url');
 async function user(){const [row]=await db.execute<ResultSetHeader>('INSERT INTO chat_users(vk_id,display_name) VALUES(?,?)',[`9${Date.now()}${users.length}`,'Проверка голосования']);users.push(row.insertId);return `uletay_visitor=${await sealData({userId:row.insertId,csrf},{password:process.env.SESSION_SECRET!,ttl:3600})}`;}
 async function request(path:string,init:RequestInit={},cookie?:string){return fetch(`${origin}/api${path}`,{...init,headers:{Accept:'application/json','Content-Type':'application/json',...(cookie?{Cookie:cookie,'X-Chat-CSRF':csrf}:{}),...init.headers}});}
 try{
  assert.throws(()=>readWishVoteInput({artistId:'x',voted:1}));assert.throws(()=>readWishVoteInput({artistId:'',voted:true}));
  const aliases=[{id:'tapok',keys:['тапок']},{id:'radio',keys:['радио тапок']},{id:'vadim',keys:['самойлов']},{id:'gleb',keys:['глеб самойлов']}];
  assert.deepEqual([...findWishArtistIds('Радио Тапок, Глеб Самойлов',aliases)].sort(),['gleb','radio']);
  assert.deepEqual([...findWishArtistIds('Самойлов и Тапок',aliases)].sort(),['tapok','vadim']);
  let response=await request('/wishes');assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');const feed:WishFeed=await response.json();assert.ok(feed.artists.length>200);assert.deepEqual(feed.artists,sortWishArtists(feed.artists));assert.ok(feed.artists.every(artist=>artist.support===artist.votes+artist.communityRequests));
  const artist=feed.artists.find(artist=>artist.communityRequests===0)!;const first=await user();const second=await user();
  assert.ok(feed.artists.every(row=>(row.vkSupport||0)+(row.telegramSupport||0)===row.communityRequests));
  assert.ok(feed.artists.every(row=>(row.vkLikeSupport||0)<=(row.vkSupport||0)));
  assert.equal(feed.artists.find(row=>row.id==='hl-stigmata')?.confirmed,true,'An imported request alias keeps the current lineup confirmation');
  const vote=(cookie:string|undefined,voted:boolean,artistId=artist.id)=>request('/wishes/vote',{method:'POST',body:JSON.stringify({artistId,voted})},cookie);
  assert.ok([401,403].includes((await vote(undefined,true)).status));assert.ok([401,403].includes((await request('/wishes/mine')).status));
  response=await request('/wishes/vote',{method:'POST',headers:{'X-Chat-CSRF':'wrong'},body:JSON.stringify({artistId:artist.id,voted:true})},first);assert.equal(response.status,403);
  assert.equal((await vote(first,true,'does-not-exist')).status,404);assert.equal((await request('/wishes/vote',{method:'POST',body:'{'},first)).status,400);
  response=await vote(first,true);assert.equal(response.status,200);assert.equal((await response.json()).votes,artist.votes+1);
  const retries=await Promise.all(Array.from({length:5},()=>vote(first,true)));assert.ok(retries.every(row=>row.status===200));
  response=await vote(second,true);assert.equal((await response.json()).votes,artist.votes+2);
  response=await request('/wishes/mine',{},first);assert.deepEqual((await response.json()).artistIds,[artist.id]);
  response=await vote(first,false);assert.equal((await response.json()).votes,artist.votes+1);
  response=await request('/wishes/mine',{},second);assert.deepEqual((await response.json()).artistIds,[artist.id]);
  response=await request('/chat/session',{},second);const session=await response.json();assert.ok(session.bearer);
  response=await request('/wishes/vote',{method:'POST',headers:{Authorization:`Bearer ${session.bearer}`},body:JSON.stringify({artistId:artist.id,voted:false})});assert.equal(response.status,200);assert.equal((await response.json()).votes,artist.votes);
  response=await request('/chat/auth/vk?returnTo=https://evil.example',{redirect:'manual'});assert.equal(new URL(response.headers.get('location')!).origin,'https://id.vk.ru');
  const state=randomBytes(24).toString('base64url');const pending=await sealData({oauth:{state,verifier:'test-verifier',expiresAt:Date.now()+60000,returnOrigin:'http://localhost:4174',redirectUri:'http://localhost:4174/api/chat/auth/vk/callback',returnPath:'/wishes'}},{password:process.env.SESSION_SECRET!,ttl:3600});
  response=await request(`/chat/auth/vk/callback?error=access_denied&state=${state}`,{redirect:'manual'},`uletay_visitor=${pending}`);assert.equal(response.headers.get('location'),'http://localhost:4174/wishes?auth=failed');
  const nextYear=feed.year+1;
  response=await request('/wishes/vote',{method:'POST',body:JSON.stringify({artistId:artist.id,voted:true,year:nextYear})},first);assert.equal(response.status,200);assert.equal((await response.json()).support,1);
  response=await request(`/wishes/mine?year=${nextYear}`,{},first);assert.deepEqual((await response.json()).artistIds,[artist.id]);
  response=await request('/wishes/mine',{},first);assert.deepEqual((await response.json()).artistIds,[]);
  response=await request(`/wishes/rating?artistId=${artist.id}&year=${nextYear}`);const ranking=await response.json();assert.equal(ranking.support,1);assert.equal(ranking.rank,1);assert.equal('score' in ranking,false);
  response=await request('/wishes/vote',{method:'POST',body:JSON.stringify({artistId:artist.id,voted:false,year:nextYear})},first);assert.equal(response.status,200);
  assert.equal((await request('/wishes/vote',{method:'POST',body:JSON.stringify({artistId:artist.id,voted:true,year:nextYear+1})},first)).status,400);
  assert.equal((await request('/wishes/mine?year=wrong',{},first)).status,400);
  console.log('Wish HTTP: counts/ranks, auth, CSRF, validation, idempotency, undo, private ballots, bearer and separate current/next-year artist votes OK');
 }finally{for(const id of users){await db.execute('DELETE FROM chat_sessions WHERE user_id=?',[id]);await db.execute('DELETE FROM chat_users WHERE id=?',[id]);}await db.end();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
