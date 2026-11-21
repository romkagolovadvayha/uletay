import './load-env';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {generateKeyPair,exportJWK,createLocalJWKSet,SignJWT} from 'jose';
import type {RowDataPacket} from 'mysql2';
import {config} from '../src/lib/config';
import {getPool} from '../src/lib/db';
import {APPLE_CLIENT_ID,appleHash,verifyAppleIdentityToken,verifyAppleNotification,decryptAppleRefreshToken} from '../src/lib/apple-auth';
import {startAppleChatAuth,exchangeAppleChatAuth,handleAppleNotification} from '../src/lib/apple-chat-auth';
import {issueChatBearer} from '../src/lib/chat';
async function main(){
 assert(config.dbName==='uletay_web_design'&&config.dbPort===3352,'Only the isolated local preview database may be tested');
 const dir=path.resolve(__dirname,'../../artifacts/app-store-2026-11-21/apple-auth-tests');await mkdir(dir,{recursive:true});
 const configPath=path.join(dir,'test-config.json');await writeFile(configPath,JSON.stringify({clientId:APPLE_CLIENT_ID,teamId:'TESTTEAM12',keyId:'TESTKEY123',privateKeyPath:'fixture-not-read'}));process.env.APPLE_SIGN_IN_CONFIG_PATH=configPath;
 const pool=getPool(),pair=await generateKeyPair('RS256',{extractable:true}),keys=createLocalJWKSet({keys:[{...await exportJWK(pair.publicKey),kid:'test',alg:'RS256'}]});
 const subject='test.uletay.apple.'+Date.now(),challenges:string[]=[],users:number[]=[],events:string[]=[];
 const request=new Request('https://uletayapp.ru/api/chat/auth/apple/start',{method:'POST',headers:{'x-forwarded-for':'127.0.0.1'}});
 const challenge=async()=>{const value=await startAppleChatAuth(request);challenges.push(value.challengeId);return value;};
 const signed=(nonce:string,sub=subject)=>new SignJWT({sub,nonce}).setProtectedHeader({alg:'RS256',kid:'test'}).setIssuer('https://appleid.apple.com').setAudience(APPLE_CLIENT_ID).setIssuedAt().setExpirationTime('5m').sign(pair.privateKey);
 const codes=new Map<string,string>();
 const dependencies={verifyIdentity:(token:string,hash:string)=>verifyAppleIdentityToken(token,hash,keys),exchangeCode:async(code:string)=>({identityToken:codes.get(code)!,refreshToken:'private-test-refresh'}),createSession:async(userId:number)=>{if(!users.includes(userId))users.push(userId);const [rows]=await pool.execute<RowDataPacket[]>('SELECT id,display_name FROM chat_users WHERE id=?',[userId]);return{user:{id:userId,name:String(rows[0].display_name),avatar:null},csrf:'',bearer:await issueChatBearer(userId,720),loginAvailable:true};}};
 const input=async(p:Awaited<ReturnType<typeof challenge>>,name?:string)=>{const identityToken=await signed(p.nonce),code='code-'+p.challengeId;codes.set(code,identityToken);return{challengeId:p.challengeId,clientToken:p.clientToken,identityToken,authorizationCode:code,...(name?{name}:{})};};
 try{
  const first=await challenge(),value=await input(first,'Тестовый участник Apple');
  await assert.rejects(exchangeAppleChatAuth({...value,clientToken:'0'.repeat(64)},dependencies));
  const [pending]=await pool.execute<RowDataPacket[]>('SELECT nonce_hash,client_hash,used_at FROM chat_apple_auth WHERE challenge_id=?',[first.challengeId]);assert.equal(pending[0].used_at,null);assert.notEqual(pending[0].nonce_hash,first.nonce);assert.notEqual(pending[0].client_hash,first.clientToken);
  const result=await exchangeAppleChatAuth(value,dependencies);assert.equal(result.user?.name,'Тестовый участник Apple');assert(result.bearer);await assert.rejects(exchangeAppleChatAuth(value,dependencies),'A successful challenge must never be replayed');
  const repeat=await exchangeAppleChatAuth(await input(await challenge()),dependencies);assert.equal(repeat.user?.id,result.user?.id);assert.equal(repeat.user?.name,result.user?.name,'Apple only returns the name on first consent; later sign-ins preserve it');
  const [account]=await pool.execute<RowDataPacket[]>('SELECT encrypted_refresh_token FROM chat_apple_accounts WHERE apple_subject=?',[subject]);assert(!account[0].encrypted_refresh_token.includes('private-test-refresh'));assert.equal(decryptAppleRefreshToken(account[0].encrypted_refresh_token),'private-test-refresh');
  const wrong=await challenge(),wrongValue=await input(wrong);codes.set(wrongValue.authorizationCode,await signed(wrong.nonce,'different-subject'));await assert.rejects(exchangeAppleChatAuth(wrongValue,dependencies));
  const expired=await challenge();await pool.execute('UPDATE chat_apple_auth SET expires_at=DATE_SUB(NOW(),INTERVAL 1 MINUTE) WHERE challenge_id=?',[expired.challengeId]);await assert.rejects(exchangeAppleChatAuth(await input(expired),dependencies));
  const p=await challenge(),racing=await input(p);const race=await Promise.allSettled([exchangeAppleChatAuth(racing,dependencies),exchangeAppleChatAuth(racing,dependencies)]);assert.equal(race.filter(r=>r.status==='fulfilled').length,1,'Exactly one concurrent redemption can succeed');
  const eventId='test-event-'+Date.now(),event={type:'consent-revoked',sub:subject,event_time:Math.floor(Date.now()/1000)+1};events.push(appleHash(eventId));
  const notification=await new SignJWT({jti:eventId,events:JSON.stringify(event)}).setProtectedHeader({alg:'RS256',kid:'test'}).setIssuer('https://appleid.apple.com').setAudience(APPLE_CLIENT_ID).setIssuedAt().sign(pair.privateKey);
  await handleAppleNotification(request,{payload:notification},token=>verifyAppleNotification(token,keys));await handleAppleNotification(request,{payload:notification},token=>verifyAppleNotification(token,keys));
  const [sessions]=await pool.execute<RowDataPacket[]>('SELECT token_hash FROM chat_sessions WHERE user_id=?',[result.user!.id]);assert.equal(sessions.length,0,'Revoking Apple consent invalidates every existing session');
  const [revoked]=await pool.execute<RowDataPacket[]>('SELECT revoked_at,encrypted_refresh_token FROM chat_apple_accounts WHERE apple_subject=?',[subject]);assert(revoked[0].revoked_at);assert.equal(revoked[0].encrypted_refresh_token,null);
  console.log('Apple chat database: guest-independent sign-in, wrong client secret, one-use nonce, repeat identity/name, encrypted grants, expired challenge, concurrent replay and idempotent revocation passed.');
 }finally{
  for(const id of challenges)await pool.execute('DELETE FROM chat_apple_auth WHERE challenge_id=?',[id]);
  for(const id of events)await pool.execute('DELETE FROM chat_apple_events WHERE event_hash=?',[id]);
  for(const id of users){await pool.execute('DELETE FROM chat_sessions WHERE user_id=?',[id]);await pool.execute('DELETE FROM chat_users WHERE id=?',[id]);}
  await pool.end();
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
