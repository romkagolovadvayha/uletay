import React from 'react';
import Svg,{Circle,Ellipse,Path,Rect} from 'react-native-svg';
export function NativeNavigationIcon({name,color}:{name:string;color:string}){
 return <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round">{name==='HeadlinersTab'?<><Path d="M9 18V5l12-2v13M9 9l12-2"/><Ellipse cx={6} cy={18} rx={3} ry={3}/><Ellipse cx={18} cy={16} rx={3} ry={3}/></>:name==='ChatTab'?<Path d="M21 11.5a9 9 0 0 1-9 9 10 10 0 0 1-4-.8L3 21l1.3-5A9 9 0 1 1 21 11.5Z"/>:name==='ScheduleTab'?<><Rect x={3} y={5} width={18} height={16} rx={3}/><Path d="M7 3v4m10-4v4M3 11h18M7 15h2m3 0h2m3 0h1M7 18h2"/></>:<><Circle cx={5} cy={12} r={1}/><Circle cx={12} cy={12} r={1}/><Circle cx={19} cy={12} r={1}/></>}</Svg>;
}
