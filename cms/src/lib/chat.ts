import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { getPool } from './db';
import { sessionOptions } from './session';
import { chatId, chatRequestId, normalizeChatText } from './chat-input';
import { consumeRateLimit, RateLimitError, requestSource } from './rate-limit';
import { readRequestJson, RequestJsonError } from './request-json';
import { publishChatEvent } from './chat-events';

type ChatSession = { userId?: number; csrf?: string; oauth?: {state:string;verifier:string;expiresAt:number;returnOrigin:string;redirectUri:string;returnPath?:'/chat'|'/wishes'} };
export type ChatUser = { id:number; name:string; avatar:string|null };
export class ChatError extends Error { constructor(message:string, public status=400) {super(message);} }
export async function getChatSession() {
  if (String(sessionOptions.password).length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters');
  return getIronSession<ChatSession>(await cookies(), {...sessionOptions,cookieName:'uletay_visitor',ttl:30*24*60*60});
}
export async function currentChatUser(): Promise<ChatUser|null> {
  const session=await getChatSession();
  if(!session.userId) return null;
  const [rows]=await getPool().execute<RowDataPacket[]>('SELECT id, display_name, avatar_url FROM chat_users WHERE id=? AND is_active=TRUE LIMIT 1',[session.userId]);
  return rows[0]?{id:rows[0].id,name:rows[0].display_name,avatar:rows[0].avatar_url}:null;
}
export async function requireChatUser(request: Request) {
  const bearer=request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if(bearer){
    const digest=createHash('sha256').update(bearer).digest('hex');
    const [rows]=await getPool().execute<RowDataPacket[]>('SELECT u.id,u.display_name,u.avatar_url FROM chat_sessions s JOIN chat_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>NOW() AND u.is_active=TRUE LIMIT 1',[digest]);
    if(!rows[0])throw new ChatError('Сессия истекла. Войдите ещё раз.',401);
    return {id:rows[0].id,name:rows[0].display_name,avatar:rows[0].avatar_url} as ChatUser;
  }
  const session=await getChatSession();
  const supplied=request.headers.get('X-Chat-CSRF')||'';
  if(!session.csrf || Buffer.byteLength(supplied)!==Buffer.byteLength(session.csrf) || !timingSafeEqual(Buffer.from(supplied),Buffer.from(session.csrf))) throw new ChatError('Обновите страницу и повторите отправку',403);
  const user=await currentChatUser();
  if(!user) throw new ChatError('Войдите в профиль, чтобы написать сообщение',401);
  return user;
}
export async function issueChatBearer(userId:number,lifetimeHours=1) {
  const token=randomBytes(32).toString('hex');const digest=createHash('sha256').update(token).digest('hex');
  await getPool().execute('INSERT INTO chat_sessions (token_hash,user_id,expires_at) VALUES (?,?,DATE_ADD(NOW(),INTERVAL ? HOUR))',[digest,userId,Math.min(720,Math.max(1,Math.floor(lifetimeHours)))]);
  await getPool().execute('DELETE FROM chat_sessions WHERE expires_at<NOW()');
  return token;
}
export async function startChatSession(identity:{id:string;name:string;avatar?:string}) {
  const pool=getPool();
  const avatar=identity.avatar && /^https:\/\//.test(identity.avatar)?identity.avatar.slice(0,2048):null;
  await pool.execute('INSERT INTO chat_users (vk_id,display_name,avatar_url) VALUES (?,?,?) ON DUPLICATE KEY UPDATE display_name=VALUES(display_name),avatar_url=VALUES(avatar_url)',[identity.id,identity.name.slice(0,120),avatar]);
  const [rows]=await pool.execute<RowDataPacket[]>('SELECT id,is_active FROM chat_users WHERE vk_id=?',[identity.id]);
  if(!rows[0]?.is_active) throw new ChatError('Доступ к чату ограничен',403);
  const session=await getChatSession();
  session.userId=rows[0].id;session.csrf=randomBytes(24).toString('base64url');delete session.oauth;await session.save();
}
export function chatResponse(value:unknown,status=200) {return Response.json(value,{status,headers:{'Cache-Control':'no-store','Vary':'Cookie'}});}
export function chatFailure(error:unknown) {
  if(error instanceof RateLimitError) return Response.json({error:error.message},{status:429,headers:{'Cache-Control':'no-store','Retry-After':String(error.retryAfter)}});
  if(error instanceof ChatError) return chatResponse({error:error.message},error.status);
  console.error('[chat] Request failed:',error instanceof Error?error.name:'UnknownError');
  return chatResponse({error:'Чат временно недоступен. Попробуйте ещё раз.'},503);
}
const selectMessage=`SELECT m.id,m.user_id,m.body,m.created_at,m.deleted_at,u.display_name,u.avatar_url,u.vk_id,
 r.id AS reply_id,r.user_id AS reply_user_id,r.body AS reply_body,r.deleted_at AS reply_deleted,ru.display_name AS reply_name
 FROM chat_messages m JOIN chat_users u ON u.id=m.user_id
 LEFT JOIN chat_messages r ON r.id=m.reply_to LEFT JOIN chat_users ru ON ru.id=r.user_id`;
export function serializeMessage(row:RowDataPacket) {
  const example=String(row.vk_id).startsWith('preview-chat-');
  return {id:row.id,userId:row.user_id,name:example?`${row.display_name} · пример`:row.display_name,avatar:row.avatar_url,example,text:row.deleted_at?'':row.body,deleted:!!row.deleted_at,
    createdAt:new Date(row.created_at).toISOString(),reply:row.reply_id?{id:row.reply_id,userId:row.reply_user_id,name:row.reply_name,text:row.reply_deleted?'Сообщение удалено':String(row.reply_body).slice(0,240)}:null};
}
export async function listChatMessages(before:number|null,after:number|null) {
  const clause=before?'WHERE m.id < ?':after?'WHERE m.id > ?':'';
  const [rows]=await getPool().execute<RowDataPacket[]>(`${selectMessage} ${clause} ORDER BY m.id ${after?'ASC':'DESC'} LIMIT 51`,before?[before]:after?[after]:[]);
  const hasMore=rows.length>50;
  const page=rows.slice(0,50);if(!after)page.reverse();
  const [removed]=await getPool().query<RowDataPacket[]>('SELECT id FROM chat_messages WHERE deleted_at>DATE_SUB(NOW(),INTERVAL 10 MINUTE) ORDER BY id DESC LIMIT 500');
  return {messages:page.map(serializeMessage),hasMore,removed:removed.map(row=>row.id)};
}
export async function sendChatMessage(request:Request) {
  const user=await requireChatUser(request);
  let input;try{input=await readRequestJson(request,16000);}catch(error){throw new ChatError('Неверный формат или размер сообщения',error instanceof RequestJsonError?error.status:400);}
  if(!input||typeof input!=='object'||Array.isArray(input))throw new ChatError('Неверный формат сообщения');
  const fields=input as Record<string,unknown>;
  let text,replyTo,requestId;
  try{text=normalizeChatText(fields.text);replyTo=chatId(fields.replyTo);requestId=chatRequestId(fields.requestId);}catch(error){throw new ChatError((error as Error).message);}
  const pool=getPool();
  const [existing]=await pool.execute<RowDataPacket[]>(`${selectMessage} WHERE m.user_id=? AND m.request_id=?`,[user.id,requestId]);
  if(existing[0])return serializeMessage(existing[0]);
  consumeRateLimit('chat-send',String(user.id),15,60_000);
  consumeRateLimit('chat-send-source',requestSource(request.headers),3000,60_000);
  if(replyTo){const [rows]=await pool.execute<RowDataPacket[]>('SELECT id FROM chat_messages WHERE id=? AND deleted_at IS NULL',[replyTo]);if(!rows.length)throw new ChatError('Сообщение, на которое вы отвечаете, удалено',409);}
  const [insert]=await pool.execute<ResultSetHeader>('INSERT INTO chat_messages (user_id,body,reply_to,request_id) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)',[user.id,text,replyTo,requestId]);
  const [rows]=await pool.execute<RowDataPacket[]>(`${selectMessage} WHERE m.id=?`,[insert.insertId]);
  const message=serializeMessage(rows[0]);publishChatEvent({type:'message',message});return message;
}
