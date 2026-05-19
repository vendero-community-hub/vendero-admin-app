import type { NextConfig } from 'next'

function normalizeAppEnvironment(value?: string) {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (['prod', 'pro', 'production'].includes(normalized)) return 'prod'
  if (['test', 'testing', 'stage', 'staging', 'stahing'].includes(normalized)) return 'test'
  return 'dev'
}

const appEnv = normalizeAppEnvironment(
  process.env.NEXT_PUBLIC_APP_ENV ?? process.env.APP_ENV ?? process.env.VENDERO_ENV ?? process.env.NODE_ENV
)

const apiDefaults = {
  dev: 'http://localhost:3333',
  test: 'https://test-api.vendero.in',
  prod: 'https://api.vendero.in',
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const apiBaseUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? apiDefaults[appEnv]

    return [
      {
        source: '/api/:path*',
        destination: `${apiBaseUrl}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
