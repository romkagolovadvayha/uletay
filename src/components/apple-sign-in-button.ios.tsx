import * as AppleAuthentication from 'expo-apple-authentication';
import {useEffect,useState} from 'react';
import {View} from 'react-native';
import type {AppleSignInButtonProps} from './apple-sign-in-button';
export function AppleSignInButton({onPress,disabled}:AppleSignInButtonProps){
  const [available,setAvailable]=useState(false);
  useEffect(()=>{let alive=true;void AppleAuthentication.isAvailableAsync().then(value=>{if(alive)setAvailable(value);}).catch(()=>{});return()=>{alive=false;};},[]);
  if(!available)return null;
  return <View pointerEvents={disabled?'none':'auto'} style={{opacity:disabled?.5:1}}><AppleAuthentication.AppleAuthenticationButton accessibilityLabel="Войти с Apple" accessibilityState={{disabled:!!disabled}} buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN} buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE} cornerRadius={24} style={{width:'100%',height:52}} onPress={()=>{if(!disabled)onPress();}}/></View>;
}
