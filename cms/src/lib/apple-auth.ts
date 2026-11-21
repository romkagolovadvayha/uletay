import {createCipheriv,createDecipheriv,createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {createRemoteJWKSet,importPKCS8,jwtVerify,SignJWT,type JWTVerifyGetKey} from 'jose';
import {ChatError} from './chat';
import {sessionOptions} from './session';

export const APPLE_CLIENT_ID='ru.uletay.app';
const issuer='https://appleid.apple.com';
const appleKeys=createRemoteJWKSet(new URL(issuer+'/auth/keys'),{timeoutDuration:5000,cacheMaxAge:3600000});
export const appleHash=(value:string)=>createHash('sha256').update(value).digest('hex');
export function appleSecretMatches(value:string,expected:string){
  if(!/^[a-f0-9]{64}$/.test(expected))return false;
  return timingSafeEqual(Buffer.from(appleHash(value),'hex'),Buffer.from(expected,'hex'));
}
export async function verifyAppleIdentityToken(token:string,nonceHash:string,keys:JWTVerifyGetKey=appleKeys){
  try{
    const {payload}=await jwtVerify(token,keys,{issuer,audience:APPLE_CLIENT_ID,algorithms:['RS256'],requiredClaims:['sub','iat','exp','nonce'],maxTokenAge:'10m',clockTolerance:5});
    if(typeof payload.sub!=='string'||!payload.sub||payload.sub.length>255||typeof payload.nonce!=='string'||!appleSecretMatches(payload.nonce,nonceHash))throw Error('Invalid Apple identity');
    return {subject:payload.sub,issuedAt:payload.iat!};
  }catch{throw new ChatError('Не удалось подтвердить вход с Apple. Попробуй ещё раз.',401);}
}
export async function verifyAppleNotification(token:string,keys:JWTVerifyGetKey=appleKeys){
  try{
    const {payload}=await jwtVerify(token,keys,{issuer,audience:APPLE_CLIENT_ID,algorithms:['RS256'],requiredClaims:['iat','jti'],maxTokenAge:'30d',clockTolerance:60});
    const event=typeof payload.events==='string'?JSON.parse(payload.events):payload.events;
    if(!event||typeof event!=='object'||typeof event.type!=='string'||event.type.length>64||typeof event.sub!=='string'||!event.sub||event.sub.length>255||typeof payload.jti!=='string'||typeof event.event_time!=='number'||!Number.isFinite(event.event_time)||event.event_time<=0||event.event_time>Date.now()/1000+60)throw Error('Invalid event');
    return {id:appleHash(payload.jti),type:event.type,subject:event.sub,eventTime:event.event_time as number};
  }catch{throw new ChatError('Недействительная подпись уведомления Apple',401);}
}
function encryptionKey(){
  const secret=String(sessionOptions.password);
  if(secret.length<32)throw Error('Missing session encryption secret');
  return createHash('sha256').update(secret+':uletay-apple-grants:v1').digest();
}
export function encryptAppleRefreshToken(token:string){
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',encryptionKey(),iv);
  const encrypted=Buffer.concat([cipher.update(token,'utf8'),cipher.final()]);
  return ['v1',iv.toString('base64url'),cipher.getAuthTag().toString('base64url'),encrypted.toString('base64url')].join('.');
}
export function decryptAppleRefreshToken(value:string){
  const [version,iv,tag,ciphertext,extra]=value.split('.');
  if(version!=='v1'||!iv||!tag||!ciphertext||extra)throw Error('Invalid encrypted Apple grant');
  const decipher=createDecipheriv('aes-256-gcm',encryptionKey(),Buffer.from(iv,'base64url'));
  decipher.setAuthTag(Buffer.from(tag,'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext,'base64url')),decipher.final()]).toString('utf8');
}
export async function appleConfiguration(){
  try{
    const config=JSON.parse(await readFile(process.env.APPLE_SIGN_IN_CONFIG_PATH||path.resolve(process.cwd(),'.private/apple-sign-in.json'),'utf8')) as {clientId:string;teamId:string;keyId:string;privateKeyPath:string};
    if(config.clientId!==APPLE_CLIENT_ID||!/^[A-Z0-9]{10}$/.test(config.teamId)||!/^[A-Z0-9]{10}$/.test(config.keyId)||typeof config.privateKeyPath!=='string')throw Error('Invalid configuration');
    return config;
  }catch{throw new ChatError('Вход с Apple пока недоступен. Попробуй позже или выбери VK.',503);}
}
export async function appleClientSecret(){
  const config=await appleConfiguration();
  try{
    const key=await importPKCS8(await readFile(config.privateKeyPath,'utf8'),'ES256');
    return await new SignJWT({}).setProtectedHeader({alg:'ES256',kid:config.keyId}).setIssuer(config.teamId).setSubject(APPLE_CLIENT_ID).setAudience(issuer).setIssuedAt().setExpirationTime('5m').sign(key);
  }catch{throw new ChatError('Вход с Apple временно недоступен.',503);}
}
export async function exchangeAppleCode(code:string){
  const secret=await appleClientSecret();
  let response:Response;
  try{response=await fetch(issuer+'/auth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},signal:AbortSignal.timeout(8000),body:new URLSearchParams({client_id:APPLE_CLIENT_ID,client_secret:secret,code,grant_type:'authorization_code'})});}
  catch{throw new ChatError('Apple временно не отвечает. Попробуй ещё раз.',502);}
  const data=await response.json().catch(()=>({})) as {refresh_token?:string;id_token?:string};
  if(response.status>=500)throw new ChatError('Apple временно не отвечает. Попробуй ещё раз.',502);
  if(!response.ok||typeof data.refresh_token!=='string'||!data.refresh_token||typeof data.id_token!=='string'||!data.id_token)throw new ChatError('Apple не подтвердил вход. Повтори вход с Apple.',401);
  return {refreshToken:data.refresh_token,identityToken:data.id_token};
}
export async function revokeAppleGrant(encryptedToken:string){
  const secret=await appleClientSecret(),token=decryptAppleRefreshToken(encryptedToken);
  let response:Response;
  try{response=await fetch(issuer+'/auth/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},signal:AbortSignal.timeout(8000),body:new URLSearchParams({client_id:APPLE_CLIENT_ID,client_secret:secret,token,token_type_hint:'refresh_token'})});}
  catch{throw new ChatError('Не удалось связаться с Apple. Попробуй удалить профиль ещё раз.',502);}
  if(!response.ok)throw new ChatError('Не удалось отключить вход Apple. Попробуй удалить профиль ещё раз.',502);
}
