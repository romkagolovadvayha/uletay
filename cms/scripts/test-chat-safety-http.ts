import './load-env';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {sealData} from 'iron-session';
import mysql from 'mysql2/promise';
import type {ResultSetHeader,RowDataPacket} from 'mysql2';
import {readBlockedUsers,visibleChatMessages} from '../../shared/chat-safety';
async function main(){
  assert.equal(process.env.DB_NAME,'uletay_web_design');assert.equal(process.env.DB_PORT,'3352');
  const origin='http://localhost:3000',db=await mysql.createConnection({host:'127.0.0.1',port:3352,user:'root',database:'uletay_web_design'});
  const marker=`9${Date.now()}`,users:number[]=[],messages:number[]=[];
  try{
    assert.deepEqual(readBlockedUsers('[1,1,-1,"2",3]'),[1,3]);assert.deepEqual(readBlockedUsers('bad'),[]);
    const rows=[{userId:1,reply:null},{userId:2,reply:{userId:1}},{userId:3,reply:null}];
    assert.deepEqual(visibleChatMessages(rows,[1]),[{userId:2,reply:null},{userId:3,reply:null}]);
    for(let index=0;index<2;index++){const [r]=await db.execute<ResultSetHeader>('INSERT INTO chat_users(vk_id,display_name) VALUES(?,?)',[marker+index,'QA deletion '+index]);users.push(r.insertId);}
    for(let index=0;index<2;index++){const [r]=await db.execute<ResultSetHeader>('INSERT INTO chat_messages(user_id,body,request_id,reply_to) VALUES(?,?,?,?)',[users[index],'QA deletion body',randomBytes(16).toString('hex'),index?messages[0]:null]);messages.push(r.insertId);}
    const csrf=randomBytes(24).toString('hex'),session=await sealData({userId:users[0],csrf},{password:process.env.SESSION_SECRET||'dev-secret-change-me-min-32-chars-long!!',ttl:600});
    const headers={Cookie:`uletay_visitor=${session}`,'X-Chat-CSRF':csrf};
    await db.execute('INSERT INTO artist_wish_votes(festival_year,artist_id,user_id) VALUES(2027,?,?)',['qa-deletion',users[0]]);
    assert.equal((await fetch(`${origin}/api/chat/account`,{method:'DELETE'})).status,403);
    const page=await fetch(`${origin}/api/chat/account`,{headers});assert.equal(page.status,200);assert.match(await page.text(),/Удаление аккаунта Улетай/);
    const deleted=await fetch(`${origin}/api/chat/account`,{method:'DELETE',headers});assert.equal(deleted.status,200);
    const [profile]=await db.query<RowDataPacket[]>('SELECT id FROM chat_users WHERE id=?',[users[0]]);assert.equal(profile.length,0,'Original identity is deleted, not disabled');
    const [votes]=await db.query<RowDataPacket[]>('SELECT user_id FROM artist_wish_votes WHERE user_id=?',[users[0]]);assert.equal(votes.length,0);
    const [remaining]=await db.query<RowDataPacket[]>('SELECT body,user_id,deleted_at FROM chat_messages WHERE id=?',[messages[0]]);assert.equal(remaining[0].body,'');assert.notEqual(remaining[0].user_id,users[0]);assert.ok(remaining[0].deleted_at);
    const polling=await fetch(`${origin}/api/chat/messages?after=${messages[0]}`);const result=await polling.json();assert.ok(result.removed.includes(messages[0]));
    console.log('Chat safety: block removes author and quoted content; account deletion removes identity/votes, erases messages and notifies polling clients.');
  }finally{
    for(const id of messages)await db.execute('UPDATE chat_messages SET reply_to=NULL WHERE reply_to=?',[id]);
    for(const id of messages)await db.execute('DELETE FROM chat_messages WHERE id=?',[id]);
    for(const id of users){await db.execute('DELETE FROM artist_wish_votes WHERE user_id=?',[id]);await db.execute('DELETE FROM chat_users WHERE id=?',[id]);}
    await db.end();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
