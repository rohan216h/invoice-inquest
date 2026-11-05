import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Server external packages that should not be bundled
  serverExternalPackages: ['pdf-parse', 'sharp'],
  turbopack: {},
};

export default nextConfig;
