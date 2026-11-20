import {redeemNativeChatAuth} from '@/lib/native-chat-auth';
import {chatFailure,chatResponse} from '@/lib/chat';
import {readRequestJson} from '@/lib/request-json';
export async function POST(request:Request){try{return chatResponse(await redeemNativeChatAuth(await readRequestJson(request,2048)));}catch(error){return chatFailure(error);}}
