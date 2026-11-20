import './load-env';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {getPool} from '../src/lib/db';
import {config} from '../src/lib/config';
import type {RowDataPacket} from 'mysql2';

async function main(){
  assert(config.dbName==='uletay_web_design'&&String(config.dbPort)==='3352','Only the isolated local preview database is permitted');
  const phase=process.argv.includes('--cold')?'cold':process.argv.includes('--background')?'background':'foreground';
  const output=path.resolve(__dirname,'../../artifacts/emulator-2026-11-20');await mkdir(output,{recursive:true});
  const headers:Record<string,string>={Accept:'application/json','Content-Type':'application/json'};
  if(config.expoPushAccessToken)headers.Authorization=`Bearer ${config.expoPushAccessToken}`;
  const pool=getPool();
  try{
    if(process.argv.includes('--receipts')){
      const file=path.join(output,`push-${phase}.json`);const sent=JSON.parse(await readFile(file,'utf8'));assert(sent.ticketId);
      const response=await fetch('https://exp.host/--/api/v2/push/getReceipts',{method:'POST',headers,body:JSON.stringify({ids:[sent.ticketId]}),signal:AbortSignal.timeout(15000)});assert.equal(response.status,200);
      const result=await response.json();const receipt=result.data?.[sent.ticketId];sent.receiptStatus=receipt?.status||'pending';sent.receiptError=receipt?.details?.error||null;
      await writeFile(file,JSON.stringify(sent,null,2)+'\n');console.log(JSON.stringify({phase,receiptStatus:sent.receiptStatus,receiptError:sent.receiptError}));return;
    }
    const [rows]=await pool.query<RowDataPacket[]>("SELECT id,expo_token FROM push_subscriptions WHERE active=TRUE AND platform='android' AND expo_token IS NOT NULL");
    if(!process.argv.includes('--send')){console.log(JSON.stringify({activeAndroidDevices:rows.length,...(rows.length===1?{deviceTokenHash:createHash('sha256').update(rows[0].expo_token).digest('hex')}:{} )}));return;}
    assert.equal(rows.length,1,'Exactly one Android subscriber must be present before a test push');
    const expected=process.argv.find(arg=>arg.startsWith('--device-hash='))?.slice('--device-hash='.length);assert(expected,'An explicitly observed device hash is required');
    const row=rows[0],token=String(row.expo_token),hash=createHash('sha256').update(token).digest('hex');assert.equal(hash,expected,'The selected test device changed');assert(/^(?:Exponent|Expo)PushToken\[.+\]$/.test(token));
    const body=phase==='foreground'?'Тест на открытом приложении. Открой карточку Мельницы.':phase==='cold'?'Тест после закрытия. Нажми, чтобы открыть Мельницу.':'Тест в фоне. Нажми, чтобы открыть Мельницу.';
    const payload={to:token,title:'Улетай · проверка пуша',body,sound:'default',priority:'high',channelId:'broadcasts',data:{url:'/headliners/hl-мельница'}};
    const response=await fetch('https://exp.host/--/api/v2/push/send',{method:'POST',headers,body:JSON.stringify([payload]),signal:AbortSignal.timeout(15000)});assert.equal(response.status,200);
    const result=await response.json(),ticket=result.data?.[0];
    const report={phase,deviceTokenHash:hash,sentAt:new Date().toISOString(),targetPath:payload.data.url,ticketStatus:ticket?.status||'error',ticketId:ticket?.id||null,error:ticket?.details?.error||result.errors?.[0]?.code||null};
    await writeFile(path.join(output,`push-${phase}.json`),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));assert.equal(ticket?.status,'ok','The push provider did not accept this test');
  }finally{await pool.end();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
