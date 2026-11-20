import React,{memo,useState} from 'react';
import {formatFestivalDayTimelineLabel} from '../utils/festivalTime';
import type {ScheduleTimeSliderProps} from './ScheduleTimeSlider';
export const ScheduleTimeSlider=memo(function ScheduleTimeSlider({min,max,initialMinute,selectedDate,nowMinute,onChange}:ScheduleTimeSliderProps){
  const [value,setValue]=useState(()=>Math.max(min,Math.min(max,initialMinute)));
  const change=(next:number)=>{setValue(next);onChange(next);};
  const label=(minute:number)=>formatFestivalDayTimelineLabel(minute,selectedDate);
  return <div style={{margin:'4px 14px 10px',padding:'8px 14px',borderRadius:14,background:'rgba(255,255,255,.055)'}}><div style={{display:'flex',alignItems:'center',gap:12}}><span className="fest-muted" style={{fontSize:10}}>ВРЕМЯ</span><output htmlFor="schedule-time-slider" style={{fontFamily:'var(--fest-display, sans-serif)',fontSize:24,color:'#ffda00'}}>{label(value)}</output>{nowMinute!==null&&nowMinute>=min&&nowMinute<=max?<button className="fest-text-button" type="button" style={{marginLeft:'auto'}} onClick={()=>change(nowMinute)}>Сейчас</button>:null}</div><input id="schedule-time-slider" aria-label="Время в расписании" aria-valuetext={label(value)} type="range" min={min} max={max} step={5} value={value} onChange={e=>change(Number(e.target.value))} style={{width:'100%',minHeight:32,accentColor:'#ffda00',cursor:'pointer'}}/><div className="fest-muted" style={{display:'flex',justifyContent:'space-between',fontSize:10}}><span>{label(min)}</span><span>{label(max)}</span></div></div>;
});
