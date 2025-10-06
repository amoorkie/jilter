/** @type {import('next').NextConfig} */
const nextConfig = {
  // Включаем экспериментальные функции
  experimental: {
    // Включаем server actions
    serverActions: true,
  },
  
  // Настройки для production
  output: 'standalone',
  
  // Настройки для статических файлов
  trailingSlash: false,
  
  // Настройки для API routes
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
  
  // Настройки для изображений
  images: {
    domains: ['hh.ru', 'career.habr.com', 'geekjob.ru', 'getmatch.ru'],
    unoptimized: true,
  },
  
  // Настройки для webpack
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  
  // Настройки для TypeScript
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Настройки для ESLint
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // Настройки для production
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Настройки для headers
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
  
  // Настройки для redirects
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/admin/login',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;

