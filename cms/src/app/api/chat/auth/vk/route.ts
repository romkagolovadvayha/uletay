import { NextResponse } from 'next/server';
import { createVkAuthorization, vkSettings } from '@/lib/vk-auth';
import { getChatSession } from '@/lib/chat';
import { consumeRateLimit, requestSource } from '@/lib/rate-limit';
export async function GET(request:Request) {
  const incoming=new URL(request.url);let returnOrigin=incoming.origin;
  try {
    consumeRateLimit('chat-login',requestSource(request.headers),30,15*60_000);
    const configured=process.env.VK_CHAT_REDIRECT_URI?.trim()||vkSettings().redirectUri;
    const callback=new URL(configured);
    const local=['localhost','127.0.0.1'].includes(callback.hostname);
    if((!local&&callback.protocol!=='https:')||callback.username||callback.password||callback.search||callback.hash||!['/api/chat/auth/vk/callback','/admin/auth/vk/callback'].includes(callback.pathname))throw new Error('Invalid callback');
    returnOrigin=callback.origin;
    const {url,...pending}=createVkAuthorization(configured);
    const returnPath=incoming.searchParams.get('returnTo')==='/wishes'?'/wishes':'/chat';
    const session=await getChatSession();session.oauth={...pending,returnOrigin,redirectUri:configured,returnPath};await session.save();
    const response=NextResponse.redirect(url);response.headers.set('Cache-Control','no-store');response.headers.set('Referrer-Policy','no-referrer');return response;
  }catch{return NextResponse.redirect(new URL('/chat?auth=unavailable',returnOrigin));}
}
