'use client'

import { useMemo, useState } from 'react'
import { RefreshCw, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type BadgeTone = 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger'

type LandingSubmission = {
  id: number
  publicId: string
  type: 'contact' | 'support' | 'delete' | 'waitlist'
  status: 'new' | 'contacted' | 'in_review' | 'completed' | 'closed' | 'spam'
  source: string
  name: string | null
  email: string | null
  phone: string | null
  phoneE164: string | null
  role: string | null
  subject: string | null
  message: string | null
  businessName: string | null
  city: string | null
  state: string | null
  address: string | null
  adminNotes: string | null
  metadata: Record<string, unknown>
  createdAt: string | null
}

export type LandingSubmissionsData = {
  summary: {
    total: number
    byType: Record<string, number>
    byStatus: Record<string, number>
  }
  submissions: LandingSubmission[]
} | null

const typeOptions = ['all', 'contact', 'support', 'delete', 'waitlist'] as const
const statusOptions = ['all', 'new', 'contacted', 'in_review', 'completed', 'closed', 'spam'] as const
const mutableStatuses = statusOptions.filter((status) => status !== 'all')

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

function toneForStatus(status: string): BadgeTone {
  if (['completed', 'closed'].includes(status)) return 'success'
  if (['new', 'in_review', 'contacted'].includes(status)) return 'warning'
  if (status === 'spam') return 'danger'
  return 'secondary'
}

function label(value: string) {
  return value.replace(/_/g, ' ')
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null
}

function recordValue(value: unknown) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function waitlistDetails(item: LandingSubmission) {
  if (item.type !== 'waitlist') return null

  const metadata = recordValue(item.metadata)
  const launchDownloadLink = recordValue(metadata.launchDownloadLink)
  const waitlistConsent = recordValue(metadata.waitlistConsent)

  return {
    otpVerifiedAt: stringValue(metadata.whatsappOtpVerifiedAt),
    optInStatus: stringValue(metadata.whatsappOptInStatus),
    futureTemplate: stringValue(launchDownloadLink.futureTemplate),
    consentText: stringValue(waitlistConsent.consentText),
  }
}

export function LandingSubmissionsPanel({ initialData }: { initialData: LandingSubmissionsData }) {
  const [data, setData] = useState<LandingSubmissionsData>(initialData)
  const [query, setQuery] = useState('')
  const [type, setType] = useState<(typeof typeOptions)[number]>('all')
  const [status, setStatus] = useState<(typeof statusOptions)[number]>('all')
  const [workingId, setWorkingId] = useState<number | null>(null)
  const [message, setMessage] = useState('')

  const submissions = data?.submissions ?? []
  const filteredSubmissions = useMemo(() => submissions, [submissions])

  async function refresh(nextQuery = query, nextType = type, nextStatus = status) {
    setMessage('Refreshing landing requests...')
    const params = new URLSearchParams({ limit: '80' })
    if (nextQuery.trim()) params.set('q', nextQuery.trim())
    if (nextType !== 'all') params.set('type', nextType)
    if (nextStatus !== 'all') params.set('status', nextStatus)
    const nextData = (await requestJson(`/api/v1/admin/landing/submissions?${params.toString()}`)) as NonNullable<LandingSubmissionsData>
    setData(nextData)
    setMessage('Landing requests refreshed.')
  }

  async function updateStatus(item: LandingSubmission, nextStatus: LandingSubmission['status']) {
    setWorkingId(item.id)
    setMessage(`Updating ${item.publicId}...`)

    try {
      await requestJson(
        `/api/v1/admin/landing/submissions/${item.id}/status`,
        { status: nextStatus, adminNotes: item.adminNotes },
        'POST'
      )
      await refresh()
      setMessage('Status updated.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update status')
    } finally {
      setWorkingId(null)
    }
  }

  return (
    <Card className="border-border/70 bg-card/85">
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Landing intake</CardTitle>
            <CardDescription>Search and move requests through the admin workflow.</CardDescription>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(180px,1fr)_auto_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search name, phone, city"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <select
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              value={type}
              onChange={(event) => setType(event.target.value as typeof type)}
            >
              {typeOptions.map((option) => (
                <option key={option} value={option}>
                  {label(option)}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              value={status}
              onChange={(event) => setStatus(event.target.value as typeof status)}
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {label(option)}
                </option>
              ))}
            </select>
            <Button type="button" variant="outline" onClick={() => refresh()} disabled={workingId !== null}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        {!filteredSubmissions.length ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No landing requests found.
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredSubmissions.map((item) => {
              const waitlist = waitlistDetails(item)

              return (
                <article key={item.id} className="rounded-xl border border-border/70 bg-background/30 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{label(item.type)}</Badge>
                        <Badge variant={toneForStatus(item.status)}>{label(item.status)}</Badge>
                        {waitlist?.otpVerifiedAt ? <Badge variant="success">OTP verified</Badge> : null}
                        {waitlist?.optInStatus ? (
                          <Badge variant="outline">WhatsApp {label(waitlist.optInStatus)}</Badge>
                        ) : null}
                        <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
                      </div>
                      <h3 className="text-lg font-semibold">
                        {item.businessName || item.name || item.subject || item.publicId}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {[
                          item.name,
                          item.phoneE164 ?? item.phone,
                          item.email,
                          [item.city, item.state].filter(Boolean).join(', '),
                        ]
                          .filter(Boolean)
                          .join(' | ')}
                      </p>
                      {item.subject ? <p className="text-sm font-medium">{item.subject}</p> : null}
                      {waitlist ? (
                        <p className="text-sm text-muted-foreground">
                          Launch template target: {waitlist.futureTemplate ?? 'launch download link'}
                          {waitlist.otpVerifiedAt ? ` | Verified ${formatDate(waitlist.otpVerifiedAt)}` : ''}
                        </p>
                      ) : null}
                      {item.message ? (
                        <p className="max-w-4xl whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                          {item.message}
                        </p>
                      ) : null}
                      {item.address ? <p className="text-sm text-muted-foreground">Address: {item.address}</p> : null}
                      {waitlist?.consentText ? (
                        <p className="max-w-4xl text-xs leading-5 text-muted-foreground">
                          Consent: {waitlist.consentText}
                        </p>
                      ) : null}
                    </div>
                    <select
                      className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                      value={item.status}
                      disabled={workingId === item.id}
                      onChange={(event) => updateStatus(item, event.target.value as LandingSubmission['status'])}
                    >
                      {mutableStatuses.map((option) => (
                        <option key={option} value={option}>
                          {label(option)}
                        </option>
                      ))}
                    </select>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
