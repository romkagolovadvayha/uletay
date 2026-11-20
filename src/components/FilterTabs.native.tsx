import React,{useEffect,useRef,useState} from 'react';
import {ScrollView,Text,View} from 'react-native';
import {useReducedMotion} from 'react-native-reanimated';
import {MotionPressable} from './MotionPressable';
import type {FilterTabsProps} from './FilterTabs';
import {appFont} from '../theme/typography';
export function FilterTabs<T extends string>({items,value,onChange,label,layout='row',role='tablist',inset=0}:FilterTabsProps<T>){
 const scroll=useRef<ScrollView>(null),positions=useRef(new Map<T,{x:number;width:number}>()),[width,setWidth]=useState(0),reduced=useReducedMotion();
 useEffect(()=>{const selected=positions.current.get(value);if(selected&&width)scroll.current?.scrollTo({x:Math.max(0,selected.x-(width-selected.width)/2),animated:!reduced});},[value,width,reduced]);
 const content=<View accessibilityRole={role} accessibilityLabel={label} style={{flexDirection:'row',gap:7,paddingHorizontal:inset,paddingVertical:4}}>{items.map(item=>{const active=item.id===value;return <View key={item.id} onLayout={event=>positions.current.set(item.id,event.nativeEvent.layout)}><MotionPressable accessibilityRole={role==='radiogroup'?'radio':'tab'} accessibilityLabel={item.accessibilityLabel||item.label} accessibilityState={role==='radiogroup'?{checked:active}:{selected:active}} onPress={()=>onChange(item.id)} style={{minHeight:layout==='dates'?58:40,minWidth:52,borderRadius:layout==='dates'?15:22,paddingHorizontal:15,paddingVertical:10,backgroundColor:active?'#ffda00':'rgba(30,13,25,.60)',alignItems:'center',justifyContent:'center',gap:2}}><Text style={[appFont('semiBold'),{fontSize:11,lineHeight:16,color:active?'#251b00':'#eee5ec'}]}>{item.label}</Text>{item.caption?<Text style={[appFont('regular'),{fontSize:9,lineHeight:12,color:active?'#433900':'#c4b4c0'}]}>{item.caption}</Text>:null}{item.detail?<Text style={[appFont('regular'),{fontSize:9,color:active?'#433900':'#c4b4c0'}]}>{item.detail}</Text>:null}</MotionPressable></View>;})}</View>;
 return <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} style={{flexGrow:0,flexShrink:0}} onLayout={event=>setWidth(event.nativeEvent.layout.width)} keyboardShouldPersistTaps="handled">{content}</ScrollView>;
}
