import { loadDbEnv } from './load-db-env.mjs';
import { maskProxyUrl, resolveLastFmProxyUrl } from '../src/lib/lastfm-fetch';
import { verifyLastFmApiKey } from '../src/lib/lastfm';

async function main() {
  loadDbEnv();
  const proxy = resolveLastFmProxyUrl();
  console.log('Proxy:', proxy ? maskProxyUrl(proxy) : '(none)');
  console.log('Verifying Last.fm API...');
  await verifyLastFmApiKey();
  console.log('OK: Last.fm API reachable via configured transport');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
