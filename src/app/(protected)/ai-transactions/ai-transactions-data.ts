export type AiStatus = 'running' | 'completed' | 'failed'

export type AiTransaction = {
  id: string
  service: string
  operation: string
  userId: number | string | null
  vendorProfileId: number | string | null
  userName: string | null
  userEmail: string | null
  userAttribution?: 'vendor_owner' | string
  status: AiStatus
  startedAt: string
  completedAt: string | null
  updatedAt: string
  durationMs: number | null
  models: string[]
  callCount: number
  inputTokens: number
  outputTokens: number
  cachedInputTokens: number
  costUsd: number
  costInr?: number | null
  unconvertedCalls?: number
  failedCalls?: number
  unpricedCalls: number
  error?: unknown
  metadata?: unknown
}

export type AiCall = {
  id: string
  transactionId: string
  countsAsModelCall?: boolean
  parentCallId?: string | null
  sequence: number
  operation: string
  model: string
  requestedModel: string
  status: AiStatus
  startedAt: string
  completedAt: string | null
  durationMs: number | null
  input: unknown
  output: unknown
  inputTokens: number
  outputTokens: number
  cachedInputTokens: number
  costUsd: number | null
  costInr?: number | null
  exchangeRate?: FxQuote | null
  fxRate?: FxQuote | null
  balanceDebit?: unknown
  usageReported?: boolean
  pricingStatus: 'priced' | 'unpriced'
  error?: unknown
  providerRequestId?: string | null
  pricing?: unknown
}

export type AiSummary = {
  transactions: number
  calls: number
  inputTokens: number
  outputTokens: number
  cachedInputTokens: number
  costUsd: number
  costInr?: number | null
  unconvertedCalls?: number
  failedCalls?: number
  errorRate?: number
  failedTransactions: number
  runningTransactions: number
  unpricedCalls: number
}

export type AiMoneyTotals = { costUsd: number; costInr?: number | null; unconvertedCalls?: number; unpricedCalls?: number }
export type AiAnalytics = {
  summary: AiSummary
  today: AiSummary
  models: Array<AiMoneyTotals & { model: string; calls: number; inputTokens: number; outputTokens: number; cachedInputTokens: number; unpricedCalls: number; failedCalls?: number; errorRate?: number }>
  services: Array<AiMoneyTotals & { service: string; transactions: number; calls: number; failedCalls?: number; errorRate?: number }>
  timeline: Array<AiMoneyTotals & { date: string; transactions: number; calls: number; failedCalls?: number; errorRate?: number }>
  errors?: {
    total: number
    byService: Array<{ service: string; count: number }>
    byModel: Array<{ model: string; count: number }>
    byCode: Array<{ code: string; count: number }>
    recent: Array<{ id: string; transactionId: string; service: string; model: string; error: unknown; startedAt: string; completedAt?: string | null }>
  }
}

export type AiCurrency = 'USD' | 'INR'
export type FxQuote = {
  id: string
  base: 'USD'
  quote: 'INR'
  rate: number
  source: string
  asOf: string
  fetchedAt: string
  nextUpdateAt?: string
  status: 'fresh' | 'stale'
  rateKind: 'reference'
}
export type AiBalanceEntry = {
  id: string
  type: 'call_debit' | 'top_up' | 'set_balance' | 'reconciliation'
  mode?: string
  amountUsd?: number
  amountInr?: number | null
  amount?: number
  currency?: AiCurrency
  reference?: string
  notes?: string
  model?: string
  exchangeRate?: FxQuote | null
  createdAt: string
}
export type AiFundingEstimate = {
  status: 'ready' | 'balance_required' | 'conversion_unavailable' | 'unavailable'
  reason?: string
  calculatedAt: string
  nextExpiryAt?: string | null
  estimated: true
  accountCount: number
  subscriptionCredits: number
  purchasedCredits: number
  reservedCredits: number
  expiredSubscriptionCredits: number
  outstandingCredits: number
  creditsPerUsd: number | null
  conversionSource: 'global_balance_account' | 'configuration' | 'unavailable'
  requiredBalanceUsd: number | null
  requiredBalanceInr: number | null
  remainingBalanceUsd: number | null
  remainingBalanceInr: number | null
  requiredTopUpUsd: number | null
  requiredTopUpInr: number | null
  includesReservedCredits: true
  invalidAccounts: number
}
export type AiBalanceData = {
  funding?: AiFundingEstimate
  balance: {
    configured: boolean
    remainingUsd: number | null
    remainingInr: number | null
    currentValueInr?: number | null
    totalTopUpsUsd: number
    totalSpendUsd: number
    totalSpendInr: number | null
    unpricedCalls: number
    unconvertedCalls: number
    unconvertedEntries?: number
    updatedAt: string | null
    baselineAt?: string | null
    revision: number
  }
  rate: FxQuote | null
  entries: AiBalanceEntry[]
  reconciliation?: { available: boolean; mode: 'comparison_only'; startTime?: string; endTime?: string; checkedAt?: string; reportedSpendUsd?: number; trackedSpendUsd?: number; differenceUsd?: number; source?: string }
}

export type AiTransactionList = {
  transactions: AiTransaction[]
  pagination: { page: number; perPage: number; total: number; lastPage: number }
}

export type DatePreset = 'today' | 'week' | 'month' | 'day' | 'selected_month' | 'range'
export type AiFilters = {
  preset: DatePreset
  day: string
  month: string
  startDay: string
  endDay: string
  service: string
  model: string
  status: string
  userId: string
  vendorProfileId: string
  search: string
}

export const AI_SERVICES = [
  { value: 'whats_pilot', label: 'WhatsPilot' },
  { value: 'content_pilot', label: 'Content Pilot' },
  { value: 'website_service', label: 'Website Service' },
  { value: 'ai_image_generation', label: 'AI Image Generation' },
]

export function serviceLabel(service: string) {
  return AI_SERVICES.find((item) => item.value === service)?.label ?? service
}

export function dateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function defaultFilters(now = new Date()): AiFilters {
  const day = dateInputValue(now)
  return { preset: 'today', day, month: day.slice(0, 7), startDay: day, endDay: day, service: '', model: '', status: '', userId: '', vendorProfileId: '', search: '' }
}

function parseDay(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Select a valid date.')
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  if (dateInputValue(date) !== value) throw new Error('Select a valid date.')
  return date
}

// Calendar boundaries use the viewer's timezone and remain correct across DST changes.
export function dateRange(filters: AiFilters, now = new Date()) {
  let start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let end = new Date(start)
  if (filters.preset === 'week') {
    start.setDate(start.getDate() - (start.getDay() + 6) % 7)
    end = new Date(start)
    end.setDate(end.getDate() + 7)
  } else if (filters.preset === 'month' || filters.preset === 'selected_month') {
    if (filters.preset === 'selected_month') {
      if (!/^\d{4}-\d{2}$/.test(filters.month)) throw new Error('Select a valid month.')
      start = parseDay(`${filters.month}-01`)
    } else start.setDate(1)
    end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
  } else if (filters.preset === 'range') {
    start = parseDay(filters.startDay)
    end = parseDay(filters.endDay)
    if (end < start) throw new Error('End date must be on or after the start date.')
    end.setDate(end.getDate() + 1)
  } else {
    if (filters.preset === 'day') start = parseDay(filters.day)
    end = new Date(start)
    end.setDate(end.getDate() + 1)
  }
  return { startDate: start.toISOString(), endDate: end.toISOString() }
}

export function filterParams(filters: AiFilters, now = new Date()) {
  const params = new URLSearchParams(dateRange(filters, now))
  for (const key of ['service', 'model', 'status', 'userId', 'vendorProfileId', 'search'] as const) {
    if (filters[key].trim()) params.set(key, filters[key].trim())
  }
  return params
}

export function analyticsParams(filters: AiFilters, now = new Date()) {
  const params = filterParams(filters, now)
  const today = dateRange(defaultFilters(now), now)
  params.set('todayStartDate', today.startDate)
  params.set('todayEndDate', today.endDate)
  params.set('timeZone', Intl.DateTimeFormat().resolvedOptions().timeZone)
  return params
}

export function formatNumber(value = 0) { return new Intl.NumberFormat('en-IN').format(value) }

export function formatCost(value: number | null | undefined) {
  return value == null ? 'Unpriced' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(value)
}

export function estimatedCost(value: number, unpriced = 0) {
  if (unpriced && value === 0) return 'Not fully priced'
  return `${formatCost(value)}${unpriced ? ' + unpriced' : ''}`
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' })
}

export function formatDuration(value: number | null | undefined) {
  if (value == null) return 'In progress'
  if (value < 1000) return `${formatNumber(value)} ms`
  return `${(value / 1000).toFixed(2)} s`
}

export function readablePayload(value: unknown): string {
  if (value == null) return 'No payload recorded.'
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
}

export function formatMoney(value: number | null | undefined, currency: AiCurrency = 'USD') {
  return value == null || !Number.isFinite(value) ? 'Unavailable' : new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(value)
}

// INR is the saved cost of the calls at their recorded exchange rates, never today's rate.
export function currencyCost(value: AiMoneyTotals, currency: AiCurrency) {
  const amount = currency === 'INR' ? value.costInr : value.costUsd
  if (amount == null) return currency === 'INR' ? 'INR unavailable' : 'Unpriced'
  if (value.unpricedCalls && amount === 0) return 'Not fully priced'
  const missing = currency === 'INR' ? value.unconvertedCalls ?? 0 : 0
  return `${formatMoney(amount, currency)}${value.unpricedCalls ? ' + unpriced' : ''}${missing ? ' + pending FX' : ''}`
}

export function errorMessage(error: unknown) {
  if (error && typeof error === 'object') {
    const item = error as { message?: unknown; code?: unknown; type?: unknown }
    const message = typeof item.message === 'string' ? item.message : readablePayload(error)
    const code = typeof item.code === 'string' || typeof item.code === 'number' ? String(item.code) : ''
    return code ? `${code}: ${message}` : message
  }
  return typeof error === 'string' ? error : 'Unknown provider error'
}

export function formatCompactNumber(value: number) { return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value) }
