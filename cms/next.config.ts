import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  // ESLint runs once from the repository root (`npm run lint`) with the Expo
  // and Next.js rule sets. Avoid Next.js 15 running a second, partial lint pass
  // that cannot reliably discover the root flat config in this nested app.
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Next.js 15 writes both `next dev` and `next build` into `.next`.
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
