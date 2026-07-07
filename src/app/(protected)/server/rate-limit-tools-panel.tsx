'use client'

import { useMemo, useState } from 'react'
import { RefreshCw, Search, ShieldX } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useActionModal } from '@/components/ui/action-modal'

type RateLimitEntry = {
  scope: 'otp_guard' | 'route_rate_limit'
  label: string
  key: string
  ttlSeconds: number
  value: string | null
  active: boolean
}

type RateLimitResult = {
  target: {
    phoneCandidates: string[]
    ipAddress: string | null
    roles: string[]
    purposes: string[]
  }
  activeCount: number
  deletedCount?: number
  beforeActiveCount?: number
  afterActiveCount?: number
  clearedKeys?: Array<{ label: string; key: string; ttlSeconds: number }>
  entries: RateLimitEntry[]
}

const ROLE_OPTIONS = [
  { value: 'vendor', label: 'Vendor' },
  { value: 'staff', label: 'Staff' },
  { value: 'admin', label: 'Admin' },
  { value: 'driver', label: 'Driver' },
  { value: 'customer', label: 'Customer' },
  { value: 'all', label: 'All roles' },
]

const PURPOSE_OPTIONS = [
  { value: 'login', label: 'Login' },
  { value: 'register', label: 'Register' },
  { value: 'reset', label: 'Reset' },
  { value: 'sensitive', label: 'Sensitive' },
  { value: 'all', label: 'All purposes' },
]

function unwrapPayload(payload: any) {
  return payload?.data?.data ?? payload?.data ?? payload
}

function getAdminToken() {
  return (
    document.cookie
      .split('; ')
      .find((part) => part.startsWith('vendero_admin_access_token='))
      ?.split('=')[1] ?? null
  )
}

async function requestJson(path: string, body?: Record<string, unknown>, method = 'GET') {
  const token = getAdminToken()
  const response = await fetch(path, {
    method,
    headers: {
      'content-type': 'application/json',
      authorization: token ? `Bearer ${token}` : '',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.message ?? payload?.error?.message ?? 'Request failed')
  return unwrapPayload(payload)
}

function ttlLabel(ttlSeconds: number) {
  if (ttlSeconds === -2) return 'not active'
  if (ttlSeconds === -1) return 'no expiry'
  if (ttlSeconds < 60) return `${ttlSeconds}s`
  const minutes = Math.floor(ttlSeconds / 60)
  const seconds = ttlSeconds % 60
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}

export function RateLimitToolsPanel() {
  const [phone, setPhone] = useState('')
  const [ipAddress, setIpAddress] = useState('')
  const [role, setRole] = useState('vendor')
  const [purpose, setPurpose] = useState('login')
  const [working, setWorking] = useState<'inspect' | 'clear' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RateLimitResult | null>(null)
  const actionModal = useActionModal()

  const activeEntries = useMemo(
    () => result?.entries.filter((entry) => entry.active) ?? [],
    [result]
  )

  function payload() {
    return {
      phone: phone.trim() || undefined,
      ipAddress: ipAddress.trim() || undefined,
      role,
      purpose,
    }
  }

  async function inspect() {
    setWorking('inspect')
    setError(null)
    try {
      const params = new URLSearchParams()
      const nextPayload = payload()
      Object.entries(nextPayload).forEach(([key, value]) => {
        if (value) params.set(key, String(value))
      })
      const nextResult = (await requestJson(
        `/api/v1/admin/rate-limits/auth?${params.toString()}`
      )) as RateLimitResult
      setResult(nextResult)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to inspect rate limits')
    } finally {
      setWorking(null)
    }
  }

  async function clear() {
    if (!phone.trim() && !ipAddress.trim()) {
      setError('Enter a phone number or IP address first.')
      return
    }

    const confirmed = await actionModal.confirm({
      title: 'Clear auth rate limits?',
      description: 'This removes active OTP and route-limit buckets for the selected phone or IP target.',
      confirmLabel: 'Clear limits',
      variant: 'danger',
    })
    if (!confirmed) return

    setWorking('clear')
    setError(null)
    try {
      const nextResult = (await requestJson(
        '/api/v1/admin/rate-limits/auth/clear',
        payload(),
        'POST'
      )) as RateLimitResult
      setResult(nextResult)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to clear rate limits')
    } finally {
      setWorking(null)
    }
  }

  return (
    <>
    <Card className="border-border/70 bg-card/80">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardDescription className="uppercase tracking-[0.2em] text-muted-foreground">
              Auth Control
            </CardDescription>
            <CardTitle className="mt-2 text-2xl">OTP rate-limit reset</CardTitle>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Clear the temporary OTP wait for a specific mobile number, IP address, or both.
            </p>
          </div>
          <Badge variant={activeEntries.length ? 'warning' : result ? 'success' : 'outline'}>
            {result ? `${activeEntries.length} active buckets` : 'Ready'}
          </Badge>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_0.7fr_0.7fr_auto]">
          <Input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Mobile number"
          />
          <Input
            value={ipAddress}
            onChange={(event) => setIpAddress(event.target.value)}
            placeholder="IP address"
          />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm"
            value={role}
            onChange={(event) => setRole(event.target.value)}
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm"
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
          >
            {PURPOSE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void inspect()} disabled={working !== null}>
              <Search className="h-4 w-4" />
              Check
            </Button>
            <Button onClick={() => void clear()} disabled={working !== null}>
              {working === 'clear' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldX className="h-4 w-4" />
              )}
              Clear
            </Button>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </div>
        ) : null}
      </CardHeader>

      {result ? (
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-border/70 bg-background/30 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Deleted</p>
              <p className="mt-2 text-2xl font-semibold">{result.deletedCount ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/30 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Before</p>
              <p className="mt-2 text-2xl font-semibold">
                {result.beforeActiveCount ?? result.activeCount}
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/30 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Now active</p>
              <p className="mt-2 text-2xl font-semibold">
                {result.afterActiveCount ?? result.activeCount}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border/70 bg-background/30 p-4">
            <div className="flex flex-wrap gap-2">
              {result.target.phoneCandidates.map((candidate) => (
                <Badge key={candidate} variant="outline">
                  phone {candidate}
                </Badge>
              ))}
              {result.target.ipAddress ? <Badge variant="outline">ip {result.target.ipAddress}</Badge> : null}
              <Badge variant="secondary">{result.target.roles.join(', ')}</Badge>
              <Badge variant="secondary">{result.target.purposes.join(', ')}</Badge>
            </div>
          </div>

          <div className="space-y-3">
            {activeEntries.map((entry) => (
              <div key={entry.key} className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">{entry.label}</p>
                    <p className="mt-1 break-all text-xs text-muted-foreground">{entry.key}</p>
                  </div>
                  <Badge variant="warning">{ttlLabel(entry.ttlSeconds)}</Badge>
                </div>
              </div>
            ))}
            {!activeEntries.length ? (
              <div className="rounded-lg border border-border/70 bg-background/30 p-4 text-sm text-muted-foreground">
                No active rate-limit buckets for this target.
              </div>
            ) : null}
          </div>
        </CardContent>
      ) : null}
    </Card>
    {actionModal.modal}
    </>
  )
}
