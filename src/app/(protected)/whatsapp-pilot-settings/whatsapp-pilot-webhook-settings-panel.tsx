'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  ServerCog,
  ShieldCheck,
  Webhook,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useActionModal } from '@/components/ui/action-modal'

type AccountResult = {
  accountId: number
  vendorProfileId: number
  businessName: string | null
  wabaId: string
  status: 'success' | 'failed'
  previousCallbackUrl: string | null
  callbackUrl: string | null
  error: string | null
}

export type WhatsPilotWebhookSettings = {
  environment: string
  callbackUrl: string
  source: 'admin' | 'environment'
  status: 'configured' | 'validating' | 'syncing' | 'healthy' | 'partial' | 'failed'
  verifyTokenConfigured: boolean
  graphVersion: string
  appId: string | null
  connectedAccounts: number
  successfulAccounts: number
  failedAccounts: number
  lastValidatedAt: string | null
  lastSyncStartedAt: string | null
  lastSyncCompletedAt: string | null
  lastError: string | null
  accountResults: AccountResult[]
  updatedAt: string | null
}

function adminToken() {
  return document.cookie
    .split('; ')
    .find((part) => part.startsWith('vendero_admin_access_token='))
    ?.split('=')[1]
}

function formatDate(value: string | null) {
  if (!value) return 'Never'
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function statusVariant(status: WhatsPilotWebhookSettings['status']) {
  if (status === 'healthy') return 'success' as const
  if (status === 'partial' || status === 'validating' || status === 'syncing') return 'warning' as const
  if (status === 'failed') return 'danger' as const
  return 'secondary' as const
}

export function WhatsPilotWebhookSettingsPanel({
  initialSettings,
}: {
  initialSettings: WhatsPilotWebhookSettings | null
}) {
  const [settings, setSettings] = useState(initialSettings)
  const [callbackUrl, setCallbackUrl] = useState(initialSettings?.callbackUrl ?? '')
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const actionModal = useActionModal()

  async function synchronize() {
    const normalized = callbackUrl.trim()
    if (!normalized) {
      setError('Enter the public HTTPS callback URL.')
      return
    }
    const confirmed = await actionModal.confirm({
      title: 'Update every connected WhatsPilot account?',
      description:
        'The server will verify this endpoint first, then replace the Meta webhook override for every connected WABA. Accounts that fail will remain visible in the result table.',
      confirmLabel: 'Validate and update all',
    })
    if (!confirmed) return

    setWorking(true)
    setError(null)
    try {
      const response = await fetch('/api/v1/admin/whatsapp-pilot/webhook-settings', {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          authorization: adminToken() ? `Bearer ${adminToken()}` : '',
        },
        body: JSON.stringify({
          callbackUrl: normalized,
          confirmAccountResubscription: true,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? payload?.message ?? 'Webhook update failed')
      }
      const next = (payload.data?.data ?? payload.data) as WhatsPilotWebhookSettings
      setSettings(next)
      setCallbackUrl(next.callbackUrl)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Webhook update failed')
    } finally {
      setWorking(false)
    }
  }

  return (
    <>
      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-2.5 text-emerald-500">
            <Webhook className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">WhatsPilot webhook settings</h1>
            <p className="text-sm text-muted-foreground">
              Validate the public endpoint and keep every connected Meta WABA subscription aligned.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.7fr)]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Public callback URL</CardTitle>
                <CardDescription>
                  Saving performs a Meta-compatible challenge before any connected account is changed.
                </CardDescription>
              </div>
              {settings ? <Badge variant={statusVariant(settings.status)}>{settings.status}</Badge> : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="whats-pilot-callback" className="text-sm font-medium">
                HTTPS callback endpoint
              </label>
              <Input
                id="whats-pilot-callback"
                value={callbackUrl}
                onChange={(event) => setCallbackUrl(event.target.value)}
                placeholder="https://api.example.com/api/v1/meta/webhooks/whatsapp"
                autoCapitalize="none"
                autoCorrect="off"
              />
              <p className="text-xs text-muted-foreground">
                Expected path: <code>/api/v1/meta/webhooks/whatsapp</code>. The verification token stays encrypted on the API server.
              </p>
            </div>

            {error ? (
              <div className="flex gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-500">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}
            {settings?.lastError ? (
              <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{settings.lastError}</span>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button onClick={synchronize} disabled={working || !callbackUrl.trim()}>
                {working ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                {working ? 'Validating and synchronizing…' : 'Validate and update all accounts'}
              </Button>
              {settings?.callbackUrl ? (
                <Button variant="outline" asChild>
                  <a href={settings.callbackUrl} target="_blank" rel="noreferrer">
                    Check endpoint <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configuration health</CardTitle>
            <CardDescription>Current environment and most recent synchronization.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-muted-foreground">Connected</p>
                <p className="mt-1 text-xl font-semibold">{settings?.connectedAccounts ?? 0}</p>
              </div>
              <div className="rounded-lg border bg-emerald-500/5 p-3">
                <p className="text-muted-foreground">Updated</p>
                <p className="mt-1 text-xl font-semibold text-emerald-500">{settings?.successfulAccounts ?? 0}</p>
              </div>
              <div className="rounded-lg border bg-rose-500/5 p-3">
                <p className="text-muted-foreground">Failed</p>
                <p className="mt-1 text-xl font-semibold text-rose-500">{settings?.failedAccounts ?? 0}</p>
              </div>
            </div>
            <dl className="space-y-3">
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Environment</dt><dd>{settings?.environment ?? 'Unavailable'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Meta app</dt><dd className="font-mono text-xs">{settings?.appId ?? 'Not configured'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Graph version</dt><dd>{settings?.graphVersion ?? '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Verify token</dt><dd>{settings?.verifyTokenConfigured ? 'Configured securely' : 'Missing'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Last validation</dt><dd className="text-right">{formatDate(settings?.lastValidatedAt ?? null)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Last completed</dt><dd className="text-right">{formatDate(settings?.lastSyncCompletedAt ?? null)}</dd></div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connected account subscription results</CardTitle>
          <CardDescription>
            Each WABA is updated and verified independently, so one expired token cannot hide successful accounts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {settings?.accountResults.length ? (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[840px] text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Business</th>
                    <th className="px-4 py-3">WABA ID</th>
                    <th className="px-4 py-3">Previous callback</th>
                    <th className="px-4 py-3">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {settings.accountResults.map((result) => (
                    <tr key={result.accountId}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{result.businessName ?? `Vendor ${result.vendorProfileId}`}</p>
                        <p className="text-xs text-muted-foreground">Vendor #{result.vendorProfileId}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{result.wabaId}</td>
                      <td className="max-w-md break-all px-4 py-3 text-xs text-muted-foreground">{result.previousCallbackUrl ?? 'No override returned'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          {result.status === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" /> : <XCircle className="mt-0.5 h-4 w-4 text-rose-500" />}
                          <div>
                            <p className={result.status === 'success' ? 'text-emerald-500' : 'text-rose-500'}>{result.status}</p>
                            {result.error ? <p className="mt-1 max-w-md text-xs text-muted-foreground">{result.error}</p> : null}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
              <ServerCog className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">No synchronization has run yet</p>
                <p className="text-sm text-muted-foreground">Validate the configured URL to inspect and update every connected account.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {actionModal.modal}
    </>
  )
}
