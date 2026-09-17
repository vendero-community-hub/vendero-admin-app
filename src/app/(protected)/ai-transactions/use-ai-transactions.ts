'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { APP_ENV, ENV_HEADERS, socketIoEndpoint } from '@/lib/environment'

function adminToken() {
  const value = document.cookie.split('; ').find((part) => part.startsWith('vendero_admin_access_token='))
  return value ? decodeURIComponent(value.slice(value.indexOf('=') + 1)) : null
}

export class AiRequestError extends Error {
  constructor(message: string, public status: number) { super(message); this.name = 'AiRequestError' }
}

export async function requestAiData<T>(path: string, signal: AbortSignal, options?: { method: 'POST'; body: unknown; idempotencyKey?: string }): Promise<T> {
  const token = adminToken()
  const response = await fetch(path, {
    cache: 'no-store', signal,
    ...(options ? { method: options.method, body: JSON.stringify(options.body) } : {}),
    headers: { ...ENV_HEADERS, authorization: token ? `Bearer ${token}` : '', ...(options ? { 'Content-Type': 'application/json' } : {}), ...(options?.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}) },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new AiRequestError(payload?.error?.message ?? payload?.message ?? 'AI transactions could not be loaded.', response.status)
  return (payload?.data?.data ?? payload?.data ?? payload) as T
}

export type AiLiveState = 'connecting' | 'live' | 'reconnecting' | 'unavailable'

export function useAiData<T>(load: (signal: AbortSignal) => Promise<T>, transactionId?: string) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(true)
  const [recovering, setRecovering] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [liveState, setLiveState] = useState<AiLiveState>('connecting')
  const mountedRef = useRef(false)
  const retryWatchRef = useRef<(() => Promise<void>) | null>(null)
  const requestRef = useRef<AbortController | null>(null)
  const queuedRefreshRef = useRef(false)
  const activeLoadRef = useRef(load)
  activeLoadRef.current = load

  const refresh = useCallback(async (): Promise<void> => {
    if (!mountedRef.current) return
    if (requestRef.current) {
      queuedRefreshRef.current = true
      return
    }
    const controller = new AbortController()
    requestRef.current = controller
    setRefreshing(true)
    try {
      const next = await activeLoadRef.current(controller.signal)
      if (controller.signal.aborted) return
      setData(next)
      setError(null)
      setUpdatedAt(new Date())
    } catch (caught) {
      if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'AI transactions could not be loaded.')
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null
        if (!controller.signal.aborted) {
          setRefreshing(false)
          if (queuedRefreshRef.current) {
            queuedRefreshRef.current = false
            void refresh()
          }
        }
      }
    }
  }, [])

  const manualRefresh = useCallback(async (): Promise<void> => {
    if (!mountedRef.current) return
    setRecovering(true)
    try {
      // Recover a transient authorization failure before reading, so updates
      // arriving during authorization are included in this single refresh.
      await retryWatchRef.current?.()
      if (mountedRef.current) await refresh()
    } finally {
      if (mountedRef.current) setRecovering(false)
    }
  }, [refresh])

  useEffect(() => {
    mountedRef.current = true
    requestRef.current?.abort()
    requestRef.current = null
    queuedRefreshRef.current = false
    setData(null)
    setError(null)
    void refresh()
    return () => {
      mountedRef.current = false
      requestRef.current?.abort()
      requestRef.current = null
      queuedRefreshRef.current = false
    }
  }, [load, refresh])

  useEffect(() => {
    let socket: Socket | null = null
    let changedTimer: ReturnType<typeof setTimeout> | undefined
    let watchTimer: ReturnType<typeof setTimeout> | undefined
    let transportConnected = false
    let subscribed = false
    let streamHealth: boolean | null = null
    let awaitingWatch = false
    let finishWatch: (() => void) | null = null
    let connectedBefore = false
    let closed = false
    let generation = 0
    let hidden = document.visibilityState === 'hidden'

    // A fixed window coalesces bursts without postponing refresh indefinitely.
    // refresh() retains at most one trailing read while another read is active.
    const scheduleRefresh = () => {
      if (closed || document.visibilityState === 'hidden' || changedTimer) return
      changedTimer = setTimeout(() => {
        changedTimer = undefined
        if (!closed && document.visibilityState !== 'hidden') void refresh()
      }, 400)
    }
    const change = () => { if (subscribed) scheduleRefresh() }
    const watch = (refreshOnAuthorization = true): Promise<void> => {
      if (closed || !socket || !transportConnected) return Promise.resolve()
      finishWatch?.()
      let resolveWatch!: () => void
      const pendingWatch = new Promise<void>((resolve) => { resolveWatch = resolve })
      finishWatch = resolveWatch
      awaitingWatch = true
      subscribed = false
      streamHealth = null
      const watchGeneration = ++generation
      clearTimeout(watchTimer)
      setLiveState(connectedBefore ? 'reconnecting' : 'connecting')
      connectedBefore = true
      watchTimer = setTimeout(() => {
        if (closed || watchGeneration !== generation) return
        generation += 1
        subscribed = false
        awaitingWatch = false
        finishWatch = null
        setLiveState('unavailable')
        resolveWatch()
      }, 8000)
      socket.emit('ai:transactions:watch', {}, (ack: { ok?: boolean; live?: boolean; error?: unknown } | undefined) => {
        if (closed || !transportConnected || watchGeneration !== generation) return
        clearTimeout(watchTimer)
        awaitingWatch = false
        finishWatch = null
        generation += 1
        subscribed = ack?.ok === true && !ack.error
        // Stream health can change after joining the room but before its ack
        // arrives. Keep that newer health signal after authorization succeeds.
        streamHealth = streamHealth ?? (ack?.live === true)
        setLiveState(subscribed && streamHealth ? 'live' : 'unavailable')
        if (subscribed && refreshOnAuthorization) scheduleRefresh()
        resolveWatch()
      })
      return pendingWatch
    }
    const disconnected = () => {
      if (closed) return
      generation += 1
      subscribed = false
      transportConnected = false
      streamHealth = null
      awaitingWatch = false
      finishWatch?.()
      finishWatch = null
      clearTimeout(watchTimer)
      clearTimeout(changedTimer)
      changedTimer = undefined
      setLiveState(socket?.active === false ? 'unavailable' : 'reconnecting')
    }
    retryWatchRef.current = () => transportConnected && !subscribed && !awaitingWatch ? watch(false) : Promise.resolve()
    const token = adminToken()
    if (token) {
      const endpoint = socketIoEndpoint()
      setLiveState('connecting')
      socket = io(endpoint.url, { path: endpoint.path, transports: ['websocket'], auth: { token, appEnv: APP_ENV } })
      socket.on('connect', () => {
        if (closed) return
        transportConnected = true
        void watch()
      })
      socket.on('disconnect', disconnected)
      socket.on('connect_error', disconnected)
      socket.on('ai:transactions:unavailable', () => {
        if (closed || !transportConnected) return
        streamHealth = false
        if (subscribed) setLiveState('unavailable')
      })
      socket.on('ai:transactions:resync', () => {
        if (closed || !transportConnected) return
        streamHealth = true
        if (subscribed) { setLiveState('live'); scheduleRefresh() }
      })
      socket.on('ai:balance:updated', change)
      socket.on('ai:transaction:updated', (event: { transactionId?: string }) => {
        if (!transactionId || event?.transactionId === transactionId) change()
      })
    } else setLiveState('unavailable')

    const onVisible = () => {
      const nextHidden = document.visibilityState === 'hidden'
      const recovered = hidden && !nextHidden
      hidden = nextHidden
      if (!recovered || closed) return
      // Reconcile missed events once when returning to the page. A failed watch
      // can be authorized again here without any recurring API polling.
      if (transportConnected && !subscribed && !awaitingWatch) {
        // Read after the room is authorized, including changes made while
        // the access check was pending. Cleanup fences the deferred read.
        void watch(false).then(() => { if (!closed) scheduleRefresh() })
        return
      }
      scheduleRefresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      closed = true
      generation += 1
      subscribed = false
      transportConnected = false
      awaitingWatch = false
      retryWatchRef.current = null
      finishWatch?.()
      finishWatch = null
      socket?.removeAllListeners()
      socket?.disconnect()
      clearTimeout(changedTimer)
      clearTimeout(watchTimer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh, transactionId])

  return { data, error, refreshing: refreshing || recovering, updatedAt, liveState, refresh: manualRefresh }
}

export function useAiCurrency() {
  const [currency, setCurrencyState] = useState<'USD' | 'INR'>('USD')
  useEffect(() => {
    try { if (localStorage.getItem('ai-transactions-currency') === 'INR') setCurrencyState('INR') } catch { /* Storage can be disabled in private browsers. */ }
  }, [])
  const setCurrency = (next: 'USD' | 'INR') => {
    setCurrencyState(next)
    try { localStorage.setItem('ai-transactions-currency', next) } catch { /* The current page still uses the selected currency. */ }
  }
  return { currency, setCurrency }
}
