import { chatEventStream } from '@/lib/chat-events';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export function GET(request:Request){return new Response(chatEventStream(request.signal),{headers:{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-store, no-transform','X-Accel-Buffering':'no'}});}
