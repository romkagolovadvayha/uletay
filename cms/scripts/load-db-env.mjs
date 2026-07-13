import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFile(envPath) {
  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      continue;
    }

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function loadDbEnv() {
  loadEnvFile(path.join(__dirname, '..', '.env'));
}

export function getDbConfig() {
  loadDbEnv();
  const port = Number(process.env.DB_PORT);
  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number.isFinite(port) && port > 0 ? port : 3306,
    database: process.env.DB_NAME || 'uletay',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
  };
}
