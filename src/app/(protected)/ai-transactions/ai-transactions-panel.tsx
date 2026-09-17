'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, ArrowRight, ChevronLeft, ChevronRight, LayoutDashboard, List } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { analyticsParams, currencyCost, dateRange, defaultFilters, filterParams, formatCompactNumber, formatDate, formatDuration, formatNumber, serviceLabel, type AiAnalytics, type AiBalanceData, type AiFilters, type AiTransactionList } from './ai-transactions-data'
import { requestAiData, useAiCurrency, useAiData } from './use-ai-transactions'
import { useAiFundingExpiry } from './use-ai-funding-expiry'
import { CurrencyToggle, ErrorNotice, LiveControls, Metric, StatusBadge } from './ai-transactions-shared'
import { AiTransactionFilters } from './ai-transactions-filters'
import { AiBalancePanel } from './ai-balance-panel'
import { AiActivityChart, AiErrorAnalytics, AiRecentErrors, AiUsageTables } from './ai-analytics-charts'

const headerCell = 'whitespace-nowrap px-4 py-3 text-left text-xs font-medium text-muted-foreground'
const tableCell = 'px-4 py-3 align-top text-sm'
type Dashboard = { list: AiTransactionList; analytics: AiAnalytics; balance: AiBalanceData | null; balanceError: string | null }

export function AiTransactionsPanel() {
  const [tab, setTab] = useState<'dashboard' | 'transactions'>('dashboard')
  const [draft, setDraft] = useState<AiFilters>(() => defaultFilters())
  const [filters, setFilters] = useState<AiFilters>(() => defaultFilters())
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [filterError, setFilterError] = useState<string | null>(null)
  const { currency, setCurrency } = useAiCurrency()
  useEffect(() => { if (new URLSearchParams(window.location.search).get('tab') === 'transactions') setTab('transactions') }, [])
  const load = useCallback(async (signal: AbortSignal): Promise<Dashboard> => {
    const params = filterParams(filters)
    params.set('page', String(page))
    params.set('perPage', String(perPage))
    const [list, analytics, balanceResult] = await Promise.all([
      requestAiData<AiTransactionList>(`/api/v1/admin/ai/transactions?${params}`, signal),
      requestAiData<AiAnalytics>(`/api/v1/admin/ai/transactions/analytics?${analyticsParams(filters)}`, signal),
      requestAiData<AiBalanceData>('/api/v1/admin/ai/transactions/balance', signal).then((balance) => ({ balance, balanceError: null })).catch((caught: unknown) => ({ balance: null, balanceError: caught instanceof Error ? caught.message : 'The tracked balance could not be loaded.' })),
    ])
    return { list, analytics, ...balanceResult }
  }, [filters, page, perPage])
  const { data, error, refreshing, updatedAt, liveState, refresh } = useAiData(load)
  useAiFundingExpiry(data?.balance?.funding, liveState === 'live', refresh)
  const [knownModels, setKnownModels] = useState<string[]>([])
  const modelOptions = useMemo(() => [...new Set([...knownModels, ...(data?.analytics.models.map((item) => item.model) ?? []), draft.model].filter(Boolean))].sort(), [knownModels, data, draft.model])
  const summary = data?.analytics.summary
  const pagination = data?.list.pagination
  const failedCalls = summary?.failedCalls ?? data?.analytics.errors?.total ?? 0
  const periodLabel = filters.preset === 'today' ? 'Today' : filters.preset === 'week' ? 'This week' : filters.preset === 'month' ? 'This month' : filters.preset === 'day' ? filters.day : filters.preset === 'selected_month' ? filters.month : `${filters.startDay} – ${filters.endDay}`

  function apply(next: AiFilters) {
    try {
      dateRange(next)
      if (next.userId.trim() && !/^\d+$/.test(next.userId.trim())) throw new Error('User ID must contain numbers only.')
      if (next.vendorProfileId.trim() && !/^\d+$/.test(next.vendorProfileId.trim())) throw new Error('Vendor profile ID must contain numbers only.')
      setKnownModels(modelOptions)
      setFilters({ ...next }); setPage(1); setFilterError(null)
    } catch (caught) { setFilterError(caught instanceof Error ? caught.message : 'Check your filters.') }
  }
  function immediate(patch: Partial<AiFilters>) { const next = { ...draft, ...patch }; setDraft(next); apply(next) }
  function reset() { const next = defaultFilters(); setDraft(next); setFilters(next); setPage(1); setFilterError(null) }

  return <>
    <section className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-center gap-3"><div className="rounded-xl border border-primary/25 bg-primary/10 p-2.5 text-primary"><Activity className="h-5 w-5" /></div><div><h1 className="text-2xl font-semibold tracking-tight">AI Transactions</h1><p className="mt-1 text-sm text-muted-foreground">Your AI usage, spend and service health in one place.</p></div></div>
      <div className="flex flex-wrap items-center gap-3"><CurrencyToggle currency={currency} onChange={setCurrency} /><LiveControls {...{ liveState, refreshing, updatedAt, refresh }} /></div>
    </section>
    <div role="tablist" aria-label="AI monitoring views" className="flex gap-6 border-b border-border">
      {(['dashboard', 'transactions'] as const).map((item) => <button type="button" key={item} role="tab" id={`ai-tab-${item}`} aria-selected={tab === item} aria-controls={`ai-panel-${item}`} tabIndex={tab === item ? 0 : -1} onClick={() => setTab(item)} onKeyDown={(event) => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 'dashboard' : event.key === 'End' ? 'transactions' : item === 'dashboard' ? 'transactions' : 'dashboard'; setTab(next); document.getElementById(`ai-tab-${next}`)?.focus() } }} className={`-mb-px flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tab === item ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{item === 'dashboard' ? <LayoutDashboard className="h-4 w-4" /> : <List className="h-4 w-4" />}{item === 'dashboard' ? 'Dashboard' : 'Transactions'}{item === 'transactions' && pagination ? <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{formatNumber(pagination.total)}</span> : null}</button>)}
    </div>
    {error ? <ErrorNotice message={`${error}${data ? ' Showing the last successful update.' : ''}`} /> : null}
    <div id={`ai-panel-${tab}`} role="tabpanel" aria-labelledby={`ai-tab-${tab}`} className="space-y-5" aria-busy={refreshing}>
      <AiTransactionFilters draft={draft} filters={filters} onDraft={(patch) => setDraft((current) => ({ ...current, ...patch }))} onApply={() => apply(draft)} onImmediate={immediate} onReset={reset} models={modelOptions} error={filterError} />
      {tab === 'dashboard' ? <section aria-label="Filtered AI analytics" className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-medium text-muted-foreground">{periodLabel} · {filters.service ? serviceLabel(filters.service) : 'All services'}{filters.model ? ` · ${filters.model}` : ''}</p>{summary ? <Badge variant={summary.runningTransactions ? 'warning' : 'secondary'}>{formatNumber(summary.runningTransactions)} running transactions</Badge> : null}</div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric title="AI requests" value={summary ? formatNumber(summary.calls) : '—'} hint={`${data ? formatNumber(data.analytics.models.length) : '—'} models · actual provider attempts, including retries`} />
        <Metric title="Transactions" value={summary ? formatNumber(summary.transactions) : '—'} hint="Each transaction groups one or more AI calls" />
        <Metric title="Input / output tokens" value={summary ? `${formatCompactNumber(summary.inputTokens)} / ${formatCompactNumber(summary.outputTokens)}` : '—'} hint={summary ? `${formatNumber(summary.cachedInputTokens)} cached input tokens` : 'Token usage for selected filters'} />
        <Metric title={`Estimated spend (${currency})`} value={summary ? currencyCost(summary, currency) : '—'} hint={currency === 'INR' ? `${summary?.unconvertedCalls ?? 0} calls awaiting FX · saved call rates` : `${summary?.unpricedCalls ?? 0} calls unpriced · saved model rates`} />
        <Metric title="Failed calls" value={summary ? formatNumber(failedCalls) : '—'} hint={summary ? `${summary.calls ? (failedCalls / summary.calls * 100).toFixed(1) : '0.0'}% error rate · ${formatNumber(summary.failedTransactions)} failed transactions` : 'Failures across services and models'} />
      </div></section> : null}
      {tab === 'dashboard' ? <>
        <AiBalancePanel data={data?.balance ?? null} error={data?.balanceError} loading={refreshing} currency={currency} onRefresh={refresh} />
        <div className="grid min-w-0 gap-4 lg:grid-cols-[1.8fr_1fr]"><AiActivityChart analytics={data?.analytics} currency={currency} loading={refreshing} /><AiErrorAnalytics analytics={data?.analytics} loading={refreshing} /></div>
        <AiUsageTables analytics={data?.analytics} currency={currency} loading={refreshing} />
        <AiRecentErrors analytics={data?.analytics} loading={refreshing} />
      </> : <>
    <Card className="min-w-0">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3"><div><CardTitle>Transaction history</CardTitle><CardDescription className="mt-1">Open a transaction to inspect its prompts, responses, and full call sequence.</CardDescription></div>{pagination ? <Badge variant="outline">{formatNumber(pagination.total)} transactions</Badge> : null}</CardHeader>
      <CardContent className="px-0">
        <div className="overflow-x-auto"><table className="w-full" aria-label="AI transactions"><thead className="border-y border-border bg-muted/20"><tr>{['Transaction / started', 'Service / user', 'Status', 'Models / calls', 'Tokens in / out', `Spend (${currency})`, ''].map((title, index) => <th key={index} className={headerCell}>{title}</th>)}</tr></thead><tbody className="divide-y divide-border">{data?.list.transactions.map((transaction) => <tr key={transaction.id} className="hover:bg-muted/20">
          <td className={tableCell}><Link className="inline-block font-medium text-primary hover:underline" href={`/ai-transactions/${encodeURIComponent(transaction.id)}`}>{transaction.operation || transaction.id}</Link><p className="mt-1 text-xs text-muted-foreground">{formatDate(transaction.startedAt)}</p><p className="mt-1 max-w-[230px] truncate font-mono text-[11px] text-muted-foreground" title={transaction.id}>{transaction.id}</p></td>
          <td className={tableCell}><p>{serviceLabel(transaction.service)}</p><p className="mt-1 text-xs text-muted-foreground">{transaction.userAttribution === 'vendor_owner' ? 'Vendor owner: ' : ''}{transaction.userName || transaction.userEmail || (transaction.userId ? `User #${transaction.userId}` : 'System')}</p></td>
          <td className={tableCell}><StatusBadge status={transaction.status} /><p className="mt-1 text-xs text-muted-foreground">{formatDuration(transaction.durationMs)}</p></td>
          <td className={tableCell}><div className="flex max-w-[220px] flex-wrap gap-1">{transaction.models.map((model) => <Badge key={model} variant="outline">{model}</Badge>)}</div><p className="mt-1 text-xs text-muted-foreground">{formatNumber(transaction.callCount)} calls</p></td>
          <td className={`${tableCell} whitespace-nowrap tabular-nums`}>{formatNumber(transaction.inputTokens)} / {formatNumber(transaction.outputTokens)}</td>
          <td className={`${tableCell} whitespace-nowrap tabular-nums`}>{currencyCost(transaction, currency)}</td>
          <td className={tableCell}><Button variant="ghost" size="icon" asChild><Link href={`/ai-transactions/${encodeURIComponent(transaction.id)}`} aria-label={`View transaction ${transaction.id}`}><ArrowRight className="h-4 w-4" /></Link></Button></td>
        </tr>)}</tbody></table></div>
        {!data?.list.transactions.length ? <div className="px-6 py-12 text-center text-sm text-muted-foreground">{refreshing ? 'Loading AI transactions…' : error ? 'Transaction data is unavailable. Use Refresh to try again.' : 'No transactions match these filters. AI activity will appear here as requests start.'}</div> : null}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 pt-4">
          <label className="flex items-center gap-2 whitespace-nowrap text-sm text-muted-foreground">Rows per page<select className="h-10 rounded-md border border-border bg-background px-3 text-sm" value={perPage} onChange={(event) => { setPerPage(Number(event.target.value)); setPage(1) }}><option value="25">25</option><option value="50">50</option><option value="100">100</option></select></label>
          <div className="flex items-center gap-3"><span className="text-sm text-muted-foreground">Page {page} of {Math.max(1, pagination?.lastPage ?? 1)}</span><Button variant="outline" size="icon" aria-label="Previous page" disabled={page <= 1 || refreshing} onClick={() => setPage((current) => current - 1)}><ChevronLeft className="h-4 w-4" /></Button><Button variant="outline" size="icon" aria-label="Next page" disabled={!pagination || page >= pagination.lastPage || refreshing} onClick={() => setPage((current) => current + 1)}><ChevronRight className="h-4 w-4" /></Button></div>
        </div>
      </CardContent>
    </Card>
      </>}
    </div>
  </>
}
