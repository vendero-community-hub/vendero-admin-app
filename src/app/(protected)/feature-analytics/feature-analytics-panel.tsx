'use client'

import { useMemo, useState } from 'react'
import { BarChart3, CheckCircle2, RefreshCw, Search, TrendingUp, UsersRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type BadgeTone = 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger'

type FeatureUsageVendor = {
  vendorProfileId: number
  userId: number | null
  businessName: string
  contactName: string | null
  phone: string | null
  city: string | null
  state: string | null
  eventCount: number
  usedFeatureCount: number
  lastUsedAt: string | null
}

type FeatureUsageEvent = {
  id: number
  publicId: string | null
  featureKey: string
  eventName: string
  eventType: string
  routeName: string | null
  screenName: string | null
  source: string | null
  platform: string | null
  appVersion: string | null
  occurredAt: string | null
  vendor: {
    id: number | null
    businessName: string | null
    contactName: string | null
    city: string | null
    state: string | null
  }
}

type FeatureUsageRecord = {
  featureKey: string
  title: string
  module: string
  status: 'live' | 'upcoming' | string
  isEnabled: boolean
  source: string
  eventCount: number
  vendorCount: number
  usageRate: number
  lastUsedAt: string | null
  eventsByType: Record<string, number>
  topVendors: FeatureUsageVendor[]
  featureCard?: {
    id: number
    publicId: string
    status: string
    isPublished: boolean
    tag: string | null
  } | null
}

export type FeatureAnalyticsData = {
  generatedAt: string
  summary: {
    featureCount: number
    enabledFeatureCount: number
    usedFeatureCount: number
    unusedFeatureCount: number
    eventCount: number
    activeVendorCount: number
    totalVendorCount: number
  }
  features: FeatureUsageRecord[]
  vendors: Array<
    FeatureUsageVendor & {
      topFeatures?: Array<{
        featureKey: string
        title: string
        eventCount: number
        lastUsedAt: string | null
      }>
    }
  >
  recentEvents: FeatureUsageEvent[]
} | null

function getAdminToken() {
  const tokenEntry = document.cookie
    .split('; ')
    .find((part) => part.startsWith('vendero_admin_access_token='))
  return tokenEntry?.split('=')[1] ?? null
}

function fallbackData(): NonNullable<FeatureAnalyticsData> {
  return {
    generatedAt: new Date().toISOString(),
    summary: {
      featureCount: 0,
      enabledFeatureCount: 0,
      usedFeatureCount: 0,
      unusedFeatureCount: 0,
      eventCount: 0,
      activeVendorCount: 0,
      totalVendorCount: 0,
    },
    features: [],
    vendors: [],
    recentEvents: [],
  }
}

async function requestJson(path: string) {
  const token = getAdminToken()
  const response = await fetch(path, {
    headers: {
      authorization: token ? `Bearer ${token}` : '',
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.message ?? payload?.error?.message ?? 'Request failed')
  return payload?.data?.data ?? payload?.data ?? payload
}

function label(value: string) {
  return value.replace(/_/g, ' ')
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Never'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function statusTone(feature: FeatureUsageRecord): BadgeTone {
  if (!feature.isEnabled) return 'warning'
  if (feature.eventCount > 0) return 'success'
  return 'secondary'
}

function moduleOptions(features: FeatureUsageRecord[]) {
  return Array.from(new Set(features.map((feature) => feature.module).filter(Boolean))).sort()
}

function MetricTile({
  label: title,
  value,
  note,
  icon: Icon,
}: {
  label: string
  value: number | string
  note: string
  icon: typeof BarChart3
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-semibold">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{note}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-secondary/60 p-2.5">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
    </div>
  )
}

export function FeatureAnalyticsPanel({ initialData }: { initialData: FeatureAnalyticsData }) {
  const [data, setData] = useState<NonNullable<FeatureAnalyticsData>>(initialData ?? fallbackData())
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [module, setModule] = useState('all')
  const [selectedKey, setSelectedKey] = useState(data.features[0]?.featureKey ?? '')
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState(initialData ? '' : 'Feature analytics is unavailable.')

  const modules = useMemo(() => moduleOptions(data.features), [data.features])

  const filteredFeatures = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return data.features.filter((feature) => {
      const matchesQuery =
        !normalized ||
        [feature.title, feature.featureKey, feature.module, feature.source]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalized))
      const matchesStatus =
        status === 'all' ||
        (status === 'used' && feature.eventCount > 0) ||
        (status === 'unused' && feature.eventCount === 0) ||
        (status === 'enabled' && feature.isEnabled) ||
        (status === 'not_enabled' && !feature.isEnabled)
      const matchesModule = module === 'all' || feature.module === module
      return matchesQuery && matchesStatus && matchesModule
    })
  }, [data.features, module, query, status])

  const selectedFeature =
    data.features.find((feature) => feature.featureKey === selectedKey) ?? filteredFeatures[0] ?? data.features[0]
  const selectedEvents = data.recentEvents.filter((event) => event.featureKey === selectedFeature?.featureKey)

  async function refresh() {
    setWorking(true)
    setMessage('')
    try {
      const nextData = (await requestJson('/api/v1/admin/features/analytics')) as NonNullable<FeatureAnalyticsData>
      setData(nextData)
      setSelectedKey(nextData.features[0]?.featureKey ?? '')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to refresh feature analytics.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <section className="space-y-6">
      {message ? (
        <p className="rounded-lg border border-border/70 bg-background/40 px-4 py-3 text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}

      <Card className="border-border/70 bg-card/85">
        <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label="Feature catalog"
            value={data.summary.featureCount}
            note={`${data.summary.enabledFeatureCount} enabled/live`}
            icon={BarChart3}
          />
          <MetricTile
            label="Used features"
            value={data.summary.usedFeatureCount}
            note={`${data.summary.unusedFeatureCount} without usage yet`}
            icon={CheckCircle2}
          />
          <MetricTile
            label="Active vendors"
            value={data.summary.activeVendorCount}
            note={`${data.summary.totalVendorCount} total vendors`}
            icon={UsersRound}
          />
          <MetricTile
            label="Usage events"
            value={data.summary.eventCount}
            note={`Updated ${formatDate(data.generatedAt)}`}
            icon={TrendingUp}
          />
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/85">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Feature usage list</CardTitle>
              <CardDescription>Filter live, upcoming, used, and unused feature tags.</CardDescription>
            </div>
            <Button type="button" variant="outline" onClick={refresh} disabled={working}>
              <RefreshCw className="h-4 w-4" />
              {working ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
          <div className="grid gap-3 border-t border-border/70 pt-4 lg:grid-cols-[1fr_180px_180px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-9"
                placeholder="Search feature, tag, module"
              />
            </div>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All states</option>
              <option value="used">Used</option>
              <option value="unused">Not used</option>
              <option value="enabled">Enabled</option>
              <option value="not_enabled">Not enabled</option>
            </select>
            <select
              value={module}
              onChange={(event) => setModule(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All modules</option>
              {modules.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="max-h-[720px] overflow-auto rounded-lg border border-border/70">
              {filteredFeatures.map((feature) => (
                <button
                  key={feature.featureKey}
                  type="button"
                  onClick={() => setSelectedKey(feature.featureKey)}
                  className={[
                    'grid w-full gap-2 border-t border-border/70 px-4 py-3 text-left first:border-t-0 hover:bg-accent/35',
                    selectedFeature?.featureKey === feature.featureKey ? 'bg-accent/45' : 'bg-background/20',
                  ].join(' ')}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{feature.title}</p>
                    <Badge variant={statusTone(feature)}>
                      {feature.isEnabled ? (feature.eventCount > 0 ? 'used' : 'not used') : 'not enabled'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{feature.module}</span>
                    <span>{feature.featureKey}</span>
                    <span>{feature.eventCount} events</span>
                    <span>{feature.vendorCount} vendors</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(feature.usageRate, 100)}%` }}
                    />
                  </div>
                </button>
              ))}
              {!filteredFeatures.length ? (
                <p className="px-4 py-8 text-sm text-muted-foreground">No feature tags match the filters.</p>
              ) : null}
            </div>

            <div className="space-y-4">
              {selectedFeature ? (
                <>
                  <div className="rounded-lg border border-border/70 bg-background/30 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={statusTone(selectedFeature)}>
                            {selectedFeature.isEnabled ? 'enabled' : 'not enabled'}
                          </Badge>
                          <Badge variant="outline">{selectedFeature.status}</Badge>
                          <Badge variant="outline">{selectedFeature.module}</Badge>
                        </div>
                        <h3 className="mt-3 text-xl font-semibold">{selectedFeature.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{selectedFeature.featureKey}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-sm">
                        <div className="rounded-lg border border-border/70 bg-card/60 p-3">
                          <p className="text-xl font-semibold">{selectedFeature.eventCount}</p>
                          <p className="text-xs text-muted-foreground">Events</p>
                        </div>
                        <div className="rounded-lg border border-border/70 bg-card/60 p-3">
                          <p className="text-xl font-semibold">{selectedFeature.vendorCount}</p>
                          <p className="text-xs text-muted-foreground">Vendors</p>
                        </div>
                        <div className="rounded-lg border border-border/70 bg-card/60 p-3">
                          <p className="text-xl font-semibold">{selectedFeature.usageRate}%</p>
                          <p className="text-xs text-muted-foreground">Reach</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {Object.entries(selectedFeature.eventsByType).map(([type, count]) => (
                        <Badge key={type} variant="secondary">
                          {label(type)} {count}
                        </Badge>
                      ))}
                      {!Object.keys(selectedFeature.eventsByType).length ? (
                        <Badge variant="outline">No events yet</Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/70 bg-background/30 p-4">
                    <p className="font-semibold">Top vendors using this feature</p>
                    <div className="mt-3 space-y-2">
                      {selectedFeature.topVendors.map((vendor) => (
                        <div
                          key={`${selectedFeature.featureKey}-${vendor.vendorProfileId}`}
                          className="grid gap-3 rounded-lg border border-border/70 bg-card/50 px-3 py-3 text-sm md:grid-cols-[1fr_90px_120px]"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">{vendor.businessName}</p>
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {[vendor.contactName, vendor.city, vendor.state].filter(Boolean).join(' | ') || 'Vendor'}
                            </p>
                          </div>
                          <Badge variant="success" className="w-fit">
                            {vendor.eventCount} events
                          </Badge>
                          <p className="text-xs text-muted-foreground">{formatDate(vendor.lastUsedAt)}</p>
                        </div>
                      ))}
                      {!selectedFeature.topVendors.length ? (
                        <p className="text-sm text-muted-foreground">No vendor has used this feature yet.</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/70 bg-background/30 p-4">
                    <p className="font-semibold">Recent events</p>
                    <div className="mt-3 space-y-2">
                      {selectedEvents.map((event) => (
                        <div
                          key={event.id}
                          className="rounded-lg border border-border/70 bg-card/50 px-3 py-3 text-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium">{label(event.eventName)}</p>
                            <Badge variant="outline">{label(event.eventType)}</Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {[event.vendor.businessName, event.screenName ?? event.routeName, formatDate(event.occurredAt)]
                              .filter(Boolean)
                              .join(' | ')}
                          </p>
                        </div>
                      ))}
                      {!selectedEvents.length ? (
                        <p className="text-sm text-muted-foreground">No recent event found for this feature.</p>
                      ) : null}
                    </div>
                  </div>
                </>
              ) : (
                <p className="rounded-lg border border-dashed border-border p-8 text-sm text-muted-foreground">
                  Select a feature to inspect vendor usage.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/85">
        <CardHeader>
          <CardTitle>Frequent vendor usage</CardTitle>
          <CardDescription>Vendors ranked by feature activity and breadth.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-border/70">
            <div className="hidden grid-cols-[1.2fr_0.45fr_0.45fr_1.4fr] gap-4 bg-background/30 px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground xl:grid">
              <span>Vendor</span>
              <span>Events</span>
              <span>Features</span>
              <span>Top used features</span>
            </div>
            {data.vendors.map((vendor) => (
              <div
                key={vendor.vendorProfileId}
                className="grid gap-3 border-t border-border/70 px-4 py-3 text-sm first:border-t-0 xl:grid-cols-[1.2fr_0.45fr_0.45fr_1.4fr] xl:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{vendor.businessName}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {[vendor.contactName, vendor.city, vendor.state].filter(Boolean).join(' | ') || 'Vendor'}
                  </p>
                </div>
                <Badge variant="success" className="w-fit">
                  {vendor.eventCount}
                </Badge>
                <Badge variant="outline" className="w-fit">
                  {vendor.usedFeatureCount}
                </Badge>
                <div className="flex flex-wrap gap-2">
                  {(vendor.topFeatures ?? []).slice(0, 4).map((feature) => (
                    <Badge key={`${vendor.vendorProfileId}-${feature.featureKey}`} variant="secondary">
                      {feature.title} {feature.eventCount}
                    </Badge>
                  ))}
                  {!vendor.topFeatures?.length ? (
                    <span className="text-xs text-muted-foreground">No feature activity breakdown</span>
                  ) : null}
                </div>
              </div>
            ))}
            {!data.vendors.length ? (
              <p className="px-4 py-8 text-sm text-muted-foreground">No vendor usage events collected yet.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
