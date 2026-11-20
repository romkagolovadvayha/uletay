import { NextResponse } from 'next/server';
import { getChatSession, startChatSession } from './chat';
import { exchangeVkIdentity, validVkState } from './vk-auth';
import {finishNativeChatAuth} from './native-chat-auth';

/** The existing registered VK callback can serve visitors without granting CMS access. */
export async function finishChatOAuth(request:Request):Promise<NextResponse|null> {
  const native=await finishNativeChatAuth(request);if(native)return native;
  const session=await getChatSession();const pending=session.oauth;
  const params=new URL(request.url).searchParams;const state=params.get('state')||'';
  if(!pending || !validVkState(pending.state,state,pending.expiresAt))return null;
  delete session.oauth;await session.save();
  const returnPath=pending.returnPath==='/wishes'?'/wishes':'/chat';
  let destination:string=returnPath;
  try{
    const code=params.get('code')||'',deviceId=params.get('device_id')||'';
    if(params.has('error')||!code||code.length>4096||!deviceId||deviceId.length>512)throw new Error('Invalid callback');
    const identity=await exchangeVkIdentity({code,deviceId,state,verifier:pending.verifier,redirectUri:pending.redirectUri});
    await startChatSession(identity);
  }catch{destination=`${returnPath}?auth=failed`;}
  const response=NextResponse.redirect(new URL(destination,pending.returnOrigin));
  response.headers.set('Cache-Control','no-store');response.headers.set('Referrer-Policy','no-referrer');return response;
}
