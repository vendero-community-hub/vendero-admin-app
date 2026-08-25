'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock3,
  Globe2,
  Loader2,
  LockKeyhole,
  PhoneCall,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRoundCheck,
  XCircle,
} from 'lucide-react'
import { useActionModal } from '@/components/ui/action-modal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type DomainRegistrationStatus =
  | 'assisted_review'
  | 'vendor_contact_pending'
  | 'vendor_contacted'
  | 'rejected'
  | 'cancelled'

type TransitionReason =
  | 'READY_FOR_VENDOR_CONTACT'
  | 'VENDOR_CONTACTED'
  | 'MORE_REVIEW_REQUIRED'
  | 'REQUEST_DATA_INVALID'
  | 'KYC_EVIDENCE_INSUFFICIENT'
  | 'DOMAIN_NO_LONGER_AVAILABLE'
  | 'REGISTRAR_REQUIREMENTS_UNSUPPORTED'
  | 'VENDOR_REQUESTED_CANCELLATION'
  | 'DUPLICATE_REQUEST'
  | 'OTHER'

type MaskedRegistrant = {
  displayName?: string | null
  firstName?: string | null
  lastName?: string | null
  organization?: string | null
  email?: string | null
  phone?: string | null
  addressLine1?: string | null
  addressLine2?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  country?: string | null
}

type KycEvidenceAssurance = {
  required?: boolean
  present?: boolean
  ready?: boolean
  documentType?: string | null
  verificationMode?: string | null
  providerAssurance?: string | null
  subjectMatchStatus?: string | null
  organizationVerificationStatus?: string | null
  status?: string | null
  verifiedAt?: string | null
  rawDocumentShared?: boolean
  registrarVerified?: boolean
}

type ConsentAssurance = {
  present?: boolean
  ready?: boolean
  version?: string | null
  registrantTermsAccepted?: boolean
  registrarDataShareAccepted?: boolean
  acceptedAt?: string | null
  approvedDataScope?: string[]
}

type StatusHistoryEntry = {
  status?: string | null
  fromStatus?: string | null
  toStatus?: string | null
  reasonCode?: string | null
  notePresent?: boolean
  actor?: {
    id?: number | null
    fullName?: string | null
    role?: string | null
  } | null
  createdAt?: string | null
}

export type DomainRegistrationRequestRecord = {
  id: string
  domainName: string
  tld?: string | null
  status: DomainRegistrationStatus
  entityType?: 'individual' | 'organization' | null
  policyVersion?: string | null
  assistanceReasonCode?: string | null
  availability?: {
    status?: string | null
    checkedAt?: string | null
    restriction?: string | null
  } | null
  vendor?: {
    id?: number | null
    businessName?: string | null
    contactName?: string | null
  } | null
  vendorProfileId?: number | null
  registrant?: MaskedRegistrant | null
  consentReady?: boolean
  consent?: ConsentAssurance | null
  kycEvidence?: KycEvidenceAssurance | null
  review?: {
    reasonCode?: string | null
    notePresent?: boolean
    reviewedAt?: string | null
    reviewer?: {
      id?: number | null
      fullName?: string | null
      role?: string | null
    } | null
  } | null
  statusHistory?: StatusHistoryEntry[]
  availableActions?: Array<
    | DomainRegistrationStatus
    | {
        status?: DomainRegistrationStatus
        targetStatus?: DomainRegistrationStatus
      }
  >
  reasonCodesByStatus?: Partial<
    Record<DomainRegistrationStatus, TransitionReason[]>
  >
  createdAt?: string | null
  updatedAt?: string | null
}

type QueueSafety = {
  purchaseEnabled?: boolean
  checkoutEnabled?: boolean
  registrarHandoffEnabled?: boolean
  rawKycTransferEnabled?: boolean
  whoisMutationEnabled?: boolean
  message?: string | null
}

export type DomainRegistrationQueueData = {
  requests?: DomainRegistrationRequestRecord[]
  pagination?: {
    page?: number
    perPage?: number
    total?: number
    totalPages?: number
  }
  safety?: QueueSafety
  reasonCodesByStatus?: Partial<
    Record<DomainRegistrationStatus, TransitionReason[]>
  >
}

type DomainRegistrationDetailData = {
  request?: DomainRegistrationRequestRecord | null
  safety?: QueueSafety
  detailWithheld?: boolean
}

const STATUS_OPTIONS: Array<{
  value: 'all' | DomainRegistrationStatus
  label: string
}> = [
  { value: 'all', label: 'All queue states' },
  { value: 'assisted_review', label: 'Assisted review' },
  { value: 'vendor_contact_pending', label: 'Vendor contact pending' },
  { value: 'vendor_contacted', label: 'Vendor contacted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
]

const REASON_LABELS: Record<TransitionReason, string> = {
  READY_FOR_VENDOR_CONTACT: 'Ready for vendor contact',
  VENDOR_CONTACTED: 'Vendor contacted',
  MORE_REVIEW_REQUIRED: 'More review required',
  REQUEST_DATA_INVALID: 'Request data invalid',
  KYC_EVIDENCE_INSUFFICIENT: 'KYC evidence insufficient',
  DOMAIN_NO_LONGER_AVAILABLE: 'Domain no longer available',
  REGISTRAR_REQUIREMENTS_UNSUPPORTED: 'Registrar requirements unsupported',
  VENDOR_REQUESTED_CANCELLATION: 'Vendor requested cancellation',
  DUPLICATE_REQUEST: 'Duplicate request',
  OTHER: 'Other',
}

const DEFAULT_REASON_CODES: Record<
  DomainRegistrationStatus,
  TransitionReason[]
> = {
  assisted_review: ['MORE_REVIEW_REQUIRED'],
  vendor_contact_pending: ['READY_FOR_VENDOR_CONTACT'],
  vendor_contacted: ['VENDOR_CONTACTED'],
  rejected: [
    'REQUEST_DATA_INVALID',
    'KYC_EVIDENCE_INSUFFICIENT',
    'DOMAIN_NO_LONGER_AVAILABLE',
    'REGISTRAR_REQUIREMENTS_UNSUPPORTED',
    'OTHER',
  ],
  cancelled: [
    'VENDOR_REQUESTED_CANCELLATION',
    'DUPLICATE_REQUEST',
    'OTHER',
  ],
}

function getAdminToken() {
  return (
    document.cookie
      .split('; ')
      .find((part) => part.startsWith('vendero_admin_access_token='))
      ?.split('=')[1] ?? null
  )
}

function unwrapPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') return payload
  const record = payload as {
    data?: { data?: unknown } | unknown
  }
  if (
    record.data &&
    typeof record.data === 'object' &&
    'data' in record.data
  ) {
    return (record.data as { data?: unknown }).data
  }
  return record.data ?? payload
}

async function requestJson(
  path: string,
  options: {
    method?: 'GET' | 'POST'
    body?: Record<string, unknown>
  } = {}
) {
  const token = getAdminToken()
  const response = await fetch(path, {
    method: options.method ?? 'GET',
    cache: 'no-store',
    headers: {
      'content-type': 'application/json',
      authorization: token ? `Bearer ${token}` : '',
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message =
      payload?.message ??
      payload?.error?.message ??
      payload?.data?.message ??
      'Unable to complete the domain registration action.'
    throw new Error(String(message))
  }
  return unwrapPayload(payload)
}

function titleCase(value: string | null | undefined) {
  return String(value ?? '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not recorded'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not recorded'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function statusTone(status: string | null | undefined) {
  if (status === 'vendor_contacted') return 'success' as const
  if (status === 'rejected') return 'danger' as const
  if (status === 'cancelled') return 'secondary' as const
  if (status === 'vendor_contact_pending') return 'warning' as const
  return 'default' as const
}

function registrantName(registrant: MaskedRegistrant | null | undefined) {
  const name =
    registrant?.displayName ??
    registrant?.organization ??
    [registrant?.firstName, registrant?.lastName].filter(Boolean).join(' ')
  return name || 'Registrant not available'
}

function vendorName(request: DomainRegistrationRequestRecord) {
  return (
    request.vendor?.businessName ??
    request.vendor?.contactName ??
    (request.vendorProfileId
      ? `Vendor profile #${request.vendorProfileId}`
      : 'Vendor not available')
  )
}

function availableTargetStatuses(
  request: DomainRegistrationRequestRecord | null
) {
  if (!Array.isArray(request?.availableActions)) return []
  const targets = request.availableActions
    .map((action) =>
      typeof action === 'string'
        ? action
        : action.targetStatus ?? action.status ?? null
    )
    .filter(
      (status): status is DomainRegistrationStatus =>
        typeof status === 'string' &&
        [
          'assisted_review',
          'vendor_contact_pending',
          'vendor_contacted',
          'rejected',
          'cancelled',
        ].includes(status)
    )
  return [...new Set(targets)]
}

function isTransitionReason(value: unknown): value is TransitionReason {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(REASON_LABELS, value)
  )
}

function reasonCodesForStatus(
  request: DomainRegistrationRequestRecord | null,
  queue: DomainRegistrationQueueData,
  status: DomainRegistrationStatus
) {
  const configured =
    request?.reasonCodesByStatus?.[status] ??
    queue.reasonCodesByStatus?.[status] ??
    DEFAULT_REASON_CODES[status]
  return configured.filter(isTransitionReason)
}

function consentIsReady(request: DomainRegistrationRequestRecord) {
  return request.consent?.ready === true || request.consentReady === true
}

function transitionLabel(status: DomainRegistrationStatus) {
  if (status === 'vendor_contact_pending') return 'Queue vendor contact'
  if (status === 'vendor_contacted') return 'Mark vendor contacted'
  if (status === 'assisted_review') return 'Return to assisted review'
  if (status === 'rejected') return 'Reject request'
  return 'Cancel request'
}

function safetyValue(value: boolean | undefined) {
  return value === true ? 'Unexpectedly enabled' : 'Disabled'
}

function AssuranceRow({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string
  tone?: 'neutral' | 'safe' | 'warning'
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/35 p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-2 text-sm font-medium ${
          tone === 'safe'
            ? 'text-emerald-300'
            : tone === 'warning'
              ? 'text-amber-300'
              : ''
        }`}
      >
        {value}
      </p>
    </div>
  )
}

export function DomainRegistrationQueuePanel({
  initialData,
}: {
  initialData: DomainRegistrationQueueData | null
}) {
  const actionModal = useActionModal()
  const [data, setData] = useState<DomainRegistrationQueueData>(
    initialData ?? { requests: [] }
  )
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | DomainRegistrationStatus>('all')
  const [selectedId, setSelectedId] = useState<string | null>(
    initialData?.requests?.[0]?.id ?? null
  )
  const [detail, setDetail] = useState<DomainRegistrationRequestRecord | null>(
    null
  )
  const [detailSafety, setDetailSafety] = useState<QueueSafety | null>(null)
  const [targetStatus, setTargetStatus] =
    useState<DomainRegistrationStatus | null>(null)
  const [reasonCode, setReasonCode] = useState<TransitionReason | null>(null)
  const [note, setNote] = useState('')
  const [loadingQueue, setLoadingQueue] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requests = Array.isArray(data.requests) ? data.requests : []
  const selectedListRequest =
    requests.find((request) => request.id === selectedId) ?? null
  const selectedRequest =
    detail?.id === selectedId ? detail : selectedListRequest
  const availableTargets = useMemo(
    () => availableTargetStatuses(detail?.id === selectedId ? detail : null),
    [detail, selectedId]
  )
  const reasonOptions = targetStatus
    ? reasonCodesForStatus(
        detail?.id === selectedId ? detail : null,
        data,
        targetStatus
      ).map((value) => ({ value, label: REASON_LABELS[value] }))
    : []
  const safety = detailSafety ?? data.safety ?? {}

  const counts = useMemo(
    () => ({
      review: requests.filter((request) => request.status === 'assisted_review')
        .length,
      contactPending: requests.filter(
        (request) => request.status === 'vendor_contact_pending'
      ).length,
      contacted: requests.filter(
        (request) => request.status === 'vendor_contacted'
      ).length,
      terminal: requests.filter((request) =>
        ['rejected', 'cancelled'].includes(request.status)
      ).length,
    }),
    [requests]
  )

  async function refreshQueue() {
    setLoadingQueue(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: '1',
        perPage: '50',
      })
      if (query.trim()) params.set('domain', query.trim().toLowerCase())
      if (status !== 'all') params.set('status', status)
      const next = (await requestJson(
        `/api/v1/admin/domain-registrations?${params.toString()}`
      )) as DomainRegistrationQueueData
      const nextRequests = Array.isArray(next?.requests) ? next.requests : []
      setData(next ?? { requests: [] })
      setSelectedId((current) =>
        nextRequests.some((request) => request.id === current)
          ? current
          : (nextRequests[0]?.id ?? null)
      )
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to refresh the assisted-domain queue.'
      )
    } finally {
      setLoadingQueue(false)
    }
  }

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      setDetailSafety(null)
      return
    }

    let active = true
    setLoadingDetail(true)
    setError(null)
    void requestJson(`/api/v1/admin/domain-registrations/${selectedId}`)
      .then((payload) => {
        if (!active) return
        const next = payload as DomainRegistrationDetailData
        setDetail(next?.request ?? null)
        setDetailSafety(next?.safety ?? null)
      })
      .catch((requestError) => {
        if (!active) return
        setDetail(null)
        setDetailSafety(null)
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load the selected request.'
        )
      })
      .finally(() => {
        if (active) setLoadingDetail(false)
      })

    return () => {
      active = false
    }
  }, [selectedId])

  useEffect(() => {
    setTargetStatus(null)
    setReasonCode(null)
    setNote('')
  }, [selectedId, detail?.status])

  function chooseTarget(nextStatus: DomainRegistrationStatus | null) {
    setTargetStatus(nextStatus)
    setReasonCode(
      nextStatus
        ? (reasonCodesForStatus(
            detail?.id === selectedId ? detail : null,
            data,
            nextStatus
          )[0] ?? null)
        : null
    )
    setNote('')
    setError(null)
  }

  async function applyTransition() {
    if (!selectedId || !targetStatus || !reasonCode) {
      setError('Choose an allowed staff transition and reason.')
      return
    }
    if (!availableTargets.includes(targetStatus)) {
      setError('That transition is no longer allowed. Reload the request.')
      return
    }
    if (reasonCode === 'OTHER' && !note.trim()) {
      setError('An internal note is required when the reason is Other.')
      return
    }

    const confirmed = await actionModal.confirm({
      title: `${transitionLabel(targetStatus)}?`,
      description:
        targetStatus === 'rejected' || targetStatus === 'cancelled'
          ? 'This is a terminal staff action. It does not purchase the domain or send data to the registrar.'
          : 'This updates the internal assisted-review workflow only. It does not purchase the domain or send data to the registrar.',
      confirmLabel: transitionLabel(targetStatus),
      variant:
        targetStatus === 'rejected' || targetStatus === 'cancelled'
          ? 'danger'
          : 'default',
    })
    if (!confirmed) return

    setSaving(true)
    setError(null)
    try {
      const payload = (await requestJson(
        `/api/v1/admin/domain-registrations/${selectedId}/status`,
        {
          method: 'POST',
          body: {
            status: targetStatus,
            reasonCode,
            ...(note.trim() ? { note: note.trim() } : {}),
          },
        }
      )) as DomainRegistrationDetailData
      setDetail(payload?.detailWithheld ? null : (payload?.request ?? null))
      setDetailSafety(payload?.safety ?? detailSafety)
      chooseTarget(null)
      await refreshQueue()
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to update the assisted-domain request.'
      )
    } finally {
      setSaving(false)
    }
  }

  const consent = selectedRequest?.consent
  const kycEvidence = selectedRequest?.kycEvidence
  const isTerminal = ['rejected', 'cancelled'].includes(
    selectedRequest?.status ?? ''
  )

  return (
    <main className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-amber-500/35 bg-amber-500/5">
          <CardHeader>
            <Badge variant="warning" className="w-fit gap-2 rounded-full px-3 py-1">
              <LockKeyhole className="h-3.5 w-3.5" />
              Assisted only
            </Badge>
            <CardTitle className="text-3xl">
              Domain registration review queue
            </CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7">
              Review vendor requests and coordinate vendor contact. GoDaddy
              purchase dispatch, raw KYC transfer, and registrar handoff stay
              disabled in this assisted-review queue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-background/35 p-4 text-sm leading-6">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
              <p>
                Staff transitions update Vendero&apos;s internal queue only.
                There is no purchase button and no action on this page may send
                registrant or KYC data to a registrar.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Safety locks</CardTitle>
            <CardDescription>
              Server posture is displayed; the UI remains fail-closed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              [
                'Checkout / purchase',
                safetyValue(
                  safety.purchaseEnabled ?? safety.checkoutEnabled
                ),
              ],
              [
                'Registrar handoff',
                safetyValue(safety.registrarHandoffEnabled),
              ],
              ['Raw KYC transfer', safetyValue(safety.rawKycTransferEnabled)],
              [
                'Legacy WHOIS mutation',
                safetyValue(safety.whoisMutationEnabled),
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/35 px-3 py-2"
              >
                <span className="text-muted-foreground">{label}</span>
                <Badge
                  variant={
                    value === 'Disabled' ? 'success' : 'danger'
                  }
                >
                  {value}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Assisted review',
            value: counts.review,
            icon: ShieldCheck,
          },
          {
            label: 'Contact pending',
            value: counts.contactPending,
            icon: Clock3,
          },
          {
            label: 'Vendor contacted',
            value: counts.contacted,
            icon: UserRoundCheck,
          },
          {
            label: 'Closed without purchase',
            value: counts.terminal,
            icon: Ban,
          },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border-border/70 bg-card/80">
            <CardContent className="flex items-center justify-between gap-3 p-5">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-2 text-3xl font-semibold">{value}</p>
              </div>
              <Icon className="h-5 w-5 text-primary" />
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="border-border/70 bg-card/80">
          <CardHeader className="gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardDescription className="uppercase tracking-[0.2em]">
                  Vendors permission
                </CardDescription>
                <CardTitle className="mt-2 text-2xl">
                  Assisted requests
                </CardTitle>
              </div>
              <Button
                variant="outline"
                onClick={() => void refreshQueue()}
                disabled={loadingQueue}
              >
                {loadingQueue ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh
              </Button>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void refreshQueue()
                }}
                placeholder="Filter by exact or partial domain"
              />
            </div>
            <select
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value as 'all' | DomainRegistrationStatus
                )
              }
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {error ? (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {error}
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-3">
            {requests.map((request) => (
              <button
                key={request.id}
                type="button"
                className={`w-full rounded-xl border p-4 text-left transition-colors ${
                  selectedId === request.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border/70 bg-background/30 hover:bg-accent/40'
                }`}
                onClick={() => setSelectedId(request.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Globe2 className="h-4 w-4 text-primary" />
                      <p className="truncate font-semibold">
                        {request.domainName}
                      </p>
                      <Badge variant={statusTone(request.status)}>
                        {titleCase(request.status)}
                      </Badge>
                    </div>
                    <p className="mt-2 truncate text-sm text-muted-foreground">
                      {vendorName(request)}
                    </p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {registrantName(request.registrant)} ·{' '}
                      {request.registrant?.email ?? 'Email masked'} ·{' '}
                      {request.registrant?.phone ?? 'Phone masked'}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(request.createdAt)}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge
                    variant={consentIsReady(request) ? 'success' : 'warning'}
                  >
                    Consent{' '}
                    {consentIsReady(request) ? 'ready' : 'check required'}
                  </Badge>
                  <Badge
                    variant={
                      request.kycEvidence?.ready === true
                        ? 'success'
                        : request.kycEvidence?.present
                          ? 'warning'
                          : 'secondary'
                    }
                  >
                    {request.kycEvidence?.present
                      ? `KYC ${request.kycEvidence.status ?? 'referenced'}`
                      : request.kycEvidence?.required
                        ? 'KYC evidence required'
                        : 'KYC not required'}
                  </Badge>
                </div>
              </button>
            ))}
            {!requests.length ? (
              <div className="rounded-xl border border-border/70 bg-background/30 p-8 text-center text-sm text-muted-foreground">
                No assisted-domain requests match these filters.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardDescription className="uppercase tracking-[0.2em]">
              Staff-only detail
            </CardDescription>
            <CardTitle className="mt-2 text-2xl">
              {selectedRequest?.domainName ?? 'Select a domain request'}
            </CardTitle>
            <CardDescription>
              Contact data is an allowlisted admin view. Identity numbers,
              files, provider references, and raw provider payloads are never
              rendered here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingDetail ? (
              <div className="flex items-center justify-center gap-3 rounded-xl border border-border/70 bg-background/30 p-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading safe request detail…
              </div>
            ) : selectedRequest ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusTone(selectedRequest.status)}>
                    {titleCase(selectedRequest.status)}
                  </Badge>
                  <Badge variant="outline">
                    {titleCase(selectedRequest.entityType ?? 'registrant')}
                  </Badge>
                  <Badge variant="outline">
                    Policy {selectedRequest.policyVersion ?? 'not recorded'}
                  </Badge>
                  {isTerminal ? (
                    <Badge variant="secondary">Terminal · no actions</Badge>
                  ) : null}
                </div>

                <section>
                  <div className="mb-3 flex items-center gap-2">
                    <PhoneCall className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">
                      Authorized registrant contact
                    </h3>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <AssuranceRow
                      label="Registrant"
                      value={registrantName(selectedRequest.registrant)}
                    />
                    <AssuranceRow
                      label="Vendor"
                      value={vendorName(selectedRequest)}
                    />
                    <AssuranceRow
                      label="Email"
                      value={selectedRequest.registrant?.email ?? 'Not available'}
                    />
                    <AssuranceRow
                      label="Phone"
                      value={selectedRequest.registrant?.phone ?? 'Not available'}
                    />
                    <AssuranceRow
                      label="Address"
                      value={
                        [
                          selectedRequest.registrant?.addressLine1,
                          selectedRequest.registrant?.addressLine2,
                          selectedRequest.registrant?.city,
                          selectedRequest.registrant?.state,
                          selectedRequest.registrant?.postalCode,
                          selectedRequest.registrant?.country,
                        ]
                          .filter(Boolean)
                          .join(', ') || 'Masked in queue view'
                      }
                    />
                    <AssuranceRow
                      label="Availability checked"
                      value={formatDate(
                        selectedRequest.availability?.checkedAt
                      )}
                    />
                  </div>
                </section>

                <section>
                  <div className="mb-3 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">
                      Evidence and consent assurance
                    </h3>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <AssuranceRow
                      label="KYC evidence"
                      value={
                        kycEvidence?.present === false
                          ? kycEvidence.required
                            ? 'Required evidence is not present'
                            : 'Not required and not present'
                          : kycEvidence
                          ? `${titleCase(kycEvidence.documentType)} · ${titleCase(
                              kycEvidence.status ?? 'referenced'
                            )}`
                          : 'No KYC reference required or available'
                      }
                      tone={
                        kycEvidence?.status === 'approved'
                          ? 'safe'
                          : 'warning'
                      }
                    />
                    <AssuranceRow
                      label="Provider assurance"
                      value={titleCase(
                        kycEvidence?.providerAssurance ?? 'not recorded'
                      )}
                      tone={
                        kycEvidence?.providerAssurance === 'live_provider'
                          ? 'safe'
                          : kycEvidence?.providerAssurance ===
                              'non_production_mock'
                            ? 'warning'
                            : 'neutral'
                      }
                    />
                    <AssuranceRow
                      label="Registrant subject match"
                      value={titleCase(
                        kycEvidence?.subjectMatchStatus ?? 'not recorded'
                      )}
                      tone={
                        kycEvidence?.subjectMatchStatus === 'matched'
                          ? 'safe'
                          : kycEvidence?.subjectMatchStatus ===
                              'non_production_mock'
                            ? 'warning'
                            : 'neutral'
                      }
                    />
                    <AssuranceRow
                      label="Organization verification"
                      value={titleCase(
                        kycEvidence?.organizationVerificationStatus ??
                          'not applicable or not recorded'
                      )}
                    />
                    <AssuranceRow
                      label="Verification mode"
                      value={titleCase(
                        kycEvidence?.verificationMode ?? 'not recorded'
                      )}
                    />
                    <AssuranceRow
                      label="Evidence verified"
                      value={formatDate(kycEvidence?.verifiedAt)}
                    />
                    <AssuranceRow
                      label="Raw KYC shared"
                      value={
                        kycEvidence?.rawDocumentShared === true
                          ? 'Unexpected safety state'
                          : 'No'
                      }
                      tone={
                        kycEvidence?.rawDocumentShared === true
                          ? 'warning'
                          : 'safe'
                      }
                    />
                    <AssuranceRow
                      label="Registrar verification"
                      value={
                        kycEvidence?.registrarVerified === true
                          ? 'Unexpectedly recorded'
                          : 'Not performed'
                      }
                      tone={
                        kycEvidence?.registrarVerified === true
                          ? 'warning'
                          : 'safe'
                      }
                    />
                    <AssuranceRow
                      label="Registrant terms"
                      value={
                        consent?.registrantTermsAccepted
                          ? 'Accepted'
                          : consentIsReady(selectedRequest)
                            ? 'Recorded'
                            : 'Not ready'
                      }
                      tone={
                        consent?.registrantTermsAccepted ||
                        consentIsReady(selectedRequest)
                          ? 'safe'
                          : 'warning'
                      }
                    />
                    <AssuranceRow
                      label="Limited data-share consent"
                      value={
                        consent?.registrarDataShareAccepted
                          ? 'Accepted'
                          : consentIsReady(selectedRequest)
                            ? 'Recorded'
                            : 'Not ready'
                      }
                      tone={
                        consent?.registrarDataShareAccepted ||
                        consentIsReady(selectedRequest)
                          ? 'safe'
                          : 'warning'
                      }
                    />
                    <AssuranceRow
                      label="Consent version"
                      value={consent?.version ?? 'Not exposed in queue'}
                    />
                    <AssuranceRow
                      label="Consent accepted"
                      value={formatDate(consent?.acceptedAt)}
                    />
                  </div>
                </section>

                <section className="rounded-xl border border-border/70 bg-background/30 p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">Staff transition</h3>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Only server-authorized contact, review, rejection, or
                    cancellation transitions appear. These actions never
                    initiate checkout or registrar handoff.
                  </p>

                  {availableTargets.length ? (
                    <div className="mt-4 space-y-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="space-y-2 text-sm">
                          <span className="font-medium">Allowed transition</span>
                          <select
                            className="h-10 w-full rounded-md border border-border bg-background px-3"
                            value={targetStatus ?? ''}
                            onChange={(event) =>
                              chooseTarget(
                                (event.target.value ||
                                  null) as DomainRegistrationStatus | null
                              )
                            }
                          >
                            <option value="">Choose an action</option>
                            {availableTargets.map((target) => (
                              <option key={target} value={target}>
                                {transitionLabel(target)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="space-y-2 text-sm">
                          <span className="font-medium">Reason</span>
                          <select
                            className="h-10 w-full rounded-md border border-border bg-background px-3 disabled:opacity-50"
                            value={reasonCode ?? ''}
                            disabled={!targetStatus}
                            onChange={(event) =>
                              setReasonCode(
                                (event.target.value ||
                                  null) as TransitionReason | null
                              )
                            }
                          >
                            <option value="">Choose a reason</option>
                            {reasonOptions.map((reason) => (
                              <option key={reason.value} value={reason.value}>
                                {reason.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <label className="block space-y-2 text-sm">
                        <span className="font-medium">
                          Internal note {reasonCode === 'OTHER' ? '(required)' : '(optional)'}
                        </span>
                        <textarea
                          className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2"
                          value={note}
                          onChange={(event) => setNote(event.target.value)}
                          placeholder="Do not enter Aadhaar, PAN, provider references, OTPs, or document contents."
                        />
                      </label>
                      <Button
                        onClick={() => void applyTransition()}
                        disabled={
                          saving || !targetStatus || !reasonCode
                        }
                        variant={
                          targetStatus === 'rejected' ||
                          targetStatus === 'cancelled'
                            ? 'outline'
                            : 'default'
                        }
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : targetStatus === 'rejected' ? (
                          <XCircle className="h-4 w-4" />
                        ) : targetStatus === 'cancelled' ? (
                          <Ban className="h-4 w-4" />
                        ) : (
                          <PhoneCall className="h-4 w-4" />
                        )}
                        {targetStatus
                          ? transitionLabel(targetStatus)
                          : 'Apply transition'}
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-lg border border-border/70 bg-background/40 p-3 text-sm text-muted-foreground">
                      {isTerminal
                        ? 'This request is terminal and has no available staff transitions.'
                        : 'No staff transitions were authorized by the server. Refresh before taking action.'}
                    </div>
                  )}
                </section>

                {Array.isArray(selectedRequest.statusHistory) &&
                selectedRequest.statusHistory.length ? (
                  <section>
                    <h3 className="mb-3 font-semibold">Safe status history</h3>
                    <div className="space-y-2">
                      {selectedRequest.statusHistory.map((entry, index) => (
                        <div
                          key={`${entry.toStatus ?? entry.status}-${entry.createdAt}-${index}`}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/30 px-3 py-2 text-sm"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant={statusTone(
                                entry.toStatus ?? entry.status
                              )}
                            >
                              {entry.fromStatus
                                ? `${titleCase(entry.fromStatus)} → `
                                : ''}
                              {titleCase(entry.toStatus ?? entry.status)}
                            </Badge>
                            <span className="text-muted-foreground">
                              {titleCase(entry.reasonCode)}
                            </span>
                            {entry.notePresent ? (
                              <Badge variant="outline">Internal note recorded</Badge>
                            ) : null}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(entry.createdAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            ) : (
              <div className="rounded-xl border border-border/70 bg-background/30 p-10 text-center text-sm text-muted-foreground">
                Select an assisted-domain request to inspect its safe detail.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {actionModal.modal}
    </main>
  )
}
