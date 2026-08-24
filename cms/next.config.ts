import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  // Keep generated agent guidance at the repository root, where project rules live.
  agentRules: false,
  // Keep development artifacts separate so a production build cannot corrupt
  // a running local API server (and vice versa).
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname),
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
