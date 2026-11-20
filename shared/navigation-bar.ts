/** Dimensions shared by the web and real native bottom navigation. */
export const festivalNavigation={height:68,sidePadding:10,logoSize:44.8,logoCenterY:8,markWidth:28.8,markHeight:30.4,surface:'rgba(28,23,29,.4)',labelSize:11} as const;
export function festivalNavigationOutline(width:number,height:number){const c=width/2;return `M0 0H${c-43}C${c-34.5} 0 ${c-29.8} 0 ${c-28.1} 12A28.4 28.4 0 0 0 ${c+28.1} 12C${c+29.8} 0 ${c+34.5} 0 ${c+43} 0H${width}V${height}H0Z`;}
