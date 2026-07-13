import net from 'node:net';
import { loadDbEnv } from './load-db-env.mjs';
import { lastFmFetch, maskProxyUrl, resolveLastFmProxyUrl } from '../src/lib/lastfm-fetch';
import { verifyLastFmApiKey } from '../src/lib/lastfm';

function probeProxyTcp(proxyUrl: string, timeoutMs = 10_000): Promise<void> {
  const parsed = new URL(proxyUrl);
  const host = parsed.hostname;
  const port = Number(parsed.port || (parsed.protocol === 'https:' ? 443 : 80));

  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port });
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error(`TCP connect to proxy ${host}:${port} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    socket.once('connect', () => {
      clearTimeout(timer);
      socket.end();
      resolve();
    });

    socket.once('error', (error) => {
      clearTimeout(timer);
      reject(new Error(`TCP connect to proxy ${host}:${port} failed: ${error.message}`));
    });
  });
}

async function main() {
  loadDbEnv();
  const proxy = resolveLastFmProxyUrl();
  const apiKey = process.env.LASTFM_API_KEY?.trim();

  console.log('Proxy:', proxy ? maskProxyUrl(proxy) : '(none)');
  if (!apiKey) {
    throw new Error('LASTFM_API_KEY is not set in cms/.env');
  }

  if (proxy) {
    console.log('Probing proxy TCP...');
    const started = Date.now();
    await probeProxyTcp(proxy);
    console.log(`Proxy TCP OK (${Date.now() - started}ms)`);
  }

  console.log('Verifying Last.fm API...');
  const started = Date.now();
  await verifyLastFmApiKey();
  console.log(`OK: Last.fm API reachable (${Date.now() - started}ms)`);

  const sampleUrl =
    `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=DDT&api_key=${apiKey}&format=json`;
  console.log('Direct fetch smoke test...');
  const response = await lastFmFetch(sampleUrl);
  console.log(`HTTP ${response.status}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
