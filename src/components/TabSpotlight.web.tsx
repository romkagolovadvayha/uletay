import React, { useId, useLayoutEffect, useRef } from 'react';
import { colors } from '../theme/colors';

/** The same yellow light used by the original menu, animated with a compositor transform. */
export function TabSpotlight({activeIndex,tabCount,width,height}:{activeIndex:number;tabCount:number;width:number;height:number}) {
  const id=useId().replace(/:/g,'');
  const light=useRef<HTMLDivElement>(null);
  const previousLayout=useRef({width,tabCount});
  const lightWidth=Math.min(width/tabCount*1.45,96);
  const left=width/tabCount*(activeIndex+.5)-lightWidth/2;
  useLayoutEffect(()=>{
    const element=light.current;if(!element)return;
    const resized=previousLayout.current.width!==width||previousLayout.current.tabCount!==tabCount;
    previousLayout.current={width,tabCount};
    element.style.transition=resized?'none':'';
    element.style.transform=`translate3d(${left}px,0,0)`;
  },[width,tabCount,left]);
  return <div ref={light} className="fest-nav-light" aria-hidden="true" style={{width:lightWidth,height}}>
    <svg width="100%" height="100%" viewBox="0 0 96 64" preserveAspectRatio="none" focusable="false">
      <defs>
        <linearGradient id={`${id}-beam`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={colors.tabActive} stopOpacity=".32"/><stop offset=".35" stopColor={colors.tabActive} stopOpacity=".14"/><stop offset=".75" stopColor={colors.tabActive} stopOpacity=".04"/><stop offset="1" stopColor={colors.tabActive} stopOpacity="0"/></linearGradient>
        <radialGradient id={`${id}-halo`}><stop offset="0" stopColor={colors.tabActive} stopOpacity=".6"/><stop offset=".4" stopColor={colors.tabActive} stopOpacity=".2"/><stop offset="1" stopColor={colors.tabActive} stopOpacity="0"/></radialGradient>
        <linearGradient id={`${id}-strip`}><stop offset="0" stopColor={colors.tabActive}/><stop offset=".5" stopColor={colors.tabLightCore}/><stop offset="1" stopColor={colors.tabActive}/></linearGradient>
      </defs>
      <path d="M30 0H66L96 64H0Z" fill={`url(#${id}-beam)`} opacity=".4"/>
      <path d="M32 0H64L88 64H8Z" fill={`url(#${id}-beam)`} opacity=".5"/>
      <path d="M34 0H62L80 64H16Z" fill={`url(#${id}-beam)`}/>
      <ellipse cx="48" cy="3" rx="36" ry="19" fill={`url(#${id}-halo)`}/>
      <rect x="31" width="34" height="4" rx="2" fill={`url(#${id}-strip)`}/>
      <rect x="35" width="26" height="1" rx=".5" fill={colors.tabLightCore}/>
    </svg>
  </div>;
}
