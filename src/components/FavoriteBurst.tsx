import React,{useEffect,useRef,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import Animated,{Easing,useAnimatedStyle,useSharedValue,withDelay,withTiming,useReducedMotion} from 'react-native-reanimated';
import {MotionPressable} from './MotionPressable';
import {colors} from '../theme/colors';
function Particle({index}:{index:number}){
  const p=useSharedValue(0);
  useEffect(()=>{p.set(withDelay(index*12,withTiming(1,{duration:460,easing:Easing.out(Easing.quad)})));},[index,p]);
  const style=useAnimatedStyle(()=>{const v=p.get(),angle=-Math.PI+index*Math.PI/8;return {opacity:1-v,transform:[{translateX:Math.cos(angle)*(35+index%3*8)*v},{translateY:Math.sin(angle)*55*v-12*v},{rotate:`${(index-4)*12*v}deg`},{scale:(.4+Math.sin(v*Math.PI)*.8)}]};});
  return <Animated.View pointerEvents="none" style={[styles.particle,style]}><Ionicons name={index%3?'heart':'sparkles'} size={index%3?12:16} color={index%2?'#ffda00':'#fff3b5'}/></Animated.View>;
}
export function FavoriteBurst({isFavorite,onToggleFavorite,size=24,label,caption,canToggle,disabled,actionLabel}:{isFavorite?:boolean;onToggleFavorite?:()=>void;size?:number;label?:string;caption?:string;canToggle?:()=>boolean;disabled?:boolean;actionLabel?:string}){
  const [burst,setBurst]=useState(0),timer=useRef<ReturnType<typeof setTimeout>|null>(null),reduced=useReducedMotion();
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  return <View style={[styles.root,caption&&{width:'100%'}]}><MotionPressable disabled={disabled} accessibilityRole="button" accessibilityLabel={actionLabel||`${isFavorite?'Убрать из избранного':'Добавить в избранное'}${label?`: ${label}`:''}`} accessibilityState={{selected:!!isFavorite,disabled}} onPress={event=>{event.stopPropagation();if(canToggle&&!canToggle())return;if(timer.current)clearTimeout(timer.current);if(!isFavorite&&!reduced){setBurst(v=>v+1);timer.current=setTimeout(()=>setBurst(0),650);}else setBurst(0);onToggleFavorite?.();}} style={styles.button}><Ionicons name={isFavorite?'heart':'heart-outline'} size={size} color={isFavorite?colors.primary:colors.text}/>{caption?<Text style={{color:colors.text,fontFamily:'FestivalSansSemiBold'}}>{caption}</Text>:null}</MotionPressable>{burst>0?<View key={burst} pointerEvents="none" style={styles.particles}>{Array.from({length:9},(_,index)=><Particle key={index} index={index}/>)}</View>:null}</View>;
}
const styles=StyleSheet.create({root:{width:44,minHeight:44,overflow:'visible',zIndex:3},button:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:10},particles:{position:'absolute',left:'50%',top:16,overflow:'visible'},particle:{position:'absolute',left:-7,top:-7}});
