/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@terminverwaltung/ui', '@terminverwaltung/database'],
  reactStrictMode: true,
  async rewrites() {
    const apiUrl = process.env.INTERNAL_API_URL || 'http://localhost:3001'
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
      {
        source: '/health',
        destination: `${apiUrl}/health`,
      },
    ]
  },
}

module.exports = nextConfig
