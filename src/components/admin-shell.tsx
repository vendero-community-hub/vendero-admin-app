import { API_URL, ENV_HEADERS } from '@/lib/environment'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { Activity, BellRing, Building2, CreditCard, LayoutDashboard, Link2, MessageSquareWarning, MessagesSquare, ShieldCheck, ShoppingBag, SquareTerminal, Users, Waypoints } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const VENDERO_LOGO_URL =
  'https://pub-62b8d9a00e0749d5a58a987a7c20cebc.r2.dev/app/assets/logo-white.svg'

const navGroups = [
  {
    label: 'Operations',
    items: [
      { href: '/', label: 'Overview', icon: LayoutDashboard },
      { href: '/vendors', label: 'Vendors', icon: Building2 },
      { href: '/staff', label: 'Staff', icon: Users },
      { href: '/verifications', label: 'Verifications', icon: ShieldCheck },
      { href: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
      { href: '/trips', label: 'Trips', icon: Waypoints },
      { href: '/chat-moderation', label: 'Chat Moderation', icon: MessageSquareWarning },
      { href: '/marketplace-moderation', label: 'Marketplace', icon: ShoppingBag },
      { href: '/whatsapp', label: 'WhatsApp', icon: MessagesSquare },
      { href: '/server', label: 'Server Resource', icon: Activity },
      { href: '/links', label: 'White Label', icon: Link2 },
    ],
  },
  {
    label: 'Control',
    items: [
      { href: '/audit-logs', label: 'Audit Trail', icon: ShieldCheck },
      { href: '/worker-queues', label: 'Queue Watch', icon: SquareTerminal },
      { href: '#', label: 'Alerts', icon: BellRing, muted: true },
    ],
  },
]

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
      ? ['overview', 'vendors', 'staff', 'verifications', 'subscriptions', 'trips', 'chat_moderation', 'marketplace_moderation', 'whatsapp_admin', 'server', 'links', 'worker_queues', 'audit_logs']
      : Array.isArray(user?.adminPagePermissions)
        ? user.adminPagePermissions
        : []

  const permissionByHref: Record<string, string> = {
    '/': 'overview',
    '/vendors': 'vendors',
    '/staff': 'staff',
    '/verifications': 'verifications',
    '/subscriptions': 'subscriptions',
    '/trips': 'trips',
    '/chat-moderation': 'chat_moderation',
    '/marketplace-moderation': 'marketplace_moderation',
    '/whatsapp': 'whatsapp_admin',
    '/server': 'server',
    '/links': 'links',
    '/worker-queues': 'worker_queues',
    '/audit-logs': 'audit_logs',
  }

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

          <div className="space-y-6">
            {navGroups.map((group) => (
              <div key={group.label}>
                <p className="mb-2 px-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  {group.label}
                </p>
                <div className="space-y-1.5">
                  {group.items
                    .filter((item) => {
                      const isMuted = 'muted' in item && item.muted
                      if (isMuted) return true
                      const permission = permissionByHref[item.href]
                      return !permission || grantedPermissions.includes(permission)
                    })
                    .map((item) => {
                    const Icon = item.icon
                    const isMuted = 'muted' in item && item.muted
                    const content = (
                      <span
                        className={cn(
                          'flex min-h-10 items-center gap-3 rounded-lg border border-transparent px-3 text-sm transition-colors',
                          isMuted
                            ? 'cursor-default text-muted-foreground/55'
                            : 'text-foreground hover:border-border hover:bg-accent/50'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </span>
                    )

                    return isMuted ? <div key={item.label}>{content}</div> : <Link key={item.label} href={item.href}>{content}</Link>
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto rounded-xl border border-border/70 bg-card/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Admin Scope</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Platform ops, moderation, telemetry, and trust controls.
            </p>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-border/80 bg-background/85 px-5 py-4 backdrop-blur">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Control Room
              </p>
              <h2 className="text-sm font-semibold text-foreground/95">
                Secure operations workspace
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={hasAdminToken ? 'success' : 'warning'} className="gap-2 rounded-full px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                {hasAdminToken ? 'Admin authenticated' : 'Sign in required'}
              </Badge>
              <Link href="/login">
                <Badge variant="outline" className="rounded-full px-3 py-1 text-muted-foreground">
                  {hasAdminToken ? 'Manage session' : 'Open login'}
                </Badge>
              </Link>
            </div>
          </header>

          <div className="p-5 lg:p-7">{children}</div>
        </div>
      </div>
    </div>
  )
}
