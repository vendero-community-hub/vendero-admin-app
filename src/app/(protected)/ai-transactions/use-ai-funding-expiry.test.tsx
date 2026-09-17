// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useAiFundingExpiry } from './use-ai-funding-expiry'

const funding = { calculatedAt: '2026-09-14T12:00:00.000Z', nextExpiryAt: '2026-09-14T12:02:00.000Z' }
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2030-01-01T00:00:00Z')) })
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks() })

it('refreshes once at the server deadline despite browser clock skew and never polls afterwards', async () => {
  const refresh = vi.fn()
  const { rerender } = renderHook(({ snapshot }) => useAiFundingExpiry(snapshot, true, refresh), { initialProps: { snapshot: funding } })
  await act(() => vi.advanceTimersByTimeAsync(120_000))
  expect(refresh).not.toHaveBeenCalled()
  await act(() => vi.advanceTimersByTimeAsync(100))
  expect(refresh).toHaveBeenCalledTimes(1)
  rerender({ snapshot: { ...funding, calculatedAt: '2026-09-14T12:01:00.000Z' } })
  await act(() => vi.advanceTimersByTimeAsync(60 * 60_000))
  expect(refresh).toHaveBeenCalledTimes(1)
})

it('replaces the pending deadline after a live wallet change and cancels it on disconnect/unmount', async () => {
  const refresh = vi.fn()
  const { rerender, unmount } = renderHook(({ snapshot, live }) => useAiFundingExpiry(snapshot, live, refresh), { initialProps: { snapshot: funding, live: true } })
  await act(() => vi.advanceTimersByTimeAsync(60_000))
  rerender({ snapshot: { ...funding, calculatedAt: '2026-09-14T12:01:00.000Z', nextExpiryAt: '2026-09-14T12:01:30.000Z' }, live: true })
  await act(() => vi.advanceTimersByTimeAsync(30_100))
  expect(refresh).toHaveBeenCalledTimes(1)
  rerender({ snapshot: funding, live: false })
  await act(() => vi.advanceTimersByTimeAsync(60 * 60_000))
  expect(refresh).toHaveBeenCalledTimes(1)
  rerender({ snapshot: funding, live: true })
  unmount()
  await act(() => vi.advanceTimersByTimeAsync(60 * 60_000))
  expect(refresh).toHaveBeenCalledTimes(1)
})

it('defers hidden-tab recovery to visibility events and ignores absent or invalid deadlines', async () => {
  const refresh = vi.fn()
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
  const { rerender } = renderHook(({ snapshot }) => useAiFundingExpiry(snapshot, true, refresh), { initialProps: { snapshot: funding } })
  await act(() => vi.advanceTimersByTimeAsync(120_100))
  expect(refresh).not.toHaveBeenCalled()
  rerender({ snapshot: { ...funding, nextExpiryAt: 'invalid' } })
  await act(() => vi.advanceTimersByTimeAsync(60 * 60_000))
  expect(refresh).not.toHaveBeenCalled()
})

it('waits for distant expiries without timeout overflow or intermediate API requests', async () => {
  const refresh = vi.fn()
  renderHook(() => useAiFundingExpiry({ ...funding, nextExpiryAt: '2026-11-13T12:00:00.000Z' }, true, refresh))
  await act(() => vi.advanceTimersByTimeAsync(59 * 24 * 60 * 60_000))
  expect(refresh).not.toHaveBeenCalled()
  await act(() => vi.advanceTimersByTimeAsync(24 * 60 * 60_000 + 100))
  expect(refresh).toHaveBeenCalledTimes(1)
})
