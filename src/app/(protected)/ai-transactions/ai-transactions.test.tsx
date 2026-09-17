// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getRouteMatcher } from 'next/dist/shared/lib/router/utils/route-matcher'
import { getRouteRegex } from 'next/dist/shared/lib/router/utils/route-regex'
import { getDynamicParam } from 'next/dist/shared/lib/router/utils/get-dynamic-param'
import { io } from 'socket.io-client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dateInputValue, dateRange, defaultFilters, estimatedCost, currencyCost, type AiBalanceData, type AiFundingEstimate, type AiAnalytics, type AiTransaction, type AiCall } from './ai-transactions-data'

const realtime = vi.hoisted(() => ({ handlers: new Map<string, (...args: any[]) => void>(), ack: null as null | ((value: unknown) => void), disconnect: vi.fn(), active: true }))
vi.mock('socket.io-client', () => ({ io: vi.fn(() => ({
  on: (event: string, handler: (...args: any[]) => void) => realtime.handlers.set(event, handler),
  emit: (_event: string, _data: unknown, ack: (value: unknown) => void) => { realtime.ack = ack },
  removeAllListeners: () => realtime.handlers.clear(), disconnect: realtime.disconnect, get active() { return realtime.active },
})) }))

import { AiTransactionsPanel } from './ai-transactions-panel'
import { AiTransactionDetailPanel } from './ai-transaction-detail-panel'
import AiTransactionDetailPage from './[id]/page'
import { AiBalancePanel } from './ai-balance-panel'

const transaction: AiTransaction = {
  id: 'ait_request_1', service: 'content_pilot', operation: 'Generate social post', userId: 42,
  vendorProfileId: 13, userName: 'Asha Patel', userEmail: 'asha@example.test', status: 'completed',
  startedAt: '2026-09-14T08:00:00.000Z', completedAt: '2026-09-14T08:00:03.000Z', updatedAt: '2026-09-14T08:00:03.000Z',
  durationMs: 3000, models: ['gpt-text', 'gpt-image'], callCount: 2, inputTokens: 240, outputTokens: 80,
  cachedInputTokens: 100, costUsd: 0.0212, costInr: 1.6748, unconvertedCalls: 0, unpricedCalls: 1,
}
const summary = { transactions: 1, calls: 2, inputTokens: 240, outputTokens: 80, cachedInputTokens: 100, costUsd: 0.0212, costInr: 1.6748, unconvertedCalls: 0, failedCalls: 1, failedTransactions: 0, runningTransactions: 0, unpricedCalls: 1 }
const analytics: AiAnalytics = {
  summary, today: { ...summary, transactions: 6, calls: 10 },
  models: [{ model: 'gpt-text', calls: 1, inputTokens: 240, outputTokens: 80, cachedInputTokens: 100, costUsd: 0.0212, unpricedCalls: 0 }],
  services: [{ service: 'content_pilot', transactions: 1, calls: 2, costUsd: 0.0212 }],
  timeline: [{ date: '2026-09-14', transactions: 1, calls: 2, failedCalls: 1, costUsd: 0.0212, costInr: 1.6748 }],
  errors: { total: 1, byService: [{ service: 'content_pilot', count: 1 }], byModel: [{ model: 'gpt-text', count: 1 }], byCode: [{ code: 'rate_limit', count: 1 }], recent: [{ id: 'call_failed', transactionId: transaction.id, service: 'content_pilot', model: 'gpt-text', error: { code: 'rate_limit', message: 'Too many requests' }, startedAt: transaction.startedAt }] },
}
const calls: AiCall[] = [
  { id: 'call_1', transactionId: transaction.id, sequence: 1, operation: 'Create caption', model: 'gpt-text', requestedModel: 'gpt-text', status: 'completed', startedAt: transaction.startedAt, completedAt: transaction.completedAt, durationMs: 1000, input: { messages: [{ role: 'user', content: 'Create a cab service campaign <script>alert(1)</script>' }] }, output: { text: 'Your next ride starts here.' }, inputTokens: 240, outputTokens: 80, cachedInputTokens: 100, costUsd: 0.0212, costInr: 1.6748, exchangeRate: { id: 'fx_old', base: 'USD', quote: 'INR', rate: 79, source: 'ExchangeRate-API', asOf: '2026-09-14T00:00:00.000Z', fetchedAt: '2026-09-14T08:00:00.000Z', status: 'fresh', rateKind: 'reference' }, pricingStatus: 'priced', providerRequestId: 'req_provider_1', pricing: { inputPerMillion: 1.25 } },
  { id: 'call_2', transactionId: transaction.id, parentCallId: 'call_1', sequence: 2, operation: 'Create artwork', model: 'gpt-image', requestedModel: 'gpt-image', status: 'completed', startedAt: transaction.startedAt, completedAt: transaction.completedAt, durationMs: 2000, input: 'Illustrate the campaign.', output: { image: 'https://example.test/result.png' }, inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, costUsd: null, pricingStatus: 'unpriced' },
]


const balanceData: AiBalanceData = {
  balance: { configured: true, remainingUsd: 100, remainingInr: 8200, totalTopUpsUsd: 100, totalSpendUsd: 0.0212, totalSpendInr: 1.6748, unpricedCalls: 0, unconvertedCalls: 0, updatedAt: transaction.updatedAt, baselineAt: transaction.startedAt, revision: 7 },
  rate: { id: 'fx_latest', base: 'USD', quote: 'INR', rate: 100, source: 'ExchangeRate-API', asOf: transaction.startedAt, fetchedAt: transaction.startedAt, status: 'fresh', rateKind: 'reference' },
  entries: [], reconciliation: { available: true, mode: 'comparison_only' },
}
const fundingEstimate: AiFundingEstimate = {
  status: 'ready', calculatedAt: transaction.updatedAt, estimated: true, accountCount: 12,
  subscriptionCredits: 3000, purchasedCredits: 2500, reservedCredits: 1000, expiredSubscriptionCredits: 200,
  outstandingCredits: 6500, creditsPerUsd: 50, conversionSource: 'global_balance_account',
  requiredBalanceUsd: 130, requiredBalanceInr: 13000, remainingBalanceUsd: 100, remainingBalanceInr: 10000,
  requiredTopUpUsd: 30, requiredTopUpInr: 3000, includesReservedCredits: true, invalidAccounts: 0,
}
let currentBalance: AiBalanceData
let currentAnalytics: AiAnalytics
let requests: URL[]
let listTransactions: AiTransaction[]
let posts: Array<{ body: any; headers: Record<string, string>; path: string }>
function response(data: unknown) { return { ok: true, json: async () => ({ data }) } }
function installFetch() {
  vi.stubGlobal('fetch', vi.fn(async (path: string, options: RequestInit = {}) => {
    const url = new URL(path, 'http://localhost')
    requests.push(url)
    if (options.method === 'POST') { posts.push({ path: url.pathname, body: JSON.parse(options.body as string), headers: options.headers as Record<string, string> }); return response(balanceData) }
    if (url.pathname.endsWith('/balance')) return response(currentBalance)
    if (url.pathname.endsWith('/exchange-rate')) return response({ rate: balanceData.rate })
    if (url.pathname.endsWith('/analytics')) return response(url.searchParams.get('service') === 'content_pilot' ? { ...currentAnalytics, summary: { ...currentAnalytics.summary, transactions: 3, calls: 9 } } : currentAnalytics)
    if (url.pathname.endsWith(`/${transaction.id}`)) return response({ transaction, calls })
    return response({ transactions: listTransactions, pagination: { page: Number(url.searchParams.get('page') ?? 1), perPage: 25, total: 26, lastPage: 2 } })
  }))
}
beforeEach(() => {
  requests = []; posts = []; listTransactions = [transaction]; currentBalance = balanceData; currentAnalytics = analytics
  realtime.handlers.clear(); realtime.ack = null; realtime.active = true
  const storage = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) })
  window.history.replaceState({}, '', '/')
  document.cookie = 'vendero_admin_access_token=test-token; path=/'
  installFetch()
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.clearAllMocks(); vi.restoreAllMocks(); document.cookie = 'vendero_admin_access_token=; Max-Age=0; path=/' })

describe('AI date and currency boundaries', () => {
  it('includes the whole last day, leap months, and starts the week on Monday', () => {
    const now = new Date(2026, 8, 20, 16, 30)
    const filters = defaultFilters(now)
    const week = dateRange({ ...filters, preset: 'week' }, now)
    expect(dateInputValue(new Date(week.startDate))).toBe('2026-09-14')
    expect(dateInputValue(new Date(week.endDate))).toBe('2026-09-21')
    const range = dateRange({ ...filters, preset: 'range', startDay: '2026-09-01', endDay: '2026-09-14' }, now)
    expect(new Date(range.endDate).getHours()).toBe(0)
    expect(dateInputValue(new Date(range.endDate))).toBe('2026-09-15')
    const month = dateRange({ ...filters, preset: 'selected_month', month: '2024-02' }, now)
    expect(dateInputValue(new Date(month.startDate))).toBe('2024-02-01')
    expect(dateInputValue(new Date(month.endDate))).toBe('2024-03-01')
  })
  it('rejects invalid ranges and never treats missing prices or historical FX as zero cost', () => {
    expect(() => dateRange({ ...defaultFilters(), preset: 'range', startDay: '2026-09-20', endDay: '2026-09-01' })).toThrow('End date')
    expect(() => dateRange({ ...defaultFilters(), preset: 'day', day: '2026-02-31' })).toThrow('valid date')
    expect(estimatedCost(0, 1)).toBe('Not fully priced')
    expect(estimatedCost(0, 0)).toBe('$0.00')
    expect(currencyCost({ costUsd: 1 }, 'INR')).toBe('INR unavailable')
    expect(currencyCost({ costUsd: 1, costInr: 0, unconvertedCalls: 1 }, 'INR')).toBe('₹0.00 + pending FX')
  })
})

describe('AI monitoring views', () => {
  it('leads with actual AI requests and distinguishes grouped transactions', async () => {
    currentAnalytics = { ...analytics, summary: { ...summary, calls: 14, transactions: 6 } }
    render(<AiTransactionsPanel />)
    await screen.findByText('$100.00')
    const metrics = within(screen.getByRole('region', { name: 'Filtered AI analytics' }))
    expect(metrics.getAllByRole('group')[0]).toBe(metrics.getByRole('group', { name: 'AI requests' }))
    expect(within(metrics.getByRole('group', { name: 'AI requests' })).getByText('14')).toBeTruthy()
    expect(within(metrics.getByRole('group', { name: 'Transactions' })).getByText('6')).toBeTruthy()
    expect(metrics.getByText('Each transaction groups one or more AI calls')).toBeTruthy()
  })

  it('opens Dashboard with filtered cards; the AI service selector updates cards and preserves account balance', async () => {
    const user = userEvent.setup()
    render(<AiTransactionsPanel />)
    await screen.findByText('$100.00')
    expect(screen.getByRole('tab', { name: 'Dashboard' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.queryByRole('table', { name: 'AI transactions' })).toBeNull()
    expect(screen.queryByText("Today's transactions")).toBeNull()
    await user.selectOptions(screen.getByRole('combobox', { name: 'AI service' }), 'content_pilot')
    await waitFor(() => expect(within(screen.getByRole('region', { name: 'Filtered AI analytics' })).getByText('3')).toBeTruthy())
    expect(within(screen.getByRole('region', { name: 'Filtered AI analytics' })).getByText('9')).toBeTruthy()
    expect(screen.getByText('$100.00')).toBeTruthy()
    expect(requests.filter((url) => url.pathname.endsWith('/balance')).every((url) => !url.search)).toBe(true)
    expect(screen.getByRole('table', { name: 'Recent failed AI calls' }).textContent).toContain('rate_limit: Too many requests')
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Dashboard' }), { key: 'ArrowRight' })
    expect(screen.getByRole('table', { name: 'AI transactions' })).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Filtered AI analytics' })).toBeNull()
  })

  it('applies date chips and advanced filters to analytics and paginated transactions', async () => {
    const user = userEvent.setup()
    render(<AiTransactionsPanel />)
    await screen.findByText('$100.00')
    await user.click(screen.getByRole('tab', { name: /Transactions/ }))
    await user.click(screen.getByRole('button', { name: 'Date range' }))
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-09-01' } })
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-09-14' } })
    await user.selectOptions(screen.getByRole('combobox', { name: 'AI service' }), 'content_pilot')
    await user.click(screen.getByText('More filters'))
    await user.type(screen.getByLabelText('Model'), 'gpt-text')
    await user.type(screen.getByLabelText('User ID'), '42')
    await user.type(screen.getByLabelText('Vendor profile ID'), '13')
    await user.selectOptions(screen.getByLabelText('Status'), 'completed')
    await user.type(screen.getByLabelText('Search transactions'), 'campaign')
    await user.click(screen.getByRole('button', { name: 'Apply more filters' }))
    await waitFor(() => expect(requests.some((url) => url.searchParams.get('search') === 'campaign')).toBe(true))
    const filtered = requests.filter((url) => url.searchParams.get('search') === 'campaign')
    for (const url of filtered) {
      expect(url.searchParams.get('service')).toBe('content_pilot')
      expect(url.searchParams.get('model')).toBe('gpt-text')
      expect(url.searchParams.get('userId')).toBe('42')
      expect(url.searchParams.get('vendorProfileId')).toBe('13')
      expect(url.searchParams.get('status')).toBe('completed')
      expect(dateInputValue(new Date(url.searchParams.get('startDate')!))).toBe('2026-09-01')
      expect(dateInputValue(new Date(url.searchParams.get('endDate')!))).toBe('2026-09-15')
    }
    expect(filtered.some((url) => url.searchParams.has('timeZone'))).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Next page' }))
    await waitFor(() => expect(requests.some((url) => url.searchParams.get('page') === '2')).toBe(true))
    expect(screen.getByText('Page 2 of 2')).toBeTruthy()
  })

  it('rejects reversed dates immediately without issuing an invalid request', async () => {
    const user = userEvent.setup()
    render(<AiTransactionsPanel />)
    await screen.findByText('$100.00')
    await user.click(screen.getByRole('button', { name: 'Date range' }))
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-09-20' } })
    const count = requests.length
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-09-01' } })
    expect(screen.getByRole('alert').textContent).toContain('End date must be on or after')
    expect(requests).toHaveLength(count)
  })

  it('uses saved INR costs and balance instead of converting history with the latest quote', async () => {
    const user = userEvent.setup()
    render(<AiTransactionsPanel />)
    await screen.findByText('$100.00')
    await user.click(screen.getByRole('button', { name: '₹ INR' }))
    expect(screen.getByText('₹8,200.00')).toBeTruthy()
    expect(screen.getAllByText('₹1.6748 + unpriced').length).toBeGreaterThan(0)
    expect(screen.queryByText('₹10,000.00')).toBeNull()
    expect(screen.getByText('$1 = ₹100.00')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Spend' }))
    expect(screen.getByRole('img', { name: 'Estimated spend (INR) trend across 1 recorded days' })).toBeTruthy()
  })

  it('refreshes after authorized WebSocket updates and reports reconnecting on disconnect', async () => {
    const user = userEvent.setup()
    render(<AiTransactionsPanel />)
    await screen.findByText('$100.00')
    await user.click(screen.getByRole('tab', { name: /Transactions/ }))
    act(() => { realtime.handlers.get('connect')?.(); realtime.ack?.({ ok: true, live: true }) })
    expect(screen.getByText('Live updates')).toBeTruthy()
    listTransactions = [{ ...transaction, operation: 'New live request' }]
    act(() => realtime.handlers.get('ai:transaction:updated')?.({ transactionId: transaction.id }))
    await screen.findByText('New live request')
    act(() => realtime.handlers.get('disconnect')?.())
    expect(screen.getByText('Reconnecting…')).toBeTruthy()
  })

  it('uses only WebSocket transport and makes no timer-based API requests while idle or disconnected', async () => {
    vi.useFakeTimers()
    await act(async () => { render(<AiTransactionsPanel />) })
    expect(vi.mocked(io).mock.calls.at(-1)?.[1]).toMatchObject({ transports: ['websocket'] })
    expect(screen.getByText('Connecting…')).toBeTruthy()
    const initialRequests = requests.length
    await act(async () => { await vi.advanceTimersByTimeAsync(10 * 60 * 1000) })
    expect(requests).toHaveLength(initialRequests)
    act(() => { realtime.handlers.get('connect')?.(); realtime.ack?.({ ok: true, live: true }) })
    await act(async () => { await vi.advanceTimersByTimeAsync(401) })
    expect(screen.getByText('Live updates')).toBeTruthy()
    const connectedRequests = requests.length
    expect(connectedRequests).toBeGreaterThan(initialRequests)
    await act(async () => { await vi.advanceTimersByTimeAsync(10 * 60 * 1000) })
    expect(requests).toHaveLength(connectedRequests)
    act(() => realtime.handlers.get('disconnect')?.())
    expect(screen.getByText('Reconnecting…')).toBeTruthy()
    await act(async () => { await vi.advanceTimersByTimeAsync(10 * 60 * 1000) })
    expect(requests).toHaveLength(connectedRequests)
    realtime.active = false
    act(() => realtime.handlers.get('connect_error')?.(new Error('Not authorized')))
    expect(screen.getByTitle('The live connection is unavailable. Use Refresh to load current data.')).toBeTruthy()
    expect(screen.queryByText(/Auto refresh/)).toBeNull()
    await act(async () => { await vi.advanceTimersByTimeAsync(5 * 60 * 1000) })
    expect(requests).toHaveLength(connectedRequests)
  })

  it('refreshes repeated cost and credit events in all three visible balance cards without deduplicating transaction IDs', async () => {
    vi.useFakeTimers()
    currentBalance = { ...balanceData, funding: fundingEstimate }
    await act(async () => { render(<AiTransactionsPanel />) })
    act(() => { realtime.handlers.get('connect')?.(); realtime.ack?.({ ok: true, live: true }) })
    await act(async () => { await vi.advanceTimersByTimeAsync(401) })
    const notifyChange = async (name: 'ai:transaction:updated' | 'ai:balance:updated') => {
      act(() => realtime.handlers.get(name)?.({ transactionId: transaction.id, vendorProfileId: 13 }))
      await act(async () => { await vi.advanceTimersByTimeAsync(401) })
    }
    currentBalance = { ...currentBalance, balance: { ...currentBalance.balance, remainingUsd: 95, totalSpendUsd: 5 } }
    currentAnalytics = { ...analytics, summary: { ...summary, costUsd: 5, unpricedCalls: 0 } }
    listTransactions = [{ ...transaction, costUsd: 5, unpricedCalls: 0 }]
    await notifyChange('ai:transaction:updated')
    expect(within(screen.getByRole('region', { name: 'Remaining Balance' })).getByText('$95.00')).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'Filtered AI analytics' })).getByText('$5.00')).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'Used Balance' })).getByText('$5.00')).toBeTruthy()
    currentBalance = { ...currentBalance, balance: { ...currentBalance.balance, remainingUsd: 88, totalSpendUsd: 12 } }
    currentAnalytics = { ...analytics, summary: { ...summary, costUsd: 12, unpricedCalls: 0 } }
    listTransactions = [{ ...transaction, costUsd: 12, unpricedCalls: 0 }]
    await notifyChange('ai:transaction:updated')
    expect(within(screen.getByRole('region', { name: 'Used Balance' })).getByText('$12.00')).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'Remaining Balance' })).getByText('$88.00')).toBeTruthy()
    currentBalance = { ...currentBalance, funding: { ...fundingEstimate, outstandingCredits: 20000, subscriptionCredits: 16500, requiredBalanceUsd: 400, remainingBalanceUsd: 88, requiredTopUpUsd: 312 } }
    await notifyChange('ai:balance:updated')
    expect(within(screen.getByRole('region', { name: 'Required Top-up' })).getAllByText('$312.00')).toHaveLength(1)
    currentBalance = { ...currentBalance, funding: { ...fundingEstimate, outstandingCredits: 22500, subscriptionCredits: 19000, requiredBalanceUsd: 450, remainingBalanceUsd: 88, requiredTopUpUsd: 362 } }
    await notifyChange('ai:balance:updated')
    expect(within(screen.getByRole('region', { name: 'Required Top-up' })).getAllByText('$362.00')).toHaveLength(1)
    fireEvent.click(screen.getByRole('tab', { name: /^Transactions/ }))
    expect(screen.getByRole('table', { name: 'AI transactions' }).textContent).toContain('$12.00')
  })

  it('rejoins and refreshes missed changes on every authorized reconnect while ignoring obsolete watch acknowledgements', async () => {
    vi.useFakeTimers()
    await act(async () => { render(<AiTransactionsPanel />) })
    act(() => realtime.handlers.get('connect')?.())
    const firstAck = realtime.ack!
    act(() => realtime.handlers.get('disconnect')?.())
    const initialRequests = requests.length
    act(() => firstAck({ ok: true, live: true }))
    expect(screen.getByText('Reconnecting…')).toBeTruthy()
    await act(async () => { await vi.advanceTimersByTimeAsync(60000) })
    expect(requests).toHaveLength(initialRequests)
    currentBalance = { ...balanceData, balance: { ...balanceData.balance, remainingUsd: 80 } }
    act(() => { realtime.handlers.get('connect')?.(); realtime.ack?.({ ok: true, live: true }) })
    await act(async () => { await vi.advanceTimersByTimeAsync(401) })
    expect(screen.getByText('$80.00')).toBeTruthy()
    act(() => firstAck({ ok: false, error: 'Old connection rejected' }))
    expect(screen.getByText('Live updates')).toBeTruthy()
    act(() => realtime.handlers.get('disconnect')?.())
    currentBalance = { ...balanceData, balance: { ...balanceData.balance, remainingUsd: 70 } }
    const disconnectedRequests = requests.length
    await act(async () => { await vi.advanceTimersByTimeAsync(120000) })
    expect(requests).toHaveLength(disconnectedRequests)
    act(() => { realtime.handlers.get('connect')?.(); realtime.ack?.({ ok: true, live: true }) })
    await act(async () => { await vi.advanceTimersByTimeAsync(401) })
    expect(screen.getByText('$70.00')).toBeTruthy()
    const lastAck = realtime.ack!
    cleanup()
    const completedRequests = requests.length
    act(() => lastAck({ ok: true, live: true }))
    await act(async () => { await vi.advanceTimersByTimeAsync(60000) })
    expect(requests).toHaveLength(completedRequests)
  })

  it('fences timed-out authorization callbacks and does not read data for unauthenticated change events', async () => {
    vi.useFakeTimers()
    await act(async () => { render(<AiTransactionsPanel />) })
    act(() => realtime.handlers.get('connect')?.())
    const delayedAck = realtime.ack!
    const initialRequests = requests.length
    await act(async () => { await vi.advanceTimersByTimeAsync(8001) })
    expect(screen.getByTitle('The live connection is unavailable. Use Refresh to load current data.')).toBeTruthy()
    act(() => { delayedAck({ ok: true, live: true }); realtime.handlers.get('ai:balance:updated')?.({}) })
    await act(async () => { await vi.advanceTimersByTimeAsync(60000) })
    expect(requests).toHaveLength(initialRequests)
    expect(screen.queryByText('Live updates')).toBeNull()
    act(() => { realtime.handlers.get('connect')?.(); realtime.ack?.({ ok: true, live: true }) })
    await act(async () => { await vi.advanceTimersByTimeAsync(401) })
    expect(screen.getByText('Live updates')).toBeTruthy()
    expect(requests.length).toBeGreaterThan(initialRequests)
  })

  it('recovers a rejected watch with manual Refresh and reads exactly once after authorization succeeds', async () => {
    vi.useFakeTimers()
    await act(async () => { render(<AiTransactionsPanel />) })
    act(() => { realtime.handlers.get('connect')?.(); realtime.ack?.({ ok: false, message: 'Core API unavailable' }) })
    expect(screen.getByTitle('The live connection is unavailable. Use Refresh to load current data.')).toBeTruthy()
    const rejectedRequests = requests.length
    const rejectedAck = realtime.ack
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(realtime.ack).not.toBe(rejectedAck)
    expect(screen.getByRole('button', { name: 'Refresh' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByText('Reconnecting…')).toBeTruthy()
    await act(async () => { await vi.advanceTimersByTimeAsync(6000) })
    expect(requests).toHaveLength(rejectedRequests)
    currentBalance = { ...balanceData, balance: { ...balanceData.balance, remainingUsd: 77 } }
    await act(async () => { realtime.ack?.({ ok: true, live: true }) })
    expect(screen.getByText('Live updates')).toBeTruthy()
    expect(screen.getByText('$77.00')).toBeTruthy()
    expect(requests).toHaveLength(rejectedRequests + 3)
    expect(screen.getByRole('button', { name: 'Refresh' }).hasAttribute('disabled')).toBe(false)
    await act(async () => { await vi.advanceTimersByTimeAsync(120000) })
    expect(requests).toHaveLength(rejectedRequests + 3)
  })

  it('ends a timed-out manual authorization retry with one data read and fences recovery after unmount', async () => {
    vi.useFakeTimers()
    await act(async () => { render(<AiTransactionsPanel />) })
    act(() => { realtime.handlers.get('connect')?.(); realtime.ack?.({ ok: false, message: 'Temporary access check failure' }) })
    const initialRequests = requests.length
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    await act(async () => { await vi.advanceTimersByTimeAsync(8001) })
    expect(requests).toHaveLength(initialRequests + 3)
    expect(screen.getByTitle('The live connection is unavailable. Use Refresh to load current data.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    const pendingAck = realtime.ack!
    cleanup()
    const beforeLateAck = requests.length
    await act(async () => { pendingAck({ ok: true, live: true }); await vi.advanceTimersByTimeAsync(120000) })
    expect(requests).toHaveLength(beforeLateAck)
  })

  it('reports stream outages over an open WebSocket and refreshes once the authenticated bridge resyncs', async () => {
    vi.useFakeTimers()
    await act(async () => { render(<AiTransactionsPanel />) })
    act(() => { realtime.handlers.get('connect')?.(); realtime.ack?.({ ok: true, live: false }) })
    await act(async () => { await vi.advanceTimersByTimeAsync(401) })
    expect(screen.getByTitle('The live connection is unavailable. Use Refresh to load current data.')).toBeTruthy()
    const unavailableRequests = requests.length
    currentBalance = { ...balanceData, balance: { ...balanceData.balance, remainingUsd: 83 } }
    await act(async () => { await vi.advanceTimersByTimeAsync(120000) })
    expect(requests).toHaveLength(unavailableRequests)
    act(() => realtime.handlers.get('ai:transactions:resync')?.({ reason: 'subscriber_reconnected' }))
    await act(async () => { await vi.advanceTimersByTimeAsync(401) })
    expect(screen.getByText('Live updates')).toBeTruthy()
    expect(screen.getByText('$83.00')).toBeTruthy()
    act(() => realtime.handlers.get('ai:transactions:unavailable')?.({ reason: 'subscriber_disconnected' }))
    expect(screen.getByTitle('The live connection is unavailable. Use Refresh to load current data.')).toBeTruthy()
    const disconnectedRequests = requests.length
    currentBalance = { ...balanceData, balance: { ...balanceData.balance, remainingUsd: 79 } }
    await act(async () => { await vi.advanceTimersByTimeAsync(300000) })
    expect(requests).toHaveLength(disconnectedRequests)
    act(() => realtime.handlers.get('ai:transactions:resync')?.({ reason: 'subscriber_reconnected' }))
    await act(async () => { await vi.advanceTimersByTimeAsync(401) })
    expect(screen.getByText('$79.00')).toBeTruthy()
    expect(screen.getByText('Live updates')).toBeTruthy()
  })

  it('preserves a newer stream health event across a delayed watch acknowledgement without bypassing authorization', async () => {
    vi.useFakeTimers()
    await act(async () => { render(<AiTransactionsPanel />) })
    const initialRequests = requests.length
    act(() => { realtime.handlers.get('connect')?.(); realtime.handlers.get('ai:transactions:unavailable')?.({}) })
    expect(screen.getByText('Connecting…')).toBeTruthy()
    act(() => realtime.ack?.({ ok: true, live: true }))
    expect(screen.getByTitle('The live connection is unavailable. Use Refresh to load current data.')).toBeTruthy()
    await act(async () => { await vi.advanceTimersByTimeAsync(401) })
    expect(requests.length).toBeGreaterThan(initialRequests)
    act(() => { realtime.handlers.get('disconnect')?.(); realtime.handlers.get('connect')?.(); realtime.ack?.({ ok: false, error: 'Not authorized' }); realtime.handlers.get('ai:transactions:resync')?.({}) })
    expect(screen.getByTitle('The live connection is unavailable. Use Refresh to load current data.')).toBeTruthy()
    const rejectedRequests = requests.length
    await act(async () => { await vi.advanceTimersByTimeAsync(60000) })
    expect(requests).toHaveLength(rejectedRequests)
  })

  it('waits for delayed visibility authorization before reading changes made while the room join was pending', async () => {
    vi.useFakeTimers()
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    await act(async () => { render(<AiTransactionsPanel />) })
    act(() => { realtime.handlers.get('connect')?.(); realtime.ack?.({ ok: false, message: 'Temporary access check failure' }) })
    const initialRequests = requests.length
    visibility.mockReturnValue('hidden')
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    visibility.mockReturnValue('visible')
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(screen.getByText('Reconnecting…')).toBeTruthy()
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(requests).toHaveLength(initialRequests)
    currentBalance = { ...balanceData, balance: { ...balanceData.balance, remainingUsd: 74 } }
    await act(async () => { realtime.ack?.({ ok: true, live: true }) })
    await act(async () => { await vi.advanceTimersByTimeAsync(401) })
    expect(screen.getByText('$74.00')).toBeTruthy()
    expect(screen.getByText('Live updates')).toBeTruthy()
    expect(requests).toHaveLength(initialRequests + 3)
    await act(async () => { await vi.advanceTimersByTimeAsync(120000) })
    expect(requests).toHaveLength(initialRequests + 3)
  })

  it('performs one visibility recovery read for changes missed while hidden without starting a timer loop', async () => {
    vi.useFakeTimers()
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    await act(async () => { render(<AiTransactionsPanel />) })
    act(() => { realtime.handlers.get('connect')?.(); realtime.ack?.({ ok: true, live: true }) })
    await act(async () => { await vi.advanceTimersByTimeAsync(401) })
    const visibleRequests = requests.length
    visibility.mockReturnValue('hidden')
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    currentBalance = { ...balanceData, balance: { ...balanceData.balance, remainingUsd: 91 } }
    act(() => realtime.handlers.get('ai:balance:updated')?.({}))
    await act(async () => { await vi.advanceTimersByTimeAsync(120000) })
    expect(requests).toHaveLength(visibleRequests)
    visibility.mockReturnValue('visible')
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    await act(async () => { await vi.advanceTimersByTimeAsync(401) })
    expect(screen.getByText('$91.00')).toBeTruthy()
    const recoveredRequests = requests.length
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    await act(async () => { await vi.advanceTimersByTimeAsync(120000) })
    expect(requests).toHaveLength(recoveredRequests)
  })

  it('shows a usable retry on analytics failure and isolates balance-only failures', async () => {
    vi.stubGlobal('fetch', vi.fn(async (path: string) => path.endsWith('/balance') ? { ok: false, json: async () => ({ error: { message: 'Balance storage unavailable' } }) } : path.includes('/analytics') ? response(analytics) : response({ transactions: [], pagination: { page: 1, perPage: 25, total: 0, lastPage: 1 } })))
    render(<AiTransactionsPanel />)
    expect((await screen.findByRole('alert')).textContent).toContain('Balance storage unavailable')
    expect(screen.getByRole('table', { name: 'Usage by model' }).textContent).toContain('gpt-text')
    cleanup()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({ error: { message: 'Monitoring storage unavailable' } }) })))
    render(<AiTransactionsPanel />)
    expect((await screen.findByRole('alert')).textContent).toContain('Monitoring storage unavailable')
    expect(screen.getByRole('button', { name: 'Refresh' }).hasAttribute('disabled')).toBe(false)
  })

  it('finishes a slow request during live event bursts and coalesces one trailing refresh', async () => {
    vi.useFakeTimers()
    let resolveFirst!: (value: unknown) => void
    let firstSignal!: AbortSignal
    let listRequests = 0
    vi.stubGlobal('fetch', vi.fn(async (path: string, options: RequestInit) => {
      if (path.includes('/analytics?')) return response(analytics)
      if (path.endsWith('/balance')) return response(balanceData)
      listRequests += 1
      if (listRequests === 1) { firstSignal = options.signal as AbortSignal; return new Promise((resolve) => { resolveFirst = resolve }) }
      return response({ transactions: [transaction], pagination: { page: 1, perPage: 25, total: 1, lastPage: 1 } })
    }))
    render(<AiTransactionsPanel />)
    act(() => { realtime.handlers.get('connect')?.(); realtime.ack?.({ ok: true, live: true }) })
    for (let index = 0; index < 4; index += 1) {
      act(() => realtime.handlers.get('ai:transaction:updated')?.({ transactionId: transaction.id }))
      await act(async () => { await vi.advanceTimersByTimeAsync(450) })
    }
    expect(firstSignal.aborted).toBe(false)
    expect(listRequests).toBe(1)
    await act(async () => { resolveFirst(response({ transactions: [transaction], pagination: { page: 1, perPage: 25, total: 1, lastPage: 1 } })); await Promise.resolve() })
    expect(listRequests).toBe(2)
    expect(screen.getByText('$100.00')).toBeTruthy()
  })
})

describe('tracked balance entries', () => {
  it('shows all three balance cards together and preserves saved INR provider spend', async () => {
    const props = { loading: false, onRefresh: vi.fn(async () => {}), data: { ...balanceData, funding: fundingEstimate } }
    const view = render(<AiBalancePanel {...props} currency="USD" />)
    expect(screen.queryByRole('tablist', { name: 'OpenAI balance views' })).toBeNull()
    expect(within(screen.getByRole('region', { name: 'Remaining Balance' })).getByText('$100.00')).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'Used Balance' })).getByText('$0.0212')).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'Required Top-up' })).getByText('$30.00')).toBeTruthy()
    view.rerender(<AiBalancePanel {...props} currency="INR" />)
    expect(within(screen.getByRole('region', { name: 'Used Balance' })).getByText('₹1.6748')).toBeTruthy()
    expect(screen.queryByText('₹2.12')).toBeNull()
    expect(screen.getByRole('button', { name: 'Update balance' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Record top-up' })).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'Remaining Balance' })).getByText('₹8,200.00')).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'Required Top-up' })).getByText('₹3,000.00')).toBeTruthy()
  })

  it('shows outstanding credit backing and the authoritative funding calculation in USD and current INR', async () => {
    const user = userEvent.setup()
    const props = { loading: false, onRefresh: vi.fn(async () => {}), data: { ...balanceData, funding: fundingEstimate } }
    const view = render(<AiBalancePanel {...props} currency="USD" />)
    expect(within(screen.getByRole('region', { name: 'Required Top-up' })).getByText('$30.00')).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'Required Top-up' })).getByText('Top-up needed')).toBeTruthy()
    const disclosure = screen.getByText('Funding calculation', { exact: true })
    expect(disclosure.closest('details')?.hasAttribute('open')).toBe(false)
    await user.click(disclosure)
    expect(disclosure.closest('details')?.hasAttribute('open')).toBe(true)
    let calculation = within(screen.getByRole('region', { name: 'Funding calculation' }))
    expect(calculation.getByText('$30.00')).toBeTruthy()
    expect(calculation.getByText('$130.00')).toBeTruthy()
    expect(calculation.getByText('$100.00')).toBeTruthy()
    expect(calculation.getByText('6,500')).toBeTruthy()
    expect(calculation.getByText('Subscription / free allowance')).toBeTruthy()
    expect(calculation.getByText('Purchased / granted')).toBeTruthy()
    expect(calculation.getByText('Reserved for ongoing work')).toBeTruthy()
    expect(calculation.getByText(/200 expired subscription credits are excluded/)).toBeTruthy()
    view.rerender(<AiBalancePanel {...props} currency="INR" />)
    expect(within(screen.getByRole('region', { name: 'Required Top-up' })).getByText('₹3,000.00')).toBeTruthy()
    calculation = within(screen.getByRole('region', { name: 'Funding calculation' }))
    expect(calculation.getByText('₹3,000.00')).toBeTruthy()
    expect(calculation.getByText('₹13,000.00')).toBeTruthy()
    expect(calculation.getByText('₹10,000.00')).toBeTruthy()
    expect(calculation.queryByText('₹8,200.00')).toBeNull()
    expect(calculation.queryByText('₹4,800.00')).toBeNull()
    expect(calculation.getByText(/These INR funding amounts use the latest available reference rate/)).toBeTruthy()
  })

  it('shows zero required top-up when remaining provider funds already cover outstanding credits', async () => {
    const funded = { ...fundingEstimate, subscriptionCredits: 1000, purchasedCredits: 1000, reservedCredits: 1000, outstandingCredits: 3000, requiredBalanceUsd: 60, requiredBalanceInr: 6000, requiredTopUpUsd: 0, requiredTopUpInr: 0 }
    render(<AiBalancePanel data={{ ...balanceData, funding: funded }} loading={false} currency="USD" onRefresh={vi.fn(async () => {})} />)
    const panel = within(screen.getByRole('region', { name: 'Required Top-up' }))
    expect(panel.getAllByText('$0.00')).toHaveLength(1)
    expect(panel.getByText('Covered')).toBeTruthy()
    expect(panel.queryByText('Top-up needed')).toBeNull()
    expect(panel.getByText(/covers the estimated cost of outstanding user credits/)).toBeTruthy()
  })

  it.each(['balance_required', 'conversion_unavailable', 'unavailable'] as const)('shows an unavailable funding gap when the API reports %s', async (status) => {
    const funding = { ...fundingEstimate, status, reason: 'A required funding input is missing.', requiredTopUpUsd: 0, requiredTopUpInr: 0 }
    render(<AiBalancePanel data={{ ...balanceData, funding }} loading={false} currency="USD" onRefresh={vi.fn(async () => {})} />)
    const panel = within(screen.getByRole('region', { name: 'Required Top-up' }))
    expect(panel.getAllByText('Unavailable').length).toBeGreaterThan(0)
    expect(panel.getByText('A required funding input is missing.')).toBeTruthy()
    expect(panel.queryByText('$0.00')).toBeNull()
    expect(panel.queryByText('Covered')).toBeNull()
  })

  it('keeps required top-up in USD available when a fresh INR funding conversion is missing', async () => {
    const props = { data: { ...balanceData, rate: null, funding: { ...fundingEstimate, requiredBalanceInr: null, remainingBalanceInr: null, requiredTopUpInr: null } }, loading: false, onRefresh: vi.fn(async () => {}) }
    const view = render(<AiBalancePanel {...props} currency="INR" />)
    let panel = within(screen.getByRole('region', { name: 'Required Top-up' }))
    expect(panel.getByText('INR unavailable')).toBeTruthy()
    expect(panel.getByText(/A fresh USD\/INR reference rate is needed/)).toBeTruthy()
    expect(panel.queryByText('₹0.00')).toBeNull()
    view.rerender(<AiBalancePanel {...props} currency="USD" />)
    panel = within(screen.getByRole('region', { name: 'Required Top-up' }))
    expect(panel.getAllByText('$30.00')).toHaveLength(1)
  })

  it('reuses a stable idempotency key and revision when retrying a balance update after an uncertain response', async () => {
    const user = userEvent.setup()
    const onRefresh = vi.fn(async () => {})
    let failed = true
    const fetcher = vi.fn(async (path: string, options: RequestInit) => {
      posts.push({ path, body: JSON.parse(options.body as string), headers: options.headers as Record<string, string> })
      if (failed) { failed = false; throw new Error('Connection lost. Retry this entry.') }
      return response(balanceData)
    })
    vi.stubGlobal('fetch', fetcher)
    render(<AiBalancePanel data={balanceData} loading={false} currency="USD" onRefresh={onRefresh} />)
    await user.click(screen.getByRole('button', { name: 'Update balance' }))
    await user.type(screen.getByLabelText('Amount'), '125.5')
    await user.type(screen.getByLabelText('Reference (optional)'), 'receipt-123')
    await user.click(screen.getByRole('button', { name: 'Save balance' }))
    await screen.findByRole('alert')
    await user.click(screen.getByRole('button', { name: 'Save balance' }))
    await screen.findByText('Opening balance updated. New recorded calls will deduct from this amount.')
    expect(posts).toHaveLength(2)
    expect(posts[0].headers['Idempotency-Key']).toBeTruthy()
    expect(posts[1].headers['Idempotency-Key']).toBe(posts[0].headers['Idempotency-Key'])
    expect(posts[1].body).toEqual({ mode: 'set_balance', amount: 125.5, currency: 'USD', reference: 'receipt-123', expectedRevision: 7 })
    expect(onRefresh).toHaveBeenCalledOnce()
  })

  it('records an INR top-up and disables INR edits when the rate is missing or stale', async () => {
    const user = userEvent.setup()
    const props = { loading: false, currency: 'INR' as const, onRefresh: vi.fn(async () => {}) }
    const view = render(<AiBalancePanel {...props} data={balanceData} />)
    await user.click(screen.getByRole('button', { name: 'Record top-up' }))
    await user.type(screen.getByLabelText('Amount'), '1000')
    await user.click(screen.getByRole('button', { name: 'Save top-up' }))
    expect(posts[0].body).toEqual({ mode: 'top_up', amount: 1000, currency: 'INR' })
    view.rerender(<AiBalancePanel {...props} data={{ ...balanceData, rate: null }} />)
    await user.click(screen.getByRole('button', { name: 'Record top-up' }))
    expect(screen.getByRole('button', { name: 'Save top-up' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByText(/Exchange rate unavailable/)).toBeTruthy()
    view.rerender(<AiBalancePanel {...props} data={{ ...balanceData, rate: { ...balanceData.rate!, status: 'stale' } }} />)
    expect(screen.getByRole('button', { name: 'Save top-up' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByText('Stale rate')).toBeTruthy()
  })

  it('compares provider spend with an idempotency key when available', async () => {
    const user = userEvent.setup()
    render(<AiBalancePanel data={balanceData} loading={false} currency="USD" onRefresh={vi.fn(async () => {})} />)
    await user.click(screen.getByRole('button', { name: 'Compare OpenAI spend' }))
    expect(posts[0].path).toBe('/api/v1/admin/ai/transactions/balance/reconcile')
    expect(posts[0].headers['Idempotency-Key']).toBeTruthy()
    expect(posts[0].body).toEqual({})
  })
})

describe('AI transaction details', () => {
  const matchDetailRoute = getRouteMatcher(getRouteRegex('/ai-transactions/[id]'))
  const eventId = 'whats-pilot:event:1e386182924595607c5e251998ba6ee1552c58bec25bbff849e9c3fc73bce8a9'

  it('links colon-containing transaction IDs as one encoded route segment', async () => {
    listTransactions = [{ ...transaction, id: eventId }]
    window.history.replaceState({}, '', '/ai-transactions?tab=transactions')
    render(<AiTransactionsPanel />)
    const link = await screen.findByRole('link', { name: `View transaction ${eventId}` })
    expect(link.getAttribute('href')).toBe(`/ai-transactions/${encodeURIComponent(eventId)}`)
    expect(matchDetailRoute(link.getAttribute('href')!)).toEqual({ id: eventId })
  })

  it.each([eventId, 'transaction:literal%3Avalue', 'transaction:space and/slash%'])('decodes the encoded App Router page prop once and preserves the raw API ID: %s', async (id) => {
    const expectedPath = `/api/v1/admin/ai/transactions/${encodeURIComponent(id)}`
    vi.stubGlobal('fetch', vi.fn(async (path: string) => {
      requests.push(new URL(path, 'http://localhost'))
      return path === expectedPath
        ? response({ transaction: { ...transaction, id }, calls: [] })
        : { ok: false, status: 404, json: async () => ({ message: 'Transaction not found' }) }
    }))
    // The App Router re-encodes the low-level route match before page rendering.
    // Supplying only getRouteMatcher's decoded result misses the actual bug.
    const appRouterParam = getDynamicParam({ id }, 'id', 'd', '/ai-transactions/[id]', null)
    expect(appRouterParam.value).toBe(encodeURIComponent(id))
    render(await AiTransactionDetailPage({ params: Promise.resolve({ id: encodeURIComponent(id) }) }))
    await screen.findByText('Asha Patel')
    expect(screen.getByText(id)).toBeTruthy()
    expect(requests.map((request) => request.pathname)).toEqual([expectedPath])
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('matches repeated raw WebSocket IDs after opening an encoded transaction link', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn(async (path: string) => {
      requests.push(new URL(path, 'http://localhost'))
      return response({ transaction: { ...transaction, id: eventId }, calls: [] })
    }))
    await act(async () => {
      render(await AiTransactionDetailPage({ params: Promise.resolve({ id: encodeURIComponent(eventId) }) }))
    })
    act(() => { realtime.handlers.get('connect')?.(); realtime.ack?.({ ok: true, live: true }) })
    await act(async () => { await vi.advanceTimersByTimeAsync(401) })
    const authorizedReads = requests.length
    act(() => realtime.handlers.get('ai:transaction:updated')?.({ transactionId: 'another:transaction' }))
    await act(async () => { await vi.advanceTimersByTimeAsync(401) })
    expect(requests).toHaveLength(authorizedReads)
    for (let index = 1; index <= 2; index += 1) {
      act(() => realtime.handlers.get('ai:transaction:updated')?.({ transactionId: eventId }))
      await act(async () => { await vi.advanceTimersByTimeAsync(401) })
      expect(requests).toHaveLength(authorizedReads + index)
    }
    expect(requests.every((request) => request.pathname.endsWith(encodeURIComponent(eventId)))).toBe(true)
  })

  it('keeps preview audit payloads visible while using the classified request total', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response({
      transaction: { ...transaction, callCount: 1 },
      // A missing marker on an older server remains a normal model call.
      calls: [calls[0], { ...calls[1], countsAsModelCall: false }],
    })))
    render(<AiTransactionDetailPanel transactionId={transaction.id} />)
    await screen.findByText('Asha Patel')
    expect(within(screen.getByRole('group', { name: 'AI requests' })).getByText('1')).toBeTruthy()
    expect(screen.getAllByText('Excluded from AI requests')).toHaveLength(1)
    expect(screen.getByText('Audit entry 2')).toBeTruthy()
    expect(screen.getByText('Call 1')).toBeTruthy()
    expect(screen.getByText('Illustrate the campaign.')).toBeTruthy()
  })

  it('shows prompts, nested calls and historical conversion without executing payload HTML', async () => {
    const user = userEvent.setup()
    render(<AiTransactionDetailPanel transactionId={transaction.id} />)
    await screen.findByText('Asha Patel')
    expect(screen.getByText('asha@example.test')).toBeTruthy()
    expect(screen.getByText('Content Pilot')).toBeTruthy()
    expect(screen.getByText('req_provider_1')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Call 1 · gpt-text' }).getAttribute('href')).toBe('#call-call_1')
    expect(screen.getByText(/Create a cab service campaign <script>/)).toBeTruthy()
    expect(document.querySelector('script')).toBeNull()
    expect(screen.getByText(/Your next ride starts here/)).toBeTruthy()
    expect(screen.getByText('Illustrate the campaign.')).toBeTruthy()
    expect(screen.getAllByText('Unpriced').length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: '₹ INR' }))
    expect(screen.getAllByText('₹1.6748').length).toBeGreaterThan(0)
    expect(screen.getByText('₹79.00')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'AI Transactions' }).getAttribute('href')).toBe('/ai-transactions?tab=transactions')
  })
})
