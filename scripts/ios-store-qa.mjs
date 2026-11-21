import {spawnSync} from 'node:child_process';
import {mkdir,writeFile,readdir} from 'node:fs/promises';
import path from 'node:path';

// An explicit QA build only. Ordinary production builds never boot a simulator.
if(process.env.ULETAY_IOS_STORE_QA!=='1')process.exit(0);
if(process.platform!=='darwin')throw Error('iOS store QA requires a macOS build worker');
const root=path.resolve('artifacts/ios-store-qa');
await mkdir(root,{recursive:true});
function run(command,args,options={}){
  const result=spawnSync(command,args,{encoding:'utf8',maxBuffer:24*1024*1024,...options});
  if(result.status!==0)throw Error(`${command} failed: ${result.stderr||result.stdout}`);
  return result.stdout;
}
// Test this build's own binary, including its current JS bundle and assets.
const products=path.resolve('ios/build/Build/Products');
const apps=[];
for(const directory of await readdir(products)){
 if(!directory.endsWith('-iphonesimulator'))continue;
 for(const file of await readdir(path.join(products,directory))){
  if(file.endsWith('.app'))apps.push(path.join(products,directory,file));
 }
}
if(apps.length!==1)throw Error(`Expected one freshly built simulator application, found ${apps.length}`);
const appPath=apps[0];
const bundle=run('/usr/libexec/PlistBuddy',['-c','Print :CFBundleIdentifier',path.join(appPath,'Info.plist')]).trim();
if(bundle!=='ru.uletay.app')throw Error('Unexpected simulator application');
await writeFile(path.join(root,'tested-build.json'),JSON.stringify({bundle,version:run('/usr/libexec/PlistBuddy',['-c','Print :CFBundleShortVersionString',path.join(appPath,'Info.plist')]).trim(),build:run('/usr/libexec/PlistBuddy',['-c','Print :CFBundleVersion',path.join(appPath,'Info.plist')]).trim(),commit:process.env.EAS_BUILD_GIT_COMMIT_HASH},null,2));
const devices=JSON.parse(run('xcrun',['simctl','list','devices','available','-j']));
await writeFile(path.join(root,'available-devices.json'),JSON.stringify(devices,null,2));
const available=Object.entries(devices.devices).filter(([runtime])=>runtime.includes('iOS-26')).flatMap(([,values])=>values);
const selected=[available.find(d=>d.name==='iPhone 17 Pro Max')||available.find(d=>/iPhone.*(Pro Max|Plus)/.test(d.name)),available.find(d=>/iPad Pro 13-inch/.test(d.name))];
if(selected.some(d=>!d))throw Error('Required iPhone/iPad simulators unavailable; see device inventory');
let failures=0;
for(const device of selected){
 const out=path.join(root,device.name.replaceAll(/[^a-zA-Z0-9-]/g,'_'));await mkdir(out,{recursive:true});
 if(device.state!=='Booted')run('xcrun',['simctl','boot',device.udid]);
 run('xcrun',['simctl','bootstatus',device.udid,'-b']);
 run('xcrun',['simctl','status_bar',device.udid,'override','--time','9:41','--dataNetwork','wifi','--wifiMode','active','--wifiBars','3','--batteryState','charged','--batteryLevel','100']);
 run('xcrun',['simctl','install',device.udid,appPath]);
 const result=spawnSync('maestro',['--device',device.udid,'test','--format','junit','--output',path.join(out,'report.xml'),'--test-output-dir',out,'.maestro/store'],{encoding:'utf8',timeout:18*60*1000,maxBuffer:24*1024*1024});
 await writeFile(path.join(out,'maestro.log'),(result.stdout||'')+'\n'+(result.stderr||''));
 console.log(`${device.name}: ${result.status===0?'PASS':'FAIL'}`);
 if(result.status!==0)failures++;
 run('xcrun',['simctl','shutdown',device.udid]);
}
// Keep only QA reports and screenshots in the extra artifact, not another app copy.
// The build archive itself is already retained separately by EAS.
run('tar',['-czf',path.resolve('artifacts/ios-store-qa-results.tar.gz'),'-C',root,...(await readdir(root)).filter(name=>!['app','simulator-app.tar.gz'].includes(name))]);
if(failures)throw Error(`${failures} native iOS QA flow(s) failed; inspect the QA artifact`);
