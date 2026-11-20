import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import {Platform,View} from 'react-native';
import {BlurTargetView} from 'expo-blur';
import {useIsFocused} from '@react-navigation/native';
import {AmbientBackground} from '../components/AmbientBackground';
type Target=React.RefObject<View|null>;
const Context=createContext<{target?:Target;setTarget:(target:Target)=>void}>({setTarget:()=>{}});
export function NativeGlassProvider({children}:{children:React.ReactNode}){const [target,setTarget]=useState<Target>();return <Context.Provider value={{target,setTarget}}>{children}</Context.Provider>;}
export function useNativeGlassTarget(){return useContext(Context).target;}
export function NativeGlassScene({children}:{children:React.ReactNode}){const ref=useRef<View>(null),focused=useIsFocused(),{setTarget}=useContext(Context);useEffect(()=>{if(focused)setTarget(ref);},[focused,setTarget]);const Target=Platform.OS==='android'&&Number(Platform.Version)>=31?BlurTargetView:View;return <Target ref={ref} style={{flex:1}}><AmbientBackground/>{children}</Target>;}
