function normalizeAppEnvironment(value) {
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

function mediaRemotePatterns() {
  const value = process.env.PUBLIC_MEDIA_BASE_URL?.trim()
  if (!value) return []
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) return []
    return [{ protocol: url.protocol.slice(0, -1), hostname: url.hostname, port: url.port, pathname: '/**' }]
  } catch {
    throw new Error('PUBLIC_MEDIA_BASE_URL must be a valid URL')
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { remotePatterns: mediaRemotePatterns() },
  experimental: {
    serverActions: {
      bodySizeLimit: process.env.NEXT_SERVER_ACTION_BODY_SIZE_LIMIT ?? '16mb',
    },
  },
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
