import {createPrivateKey} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

// Called after compilation, immediately before the private SSH release transfer.
// The files are never part of the client bundle or a persisted CI artifact.
export async function prepareAppleServerCredentials(cmsRoot,value){
  if(!value)return {configured:false};
  const config=JSON.parse(value);
  if(config.clientId!=='ru.uletay.app'||!/^[A-Z0-9]{10}$/.test(config.teamId)||!/^[A-Z0-9]{10}$/.test(config.keyId)||typeof config.privateKey!=='string')throw Error('Invalid Apple server configuration');
  const key=createPrivateKey(config.privateKey);
  if(key.asymmetricKeyType!=='ec'||key.asymmetricKeyDetails?.namedCurve!=='prime256v1')throw Error('Expected an Apple ES256 key');
  const privateDirectory=path.resolve(cmsRoot,'.private');
  await mkdir(privateDirectory,{recursive:true,mode:0o700});
  await writeFile(path.join(privateDirectory,'apple-sign-in.p8'),config.privateKey,{mode:0o600});
  await writeFile(path.join(privateDirectory,'apple-sign-in.json'),JSON.stringify({clientId:config.clientId,teamId:config.teamId,keyId:config.keyId,privateKeyPath:path.join('.private','apple-sign-in.p8')}),{mode:0o600});
  return {configured:true};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const result=await prepareAppleServerCredentials(path.resolve('cms'),process.env.APPLE_SIGN_IN_SERVER_CONFIG);
  console.log(result.configured?'Apple server credentials prepared for private release transfer.':'Apple server credentials not configured.');
}
