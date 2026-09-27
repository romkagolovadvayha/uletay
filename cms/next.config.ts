import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  // Keep generated agent guidance at the repository root, where project rules live.
  agentRules: false,
  // Keep development artifacts separate so a production build cannot corrupt
  // a running local API server (and vice versa).
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  output: 'standalone',
  // The CMS shares validation and radio contracts with the Expo application.
  turbopack: { root: process.env.NODE_ENV === 'development' ? path.join(__dirname, '..') : __dirname },
  outputFileTracingRoot: process.env.NODE_ENV === 'development' ? path.join(__dirname, '..') : __dirname,
  outputFileTracingIncludes: {
    '/admin': ['./data/**/*'],
  },
  serverExternalPackages: ['sharp'],
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
};

export default nextConfig;
