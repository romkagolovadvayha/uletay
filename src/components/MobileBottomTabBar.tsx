import {BottomTabBarHeightCallbackContext,type BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {CommonActions} from '@react-navigation/native';
import React,{useContext,useEffect,useId,useState} from 'react';
import {Platform,StyleSheet,Text,View} from 'react-native';
import {Image} from 'expo-image';
import {BlurView} from 'expo-blur';
import MaskedView from '@react-native-masked-view/masked-view';
import Svg,{Defs,Filter,FeGaussianBlur,FeOffset,FeComposite,FeColorMatrix,Path} from 'react-native-svg';
import Animated,{ReduceMotion,useAnimatedStyle,useSharedValue,withTiming} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {MotionPressable} from './MotionPressable';
import {TabSpotlight} from './TabSpotlight';
import {NativeNavigationIcon} from './festival-native/navigation-icon';
import {useNativeGlassTarget} from '../context/NativeGlassContext';
import {appFont} from '../theme/typography';
import {NATIVE_NAV_HEIGHT} from '../theme/native-festival';
import {useNativeKeyboard} from '../hooks/useNativeKeyboard';
import {festivalNavigation as geometry,festivalNavigationOutline} from '../../shared/navigation-bar';
export const TAB_BAR_INNER_PADDING=8;
const tabs=[{name:'HeadlinersTab',label:'Лайн-ап'},{name:'ChatTab',label:'Общий чат'},{name:'HomeTab',label:'Домой'},{name:'ScheduleTab',label:'Расписание'},{name:'MoreTab',label:'Ещё'}];
export function MobileBottomTabBar({state,navigation}:BottomTabBarProps){
 const {bottom}=useSafeAreaInsets(),report=useContext(BottomTabBarHeightCallbackContext),target=useNativeGlassTarget();
 const [width,setWidth]=useState(0),height=NATIVE_NAV_HEIGHT+bottom,shadowId=useId().replace(/:/g,'');
 const routes=tabs.map(tab=>({tab,route:state.routes.find(route=>route.name===tab.name)})).filter(row=>!!row.route);
 const focused=routes.findIndex(row=>row.route!.key===state.routes[state.index].key),active=focused<0?4:focused;
 const beamOpacity=useSharedValue(active===2?0:1),keyboard=useNativeKeyboard();
 useEffect(()=>beamOpacity.set(withTiming(active===2?0:1,{duration:180,reduceMotion:ReduceMotion.System})),[active,beamOpacity]);
 const beamStyle=useAnimatedStyle(()=>({opacity:beamOpacity.get()}));
 const path=festivalNavigationOutline(width,height),blurAvailable=Platform.OS!=='android'||Number(Platform.Version)>=31;
 if(keyboard)return null;
 return <View pointerEvents="box-none" onLayout={e=>{setWidth(e.nativeEvent.layout.width);report?.(height);}} style={[styles.bar,{height}]}>
  {width>0?<><Svg pointerEvents="none" width={width} height={height+80} viewBox={`0 -60 ${width} ${height+80}`} style={styles.shadow}><Defs><Filter id={shadowId} x={-40} y={-65} width={width+80} height={height+120} filterUnits="userSpaceOnUse"><FeGaussianBlur in="SourceAlpha" stdDeviation={12} result="blur"/><FeOffset in="blur" dy={-10} result="offset"/><FeComposite in="offset" in2="SourceAlpha" operator="out"/><FeColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .65 0"/></Filter></Defs><Path d={path} fill="black" filter={`url(#${shadowId})`}/></Svg>
   <MaskedView pointerEvents="none" style={StyleSheet.absoluteFill} maskElement={<Svg width={width} height={height}><Path d={path} fill="black"/></Svg>}>
    {blurAvailable?<BlurView blurTarget={target} intensity={45} blurMethod="dimezisBlurViewSdk31Plus" tint="default" style={StyleSheet.absoluteFill}/>:null}
    <View style={[StyleSheet.absoluteFill,{backgroundColor:geometry.surface}]}/>
    <Animated.View style={[styles.beam,beamStyle]}><TabSpotlight activeIndex={active} tabCount={5} width={Math.max(0,width-20)} height={54}/></Animated.View>
   </MaskedView><Svg pointerEvents="none" width={width} height={height} style={StyleSheet.absoluteFill}><Path d={path} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth={1}/></Svg></>:null}
  <View accessibilityRole="tablist" style={styles.row}>{routes.map(({tab,route},index)=>{const selected=index===active,isHome=tab.name==='HomeTab';const press=()=>{const event=navigation.emit({type:'tabPress',target:route!.key,canPreventDefault:true});if(!event.defaultPrevented)navigation.dispatch({...CommonActions.navigate(route!.name,route!.params),target:state.key});};return <MotionPressable key={route!.key} accessibilityRole="tab" accessibilityLabel={tab.label} accessibilityState={{selected}} onPress={press} onLongPress={()=>navigation.emit({type:'tabLongPress',target:route!.key})} style={styles.item}>
   {isHome?<View style={styles.logo}><Image source={require('../../public/festival-mark.png')} contentFit="contain" style={{width:geometry.markWidth,height:geometry.markHeight,borderRadius:100}}/></View>:<NativeNavigationIcon name={tab.name} color={selected?'#ffda00':'#c8c0c6'}/>}
   <Text numberOfLines={1} style={[styles.label,isHome&&styles.homeLabel,{color:selected?'#ffda00':'#c8c0c6'}]}>{tab.label}</Text>
  </MotionPressable>;})}</View>
 </View>;
}
const styles=StyleSheet.create({bar:{position:'absolute',left:0,right:0,bottom:0,overflow:'visible',zIndex:20},shadow:{position:'absolute',top:-60,overflow:'visible'},beam:{position:'absolute',top:0,left:10,right:10,height:54},row:{height:58,marginTop:4,paddingHorizontal:10,flexDirection:'row'},item:{flex:1,alignItems:'center',justifyContent:'center',gap:4,paddingVertical:4},label:{...appFont('medium'),fontSize:geometry.labelSize,lineHeight:14.3,textShadowColor:'rgba(0,0,0,.85)',textShadowOffset:{width:0,height:1},textShadowRadius:3},homeLabel:{position:'absolute',top:38,left:0,right:0,textAlign:'center'},logo:{width:geometry.logoSize,height:geometry.logoSize,borderRadius:geometry.logoSize/2,backgroundColor:'#ffda00',justifyContent:'center',alignItems:'center',position:'absolute',top:-18.4,shadowColor:'#000',shadowOpacity:.3,shadowRadius:7,shadowOffset:{width:0,height:4},elevation:6}});
