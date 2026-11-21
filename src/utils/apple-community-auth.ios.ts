import * as AppleAuthentication from 'expo-apple-authentication';
import {apiFetch} from '../api/apiFetch';
import type {CommunitySession} from '../context/CommunityAuthContext';
async function read<T>(response:Response):Promise<T>{const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||'Не удалось выполнить вход с Apple');return body;}
export async function beginAppleCommunityLogin():Promise<CommunitySession|null>{
  if(!await AppleAuthentication.isAvailableAsync())throw new Error('Вход с Apple недоступен на этом устройстве');
  const pending=await read<{challengeId:string;clientToken:string;nonce:string}>(await apiFetch('/chat/auth/apple/start',{method:'POST',headers:{Accept:'application/json'}}));
  try{
    const credential=await AppleAuthentication.signInAsync({requestedScopes:[AppleAuthentication.AppleAuthenticationScope.FULL_NAME],nonce:pending.nonce,state:pending.challengeId});
    if(!credential.identityToken||!credential.authorizationCode||credential.state!==pending.challengeId)throw new Error('Apple не подтвердил вход. Попробуй ещё раз.');
    const name=credential.fullName?AppleAuthentication.formatFullName(credential.fullName).trim():'';
    return await read<CommunitySession>(await apiFetch('/chat/auth/apple/exchange',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({challengeId:pending.challengeId,clientToken:pending.clientToken,identityToken:credential.identityToken,authorizationCode:credential.authorizationCode,...(name?{name}:{})})}));
  }catch(error){if((error as {code?:string}).code==='ERR_REQUEST_CANCELED')return null;throw error;}
}
