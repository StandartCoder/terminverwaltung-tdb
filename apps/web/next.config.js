/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@terminverwaltung/ui', '@terminverwaltung/database'],
  reactStrictMode: true,
}

module.exports = nextConfig
