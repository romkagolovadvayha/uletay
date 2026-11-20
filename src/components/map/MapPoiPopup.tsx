import React from 'react';
import {ScrollView,View,useWindowDimensions} from 'react-native';
import {BottomSheet,RNHostView} from '@expo/ui';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {NativeIconButton} from '../festival-native/native-controls';
type Props={visible:boolean;children:React.ReactNode;onClose?:()=>void;showCloseButton?:boolean;onHeightChange?:(height:number)=>void};
export function MapPoiPopup({visible,children,onClose,showCloseButton=true,onHeightChange}:Props){
 const insets=useSafeAreaInsets(),{height}=useWindowDimensions();
 return <BottomSheet isPresented={visible} onDismiss={()=>onClose?.()} containerColor="#281323" contentPadding={{left:14,right:14,bottom:Math.max(insets.bottom,16)}}><RNHostView matchContents={{vertical:true}}><View onLayout={event=>onHeightChange?.(event.nativeEvent.layout.height)} style={{maxHeight:height-insets.top-100}}>{showCloseButton&&onClose?<View style={{alignItems:'flex-end'}}><NativeIconButton name="close" label="Закрыть" onPress={onClose}/></View>:null}<ScrollView style={{flexGrow:0,flexShrink:1}} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:10}}>{children}</ScrollView></View></RNHostView></BottomSheet>;
}
