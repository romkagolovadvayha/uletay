import {randomBytes} from 'node:crypto';
import type {RowDataPacket,ResultSetHeader} from 'mysql2';
import {getPool} from './db';
import {ChatError,currentChatUser,getChatSession,issueChatBearer} from './chat';
import {consumeRateLimit,requestSource} from './rate-limit';
import {appleConfiguration,appleHash,appleSecretMatches,encryptAppleRefreshToken,exchangeAppleCode,verifyAppleIdentityToken,verifyAppleNotification,revokeAppleGrant} from './apple-auth';

const opaqueToken=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
async function createAppleSession(userId:number){
  const session=await getChatSession();session.userId=userId;session.csrf=randomBytes(24).toString('base64url');delete session.oauth;await session.save();
  const user=await currentChatUser();if(!user)throw new ChatError('Вход не завершён',401);
  return {user,csrf:session.csrf,bearer:await issueChatBearer(userId,720),loginAvailable:true};
}
type AppleChatDependencies={verifyIdentity:typeof verifyAppleIdentityToken;exchangeCode:typeof exchangeAppleCode;createSession:typeof createAppleSession};
const defaultDependencies:AppleChatDependencies={verifyIdentity:verifyAppleIdentityToken,exchangeCode:exchangeAppleCode,createSession:createAppleSession};
export async function startAppleChatAuth(request:Request){
  consumeRateLimit('apple-chat-login',requestSource(request.headers),30,15*60_000);
  await appleConfiguration();
  const challengeId=randomBytes(32).toString('hex'),clientToken=randomBytes(32).toString('hex'),nonce=randomBytes(32).toString('hex');
  await getPool().execute('DELETE FROM chat_apple_auth WHERE expires_at<NOW()');
  await getPool().execute('INSERT INTO chat_apple_auth (challenge_id,client_hash,nonce_hash,expires_at) VALUES (?,?,?,DATE_ADD(NOW(),INTERVAL 10 MINUTE))',[challengeId,appleHash(clientToken),appleHash(nonce)]);
  return {challengeId,clientToken,nonce};
}
export async function exchangeAppleChatAuth(input:unknown,dependencies:AppleChatDependencies=defaultDependencies){
  const value=(input||{}) as Record<string,unknown>;
  if(!opaqueToken(value.challengeId)||!opaqueToken(value.clientToken)||typeof value.identityToken!=='string'||value.identityToken.length<32||value.identityToken.length>16384||typeof value.authorizationCode!=='string'||!value.authorizationCode||value.authorizationCode.length>4096||(value.name!==undefined&&(typeof value.name!=='string'||value.name.length>160)))throw new ChatError('Неверные данные входа с Apple',400);
  const pool=getPool();
  const [rows]=await pool.execute<RowDataPacket[]>('SELECT nonce_hash,client_hash FROM chat_apple_auth WHERE challenge_id=? AND used_at IS NULL AND expires_at>NOW()',[value.challengeId]);
  const pending=rows[0];
  if(!pending||!appleSecretMatches(value.clientToken,pending.client_hash))throw new ChatError('Вход с Apple устарел. Начни заново.',401);
  const [claim]=await pool.execute<ResultSetHeader>('UPDATE chat_apple_auth SET used_at=NOW() WHERE challenge_id=? AND used_at IS NULL AND expires_at>NOW()',[value.challengeId]);
  if(claim.affectedRows!==1)throw new ChatError('Этот запрос входа уже обработан',401);
  const identity=await dependencies.verifyIdentity(value.identityToken,pending.nonce_hash);
  const grant=await dependencies.exchangeCode(value.authorizationCode);
  const exchanged=await dependencies.verifyIdentity(grant.identityToken,pending.nonce_hash);
  if(exchanged.subject!==identity.subject)throw new ChatError('Apple Account не совпадает с подтверждённым входом',401);
  const encrypted=encryptAppleRefreshToken(grant.refreshToken),name=typeof value.name==='string'?value.name.trim().slice(0,120):'';
  const db=await pool.getConnection();let userId:number;
  try{
    await db.beginTransaction();
    const [accounts]=await db.execute<RowDataPacket[]>('SELECT a.user_id,u.is_active FROM chat_apple_accounts a JOIN chat_users u ON u.id=a.user_id WHERE a.apple_subject=? FOR UPDATE',[identity.subject]);
    if(accounts[0]){
      if(!accounts[0].is_active)throw new ChatError('Доступ к чату ограничен',403);
      userId=accounts[0].user_id;
      await db.execute('UPDATE chat_apple_accounts SET encrypted_refresh_token=?,grant_issued_at=?,revoked_at=NULL WHERE apple_subject=?',[encrypted,new Date(identity.issuedAt*1000),identity.subject]);
    }else{
      // Keep legacy vk_id within its20-character limit; Apple identity lives in
      // its own table and is never interpreted as a VK account.
      const [created]=await db.execute<ResultSetHeader>('INSERT INTO chat_users (vk_id,display_name) VALUES (?,?)',['a_'+randomBytes(13).toString('base64url'),name||'Участник']);
      userId=created.insertId;
      await db.execute('INSERT INTO chat_apple_accounts (apple_subject,user_id,encrypted_refresh_token,grant_issued_at) VALUES (?,?,?,?)',[identity.subject,userId,encrypted,new Date(identity.issuedAt*1000)]);
    }
    await db.execute('DELETE FROM chat_apple_auth WHERE challenge_id=?',[value.challengeId]);
    await db.commit();
  }catch(error){await db.rollback();throw error;}finally{db.release();}
  return dependencies.createSession(userId);
}
export async function revokeAppleAccountAccess(userId:number){
  const [accounts]=await getPool().execute<RowDataPacket[]>('SELECT encrypted_refresh_token FROM chat_apple_accounts WHERE user_id=?',[userId]);
  if(accounts[0]?.encrypted_refresh_token)await revokeAppleGrant(accounts[0].encrypted_refresh_token);
}
export async function handleAppleNotification(request:Request,input:unknown,verify=verifyAppleNotification){
  consumeRateLimit('apple-chat-notification',requestSource(request.headers),120,60_000);
  const token=(input as {payload?:unknown})?.payload;
  if(typeof token!=='string'||token.length<32||token.length>32768)throw new ChatError('Неверное уведомление Apple',400);
  const event=await verify(token),db=await getPool().getConnection();
  try{
    await db.beginTransaction();
    const [stored]=await db.execute<ResultSetHeader>('INSERT IGNORE INTO chat_apple_events (event_hash,event_type) VALUES (?,?)',[event.id,event.type]);
    if(stored.affectedRows&&['consent-revoked','account-deleted','account-delete'].includes(event.type)){
      const [accounts]=await db.execute<RowDataPacket[]>('SELECT user_id FROM chat_apple_accounts WHERE apple_subject=? AND grant_issued_at<=? FOR UPDATE',[event.subject,new Date(event.eventTime*1000)]);
      for(const account of accounts){await db.execute('DELETE FROM chat_sessions WHERE user_id=?',[account.user_id]);await db.execute('UPDATE chat_apple_accounts SET encrypted_refresh_token=NULL,revoked_at=NOW() WHERE user_id=?',[account.user_id]);}
    }
    await db.commit();return {ok:true};
  }catch(error){await db.rollback();throw error;}finally{db.release();}
}
