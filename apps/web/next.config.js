/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@terminverwaltung/ui', '@terminverwaltung/database'],
  devIndicators: false,
  reactStrictMode: true,
}

module.exports = nextConfig
