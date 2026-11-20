import { Ionicons } from '@expo/vector-icons';
import { loadAsync, FontDisplay } from 'expo-font';
import { useEffect, useState } from 'react';
export function useAppFonts() {
  const [iconsReady,setIconsReady]=useState(false);
  useEffect(()=>{let active=true;void loadAsync(Object.fromEntries(Object.entries(Ionicons.font).map(([name,uri])=>[name,{uri,display:FontDisplay.SWAP}]))).finally(()=>{if(active)setIconsReady(true);}).catch(()=>{});return()=>{active=false;};},[]);
  return {loaded:true,iconsReady,error:null};
}
