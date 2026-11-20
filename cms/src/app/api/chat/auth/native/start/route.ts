import {startNativeChatAuth} from '@/lib/native-chat-auth';
import {chatFailure,chatResponse} from '@/lib/chat';
import {readRequestJson} from '@/lib/request-json';
export async function POST(request:Request){try{const input=await readRequestJson(request,1024) as {nativeSdk?:boolean};return chatResponse(await startNativeChatAuth(request,input?.nativeSdk===true));}catch(error){return chatFailure(error);}}
