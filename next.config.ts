// next.config.ts
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Enable standalone output for Firebase App Hosting
  output: 'standalone',
  // Ensure experimental features are compatible
  experimental: {
    // Remove any experimental features that might conflict
  },
  // Add trailingSlash for better compatibility
  trailingSlash: false,
  // Ensure static generation works properly
  generateBuildId: async () => {
    return 'build-' + Date.now().toString();
  },
};

export default nextConfig;