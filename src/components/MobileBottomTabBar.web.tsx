import React, { useContext, useId, useLayoutEffect, useRef, useState } from 'react';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BottomTabBarHeightCallbackContext } from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';
import { FestivalIcon } from './FestivalIcon.web';
import { TabSpotlight } from './TabSpotlight';
import {festivalNavigationOutline} from '../../shared/navigation-bar';

export const TAB_BAR_INNER_PADDING=8;
const tabs=[{name:'HeadlinersTab',label:'Лайн-ап',icon:'music'},{name:'ChatTab',label:'Общий чат',icon:'chat'},{name:'HomeTab',label:'Домой',icon:'home'},{name:'ScheduleTab',label:'Расписание',icon:'calendar'},{name:'MoreTab',label:'Ещё',icon:'more'}];
export function MobileBottomTabBar({state,navigation}:BottomTabBarProps) {
  const nav=useRef<HTMLElement>(null);const onHeightChange=useContext(BottomTabBarHeightCallbackContext);
  const [size,setSize]=useState({width:360,height:68});const shadowId=`nav-shadow-${useId().replace(/:/g,'')}`;
  useLayoutEffect(()=>{const element=nav.current;if(!element)return;const update=()=>{const rect=element.getBoundingClientRect();setSize(previous=>previous.width===rect.width&&previous.height===rect.height?previous:{width:rect.width,height:rect.height});document.documentElement.style.setProperty('--fest-nav-height',`${rect.height}px`);onHeightChange?.(rect.height);};update();const observer=new ResizeObserver(update);observer.observe(element);return()=>{observer.disconnect();document.documentElement.style.removeProperty('--fest-nav-height');};},[onHeightChange]);
  const active=state.routes[state.index]?.name;
  const activeIndex=Math.max(0,tabs.findIndex(tab=>tab.name===active));
  const sideIndex=tabs.some(tab=>tab.name===active)?activeIndex:4;
  // A 28.4px arc leaves a 6px gap around the 22.4px-radius logo,
  // whose center sits 8px below the menu edge (see .fest-home-mark).
  const outline=festivalNavigationOutline(size.width,size.height);
  const cutout={clipPath:`path("${outline}")`};
  return <nav ref={nav} className="fest-nav" aria-label="Основная навигация" role="tablist">
    <svg className="fest-nav-shadow" viewBox={`0 0 ${size.width} ${size.height}`} preserveAspectRatio="none" aria-hidden="true" focusable="false"><defs><filter id={shadowId} filterUnits="userSpaceOnUse" x="-40" y="-65" width={size.width+80} height={size.height+120} colorInterpolationFilters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation="12" result="blur"/><feOffset in="blur" dy="-10" result="offset"/><feComposite in="offset" in2="SourceAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .65 0"/></filter></defs><path d={outline} fill="black" filter={`url(#${shadowId})`}/></svg>
    <div className="fest-nav-surface" style={cutout} aria-hidden="true"/>
    <svg className="fest-nav-edge" viewBox={`0 0 ${size.width} ${size.height}`} preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d={outline} fill="none"/></svg>
    <div className="fest-nav-beam-clip" style={cutout} aria-hidden="true"><div className="fest-nav-beam-track" data-visible={sideIndex!==2}><TabSpotlight activeIndex={sideIndex} tabCount={5} width={Math.max(0,size.width-20)} height={54}/></div></div>
    {tabs.map(tab=>{
    const route=state.routes.find(item=>item.name===tab.name);if(!route)return null;
    const focused=active===tab.name || tab.name==='MoreTab'&&!tabs.some(item=>item.name===active);
    return <button key={tab.name} type="button" role="tab" aria-selected={focused} aria-label={tab.label} className={`fest-nav-item${tab.icon==='home'?' fest-nav-home':''}`} onClick={()=>{const event=navigation.emit({type:'tabPress',target:route.key,canPreventDefault:true});if(!event.defaultPrevented)navigation.dispatch({...CommonActions.navigate(route.name,route.params),target:state.key});}}>
      {tab.icon==='home'?<span className="fest-home-mark"><img src="/festival-mark.png" alt="" style={{borderRadius:'50%'}}/></span>:<FestivalIcon name={tab.icon}/>}
      <span>{tab.label}</span>
    </button>;
  })}</nav>;
}
