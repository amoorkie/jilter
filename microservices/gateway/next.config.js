/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    ADMIN_SERVICE_URL: process.env.ADMIN_SERVICE_URL || 'http://localhost:3001',
    PARSER_SERVICE_URL: process.env.PARSER_SERVICE_URL || 'http://localhost:8080',
    DATABASE_SERVICE_URL: process.env.DATABASE_SERVICE_URL || 'http://localhost:8081',
    QUEUE_SERVICE_URL: process.env.QUEUE_SERVICE_URL || 'http://localhost:8082',
    SEARCH_SERVICE_URL: process.env.SEARCH_SERVICE_URL || 'http://localhost:8083',
    AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:5000',
  },
  async rewrites() {
    return [
      {
        source: '/api/admin/:path*',
        destination: `${process.env.ADMIN_SERVICE_URL}/api/:path*`,
      },
      {
        source: '/api/parser/:path*',
        destination: `${process.env.PARSER_SERVICE_URL}/api/:path*`,
      },
      {
        source: '/api/database/:path*',
        destination: `${process.env.DATABASE_SERVICE_URL}/api/:path*`,
      },
      {
        source: '/api/queue/:path*',
        destination: `${process.env.QUEUE_SERVICE_URL}/api/:path*`,
      },
      {
        source: '/api/search/:path*',
        destination: `${process.env.SEARCH_SERVICE_URL}/api/:path*`,
      },
      {
        source: '/api/ai/:path*',
        destination: `${process.env.AI_SERVICE_URL}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;







