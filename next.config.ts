// next.config.ts
import type {NextConfig} from 'next';
const nextConfig: NextConfig = {
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
  output: 'standalone',
  experimental: {},
  trailingSlash: false,
  generateBuildId: async () => {
    return 'build-' + Date.now().toString();
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'quoteflow-app--goodyard-qouteflow.us-central1.hosted.app',
          },
        ],
        destination: 'https://rfq.apperanz.com/:path*',
        permanent: true, // 301 永久重定向
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive, nosnippet',
          },
        ],
      },
    ];
  },
};
export default nextConfig;