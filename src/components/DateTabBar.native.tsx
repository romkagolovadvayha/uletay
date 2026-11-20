import React from 'react';
import {ScrollView,Text,View} from 'react-native';
import {formatDateTabParts} from '../utils/scheduleHelpers';
import {MotionPressable} from './MotionPressable';
import {appFont} from '../theme/typography';
type Props={dates:string[];selectedDate:string;onSelect:(date:string)=>void;variant?:'red'|'yellow'};
export function DateTabBar({dates,selectedDate,onSelect}:Props){
 const choices=dates.map(date=>{const {day,month,weekday}=formatDateTabParts(date),active=date===selectedDate;return <MotionPressable key={date} accessibilityRole="tab" accessibilityState={{selected:active}} accessibilityLabel={`${day} ${month}, ${weekday}`} onPress={()=>onSelect(date)} style={{flex:dates.length<=6?1:undefined,width:dates.length>6?64:undefined,minHeight:59,borderRadius:15,alignItems:'center',justifyContent:'center',backgroundColor:active?'#ffda00':'rgba(255,255,255,.065)',gap:1}}><Text style={{fontFamily:'FestivalDisplay',fontSize:24,lineHeight:26,color:active?'#251b00':'#fff'}}>{day}</Text><Text style={[appFont('medium'),{fontSize:8,lineHeight:12,color:active?'#433900':'#bcaeba'}]}>{month} · {weekday.slice(0,2)}</Text></MotionPressable>;});
 return dates.length<=6?<View accessibilityLabel="Даты фестиваля" style={{flexDirection:'row',gap:6}}>{choices}</View>:<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:6}}>{choices}</ScrollView>;
}
