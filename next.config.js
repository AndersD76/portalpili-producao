/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Desabilitar geração estática para evitar erros de prerendering
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
}

module.exports = nextConfig
