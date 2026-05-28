import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const LOGIN_PATH = '/login'
function normalizeAppEnvironment(value?: string) {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (['prod', 'pro', 'production'].includes(normalized)) return 'prod'
  if (['test', 'testing', 'stage', 'staging', 'stahing'].includes(normalized)) return 'test'
  return 'dev'
}

const APP_ENV = normalizeAppEnvironment(
  process.env.NEXT_PUBLIC_APP_ENV ?? process.env.APP_ENV ?? process.env.VENDERO_ENV ?? process.env.NODE_ENV
)
const API_URL =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  ({ dev: 'http://localhost:3333', test: 'https://test-api.vendero.in', prod: 'https://api.vendero.in' }[
    APP_ENV
  ])
const PAGE_PERMISSION_BY_PATH: Array<{ prefix: string; permission: string }> = [
  { prefix: '/vendors', permission: 'vendors' },
  { prefix: '/staff', permission: 'staff' },
  { prefix: '/verifications', permission: 'verifications' },
  { prefix: '/subscriptions', permission: 'subscriptions' },
  { prefix: '/trips', permission: 'trips' },
  { prefix: '/fleet', permission: 'fleet' },
  { prefix: '/chat-moderation', permission: 'chat_moderation' },
  { prefix: '/marketplace-moderation', permission: 'marketplace_moderation' },
  { prefix: '/whatsapp', permission: 'whatsapp_admin' },
  { prefix: '/server', permission: 'server' },
  { prefix: '/links', permission: 'links' },
  { prefix: '/landing', permission: 'landing' },
  { prefix: '/features', permission: 'features' },
  { prefix: '/banners', permission: 'banners' },
  { prefix: '/worker-queues', permission: 'worker_queues' },
  { prefix: '/audit-logs', permission: 'audit_logs' },
]

function permissionForPath(pathname: string) {
  if (pathname === '/') return 'overview'
  return PAGE_PERMISSION_BY_PATH.find((item) => pathname.startsWith(item.prefix))?.permission ?? null
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const adminToken = request.cookies.get('vendero_admin_access_token')?.value
  const hasAdminToken = Boolean(adminToken)

  if (pathname === LOGIN_PATH) {
    if (hasAdminToken) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    return NextResponse.next()
  }

  if (!hasAdminToken) {
    const loginUrl = new URL(LOGIN_PATH, request.url)
    loginUrl.searchParams.set('next', pathname === '/' ? '/' : `${pathname}${search}`)
    return NextResponse.redirect(loginUrl)
  }

  const requiredPermission = permissionForPath(pathname)
  if (!requiredPermission) {
    return NextResponse.next()
  }

  try {
    const response = await fetch(`${API_URL}/api/v1/admin/me`, {
      headers: {
        'x-vendero-env': APP_ENV,
        authorization: `Bearer ${adminToken}`,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      const loginUrl = new URL(LOGIN_PATH, request.url)
      loginUrl.searchParams.set('next', pathname === '/' ? '/' : `${pathname}${search}`)
      const redirectResponse = NextResponse.redirect(loginUrl)
      redirectResponse.cookies.delete('vendero_admin_access_token')
      redirectResponse.cookies.delete('vendero_admin_refresh_token')
      redirectResponse.cookies.delete('vendero_admin_session_id')
      return redirectResponse
    }

    const payload = await response.json()
    const user = payload?.data?.data ?? payload?.data
    const permissions = Array.isArray(user?.adminPagePermissions) ? user.adminPagePermissions : []

    if (user?.role !== 'admin' && !user?.isSuperStaff && !permissions.includes(requiredPermission)) {
      const routeByPermission: Record<string, string> = {
        overview: '/',
        vendors: '/vendors',
        staff: '/staff',
        verifications: '/verifications',
        subscriptions: '/subscriptions',
        trips: '/trips',
        fleet: '/fleet',
        chat_moderation: '/chat-moderation',
        marketplace_moderation: '/marketplace-moderation',
        whatsapp_admin: '/whatsapp',
        server: '/server',
        links: '/links',
        landing: '/landing',
        features: '/features',
        banners: '/banners',
        worker_queues: '/worker-queues',
        audit_logs: '/audit-logs',
      }

      const fallbackRoute =
        permissions.map((permission: string) => routeByPermission[permission]).find(Boolean) ?? LOGIN_PATH

      return NextResponse.redirect(new URL(fallbackRoute, request.url))
    }
  } catch {
    const loginUrl = new URL(LOGIN_PATH, request.url)
    loginUrl.searchParams.set('next', pathname === '/' ? '/' : `${pathname}${search}`)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
