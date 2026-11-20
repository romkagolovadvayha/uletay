import {readFile} from 'node:fs/promises';
import {createPrivateKey,sign} from 'node:crypto';
import {spawnSync} from 'node:child_process';

// Credentials stay in memory. Never print API headers, JWTs or key files.
export function githubToken() {
  if(process.env.GITHUB_TOKEN)return process.env.GITHUB_TOKEN;
  const result=spawnSync('git',['credential','fill'],{input:'protocol=https\nhost=github.com\n\n',encoding:'utf8',env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'Never'}});
  const token=result.stdout?.split(/\r?\n/).find(line=>line.startsWith('password='))?.slice(9);
  if(result.status!==0||!token)throw Error('GitHub credential unavailable');
  return token;
}
export async function github(path,options={}) {
  const response=await fetch(`https://api.github.com${path}`,{...options,headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',Authorization:`Bearer ${githubToken()}`,...options.headers}});
  const result=response.status===204?null:await response.json();
  if(!response.ok)throw Error(`GitHub ${response.status}: ${result?.message||'request failed'}`);
  return result;
}
let googleToken;
export async function play(path,options={}) {
  if(!googleToken){
    const key=JSON.parse(await readFile(new URL('../google-service-account.json',import.meta.url),'utf8'));
    const now=Math.floor(Date.now()/1000),encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
    const unsigned=`${encode({alg:'RS256',typ:'JWT'})}.${encode({iss:key.client_email,scope:'https://www.googleapis.com/auth/androidpublisher',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600})}`;
    const assertion=`${unsigned}.${sign('RSA-SHA256',Buffer.from(unsigned),createPrivateKey(key.private_key)).toString('base64url')}`;
    const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})});
    const result=await response.json();if(!response.ok||!result.access_token)throw Error(`Google authorization failed (${response.status})`);googleToken=result.access_token;
  }
  const origin=options.upload?'https://androidpublisher.googleapis.com/upload/androidpublisher/v3':'https://androidpublisher.googleapis.com/androidpublisher/v3';
  const {upload:ignored,raw,...request}=options;
  const response=await fetch(`${origin}/applications/ru.uletay.app${path}`,{...request,headers:{Authorization:`Bearer ${googleToken}`,...request.headers}});
  if(raw&&response.ok)return response;
  const result=response.status===204?null:await response.json();
  if(!response.ok)throw Error(`Google Play ${response.status}: ${result?.error?.message||'request failed'}`);
  return result;
}
