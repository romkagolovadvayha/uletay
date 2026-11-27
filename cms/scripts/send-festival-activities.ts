import './load-env';
import { getPool } from '../src/lib/db';
import { sendFestivalActivityUpdates } from '../src/lib/festival-activities';

async function main() {
  try {
    const result = await sendFestivalActivityUpdates();
    console.log(JSON.stringify({ at: new Date().toISOString(), ...result }));
    if (result.failed) process.exitCode = 1;
  } finally { await getPool().end(); }
}
void main().catch(() => { console.error('Live Activity worker failed; check database and APNs configuration'); process.exitCode = 1; });
