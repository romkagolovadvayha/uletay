import { NextResponse } from 'next/server';
import { finishChatOAuth } from '@/lib/chat-oauth';
export async function GET(request:Request) {
  return await finishChatOAuth(request) ?? NextResponse.redirect(new URL('/chat?auth=failed',request.url));
}
