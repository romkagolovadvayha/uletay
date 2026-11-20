import { chatFailure, chatResponse, ChatError, requireChatUser } from '@/lib/chat';
import { chatId } from '@/lib/chat-input';
import { getPool } from '@/lib/db';
import type { ResultSetHeader } from 'mysql2';
import { publishChatEvent } from '@/lib/chat-events';
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}) {try{const user=await requireChatUser(request);const id=chatId((await params).id);if(!id)throw new ChatError('Неверный номер сообщения');const [result]=await getPool().execute<ResultSetHeader>('UPDATE chat_messages SET body=\'\',deleted_at=NOW() WHERE id=? AND user_id=? AND deleted_at IS NULL',[id,user.id]);if(!result.affectedRows)throw new ChatError('Сообщение не найдено',404);publishChatEvent({type:'removed',id});return chatResponse({ok:true});}catch(error){return chatFailure(error);}}
