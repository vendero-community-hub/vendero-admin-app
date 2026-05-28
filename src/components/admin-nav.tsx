import Link from 'next/link'
import {
  Activity,
  BellRing,
  Building2,
  CreditCard,
  Car,
  ClipboardList,
  LayoutDashboard,
  Link2,
  Megaphone,
  MessageSquareWarning,
  MessagesSquare,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  SquareTerminal,
  Users,
  Waypoints,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const VENDERO_LOGO_URL =
  'https://pub-62b8d9a00e0749d5a58a987a7c20cebc.r2.dev/app/assets/logo-white.svg'

type AdminNavItem = {
  href: string
  label: string
  icon: LucideIcon
  muted?: boolean
}

type AdminNavGroup = {
  label: string
  items: AdminNavItem[]
}

export const adminNavGroups: AdminNavGroup[] = [
  {
    label: 'Operations',
    items: [
      { href: '/', label: 'Overview', icon: LayoutDashboard },
      { href: '/vendors', label: 'Vendors', icon: Building2 },
      { href: '/staff', label: 'Staff', icon: Users },
      { href: '/verifications', label: 'Verifications', icon: ShieldCheck },
      { href: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
      { href: '/trips', label: 'Trips', icon: Waypoints },
      { href: '/fleet', label: 'Cabs & Fare', icon: Car },
      { href: '/chat-moderation', label: 'Chat Moderation', icon: MessageSquareWarning },
      { href: '/marketplace-moderation', label: 'Marketplace', icon: ShoppingBag },
      { href: '/whatsapp', label: 'WhatsApp', icon: MessagesSquare },
      { href: '/server', label: 'Server Resource', icon: Activity },
      { href: '/links', label: 'White Label', icon: Link2 },
      { href: '/landing', label: 'Landing Requests', icon: ClipboardList },
      { href: '/features', label: 'New Features', icon: Sparkles },
      { href: '/banners', label: 'Banner Ads', icon: Megaphone },
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

export const adminPermissionByHref: Record<string, string> = {
  '/': 'overview',
  '/vendors': 'vendors',
  '/staff': 'staff',
  '/verifications': 'verifications',
  '/subscriptions': 'subscriptions',
  '/trips': 'trips',
  '/fleet': 'fleet',
  '/chat-moderation': 'chat_moderation',
  '/marketplace-moderation': 'marketplace_moderation',
  '/whatsapp': 'whatsapp_admin',
  '/server': 'server',
  '/links': 'links',
  '/landing': 'landing',
  '/features': 'features',
  '/banners': 'banners',
  '/worker-queues': 'worker_queues',
  '/audit-logs': 'audit_logs',
}

export const allAdminPermissions = Object.values(adminPermissionByHref)

function canShowNavItem(item: AdminNavItem, grantedPermissions: string[]) {
  if (item.muted) return true

  const permission = adminPermissionByHref[item.href]
  return !permission || grantedPermissions.includes(permission)
}

export function AdminNavLinks({
  grantedPermissions,
  onNavigate,
}: {
  grantedPermissions: string[]
  onNavigate?: () => void
}) {
  return (
    <div className="space-y-6">
      {adminNavGroups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {group.label}
          </p>
          <div className="space-y-1.5">
            {group.items
              .filter((item) => canShowNavItem(item, grantedPermissions))
              .map((item) => {
                const Icon = item.icon
                const content = (
                  <span
                    className={cn(
                      'flex min-h-10 items-center gap-3 rounded-lg border border-transparent px-3 text-sm transition-colors',
                      item.muted
                        ? 'cursor-default text-muted-foreground/55'
                        : 'text-foreground hover:border-border hover:bg-accent/50'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </span>
                )

                return item.muted ? (
                  <div key={item.label}>{content}</div>
                ) : (
                  <Link key={item.label} href={item.href} onClick={onNavigate}>
                    {content}
                  </Link>
                )
              })}
          </div>
        </div>
      ))}
    </div>
  )
}
