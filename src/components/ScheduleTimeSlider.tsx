import React,{memo,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {Host,Slider} from '@expo/ui';
import {MotionPressable} from './MotionPressable';
import {appFont} from '../theme/typography';
import {formatFestivalDayTimelineLabel} from '../utils/festivalTime';
export type ScheduleTimeSliderProps={min:number;max:number;initialMinute:number;selectedDate:string;nowMinute:number|null;onChange:(minute:number)=>void};
export const ScheduleTimeSlider=memo(function ScheduleTimeSlider({min,max,initialMinute,selectedDate,nowMinute,onChange}:ScheduleTimeSliderProps){
  const [value,setValue]=useState(()=>Math.max(min,Math.min(max,initialMinute)));
  const change=(next:number)=>{const minute=Math.max(min,Math.min(max,Math.round(next)));setValue(minute);onChange(minute);};
  const label=(minute:number)=>formatFestivalDayTimelineLabel(minute,selectedDate);
  return <View style={styles.wrap}><View style={styles.heading}><Text style={styles.caption}>ВРЕМЯ</Text><Text accessibilityLiveRegion="polite" style={styles.time}>{label(value)}</Text>{nowMinute!==null&&nowMinute>=min&&nowMinute<=max?<MotionPressable accessibilityRole="button" accessibilityLabel="Перейти к текущему времени" onPress={()=>change(nowMinute)} style={styles.now}><Text style={styles.nowText}>Сейчас</Text></MotionPressable>:null}</View><Host colorScheme="dark" seedColor="#ffda00" style={{height:38,width:'100%'}}><Slider testID="schedule-time-slider" value={value} onValueChange={change} min={min} max={max} step={5}/></Host><View style={styles.ends}><Text style={styles.caption}>{label(min)}</Text><Text style={styles.caption}>{label(max)}</Text></View></View>;
});
const styles=StyleSheet.create({wrap:{marginHorizontal:14,marginTop:3,marginBottom:8,paddingHorizontal:12,paddingTop:7,paddingBottom:6,borderRadius:14,backgroundColor:'rgba(255,255,255,.055)'},heading:{flexDirection:'row',alignItems:'center',gap:12},caption:{...appFont('medium'),fontSize:9,color:'#baabba'},time:{fontFamily:'FestivalDisplay',fontSize:22,lineHeight:25,color:'#ffda00'},now:{marginLeft:'auto',paddingVertical:5,paddingHorizontal:10,borderRadius:12,backgroundColor:'rgba(255,218,0,.12)'},nowText:{...appFont('medium'),fontSize:10,color:'#ffda00'},ends:{flexDirection:'row',justifyContent:'space-between'}});
