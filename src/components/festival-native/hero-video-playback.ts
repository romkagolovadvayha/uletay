import type {VideoPlayer,VideoSource} from 'expo-video';

// A short, bundled, silent backdrop does not need Media3's large media buffer.
export const HERO_VIDEO_BUFFER={preferredForwardBufferDuration:3,minBufferForPlayback:.3,maxBufferBytes:4*1024*1024,prioritizeTimeOverSizeThreshold:false};
type HeroPlayer=Pick<VideoPlayer,'bufferOptions'|'loop'|'muted'|'audioMixingMode'|'replaceAsync'|'play'|'addListener'>;
export function loadHeroVideo(player:HeroPlayer,source:VideoSource,onError:()=>void){
  let cancelled=false;
  player.bufferOptions=HERO_VIDEO_BUFFER;
  player.loop=true;player.muted=true;player.audioMixingMode='mixWithOthers';
  const subscription=player.addListener('statusChange',event=>{if(!cancelled&&event.status==='error')onError();});
  void player.replaceAsync(source).then(()=>{if(!cancelled)player.play();}).catch(()=>{if(!cancelled)onError();});
  // useVideoPlayer owns native release on unmount. Do not call a released player
  // here, or allow a late async load to restart playback after leaving Home.
  return()=>{cancelled=true;subscription.remove();};
}
