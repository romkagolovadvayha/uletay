import {exchangeAppleChatAuth} from '@/lib/apple-chat-auth';
import {chatFailure,chatResponse} from '@/lib/chat';
import {readRequestJson} from '@/lib/request-json';
export async function POST(request:Request){try{return chatResponse(await exchangeAppleChatAuth(await readRequestJson(request,24576)));}catch(error){return chatFailure(error);}}
