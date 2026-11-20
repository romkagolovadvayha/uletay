import {readFile,writeFile,mkdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

// Credentials stay in this process; no token is printed, put in an argument, or written.
const config=await readFile(path.join(os.homedir(),'.config/yandex-cloud/config.yaml'),'utf8');
const oauth=config.match(/^\s+token:\s*['"]?([^\s'"]+)/m)?.[1];
const folderId=config.match(/^\s+folder-id:\s*([^\s]+)/m)?.[1];
if(!folderId)throw Error('The current Yandex Cloud profile needs folder-id');
let iamToken;
if(oauth){
  const auth=await fetch('https://iam.api.cloud.yandex.net/iam/v1/tokens',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({yandexPassportOauthToken:oauth})});
  if(!auth.ok)throw Error(`Yandex Cloud sign-in failed: HTTP ${auth.status}`);
  iamToken=(await auth.json()).iamToken;
}else{
  const executable=process.env.YC_BIN||new URL('../tmp/yc.exe',import.meta.url);
  try{iamToken=execFileSync(executable instanceof URL?executable.pathname.replace(/^\//,''):executable,['iam','create-token'],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:60_000}).trim();}catch{throw Error('Refresh Yandex Cloud CLI authentication before provisioning');}
}
if(!iamToken)throw Error('Sign in with Yandex Cloud CLI first');
const base='https://serverless-apigateway.api.cloud.yandex.net/apigateways/v1/apigateways';
async function call(url,init={}){const response=await fetch(url,{...init,headers:{'Content-Type':'application/json',Authorization:`Bearer ${iamToken}`},signal:AbortSignal.timeout(30_000)});if(!response.ok)throw Error(`Yandex Cloud API: HTTP ${response.status}`);return response.json();}
const listed=await call(`${base}?folderId=${folderId}`);
const existing=listed.apiGateways?.find(gateway=>gateway.name==='uletay-api-fallback');
if(!process.argv.includes('--apply')){console.log(JSON.stringify({gateways:listed.apiGateways?.map(({id,name,domain,status})=>({id,name,domain,status}))||[]},null,2));process.exit(0);}
let gateway=existing;
if(!gateway){
  const openapiSpec=await readFile(new URL('../deploy/yandex-api-gateway.yaml',import.meta.url),'utf8');
  const operation=await call(base,{method:'POST',body:JSON.stringify({folderId,name:'uletay-api-fallback',description:'Uletay public API fallback; bearer visitor sessions, no admin cookies',openapiSpec,logOptions:{disabled:true},executionTimeout:'25s'})});
  console.log(JSON.stringify({operationId:operation.id,stage:'creating'}));
  for(let i=0;i<30;i++){
    const state=await call(`https://operation.api.cloud.yandex.net/operations/${operation.id}`);
    if(state.done){if(state.error)throw Error(`Gateway creation failed: code ${state.error.code}`);gateway=state.response;break;}
    await new Promise(resolve=>setTimeout(resolve,1000));
  }
}
if(!gateway?.id)throw Error('Gateway creation is still pending; inspect operation before retrying');
gateway=await call(`${base}/${gateway.id}`);
const record={id:gateway.id,name:gateway.name,domain:gateway.domain,status:gateway.status,apiBaseUrl:`https://${gateway.domain}/api`,checkedAt:new Date().toISOString()};
await mkdir(new URL('../artifacts/api-gateway-2026-11-20/',import.meta.url),{recursive:true});
await writeFile(new URL('../artifacts/api-gateway-2026-11-20/gateway.json',import.meta.url),JSON.stringify(record,null,2));
console.log(JSON.stringify(record,null,2));
