import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';

const argument=name=>process.argv.find(value=>value.startsWith(`${name}=`))?.slice(name.length+1);
const apk=argument('--apk');
const aapt=argument('--aapt');
assert(apk&&aapt,'Provide --apk=path and --aapt=path');
const app=JSON.parse(await readFile(new URL('../app.json',import.meta.url),'utf8')).expo;
const run=command=>execFileSync(path.resolve(aapt),['dump',command,path.resolve(apk)],{encoding:'utf8'});
const badging=run('badging'),permissions=run('permissions');
assert(badging.includes(`name='${app.android.package}'`),'Wrong Android package');
assert(badging.includes(`versionCode='${app.android.versionCode}'`),'Stale version code');
assert(badging.includes(`versionName='${app.version}'`),'Stale version name');
for(const permission of app.android.blockedPermissions||[])assert(!permissions.includes(`name='${permission}'`),`Blocked permission still packaged: ${permission}`);
const abis=badging.match(/^native-code: (.+)$/m)?.[1];
assert(abis?.includes("'arm64-v8a'"),'Release is missing arm64');
console.log(JSON.stringify({package:app.android.package,version:app.version,versionCode:app.android.versionCode,blockedPermissionsAbsent:true,abis}));
