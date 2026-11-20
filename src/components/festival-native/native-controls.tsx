import React,{useEffect,useRef} from 'react';
import {ActivityIndicator,BackHandler,Keyboard,ScrollView,StyleSheet,Text,TextInput,View,type StyleProp,type ViewStyle} from 'react-native';
import {useIsFocused} from '@react-navigation/native';
import {Ionicons} from '@expo/vector-icons';
import Animated,{Easing,useAnimatedStyle,useSharedValue,withTiming,useReducedMotion} from 'react-native-reanimated';
import {MotionPressable} from '../MotionPressable';
import {colors} from '../../theme/colors';
import {appFont} from '../../theme/typography';
import {festivalNative as f} from '../../theme/native-festival';

type IconName=React.ComponentProps<typeof Ionicons>['name'];
export function NativeIconButton({name,label,onPress,active=false,disabled=false,style}:{name:IconName;label:string;onPress:()=>void;active?:boolean;disabled?:boolean;style?:StyleProp<ViewStyle>}){
  return <MotionPressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected:active,disabled}} disabled={disabled} onPress={onPress} hitSlop={4} style={[styles.icon,active&&styles.selected,style]}><Ionicons name={name} size={21} color={active?colors.primary:colors.text}/></MotionPressable>;
}
export function NativeButton({label,onPress,primary=false,disabled=false,busy=false,icon,style}:{label:string;onPress:()=>void;primary?:boolean;disabled?:boolean;busy?:boolean;icon?:IconName;style?:StyleProp<ViewStyle>}){
  return <MotionPressable accessibilityRole="button" accessibilityState={{disabled:disabled||busy,busy}} onPress={onPress} disabled={disabled||busy} style={[styles.button,primary&&styles.primary,(disabled||busy)&&{opacity:.5},style]}>{busy?<ActivityIndicator color={primary?colors.primaryText:colors.primary}/>:icon?<Ionicons name={icon} size={19} color={primary?colors.primaryText:colors.text}/>:null}<Text style={[styles.buttonText,primary&&{color:colors.primaryText}]}>{label}</Text></MotionPressable>;
}
export function NativeHeading({title,kicker,children}:{title:string;kicker?:string;children?:React.ReactNode}){return <View style={f.header}><View style={{flex:1}}>{kicker?<Text style={f.eyebrow}>{kicker}</Text>:null}<Text accessibilityRole="header" style={f.display}>{title}</Text></View><View style={f.headerTools}>{children}</View></View>;}
export function NativeSearch({open,value,onChange,onClose,placeholder='Найти артиста'}:{open:boolean;value:string;onChange:(value:string)=>void;onClose:()=>void;placeholder?:string}){
  const input=useRef<TextInput>(null),progress=useSharedValue(open?1:0),reduced=useReducedMotion();
  const focused=useIsFocused();
  useEffect(()=>{if(!open||!focused)return;const subscription=BackHandler.addEventListener('hardwareBackPress',()=>{onClose();return true;});return()=>subscription.remove();},[open,focused,onClose]);
  useEffect(()=>{progress.set(withTiming(open?1:0,{duration:reduced?0:180,easing:Easing.bezier(.23,1,.32,1)}));if(!open){input.current?.blur();return;}const timer=setTimeout(()=>input.current?.focus(),reduced?0:100);return()=>clearTimeout(timer);},[open,progress,reduced]);
  const animation=useAnimatedStyle(()=>({height:progress.get()*56,opacity:progress.get(),transform:[{translateY:(1-progress.get())*-8}]}));
  return <Animated.View pointerEvents={open?'auto':'none'} accessibilityElementsHidden={!open} importantForAccessibility={open?'auto':'no-hide-descendants'} style={[styles.searchWrap,animation]}><View style={styles.search}><Ionicons name="search-outline" size={19} color={colors.textSecondary}/><TextInput ref={input} editable={open} value={value} onChangeText={onChange} accessibilityLabel={placeholder} placeholder={placeholder} placeholderTextColor="#ac9da7" autoCorrect={false} autoCapitalize="none" returnKeyType="search" onSubmitEditing={()=>Keyboard.dismiss()} style={styles.input}/><MotionPressable accessibilityRole="button" accessibilityLabel={value?'Очистить поиск':'Закрыть поиск'} onPress={()=>value?onChange(''):onClose()} style={styles.clear}><Ionicons name="close" size={19} color={colors.textSecondary}/></MotionPressable></View></Animated.View>;
}
export function NativePills({items,selected,onSelect,label}:{items:{id:string;label:string}[];selected:string;onSelect:(id:string)=>void;label?:string}){return <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" accessibilityLabel={label} contentContainerStyle={styles.pills}>{items.map(item=><MotionPressable accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{selected:item.id===selected}} key={item.id} onPress={()=>onSelect(item.id)} style={[styles.pill,item.id===selected&&styles.activePill]}><Text style={[styles.pillText,item.id===selected&&{color:colors.primaryText}]}>{item.label}</Text></MotionPressable>)}</ScrollView>;}
export function NativeEmpty({title,description,loading=false,onRetry}:{title:string;description?:string;loading?:boolean;onRetry?:()=>void}){return <View style={styles.empty}>{loading?<ActivityIndicator color={colors.primary} size="large"/>:null}<Text style={[f.sectionTitle,{textAlign:'center'}]}>{title}</Text>{description?<Text style={[f.muted,{textAlign:'center'}]}>{description}</Text>:null}{onRetry?<NativeButton label="Повторить" onPress={onRetry}/>:null}</View>;}
export const nativeControlStyles=StyleSheet.create({row:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:13},label:{...appFont('medium'),fontSize:14,color:colors.text,flex:1}});
const styles=StyleSheet.create({
  icon:{width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(10,5,9,.3)',borderWidth:1,borderColor:'rgba(255,255,255,.13)'},selected:{backgroundColor:'rgba(255,218,0,.10)'},
  button:{minHeight:44,paddingHorizontal:18,paddingVertical:12,borderRadius:24,backgroundColor:'rgba(255,255,255,.075)',flexDirection:'row',gap:9,alignItems:'center',justifyContent:'center'},primary:{backgroundColor:colors.primary},buttonText:{...appFont('semiBold'),fontSize:13,lineHeight:18,color:colors.text},
  searchWrap:{paddingHorizontal:14,overflow:'hidden'},search:{height:44,flexDirection:'row',gap:9,paddingLeft:13,alignItems:'center',borderRadius:16,backgroundColor:'rgba(255,255,255,.075)',borderWidth:1,borderColor:'rgba(255,218,0,.5)'},input:{flex:1,...appFont('regular'),fontSize:13,color:colors.text,paddingVertical:10,minWidth:0},clear:{width:44,height:44,alignItems:'center',justifyContent:'center'},
  pills:{paddingHorizontal:14,paddingVertical:5,gap:7,alignItems:'center'},pill:{minHeight:36,minWidth:52,borderRadius:20,paddingHorizontal:15,paddingVertical:10,backgroundColor:'rgba(255,255,255,.065)'},activePill:{backgroundColor:colors.primary},pillText:{...appFont('semiBold'),fontSize:11,lineHeight:15,color:colors.text},
  empty:{flexGrow:1,padding:30,gap:14,alignItems:'center',justifyContent:'center',minHeight:230},
});
