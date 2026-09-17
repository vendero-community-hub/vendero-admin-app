'use client'

import { useEffect, useRef } from 'react'
import type { AiFundingEstimate } from './ai-transactions-data'

const maxTimerDelay = 2_147_483_647

/** Refresh once at a known credit expiry, without checking the API on an interval. */
export function useAiFundingExpiry(
  funding: Pick<AiFundingEstimate, 'calculatedAt' | 'nextExpiryAt'> | undefined,
  live: boolean,
  refresh: () => unknown,
) {
  const lastExpired = useRef<string | null>(null)
  useEffect(() => {
    const expiry = funding?.nextExpiryAt
    if (!live || !expiry || lastExpired.current === expiry) return
    const delay = Date.parse(expiry) - Date.parse(funding.calculatedAt)
    if (!Number.isFinite(delay) || delay <= 0) return
    // Use the server's time difference so a skewed browser clock cannot cause
    // repeated early requests. A new snapshot replaces the pending deadline.
    const due = Date.now() + delay + 100
    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      timer = setTimeout(() => {
        if (Date.now() < due) { schedule(); return }
        lastExpired.current = expiry
        // Visibility/reconnection recovery already fetches the latest snapshot.
        if (!document.hidden) void refresh()
      }, Math.min(Math.max(due - Date.now(), 0), maxTimerDelay))
    }
    schedule()
    return () => clearTimeout(timer)
  }, [funding?.calculatedAt, funding?.nextExpiryAt, live, refresh])
}
