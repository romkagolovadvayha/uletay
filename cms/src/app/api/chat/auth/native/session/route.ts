import {requireChatUser,issueChatBearer,chatFailure,chatResponse} from '@/lib/chat';
export async function GET(request:Request){try{const user=await requireChatUser(request);return chatResponse({user,csrf:'',bearer:await issueChatBearer(user.id,720),loginAvailable:true});}catch(error){return chatFailure(error);}}
