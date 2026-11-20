import {createHash,randomBytes} from 'node:crypto';
import {sealData,unsealData} from 'iron-session';
import type {RowDataPacket,ResultSetHeader} from 'mysql2';
import {NextResponse} from 'next/server';
import {getPool} from './db';
import {sessionOptions} from './session';
import {ChatError,currentChatUser,getChatSession,issueChatBearer,startChatSession} from './chat';
import {createVkAuthorization,exchangeVkIdentity,vkSettings} from './vk-auth';
import {consumeRateLimit,requestSource} from './rate-limit';
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
const secret=()=>({password:sessionOptions.password,ttl:600});
const nativeAppId=()=>{const id=process.env.VK_NATIVE_APP_ID?.trim()||'54911793';if(!/^[0-9]+$/.test(id))throw new Error('Invalid native VK application');return id;};
export async function startNativeChatAuth(request:Request,nativeSdk=false){
  if(nativeSdk&&process.env.VK_NATIVE_APP_READY==='0')throw new ChatError('Вход через VK настраивается. Попробуй позже.',503);
  consumeRateLimit('native-chat-login',requestSource(request.headers),30,15*60_000);
  const clientId=nativeSdk?nativeAppId():vkSettings().appId;
  const sdkRedirect=`vk${clientId}://vk.ru/blank.html`;
  const redirectUri=nativeSdk?sdkRedirect:process.env.VK_CHAT_REDIRECT_URI?.trim()||vkSettings().redirectUri;
  const callback=new URL(redirectUri);
  if(!nativeSdk&&(!['/api/chat/auth/vk/callback','/admin/auth/vk/callback'].includes(callback.pathname)||callback.search||callback.hash||callback.username||callback.password||(!['localhost','127.0.0.1'].includes(callback.hostname)&&callback.protocol!=='https:')))throw new Error('Invalid callback');
  const pending=createVkAuthorization(redirectUri,clientId),clientToken=randomBytes(32).toString('hex');
  const payload=await sealData({verifier:pending.verifier,redirectUri,clientId},secret());
  await getPool().execute('DELETE FROM chat_native_auth WHERE expires_at<NOW()');
  await getPool().execute('INSERT INTO chat_native_auth (state_hash,client_hash,payload,expires_at) VALUES (?,?,?,DATE_ADD(NOW(),INTERVAL 10 MINUTE))',[digest(pending.state),digest(clientToken),payload]);
  return {url:pending.url,state:pending.state,clientToken,codeChallenge:new URL(pending.url).searchParams.get('code_challenge'),clientId};
}
/** A fixed scheme and a second secret bind the one-use result to the initiating app. */
export async function finishNativeChatAuth(request:Request):Promise<NextResponse|null>{
  const params=new URL(request.url).searchParams,state=params.get('state')||'';
  if(!/^[A-Za-z0-9_-]{43}$/.test(state))return null;
  const [rows]=await getPool().execute<RowDataPacket[]>('SELECT payload FROM chat_native_auth WHERE state_hash=? AND callback_used=FALSE AND expires_at>NOW()',[digest(state)]);
  if(!rows.length)return null;
  const [claim]=await getPool().execute<ResultSetHeader>('UPDATE chat_native_auth SET callback_used=TRUE WHERE state_hash=? AND callback_used=FALSE AND expires_at>NOW()',[digest(state)]);
  if(claim.affectedRows!==1)return null;
  const destination=new URL('uletay://auth');destination.searchParams.set('state',state);
  try{
    const pending=await unsealData<{verifier:string;redirectUri:string}>(rows[0].payload,secret());
    const code=params.get('code')||'',deviceId=params.get('device_id')||'';
    if(params.has('error')||!code||code.length>4096||!deviceId||deviceId.length>512||!pending.verifier)throw new Error('Invalid callback');
    const identity=await exchangeVkIdentity({code,deviceId,state,...pending});
    const ticket=randomBytes(32).toString('hex');
    await getPool().execute('UPDATE chat_native_auth SET ticket_hash=?,identity_payload=?,expires_at=DATE_ADD(NOW(),INTERVAL 2 MINUTE) WHERE state_hash=?',[digest(ticket),await sealData(identity,secret()),digest(state)]);
    destination.searchParams.set('ticket',ticket);
  }catch{destination.searchParams.set('error','vk');}
  const response=NextResponse.redirect(destination);response.headers.set('Cache-Control','no-store');response.headers.set('Referrer-Policy','no-referrer');return response;
}
export async function redeemNativeChatAuth(input:unknown){
  const {ticket,clientToken}=(input||{}) as {ticket?:string;clientToken?:string};
  if(typeof ticket!=='string'||typeof clientToken!=='string'||!/^\w{64}$/.test(ticket)||!/^\w{64}$/.test(clientToken))throw new ChatError('Вход не завершён. Попробуй ещё раз.',401);
  const connection=await getPool().getConnection();let payload:string|undefined;
  try{await connection.beginTransaction();const [rows]=await connection.execute<RowDataPacket[]>('SELECT identity_payload FROM chat_native_auth WHERE ticket_hash=? AND client_hash=? AND expires_at>NOW() FOR UPDATE',[digest(ticket),digest(clientToken)]);payload=rows[0]?.identity_payload;if(!payload)throw new ChatError('Ссылка для входа устарела.',401);await connection.execute('DELETE FROM chat_native_auth WHERE ticket_hash=? AND client_hash=?',[digest(ticket),digest(clientToken)]);await connection.commit();}catch(error){await connection.rollback();throw error;}finally{connection.release();}
  const identity=await unsealData<{id:string;name:string;avatar?:string}>(payload,secret());
  if(!identity.id||!identity.name)throw new ChatError('Ссылка для входа устарела.',401);
  await startChatSession(identity);const user=await currentChatUser();if(!user)throw new ChatError('Вход не завершён',401);
  return {user,csrf:(await getChatSession()).csrf,bearer:await issueChatBearer(user.id,720),loginAvailable:true};
}

export async function exchangeNativeSdkAuth(input:unknown){
  const row=(input||{}) as Record<string,unknown>;
  const {state,clientToken,code,deviceId}=row;
  if(typeof state!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(state)||typeof clientToken!=='string'||!/^[a-f0-9]{64}$/.test(clientToken)||typeof code!=='string'||!code||code.length>4096||typeof deviceId!=='string'||!deviceId||deviceId.length>512)throw new ChatError('Вход не завершён',401);
  const [rows]=await getPool().execute<RowDataPacket[]>('SELECT payload FROM chat_native_auth WHERE state_hash=? AND client_hash=? AND callback_used=FALSE AND expires_at>NOW()',[digest(state),digest(clientToken)]);
  if(!rows.length)throw new ChatError('Вход устарел. Попробуй ещё раз.',401);
  const [claim]=await getPool().execute<ResultSetHeader>('UPDATE chat_native_auth SET callback_used=TRUE WHERE state_hash=? AND client_hash=? AND callback_used=FALSE AND expires_at>NOW()',[digest(state),digest(clientToken)]);
  if(claim.affectedRows!==1)throw new ChatError('Вход уже завершён',401);
  const pending=await unsealData<{verifier:string;redirectUri:string;clientId:string}>(rows[0].payload,secret());
  const expected=`vk${nativeAppId()}://vk.ru/blank.html`;
  if(pending.redirectUri!==expected||pending.clientId!==nativeAppId())throw new ChatError('Неверный способ входа',401);
  const identity=await exchangeVkIdentity({code,deviceId,state,...pending});
  await getPool().execute('DELETE FROM chat_native_auth WHERE state_hash=?',[digest(state)]);
  await startChatSession(identity);const user=await currentChatUser();if(!user)throw new ChatError('Вход не завершён',401);
  return {user,csrf:(await getChatSession()).csrf,bearer:await issueChatBearer(user.id,720),loginAvailable:true};
}
