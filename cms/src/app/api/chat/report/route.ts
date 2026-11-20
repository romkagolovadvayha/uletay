import { chatFailure, chatResponse, ChatError, requireChatUser } from '@/lib/chat';
import { chatId } from '@/lib/chat-input';
import { getPool } from '@/lib/db';
import { consumeRateLimit } from '@/lib/rate-limit';
export async function POST(request:Request) {try{const user=await requireChatUser(request);consumeRateLimit('chat-report',String(user.id),10,60_000);const input=await request.json();const id=chatId(input.messageId);if(!id)throw new ChatError('Неверный номер сообщения');await getPool().execute('INSERT IGNORE INTO chat_reports (message_id,user_id) SELECT id,? FROM chat_messages WHERE id=? AND deleted_at IS NULL',[user.id,id]);return chatResponse({ok:true});}catch(error){return chatFailure(error);}}
