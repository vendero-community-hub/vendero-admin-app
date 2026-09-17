'use client'

import { useRef, useState } from 'react'
import { CircleDollarSign, Plus, RefreshCw, Wallet, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatDate, formatMoney, formatNumber, type AiBalanceData, type AiCurrency, type AiFundingEstimate, type FxQuote } from './ai-transactions-data'
import { ErrorNotice } from './ai-transactions-shared'
import { AiRequestError, requestAiData } from './use-ai-transactions'

export function FxRateNote({ rate }: { rate: FxQuote | null | undefined }) {
  return <div className="space-y-1 text-xs text-muted-foreground">
    {rate ? <><div className="flex flex-wrap items-center gap-2"><span className="font-medium text-foreground">$1 = {formatMoney(rate.rate, 'INR')}</span><Badge variant={rate.status === 'fresh' ? 'secondary' : 'warning'}>{rate.status === 'fresh' ? 'Latest reference rate' : 'Stale rate'}</Badge></div><p>Rate as of {formatDate(rate.asOf)} · reference rates update daily</p><p>Source: {rate.source} · <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Rates By Exchange Rate API</a></p></> : <p>Exchange rate unavailable. USD tracking remains available; INR amounts wait for a recorded rate.</p>}
  </div>
}

function RequiredTopUpSummary({ funding, currency, loading }: { funding: AiFundingEstimate | undefined; currency: AiCurrency; loading: boolean }) {
  const ready = funding?.status === 'ready'
  const topUp = currency === 'INR' ? funding?.requiredTopUpInr : funding?.requiredTopUpUsd
  const covered = ready && funding.requiredTopUpUsd === 0
  const reason = funding?.reason || (funding?.status === 'balance_required' ? 'Set your current OpenAI balance to calculate the funding gap.' : funding?.status === 'conversion_unavailable' ? 'A provider funding conversion rate is required to value outstanding credits.' : 'The outstanding credit estimate is unavailable. Refresh to try again.')
  return <>
    <p className="text-xs text-muted-foreground">Estimated funding needed ({currency})</p>
    <p className={`break-words text-3xl font-semibold tracking-tight tabular-nums ${ready && !covered ? 'text-amber-200' : ''}`}>{!funding && loading ? 'Loading…' : !ready ? 'Unavailable' : topUp == null && currency === 'INR' ? 'INR unavailable' : formatMoney(topUp, currency)}</p>
    <p className="text-xs leading-5 text-muted-foreground">{!ready ? reason : covered ? 'Your tracked provider balance covers the estimated cost of outstanding user credits.' : 'Additional provider funding is needed to cover the estimated cost of outstanding user credits.'}</p>
    {ready ? <Badge variant={covered ? 'success' : 'warning'}>{covered ? 'Covered' : 'Top-up needed'}</Badge> : null}
    {ready && currency === 'INR' && topUp == null ? <p className="text-xs leading-5 text-muted-foreground">A fresh USD/INR reference rate is needed to show this funding estimate in INR.</p> : null}
  </>
}

function FundingCalculation({ funding, currency }: { funding: AiFundingEstimate | undefined; currency: AiCurrency }) {
  if (!funding || (funding.status === 'unavailable' && funding.invalidAccounts === 0)) return null
  const ready = funding.status === 'ready'
  const topUp = currency === 'INR' ? funding.requiredTopUpInr : funding.requiredTopUpUsd
  const required = currency === 'INR' ? funding.requiredBalanceInr : funding.requiredBalanceUsd
  const available = currency === 'INR' ? funding.remainingBalanceInr : funding.remainingBalanceUsd
  const covered = ready && funding.requiredTopUpUsd === 0
  return <details className="border-t border-border/70 pt-3">
    <summary className="w-fit cursor-pointer text-xs font-medium text-muted-foreground">Funding calculation</summary>
    <div role="region" aria-label="Funding calculation" className="mt-4 space-y-4">
      <dl className="grid gap-x-5 gap-y-4 rounded-lg border border-border/80 bg-background/30 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div><dt className="text-xs text-muted-foreground">Subscription / free allowance</dt><dd className="mt-1.5 text-base font-medium tabular-nums">{formatNumber(funding.subscriptionCredits)} <span className="text-xs font-normal text-muted-foreground">credits</span></dd></div>
        <div><dt className="text-xs text-muted-foreground">Purchased / granted</dt><dd className="mt-1.5 text-base font-medium tabular-nums">{formatNumber(funding.purchasedCredits)} <span className="text-xs font-normal text-muted-foreground">credits</span></dd></div>
        <div><dt className="text-xs text-muted-foreground">Reserved for ongoing work</dt><dd className="mt-1.5 text-base font-medium tabular-nums">{formatNumber(funding.reservedCredits)} <span className="text-xs font-normal text-muted-foreground">credits</span></dd></div>
        <div><dt className="text-xs text-muted-foreground">Total outstanding</dt><dd className="mt-1.5 text-base font-semibold tabular-nums">{formatNumber(funding.outstandingCredits)} <span className="text-xs font-normal text-muted-foreground">credits</span></dd></div>
      </dl>
      <dl className="grid gap-4 border-y border-border/70 py-4 sm:grid-cols-3">
        <div><dt className="text-xs text-muted-foreground">Estimated provider backing ({currency})</dt><dd className="mt-1.5 font-medium tabular-nums">{formatMoney(required, currency)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Remaining provider balance ({currency})</dt><dd className="mt-1.5 font-medium tabular-nums">{formatMoney(available, currency)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Funding gap ({currency})</dt><dd className={`mt-1.5 font-medium tabular-nums ${ready && !covered ? 'text-amber-200' : ''}`}>{ready ? formatMoney(topUp, currency) : 'Unavailable'}</dd></div>
      </dl>
      <div className="space-y-1.5 text-[11px] leading-5 text-muted-foreground">
        {funding.creditsPerUsd != null ? <p>Provider funding conversion: {formatNumber(funding.creditsPerUsd)} credits per $1.00. {funding.conversionSource === 'global_balance_account' ? 'Uses the saved global provider funding rate.' : 'Uses the configured provider funding rate.'}</p> : null}
        <p>Estimated backing equals outstanding credits divided by credits per USD. Required top-up is the amount above your remaining provider balance, with a minimum of zero.</p>
        <p>Includes available subscription and free allowances, purchased and granted credits, and reservations for ongoing work. Reserved credits remain included until the work settles.</p>
        {funding.expiredSubscriptionCredits ? <p>{formatNumber(funding.expiredSubscriptionCredits)} expired subscription credits are excluded.</p> : null}
        {funding.invalidAccounts ? <p className="text-amber-200">{formatNumber(funding.invalidAccounts)} wallet accounts could not be valued completely.</p> : null}
        {currency === 'INR' ? <p>These INR funding amounts use the latest available reference rate. The Remaining Balance card uses historical rates saved with ledger entries.</p> : null}
        <p>Across {formatNumber(funding.accountCount)} credit wallets · calculated {formatDate(funding.calculatedAt)} · account-wide estimate</p>
      </div>
    </div>
  </details>
}

export function AiBalancePanel({ data, error, loading, currency, onRefresh }: { data: AiBalanceData | null; error?: string | null; loading: boolean; currency: AiCurrency; onRefresh: () => Promise<void> }) {
  const [mode, setMode] = useState<'top_up' | 'set_balance' | null>(null)
  const [amount, setAmount] = useState('')
  const [entryCurrency, setEntryCurrency] = useState<AiCurrency>(currency)
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [rateLoading, setRateLoading] = useState(false)
  const [reconciling, setReconciling] = useState(false)
  const reconcileKey = useRef<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const attempt = useRef<{ fingerprint: string; key: string; body: Record<string, unknown> } | null>(null)
  const revision = useRef<number | undefined>(undefined)
  const balance = data?.balance
  const remaining = currency === 'INR' ? balance?.remainingInr : balance?.remainingUsd
  const used = currency === 'INR' ? balance?.totalSpendInr : balance?.totalSpendUsd
  const unconverted = balance?.unconvertedEntries ?? balance?.unconvertedCalls ?? 0

  function open(next: 'top_up' | 'set_balance') {
    setMode(next); setAmount(''); setReference(''); setNotes(''); setEntryCurrency(currency); setFormError(null); setSuccess(null); setConflict(false)
    attempt.current = null
    revision.current = balance?.revision
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (!mode || saving) return
    const value = Number(amount)
    if (!amount.trim() || !Number.isFinite(value) || (mode === 'top_up' ? value <= 0 : value < 0)) { setFormError(mode === 'top_up' ? 'Enter a top-up amount greater than zero.' : 'Enter a balance of zero or more.'); return }
    if (mode === 'set_balance' && revision.current == null) { setFormError('Load the current balance before updating it.'); return }
    const body = { mode, amount: value, currency: entryCurrency, ...(reference.trim() ? { reference: reference.trim() } : {}), ...(notes.trim() ? { notes: notes.trim() } : {}), ...(mode === 'set_balance' ? { expectedRevision: revision.current } : {}) }
    const fingerprint = JSON.stringify(body)
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID(), body }
    setSaving(true); setFormError(null); setSuccess(null)
    try {
      await requestAiData('/api/v1/admin/ai/transactions/balance/adjustments', new AbortController().signal, { method: 'POST', body: attempt.current.body, idempotencyKey: attempt.current.key })
      setSuccess(mode === 'top_up' ? 'Top-up recorded. Your tracked balance is updated.' : 'Opening balance updated. New recorded calls will deduct from this amount.')
      setMode(null); attempt.current = null
      await onRefresh()
    } catch (caught) { setConflict(caught instanceof AiRequestError && caught.status === 409); setFormError(caught instanceof Error ? caught.message : 'The balance could not be updated. Retry the same entry safely.') }
    finally { setSaving(false) }
  }

  async function refreshRate() {
    setRateLoading(true); setFormError(null)
    try { await requestAiData('/api/v1/admin/ai/transactions/exchange-rate?refresh=true', new AbortController().signal); await onRefresh() }
    catch (caught) { setFormError(caught instanceof Error ? caught.message : 'The exchange rate could not be refreshed.') }
    finally { setRateLoading(false) }
  }

  async function reconcile() {
    setReconciling(true); setFormError(null)
    reconcileKey.current ??= crypto.randomUUID()
    try { await requestAiData('/api/v1/admin/ai/transactions/balance/reconcile', new AbortController().signal, { method: 'POST', body: {}, idempotencyKey: reconcileKey.current }); reconcileKey.current = null; await onRefresh() }
    catch (caught) { setFormError(caught instanceof Error ? caught.message : 'OpenAI spend could not be compared.') }
    finally { setReconciling(false) }
  }

  return <Card className="overflow-hidden shadow-none">
    <CardContent className="space-y-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3"><div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5 text-primary"><Wallet className="h-5 w-5" /></div><div><h2 className="text-sm font-medium">Tracked OpenAI balance</h2><div className="mt-1.5"><Badge variant="outline">Account-wide</Badge></div></div></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={saving || !data} onClick={() => open('set_balance')}><CircleDollarSign className="h-3.5 w-3.5" />Update balance</Button><Button size="sm" disabled={saving || !data || !balance?.configured} onClick={() => open('top_up')}><Plus className="h-3.5 w-3.5" />Record top-up</Button></div>
      </div>
      {error ? <ErrorNotice message={`Balance: ${error}`} /> : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <section aria-label="Remaining Balance" className="min-w-0 space-y-3 rounded-lg border border-border bg-background/30 p-5">
          <h3 className="text-sm font-medium">Remaining Balance</h3>
          <p className="text-xs text-muted-foreground">Available provider balance ({currency})</p>
          <p className={`break-words text-3xl font-semibold tracking-tight tabular-nums ${(remaining ?? 0) < 0 ? 'text-rose-300' : ''}`}>{!data ? loading ? 'Loading…' : 'Unavailable' : !balance?.configured ? 'Set your balance' : formatMoney(remaining, currency)}</p>
          {currency === 'INR' && balance?.currentValueInr != null ? <p className="text-xs text-muted-foreground">Current FX equivalent: {formatMoney(balance.currentValueInr, 'INR')} · ledger balance above uses saved entry rates</p> : null}
          <p className="text-xs leading-5 text-muted-foreground">Estimated balance shared by all models. Recorded calls deduct automatically.</p>
        </section>
        <section aria-label="Used Balance" className="min-w-0 space-y-3 rounded-lg border border-border bg-background/30 p-5">
          <h3 className="text-sm font-medium">Used Balance</h3>
          <p className="text-xs text-muted-foreground">Recorded provider spend ({currency})</p>
          <p className="break-words text-3xl font-semibold tracking-tight tabular-nums">{!data && loading ? 'Loading…' : formatMoney(used, currency)}</p>
          <p className="text-xs leading-5 text-muted-foreground">Lifetime recorded OpenAI costs across all services and users, including calls before your latest balance update.</p>
          <p className="text-xs leading-5 text-muted-foreground">{currency === 'INR' ? 'INR spend uses each call’s saved exchange rate.' : 'USD spend uses each call’s saved model price.'}</p>
        </section>
        <section aria-label="Required Top-up" className="min-w-0 space-y-3 rounded-lg border border-border bg-background/30 p-5">
          <h3 className="text-sm font-medium">Required Top-up</h3>
          <RequiredTopUpSummary funding={data?.funding} currency={currency} loading={loading} />
        </section>
      </div>
      <p className="text-xs text-muted-foreground">All three balances are account-wide and update with recorded activity. Dashboard date and service filters do not change them.</p>
      <FundingCalculation funding={data?.funding} currency={currency} />
      <div className="grid gap-5 border-t border-border/70 pt-4 md:grid-cols-[1fr_1.1fr]">
        <div className="grid grid-cols-2 gap-4"><div><p className="text-xs text-muted-foreground">Last balance update</p><p className="mt-1.5 text-xs leading-5">{formatDate(balance?.updatedAt)}</p></div><div><p className="text-xs text-muted-foreground">Current balance baseline</p><p className="mt-1.5 text-xs leading-5">{formatDate(balance?.baselineAt)}</p></div></div>
        <div className="flex items-start justify-between gap-3"><FxRateNote rate={data?.rate} /><Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Refresh exchange rate" disabled={rateLoading} onClick={() => void refreshRate()}><RefreshCw className={`h-3.5 w-3.5 ${rateLoading ? 'animate-spin' : ''}`} /></Button></div>
      </div>
      {balance?.unpricedCalls || unconverted ? <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">{balance?.unpricedCalls ? `${formatNumber(balance?.unpricedCalls)} calls have no saved price and are excluded from spend. ` : ''}{unconverted ? `${formatNumber(unconverted)} ledger entries have no saved exchange rate; the INR balance is incomplete.` : ''}</p> : null}
      {currency === 'INR' ? <p className="text-[11px] leading-5 text-muted-foreground">INR balance and spend use the rate saved with each entry. Funding estimates use the latest fresh reference rate. Provider billing, taxes and your bank’s conversion may differ.</p> : <p className="text-[11px] leading-5 text-muted-foreground">Record the balance or top-up already shown in OpenAI billing. This updates the tracking ledger and does not purchase credits.</p>}
      {success ? <p role="status" className="rounded-lg border border-primary/25 bg-primary/10 p-3 text-sm text-primary">{success}</p> : null}
      {mode ? <form onSubmit={(event) => void save(event)} className="space-y-4 rounded-xl border border-border bg-background/50 p-4" aria-label={mode === 'top_up' ? 'Record OpenAI top-up' : 'Update tracked balance'}>
        <div className="flex items-start justify-between gap-3"><div><h3 className="font-medium">{mode === 'top_up' ? 'Record a completed top-up' : 'Set current OpenAI balance'}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{mode === 'top_up' ? 'Enter funding you have already added in OpenAI billing.' : 'Enter the balance currently shown in OpenAI billing. This starts a new balance baseline; prior ledger history stays available.'}</p></div><Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0" aria-label="Close balance form" disabled={saving} onClick={() => setMode(null)}><X className="h-4 w-4" /></Button></div>
        <fieldset disabled={saving} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-2 text-xs text-muted-foreground"><span>Amount</span><Input type="number" min={mode === 'top_up' ? '0.000001' : '0'} step="any" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" required autoFocus /></label>
          <label className="space-y-2 text-xs text-muted-foreground"><span>Entry currency</span><select className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" value={entryCurrency} onChange={(event) => setEntryCurrency(event.target.value as AiCurrency)}><option value="USD">USD · US Dollar</option><option value="INR">INR · Indian Rupee</option></select></label>
          <label className="space-y-2 text-xs text-muted-foreground"><span>Reference (optional)</span><Input value={reference} maxLength={200} onChange={(event) => setReference(event.target.value)} placeholder="OpenAI receipt reference" /></label>
          <label className="space-y-2 text-xs text-muted-foreground"><span>Notes (optional)</span><Input value={notes} maxLength={1000} onChange={(event) => setNotes(event.target.value)} placeholder="Reason for this update" /></label>
        </fieldset>
        {entryCurrency === 'INR' ? <p className="text-xs text-muted-foreground">The latest available reference rate converts this entry to USD and is saved with it. Enter USD for the closest match to OpenAI billing.</p> : null}
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{entryCurrency === 'INR' && !data?.rate ? 'A current exchange rate is required for an INR entry.' : 'Changes are recorded in the account ledger.'}</p><Button type="submit" disabled={saving || (entryCurrency === 'INR' && (!data?.rate || data.rate.status === 'stale'))}>{saving ? 'Saving…' : mode === 'top_up' ? 'Save top-up' : 'Save balance'}</Button></div>
      </form> : null}
      {formError ? <div className="space-y-2"><ErrorNotice message={formError} />{conflict ? <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">The balance changed while this form was open. Refresh, then close and reopen the form to review the new balance before saving.</p><Button type="button" size="sm" variant="outline" onClick={() => void onRefresh()}>Refresh balance</Button></div> : null}</div> : null}
      {data?.reconciliation?.available ? <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4"><div><p className="text-xs font-medium">OpenAI spend comparison</p>{data.reconciliation.checkedAt ? <p className="mt-1 text-xs text-muted-foreground">Provider: {formatMoney(data.reconciliation.reportedSpendUsd, 'USD')} · Tracked: {formatMoney(data.reconciliation.trackedSpendUsd, 'USD')} · Difference: {formatMoney(data.reconciliation.differenceUsd, 'USD')}<span className="mt-1 block">Checked {formatDate(data.reconciliation.checkedAt)} · USD · complete UTC days since the balance baseline</span></p> : <p className="mt-1 text-xs text-muted-foreground">Compare provider-reported spend with recorded costs in USD. The comparison does not change your balance.</p>}</div><Button size="sm" variant="outline" disabled={reconciling} onClick={() => void reconcile()}>{reconciling ? 'Comparing…' : 'Compare OpenAI spend'}</Button></div> : null}
      {data?.entries.length ? <details className="border-t border-border/70 pt-3"><summary className="w-fit cursor-pointer text-xs font-medium text-muted-foreground">Recent balance activity</summary><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="text-muted-foreground"><th className="pb-2 pr-4 font-medium">Entry</th><th className="pb-2 pr-4 font-medium">Recorded</th><th className="pb-2 pr-4 font-medium">Amount ({currency})</th><th className="pb-2 font-medium">Reference</th></tr></thead><tbody className="divide-y divide-border/70">{data.entries.slice(0, 10).map((entry) => <tr key={entry.id}><td className="whitespace-nowrap py-2 pr-4">{entry.type === 'call_debit' ? 'AI call deduction' : entry.type === 'set_balance' ? 'Balance set' : entry.type === 'top_up' ? 'Top-up' : 'Reconciliation'}</td><td className="whitespace-nowrap py-2 pr-4 text-muted-foreground">{formatDate(entry.createdAt)}</td><td className="whitespace-nowrap py-2 pr-4 tabular-nums">{formatMoney(currency === 'INR' ? entry.amountInr : entry.amountUsd, currency)}</td><td className="max-w-xs break-words py-2 text-muted-foreground">{entry.reference || entry.model || entry.notes || '—'}</td></tr>)}</tbody></table></div></details> : null}
    </CardContent>
  </Card>
}
