import {handleAppleNotification} from '@/lib/apple-chat-auth';
import {chatFailure,chatResponse} from '@/lib/chat';
import {readRequestJson} from '@/lib/request-json';
export async function GET(){return chatResponse({service:'Uletay Sign in with Apple notifications'});}
export async function POST(request:Request){try{await handleAppleNotification(request,await readRequestJson(request,40000));return chatResponse({ok:true});}catch(error){return chatFailure(error);}}
