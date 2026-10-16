import path from 'node:path';
import { loadEnvConfig } from '@next/env';

// CLI commands use the same environment precedence as the Next.js server.
loadEnvConfig(path.resolve(__dirname, '..'), process.env.NODE_ENV !== 'production');
