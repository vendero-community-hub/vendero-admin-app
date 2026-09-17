'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState } from 'react'
import { ArrowUpRight, CheckCircle2, CircleAlert, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { currencyCost, errorMessage, formatDate, formatMoney, formatNumber, serviceLabel, type AiAnalytics, type AiCurrency } from './ai-transactions-data'

const th = 'whitespace-nowrap px-5 py-3 text-left text-xs font-medium text-muted-foreground'
const td = 'px-5 py-3 text-sm'

export function AiActivityChart({ analytics, currency, loading }: { analytics: AiAnalytics | undefined; currency: AiCurrency; loading: boolean }) {
  const [metric, setMetric] = useState<'calls' | 'cost' | 'errors'>('calls')
  const gradient = useId().replace(/:/g, '')
  const rows = analytics?.timeline ?? []
  const chartRef = useRef<SVGSVGElement | null>(null)
  const [chartWidth, setChartWidth] = useState(800)
  useEffect(() => {
    const node = chartRef.current
    if (!node || typeof ResizeObserver === 'undefined') return
    const resize = () => setChartWidth(Math.max(260, Math.round(node.getBoundingClientRect().width)))
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(node)
    return () => observer.disconnect()
  }, [rows.length])
  const values = rows.map((row) => metric === 'calls' ? row.calls : metric === 'errors' ? row.failedCalls ?? 0 : currency === 'INR' ? row.costInr ?? null : row.costUsd)
  const max = Math.max(1, ...values.filter((value): value is number => value !== null))
  const plot = { left: 58, right: chartWidth - 20, top: 20, bottom: 178 }
  const points = values.map((value, index) => ({ value, x: rows.length === 1 ? (plot.left + plot.right) / 2 : plot.left + index / Math.max(1, rows.length - 1) * (plot.right - plot.left), y: plot.bottom - (value ?? 0) / max * (plot.bottom - plot.top) }))
  const line = points.map((point, index) => point.value === null ? '' : `${index === 0 || points[index - 1].value === null ? 'M' : 'L'}${point.x},${point.y}`).join(' ')
  const allConverted = points.every((point) => point.value !== null)
  const area = points.length && allConverted ? `${line} L${points.at(-1)!.x},${plot.bottom} L${points[0].x},${plot.bottom} Z` : ''
  const label = metric === 'calls' ? 'OpenAI calls' : metric === 'errors' ? 'Failed calls' : `Estimated spend (${currency})`
  const valueLabel = (value: number | null) => metric === 'cost' ? formatMoney(value, currency) : value == null ? 'Unavailable' : formatNumber(value)
  const tickLabel = (value: number) => metric === 'cost' ? new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value) : formatNumber(Math.round(value))
  const color = metric === 'errors' ? '#fb7185' : metric === 'cost' ? '#a78bfa' : '#05cba4'
  const total = metric === 'calls' ? analytics?.summary.calls : metric === 'errors' ? analytics?.summary.failedCalls ?? analytics?.errors?.total : currency === 'INR' ? analytics?.summary.costInr : analytics?.summary.costUsd
  return <Card className="min-w-0"><CardHeader className="flex-row flex-wrap items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Activity over time</CardTitle><CardDescription className="mt-2">Daily activity for your selected filters.</CardDescription></div><div className="inline-flex rounded-lg border border-border p-1" role="group" aria-label="Chart metric">{(['calls', 'cost', 'errors'] as const).map((item) => <button type="button" key={item} aria-pressed={metric === item} onClick={() => setMetric(item)} className={`rounded-md px-3 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${metric === item ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{item === 'calls' ? 'Calls' : item === 'cost' ? 'Spend' : 'Errors'}</button>)}</div></CardHeader>
    <CardContent><div className="mb-4 flex items-baseline gap-2"><span className="text-2xl font-semibold tracking-tight tabular-nums">{total == null ? '—' : metric === 'cost' && analytics ? currencyCost(analytics.summary, currency) : valueLabel(total)}</span><span className="text-xs text-muted-foreground">{label.toLowerCase()}</span></div>
      {rows.length ? <><svg ref={chartRef} viewBox={`0 0 ${chartWidth} 218`} className="h-auto min-h-[180px] w-full" role="img" aria-label={`${label} trend across ${rows.length} recorded days`}>
        <defs><linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.24" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        {[0, 0.5, 1].map((fraction) => { const y = plot.bottom - fraction * (plot.bottom - plot.top); return <g key={fraction}><line x1={plot.left} x2={plot.right} y1={y} y2={y} stroke="currentColor" className="text-border" strokeDasharray="4 5" /><text x={plot.left - 10} y={y + 4} textAnchor="end" fill="currentColor" className="text-muted-foreground" fontSize="10">{tickLabel(max * fraction)}</text></g> })}
        {area ? <path d={area} fill={`url(#${gradient})`} /> : null}<path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((point, index) => point.value === null ? null : <circle key={rows[index].date} cx={point.x} cy={point.y} r={rows.length > 40 ? 2 : 4} fill={color} stroke="var(--card)" strokeWidth="2" tabIndex={0} role="img" aria-label={`${rows[index].date}: ${valueLabel(point.value)}`}><title>{rows[index].date}: {valueLabel(point.value)}</title></circle>)}
        {rows.map((row, index) => index === 0 || index === rows.length - 1 || index % Math.max(1, Math.ceil(rows.length / 6)) === 0 ? <text key={row.date} x={points[index].x} y="205" textAnchor={index === 0 ? 'start' : index === rows.length - 1 ? 'end' : 'middle'} fill="currentColor" className="text-muted-foreground" fontSize="10">{row.date.slice(5, 10)}</text> : null)}
      </svg><details className="mt-2"><summary className="w-fit cursor-pointer text-xs text-muted-foreground">View chart data</summary><div className="mt-3 max-h-56 overflow-auto"><table className="w-full text-xs"><thead><tr>{['Date', 'Calls', 'Failed', `Spend (${currency})`].map((title) => <th className="p-2 text-left font-medium text-muted-foreground" key={title}>{title}</th>)}</tr></thead><tbody>{rows.map((row) => <tr className="border-t border-border" key={row.date}><td className="p-2">{row.date}</td><td className="p-2">{formatNumber(row.calls)}</td><td className="p-2">{formatNumber(row.failedCalls)}</td><td className="p-2">{currencyCost(row, currency)}</td></tr>)}</tbody></table></div></details></> : <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">{loading ? 'Loading activity…' : 'No activity in this period.'}</div>}
      {currency === 'INR' && metric === 'cost' ? <p className="mt-3 text-[11px] text-muted-foreground">Historical spend uses the exchange rate saved with each call. Calls awaiting a rate are excluded from known INR spend.</p> : null}
    </CardContent>
  </Card>
}

function Breakdown({ title, items, color }: { title: string; items: Array<{ label: string; value: number }>; color: string }) {
  const max = Math.max(1, ...items.map((item) => item.value))
  return <div><h4 className="mb-4 text-xs font-medium text-muted-foreground">{title}</h4>{items.length ? <div className="space-y-4">{items.slice(0, 6).map((item) => <div key={item.label}><div className="mb-1.5 flex items-start justify-between gap-3 text-xs"><span className="break-all">{item.label}</span><span className="tabular-nums text-muted-foreground">{formatNumber(item.value)}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${color}`} style={{ width: `${item.value / max * 100}%` }} /></div></div>)}</div> : <p className="text-xs text-muted-foreground">No failed calls recorded.</p>}</div>
}

export function AiErrorAnalytics({ analytics, loading }: { analytics: AiAnalytics | undefined; loading: boolean }) {
  const errors = analytics?.errors
  const count = errors?.total ?? analytics?.summary.failedCalls ?? 0
  const failureRate = analytics?.summary.calls ? count / analytics.summary.calls * 100 : 0
  return <Card className="min-w-0"><CardHeader><div className="flex items-center justify-between gap-2"><CardTitle className="flex items-center gap-2"><CircleAlert className="h-4 w-4 text-rose-400" />Error breakdown</CardTitle><Badge variant={count ? 'danger' : 'success'}>{failureRate.toFixed(1)}%</Badge></div><CardDescription>Failed model calls, including retried attempts.</CardDescription></CardHeader><CardContent><div className="mb-5 flex items-baseline gap-2"><span className="text-2xl font-semibold tabular-nums">{analytics ? formatNumber(count) : '—'}</span><span className="text-xs text-muted-foreground">failed calls in this period</span></div>{loading && !analytics ? <p className="py-8 text-sm text-muted-foreground">Loading errors…</p> : count ? <div className="grid gap-6 sm:grid-cols-2"><Breakdown title="By service" items={errors?.byService.map((item) => ({ label: serviceLabel(item.service), value: item.count })) ?? []} color="bg-rose-400/80" /><Breakdown title="By model" items={errors?.byModel.map((item) => ({ label: item.model, value: item.count })) ?? []} color="bg-amber-400/80" /></div> : <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-primary/15 bg-primary/5 text-center"><CheckCircle2 className="mb-3 h-7 w-7 text-primary" /><p className="text-sm font-medium">No errors in this period</p><p className="mt-1 text-xs text-muted-foreground">Failures will appear by service and model.</p></div>}{errors?.byCode.length ? <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">{errors.byCode.slice(0, 8).map((item) => <Badge key={item.code} variant="outline">{item.code} · {formatNumber(item.count)}</Badge>)}</div> : null}</CardContent></Card>
}

export function AiUsageTables({ analytics, currency, loading }: { analytics: AiAnalytics | undefined; currency: AiCurrency; loading: boolean }) {
  const maxServiceCalls = Math.max(1, ...(analytics?.services.map((item) => item.calls) ?? []))
  return <div className="grid min-w-0 gap-4 lg:grid-cols-[1.5fr_1fr]">
    <Card className="min-w-0"><CardHeader><CardTitle>Model performance</CardTitle><CardDescription>Calls, saved cost and failures for every model.</CardDescription></CardHeader><CardContent className="px-0"><div className="overflow-x-auto"><table className="w-full" aria-label="Usage by model"><thead className="border-y border-border bg-muted/20"><tr>{['Model', 'Calls', 'Errors', 'Input / output', `Spend (${currency})`].map((title) => <th key={title} className={th}>{title}</th>)}</tr></thead><tbody className="divide-y divide-border">{analytics?.models.map((model) => <tr key={model.model}><td className={`${td} min-w-[140px] max-w-56 break-words font-medium`}>{model.model}</td><td className={`${td} tabular-nums`}>{formatNumber(model.calls)}</td><td className={`${td} tabular-nums ${model.failedCalls ? 'text-rose-300' : 'text-muted-foreground'}`}>{formatNumber(model.failedCalls)}</td><td className={`${td} whitespace-nowrap text-xs tabular-nums`}>{formatNumber(model.inputTokens)} / {formatNumber(model.outputTokens)}<p className="mt-1 text-[11px] text-muted-foreground">{formatNumber(model.cachedInputTokens)} cached</p></td><td className={`${td} whitespace-nowrap tabular-nums`}>{currencyCost(model, currency)}</td></tr>)}</tbody></table></div>{!analytics?.models.length ? <p className="px-6 py-8 text-sm text-muted-foreground">{loading ? 'Loading model usage…' : 'No model calls in this period.'}</p> : null}</CardContent></Card>
    <Card className="min-w-0"><CardHeader><CardTitle>Service usage</CardTitle><CardDescription>How requests and spend are distributed.</CardDescription></CardHeader><CardContent className="space-y-5">{analytics?.services.map((service) => <div key={service.service}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium">{serviceLabel(service.service)}</p><p className="mt-1 text-xs text-muted-foreground">{formatNumber(service.transactions)} requests · {formatNumber(service.calls)} calls{service.failedCalls ? <span className="text-rose-300"> · {formatNumber(service.failedCalls)} errors</span> : null}</p></div><span className="whitespace-nowrap text-sm tabular-nums">{currencyCost(service, currency)}</span></div><div className="mt-3 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-primary/70" style={{ width: `${service.calls / maxServiceCalls * 100}%` }} /></div></div>)}{!analytics?.services.length ? <p className="py-8 text-sm text-muted-foreground">{loading ? 'Loading services…' : 'No service activity in this period.'}</p> : null}</CardContent></Card>
  </div>
}

export function AiRecentErrors({ analytics, loading }: { analytics: AiAnalytics | undefined; loading: boolean }) {
  const rows = analytics?.errors?.recent ?? []
  return <Card className="min-w-0"><CardHeader className="flex-row flex-wrap items-center justify-between gap-3"><div><CardTitle>Recent error logs</CardTitle><CardDescription className="mt-2">Inspect the service, model and request behind each failed call.</CardDescription></div><Badge variant="outline">{formatNumber(analytics?.errors?.total ?? 0)} failures</Badge></CardHeader><CardContent className="px-0">{rows.length ? <div className="overflow-x-auto"><table className="w-full" aria-label="Recent failed AI calls"><thead className="border-y border-border bg-muted/20"><tr>{['Time', 'Service / model', 'Error', 'Request'].map((title) => <th key={title} className={th}>{title}</th>)}</tr></thead><tbody className="divide-y divide-border">{rows.map((row) => <tr key={row.id}><td className={`${td} whitespace-nowrap text-xs text-muted-foreground`}>{formatDate(row.startedAt)}</td><td className={td}><p className="whitespace-nowrap text-xs">{serviceLabel(row.service)}</p><p className="mt-1 text-xs text-muted-foreground">{row.model || 'Unknown model'}</p></td><td className={`${td} min-w-52 max-w-lg break-words text-xs text-rose-300`}><p className="line-clamp-3" title={errorMessage(row.error)}>{errorMessage(row.error)}</p></td><td className={td}><Link href={`/ai-transactions/${encodeURIComponent(row.transactionId)}#call-${encodeURIComponent(row.id)}`} className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-primary hover:underline">View call<ArrowUpRight className="h-3.5 w-3.5" /></Link></td></tr>)}</tbody></table></div> : <p className="px-6 pb-3 text-sm text-muted-foreground">{loading ? 'Loading error logs…' : 'No failed calls match your filters.'}</p>}</CardContent></Card>
}
