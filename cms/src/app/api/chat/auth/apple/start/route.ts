import {startAppleChatAuth} from '@/lib/apple-chat-auth';
import {chatFailure,chatResponse} from '@/lib/chat';
export async function POST(request:Request){try{return chatResponse(await startAppleChatAuth(request));}catch(error){return chatFailure(error);}}
