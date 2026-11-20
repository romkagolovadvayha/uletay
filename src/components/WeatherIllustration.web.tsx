import React,{useId} from 'react';
import type {WeatherKind} from '../../shared/festival-weather';
export function WeatherIllustration({kind,isDay=true,size=54}:{kind:WeatherKind;isDay?:boolean;size?:number}){
  const id=`weather-${useId().replace(/:/g,'')}`;const precipitation=['rain','drizzle','sleet','snow','thunder'].includes(kind);const cloudy=kind!=='clear';
  return <svg className="fest-weather-art" width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">
    <defs><linearGradient id={id} x1="12" y1="20" x2="48" y2="46" gradientUnits="userSpaceOnUse"><stop stopColor="#fff"/><stop offset="1" stopColor="#aabbd1"/></linearGradient><radialGradient id={`${id}-sun`}><stop stopColor="#fff4ac"/><stop offset="1" stopColor="#ffca37"/></radialGradient></defs>
    {kind==='clear'||kind==='partly'?(isDay?<g className="fest-weather-sun"><path d="M25 5v4m0 32v4M5 25h4m32 0h4M11 11l3 3m22 22 3 3m0-28-3 3M14 36l-3 3" stroke="#ffdc67" strokeWidth="2.6" strokeLinecap="round"/><circle cx="25" cy="25" r="12" fill={`url(#${id}-sun)`}/></g>:<path d="M32 7a19 19 0 1 0 18 26A19 19 0 0 1 32 7Z" fill="#e4e8ff"/>):null}
    {cloudy?<g className="fest-weather-cloud"><path d={precipitation?'M15 38a9 9 0 0 1 0-18 14 14 0 0 1 26-3 11 11 0 1 1 7 21Z':'M15 44a10 10 0 0 1 0-20 15 15 0 0 1 28-3 12 12 0 1 1 5 23Z'} fill={`url(#${id})`}/><path d="M19 23a10 10 0 0 1 16-4" stroke="white" strokeOpacity=".55" strokeWidth="2" strokeLinecap="round"/></g>:null}
    {['rain','drizzle','sleet'].includes(kind)?<g stroke="#7bccff" strokeWidth={kind==='drizzle'?2:3} strokeLinecap="round">{[20,32,44].map((x,i)=><path key={x} className="fest-weather-drop" style={{animationDelay:`${i*200}ms`}} d={`m${x} 44-3 7`}/>)}</g>:null}
    {kind==='snow'||kind==='sleet'?<g stroke="#def5ff" strokeWidth="1.8" strokeLinecap="round">{[19,32,45].map(x=><path key={x} className="fest-weather-flake" d={`M${x} 46v10m-4-8 8 6m-8 0 8-6`}/>)}</g>:null}
    {kind==='thunder'?<path d="m34 38-10 13h8l-3 10 14-16h-9l5-7Z" fill="#ffda00"/>:null}
    {kind==='fog'?<path d="M11 46h42M16 52h34M20 58h22" stroke="#d8e1ed" strokeWidth="2.5" strokeLinecap="round"/>:null}
  </svg>;
}
