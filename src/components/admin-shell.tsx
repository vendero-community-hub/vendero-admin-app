import { API_URL, ENV_HEADERS } from '@/lib/environment'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { Badge } from '@/components/ui/badge'
import { AdminLogoutButton } from '@/components/admin-session-actions'
import {
  AdminNavLinks,
  VENDERO_LOGO_URL,
  allAdminPermissions,
} from '@/components/admin-nav'
import { AdminMobileMenu } from '@/components/admin-mobile-menu'

export async function AdminShell({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('vendero_admin_access_token')?.value
  const hasAdminToken = Boolean(token)

  let user: { role?: string; isSuperStaff?: boolean; adminPagePermissions?: string[] } | null = null
  if (token) {
    try {
      const response = await fetch(`${API_URL}/api/v1/admin/me`, {
        cache: 'no-store',
        headers: {
          ...ENV_HEADERS,
          authorization: `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const payload = await response.json()
        user = (payload.data?.data ?? payload.data) as {
          role?: string
          isSuperStaff?: boolean
          adminPagePermissions?: string[]
        }
      }
    } catch {}
  }

  const grantedPermissions =
    user?.role === 'admin' || user?.isSuperStaff
      ? allAdminPermissions
      : Array.isArray(user?.adminPagePermissions)
        ? user.adminPagePermissions
        : []

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border/80 bg-sidebar/90 px-4 py-5 backdrop-blur lg:flex lg:flex-col">
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-border/60 bg-card/80 px-3 py-3">
            <img src={VENDERO_LOGO_URL} alt="Vendero" className="h-8 w-auto shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Vendero</p>
              <p className="font-semibold">Admin Portal</p>
            </div>
          </div>

          <AdminNavLinks grantedPermissions={grantedPermissions} />

          <div className="mt-auto rounded-xl border border-border/70 bg-card/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Admin Scope</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Platform ops, moderation, telemetry, and trust controls.
            </p>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-border/80 bg-background/85 px-4 py-3 backdrop-blur sm:px-5 sm:py-4">
            <div className="flex min-w-0 items-center gap-3">
              <AdminMobileMenu grantedPermissions={grantedPermissions} hasAdminToken={hasAdminToken} />
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Control Room
                </p>
                <h2 className="truncate text-sm font-semibold text-foreground/95">
                  Secure operations workspace
                </h2>
              </div>
            </div>

            <div className="hidden items-center gap-2 lg:flex">
              <Badge variant={hasAdminToken ? 'success' : 'warning'} className="gap-2 rounded-full px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                {hasAdminToken ? 'Admin authenticated' : 'Sign in required'}
              </Badge>
              <Link href="/login">
                <Badge variant="outline" className="rounded-full px-3 py-1 text-muted-foreground">
                  {hasAdminToken ? 'Manage session' : 'Open login'}
                </Badge>
              </Link>
              {hasAdminToken ? <AdminLogoutButton /> : null}
            </div>
          </header>

          <div className="p-5 lg:p-7">{children}</div>
        </div>
      </div>
    </div>
  )
}
