/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cam1.yashpatelis.online',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.yashpatelis.online',
        pathname: '/**',
      },
    ],
  },
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/*'],
  },
  headers: async () => [
    {
      // Allow iframe embedding and media from go2rtc server
      source: '/:path*',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "frame-ancestors 'self' https://cam1.yashpatelis.online https://*.yashpatelis.online",
            "frame-src 'self' https://cam1.yashpatelis.online https://*.yashpatelis.online wss://cam1.yashpatelis.online blob:",
            "connect-src 'self' https://cam1.yashpatelis.online https://*.yashpatelis.online wss://cam1.yashpatelis.online ws://localhost:* http://localhost:*",
            "media-src 'self' https://cam1.yashpatelis.online https://*.yashpatelis.online blob: data:",
            "img-src 'self' https://cam1.yashpatelis.online https://*.yashpatelis.online blob: data:",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "worker-src 'self' blob:",
          ].join('; '),
        },
      ],
    },
    {
      source: '/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
      has: [
        {
          type: 'query',
          key: '_next',
        },
      ],
    },
  ],
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  webpack: (config, { isServer }) => {
      if (!config.optimization.splitChunks) {
        config.optimization.splitChunks = {};
      }
      if (!config.optimization.splitChunks.cacheGroups) {
        config.optimization.splitChunks.cacheGroups = {};
      }
    config.optimization.splitChunks.cacheGroups = {
      ...config.optimization.splitChunks.cacheGroups,
      radix: {
        test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
        name: 'radix-ui',
        priority: 100,
      },
      lucide: {
        test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
        name: 'lucide',
        priority: 100,
      },
    }
    return config
  },
}

export default nextConfig