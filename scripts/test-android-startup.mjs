import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const args = process.argv.slice(2);
function option(name, fallback) {
  const index = args.indexOf(`--${name}`);
  if (index < 0) return fallback;
  assert(args[index + 1] && !args[index + 1].startsWith('--'), `Missing --${name} value`);
  return args[index + 1];
}

const serial = option('serial');
assert(serial, 'Specify the test device: --serial emulator-5580');
const packageName = 'ru.uletay.app';
const apk = option('apk');
// Some animated home screens never satisfy UI Automator's fixed idle timeout.
// This mode verifies process survival and foreground focus, and produces a
// screenshot that MUST be reviewed separately before accepting a release.
const visualReview = args.includes('--visual-review');
const outputDir = path.resolve(option('out', 'tmp/android-startup'));
const sdkRoot = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT ||
  (process.platform === 'win32' && process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk')
    : null);
const adbPath = option('adb', sdkRoot
  ? path.join(sdkRoot, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb')
  : 'adb');

async function adb(...command) {
  const result = await exec(adbPath, ['-s', serial, ...command], {
    encoding: 'utf8', timeout: 60_000, maxBuffer: 10 * 1024 * 1024, windowsHide: true,
  });
  return result.stdout.trim();
}

await mkdir(outputDir, { recursive: true });
assert.equal(await adb('get-state'), 'device', 'Device must be online and authorized');
if (apk) {
  console.log(await adb('install', '-r', path.resolve(apk)));
}

const report = {
  serial, packageName, apk: apk ? path.resolve(apk) : null,
  android: await adb('shell', 'getprop', 'ro.build.version.release'),
  sdk: await adb('shell', 'getprop', 'ro.build.version.sdk'),
  startedAt: new Date().toISOString(), passed: false,
  visualReviewRequired: visualReview,
};
const packageInfo = await adb('shell', 'dumpsys', 'package', packageName);
report.versionName = packageInfo.match(/versionName=(\S+)/)?.[1];
report.versionCode = packageInfo.match(/versionCode=(\d+)/)?.[1];
assert(report.versionName, `${packageName} is not installed`);

await adb('shell', 'am', 'force-stop', packageName);
await adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP');
await adb('shell', 'wm', 'dismiss-keyguard');
// Stream fresh errors without clearing the device's existing log buffers.
let errors = '';
const logger = spawn(adbPath, [
  '-s', serial, 'logcat', '-v', 'threadtime', '-T', '1',
  'AndroidRuntime:E', 'ReactNativeJS:E', 'libc:F', 'DEBUG:F', '*:S',
], { windowsHide: true });
logger.stdout.on('data', (chunk) => { errors += chunk; });
logger.stderr.on('data', (chunk) => { errors += chunk; });
logger.on('error', (error) => { errors += error.message; });

try {
  const launch = await adb('shell', 'am', 'start', '-W', '-n', `${packageName}/.MainActivity`);
  await writeFile(path.join(outputDir, 'launch.txt'), launch);
  assert.match(launch, /Status: ok/, 'Android did not start the activity');
  // A successful am start alone misses fatal JS errors after the splash screen.
  await delay(15_000);
  const pid = await adb('shell', 'pidof', packageName).catch(() => '');
  assert(pid, `App exited after startup. ${errors.match(/JavascriptException:.*|FATAL EXCEPTION:.*/)?.[0] || 'See logcat.txt'}`);
  report.pid = pid;

  const hierarchyPath = `/sdcard/uletay-startup-${Date.now()}.xml`;
  let hierarchy = '';
  const dumps = [];
  // The animated hero can briefly prevent UI Automator from reaching idle.
  for (let attempt = 0; !visualReview && attempt < 3; attempt += 1) {
    dumps.push(await adb('shell', 'uiautomator', 'dump', '--compressed', hierarchyPath));
    hierarchy = await adb('shell', 'cat', hierarchyPath).catch(() => '');
    if (/Главная|Домой/.test(hierarchy) && hierarchy.includes(`package="${packageName}"`)) break;
    await delay(1_000);
  }
  await writeFile(path.join(outputDir, 'ui-dump.txt'), dumps.join('\n'));
  await writeFile(path.join(outputDir, 'hierarchy.xml'), hierarchy);
  await adb('shell', 'rm', '-f', hierarchyPath);
  if (visualReview) {
    const windows = await adb('shell', 'dumpsys', 'window');
    await writeFile(path.join(outputDir, 'window-focus.txt'), windows);
    assert(windows.split('\n').some((line) => line.includes('mCurrentFocus=') && line.includes(`${packageName}/`)), 'App does not have foreground focus');
  } else {
    assert(hierarchy, 'UI Automator returned no hierarchy. For an animated screen, use --visual-review and review the captured screenshot separately.');
    assert(hierarchy.includes(`package="${packageName}"`), 'App is not visible');
    assert(/Главная|Домой/.test(hierarchy), 'Home navigation did not render after the splash screen');
  }
  assert(!errors.includes(`Process: ${packageName}`), 'Android reported an app crash; see logcat.txt');
  assert.equal(await adb('shell', 'pidof', packageName), pid, 'App process restarted during the test');

  const screenshot = await exec(adbPath, ['-s', serial, 'exec-out', 'screencap', '-p'], {
    encoding: 'buffer', timeout: 30_000, maxBuffer: 10 * 1024 * 1024, windowsHide: true,
  });
  await writeFile(path.join(outputDir, 'home.png'), screenshot.stdout);
  report.passed = true;
  console.log(`PASS: ${packageName} ${report.versionName} (${report.versionCode}), Android ${report.android}: ${visualReview ? 'foreground process survived; manual home screenshot review REQUIRED' : 'home rendered and process survived'}.`);
} catch (error) {
  report.error = error instanceof Error ? error.message : String(error);
  console.error(`FAIL: ${report.error}`);
  process.exitCode = 1;
} finally {
  logger.kill();
  await writeFile(path.join(outputDir, 'logcat.txt'), errors);
  await writeFile(path.join(outputDir, 'result.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`Evidence: ${outputDir}`);
}
