import assert from 'node:assert/strict';
import{createHeroVideoPlayback,HERO_VIDEO_BUFFER}from'../src/components/festival-native/hero-video-playback';
function fixture(){
 const calls:string[]=[],loads:{resolve:()=>void;reject:(error:Error)=>void}[]=[];let status:((event:{status:string})=>void)|undefined,failures=0;
 const player={set bufferOptions(value:unknown){assert.deepEqual(value,HERO_VIDEO_BUFFER);calls.push('bounded');},loop:false,muted:false,audioMixingMode:'auto',replaceAsync:(source:unknown)=>{calls.push(source===null?'clear':'load');if(source===null)return Promise.resolve();return new Promise<void>((resolve,reject)=>loads.push({resolve,reject}));},play:()=>calls.push('play'),pause:()=>calls.push('pause'),addListener:(_name:string,listener:typeof status)=>{status=listener;return{remove:()=>calls.push('unsubscribe')};}};
 return{session:createHeroVideoPlayback(player as never,1,()=>failures++),calls,loads,status:(value:string)=>status?.({status:value}),failures:()=>failures};
}
async function main(){
 const flush=()=>new Promise(resolve=>setImmediate(resolve));
 const active=fixture();active.session.setActive(true);assert.deepEqual(active.calls,['bounded','load']);active.loads[0].resolve();await flush();assert.equal(active.calls.at(-1),'play');active.session.dispose();assert.deepEqual(active.calls.slice(-3),['unsubscribe','pause','clear']);
 const background=fixture();background.session.setActive(true);background.session.setActive(false);assert.deepEqual(background.calls.slice(-2),['pause','clear'],'Background events must immediately stop and unload video without waiting for a React render');background.loads[0].resolve();await flush();assert(!background.calls.includes('play'));background.status('error');assert.equal(background.failures(),0);
 background.session.setActive(true);background.loads[1].resolve();await flush();assert.equal(background.calls.at(-1),'play','Foreground resumes after an actual new load');background.session.dispose();
 const stale=fixture();stale.session.setActive(true);stale.session.setActive(false);stale.session.setActive(true);stale.loads[0].resolve();await flush();assert(!stale.calls.includes('play'),'An old load cannot restart playback after a newer lifecycle change');stale.loads[1].resolve();await flush();assert.equal(stale.calls.at(-1),'play');stale.session.dispose();
 const released=fixture();released.session.setActive(true);released.session.dispose();released.loads[0].reject(Error('Released'));await flush();assert.equal(released.failures(),0);
 const broken=fixture();broken.session.setActive(true);broken.loads[0].reject(Error('Decode failed'));await flush();assert.equal(broken.failures(),1);broken.session.dispose();
 console.log('Hero video: bounded loading, immediate background unload, foreground resume, stale-load cancellation and failure fallback passed.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
