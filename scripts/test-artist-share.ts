import assert from 'node:assert/strict';
import { buildArtistShareData, openArtistShare } from '../src/utils/artistShare.web';

async function main(){
  const data=buildArtistShareData('КНЯZZ','https://example.test/headliners/knyazz?auth=failed#details');
  assert.deepEqual(data,{title:'КНЯZZ',url:'https://example.test/headliners/knyazz'});
  let called=false,finish:()=>void=()=>{};
  const pending=openArtistShare(data,{secure:true,share:received=>{called=true;assert.deepEqual(received,data);return new Promise<void>(resolve=>{finish=resolve;});}});
  assert.equal(called,true,'The native share call must happen before yielding the click activation');
  finish();assert.equal(await pending,'shared');
  assert.equal(await openArtistShare(data,{secure:true,share:async()=>{throw new DOMException('cancel','AbortError');}}),'cancelled');
  assert.equal(await openArtistShare(data,{secure:true,share:async()=>{throw new Error('blocked');}}),'failed');
  assert.equal(await openArtistShare(data,{secure:false}),'insecure');
  assert.equal(await openArtistShare(data,{secure:true}),'unsupported');
  console.log('Native share: immediate invocation, payload without auth parameters, cancel, failure and HTTPS/browser support states passed.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
