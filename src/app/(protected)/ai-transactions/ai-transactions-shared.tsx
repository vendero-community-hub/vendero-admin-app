'use client'

import { Activity, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import type { AiCurrency, AiStatus } from './ai-transactions-data'
import type { AiLiveState } from './use-ai-transactions'

export function StatusBadge({ status }: { status: AiStatus }) {
  return <Badge variant={status === 'completed' ? 'success' : status === 'failed' ? 'danger' : 'warning'}>{status === 'running' ? 'Running' : status === 'completed' ? 'Completed' : 'Failed'}</Badge>
}

export function LiveControls({ liveState, refreshing, updatedAt, refresh }: { liveState: AiLiveState; refreshing: boolean; updatedAt: Date | null; refresh: () => Promise<void> }) {
  const label = { connecting: 'Connecting…', live: 'Live updates', reconnecting: 'Reconnecting…', unavailable: 'Unavailable' }[liveState]
  return <div className="flex flex-wrap items-center gap-3">
    <div className="space-y-1 text-right">
      <Badge variant={liveState === 'live' ? 'success' : liveState === 'unavailable' ? 'warning' : 'secondary'} title={liveState === 'unavailable' ? 'The live connection is unavailable. Use Refresh to load current data.' : undefined}><Activity className="mr-1.5 h-3 w-3" />{label}</Badge>
      {updatedAt ? <p className="text-xs text-muted-foreground">Updated {updatedAt.toLocaleTimeString()}</p> : null}
    </div>
    <Button variant="outline" onClick={() => void refresh()} disabled={refreshing}><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh</Button>
  </div>
}

export function Metric({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return <Card role="group" aria-label={title}><CardHeader className="pb-2"><CardDescription>{title}</CardDescription></CardHeader><CardContent><p className="break-words text-2xl font-semibold tracking-tight tabular-nums">{value}</p>{hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}</CardContent></Card>
}

export function ErrorNotice({ message }: { message: string }) {
  return <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{message}</div>
}

export function CurrencyToggle({ currency, onChange }: { currency: AiCurrency; onChange: (currency: AiCurrency) => void }) {
  return <div role="group" aria-label="Display currency" className="inline-flex rounded-lg border border-border bg-card p-1">
    {(['USD', 'INR'] as const).map((item) => <button key={item} type="button" aria-pressed={currency === item} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${currency === item ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => onChange(item)}>{item === 'USD' ? '$ USD' : '₹ INR'}</button>)}
  </div>
}
