import { randomBytes } from 'node:crypto';
import { chatFailure, chatResponse, currentChatUser, getChatSession, issueChatBearer, requireChatUser } from '@/lib/chat';
import { vkAuthConfigured } from '@/lib/vk-auth';
import { getPool } from '@/lib/db';
export const dynamic='force-dynamic';
export async function GET() {try{const session=await getChatSession();if(!session.csrf){session.csrf=randomBytes(24).toString('base64url');await session.save();}const user=await currentChatUser();return chatResponse({user,csrf:session.csrf,bearer:user?await issueChatBearer(user.id):null,loginAvailable:vkAuthConfigured()});}catch(error){return chatFailure(error);}}
export async function DELETE(request:Request) {try{const user=await requireChatUser(request);await getPool().execute('DELETE FROM chat_sessions WHERE user_id=?',[user.id]);(await getChatSession()).destroy();return chatResponse({ok:true});}catch(error){return chatFailure(error);}}
