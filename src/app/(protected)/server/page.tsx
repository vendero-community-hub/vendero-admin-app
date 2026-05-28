import { API_URL, ENV_HEADERS } from '@/lib/environment'
import { cookies } from 'next/headers'
import { Activity, AlertTriangle, ArrowUpRight, CheckCircle2, Cpu, DatabaseZap, HardDrive, MemoryStick, RadioTower, ServerCog, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { BadgeProps } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RateLimitToolsPanel } from './rate-limit-tools-panel'

type ServiceHealth = {
  status: 'up' | 'down' | 'configured' | 'planned'
  service: string
  detail: string
  connected: boolean
  ready: boolean
  checkedAt: string
  latencyMs: number | null
  lastSuccessAt: string | null
  lastFailureAt: string | null
  lastFailureMessage: string | null
}

type TrafficPoint = {
  time: string
  requests: number
  errors: number
  avgDurationMs: number
}

type OverviewPayload = {
  generatedAt: string
  range: { label: string; since: string }
  summary: {
    requestCount: number
    errorCount: number
    avgDurationMs: number
    uniqueActiveUsers: number
  }
  resources: {
    serverTime: string
    hostname: string
    platform: string
    nodeVersion: string
    uptimeSeconds: number
    cpu: { cores: number; loadAverage: number[] }
    memory: { totalMb: number; usedMb: number; freeMb: number; usagePercent: number }
    disk: { totalGb: number; usedGb: number; availableGb: number; usagePercent: number }
    redisRuntime: {
      usedMemoryHuman: string
      connectedClients: number
      totalCommandsProcessed: number
      instantaneousOpsPerSec: number
    }
  }
  charts: { traffic: TrafficPoint[] }
  telemetry: { queueEvents: number; messagingEvents: number }
  serviceSummary: {
    total: number
    connectedCount: number
    readyCount: number
    downCount: number
    degradedCount: number
    overallStatus: 'healthy' | 'degraded' | 'down'
  }
  latestErrors: Array<{
    createdAt: string
    path: string | null
    method: string | null
    errorCode: string | null
    errorMessage: string | null
    statusCode: number | null
    userId: number | null
  }>
  serviceHealth: Record<string, ServiceHealth>
}

const fallbackOverview: OverviewPayload = {
  generatedAt: new Date().toISOString(),
  range: {
    label: 'Last 24 hours',
    since: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  summary: {
    requestCount: 0,
    errorCount: 0,
    avgDurationMs: 0,
    uniqueActiveUsers: 0,
  },
  resources: {
    serverTime: new Date().toISOString(),
    hostname: 'vendero-vps',
    platform: 'linux',
    nodeVersion: 'v25.x',
    uptimeSeconds: 0,
    cpu: { cores: 4, loadAverage: [0, 0, 0] },
    memory: { totalMb: 16384, usedMb: 0, freeMb: 16384, usagePercent: 0 },
    disk: { totalGb: 200, usedGb: 0, availableGb: 200, usagePercent: 0 },
    redisRuntime: {
      usedMemoryHuman: 'unknown',
      connectedClients: 0,
      totalCommandsProcessed: 0,
      instantaneousOpsPerSec: 0,
    },
  },
  charts: { traffic: [] },
  telemetry: { queueEvents: 0, messagingEvents: 0 },
  serviceSummary: {
    total: 5,
    connectedCount: 0,
    readyCount: 0,
    downCount: 0,
    degradedCount: 5,
    overallStatus: 'degraded',
  },
  latestErrors: [],
  serviceHealth: {
    postgres: { status: 'configured', service: 'PostgreSQL', detail: 'Awaiting live API connection', connected: false, ready: false, checkedAt: new Date().toISOString(), latencyMs: null, lastSuccessAt: null, lastFailureAt: null, lastFailureMessage: null },
    mongo: { status: 'configured', service: 'MongoDB', detail: 'Awaiting live API connection', connected: false, ready: false, checkedAt: new Date().toISOString(), latencyMs: null, lastSuccessAt: null, lastFailureAt: null, lastFailureMessage: null },
    redis: { status: 'configured', service: 'Redis', detail: 'Awaiting live API connection', connected: false, ready: false, checkedAt: new Date().toISOString(), latencyMs: null, lastSuccessAt: null, lastFailureAt: null, lastFailureMessage: null },
    messaging: { status: 'planned', service: 'FCM', detail: 'Messaging telemetry will appear after worker setup', connected: false, ready: false, checkedAt: new Date().toISOString(), latencyMs: null, lastSuccessAt: null, lastFailureAt: null, lastFailureMessage: null },
    queue: { status: 'planned', service: 'Redis queue', detail: 'Queue telemetry will appear after queue pipeline setup', connected: false, ready: false, checkedAt: new Date().toISOString(), latencyMs: null, lastSuccessAt: null, lastFailureAt: null, lastFailureMessage: null },
  },
}

async function getOverview() {
  const cookieStore = await cookies()
  const adminToken =
    process.env.ADMIN_API_TOKEN ?? cookieStore.get('vendero_admin_access_token')?.value

  if (!adminToken) {
    return { overview: fallbackOverview, mode: 'auth' as const }
  }

  try {
    const response = await fetch(`${API_URL}/api/v1/admin/server/overview`, {
      cache: 'no-store',
      headers: adminToken
        ? { ...ENV_HEADERS, authorization: `Bearer ${adminToken}` }
        : ENV_HEADERS,
    })

    if (!response.ok) {
      throw new Error(`Overview request failed with ${response.status}`)
    }

    const payload = (await response.json()) as { data: OverviewPayload }

    return { overview: payload.data, mode: 'live' as const }
  } catch {
    return { overview: fallbackOverview, mode: 'fallback' as const }
  }
}

function formatCompactDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatOptionalDate(value: string | null) {
  return value ? formatCompactDate(value) : 'No signal yet'
}

function formatUptime(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

function toneForStatus(status: ServiceHealth['status']) {
  if (status === 'up' || status === 'configured') return 'success' as const
  if (status === 'down') return 'danger' as const
  return 'warning' as const
}

function toneForOverallStatus(status: OverviewPayload['serviceSummary']['overallStatus']) {
  if (status === 'healthy') return 'success'
  if (status === 'down') return 'danger'
  return 'warning'
}

function TrafficChart({ points }: { points: TrafficPoint[] }) {
  const safePoints = points.slice(-12)
  const maxRequests = Math.max(...safePoints.map((point) => point.requests), 1)

  if (safePoints.length === 0) {
    return <p className="text-sm text-muted-foreground">No telemetry yet. Start sending traffic to populate charts.</p>
  }

  return (
    <div className="flex min-h-64 items-end gap-3 overflow-x-auto border-t border-border/70 pt-6">
      {safePoints.map((point) => (
        <div key={point.time} className="flex min-w-12 flex-col items-center gap-2">
          <div
            className="w-4 rounded-full bg-gradient-to-b from-sky-400 to-blue-600"
            style={{ height: `${Math.max((point.requests / maxRequests) * 150, 6)}px` }}
            title={`${point.time}: ${point.requests} requests`}
          />
          <div
            className="w-4 rounded-full bg-gradient-to-b from-rose-300 to-rose-600"
            style={{ height: `${Math.max((point.errors / maxRequests) * 150, 4)}px` }}
            title={`${point.time}: ${point.errors} errors`}
          />
          <span className="writing-mode-vertical rotate-180 text-[11px] text-muted-foreground [writing-mode:vertical-rl]">
            {point.time}
          </span>
        </div>
      ))}
    </div>
  )
}

export default async function ServerPage() {
  const { overview, mode } = await getOverview()
  const healthEntries = Object.entries(overview.serviceHealth)
  const healthSummaryCards: Array<{
    label: string
    value: string | number
    note: string
    icon: typeof CheckCircle2
    tone: NonNullable<BadgeProps['variant']>
  }> = [
    {
      label: 'Overall',
      value: overview.serviceSummary.overallStatus,
      note: `${overview.serviceSummary.readyCount}/${overview.serviceSummary.total} services ready`,
      icon:
        overview.serviceSummary.overallStatus === 'healthy'
          ? CheckCircle2
          : overview.serviceSummary.overallStatus === 'down'
            ? XCircle
            : AlertTriangle,
      tone: toneForOverallStatus(overview.serviceSummary.overallStatus),
    },
    {
      label: 'Connected',
      value: overview.serviceSummary.connectedCount,
      note: 'Services currently reachable',
      icon: RadioTower,
      tone: 'success' as const,
    },
    {
      label: 'Ready',
      value: overview.serviceSummary.readyCount,
      note: 'Services ready to handle data',
      icon: DatabaseZap,
      tone: overview.serviceSummary.readyCount === overview.serviceSummary.total ? 'success' as const : 'warning' as const,
    },
    {
      label: 'Attention',
      value: overview.serviceSummary.downCount + overview.serviceSummary.degradedCount,
      note: 'Down or degraded services',
      icon: AlertTriangle,
      tone:
        overview.serviceSummary.downCount > 0
          ? 'danger' as const
          : overview.serviceSummary.degradedCount > 0
            ? 'warning' as const
            : 'success' as const,
    },
  ]
  const summaryCards = [
    { label: 'Total Requests', value: overview.summary.requestCount, note: 'API requests in selected window', icon: Activity },
    { label: 'Total Errors', value: overview.summary.errorCount, note: 'Failures captured in Mongo logs', icon: ArrowUpRight },
    { label: 'Avg API Time', value: `${overview.summary.avgDurationMs} ms`, note: 'Average request duration', icon: ServerCog },
    { label: 'Active Users', value: overview.summary.uniqueActiveUsers, note: 'Distinct users seen in telemetry', icon: DatabaseZap },
    { label: 'Queue Events', value: overview.telemetry.queueEvents, note: 'Worker-side snapshots and events', icon: RadioTower },
    { label: 'Messaging Events', value: overview.telemetry.messagingEvents, note: 'Push and messaging telemetry', icon: Activity },
  ]

  return (
    <main className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.45fr_0.8fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader className="space-y-3">
            <Badge variant="outline" className="w-fit rounded-full border-primary/25 bg-primary/10 px-3 py-1 text-primary">
              Server Resource
            </Badge>
            <CardTitle className="text-3xl leading-tight lg:text-5xl">
              Infrastructure and telemetry desk.
            </CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7 text-muted-foreground lg:text-base">
              Monitor API health, recent failures, worker telemetry, service availability, and VPS
              resources in one admin-grade screen.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-gradient-to-br from-card via-card to-accent/30">
          <CardHeader>
            <Badge
              variant={mode === 'live' ? 'success' : mode === 'auth' ? 'warning' : 'danger'}
              className="w-fit rounded-full px-3 py-1"
            >
              {mode === 'live'
                ? 'Live API data'
                : mode === 'auth'
                  ? 'Authentication required'
                  : 'Fallback mode'}
            </Badge>
            <CardTitle className="text-2xl leading-tight">{overview.range.label}</CardTitle>
            <CardDescription>
              {mode === 'auth'
                ? 'Sign in as staff to fetch live server data.'
                : `Generated: ${formatCompactDate(overview.generatedAt)}`}
            </CardDescription>
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {summaryCards.map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.label} className="border-border/70 bg-card/80">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight">{item.value}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.note}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-secondary/60 p-3">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {healthSummaryCards.map((item) => {
          const Icon = item.icon

          return (
            <Card key={item.label} className="border-border/70 bg-card/80">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <p className="text-3xl font-semibold capitalize tracking-tight">{item.value}</p>
                      <Badge variant={item.tone} className="rounded-full px-2.5 py-1">
                        {item.label === 'Overall' ? 'Service posture' : 'Live'}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.note}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-secondary/60 p-3">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <RateLimitToolsPanel />

      <section className="grid gap-6 xl:grid-cols-[1.55fr_0.85fr]">
        <div className="space-y-6">
          <Card className="border-border/70 bg-card/80">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardDescription className="uppercase tracking-[0.2em] text-muted-foreground">
                  Traffic Analytics
                </CardDescription>
                <CardTitle className="mt-2 text-2xl">Traffic vs Errors</CardTitle>
              </div>
              <Badge variant="outline" className="rounded-full px-3 py-1">
                {overview.range.label}
              </Badge>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm leading-6 text-muted-foreground">
                Date and time grouped metrics for the latest server window.
              </p>
              <TrafficChart points={overview.charts.traffic} />
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="border-border/70 bg-card/80">
              <CardHeader>
                <CardDescription className="uppercase tracking-[0.2em] text-muted-foreground">
                  Machine
                </CardDescription>
                <CardTitle className="mt-2 text-2xl">Server Resource</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  ['Server Time', formatCompactDate(overview.resources.serverTime)],
                  ['Hostname', overview.resources.hostname],
                  ['Platform', overview.resources.platform],
                  ['Node', overview.resources.nodeVersion],
                  ['Uptime', formatUptime(overview.resources.uptimeSeconds)],
                  ['CPU Cores', overview.resources.cpu.cores],
                  ['Load Avg', overview.resources.cpu.loadAverage.join(' / ')],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-4 border-t border-border/70 pt-4 first:border-0 first:pt-0">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className="text-sm font-medium">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/80">
              <CardHeader>
                <CardDescription className="uppercase tracking-[0.2em] text-muted-foreground">
                  Runtime
                </CardDescription>
                <CardTitle className="mt-2 text-2xl">Memory / Disk / Redis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  ['Memory Used', `${overview.resources.memory.usedMb} MB / ${overview.resources.memory.totalMb} MB`],
                  ['Memory Usage', `${overview.resources.memory.usagePercent}%`],
                  ['Disk Used', `${overview.resources.disk.usedGb} GB / ${overview.resources.disk.totalGb} GB`],
                  ['Disk Usage', `${overview.resources.disk.usagePercent}%`],
                  ['Redis Memory', overview.resources.redisRuntime.usedMemoryHuman],
                  ['Redis Ops/Sec', overview.resources.redisRuntime.instantaneousOpsPerSec],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-4 border-t border-border/70 pt-4 first:border-0 first:pt-0">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className="text-sm font-medium">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/70 bg-card/80">
            <CardHeader>
              <CardDescription className="uppercase tracking-[0.2em] text-muted-foreground">
                Errors
              </CardDescription>
              <CardTitle className="mt-2 text-2xl">Latest API Errors</CardTitle>
            </CardHeader>
            <CardContent>
              {overview.latestErrors.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent API errors captured yet.</p>
              ) : (
                <div className="space-y-3">
                  {overview.latestErrors.map((item, index) => (
                    <div
                      className="flex flex-col gap-4 rounded-xl border border-border/70 bg-background/25 p-4 xl:flex-row xl:items-start xl:justify-between"
                      key={`${item.createdAt}-${index}`}
                    >
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-sky-300">
                          {formatCompactDate(item.createdAt)}
                        </p>
                        <h3 className="mt-2 font-medium">
                          {item.method ?? 'API'} {item.path ?? '/unknown'}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {item.errorMessage ?? 'Unknown error message'}
                        </p>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground xl:text-right">
                        <p>Status: {item.statusCode ?? '-'}</p>
                        <p>Code: {item.errorCode ?? '-'}</p>
                        <p>User: {item.userId ?? 'guest'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="border-border/70 bg-card/80">
            <CardHeader>
              <CardDescription className="uppercase tracking-[0.2em] text-muted-foreground">
                Services
              </CardDescription>
              <CardTitle className="mt-2 text-xl">Health board</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {healthEntries.map(([key, item]) => (
                <div key={key} className="flex items-start justify-between gap-4 rounded-xl border border-border/70 bg-background/25 p-4">
                  <div>
                    <p className="font-medium">{item.service}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.detail}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant={item.connected ? 'success' : 'danger'}>
                        {item.connected ? 'Connected' : 'Not connected'}
                      </Badge>
                      <Badge variant={item.ready ? 'success' : 'warning'}>
                        {item.ready ? 'Ready for data' : 'Not ready'}
                      </Badge>
                      <Badge variant={item.latencyMs !== null && item.latencyMs < 250 ? 'success' : item.latencyMs !== null ? 'warning' : 'outline'}>
                        {item.latencyMs !== null ? `${item.latencyMs} ms latency` : 'Latency pending'}
                      </Badge>
                    </div>
                    <div className="mt-3 space-y-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      <p>Checked: {formatCompactDate(item.checkedAt)}</p>
                      <p>Last success: {formatOptionalDate(item.lastSuccessAt)}</p>
                      <p>Last failure: {formatOptionalDate(item.lastFailureAt)}</p>
                    </div>
                    {item.lastFailureMessage ? (
                      <p className="mt-3 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs leading-5 text-rose-200">
                        {item.lastFailureMessage}
                      </p>
                    ) : null}
                  </div>
                  <Badge variant={toneForStatus(item.status)}>{item.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/80">
            <CardHeader>
              <CardDescription className="uppercase tracking-[0.2em] text-muted-foreground">
                Telemetry
              </CardDescription>
              <CardTitle className="mt-2 text-xl">Pipeline posture</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border/70 bg-background/25 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <RadioTower className="h-4 w-4 text-primary" />
                  <p className="font-medium">Queue telemetry</p>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {overview.telemetry.queueEvents} events logged from worker snapshots.
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/25 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <p className="font-medium">Messaging telemetry</p>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {overview.telemetry.messagingEvents} events tracked for FCM-facing flow.
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/25 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-primary" />
                  <p className="font-medium">Data source</p>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {mode === 'live' ? 'Live API overview endpoint' : 'Fallback sample state'}
                </p>
              </div>
            </CardContent>
          </Card>
        </aside>
      </section>
    </main>
  )
}
