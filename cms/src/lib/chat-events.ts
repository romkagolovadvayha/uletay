type ChatEvent={type:'message';message:unknown}|{type:'removed';id:number};
type State={listeners:Set<ReadableStreamDefaultController<Uint8Array>>;timer:ReturnType<typeof setInterval>|null};
const globalState=globalThis as typeof globalThis&{uletayChatEvents?:State};
const state=globalState.uletayChatEvents??={listeners:new Set(),timer:null};
const encoder=new TextEncoder();
function detach(controller:ReadableStreamDefaultController<Uint8Array>){state.listeners.delete(controller);if(!state.listeners.size&&state.timer){clearInterval(state.timer);state.timer=null;}}
function broadcast(bytes:Uint8Array){for(const listener of state.listeners){try{listener.enqueue(bytes);}catch{detach(listener);}}}
export function publishChatEvent(event:ChatEvent){broadcast(encoder.encode(`event: chat\ndata: ${JSON.stringify(event)}\n\n`));}
export function chatEventStream(signal:AbortSignal){
  let active:ReadableStreamDefaultController<Uint8Array>|null=null;
  const abort=()=>{if(active){detach(active);try{active.close();}catch{}active=null;}};
  return new ReadableStream<Uint8Array>({
    start(controller){active=controller;controller.enqueue(encoder.encode('retry: 3000\n: connected\n\n'));state.listeners.add(controller);if(!state.timer)state.timer=setInterval(()=>broadcast(encoder.encode(': keepalive\n\n')),15000);signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();},
    cancel(){signal.removeEventListener('abort',abort);abort();},
  });
}
