'use client'

import { useMemo, useState } from 'react'
import { Pencil, RefreshCw, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type BadgeTone = 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger'
type FeatureStatus = 'available' | 'coming_soon'
type InterestType = 'waitlist' | 'early_access'
type InterestStatus = 'new' | 'in_review' | 'approved' | 'rejected' | 'contacted'

type FeatureStats = {
  total: number
  waitlist: number
  earlyAccess: number
  new: number
  inReview: number
  approved: number
  rejected: number
  contacted: number
}

type FeatureCard = {
  id: number
  publicId: string
  title: string
  body: string
  status: FeatureStatus
  tag: string | null
  sortOrder: number
  isPublished: boolean
  allowWaitlist: boolean
  allowEarlyAccess: boolean
  stats: FeatureStats
  createdAt: string | null
  updatedAt: string | null
}

type FeatureInterest = {
  id: number
  publicId: string
  featureId: number
  userId: number
  vendorProfileId: number | null
  interestType: InterestType
  status: InterestStatus
  adminNotes: string | null
  createdAt: string | null
  feature: {
    id: number
    title: string | null
    status: FeatureStatus | null
  }
  user: {
    id: number | null
    fullName: string | null
    phone: string | null
    email: string | null
  }
  vendor: {
    id: number | null
    businessName: string | null
    contactName: string | null
  }
}

export type FeatureControlData = {
  summary: {
    featureCount: number
    publishedCount: number
    availableCount: number
    comingSoonCount: number
    waitlistCount: number
    earlyAccessCount: number
    openInterestCount: number
  }
  features: FeatureCard[]
  interests: FeatureInterest[]
} | null

type FeatureForm = {
  id?: number
  title: string
  body: string
  status: FeatureStatus
  tag: string
  sortOrder: string
  isPublished: boolean
  allowWaitlist: boolean
  allowEarlyAccess: boolean
}

const emptyFeatureForm: FeatureForm = {
  title: '',
  body: '',
  status: 'coming_soon',
  tag: 'Upcoming',
  sortOrder: '100',
  isPublished: true,
  allowWaitlist: true,
  allowEarlyAccess: true,
}

const interestStatuses: InterestStatus[] = ['new', 'in_review', 'approved', 'rejected', 'contacted']

function getAdminToken() {
  const tokenEntry = document.cookie
    .split('; ')
    .find((part) => part.startsWith('vendero_admin_access_token='))
  return tokenEntry?.split('=')[1] ?? null
}

function unwrapPayload(payload: any) {
  return payload?.data?.data ?? payload?.data ?? payload
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

function label(value: string) {
  return value.replace(/_/g, ' ')
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

function toneForStatus(status: string): BadgeTone {
  if (status === 'available' || status === 'approved' || status === 'contacted') return 'success'
  if (status === 'coming_soon' || status === 'new' || status === 'in_review') return 'warning'
  if (status === 'rejected') return 'danger'
  return 'secondary'
}

function fallbackData(): NonNullable<FeatureControlData> {
  return {
    summary: {
      featureCount: 0,
      publishedCount: 0,
      availableCount: 0,
      comingSoonCount: 0,
      waitlistCount: 0,
      earlyAccessCount: 0,
      openInterestCount: 0,
    },
    features: [],
    interests: [],
  }
}

function formFromFeature(feature: FeatureCard): FeatureForm {
  return {
    id: feature.id,
    title: feature.title,
    body: feature.body,
    status: feature.status,
    tag: feature.tag ?? '',
    sortOrder: String(feature.sortOrder),
    isPublished: feature.isPublished,
    allowWaitlist: feature.allowWaitlist,
    allowEarlyAccess: feature.allowEarlyAccess,
  }
}

export function FeatureControlPanel({ initialData }: { initialData: FeatureControlData }) {
  const [data, setData] = useState<NonNullable<FeatureControlData>>(initialData ?? fallbackData())
  const [featureForm, setFeatureForm] = useState<FeatureForm>(emptyFeatureForm)
  const [interestDrafts, setInterestDrafts] = useState<Record<number, { status: InterestStatus; adminNotes: string }>>({})
  const [working, setWorking] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const sortedFeatures = useMemo(
    () => [...data.features].sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id),
    [data.features]
  )

  async function refresh() {
    const nextData = (await requestJson('/api/v1/admin/features')) as NonNullable<FeatureControlData>
    setData(nextData)
  }

  async function submitFeature() {
    setWorking('feature')
    setMessage('')
    try {
      const body = {
        title: featureForm.title.trim(),
        body: featureForm.body.trim(),
        status: featureForm.status,
        tag: featureForm.tag.trim() || null,
        sortOrder: Number(featureForm.sortOrder || 0),
        isPublished: featureForm.isPublished,
        allowWaitlist: featureForm.allowWaitlist,
        allowEarlyAccess: featureForm.allowEarlyAccess,
      }

      if (featureForm.id) {
        await requestJson(`/api/v1/admin/features/${featureForm.id}`, body, 'PUT')
        setMessage('Feature card updated.')
      } else {
        await requestJson('/api/v1/admin/features', body, 'POST')
        setMessage('Feature card created.')
      }

      setFeatureForm(emptyFeatureForm)
      await refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save feature')
    } finally {
      setWorking(null)
    }
  }

  async function deleteFeature(feature: FeatureCard) {
    const confirmed = window.confirm(`Delete ${feature.title}? Waitlist and early access rows for this card will also be removed.`)
    if (!confirmed) return

    setWorking(`delete-${feature.id}`)
    setMessage('')
    try {
      await requestJson(`/api/v1/admin/features/${feature.id}`, undefined, 'DELETE')
      setMessage('Feature card deleted.')
      await refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to delete feature')
    } finally {
      setWorking(null)
    }
  }

  function draftFor(interest: FeatureInterest) {
    return interestDrafts[interest.id] ?? {
      status: interest.status,
      adminNotes: interest.adminNotes ?? '',
    }
  }

  function updateDraft(interest: FeatureInterest, patch: Partial<{ status: InterestStatus; adminNotes: string }>) {
    setInterestDrafts((current) => ({
      ...current,
      [interest.id]: {
        status: patch.status ?? current[interest.id]?.status ?? interest.status,
        adminNotes: patch.adminNotes ?? current[interest.id]?.adminNotes ?? interest.adminNotes ?? '',
      },
    }))
  }

  async function saveInterest(interest: FeatureInterest) {
    const draft = draftFor(interest)
    setWorking(`interest-${interest.id}`)
    setMessage('')
    try {
      await requestJson(
        `/api/v1/admin/features/interests/${interest.id}/status`,
        { status: draft.status, adminNotes: draft.adminNotes.trim() || null },
        'POST'
      )
      setMessage('Feature request updated.')
      await refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update request')
    } finally {
      setWorking(null)
    }
  }

  return (
    <section className="space-y-6">
      {message ? <p className="rounded-md border border-border/70 bg-background/40 px-4 py-3 text-sm text-muted-foreground">{message}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <CardTitle>{featureForm.id ? 'Edit feature card' : 'Create feature card'}</CardTitle>
            <CardDescription>Controls what vendors see on the mobile New Features screen.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={featureForm.title}
              onChange={(event) => setFeatureForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Feature title"
            />
            <textarea
              value={featureForm.body}
              onChange={(event) => setFeatureForm((current) => ({ ...current, body: event.target.value }))}
              placeholder="Feature description"
              className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <select
                value={featureForm.status}
                onChange={(event) => setFeatureForm((current) => ({ ...current, status: event.target.value as FeatureStatus }))}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="available">Available now</option>
                <option value="coming_soon">Coming soon</option>
              </select>
              <Input
                value={featureForm.tag}
                onChange={(event) => setFeatureForm((current) => ({ ...current, tag: event.target.value }))}
                placeholder="Tag"
              />
              <Input
                value={featureForm.sortOrder}
                onChange={(event) => setFeatureForm((current) => ({ ...current, sortOrder: event.target.value }))}
                placeholder="Sort"
                type="number"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={featureForm.isPublished}
                  onChange={(event) => setFeatureForm((current) => ({ ...current, isPublished: event.target.checked }))}
                />
                Published
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={featureForm.allowWaitlist}
                  onChange={(event) => setFeatureForm((current) => ({ ...current, allowWaitlist: event.target.checked }))}
                />
                Waitlist
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={featureForm.allowEarlyAccess}
                  onChange={(event) => setFeatureForm((current) => ({ ...current, allowEarlyAccess: event.target.checked }))}
                />
                Early access
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={submitFeature}
                disabled={working === 'feature' || !featureForm.title.trim() || !featureForm.body.trim()}
              >
                {working === 'feature' ? 'Saving...' : featureForm.id ? 'Save feature' : 'Create feature'}
              </Button>
              {featureForm.id ? (
                <Button type="button" variant="outline" onClick={() => setFeatureForm(emptyFeatureForm)}>
                  Cancel edit
                </Button>
              ) : null}
              <Button type="button" variant="outline" onClick={refresh}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <CardTitle>Feature cards</CardTitle>
            <CardDescription>Published cards appear in Available now or Coming soon on mobile.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!sortedFeatures.length ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No feature cards found.
              </div>
            ) : (
              sortedFeatures.map((feature) => (
                <article key={feature.id} className="rounded-xl border border-border/70 bg-background/30 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={toneForStatus(feature.status)}>{feature.status === 'available' ? 'available now' : 'coming soon'}</Badge>
                        <Badge variant={feature.isPublished ? 'success' : 'secondary'}>{feature.isPublished ? 'published' : 'draft'}</Badge>
                        {feature.tag ? <Badge variant="outline">{feature.tag}</Badge> : null}
                      </div>
                      <h3 className="text-lg font-semibold">{feature.title}</h3>
                      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{feature.body}</p>
                      <p className="text-xs text-muted-foreground">
                        Sort {feature.sortOrder} | Waitlist {feature.stats.waitlist} | Early access {feature.stats.earlyAccess}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setFeatureForm(formFromFeature(feature))}>
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => deleteFeature(feature)}
                        disabled={working === `delete-${feature.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/85">
        <CardHeader>
          <CardTitle>Waitlist and early access requests</CardTitle>
          <CardDescription>Review vendor interest and move each request through the admin workflow.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!data.interests.length ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No feature requests yet.
            </div>
          ) : (
            data.interests.map((interest) => {
              const draft = draftFor(interest)
              return (
                <article key={interest.id} className="rounded-xl border border-border/70 bg-background/30 p-4">
                  <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{label(interest.interestType)}</Badge>
                        <Badge variant={toneForStatus(interest.status)}>{label(interest.status)}</Badge>
                        <span className="text-xs text-muted-foreground">{formatDate(interest.createdAt)}</span>
                      </div>
                      <h3 className="text-lg font-semibold">{interest.feature.title ?? `Feature #${interest.featureId}`}</h3>
                      <p className="text-sm text-muted-foreground">
                        {[interest.vendor.businessName, interest.vendor.contactName, interest.user.fullName, interest.user.phone, interest.user.email]
                          .filter(Boolean)
                          .join(' | ') || 'Vendor details not available'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <select
                        value={draft.status}
                        onChange={(event) => updateDraft(interest, { status: event.target.value as InterestStatus })}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        {interestStatuses.map((status) => (
                          <option key={status} value={status}>
                            {label(status)}
                          </option>
                        ))}
                      </select>
                      <textarea
                        value={draft.adminNotes}
                        onChange={(event) => updateDraft(interest, { adminNotes: event.target.value })}
                        placeholder="Admin notes"
                        className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                      <Button
                        type="button"
                        className="w-full"
                        onClick={() => saveInterest(interest)}
                        disabled={working === `interest-${interest.id}`}
                      >
                        {working === `interest-${interest.id}` ? 'Saving...' : 'Save request'}
                      </Button>
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </CardContent>
      </Card>
    </section>
  )
}
