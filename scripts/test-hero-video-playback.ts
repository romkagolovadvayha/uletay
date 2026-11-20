import assert from 'node:assert/strict';
import{loadHeroVideo,HERO_VIDEO_BUFFER}from'../src/components/festival-native/hero-video-playback';
function fixture(){let resolve!:()=>void,reject!:(error:Error)=>void;const calls:string[]=[],loaded=new Promise<void>((yes,no)=>{resolve=yes;reject=no;});let status:((event:{status:string})=>void)|undefined;const player={set bufferOptions(value:unknown){assert.deepEqual(value,HERO_VIDEO_BUFFER);calls.push('bounded');},loop:false,muted:false,audioMixingMode:'auto',replaceAsync:()=>{calls.push('load');return loaded;},play:()=>calls.push('play'),addListener:(_name:string,listener:typeof status)=>{status=listener;return{remove:()=>calls.push('unsubscribe')};}};let failures=0;const cancel=loadHeroVideo(player as never,1,()=>failures++);return{calls,resolve,reject,cancel,status:(value:string)=>status?.({status:value}),failures:()=>failures};}
async function main(){
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const active=fixture();assert.deepEqual(active.calls,['bounded','load']);active.resolve();await flush();assert.equal(active.calls.at(-1),'play');active.status('error');assert.equal(active.failures(),1);active.cancel();
const hidden=fixture();hidden.cancel();hidden.resolve();await flush();assert(!hidden.calls.includes('play'),'Leaving Home during loading must not start a hidden decoder');hidden.status('error');assert.equal(hidden.failures(),0);
const released=fixture();released.cancel();released.reject(Error('Native player released'));await flush();assert.equal(released.failures(),0,'Unmount races are ignored rather than showing an error on another screen');
const broken=fixture();broken.reject(Error('Decode failed'));await flush();assert.equal(broken.failures(),1,'A real failure switches to the static poster');broken.cancel();
assert(HERO_VIDEO_BUFFER.maxBufferBytes<=4*1024*1024);console.log('Hero video: bounded before load; cancels hidden playback; handles release races and decode errors.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
