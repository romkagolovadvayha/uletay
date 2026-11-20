import './load-env';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { sealData } from 'iron-session';
import mysql from 'mysql2/promise';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { normalizeChatText } from '../src/lib/chat-input';

async function main(){
const origin=process.env.CHAT_TEST_ORIGIN||'http://localhost:3000';
const dbName=process.env.DB_NAME;
if(dbName!=='uletay_web_design'||!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw Error('Chat tests require the isolated local uletay_web_design database');
const pool=await mysql.createPool({host:'127.0.0.1',port:Number(process.env.DB_PORT||3352),database:dbName,user:'root'});
const testMarker=`qa-${Date.now()}`;const users:number[]=[];
const csrf=randomBytes(24).toString('base64url');
const eventAbort=new AbortController();let eventReader:ReadableStreamDefaultReader<Uint8Array>|undefined;
async function user(name:string){const vkId=`9${Date.now()}${users.length}`;const [row]=await pool.execute<ResultSetHeader>('INSERT INTO chat_users (vk_id,display_name) VALUES (?,?)',[vkId,name]);users.push(row.insertId);const sealed=await sealData({userId:row.insertId,csrf},{password:process.env.SESSION_SECRET||'dev-secret-change-me-min-32-chars-long!!',ttl:30*24*60*60});return {id:row.insertId,cookie:`uletay_visitor=${sealed}`};}
async function request(path:string,init:RequestInit={},cookie?:string){return fetch(`${origin}/api/chat${path}`,{...init,headers:{Accept:'application/json','Content-Type':'application/json',...(cookie?{Cookie:cookie,'X-Chat-CSRF':csrf}:{}),...init.headers}});}
async function post(text:string,cookie:string,replyTo?:number,requestId=randomBytes(16).toString('hex')){const response=await request('/messages',{method:'POST',body:JSON.stringify({text,replyTo,requestId})},cookie);return {response,data:await response.json(),requestId};}
try{
  assert.equal(normalizeChatText('  привет\r\nмир\u0000  '),'привет\nмир');assert.throws(()=>normalizeChatText(' '));assert.throws(()=>normalizeChatText('я'.repeat(2001)));
  const first=await user(testMarker+' Первый');const second=await user(testMarker+' Второй');
  const events=await request('/events',{signal:eventAbort.signal});assert.equal(events.status,200);assert.ok(events.headers.get('content-type')?.startsWith('text/event-stream'));eventReader=events.body!.getReader();await eventReader.read();
  let response=await request('/session');assert.equal(response.status,200);assert.equal((await response.json()).user,null);
  response=await request('/session',{},first.cookie);assert.equal(response.status,200);const session=await response.json();assert.equal(session.user.id,first.id);assert.ok(session.bearer);
  response=await request('/messages',{method:'POST',body:JSON.stringify({text:'spoofed',userId:first.id,requestId:randomBytes(16).toString('hex')})});assert.ok([401,403].includes(response.status),'Anonymous users cannot spoof a sender');
  response=await request('/messages',{method:'POST',headers:{'X-Chat-CSRF':'bad'},body:JSON.stringify({text:'csrf',requestId:randomBytes(16).toString('hex')})},first.cookie);assert.equal(response.status,403);
  const original=await post(`${testMarker} <script>alert('text only')</script>`,first.cookie);assert.equal(original.response.status,201);assert.equal(original.data.message.userId,first.id);
  const eventDeadline=setTimeout(()=>eventAbort.abort(),5000);
  let eventText='';try{while(!eventText.includes(original.data.message.text)){const part=await eventReader.read();if(part.done)break;eventText+=new TextDecoder().decode(part.value);}}finally{clearTimeout(eventDeadline);}
  assert.ok(eventText.includes('event: chat'),'New messages arrive over the event stream');assert.ok(eventText.includes(testMarker));
  const repeated=await post(original.data.message.text,first.cookie,undefined,original.requestId);assert.equal(repeated.response.status,201);assert.equal(repeated.data.message.id,original.data.message.id,'Retry must not duplicate a message');
  const reply=await post(testMarker+' Ответ',second.cookie,original.data.message.id);assert.equal(reply.response.status,201);assert.equal(reply.data.message.reply.id,original.data.message.id);
  response=await request(`/messages?after=${original.data.message.id}`);let page=await response.json();assert.ok(page.messages.some((row:{id:number})=>row.id===reply.data.message.id));
  response=await request(`/messages?before=${reply.data.message.id}`);page=await response.json();assert.ok(page.messages.some((row:{id:number})=>row.id===original.data.message.id));
  assert.equal((await post('',first.cookie)).response.status,400);assert.equal((await post('x'.repeat(2001),first.cookie)).response.status,400);assert.equal((await post('invalid reply',first.cookie,2147483647)).response.status,409);
  response=await request('/messages/'+original.data.message.id,{method:'DELETE'},second.cookie);assert.equal(response.status,404,'Other visitors cannot delete this message');
  response=await request('/report',{method:'POST',body:JSON.stringify({messageId:original.data.message.id})},second.cookie);assert.equal(response.status,200);
  response=await request('/messages/'+original.data.message.id,{method:'DELETE'},first.cookie);assert.equal(response.status,200);
  response=await request('/messages?after='+original.data.message.id);page=await response.json();assert.ok(page.removed.includes(original.data.message.id),'Deletion propagates to polling clients');
  const bearerMessage=await request('/messages',{method:'POST',headers:{Authorization:`Bearer ${session.bearer}`},body:JSON.stringify({text:testMarker+' bearer',requestId:randomBytes(16).toString('hex')})});assert.equal(bearerMessage.status,201,'Gateway bearer session can send without cookies');
  response=await request('/session',{method:'DELETE'},first.cookie);assert.equal(response.status,200);
  response=await request('/messages',{method:'POST',headers:{Authorization:`Bearer ${session.bearer}`},body:JSON.stringify({text:'expired',requestId:randomBytes(16).toString('hex')})});assert.equal(response.status,401,'Logout revokes gateway sessions');
  response=await request('/auth/vk', {redirect:'manual'});assert.equal(response.status,307);const auth=new URL(response.headers.get('location')!);assert.equal(auth.origin,'https://id.vk.ru');assert.equal(auth.searchParams.get('code_challenge_method'),'s256');assert.equal(auth.searchParams.get('redirect_uri'),'http://localhost:4174/api/chat/auth/vk/callback');
  response=await request('/auth/vk/callback?code=fake&device_id=fake&state=forged',{redirect:'manual'});assert.equal(response.status,307);assert.ok(response.headers.get('location')?.endsWith('/chat?auth=failed'));
  const [rows]=await pool.execute<RowDataPacket[]>('SELECT COUNT(*) AS count FROM chat_messages WHERE user_id=? AND request_id=?',[first.id,original.requestId]);assert.equal(Number(rows[0].count),1);
  console.log('Chat HTTP: persistence, identity separation, CSRF, replies, cursors, idempotency, deletion, reports, bearer logout and forged OAuth state OK');
}finally{
  eventAbort.abort();await eventReader?.cancel().catch(()=>{});
  if(users.length){const ids=users.map(()=>'?').join(',');await pool.execute(`DELETE FROM chat_reports WHERE user_id IN (${ids})`,users);await pool.execute(`UPDATE chat_messages SET reply_to=NULL WHERE user_id IN (${ids})`,users);await pool.execute(`DELETE FROM chat_messages WHERE user_id IN (${ids})`,users);await pool.execute(`DELETE FROM chat_sessions WHERE user_id IN (${ids})`,users);await pool.execute(`DELETE FROM chat_users WHERE id IN (${ids})`,users);}
  await pool.end();
}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
