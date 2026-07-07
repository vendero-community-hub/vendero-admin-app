'use client'

import { useMemo, useState } from 'react'
import { Ban, RefreshCw, RotateCcw, Search, SquareTerminal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useActionModal } from '@/components/ui/action-modal'

type QueueRecord = { key: string; pending: number; delayed: number; deadLetters: number }
type FailedJob = {
  index?: number
  raw: string
  id: string | null
  attempts: number
  failureReason: string | null
  failedAt: string | null
  job: Record<string, any> | null
}

export type WorkerQueuesData = {
  overview: { queues: QueueRecord[]; totals: { pending: number; delayed: number; deadLetters: number }; unavailableReason?: string } | null
  failedJobs: Array<{ key: string; jobs: FailedJob[] }> | null
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
  if (!response.ok) throw new Error(payload?.message ?? payload?.error?.message ?? 'Request failed')
  return unwrapPayload(payload)
}

function compactQueueName(key: string) {
  return key.replace(/^queue:/, '').replace(/\./g, ' / ')
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not set'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function WorkerQueuesPanel({ initialData }: { initialData: WorkerQueuesData }) {
  const [overview, setOverview] = useState(initialData?.overview ?? null)
  const [failedJobs, setFailedJobs] = useState(initialData?.failedJobs ?? [])
  const [selectedQueue, setSelectedQueue] = useState(initialData?.overview?.queues[0]?.key ?? '')
  const [query, setQuery] = useState('')
  const [working, setWorking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const actionModal = useActionModal()

  const selectedFailures = useMemo(() => {
    const rows = failedJobs.find((item) => item.key === selectedQueue)?.jobs ?? []
    const normalized = query.trim().toLowerCase()
    if (!normalized) return rows
    return rows.filter((job) =>
      [job.id ?? '', job.failureReason ?? '', job.raw].some((value) =>
        String(value).toLowerCase().includes(normalized)
      )
    )
  }, [failedJobs, query, selectedQueue])

  async function refresh(queueKey = selectedQueue) {
    setWorking('refresh')
    setError(null)
    try {
      const params = queueKey ? `?queueKey=${encodeURIComponent(queueKey)}` : ''
      const [nextOverview, nextFailed] = await Promise.all([
        requestJson('/api/v1/admin/worker/overview'),
        requestJson(`/api/v1/admin/worker/failed-jobs${params}`),
      ])
      setOverview(nextOverview)
      setFailedJobs(nextFailed)
      if (!queueKey && nextOverview?.queues?.[0]?.key) setSelectedQueue(nextOverview.queues[0].key)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to refresh worker queues')
    } finally {
      setWorking(null)
    }
  }

  async function retryJob(job: FailedJob) {
    const identifier = job.id ?? job.raw
    setWorking(`retry-${identifier}`)
    setError(null)
    try {
      await requestJson('/api/v1/admin/worker/retry-job', { queueKey: selectedQueue, jobId: identifier }, 'POST')
      await refresh(selectedQueue)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to retry job')
    } finally {
      setWorking(null)
    }
  }

  async function cancelJob(job: FailedJob) {
    const identifier = job.id ?? job.raw
    const confirmed = await actionModal.confirm({
      title: 'Cancel queued job?',
      description: 'This removes the selected queued or dead-letter job from the worker queue.',
      confirmLabel: 'Cancel job',
      variant: 'danger',
    })
    if (!confirmed) return
    setWorking(`cancel-${identifier}`)
    setError(null)
    try {
      await requestJson('/api/v1/admin/worker/cancel-job', { queueKey: selectedQueue, jobId: identifier }, 'POST')
      await refresh(selectedQueue)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to cancel job')
    } finally {
      setWorking(null)
    }
  }

  const queues = overview?.queues ?? []

  return (
    <>
    <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <Card className="border-border/70 bg-card/80">
        <CardHeader className="gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardDescription className="uppercase tracking-[0.2em] text-muted-foreground">Queues</CardDescription>
              <CardTitle className="mt-2 text-2xl">Worker queue dashboard</CardTitle>
            </div>
            <Button variant="outline" onClick={() => void refresh()} disabled={working === 'refresh'}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
          {error ? <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</div> : null}
          {overview?.unavailableReason ? <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">{overview.unavailableReason}</div> : null}
        </CardHeader>
        <CardContent className="space-y-3">
          {queues.map((queue) => (
            <button
              key={queue.key}
              className={`w-full rounded-lg border p-4 text-left transition-colors ${selectedQueue === queue.key ? 'border-primary bg-primary/10' : 'border-border/70 bg-background/30 hover:bg-accent/40'}`}
              onClick={() => {
                setSelectedQueue(queue.key)
                void refresh(queue.key)
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{compactQueueName(queue.key)}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{queue.key}</p>
                </div>
                <SquareTerminal className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <Badge variant={queue.pending ? 'warning' : 'secondary'}>{queue.pending} pending</Badge>
                <Badge variant={queue.delayed ? 'warning' : 'secondary'}>{queue.delayed} delayed</Badge>
                <Badge variant={queue.deadLetters ? 'danger' : 'secondary'}>{queue.deadLetters} dead</Badge>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80">
        <CardHeader className="gap-4">
          <div>
            <CardDescription className="uppercase tracking-[0.2em] text-muted-foreground">Dead letters</CardDescription>
            <CardTitle className="mt-2 text-2xl">{selectedQueue ? compactQueueName(selectedQueue) : 'No queue selected'}</CardTitle>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search job id, reason, or raw payload" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {selectedFailures.map((job, index) => (
            <div key={`${job.id ?? index}-${job.index ?? index}`} className="rounded-lg border border-border/70 bg-background/30 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="danger">dead letter</Badge>
                    <Badge variant="outline">{job.attempts} attempts</Badge>
                    <Badge variant="outline">{formatDate(job.failedAt)}</Badge>
                  </div>
                  <h3 className="truncate text-lg font-semibold">{job.id ?? `payload #${job.index ?? index}`}</h3>
                  <p className="line-clamp-3 text-sm text-muted-foreground">{job.failureReason ?? 'No failure reason recorded'}</p>
                  <pre className="max-h-32 overflow-auto rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">{JSON.stringify(job.job ?? job.raw, null, 2)}</pre>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button size="sm" onClick={() => void retryJob(job)} disabled={working === `retry-${job.id ?? job.raw}`}>
                    <RotateCcw className="h-4 w-4" />
                    Retry
                  </Button>
                  <Button size="sm" variant="outline" className="border-rose-500/30 text-rose-200 hover:bg-rose-500/10" onClick={() => void cancelJob(job)} disabled={working === `cancel-${job.id ?? job.raw}`}>
                    <Ban className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {!selectedFailures.length ? (
            <div className="rounded-lg border border-border/70 bg-background/30 p-6 text-center text-sm text-muted-foreground">
              No failed jobs found for this queue.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
    {actionModal.modal}
    </>
  )
}
