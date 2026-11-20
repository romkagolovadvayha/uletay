import {useEffect,useRef} from 'react';
import {AppState} from 'react-native';
import {useIsFocused} from '@react-navigation/native';
/** No background work or overlapping requests when switching tabs or apps. */
export function useNativePolling(task:(signal:AbortSignal)=>Promise<void>,interval:number,refreshKey?:string|number){
 const focused=useIsFocused(),latest=useRef(task);useEffect(()=>{latest.current=task;},[task]);
 useEffect(()=>{if(!focused)return;const controller=new AbortController();let running=false;const run=async()=>{if(running||controller.signal.aborted||AppState.currentState!=='active')return;running=true;try{await latest.current(controller.signal);}catch{/* The caller owns its visible error state. */}finally{running=false;}};void run();const timer=setInterval(()=>void run(),interval),state=AppState.addEventListener('change',next=>{if(next==='active')void run();});return()=>{controller.abort();clearInterval(timer);state.remove();};},[focused,interval,refreshKey]);
}
