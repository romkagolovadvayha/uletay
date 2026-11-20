import { chatFailure, chatResponse, ChatError, listChatMessages, sendChatMessage } from '@/lib/chat';
import { chatId } from '@/lib/chat-input';
export const dynamic='force-dynamic';
export async function GET(request:Request) {try{const url=new URL(request.url);let before,after;try{before=chatId(url.searchParams.get('before'));after=chatId(url.searchParams.get('after'));}catch{throw new ChatError('Неверная страница чата');}if(before&&after)throw new ChatError('Неверная страница чата');return chatResponse(await listChatMessages(before,after));}catch(error){return chatFailure(error);}}
export async function POST(request:Request) {try{return chatResponse({message:await sendChatMessage(request)},201);}catch(error){return chatFailure(error);}}
