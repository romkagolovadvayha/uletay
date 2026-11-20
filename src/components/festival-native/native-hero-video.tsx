import React,{memo,useCallback,useEffect,useState} from 'react';
import {AppState,StyleSheet} from 'react-native';
import {Image} from 'expo-image';
import {useVideoPlayer,VideoView} from 'expo-video';
import Animated,{useAnimatedStyle,useSharedValue,withTiming,useReducedMotion} from 'react-native-reanimated';
import {loadHeroVideo} from './hero-video-playback';

const source=require('../../../assets/videos/background.mp4');
const posterSource=require('../../../public/hero-video-poster.webp');
const ActiveHeroVideo=memo(function ActiveHeroVideo({onError}:{onError:()=>void}){
  // Start empty so buffer limits are applied before Media3 loads any data.
  const player=useVideoPlayer(null),poster=useSharedValue(1);
  useEffect(()=>loadHeroVideo(player,source,onError),[player,onError]);
  const posterStyle=useAnimatedStyle(()=>({opacity:poster.get()}));
  return <><VideoView player={player} nativeControls={false} fullscreenOptions={{enable:false}} allowsPictureInPicture={false} useExoShutter={false} contentFit="cover" surfaceType="surfaceView" onFirstFrameRender={()=>poster.set(withTiming(0,{duration:240}))} style={StyleSheet.absoluteFill}/><Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill,posterStyle]}><Image source={posterSource} contentFit="cover" style={StyleSheet.absoluteFill}/></Animated.View></>;
});
export const NativeHeroVideo=memo(function NativeHeroVideo({focused,visible}:{focused:boolean;visible:boolean}){
  const reduced=useReducedMotion(),[active,setActive]=useState(AppState.currentState==='active'),[failed,setFailed]=useState(false);
  useEffect(()=>{const listener=AppState.addEventListener('change',state=>setActive(state==='active'));return()=>listener.remove();},[]);
  const fail=useCallback(()=>setFailed(true),[]);
  // Pausing alone leaves Media3 buffers and decoders allocated. Unmounting the
  // owner releases them whenever Home is hidden, scrolled away or backgrounded.
  return <><Image source={posterSource} contentFit="cover" style={StyleSheet.absoluteFill}/>{focused&&visible&&active&&!reduced&&!failed?<ActiveHeroVideo onError={fail}/>:null}</>;
});
