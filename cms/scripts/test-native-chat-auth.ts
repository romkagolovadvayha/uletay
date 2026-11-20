import './load-env';
import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {sealData} from 'iron-session';
import mysql from 'mysql2/promise';
import type {RowDataPacket} from 'mysql2';
import {startNativeChatAuth} from '../src/lib/native-chat-auth';
import {getPool} from '../src/lib/db';
async function main(){
const origin=process.env.CHAT_TEST_ORIGIN||'http://localhost:3000';
if(process.env.DB_NAME!=='uletay_web_design'||process.env.DB_PORT!=='3352'||!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw Error('Only the isolated local QA database is allowed');
const db=await mysql.createPool({host:'127.0.0.1',port:3352,database:'uletay_web_design',user:'root'}),hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const identity={id:`98${Date.now()}`,name:'QA native VK identity'},states:string[]=[];
async function request(path:string,body?:unknown,bearer?:string){return fetch(`${origin}/api/chat${path}`,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(bearer?{Authorization:`Bearer ${bearer}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});}
try{
 const start=await request('/auth/native/start',{nativeSdk:true});
 let pending;
 if(process.env.VK_NATIVE_APP_READY==='0'){
  assert.equal(start.status,503,'An unconfigured Android client must show a clear unavailable state');
  process.env.VK_NATIVE_APP_READY='1';
  pending=await startNativeChatAuth(new Request(`${origin}/api/chat/auth/native/start`,{method:'POST'}),true);
 }else{assert.equal(start.status,200);pending=await start.json();}
 states.push(hash(pending.state));const url=new URL(pending.url);
 assert.equal(url.origin,'https://id.vk.ru');assert.equal(url.searchParams.get('scope'),'','Phone access is never requested');assert.equal(url.searchParams.get('code_challenge'),pending.codeChallenge);assert.equal(url.searchParams.get('redirect_uri'),`vk${pending.clientId}://vk.ru/blank.html`);assert.match(pending.state,/^[A-Za-z0-9_-]{43}$/);assert.match(pending.clientToken,/^[a-f0-9]{64}$/);
 const wrong=await request('/auth/native/exchange',{state:pending.state,clientToken:randomBytes(32).toString('hex'),code:'forged',deviceId:'forged'});assert.equal(wrong.status,401);
 const ticket=randomBytes(32).toString('hex');
 await db.execute('UPDATE chat_native_auth SET callback_used=TRUE,ticket_hash=?,identity_payload=?,expires_at=DATE_ADD(NOW(),INTERVAL 2 MINUTE) WHERE state_hash=?',[hash(ticket),await sealData(identity,{password:process.env.SESSION_SECRET||'dev-secret-change-me-min-32-chars-long!!',ttl:600}),hash(pending.state)]);
 assert.equal((await request('/auth/native/redeem',{ticket,clientToken:randomBytes(32).toString('hex')})).status,401,'A foreign app cannot intercept the result');
 const signedIn=await request('/auth/native/redeem',{ticket,clientToken:pending.clientToken});assert.equal(signedIn.status,200);const account=await signedIn.json();assert.equal(account.user.name,identity.name);assert.match(account.bearer,/^[a-f0-9]{64}$/);
 assert.equal((await request('/auth/native/redeem',{ticket,clientToken:pending.clientToken})).status,401,'The ticket is one-use');
 const refreshed=await request('/auth/native/session',undefined,account.bearer);assert.equal(refreshed.status,200);assert.equal((await refreshed.json()).user.id,account.user.id,'Native session restores without browser cookies');
 const [sessions]=await db.execute<RowDataPacket[]>('SELECT TIMESTAMPDIFF(HOUR,NOW(),expires_at) AS hours FROM chat_sessions WHERE token_hash=?',[hash(account.bearer)]);assert.ok(sessions[0].hours>=719,'Session survives a native cold start');
 console.log('Native VK auth: no phone scope, server PKCE, wrong client rejected, one-use result, bearer restore and expiry OK');
}finally{
 for(const state of states)await db.execute('DELETE FROM chat_native_auth WHERE state_hash=?',[state]);
 const [users]=await db.execute<RowDataPacket[]>('SELECT id FROM chat_users WHERE vk_id=?',[identity.id]);for(const user of users){await db.execute('DELETE FROM chat_sessions WHERE user_id=?',[user.id]);await db.execute('DELETE FROM chat_users WHERE id=?',[user.id]);}await db.end();await getPool().end();
}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
