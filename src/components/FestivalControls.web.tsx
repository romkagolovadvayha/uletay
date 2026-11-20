import React, { useEffect, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { FestivalIcon } from './FestivalIcon.web';

export function FestivalSearch({open,onClose,value,onChange,placeholder='Найти артиста'}:{open:boolean;onClose:()=>void;value:string;onChange:(value:string)=>void;placeholder?:string}) {
  const input=useRef<HTMLInputElement>(null);const focused=useIsFocused();
  useEffect(()=>{if(!open||!focused)return;const frame=requestAnimationFrame(()=>input.current?.focus({preventScroll:true}));return()=>cancelAnimationFrame(frame);},[open,focused]);
  if(!open)return null;
  return <div className="fest-search" role="search"><FestivalIcon name="search" size={22}/><input ref={input} type="search" aria-label={placeholder} placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onClose();}}}/>{value?<button type="button" className="fest-icon" aria-label="Очистить поиск" onClick={()=>{onChange('');input.current?.focus();}}><FestivalIcon name="close" size={18}/></button>:null}</div>;
}
export function FestivalCarousel({items,value,onChange,label}:{items:{id:string;label:string}[];value:string;onChange:(value:string)=>void;label:string}) {
  const container=useRef<HTMLDivElement>(null);const first=useRef(true);
  useEffect(()=>{
    const group=container.current;const button=group?.querySelector<HTMLElement>('[aria-pressed=true]');if(!group||!button)return;
    group.scrollTo({left:button.offsetLeft-group.offsetLeft-group.clientWidth/2+button.offsetWidth/2,behavior:first.current||window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});first.current=false;
  },[value,items]);
  return <div ref={container} className="fest-scroll-pills" role="group" aria-label={label} onKeyDown={e=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
    const buttons=Array.from(container.current?.querySelectorAll<HTMLButtonElement>('button')||[]);const index=buttons.indexOf(document.activeElement as HTMLButtonElement);if(index<0)return;
    e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?items.length-1:Math.max(0,Math.min(items.length-1,index+(e.key==='ArrowRight'?1:-1)));onChange(items[next].id);buttons[next]?.focus({preventScroll:true});
  }}>{items.map(item=><button className="fest-pill fest-year" type="button" key={item.id} aria-pressed={item.id===value} onClick={()=>onChange(item.id)}>{item.label}</button>)}</div>;
}
