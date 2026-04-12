/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-cache',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        },
      },
    },
  ],
});

const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  // Next.js 16 uses Turbopack by default in dev; silence the webpack-config warning
  // since next-pwa is disabled in development anyway.
  turbopack: {
    root: __dirname,
  },
  webpack: (config, { isServer }) => {
    // Ensure protobufjs is bundled in the main chunk to avoid dynamic import issues
    if (!isServer) {
      config.optimization = config.optimization || {};
      config.optimization.splitChunks = config.optimization.splitChunks || {};
      config.optimization.splitChunks.cacheGroups = config.optimization.splitChunks.cacheGroups || {};
      
      // Bundle protobufjs in the main chunk instead of lazy loading
      config.optimization.splitChunks.cacheGroups.protobuf = {
        test: /[\\/]node_modules[\\/]protobufjs[\\/]/,
        name: 'protobuf',
        chunks: 'all',
        priority: 10,
      };
    }
    
    return config;
  },
};

module.exports = withPWA(nextConfig);
