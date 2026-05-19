'use client'

import { useMemo, useState } from 'react'
import { RefreshCw, Search, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type AuditLog = {
  id: number
  userId: number | null
  action: string
  resource: string
  resourceId: string | null
  requestId: string | null
  ipAddress: string | null
  method: string | null
  path: string | null
  metadata: Record<string, unknown>
  createdAt: string | null
  user: { id: number; fullName: string | null; email: string | null; phone: string | null; role: string | null } | null
}

export type AuditLogsData = {
  logs: AuditLog[]
  analytics: {
    total: number
    total24h: number
    actorCount24h: number
    topActions: Array<{ action: string; total: number }>
    topResources: Array<{ resource: string; total: number }>
  }
  filters: {
    q: string
    action: string
    resource: string
    userId: number | null
    from: string | null
    to: string | null
    limit: number
  }
} | null

function unwrapPayload(payload: any) {
  return payload?.data?.data ?? payload?.data ?? payload
}

function getAdminToken() {
  return document.cookie
    .split('; ')
    .find((part) => part.startsWith('vendero_admin_access_token='))
    ?.split('=')[1] ?? null
}

async function requestJson(path: string) {
  const token = getAdminToken()
  const response = await fetch(path, {
    headers: { authorization: token ? `Bearer ${token}` : '' },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.message ?? payload?.error?.message ?? 'Request failed')
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

function actorLabel(log: AuditLog) {
  if (!log.user) return 'System'
  return log.user.fullName ?? log.user.email ?? log.user.phone ?? `User #${log.user.id}`
}

function toneForAction(action: string) {
  if (action.includes('delete') || action.includes('revoke') || action.includes('block')) return 'danger' as const
  if (action.includes('create') || action.includes('sent') || action.includes('approved')) return 'success' as const
  if (action.includes('update') || action.includes('review') || action.includes('retry')) return 'warning' as const
  return 'secondary' as const
}

export function AuditLogsPanel({ initialData }: { initialData: AuditLogsData }) {
  const [data, setData] = useState<AuditLogsData>(initialData)
  const [query, setQuery] = useState(initialData?.filters.q ?? '')
  const [action, setAction] = useState(initialData?.filters.action ?? 'all')
  const [resource, setResource] = useState(initialData?.filters.resource ?? 'all')
  const [selectedId, setSelectedId] = useState<number | null>(initialData?.logs[0]?.id ?? null)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedLog = useMemo(
    () => data?.logs.find((log) => log.id === selectedId) ?? data?.logs[0] ?? null,
    [data?.logs, selectedId]
  )

  const actionOptions = useMemo(() => ['all', ...(data?.analytics.topActions.map((item) => item.action) ?? [])], [data])
  const resourceOptions = useMemo(() => ['all', ...(data?.analytics.topResources.map((item) => item.resource) ?? [])], [data])

  async function refresh() {
    setWorking(true)
    setError(null)
    try {
      const params = new URLSearchParams({ limit: '80' })
      if (query.trim()) params.set('q', query.trim())
      if (action !== 'all') params.set('action', action)
      if (resource !== 'all') params.set('resource', resource)
      const nextData = (await requestJson(`/api/v1/admin/audit-logs?${params.toString()}`)) as AuditLogsData
      setData(nextData)
      setSelectedId(nextData?.logs[0]?.id ?? null)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to refresh audit logs')
    } finally {
      setWorking(false)
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Card className="border-border/70 bg-card/80">
        <CardHeader className="gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardDescription className="uppercase tracking-[0.2em] text-muted-foreground">Browser</CardDescription>
              <CardTitle className="mt-2 text-2xl">Audit log directory</CardTitle>
            </div>
            <Button variant="outline" onClick={() => void refresh()} disabled={working}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') void refresh() }}
              placeholder="Search action, resource, actor, request, path, IP, metadata"
            />
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <select className="h-10 rounded-md border border-border bg-background px-3 text-sm" value={action} onChange={(event) => setAction(event.target.value)}>
              {actionOptions.map((option) => <option key={option} value={option}>{option === 'all' ? 'All actions' : option}</option>)}
            </select>
            <select className="h-10 rounded-md border border-border bg-background px-3 text-sm" value={resource} onChange={(event) => setResource(event.target.value)}>
              {resourceOptions.map((option) => <option key={option} value={option}>{option === 'all' ? 'All resources' : option}</option>)}
            </select>
          </div>

          {error ? <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</div> : null}
        </CardHeader>
        <CardContent className="space-y-3">
          {data?.logs.map((log) => (
            <button
              key={log.id}
              className={`w-full rounded-lg border p-4 text-left transition-colors ${selectedLog?.id === log.id ? 'border-primary bg-primary/10' : 'border-border/70 bg-background/30 hover:bg-accent/40'}`}
              onClick={() => setSelectedId(log.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={toneForAction(log.action)}>{log.action}</Badge>
                    <Badge variant="outline">{log.resource}</Badge>
                  </div>
                  <p className="mt-2 truncate font-medium">{actorLabel(log)}</p>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{log.method ?? 'ACTION'} {log.path ?? log.resourceId ?? '-'}</p>
                </div>
                <p className="shrink-0 text-xs text-muted-foreground">{formatDate(log.createdAt)}</p>
              </div>
            </button>
          ))}
          {!data?.logs.length ? <div className="rounded-lg border border-border/70 bg-background/30 p-6 text-center text-sm text-muted-foreground">No audit logs found.</div> : null}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardDescription className="uppercase tracking-[0.2em] text-muted-foreground">Detail</CardDescription>
          <CardTitle className="mt-2 text-2xl">Selected audit event</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedLog ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-border/70 bg-background/30 p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <p className="font-medium">{selectedLog.action}</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{actorLabel(selectedLog)} / {formatDate(selectedLog.createdAt)}</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {[
                  ['Resource', selectedLog.resource],
                  ['Resource ID', selectedLog.resourceId ?? '-'],
                  ['Request ID', selectedLog.requestId ?? '-'],
                  ['IP address', selectedLog.ipAddress ?? '-'],
                  ['Method', selectedLog.method ?? '-'],
                  ['Path', selectedLog.path ?? '-'],
                  ['Actor role', selectedLog.user?.role ?? 'system'],
                  ['Actor ID', selectedLog.userId ?? '-'],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg border border-border/70 bg-background/30 p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
                    <p className="mt-2 break-words text-sm font-medium">{String(value)}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Metadata</p>
                <pre className="max-h-[460px] overflow-auto rounded-lg border border-border/70 bg-background/40 p-4 text-xs text-muted-foreground">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border/70 bg-background/30 p-6 text-center text-sm text-muted-foreground">
              Select an audit log to inspect details.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
