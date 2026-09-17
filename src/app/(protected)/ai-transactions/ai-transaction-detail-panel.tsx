'use client'

import Link from 'next/link'
import { useCallback, useState } from 'react'
import { ArrowLeft, Check, Copy, GitBranch } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { currencyCost, formatMoney, type AiCurrency, formatDate, formatDuration, formatNumber, readablePayload, serviceLabel, type AiCall, type AiTransaction } from './ai-transactions-data'
import { requestAiData, useAiCurrency, useAiData } from './use-ai-transactions'
import { CurrencyToggle, ErrorNotice, LiveControls, Metric, StatusBadge } from './ai-transactions-shared'

function PayloadView({ label, value }: { label: string; value: unknown }) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const text = readablePayload(value)
  async function copy() {
    try { await navigator.clipboard.writeText(text); setCopied(true); setCopyError(false) }
    catch { setCopyError(true) }
  }
  return <div className="min-w-0 space-y-2"><div className="flex items-center justify-between gap-2"><h4 className="text-sm font-medium">{label}</h4><Button variant="ghost" size="sm" onClick={() => void copy()} aria-label={`Copy ${label.toLowerCase()}`}>{copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}{copied ? 'Copied' : 'Copy'}</Button></div>{copyError ? <p role="status" className="text-xs text-muted-foreground">Select the text below to copy it.</p> : null}<pre tabIndex={0} className="max-h-[540px] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-background/50 p-4 text-xs leading-6">{text}</pre></div>
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value ?? '—'}</dd></div>
}

function CallDetail({ call, calls, currency }: { call: AiCall; calls: AiCall[]; currency: AiCurrency }) {
  const parent = calls.find((item) => item.id === call.parentCallId)
  const auditOnly = call.countsAsModelCall === false
  return <Card id={`call-${call.id}`} className="scroll-mt-6">
    <CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{auditOnly ? 'Audit entry' : 'Call'} {call.sequence}</Badge><CardTitle className="break-words">{call.model || call.requestedModel || 'Model pending'}</CardTitle><StatusBadge status={call.status} />{auditOnly ? <Badge variant="secondary">Excluded from AI requests</Badge> : null}</div><CardDescription className="mt-2">{call.operation} · {formatDate(call.startedAt)} · {formatDuration(call.durationMs)}</CardDescription></div><div className="text-right"><p className="font-semibold tabular-nums">{call.pricingStatus === 'unpriced' ? 'Unpriced' : formatMoney(currency === 'INR' ? call.costInr : call.costUsd, currency)}</p><p className="mt-1 text-xs text-muted-foreground">Estimated provider cost · {currency}</p></div></div></CardHeader>
    <CardContent className="space-y-5">
      <dl className="grid gap-4 rounded-lg border border-border bg-muted/15 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <DetailField label="Requested model" value={call.requestedModel} /><DetailField label="Input tokens" value={call.usageReported === false ? 'Not reported' : formatNumber(call.inputTokens)} /><DetailField label="Output tokens" value={call.usageReported === false ? 'Not reported' : formatNumber(call.outputTokens)} /><DetailField label="Cached input (included in input)" value={call.usageReported === false ? 'Not reported' : formatNumber(call.cachedInputTokens)} />
        <DetailField label="Call ID" value={<span className="font-mono text-xs">{call.id}</span>} /><DetailField label="Provider request ID" value={<span className="font-mono text-xs">{call.providerRequestId ?? '—'}</span>} /><DetailField label="Completed" value={formatDate(call.completedAt)} /><DetailField label="Parent call" value={parent ? <a className="text-primary hover:underline" href={`#call-${parent.id}`}>Call {parent.sequence} · {parent.model}</a> : call.parentCallId ?? 'Direct transaction call'} />
      </dl>
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4"><p className="text-xs font-medium">Saved call cost &amp; currency conversion</p><dl className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><DetailField label="Cost in USD" value={call.pricingStatus === 'unpriced' ? 'Unpriced' : formatMoney(call.costUsd, 'USD')} /><DetailField label="Cost in INR at recorded rate" value={formatMoney(call.costInr, 'INR')} /><DetailField label="Saved USD → INR rate" value={call.exchangeRate ? formatMoney(call.exchangeRate.rate, 'INR') : 'No rate recorded'} /><DetailField label="Rate as of" value={formatDate(call.exchangeRate?.asOf)} /></dl>{call.exchangeRate ? <p className="mt-3 text-[11px] leading-5 text-muted-foreground">{call.exchangeRate.source} · {call.exchangeRate.status === 'stale' ? 'Stale reference rate at capture' : 'Reference rate'} · recorded {formatDate(call.exchangeRate.fetchedAt)} · <a className="underline underline-offset-2" href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer">Rates By Exchange Rate API</a></p> : <p className="mt-3 text-[11px] text-muted-foreground">INR stays unavailable until a rate is recorded for this call.</p>}</div>
      {call.error ? <ErrorNotice message={readablePayload(call.error)} /> : null}
      <div className="grid min-w-0 gap-5 xl:grid-cols-2"><PayloadView label="Sent prompt / request" value={call.input} /><PayloadView label="Received response" value={call.output} /></div>
      {call.pricing ? <details className="rounded-lg border border-border p-3"><summary className="cursor-pointer text-sm font-medium">Saved pricing details</summary><pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-muted-foreground">{readablePayload(call.pricing)}</pre></details> : null}
    </CardContent>
  </Card>
}

export function AiTransactionDetailPanel({ transactionId }: { transactionId: string }) {
  const load = useCallback((signal: AbortSignal) => requestAiData<{ transaction: AiTransaction; calls: AiCall[] }>(`/api/v1/admin/ai/transactions/${encodeURIComponent(transactionId)}`, signal), [transactionId])
  const { data, error, refreshing, updatedAt, liveState, refresh } = useAiData(load, transactionId)
  const { currency, setCurrency } = useAiCurrency()
  const transaction = data?.transaction
  const calls = [...(data?.calls ?? [])].sort((left, right) => left.sequence - right.sequence)

  return <>
    <Link href="/ai-transactions?tab=transactions" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />AI Transactions</Link>
    <section className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-semibold tracking-tight">Transaction details</h1>{transaction ? <StatusBadge status={transaction.status} /> : null}</div><p className="mt-2 break-all font-mono text-xs text-muted-foreground">{transactionId}</p></div><div className="flex flex-wrap items-center gap-3"><CurrencyToggle currency={currency} onChange={setCurrency} /><LiveControls {...{ liveState, refreshing, updatedAt, refresh }} /></div></section>
    {error ? <ErrorNotice message={`${error}${data ? ' Showing the last successful update.' : ''}`} /> : null}
    {!transaction ? <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">{refreshing ? 'Loading transaction details…' : 'Transaction details are unavailable. Refresh to try again.'}</CardContent></Card> : <>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Transaction totals"><Metric title="AI requests" value={formatNumber(transaction.callCount)} hint={`${formatNumber(transaction.models.length)} models · actual provider attempts`} /><Metric title="Input / output tokens" value={`${formatNumber(transaction.inputTokens)} / ${formatNumber(transaction.outputTokens)}`} hint={`${formatNumber(transaction.cachedInputTokens)} cached input tokens`} /><Metric title={`Estimated cost (${currency})`} value={currencyCost(transaction, currency)} hint={currency === 'INR' ? `${formatNumber(transaction.unconvertedCalls)} calls awaiting FX · saved per-call rates` : transaction.unpricedCalls ? `${formatNumber(transaction.unpricedCalls)} unpriced calls excluded from known cost` : 'Based on saved model rates'} /><Metric title="Duration" value={formatDuration(transaction.durationMs)} hint={`Started ${formatDate(transaction.startedAt)}`} /></section>
      <Card><CardHeader><CardTitle>{transaction.operation || 'AI request'}</CardTitle><CardDescription>Service and user responsible for this request.</CardDescription></CardHeader><CardContent><dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <DetailField label="Service" value={serviceLabel(transaction.service)} /><DetailField label={transaction.userAttribution === 'vendor_owner' ? 'Vendor owner' : 'User'} value={transaction.userName || transaction.userEmail || (transaction.userId ? `User #${transaction.userId}` : 'System')} /><DetailField label="User ID" value={transaction.userId} /><DetailField label="Email" value={transaction.userEmail} /><DetailField label="Vendor profile ID" value={transaction.vendorProfileId} /><DetailField label="Started" value={formatDate(transaction.startedAt)} /><DetailField label="Completed" value={formatDate(transaction.completedAt)} /><DetailField label="Last activity" value={formatDate(transaction.updatedAt)} />
      </dl>{transaction.error ? <div className="mt-5"><ErrorNotice message={readablePayload(transaction.error)} /></div> : null}{transaction.metadata ? <details className="mt-5 rounded-lg border border-border p-3"><summary className="cursor-pointer text-sm font-medium">Request context</summary><pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-muted-foreground">{readablePayload(transaction.metadata)}</pre></details> : null}</CardContent></Card>
      <section className="space-y-4" aria-label="OpenAI call sequence"><div><h2 className="flex items-center gap-2 text-lg font-semibold"><GitBranch className="h-5 w-5 text-primary" />OpenAI call sequence</h2><p className="mt-1 text-sm text-muted-foreground">Calls are ordered by start sequence. Parent links map nested calls within this transaction.</p></div>
        {calls.length ? <><nav aria-label="Jump to model call" className="flex flex-wrap items-center gap-2">{calls.map((call, index) => <div key={call.id} className="flex items-center gap-2">{index > 0 ? <span aria-hidden="true" className="text-muted-foreground">→</span> : null}<a href={`#call-${call.id}`} className="rounded-lg border border-border px-3 py-2 text-sm hover:border-primary"><span className="mr-2 text-muted-foreground">{call.sequence}.</span>{call.model || call.requestedModel}<span className="ml-2 text-xs text-muted-foreground">{call.pricingStatus === 'unpriced' ? 'Unpriced' : formatMoney(currency === 'INR' ? call.costInr : call.costUsd, currency)}</span></a></div>)}</nav>{calls.map((call) => <CallDetail key={call.id} call={call} calls={calls} currency={currency} />)}</> : <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">{transaction.status === 'running' ? 'Waiting for the first OpenAI call. New calls will appear automatically.' : 'No OpenAI calls were recorded for this transaction.'}</CardContent></Card>}
      </section>
    </>}
  </>
}
