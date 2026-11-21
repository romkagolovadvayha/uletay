import assert from 'node:assert/strict';
import {generateKeyPair,exportJWK,createLocalJWKSet,SignJWT} from 'jose';
import {APPLE_CLIENT_ID,appleHash,appleSecretMatches,verifyAppleIdentityToken,verifyAppleNotification,encryptAppleRefreshToken,decryptAppleRefreshToken} from '../src/lib/apple-auth';
async function main(){
 const pair=await generateKeyPair('RS256',{extractable:true}),keys=createLocalJWKSet({keys:[{...await exportJWK(pair.publicKey),kid:'test-key',alg:'RS256'}]});
 const signed=(claims:Record<string,unknown>,aud=APPLE_CLIENT_ID,iss='https://appleid.apple.com',expiry='5m')=>new SignJWT(claims).setProtectedHeader({alg:'RS256',kid:'test-key'}).setIssuer(iss).setAudience(aud).setIssuedAt().setExpirationTime(expiry).sign(pair.privateKey);
 const nonce='unpredictable-server-nonce',hash=appleHash(nonce),claims={sub:'test-apple-subject',nonce};
 const valid=await verifyAppleIdentityToken(await signed(claims),hash,keys);assert.equal(valid.subject,claims.sub);assert(Math.abs(valid.issuedAt-Date.now()/1000)<5);
 for(const token of [await signed(claims,'another.app'),await signed(claims,APPLE_CLIENT_ID,'https://evil.example'),await signed({...claims,nonce:'wrong'}),await signed({sub:'test-apple-subject'}),await signed({...claims,sub:''}),await signed(claims,APPLE_CLIENT_ID,'https://appleid.apple.com','-30s')])await assert.rejects(verifyAppleIdentityToken(token,hash,keys));
 const other=await generateKeyPair('RS256');const forged=await new SignJWT(claims).setProtectedHeader({alg:'RS256',kid:'test-key'}).setIssuer('https://appleid.apple.com').setAudience(APPLE_CLIENT_ID).setIssuedAt().setExpirationTime('5m').sign(other.privateKey);await assert.rejects(verifyAppleIdentityToken(forged,hash,keys));
 assert(!appleSecretMatches(nonce,'short'));assert(!appleSecretMatches(nonce,appleHash('different')));
 const first=encryptAppleRefreshToken('private-refresh'),second=encryptAppleRefreshToken('private-refresh');assert.notEqual(first,second);assert(!first.includes('private-refresh'));assert.equal(decryptAppleRefreshToken(first),'private-refresh');const tampered=first.split('.');tampered[3]=Buffer.from('tampered').toString('base64url');assert.throws(()=>decryptAppleRefreshToken(tampered.join('.')));
 for(const type of ['consent-revoked','account-deleted','email-disabled','email-enabled']){
  const event={type,sub:'test-apple-subject',event_time:Math.floor(Date.now()/1000),email:'not-stored@example.com'};
  const token=await new SignJWT({jti:'event-'+type,events:JSON.stringify(event)}).setProtectedHeader({alg:'RS256',kid:'test-key'}).setIssuer('https://appleid.apple.com').setAudience(APPLE_CLIENT_ID).setIssuedAt().sign(pair.privateKey);
  const parsed=await verifyAppleNotification(token,keys);assert.equal(parsed.subject,event.sub);assert.equal(parsed.type,type);assert(!('email' in parsed));
 }
 await assert.rejects(verifyAppleNotification(await signed({jti:'bad',events:{type:'consent-revoked',sub:'x',event_time:Date.now()/1000+1000}}),keys));
 console.log('Apple authentication: signature, audience, issuer, expiry, nonce, missing claims, encrypted grants and signed revocation notifications passed.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
