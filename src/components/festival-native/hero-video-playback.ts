import type {VideoPlayer,VideoSource} from 'expo-video';

// A short, bundled, silent backdrop does not need Media3's large media buffer.
export const HERO_VIDEO_BUFFER={preferredForwardBufferDuration:3,minBufferForPlayback:.3,maxBufferBytes:4*1024*1024,prioritizeTimeOverSizeThreshold:false};
type HeroPlayer=Pick<VideoPlayer,'bufferOptions'|'loop'|'muted'|'audioMixingMode'|'replaceAsync'|'play'|'pause'|'addListener'>;
export function createHeroVideoPlayback(player:HeroPlayer,source:VideoSource,onError:()=>void){
  let disposed=false,active=false,generation=0;
  player.bufferOptions=HERO_VIDEO_BUFFER;
  player.loop=true;player.muted=true;player.audioMixingMode='mixWithOthers';
  const subscription=player.addListener('statusChange',event=>{if(!disposed&&active&&event.status==='error')onError();});
  const clear=()=>{try{player.pause();void player.replaceAsync(null).catch(()=>{});}catch{/* The hook may already have released the native object. */}};
  return{
    setActive(next:boolean){
      if(disposed||next===active)return;active=next;const current=++generation;
      if(!next){clear();return;}
      try{void player.replaceAsync(source).then(()=>{if(!disposed&&active&&current===generation)player.play();}).catch(()=>{if(!disposed&&active&&current===generation)onError();});}catch{if(!disposed&&active)onError();}
    },
    dispose(){if(disposed)return;disposed=true;active=false;generation++;subscription.remove();clear();},
  };
}
