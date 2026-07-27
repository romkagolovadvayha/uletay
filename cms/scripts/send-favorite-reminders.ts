import { sendDueFavoriteReminders } from '../src/lib/favorite-reminders';
import { getPool } from '../src/lib/db';

async function main() {
  try {
    const result = await sendDueFavoriteReminders();
    console.log(JSON.stringify({ at: new Date().toISOString(), ...result }));
    if (result.failed > 0) {
      process.exitCode = 1;
    }
  } finally {
    await getPool().end();
  }
}

main().catch((error) => {
  console.error('Favorite reminder run failed:', error);
  process.exit(1);
});
