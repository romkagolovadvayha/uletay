import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

if (process.env.ULETAY_LIVE_ACTIVITY_QA === '1') {
  if (process.platform !== 'darwin') throw Error('Swift verification requires the macOS QA worker');
  const output = path.resolve('artifacts/live-activity-qa'); mkdirSync(output, { recursive: true });
  const executable = path.join(output, 'protocol-checks');
  const compiled = spawnSync('swiftc', ['modules/festival-activity/ios/FestivalActivityContentState.swift', 'scripts/festival-activity-protocol-checks.swift', '-o', executable], { encoding: 'utf8' });
  writeFileSync(path.join(output, 'swift-compile.log'), (compiled.stdout || '') + (compiled.stderr || ''));
  if (compiled.status !== 0) throw Error('Swift ActivityKit payload verification did not compile');
  const checked = spawnSync(executable, [], { encoding: 'utf8' });
  writeFileSync(path.join(output, 'protocol-checks.log'), (checked.stdout || '') + (checked.stderr || ''));
  if (checked.status !== 0) throw Error('Swift ActivityKit wire protocol verification failed');
  console.log(checked.stdout);
}
const qa = spawnSync(process.execPath, ['scripts/ios-store-qa.mjs'], { stdio: 'inherit' });
process.exitCode = qa.status ?? 1;
