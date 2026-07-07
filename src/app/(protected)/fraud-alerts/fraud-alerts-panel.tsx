'use client'

import { useState } from 'react'
import {
  Building2,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
  UserRound,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useActionModal } from '@/components/ui/action-modal'

type ReporterSummary = {
  vendorProfileId: number
  userId: number | null
  businessName: string | null
  ownerName: string | null
  phone: string | null
  city: string | null
  state: string | null
} | null

export type FraudAlertRecord = {
  id: number
  publicId: string
  fraudName: string
  fraudPhone: string
  description: string
  status: string
  reportCount: number
  reporter: ReporterSummary
  deleteReason: string | null
  createdAt: string | null
  updatedAt: string | null
  deletedAt: string | null
}

export type FraudAlertsData = {
  reports: FraudAlertRecord[]
  filters: {
    limit: number
    includeDeleted: boolean
  }
  analytics: {
    activeReports: number
    reports24h: number
    deletedReports: number
  }
} | null

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

function reporterLabel(reporter: ReporterSummary) {
  if (!reporter) return 'Admin created'
  return reporter.businessName ?? reporter.ownerName ?? reporter.phone ?? `Vendor #${reporter.vendorProfileId}`
}

function reporterMeta(reporter: ReporterSummary) {
  if (!reporter) return 'Created from admin panel'
  return [reporter.ownerName, reporter.phone, reporter.city, reporter.state].filter(Boolean).join(' · ')
}

function isReportActive(report: FraudAlertRecord) {
  return report.status === 'active' && !report.deletedAt
}

function applyReportUpdate(
  current: FraudAlertsData,
  report: FraudAlertRecord,
  includeDeleted: boolean
): FraudAlertsData {
  if (!current) return current

  const visible = includeDeleted || isReportActive(report)
  const exists = current.reports.some(item => item.id === report.id)
  const reports = visible
    ? exists
      ? current.reports.map(item => (item.id === report.id ? report : item))
      : [report, ...current.reports]
    : current.reports.filter(item => item.id !== report.id)

  return {
    ...current,
    reports,
  }
}

export function FraudAlertsPanel({ initialData }: { initialData: FraudAlertsData }) {
  const [data, setData] = useState<FraudAlertsData>(initialData)
  const [includeDeleted, setIncludeDeleted] = useState(Boolean(initialData?.filters.includeDeleted))
  const [working, setWorking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const actionModal = useActionModal()

  async function refreshFraudAlerts(nextIncludeDeleted = includeDeleted) {
    setWorking('refresh')
    setError(null)

    try {
      const params = new URLSearchParams({
        limit: '80',
        includeDeleted: nextIncludeDeleted ? 'true' : 'false',
      })
      const nextData = await requestJson(`/api/v1/admin/fraud-alerts?${params.toString()}`)
      setData(nextData as FraudAlertsData)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to refresh fraud alerts')
    } finally {
      setWorking(null)
    }
  }

  async function updateDeletedVisibility(checked: boolean) {
    setIncludeDeleted(checked)
    await refreshFraudAlerts(checked)
  }

  async function openReportForm(report?: FraudAlertRecord) {
    const editing = Boolean(report)
    const result = await actionModal.form({
      title: editing ? 'Update fraud alert' : 'Create fraud alert',
      description: 'Fraud name, number, description, aur public visibility modal ke andar manage karo.',
      confirmLabel: editing ? 'Update alert' : 'Create alert',
      fields: [
        {
          name: 'fraudName',
          label: 'Fraud name',
          defaultValue: report?.fraudName ?? '',
          placeholder: 'Fake booking agent',
          required: true,
        },
        {
          name: 'fraudPhone',
          label: 'Fraud contact number',
          defaultValue: report?.fraudPhone ?? '',
          placeholder: '+91 98765 43210',
          required: true,
        },
        {
          name: 'description',
          label: 'Description',
          defaultValue: report?.description ?? '',
          placeholder: 'Scam ka short detail',
          required: true,
          type: 'textarea',
        },
        {
          name: 'isActive',
          label: 'Show in mobile app',
          description: 'Switch off karne par ye alert public Fraud Center se hide ho jayega.',
          defaultValue: report ? isReportActive(report) : true,
          type: 'switch',
        },
      ],
    })

    if (!result.confirmed) return

    const body = {
      fraudName: result.values.fraudName,
      fraudPhone: result.values.fraudPhone,
      description: result.values.description,
      isActive: result.values.isActive === 'true',
    }

    setWorking(editing ? `update-${report?.id}` : 'create')
    setError(null)

    try {
      const payload = await requestJson(
        editing ? `/api/v1/admin/fraud-alerts/${report?.id}` : '/api/v1/admin/fraud-alerts',
        body,
        editing ? 'PUT' : 'POST'
      )
      const nextReport = payload?.report as FraudAlertRecord
      if (nextReport) {
        setData(current => applyReportUpdate(current, nextReport, includeDeleted))
      } else {
        await refreshFraudAlerts()
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save fraud alert')
    } finally {
      setWorking(null)
    }
  }

  async function deleteReport(report: FraudAlertRecord) {
    const result = await actionModal.form({
      title: 'Delete fraud alert?',
      description: 'This removes the report from the mobile Fraud Alert Center. Admin audit trail remains available.',
      confirmLabel: 'Delete alert',
      variant: 'danger',
      fields: [
        {
          name: 'deleteReason',
          label: 'Delete reason',
          defaultValue: '',
          placeholder: 'Wrong number / duplicate / unsafe content',
          type: 'textarea',
        },
        {
          name: 'confirmDelete',
          label: 'I understand this alert will be hidden from mobile users.',
          description: 'Required confirmation before deleting.',
          required: true,
          type: 'checkbox',
        },
      ],
    })
    if (!result.confirmed) return

    setWorking(`delete-${report.id}`)
    setError(null)

    try {
      const payload = await requestJson(
        `/api/v1/admin/fraud-alerts/${report.id}`,
        { deleteReason: result.values.deleteReason.trim() || null },
        'DELETE'
      )
      const deletedReport = payload?.report as FraudAlertRecord
      if (deletedReport) {
        setData(current => applyReportUpdate(current, deletedReport, includeDeleted))
      } else {
        setData(current =>
          current
            ? {
                ...current,
                reports: current.reports.filter(item => item.id !== report.id),
              }
            : current
        )
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to delete fraud alert')
    } finally {
      setWorking(null)
    }
  }

  const reports = data?.reports ?? []

  return (
    <Card className="border-border/70 bg-card/85">
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>User-created fraud posts</CardTitle>
          <CardDescription>Cards submitted from vendor mobile app users.</CardDescription>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Switch
            checked={includeDeleted}
            onCheckedChange={(checked) => void updateDeletedVisibility(checked)}
            label="Show deleted"
            description="Include hidden alerts"
            disabled={working === 'refresh'}
          />
          <Button variant="outline" onClick={() => void refreshFraudAlerts()} disabled={working === 'refresh'}>
            <RefreshCw className={`mr-2 h-4 w-4 ${working === 'refresh' ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => void openReportForm()} disabled={working === 'create'}>
            <Plus className="mr-2 h-4 w-4" />
            Create Alert
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {!reports.length ? (
          <div className="rounded-xl border border-dashed border-border/80 bg-background/30 p-8 text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-semibold">No fraud alerts</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Mobile user reports and admin-created alerts will appear here as reviewable cards.
            </p>
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-2">
          {reports.map(report => {
            const active = isReportActive(report)

            return (
              <div
                key={report.id}
                className="rounded-xl border border-border/70 bg-background/35 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="rounded-xl bg-destructive/10 p-2 text-destructive">
                      <ShieldAlert className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold">{report.fraudName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Created {formatDate(report.createdAt)}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      active
                        ? 'rounded-full border-emerald-500/25 text-emerald-500'
                        : 'rounded-full border-destructive/25 text-destructive'
                    }
                  >
                    {active ? 'active' : 'deleted'}
                  </Badge>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-border/70 bg-card/60 p-3">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      Fraud number
                    </div>
                    <p className="mt-1 font-semibold">{report.fraudPhone}</p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-card/60 p-3">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5" />
                      Reporter
                    </div>
                    <p className="mt-1 truncate font-semibold">{reporterLabel(report.reporter)}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-border/70 bg-card/60 p-3">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Description</p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6">{report.description}</p>
                </div>

                {!active ? (
                  <div className="mt-4 rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
                    Deleted {formatDate(report.deletedAt)}
                    {report.deleteReason ? ` · ${report.deleteReason}` : ''}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                    <UserRound className="h-4 w-4 shrink-0" />
                    <span className="truncate">{reporterMeta(report.reporter)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => void openReportForm(report)}
                      disabled={working === `update-${report.id}`}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    {active ? (
                      <Button
                        variant="outline"
                        className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => void deleteReport(report)}
                        disabled={working === `delete-${report.id}`}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
      {actionModal.modal}
    </Card>
  )
}
