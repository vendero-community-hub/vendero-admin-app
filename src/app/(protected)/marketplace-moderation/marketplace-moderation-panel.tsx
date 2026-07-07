'use client'

import { useMemo, useState } from 'react'
import {
  Ban,
  CheckCircle2,
  Flag,
  MessageSquareQuote,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingBag,
  Star,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useActionModal } from '@/components/ui/action-modal'

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

type MarketplaceListing = {
  id: number
  type: 'cab' | 'service'
  publicId: string
  title: string | null
  companyName: string | null
  description: string | null
  perKmPrice: number | null
  extraPerKmPrice: number
  fixedPrice: number | null
  tripType: string | null
  isActive: boolean
  listingStatus: string
  moderationStatus: string
  moderationNotes: string | null
  moderatedAt: string | null
  leadCount: number
  packageCount: number
  createdAt: string | null
  updatedAt: string | null
  vendor: VendorSummary
  cab: {
    id: number
    number: string | null
    color: string | null
    status: string | null
    verificationStatus: string | null
    categoryName: string | null
    modelName: string | null
  } | null
}

type MarketplaceReview = {
  id: number
  publicId: string
  reviewerType: string
  reviewerName: string | null
  reviewerPhone: string | null
  reviewerVendor: VendorSummary
  rating: number
  reviewText: string | null
  moderationStatus: string
  moderationNotes: string | null
  moderatedAt: string | null
  createdAt: string | null
  updatedAt: string | null
  vendor: VendorSummary
}

type MarketplaceLead = {
  id: number
  publicId: string
  status: string
  customerName: string | null
  customerPhone: string | null
  customerEmail: string | null
  customerMessage: string | null
  tripType: string | null
  quotedPrice: number | null
  finalPrice: number | null
  abuseStatus: string
  abuseReason: string | null
  abuseNotes: string | null
  abuseReviewedAt: string | null
  duplicatePhoneCount: number
  messageCount: number
  suspicionFlags: Array<{ key: string; label: string; severity: 'low' | 'medium' | 'high' }>
  listing: {
    type: 'cab' | 'service'
    id: number
    title: string | null
    listingStatus: string | null
    moderationStatus: string | null
  } | null
  vendor: VendorSummary
  createdAt: string | null
  updatedAt: string | null
}

type MarketplaceListingReport = {
  id: number
  publicId: string
  listingType: 'cab' | 'service'
  listingId: number
  reason: string
  notes: string | null
  status: string
  reporterName: string | null
  reporterPhone: string | null
  createdAt: string | null
  updatedAt: string | null
  vendor: VendorSummary
  listing: {
    title: string | null
    publicId: string | null
    listingStatus: string | null
    moderationStatus: string | null
  }
}

export type MarketplaceModerationData = {
  listings: MarketplaceListing[]
  reviews: MarketplaceReview[]
  listingReports: MarketplaceListingReport[]
  leads: MarketplaceLead[]
  filters: {
    q: string
    listingType: string
    listingStatus: string
    moderationStatus: string
    reviewStatus: string
    reportStatus: string
    abuseStatus: string
    limit: number
  }
  analytics: {
    pendingListings: number
    pendingReviews: number
    pendingListingReports: number
    flaggedLeads: number
    blockedLeads: number
    leads24h: number
  }
} | null

const VIEW_OPTIONS = [
  { key: 'listings', label: 'Listings', icon: ShoppingBag },
  { key: 'reviews', label: 'Reviews', icon: Star },
  { key: 'reports', label: 'Reports', icon: Flag },
  { key: 'leads', label: 'Lead Abuse', icon: Flag },
] as const

const MODERATION_STATUS_OPTIONS = ['all', 'pending', 'approved', 'rejected']
const LISTING_STATUS_OPTIONS = ['all', 'draft', 'live', 'hidden']
const LISTING_TYPE_OPTIONS = ['all', 'cab', 'service']
const REVIEW_STATUS_OPTIONS = ['all', 'pending', 'approved', 'rejected']
const REPORT_STATUS_OPTIONS = ['all', 'pending', 'reviewed', 'dismissed']
const ABUSE_STATUS_OPTIONS = ['all', 'clear', 'flagged', 'blocked', 'dismissed']

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
  if (['approved', 'live', 'clear', 'booked', 'converted'].includes(String(status))) return 'success'
  if (['rejected', 'hidden', 'blocked', 'closed', 'cancelled'].includes(String(status))) return 'danger'
  if (['pending', 'draft', 'flagged', 'new', 'contacted'].includes(String(status))) return 'warning'
  return 'secondary'
}

function vendorLabel(vendor: VendorSummary) {
  if (!vendor) return 'Unknown vendor'
  return vendor.businessName ?? vendor.ownerName ?? vendor.phone ?? `Vendor #${vendor.id}`
}

function locationLabel(vendor: VendorSummary) {
  if (!vendor) return 'No location'
  return [vendor.city, vendor.state].filter(Boolean).join(', ') || 'No location'
}

function listingTitle(listing: MarketplaceListing) {
  return listing.title ?? listing.companyName ?? `${listing.type === 'cab' ? 'Cab' : 'Service'} listing #${listing.id}`
}

function priceLabel(listing: MarketplaceListing) {
  if (listing.fixedPrice !== null) return `Fixed Rs. ${listing.fixedPrice}`
  if (listing.perKmPrice !== null) return `Rs. ${listing.perKmPrice}/km`
  return 'No price'
}

function replaceById<T extends { id: number }>(records: T[], next: T) {
  return records.map((record) => (record.id === next.id ? next : record))
}

export function MarketplaceModerationPanel({ initialData }: { initialData: MarketplaceModerationData }) {
  const [data, setData] = useState<MarketplaceModerationData>(initialData)
  const [view, setView] = useState<(typeof VIEW_OPTIONS)[number]['key']>('listings')
  const [query, setQuery] = useState(initialData?.filters.q ?? '')
  const [listingType, setListingType] = useState(initialData?.filters.listingType ?? 'all')
  const [listingStatus, setListingStatus] = useState(initialData?.filters.listingStatus ?? 'all')
  const [moderationStatus, setModerationStatus] = useState(initialData?.filters.moderationStatus ?? 'pending')
  const [reviewStatus, setReviewStatus] = useState(initialData?.filters.reviewStatus ?? 'pending')
  const [reportStatus, setReportStatus] = useState(initialData?.filters.reportStatus ?? 'pending')
  const [abuseStatus, setAbuseStatus] = useState(initialData?.filters.abuseStatus ?? 'all')
  const [working, setWorking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const actionModal = useActionModal()

  const analytics = data?.analytics ?? {
    pendingListings: 0,
    pendingReviews: 0,
    pendingListingReports: 0,
    flaggedLeads: 0,
    blockedLeads: 0,
    leads24h: 0,
  }

  const activeRecords = useMemo(() => {
    if (view === 'reviews') return data?.reviews.length ?? 0
    if (view === 'reports') return data?.listingReports.length ?? 0
    if (view === 'leads') return data?.leads.length ?? 0
    return data?.listings.length ?? 0
  }, [data?.leads.length, data?.listingReports.length, data?.listings.length, data?.reviews.length, view])

  async function refreshModeration(
    nextView = view,
    overrides: Partial<{
      query: string
      listingType: string
      listingStatus: string
      moderationStatus: string
      reviewStatus: string
      reportStatus: string
      abuseStatus: string
    }> = {}
  ) {
    setWorking('refresh')
    setError(null)

    try {
      const nextQuery = overrides.query ?? query
      const nextListingType = overrides.listingType ?? listingType
      const nextListingStatus = overrides.listingStatus ?? listingStatus
      const nextModerationStatus = overrides.moderationStatus ?? moderationStatus
      const nextReviewStatus = overrides.reviewStatus ?? reviewStatus
      const nextReportStatus = overrides.reportStatus ?? reportStatus
      const nextAbuseStatus = overrides.abuseStatus ?? abuseStatus
      const params = new URLSearchParams({ limit: '50' })
      if (nextQuery.trim()) params.set('q', nextQuery.trim())
      if (nextListingType !== 'all') params.set('listingType', nextListingType)
      if (nextListingStatus !== 'all') params.set('listingStatus', nextListingStatus)
      if (nextModerationStatus !== 'all') params.set('moderationStatus', nextModerationStatus)
      if (nextReviewStatus !== 'all') params.set('reviewStatus', nextReviewStatus)
      if (nextReportStatus !== 'all') params.set('reportStatus', nextReportStatus)
      if (nextAbuseStatus !== 'all') params.set('abuseStatus', nextAbuseStatus)

      const nextData = await requestJson(`/api/v1/admin/marketplace-moderation?${params.toString()}`)
      setData(nextData as MarketplaceModerationData)
      setView(nextView)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to refresh marketplace moderation')
    } finally {
      setWorking(null)
    }
  }

  async function moderateListing(listing: MarketplaceListing, moderationStatusNext: 'pending' | 'approved' | 'rejected') {
    const promptLabel =
      moderationStatusNext === 'approved'
        ? 'Approval notes (optional)'
        : moderationStatusNext === 'rejected'
          ? 'Rejection reason'
          : 'Pending review note'
    const notes = await actionModal.prompt({
      title: 'Moderate listing',
      label: promptLabel,
      defaultValue: moderationStatusNext === 'approved' ? '' : listing.moderationNotes ?? '',
      confirmLabel: 'Save moderation',
      textarea: true,
      variant: moderationStatusNext === 'rejected' ? 'danger' : 'default',
    })
    if (notes === null) return

    setWorking(`listing-${listing.type}-${listing.id}`)
    setError(null)

    try {
      const updated = (await requestJson(
        `/api/v1/admin/marketplace-moderation/listings/${listing.type}/${listing.id}/moderate`,
        { moderationStatus: moderationStatusNext, moderationNotes: notes || null },
        'POST'
      )) as MarketplaceListing

      setData((current) =>
        current ? { ...current, listings: replaceById(current.listings, updated) } : current
      )
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to moderate listing')
    } finally {
      setWorking(null)
    }
  }

  async function moderateReview(review: MarketplaceReview, moderationStatusNext: 'pending' | 'approved' | 'rejected') {
    const notes = await actionModal.prompt({
      title: 'Moderate review',
      label: moderationStatusNext === 'approved' ? 'Approval notes (optional)' : 'Review moderation notes',
      defaultValue: moderationStatusNext === 'approved' ? '' : review.moderationNotes ?? '',
      confirmLabel: 'Save moderation',
      textarea: true,
      variant: moderationStatusNext === 'rejected' ? 'danger' : 'default',
    })
    if (notes === null) return

    setWorking(`review-${review.id}`)
    setError(null)

    try {
      const updated = (await requestJson(
        `/api/v1/admin/marketplace-moderation/reviews/${review.id}/moderate`,
        { moderationStatus: moderationStatusNext, moderationNotes: notes || null },
        'POST'
      )) as MarketplaceReview

      setData((current) =>
        current ? { ...current, reviews: replaceById(current.reviews, updated) } : current
      )
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to moderate review')
    } finally {
      setWorking(null)
    }
  }

  async function reviewLeadAbuse(lead: MarketplaceLead, abuseStatusNext: 'clear' | 'flagged' | 'blocked' | 'dismissed') {
    const result = await actionModal.form({
      title: abuseStatusNext === 'clear' ? 'Clear lead abuse status?' : 'Review lead abuse status',
      description: `Set this lead to ${abuseStatusNext}.`,
      confirmLabel: 'Save review',
      variant: abuseStatusNext === 'blocked' ? 'danger' : 'default',
      fields:
        abuseStatusNext === 'clear'
          ? [
              {
                name: 'notes',
                label: 'Moderator notes (optional)',
                defaultValue: lead.abuseNotes ?? '',
                type: 'textarea',
              },
            ]
          : [
              {
                name: 'reason',
                label: 'Abuse reason',
                defaultValue: lead.abuseReason ?? abuseStatusNext,
                required: true,
                type: 'textarea',
              },
              {
                name: 'notes',
                label: 'Moderator notes (optional)',
                defaultValue: lead.abuseNotes ?? '',
                type: 'textarea',
              },
            ],
    })
    if (!result.confirmed) return
    const reason = abuseStatusNext === 'clear' ? null : result.values.reason
    const notes = result.values.notes ?? ''

    setWorking(`lead-${lead.id}`)
    setError(null)

    try {
      const updated = (await requestJson(
        `/api/v1/admin/marketplace-moderation/leads/${lead.id}/abuse`,
        { abuseStatus: abuseStatusNext, abuseReason: reason, abuseNotes: notes || null },
        'POST'
      )) as MarketplaceLead

      setData((current) => (current ? { ...current, leads: replaceById(current.leads, updated) } : current))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update lead abuse status')
    } finally {
      setWorking(null)
    }
  }

  return (
    <>
    <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Card className="border-border/70 bg-card/80">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardDescription className="uppercase tracking-[0.2em] text-muted-foreground">
                Queue
              </CardDescription>
              <CardTitle className="mt-2 text-2xl">Marketplace trust desk</CardTitle>
            </div>
            <Button variant="outline" onClick={() => void refreshModeration()} disabled={working === 'refresh'}>
              <RefreshCw className="h-4 w-4" />
              {working === 'refresh' ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void refreshModeration()
                }}
                placeholder="Search vendor, listing, customer, phone, or review text"
              />
            </div>
            <Button onClick={() => void refreshModeration()} disabled={working === 'refresh'}>
              Search
            </Button>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            <select
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              value={listingType}
              onChange={(event) => setListingType(event.target.value)}
            >
              {LISTING_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? 'All listing types' : option}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              value={moderationStatus}
              onChange={(event) => setModerationStatus(event.target.value)}
            >
              {MODERATION_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? 'All moderation' : option}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              value={listingStatus}
              onChange={(event) => setListingStatus(event.target.value)}
            >
              {LISTING_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? 'All listing statuses' : option}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              value={reviewStatus}
              onChange={(event) => setReviewStatus(event.target.value)}
            >
              {REVIEW_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? 'All reviews' : option}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              value={reportStatus}
              onChange={(event) => setReportStatus(event.target.value)}
            >
              {REPORT_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? 'All reports' : option}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              value={abuseStatus}
              onChange={(event) => setAbuseStatus(event.target.value)}
            >
              {ABUSE_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? 'All lead abuse' : option}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            {VIEW_OPTIONS.map((option) => {
              const Icon = option.icon
              const active = view === option.key
              return (
                <Button
                  key={option.key}
                  variant={active ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setView(option.key)}
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                </Button>
              )
            })}
          </div>

          {error ? (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </div>
          ) : null}
        </CardHeader>

        <CardContent className="grid grid-cols-2 gap-3 text-sm md:grid-cols-6">
          <div className="rounded-lg border border-border/70 bg-background/30 p-3">
            <p className="text-muted-foreground">Listings</p>
            <p className="mt-1 text-xl font-semibold">{analytics.pendingListings}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/30 p-3">
            <p className="text-muted-foreground">Reviews</p>
            <p className="mt-1 text-xl font-semibold">{analytics.pendingReviews}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/30 p-3">
            <p className="text-muted-foreground">Reports</p>
            <p className="mt-1 text-xl font-semibold">{analytics.pendingListingReports}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/30 p-3">
            <p className="text-muted-foreground">Flagged</p>
            <p className="mt-1 text-xl font-semibold">{analytics.flaggedLeads}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/30 p-3">
            <p className="text-muted-foreground">Blocked</p>
            <p className="mt-1 text-xl font-semibold">{analytics.blockedLeads}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/30 p-3">
            <p className="text-muted-foreground">Returned</p>
            <p className="mt-1 text-xl font-semibold">{activeRecords}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle>
            {view === 'reviews'
              ? 'Review moderation'
              : view === 'reports'
                ? 'Listing reports'
                : view === 'leads'
                  ? 'Lead abuse monitoring'
                  : 'Listing approval'}
          </CardTitle>
          <CardDescription>
            {view === 'reviews'
              ? 'Approve, reject, or return public marketplace reviews to pending review.'
              : view === 'reports'
                ? 'Inspect reported public listings and resolve them through listing moderation.'
              : view === 'leads'
                ? 'Flag, block, clear, or dismiss suspicious marketplace leads.'
                : 'Approve marketplace listings into public inventory or reject them back to hidden state.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {view === 'listings'
            ? data?.listings.map((listing) => (
                <div key={`${listing.type}-${listing.id}`} className="rounded-lg border border-border/70 bg-background/30 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="uppercase">
                          {listing.type}
                        </Badge>
                        <Badge variant={toneForStatus(listing.moderationStatus)}>
                          {listing.moderationStatus}
                        </Badge>
                        <Badge variant={toneForStatus(listing.listingStatus)}>
                          {listing.listingStatus}
                        </Badge>
                        {!listing.isActive ? <Badge variant="secondary">inactive</Badge> : null}
                      </div>
                      <h3 className="truncate text-lg font-semibold">{listingTitle(listing)}</h3>
                      <p className="text-sm text-muted-foreground">
                        {vendorLabel(listing.vendor)} / {locationLabel(listing.vendor)}
                      </p>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {listing.description ?? 'No listing description'}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{priceLabel(listing)}</span>
                        <span>{listing.cab?.categoryName ?? 'No category'}</span>
                        <span>{listing.cab?.modelName ?? 'No model'}</span>
                        <span>{listing.leadCount} leads</span>
                      </div>
                      {listing.moderationNotes ? (
                        <p className="rounded-md bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                          {listing.moderationNotes}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => void moderateListing(listing, 'approved')}
                        disabled={working === `listing-${listing.type}-${listing.id}`}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-rose-500/30 text-rose-200 hover:bg-rose-500/10"
                        onClick={() => void moderateListing(listing, 'rejected')}
                        disabled={working === `listing-${listing.type}-${listing.id}`}
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void moderateListing(listing, 'pending')}
                        disabled={working === `listing-${listing.type}-${listing.id}`}
                      >
                        <RotateCcw className="h-4 w-4" />
                        Pending
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            : null}

          {view === 'reviews'
            ? data?.reviews.map((review) => (
                <div key={review.id} className="rounded-lg border border-border/70 bg-background/30 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={toneForStatus(review.moderationStatus)}>
                          {review.moderationStatus}
                        </Badge>
                        <Badge variant="outline">{review.rating}/5</Badge>
                        <Badge variant="secondary">{review.reviewerType}</Badge>
                      </div>
                      <h3 className="text-lg font-semibold">{vendorLabel(review.vendor)}</h3>
                      <p className="text-sm text-muted-foreground">
                        By {review.reviewerName ?? vendorLabel(review.reviewerVendor)} / {review.reviewerPhone ?? 'No phone'}
                      </p>
                      <p className="line-clamp-3 text-sm text-muted-foreground">
                        {review.reviewText ?? 'No review text'}
                      </p>
                      <p className="text-xs text-muted-foreground">Submitted {formatDate(review.createdAt)}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => void moderateReview(review, 'approved')}
                        disabled={working === `review-${review.id}`}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-rose-500/30 text-rose-200 hover:bg-rose-500/10"
                        onClick={() => void moderateReview(review, 'rejected')}
                        disabled={working === `review-${review.id}`}
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void moderateReview(review, 'pending')}
                        disabled={working === `review-${review.id}`}
                      >
                        <RotateCcw className="h-4 w-4" />
                        Pending
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            : null}

          {view === 'reports'
            ? data?.listingReports.map((report) => (
                <div key={report.id} className="rounded-lg border border-border/70 bg-background/30 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={toneForStatus(report.status)}>{report.status}</Badge>
                        <Badge variant="outline" className="uppercase">
                          {report.listingType}
                        </Badge>
                        <Badge variant={toneForStatus(report.listing.moderationStatus)}>
                          {report.listing.moderationStatus ?? 'unknown'}
                        </Badge>
                      </div>
                      <h3 className="truncate text-lg font-semibold">
                        {report.listing.title ?? `Listing #${report.listingId}`}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {vendorLabel(report.vendor)} / Reported by {report.reporterName ?? report.reporterPhone ?? 'public user'}
                      </p>
                      <p className="line-clamp-3 text-sm text-muted-foreground">
                        {report.notes ?? report.reason}
                      </p>
                      <p className="text-xs text-muted-foreground">Reported {formatDate(report.createdAt)}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const nextFilters = {
                            query: String(report.listingId),
                            listingType: report.listingType,
                            moderationStatus: 'all',
                          }
                          setQuery(nextFilters.query)
                          setListingType(nextFilters.listingType)
                          setModerationStatus(nextFilters.moderationStatus)
                          void refreshModeration('listings', nextFilters)
                        }}
                      >
                        <ShoppingBag className="h-4 w-4" />
                        Review listing
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            : null}

          {view === 'leads'
            ? data?.leads.map((lead) => (
                <div key={lead.id} className="rounded-lg border border-border/70 bg-background/30 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={toneForStatus(lead.abuseStatus)}>{lead.abuseStatus}</Badge>
                        <Badge variant={toneForStatus(lead.status)}>{lead.status}</Badge>
                        <Badge variant="outline">{lead.duplicatePhoneCount} recent phone matches</Badge>
                        <Badge variant="outline">{lead.messageCount} messages</Badge>
                      </div>
                      <h3 className="truncate text-lg font-semibold">
                        {lead.customerName ?? 'Unknown customer'} / {lead.customerPhone ?? 'No phone'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {vendorLabel(lead.vendor)} / {lead.listing?.title ?? 'No listing'}
                      </p>
                      <p className="line-clamp-3 text-sm text-muted-foreground">
                        {lead.customerMessage ?? 'No customer message'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {lead.suspicionFlags.length ? (
                          lead.suspicionFlags.map((flag) => (
                            <Badge
                              key={flag.key}
                              variant={flag.severity === 'high' ? 'danger' : 'warning'}
                            >
                              {flag.label}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="success">No automatic flags</Badge>
                        )}
                      </div>
                      {lead.abuseNotes ? (
                        <p className="rounded-md bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                          {lead.abuseNotes}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void reviewLeadAbuse(lead, 'flagged')}
                        disabled={working === `lead-${lead.id}`}
                      >
                        <Flag className="h-4 w-4" />
                        Flag
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-rose-500/30 text-rose-200 hover:bg-rose-500/10"
                        onClick={() => void reviewLeadAbuse(lead, 'blocked')}
                        disabled={working === `lead-${lead.id}`}
                      >
                        <Ban className="h-4 w-4" />
                        Block
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => void reviewLeadAbuse(lead, 'clear')}
                        disabled={working === `lead-${lead.id}`}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Clear
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void reviewLeadAbuse(lead, 'dismissed')}
                        disabled={working === `lead-${lead.id}`}
                      >
                        <MessageSquareQuote className="h-4 w-4" />
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            : null}

          {activeRecords === 0 ? (
            <div className="rounded-lg border border-border/70 bg-background/30 p-6 text-center text-sm text-muted-foreground">
              No records match the current filters.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
    {actionModal.modal}
    </>
  )
}
