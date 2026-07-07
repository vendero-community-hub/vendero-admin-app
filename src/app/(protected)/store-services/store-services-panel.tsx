'use client'

import { useMemo, useState } from 'react'
import {
  CheckCircle2,
  CircleDollarSign,
  Download,
  ExternalLink,
  FileText,
  RefreshCw,
  Save,
  ShoppingBag,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type ServiceCategory = 'digital_service' | 'ads_account' | 'website_development' | 'social_media'
type ServiceStatus = 'draft' | 'live' | 'hidden'
type RequestStatus =
  | 'requirement_received'
  | 'call_required'
  | 'quote_pending'
  | 'quote_ready'
  | 'payment_pending'
  | 'paid'
  | 'in_progress'
  | 'needs_info'
  | 'completed'
  | 'cancelled'
type PaymentStatus = 'not_ready' | 'pending' | 'paid' | 'failed' | 'refunded'

export type StoreService = {
  id: number
  publicId: string
  title: string
  category: ServiceCategory
  shortDescription: string | null
  description: string | null
  imageUrl: string | null
  startingPrice: number
  currency: string
  includedItems: string[]
  excludedItems: string[]
  previewUrl: string | null
  detailPdfUrl: string | null
  flowSteps: string[]
  status: ServiceStatus
  isActive: boolean
  sortOrder: number
}

export type StoreRequest = {
  id: number
  publicId: string
  serviceId: number
  contactName: string | null
  contactPhone: string | null
  whatsappPhone: string | null
  businessName: string | null
  requirementDetails: string | null
  budgetRange: string | null
  timeline: string | null
  status: RequestStatus
  finalAmount: number | null
  currency: string
  paymentStatus: PaymentStatus
  paymentReference: string | null
  receiptUrl: string | null
  requiredItems: string[]
  finalResources: Array<{ title: string; url?: string; note?: string | null }>
  adminNotes: string | null
  service: {
    title: string | null
    category: ServiceCategory | null
    imageUrl: string | null
    startingPrice: number
    currency: string
  } | null
  createdAt: string | null
}

export type StoreServicesData = {
  services: StoreService[]
  requests: StoreRequest[]
} | null

type ServiceForm = {
  id: number | null
  title: string
  category: ServiceCategory
  shortDescription: string
  description: string
  imageUrl: string
  startingPrice: string
  includedItems: string
  excludedItems: string
  previewUrl: string
  detailPdfUrl: string
  flowSteps: string
  status: ServiceStatus
  isActive: boolean
  sortOrder: string
}

type RequestDraft = {
  status: RequestStatus
  finalAmount: string
  paymentStatus: PaymentStatus
  receiptUrl: string
  requiredItems: string
  finalResources: string
  adminNotes: string
}

const emptyServiceForm: ServiceForm = {
  id: null,
  title: '',
  category: 'digital_service',
  shortDescription: '',
  description: '',
  imageUrl: '',
  startingPrice: '0',
  includedItems: '',
  excludedItems: '',
  previewUrl: '',
  detailPdfUrl: '',
  flowSteps: '',
  status: 'draft',
  isActive: true,
  sortOrder: '0',
}

const requestStatuses: RequestStatus[] = [
  'requirement_received',
  'call_required',
  'quote_pending',
  'quote_ready',
  'payment_pending',
  'paid',
  'in_progress',
  'needs_info',
  'completed',
  'cancelled',
]
const paymentStatuses: PaymentStatus[] = ['not_ready', 'pending', 'paid', 'failed', 'refunded']
const categories: Array<{ key: ServiceCategory; label: string }> = [
  { key: 'digital_service', label: 'Digital service' },
  { key: 'ads_account', label: 'Ads account' },
  { key: 'website_development', label: 'Custom website' },
  { key: 'social_media', label: 'Social media' },
]

function fallbackData(): NonNullable<StoreServicesData> {
  return { services: [], requests: [] }
}

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
  if (!response.ok) throw new Error(payload?.message ?? 'Request failed')
  return unwrapPayload(payload)
}

function listText(values: string[]) {
  return values.join('\n')
}

function parseList(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function resourcesText(resources: StoreRequest['finalResources']) {
  return resources
    .map((resource) => [resource.title, resource.url ?? '', resource.note ?? ''].join('|'))
    .join('\n')
}

function parseResources(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, url, note] = line.split('|').map((part) => part.trim())
      return { title, ...(url ? { url } : {}), ...(note ? { note } : {}) }
    })
    .filter((resource) => resource.title)
}

function formFromService(service: StoreService): ServiceForm {
  return {
    id: service.id,
    title: service.title,
    category: service.category,
    shortDescription: service.shortDescription ?? '',
    description: service.description ?? '',
    imageUrl: service.imageUrl ?? '',
    startingPrice: String(service.startingPrice ?? 0),
    includedItems: listText(service.includedItems ?? []),
    excludedItems: listText(service.excludedItems ?? []),
    previewUrl: service.previewUrl ?? '',
    detailPdfUrl: service.detailPdfUrl ?? '',
    flowSteps: listText(service.flowSteps ?? []),
    status: service.status,
    isActive: service.isActive,
    sortOrder: String(service.sortOrder ?? 0),
  }
}

function draftFromRequest(request: StoreRequest): RequestDraft {
  return {
    status: request.status,
    finalAmount: request.finalAmount === null ? '' : String(request.finalAmount),
    paymentStatus: request.paymentStatus,
    receiptUrl: request.receiptUrl ?? '',
    requiredItems: listText(request.requiredItems ?? []),
    finalResources: resourcesText(request.finalResources ?? []),
    adminNotes: request.adminNotes ?? '',
  }
}

function formatMoney(value: number | null | undefined, currency = 'INR') {
  if (value === null || value === undefined) return 'Quote pending'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatLabel(value: string) {
  return value.replace(/_/g, ' ')
}

export function StoreServicesPanel({ initialData }: { initialData: StoreServicesData }) {
  const [data, setData] = useState<NonNullable<StoreServicesData>>(initialData ?? fallbackData())
  const [serviceForm, setServiceForm] = useState<ServiceForm>(emptyServiceForm)
  const [requestDrafts, setRequestDrafts] = useState<Record<number, RequestDraft>>({})
  const [working, setWorking] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const sortedServices = useMemo(
    () => [...data.services].sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id),
    [data.services]
  )

  async function refresh() {
    const nextData = (await requestJson('/api/v1/admin/store-services')) as NonNullable<StoreServicesData>
    setData(nextData)
  }

  async function submitService() {
    setWorking('service')
    setMessage('')
    try {
      const body = {
        title: serviceForm.title.trim(),
        category: serviceForm.category,
        shortDescription: serviceForm.shortDescription.trim() || null,
        description: serviceForm.description.trim() || null,
        imageUrl: serviceForm.imageUrl.trim() || null,
        startingPrice: Number(serviceForm.startingPrice || 0),
        includedItems: parseList(serviceForm.includedItems),
        excludedItems: parseList(serviceForm.excludedItems),
        previewUrl: serviceForm.previewUrl.trim() || null,
        detailPdfUrl: serviceForm.detailPdfUrl.trim() || null,
        flowSteps: parseList(serviceForm.flowSteps),
        status: serviceForm.status,
        isActive: serviceForm.isActive,
        sortOrder: Number(serviceForm.sortOrder || 0),
      }

      if (serviceForm.id) {
        await requestJson(`/api/v1/admin/store-services/${serviceForm.id}`, body, 'PUT')
        setMessage('Store service updated.')
      } else {
        await requestJson('/api/v1/admin/store-services', body, 'POST')
        setMessage('Store service created.')
      }

      setServiceForm(emptyServiceForm)
      await refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save store service')
    } finally {
      setWorking(null)
    }
  }

  async function updateRequest(request: StoreRequest) {
    const draft = requestDrafts[request.id] ?? draftFromRequest(request)
    setWorking(`request-${request.id}`)
    setMessage('')
    try {
      await requestJson(
        `/api/v1/admin/store-service-requests/${request.id}`,
        {
          status: draft.status,
          finalAmount: draft.finalAmount ? Number(draft.finalAmount) : null,
          paymentStatus: draft.paymentStatus,
          receiptUrl: draft.receiptUrl.trim() || null,
          requiredItems: parseList(draft.requiredItems),
          finalResources: parseResources(draft.finalResources),
          adminNotes: draft.adminNotes.trim() || null,
        },
        'PUT'
      )
      setMessage('Store request updated.')
      await refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update request')
    } finally {
      setWorking(null)
    }
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle>{serviceForm.id ? 'Edit service card' : 'Create service card'}</CardTitle>
          <CardDescription>Use one item per line for included, excluded, and flow step fields.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message ? (
            <div className="rounded-lg border border-border/70 bg-background/30 px-3 py-2 text-sm text-muted-foreground">
              {message}
            </div>
          ) : null}
          <Input placeholder="Service title" value={serviceForm.title} onChange={(event) => setServiceForm({ ...serviceForm, title: event.target.value })} />
          <div className="grid gap-3 md:grid-cols-2">
            <select className="h-10 rounded-md border border-border bg-background px-3 text-sm" value={serviceForm.category} onChange={(event) => setServiceForm({ ...serviceForm, category: event.target.value as ServiceCategory })}>
              {categories.map((category) => (
                <option key={category.key} value={category.key}>
                  {category.label}
                </option>
              ))}
            </select>
            <Input placeholder="Starting price" value={serviceForm.startingPrice} onChange={(event) => setServiceForm({ ...serviceForm, startingPrice: event.target.value })} />
          </div>
          <Input placeholder="Short description" value={serviceForm.shortDescription} onChange={(event) => setServiceForm({ ...serviceForm, shortDescription: event.target.value })} />
          <textarea className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Full description" value={serviceForm.description} onChange={(event) => setServiceForm({ ...serviceForm, description: event.target.value })} />
          <Input placeholder="Image URL" value={serviceForm.imageUrl} onChange={(event) => setServiceForm({ ...serviceForm, imageUrl: event.target.value })} />
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Preview URL" value={serviceForm.previewUrl} onChange={(event) => setServiceForm({ ...serviceForm, previewUrl: event.target.value })} />
            <Input placeholder="Detail PDF URL" value={serviceForm.detailPdfUrl} onChange={(event) => setServiceForm({ ...serviceForm, detailPdfUrl: event.target.value })} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <textarea className="min-h-28 rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Included items" value={serviceForm.includedItems} onChange={(event) => setServiceForm({ ...serviceForm, includedItems: event.target.value })} />
            <textarea className="min-h-28 rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Excluded items" value={serviceForm.excludedItems} onChange={(event) => setServiceForm({ ...serviceForm, excludedItems: event.target.value })} />
          </div>
          <textarea className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Flow steps" value={serviceForm.flowSteps} onChange={(event) => setServiceForm({ ...serviceForm, flowSteps: event.target.value })} />
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <select className="h-10 rounded-md border border-border bg-background px-3 text-sm" value={serviceForm.status} onChange={(event) => setServiceForm({ ...serviceForm, status: event.target.value as ServiceStatus })}>
              {['draft', 'live', 'hidden'].map((status) => (
                <option key={status} value={status}>
                  {formatLabel(status)}
                </option>
              ))}
            </select>
            <Input placeholder="Sort order" value={serviceForm.sortOrder} onChange={(event) => setServiceForm({ ...serviceForm, sortOrder: event.target.value })} />
            <label className="flex items-center gap-2 rounded-md border border-border px-3 text-sm">
              <input type="checkbox" checked={serviceForm.isActive} onChange={(event) => setServiceForm({ ...serviceForm, isActive: event.target.checked })} />
              Active
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={submitService} disabled={working === 'service' || !serviceForm.title.trim()}>
              <Save className="h-4 w-4" />
              {serviceForm.id ? 'Update card' : 'Create card'}
            </Button>
            {serviceForm.id ? (
              <Button type="button" variant="outline" onClick={() => setServiceForm(emptyServiceForm)}>
                New card
              </Button>
            ) : null}
            <Button type="button" variant="ghost" onClick={refresh}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Published Service Cards</CardTitle>
            <CardDescription>Preview how service products will appear in the mobile Store.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {sortedServices.map((service) => (
              <article key={service.id} className="rounded-xl border border-border/70 bg-background/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                      <ShoppingBag className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{service.title}</h3>
                      <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{formatLabel(service.category)}</p>
                    </div>
                  </div>
                  <Badge variant={service.status === 'live' ? 'success' : 'secondary'} className="rounded-full">
                    {service.status}
                  </Badge>
                </div>
                <p className="mt-3 min-h-10 overflow-hidden text-sm leading-5 text-muted-foreground">{service.shortDescription ?? service.description}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <strong>{formatMoney(service.startingPrice, service.currency)}</strong>
                  <div className="flex gap-2">
                    {service.previewUrl ? (
                      <a href={service.previewUrl} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Preview
                      </a>
                    ) : null}
                    {service.detailPdfUrl ? (
                      <a href={service.detailPdfUrl} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs">
                        <Download className="h-3.5 w-3.5" />
                        PDF
                      </a>
                    ) : null}
                    <Button type="button" size="sm" variant="outline" onClick={() => setServiceForm(formFromService(service))}>
                      Edit
                    </Button>
                  </div>
                </div>
              </article>
            ))}
            {!sortedServices.length ? (
              <p className="rounded-xl border border-dashed border-border/80 p-8 text-center text-sm text-muted-foreground md:col-span-2">
                No store services yet.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Requirement Requests</CardTitle>
            <CardDescription>Set final amount, ask for missing info, attach receipt and final resources.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.requests.map((request) => {
              const draft = requestDrafts[request.id] ?? draftFromRequest(request)
              return (
                <article key={request.id} className="rounded-xl border border-border/70 bg-background/30 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="rounded-full">
                          {formatLabel(request.status)}
                        </Badge>
                        <Badge variant={request.paymentStatus === 'paid' ? 'success' : 'secondary'} className="rounded-full">
                          {formatLabel(request.paymentStatus)}
                        </Badge>
                      </div>
                      <h3 className="mt-2 font-semibold">{request.service?.title ?? `Service #${request.serviceId}`}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {request.businessName ?? request.contactName ?? 'Vendor'} - {request.contactPhone ?? request.whatsappPhone ?? 'No phone'}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-muted-foreground">Final amount</p>
                      <strong>{formatMoney(request.finalAmount, request.currency)}</strong>
                    </div>
                  </div>
                  {request.requirementDetails ? (
                    <p className="mt-3 rounded-lg border border-border/70 bg-card/50 p-3 text-sm text-muted-foreground">
                      {request.requirementDetails}
                    </p>
                  ) : null}
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <select className="h-10 rounded-md border border-border bg-background px-3 text-sm" value={draft.status} onChange={(event) => setRequestDrafts({ ...requestDrafts, [request.id]: { ...draft, status: event.target.value as RequestStatus } })}>
                      {requestStatuses.map((status) => (
                        <option key={status} value={status}>
                          {formatLabel(status)}
                        </option>
                      ))}
                    </select>
                    <Input placeholder="Final amount" value={draft.finalAmount} onChange={(event) => setRequestDrafts({ ...requestDrafts, [request.id]: { ...draft, finalAmount: event.target.value } })} />
                    <select className="h-10 rounded-md border border-border bg-background px-3 text-sm" value={draft.paymentStatus} onChange={(event) => setRequestDrafts({ ...requestDrafts, [request.id]: { ...draft, paymentStatus: event.target.value as PaymentStatus } })}>
                      {paymentStatuses.map((status) => (
                        <option key={status} value={status}>
                          {formatLabel(status)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <Input placeholder="Receipt URL" value={draft.receiptUrl} onChange={(event) => setRequestDrafts({ ...requestDrafts, [request.id]: { ...draft, receiptUrl: event.target.value } })} />
                    <Input placeholder="Admin notes" value={draft.adminNotes} onChange={(event) => setRequestDrafts({ ...requestDrafts, [request.id]: { ...draft, adminNotes: event.target.value } })} />
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <textarea className="min-h-20 rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Required items, one per line" value={draft.requiredItems} onChange={(event) => setRequestDrafts({ ...requestDrafts, [request.id]: { ...draft, requiredItems: event.target.value } })} />
                    <textarea className="min-h-20 rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Final resources: title|url|note" value={draft.finalResources} onChange={(event) => setRequestDrafts({ ...requestDrafts, [request.id]: { ...draft, finalResources: event.target.value } })} />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button type="button" size="sm" onClick={() => updateRequest(request)} disabled={working === `request-${request.id}`}>
                      <CheckCircle2 className="h-4 w-4" />
                      Update request
                    </Button>
                    {request.receiptUrl ? (
                      <a href={request.receiptUrl} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs">
                        <FileText className="h-3.5 w-3.5" />
                        Receipt
                      </a>
                    ) : null}
                    <span className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs text-muted-foreground">
                      <CircleDollarSign className="h-3.5 w-3.5" />
                      Pay button appears when quote is ready
                    </span>
                  </div>
                </article>
              )
            })}
            {!data.requests.length ? (
              <p className="rounded-xl border border-dashed border-border/80 p-8 text-center text-sm text-muted-foreground">
                No requirement requests yet.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
