'use client'

import { useMemo, useState } from 'react'
import { Ban, Eye, FileText, Link2, MousePointerClick, RefreshCw, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type BadgeTone = 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger'

type VendorSummary = {
  id: number
  userId: number | null
  businessName: string | null
  ownerName: string | null
  phone: string | null
  email: string | null
  city: string | null
  state: string | null
  verificationStatus: string | null
  isVerified: boolean
} | null

type WhiteLabelLink = {
  id: number
  publicToken: string
  linkType: string
  scope: string | null
  status: string
  revokedReason: string | null
  accessCount: number
  submittedCount: number
  convertedCount: number
  eventCount: number
  openedEventCount: number
  submittedEventCount: number
  tripSubmissionCount: number
  lastAccessedAt: string | null
  expiresAt: string | null
  expiredAt: string | null
  revokedAt: string | null
  createdAt: string | null
  vendor: VendorSummary
  trip: {
    id: number
    status: string | null
    tripType: string | null
    pickupDatetime: string | null
    returnDatetime: string | null
    rateTotal: string | null
  } | null
  lead: {
    id: number
    customId: string | null
    status: string | null
    customerName: string | null
    customerPhone: string | null
    estimatedFare: string | null
    finalFare: string | null
    lastCustomerActivityAt: string | null
  } | null
}

type WhiteLabelSubmission = {
  type: 'trip_customer' | 'lead'
  id: number
  publicLinkTokenId: number | null
  link: {
    id: number | null
    publicToken: string | null
    status: string | null
    linkType: string | null
  }
  vendor: VendorSummary
  trip?: {
    id: number
    status: string | null
    tripType: string | null
    pickupDatetime: string | null
  }
  lead?: {
    id: number
    customId: string | null
    status: string | null
    tripType: string | null
    estimatedFare: string | null
    finalFare: string | null
    lastCustomerActivityAt: string | null
  }
  customerName: string | null
  customerPhone: string | null
  pickupAddress: string | null
  dropAddress: string | null
  supportActionRequested?: boolean
  status: string | null
  submittedAt: string | null
  createdAt: string | null
  deviceMetadata?: Record<string, unknown>
  locationMetadata?: Record<string, unknown>
}

type PublicAccessEvent = {
  id: number
  publicLinkTokenId: number
  eventType: string
  ipAddress: string | null
  userAgent: string | null
  deviceMetadata: Record<string, unknown>
  locationMetadata: Record<string, unknown>
  metadata: Record<string, unknown>
  createdAt: string | null
  link: {
    id: number
    publicToken: string | null
    linkType: string | null
    status: string | null
    scope: string | null
  }
  vendor: VendorSummary
  tripId: number | null
  leadId: number | null
}

type LinkDetail = {
  link: WhiteLabelLink
  events: PublicAccessEvent[]
  tripSubmissions: WhiteLabelSubmission[]
  analytics: {
    totals: Record<string, number>
    counters: {
      accessCount: number
      submittedCount: number
      convertedCount: number
    }
  }
}

export type WhiteLabelAdminData = {
  links: WhiteLabelLink[]
  submissions: WhiteLabelSubmission[]
  events: PublicAccessEvent[]
  filters: {
    q: string
    status: string
    type: string
    limit: number
  }
  analytics: {
    byStatus: Record<string, number>
    byType: Record<string, number>
    submissions24h: number
    access24h: number
  }
} | null

const VIEW_OPTIONS = [
  { key: 'links', label: 'Links', icon: Link2 },
  { key: 'submissions', label: 'Submissions', icon: FileText },
  { key: 'access', label: 'Access Audit', icon: MousePointerClick },
] as const

function unwrapPayload(payload: any) {
  return payload?.data?.data ?? payload?.data ?? payload
}

function getAdminToken() {
  const tokenEntry = document.cookie
    .split('; ')
    .find((part) => part.startsWith('vendero_admin_access_token='))
  return tokenEntry?.split('=')[1] ?? null
}

async function requestJson(path: string, body?: Record<string, unknown>, method = 'GET') {
  const token = getAdminToken()
  const response = await fetch(path, {
    method,
    headers: {
      'content-type': 'application/json',
      authorization: token ? `Bearer ${token}` : '',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.message ?? payload?.error?.message ?? 'Request failed')
  }

  return unwrapPayload(payload)
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not set'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function toneForStatus(status: string | null | undefined): BadgeTone {
  if (['active', 'submitted', 'assigned', 'open', 'converted'].includes(String(status))) return 'success'
  if (['revoked', 'expired', 'cancelled', 'failed'].includes(String(status))) return 'danger'
  if (['draft', 'viewed', 'pending', 'negotiating'].includes(String(status))) return 'warning'
  return 'secondary'
}

function vendorLabel(vendor: VendorSummary) {
  if (!vendor) return 'Unknown vendor'
  return vendor.businessName ?? vendor.ownerName ?? vendor.phone ?? `Vendor #${vendor.id}`
}

function destinationLabel(link: WhiteLabelLink) {
  if (link.trip) return `Trip #${link.trip.id}`
  if (link.lead) return link.lead.customId ?? `Lead #${link.lead.id}`
  return 'No destination'
}

function metadataSummary(value: Record<string, unknown>) {
  const entries = Object.entries(value).filter(([, entry]) => entry !== null && entry !== '')
  if (!entries.length) return 'No metadata'
  return entries
    .slice(0, 3)
    .map(([key, entry]) => `${key}: ${String(entry)}`)
    .join(' • ')
}

export function WhiteLabelAdminPanel({ initialData }: { initialData: WhiteLabelAdminData }) {
  const [data, setData] = useState<WhiteLabelAdminData>(initialData)
  const [view, setView] = useState<(typeof VIEW_OPTIONS)[number]['key']>('links')
  const [query, setQuery] = useState(initialData?.filters.q ?? '')
  const [status, setStatus] = useState(initialData?.filters.status ?? 'all')
  const [type, setType] = useState(initialData?.filters.type ?? 'all')
  const [selectedLinkId, setSelectedLinkId] = useState<number | null>(null)
  const [detail, setDetail] = useState<LinkDetail | null>(null)
  const [working, setWorking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectedLink = useMemo(
    () => data?.links.find((link) => link.id === selectedLinkId) ?? detail?.link ?? null,
    [data?.links, detail?.link, selectedLinkId]
  )

  async function refreshLinks(nextView = view) {
    setWorking('refresh')
    setError(null)

    try {
      const params = new URLSearchParams({ limit: '50' })
      if (query.trim()) params.set('q', query.trim())
      if (status !== 'all') params.set('status', status)
      if (type !== 'all') params.set('type', type)
      const nextData = await requestJson(`/api/v1/admin/links/overview?${params.toString()}`)
      setData(nextData as WhiteLabelAdminData)
      setView(nextView)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to refresh white-label data')
    } finally {
      setWorking(null)
    }
  }

  async function inspectLink(id: number) {
    setSelectedLinkId(id)
    setWorking(`link-${id}`)
    setError(null)

    try {
      const nextDetail = await requestJson(`/api/v1/admin/links/${id}`)
      setDetail(nextDetail as LinkDetail)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to inspect public link')
    } finally {
      setWorking(null)
    }
  }

  async function revokeLink(id: number) {
    const reason = window.prompt('Revoke reason')
    if (!reason?.trim()) return
    setWorking(`revoke-${id}`)
    setError(null)

    try {
      await requestJson(`/api/v1/admin/links/${id}/revoke`, { reason: reason.trim() }, 'POST')
      await refreshLinks('links')
      await inspectLink(id)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to revoke public link')
    } finally {
      setWorking(null)
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <Card className="border-border/70 bg-card/80">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardDescription className="uppercase tracking-[0.2em] text-muted-foreground">
                White-Label Admin
              </CardDescription>
              <CardTitle className="mt-2 text-2xl">Link, submission, and access audit</CardTitle>
            </div>
            <Button variant="outline" onClick={() => refreshLinks()} disabled={working === 'refresh'}>
              <RefreshCw className="h-4 w-4" />
              {working === 'refresh' ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_150px_150px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void refreshLinks()
                }}
                placeholder="Search token, vendor, trip, lead, phone"
              />
            </div>
            <select
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="revoked">Revoked</option>
              <option value="expired">Expired</option>
            </select>
            <select
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="all">All types</option>
              <option value="trip_customer">Trip customer</option>
              <option value="lead">Lead</option>
              <option value="tracking">Tracking</option>
            </select>
            <Button onClick={() => refreshLinks()} disabled={working === 'refresh'}>
              Search
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-full px-3 py-1">
              Links {data?.links.length ?? 0}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              Trip links {data?.analytics.byType.trip_customer ?? 0}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              Lead links {data?.analytics.byType.lead ?? 0}
            </Badge>
            <Badge variant={data?.analytics.byStatus.revoked ? 'warning' : 'success'} className="rounded-full px-3 py-1">
              Revoked {data?.analytics.byStatus.revoked ?? 0}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            {VIEW_OPTIONS.map((option) => {
              const Icon = option.icon
              return (
                <Button
                  key={option.key}
                  size="sm"
                  variant={view === option.key ? 'secondary' : 'outline'}
                  onClick={() => setView(option.key)}
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                </Button>
              )
            })}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {error ? (
            <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </p>
          ) : null}

          {view === 'links' ? (
            <>
              {data?.links.map((link) => (
                <div key={link.id} className="rounded-xl border border-border/70 bg-background/30 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{link.linkType} #{link.id}</p>
                        <Badge variant={toneForStatus(link.status)}>{link.status}</Badge>
                        <Badge variant="outline">{link.scope ?? 'legacy'}</Badge>
                      </div>
                      <p className="mt-2 text-sm">{destinationLabel(link)} • {vendorLabel(link.vendor)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Token {link.publicToken} • Opens {link.accessCount} • Submits {link.submittedCount}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Last access {formatDate(link.lastAccessedAt)} • Expires {formatDate(link.expiresAt)}
                      </p>
                      {link.revokedReason ? <p className="mt-2 text-sm text-rose-200">{link.revokedReason}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={selectedLinkId === link.id ? 'secondary' : 'outline'}
                        onClick={() => inspectLink(link.id)}
                        disabled={working === `link-${link.id}`}
                      >
                        <Eye className="h-4 w-4" />
                        Inspect
                      </Button>
                      {link.status === 'active' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => revokeLink(link.id)}
                          disabled={working === `revoke-${link.id}`}
                        >
                          <Ban className="h-4 w-4" />
                          Revoke
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
              {!data?.links.length ? (
                <p className="rounded-xl border border-border/70 bg-background/30 p-5 text-sm text-muted-foreground">
                  No public links found for this filter.
                </p>
              ) : null}
            </>
          ) : null}

          {view === 'submissions' ? (
            <>
              {data?.submissions.map((submission) => (
                <div key={`${submission.type}-${submission.id}`} className="rounded-xl border border-border/70 bg-background/30 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{submission.type === 'lead' ? 'lead' : 'trip customer'}</Badge>
                    <Badge variant={toneForStatus(submission.status)}>{submission.status ?? 'unknown'}</Badge>
                    {submission.supportActionRequested ? <Badge variant="warning">support requested</Badge> : null}
                  </div>
                  <p className="mt-3 font-medium">
                    {submission.customerName ?? 'Customer'} • {submission.customerPhone ?? 'No phone'}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {submission.trip ? `Trip #${submission.trip.id}` : submission.lead?.customId ?? 'Lead'} • {vendorLabel(submission.vendor)}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {[submission.pickupAddress, submission.dropAddress].filter(Boolean).join(' to ') || 'Route not supplied'}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Submitted {formatDate(submission.submittedAt)} • Link {submission.link.publicToken ?? '-'}
                  </p>
                </div>
              ))}
              {!data?.submissions.length ? (
                <p className="rounded-xl border border-border/70 bg-background/30 p-5 text-sm text-muted-foreground">
                  No customer submissions found.
                </p>
              ) : null}
            </>
          ) : null}

          {view === 'access' ? (
            <>
              {data?.events.map((event) => (
                <div key={event.id} className="rounded-xl border border-border/70 bg-background/30 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={toneForStatus(event.eventType)}>{event.eventType}</Badge>
                    <Badge variant="outline">{event.link.linkType ?? 'link'}</Badge>
                    <p className="text-sm font-medium">Token {event.link.publicToken ?? event.publicLinkTokenId}</p>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {vendorLabel(event.vendor)} • IP {event.ipAddress ?? 'unknown'}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{metadataSummary(event.deviceMetadata)}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {formatDate(event.createdAt)}
                  </p>
                </div>
              ))}
              {!data?.events.length ? (
                <p className="rounded-xl border border-border/70 bg-background/30 p-5 text-sm text-muted-foreground">
                  No public access events recorded yet.
                </p>
              ) : null}
            </>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardDescription className="uppercase tracking-[0.2em] text-muted-foreground">
              Link Inspector
            </CardDescription>
            <CardTitle className="mt-2 text-2xl">
              {selectedLink ? `${selectedLink.linkType} #${selectedLink.id}` : 'Select a public link'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {detail ? (
              <>
                <div className="rounded-xl border border-border/70 bg-background/30 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={toneForStatus(detail.link.status)}>{detail.link.status}</Badge>
                    <Badge variant="outline">{detail.link.scope ?? 'legacy'}</Badge>
                  </div>
                  <p className="mt-3 font-semibold">Token {detail.link.publicToken}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {destinationLabel(detail.link)} • {vendorLabel(detail.link.vendor)}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Opens {detail.analytics.counters.accessCount} • Submits {detail.analytics.counters.submittedCount} • Converts {detail.analytics.counters.convertedCount}
                  </p>
                  {detail.link.status === 'active' ? (
                    <Button className="mt-4" variant="outline" onClick={() => revokeLink(detail.link.id)}>
                      <Ban className="h-4 w-4" />
                      Revoke access
                    </Button>
                  ) : null}
                </div>

                <div className="rounded-xl border border-border/70 bg-background/30 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Submission detail</p>
                  <div className="mt-3 space-y-3">
                    {detail.tripSubmissions.map((submission) => (
                      <div key={submission.id} className="rounded-lg border border-border/70 bg-card/50 p-3">
                        <p className="text-sm font-medium">
                          {submission.customerName ?? 'Customer'} • {submission.customerPhone ?? 'No phone'}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDate(submission.submittedAt)} • {submission.pickupAddress ?? 'Pickup not set'}
                        </p>
                      </div>
                    ))}
                    {!detail.tripSubmissions.length ? (
                      <p className="text-sm text-muted-foreground">No trip submissions for this link.</p>
                    ) : null}
                  </div>
                </div>
              </>
            ) : (
              <p className="rounded-xl border border-border/70 bg-background/30 p-5 text-sm text-muted-foreground">
                Inspect a link to view counters, submissions, and customer access history.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Customer Access History</CardTitle>
            <CardDescription>Event stream for the selected public link.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail?.events.map((event) => (
              <div key={event.id} className="rounded-xl border border-border/70 bg-background/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge variant={toneForStatus(event.eventType)}>{event.eventType}</Badge>
                  <Badge variant="outline">{formatDate(event.createdAt)}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  IP {event.ipAddress ?? 'unknown'} • {metadataSummary(event.locationMetadata)}
                </p>
                <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                  {event.userAgent ?? 'No user agent'}
                </p>
              </div>
            ))}
            {detail && !detail.events.length ? (
              <p className="text-sm text-muted-foreground">No events recorded for this link.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

