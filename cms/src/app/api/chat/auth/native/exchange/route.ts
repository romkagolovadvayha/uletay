import {exchangeNativeSdkAuth} from '@/lib/native-chat-auth';
import {chatFailure,chatResponse} from '@/lib/chat';
import {readRequestJson} from '@/lib/request-json';
export async function POST(request:Request){try{return chatResponse(await exchangeNativeSdkAuth(await readRequestJson(request,8192)));}catch(error){return chatFailure(error);}}
