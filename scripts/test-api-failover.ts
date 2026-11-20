import assert from 'node:assert/strict';
import { createFailoverFetch } from '../src/api/failover';
async function main(){
const primary='https://primary.example/api',fallback='https://backup.example/api';
const calls:{url:string;init?:RequestInit}[]=[];let time=0;let mode='offline';
const fake:typeof fetch=async(input,init)=>{const url=String(input);calls.push({url,init});if(url.startsWith(primary)&&mode==='offline')throw new TypeError('Network failed');if(mode==='unauthorized')return Response.json({error:'login'},{status:401});if(mode==='server-error'&&url.startsWith(primary))return Response.json({error:'down'},{status:503});return Response.json({ok:true});};
const transport=createFailoverFetch({primary,fallbacks:[fallback],fetcher:fake,now:()=>time});
assert.equal((await transport('/data',{headers:{Accept:'application/json'}})).status,200);
assert.deepEqual(calls.map(row=>row.url),[primary+'/data',fallback+'/data']);
calls.length=0;await transport('/data');assert.equal(calls[0].url,fallback+'/data','Remember working origin without another primary timeout');
time=61_000;mode='online';calls.length=0;await transport('/data');assert.equal(calls[0].url,primary+'/data','Retry primary after the cooldown');
mode='unauthorized';calls.length=0;assert.equal((await transport('/data')).status,401);assert.equal(calls.length,1,'Do not retry authorization errors');
mode='offline';calls.length=0;await assert.rejects(transport('/push/subscribe',{method:'POST',body:'{}'}));assert.equal(calls.length,1,'Never automatically replay an unsafe mutation');
calls.length=0;const body=JSON.stringify({text:'message',requestId:'stable-request-id-1'});await transport('/chat/messages',{method:'POST',body,replaySafe:true,credentials:'include'});assert.equal(calls.length,2);assert.equal(calls[0].init?.body,calls[1].init?.body);assert.equal(calls[1].init?.credentials,'omit','Never forward primary cookies to the gateway');
calls.length=0;await assert.rejects(transport('/chat/session',{credentials:'include'}));assert.equal(calls[0].url,primary+'/chat/session','Browser cookie bootstrap remains on the primary');assert.equal(calls.length,1);
const canceled=new AbortController();canceled.abort();calls.length=0;await assert.rejects(transport('/data',{signal:canceled.signal}));assert.equal(calls.length,0,'Caller cancellation must not trigger a fallback');
mode='server-error';const failedServer=createFailoverFetch({primary,fallbacks:[fallback],fetcher:fake});calls.length=0;assert.equal((await failedServer('/data')).status,200);assert.equal(calls.length,2);
console.log('API failover: outages, cooldown, recovery, 401, cancellation, cookies and mutation idempotency OK');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
