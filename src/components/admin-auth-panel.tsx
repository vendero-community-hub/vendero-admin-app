'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { APP_ENV, ENV_HEADERS } from '@/lib/environment'
import { AdminLogoutButton } from '@/components/admin-session-actions'

type Stage = 'request' | 'verify'

const VENDERO_LOGO_URL =
  'https://pub-62b8d9a00e0749d5a58a987a7c20cebc.r2.dev/app/assets/logo-white.svg'
const SHOW_DEV_OTP = APP_ENV === 'dev'

function formatCooldown(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

function unwrapPayload(payload: any) {
  return payload?.data?.data ?? payload?.data ?? payload
}

export function AdminAuthPanel() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [stage, setStage] = useState<Stage>('request')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0)
  const [hasActiveSession, setHasActiveSession] = useState(false)
  const trimmedPhone = useMemo(() => phone.trim(), [phone])
  const isCooldownActive = retryAfterSeconds > 0

  useEffect(() => {
    setHasActiveSession(
      document.cookie
        .split('; ')
        .some((part) => part.startsWith('vendero_admin_access_token='))
    )
  }, [])

  useEffect(() => {
    if (!retryAfterSeconds) {
      return
    }

    const interval = window.setInterval(() => {
      setRetryAfterSeconds((current) => (current > 1 ? current - 1 : 0))
    }, 1000)

    return () => window.clearInterval(interval)
  }, [retryAfterSeconds])

  async function requestOtp() {
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch('/api/v1/auth/otp/request', {
        method: 'POST',
        headers: { ...ENV_HEADERS, 'content-type': 'application/json' },
        body: JSON.stringify({
          phone: trimmedPhone,
          role: 'staff',
          purpose: 'login',
        }),
      })

      const payload = await response.json()
      const data = unwrapPayload(payload)

      if (!response.ok) {
        setRetryAfterSeconds(
          typeof data.retryAfterSeconds === 'number'
            ? data.retryAfterSeconds
            : typeof payload.retryAfterSeconds === 'number'
              ? payload.retryAfterSeconds
              : 0
        )
        throw new Error(data?.message ?? payload?.message ?? payload?.error?.message ?? 'Unable to request OTP')
      }

      setRetryAfterSeconds(0)
      setStage('verify')
      setMessage(
        SHOW_DEV_OTP && data.devOtpCode
          ? `OTP sent. Dev code: ${data.devOtpCode}`
          : 'OTP sent to the registered staff number.'
      )
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to request OTP')
    } finally {
      setLoading(false)
    }
  }

  async function verifyOtp() {
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch('/api/v1/auth/otp/verify', {
        method: 'POST',
        headers: {
          ...ENV_HEADERS,
          'content-type': 'application/json',
          'x-device-label': 'Admin Web Portal',
          'x-device-platform': 'web',
        },
        body: JSON.stringify({
          phone: trimmedPhone,
          role: 'staff',
          purpose: 'login',
          code: code.trim(),
          deviceLabel: 'Admin Web Portal',
          platform: 'web',
        }),
      })

      const payload = await response.json()
      const data = unwrapPayload(payload)

      if (!response.ok) {
        throw new Error(data?.message ?? payload?.message ?? payload?.error?.message ?? 'Unable to verify OTP')
      }

      if (data.nextStep !== 'login' || !data.token || !data.refreshToken || !data.session?.id) {
        throw new Error(data.message ?? 'This staff account is not ready for admin login yet')
      }

      document.cookie = `vendero_admin_access_token=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`
      document.cookie = `vendero_admin_refresh_token=${data.refreshToken}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`
      document.cookie = `vendero_admin_session_id=${data.session.id}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`

      const nextPath = searchParams.get('next') || '/'
      router.push(nextPath)
      router.refresh()
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Unable to verify OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-border/70 bg-card/85">
      <CardHeader className="space-y-3">
        <div className="mb-2 flex items-center gap-3">
          <img src={VENDERO_LOGO_URL} alt="Vendero" className="h-10 w-auto shrink-0" />
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/80">Vendero</p>
            <p className="text-sm font-medium text-white">Admin Login</p>
          </div>
        </div>
        <Badge variant="outline" className="w-fit rounded-full border-primary/25 bg-primary/10 px-3 py-1 text-primary">
          Staff Access
        </Badge>
        <CardTitle className="text-3xl leading-tight">Secure admin OTP sign in.</CardTitle>
        <CardDescription className="max-w-xl text-sm leading-7 text-muted-foreground">
          Vendero staff uses single-device OTP authentication. Sign in here to unlock server
          telemetry, vendor approvals, and operations screens.
        </CardDescription>
        {hasActiveSession ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/35 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Active admin session</p>
              <p className="text-xs text-muted-foreground">Logout before signing in with another staff account.</p>
            </div>
            <AdminLogoutButton />
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4 rounded-2xl border border-border/70 bg-background/30 p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Staff phone number</label>
            <Input
              placeholder="+91 9876543210"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>

          {stage === 'verify' ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">OTP code</label>
              <Input
                placeholder="6-digit OTP"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </div>
          ) : null}

          {message ? (
            <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              {message}
            </p>
          ) : null}

          {error ? (
            <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </p>
          ) : null}

          {isCooldownActive ? (
            <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Please wait {formatCooldown(retryAfterSeconds)} before requesting OTP again.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            {stage === 'request' ? (
              <Button
                className="rounded-xl"
                disabled={!trimmedPhone || loading || isCooldownActive}
                onClick={requestOtp}
              >
                <KeyRound className="mr-2 h-4 w-4" />
                {loading
                  ? 'Sending OTP...'
                  : isCooldownActive
                    ? `Retry in ${formatCooldown(retryAfterSeconds)}`
                    : 'Request OTP'}
              </Button>
            ) : (
              <>
                <Button
                  className="rounded-xl"
                  disabled={!trimmedPhone || code.trim().length !== 6 || loading}
                  onClick={verifyOtp}
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  {loading ? 'Verifying...' : 'Verify and enter'}
                </Button>
                <Button
                  className="rounded-xl"
                  variant="secondary"
                  disabled={loading || isCooldownActive}
                  onClick={() => {
                    setStage('request')
                    setCode('')
                    setMessage(null)
                    setError(null)
                  }}
                >
                  {isCooldownActive ? `Retry in ${formatCooldown(retryAfterSeconds)}` : 'Request new OTP'}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
