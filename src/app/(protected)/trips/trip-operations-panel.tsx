'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, Clock3, RefreshCw, Search, UserCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type VendorSummary = {
  id: number
  businessName: string | null
  ownerName: string | null
  phone: string | null
  email: string | null
  city: string | null
  state: string | null
  isVerified: boolean
  verificationStatus: string | null
  subscriptionTier: string | null
} | null

type TripSummary = {
  id: number
  status: string | null
  tripType: string | null
  route: string
  pickupPlaceName: string | null
  dropPlaceName: string | null
  pickupDatetime: string | null
  returnDatetime: string | null
  rateTotal: string | null
  distanceKm: string | null
  cabCategoryName: string | null
  cabModelName: string | null
  isPremiumOnly: boolean
  recipientCount: number
  requestCount: number
  activeRequestCount: number
  acceptedRequestCount: number
  acceptedByVendorProfileId: number | null
  ownerVendor: VendorSummary
  acceptedVendor: VendorSummary
  assignedDriver: { id: number; fullName: string | null; phone: string | null; verificationStatus: string | null } | null
  assignedCab: { id: number; cabNumber: string | null; color: string | null; status: string | null; verificationStatus: string | null } | null
  sharedAt: string | null
  acceptedAt: string | null
  driverCabAssignedAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  createdAt: string | null
  updatedAt: string | null
  conflictCount: number
}

type TimelineEvent = {
  key: string
  label: string
  status: string
  occurredAt: string | null
  actor?: string | null
  detail?: string | null
}

type ConflictFinding = {
  key: string
  severity: 'low' | 'medium' | 'high'
  badgeVariant?: 'default' | 'warning' | 'danger'
  title: string
  detail: string
  relatedIds?: number[]
}

type TripDetail = {
  trip: TripSummary
  timeline: TimelineEvent[]
  acceptedVendor: (NonNullable<VendorSummary> & {
    acceptedAt: string | null
    assignedDriver: TripSummary['assignedDriver']
    assignedCab: TripSummary['assignedCab']
    acceptedRequest: Record<string, unknown> | null
  }) | null
  conflicts: ConflictFinding[]
  recipients: Array<Record<string, any>>
  requests: Array<Record<string, any>>
  submissions: Array<Record<string, any>>
  publicLinks: Array<Record<string, any>>
}

export type TripOperationsData = {
  trips: TripSummary[]
  filters: {
    q: string
    status: string | null
    limit: number
    offset: number
  }
  analytics: {
    totalReturned: number
    byStatus: Record<string, number>
    conflictTripCount: number
  }
} | null

const STATUS_OPTIONS = ['all', 'open', 'shared', 'accepted', 'completed', 'cancelled', 'expired']

function unwrapPayload(payload: any) {
  return payload?.data?.data ?? payload?.data ?? payload
}

async function requestJson(path: string) {
  const tokenEntry = document.cookie
    .split('; ')
    .find((part) => part.startsWith('vendero_admin_access_token='))
  const token = tokenEntry?.split('=')[1] ?? null

  const response = await fetch(path, {
    headers: {
      authorization: token ? `Bearer ${token}` : '',
    },
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload?.message ?? payload?.error?.message ?? 'Request failed')
  }

  return response.json().catch(() => ({}))
}

function formatDate(value: string | null) {
  if (!value) return 'Not set'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function statusVariant(status: string | null) {
  if (status === 'accepted' || status === 'completed') return 'success'
  if (status === 'cancelled' || status === 'expired') return 'danger'
  if (status === 'shared') return 'warning'
  return 'default'
}

function conflictVariant(conflictCount: number) {
  return conflictCount > 0 ? 'danger' : 'success'
}

function vendorLabel(vendor: VendorSummary) {
  if (!vendor) return 'No vendor'
  return vendor.businessName ?? vendor.ownerName ?? `Vendor #${vendor.id}`
}

export function TripOperationsPanel({ initialData }: { initialData: TripOperationsData }) {
  const [query, setQuery] = useState(initialData?.filters.q ?? '')
  const [status, setStatus] = useState(initialData?.filters.status ?? 'all')
  const [trips, setTrips] = useState<TripSummary[]>(initialData?.trips ?? [])
  const [analytics, setAnalytics] = useState(initialData?.analytics ?? {
    totalReturned: 0,
    byStatus: {},
    conflictTripCount: 0,
  })
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null)
  const [detail, setDetail] = useState<TripDetail | null>(null)
  const [loadingList, setLoadingList] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedTrip = useMemo(
    () => trips.find((trip) => trip.id === selectedTripId) ?? null,
    [selectedTripId, trips]
  )

  async function searchTrips() {
    setLoadingList(true)
    setError(null)

    try {
      const params = new URLSearchParams({ limit: '25' })
      if (query.trim()) params.set('q', query.trim())
      if (status && status !== 'all') params.set('status', status)
      const payload = await requestJson(`/api/v1/admin/trips?${params.toString()}`)
      const data = unwrapPayload(payload)
      setTrips(data.trips ?? [])
      setAnalytics(data.analytics ?? analytics)
      setSelectedTripId(null)
      setDetail(null)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to search trips')
    } finally {
      setLoadingList(false)
    }
  }

  async function inspectTrip(id: number) {
    setSelectedTripId(id)
    setLoadingDetail(true)
    setError(null)

    try {
      const payload = await requestJson(`/api/v1/admin/trips/${id}`)
      setDetail(unwrapPayload(payload) as TripDetail)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to inspect trip')
    } finally {
      setLoadingDetail(false)
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <Card className="border-border/70 bg-card/80">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardDescription className="uppercase tracking-[0.2em] text-muted-foreground">
                Search
              </CardDescription>
              <CardTitle className="mt-2 text-2xl">Trip directory</CardTitle>
            </div>
            <Button variant="outline" onClick={searchTrips} disabled={loadingList}>
              <RefreshCw className="h-4 w-4" />
              {loadingList ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_180px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void searchTrips()
                }}
                placeholder="Search trip #, city, owner, accepted vendor"
              />
            </div>
            <select
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? 'All statuses' : option}
                </option>
              ))}
            </select>
            <Button onClick={searchTrips} disabled={loadingList}>
              Search
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-full px-3 py-1">
              Returned {analytics.totalReturned}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              Accepted {analytics.byStatus.accepted ?? 0}
            </Badge>
            <Badge variant={analytics.conflictTripCount ? 'danger' : 'success'} className="rounded-full px-3 py-1">
              Conflicts {analytics.conflictTripCount}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {error ? (
            <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </p>
          ) : null}

          {trips.map((trip) => (
            <div
              key={trip.id}
              className="rounded-xl border border-border/70 bg-background/30 p-4"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">Trip #{trip.id}</p>
                    <Badge variant={statusVariant(trip.status)}>{trip.status}</Badge>
                    {trip.isPremiumOnly ? <Badge variant="warning">Premium only</Badge> : null}
                    <Badge variant={conflictVariant(trip.conflictCount)}>
                      {trip.conflictCount ? `${trip.conflictCount} conflict` : 'No conflict'}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-foreground">{trip.route}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {vendorLabel(trip.ownerVendor)} to {vendorLabel(trip.acceptedVendor)} • Rs {trip.rateTotal ?? '-'} • {trip.distanceKm ?? '-'} km
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Pickup {formatDate(trip.pickupDatetime)} • Recipients {trip.recipientCount} • Requests {trip.requestCount}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={selectedTripId === trip.id ? 'secondary' : 'outline'}
                  onClick={() => inspectTrip(trip.id)}
                  disabled={loadingDetail && selectedTripId === trip.id}
                >
                  {loadingDetail && selectedTripId === trip.id ? 'Loading...' : 'Inspect'}
                </Button>
              </div>
            </div>
          ))}

          {!trips.length ? (
            <p className="rounded-xl border border-border/70 bg-background/30 p-5 text-sm text-muted-foreground">
              No trips found for this search.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardDescription className="uppercase tracking-[0.2em] text-muted-foreground">
              Accepted Vendor
            </CardDescription>
            <CardTitle className="mt-2 text-2xl">
              {selectedTrip ? `Trip #${selectedTrip.id}` : 'Select a trip'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {detail?.acceptedVendor ? (
              <div className="rounded-xl border border-border/70 bg-background/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{vendorLabel(detail.acceptedVendor)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {detail.acceptedVendor.ownerName ?? 'Owner not set'} • {detail.acceptedVendor.phone ?? 'No phone'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Accepted {formatDate(detail.acceptedVendor.acceptedAt)}
                    </p>
                  </div>
                  <Badge variant={detail.acceptedVendor.isVerified ? 'success' : 'warning'}>
                    {detail.acceptedVendor.verificationStatus ?? 'pending'}
                  </Badge>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border/70 bg-card/50 p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Driver</p>
                    <p className="mt-1 text-sm font-medium">
                      {detail.acceptedVendor.assignedDriver?.fullName ?? 'Not assigned'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {detail.acceptedVendor.assignedDriver?.phone ?? ''}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-card/50 p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Cab</p>
                    <p className="mt-1 text-sm font-medium">
                      {detail.acceptedVendor.assignedCab?.cabNumber ?? 'Not assigned'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {detail.acceptedVendor.assignedCab?.verificationStatus ?? ''}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="rounded-xl border border-border/70 bg-background/30 p-5 text-sm text-muted-foreground">
                {loadingDetail ? 'Loading accepted vendor...' : 'No accepted vendor is attached yet.'}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-300" />
              <CardTitle>Sharing conflict audit</CardTitle>
            </div>
            <CardDescription>Race conditions and mismatched recipient/request state.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail?.conflicts.map((conflict) => (
              <div key={conflict.key} className="rounded-xl border border-border/70 bg-background/30 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={conflict.badgeVariant ?? 'default'}>{conflict.severity}</Badge>
                  <p className="font-medium">{conflict.title}</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{conflict.detail}</p>
              </div>
            ))}
            {detail && !detail.conflicts.length ? (
              <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                No sharing conflicts detected for this trip.
              </p>
            ) : null}
            {!detail && !loadingDetail ? (
              <p className="rounded-xl border border-border/70 bg-background/30 p-5 text-sm text-muted-foreground">
                Inspect a trip to run conflict checks.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-primary" />
              <CardTitle>Trip timeline</CardTitle>
            </div>
            <CardDescription>Lifecycle events from trip state, requests, public links, and audit logs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail?.timeline.map((event) => (
              <div key={event.key} className="grid grid-cols-[24px_1fr] gap-3">
                <span className="mt-1 h-3 w-3 rounded-full bg-primary" />
                <div className="rounded-xl border border-border/70 bg-background/30 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{event.label}</p>
                    <Badge variant="outline">{formatDate(event.occurredAt)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[event.actor, event.detail].filter(Boolean).join(' • ') || event.status}
                  </p>
                </div>
              </div>
            ))}
            {detail && !detail.timeline.length ? (
              <p className="text-sm text-muted-foreground">No timeline events available.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              <CardTitle>Requests and recipients</CardTitle>
            </div>
            <CardDescription>Request state used to diagnose sharing outcomes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail?.requests.map((request) => (
              <div key={`request-${request.id}`} className="rounded-xl border border-border/70 bg-background/30 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant(String(request.status))}>{String(request.status)}</Badge>
                  <p className="font-medium">{request.businessName ?? `Vendor #${request.requesterVendorProfileId}`}</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Requested {formatDate(request.requestedAt)} • Responded {formatDate(request.respondedAt)}
                </p>
              </div>
            ))}
            {detail && !detail.requests.length ? (
              <p className="text-sm text-muted-foreground">No requests recorded for this trip.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
