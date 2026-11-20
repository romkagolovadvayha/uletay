import { useEffect, useState } from 'react';

const DISPLAY_MODES='(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui)';
export function useInstalledAppMode() {
  const read=()=>typeof window!=='undefined'&&(window.matchMedia(DISPLAY_MODES).matches||Boolean((navigator as Navigator & {standalone?:boolean}).standalone));
  const [installed,setInstalled]=useState(read);
  useEffect(()=>{const query=window.matchMedia(DISPLAY_MODES);const update=()=>setInstalled(read());query.addEventListener('change',update);window.addEventListener('pageshow',update);return()=>{query.removeEventListener('change',update);window.removeEventListener('pageshow',update);};},[]);
  return installed;
}
