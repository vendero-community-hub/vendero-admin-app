'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const FEATURE_OPTIONS = [
  { key: 'trip_sharing', label: 'Trip sharing', aliases: ['trip_access', 'premium_trip_access', 'trip_share_basic'] },
  { key: 'availability_posting', label: 'Availability posting', aliases: ['availability_access'] },
  { key: 'chat_messaging', label: 'Chats', aliases: ['chats_access'] },
  { key: 'broadcast_messaging', label: 'Broadcast messaging', aliases: ['broadcast_unlimited'] },
  { key: 'crm_invoices', label: 'CRM invoices', aliases: ['crm_access'] },
  { key: 'marketplace_listings', label: 'Marketplace listings', aliases: ['marketplace_access', 'leads_access', 'marketplace_profile'] },
  { key: 'white_label_links', label: 'White Label links', aliases: ['white_label_access', 'website_access'] },
  { key: 'whatsapp_business_messaging', label: 'WhatsApp business messaging', aliases: ['wpilot_early_access'] },
  { key: 'wpilot_early_access', label: 'Vendero WPilot Early Access', comingSoon: true },
  { key: 'adspilot_early_access', label: 'Vendero AdsPilot Early Access', comingSoon: true },
]

function getAdminToken() {
  const tokenEntry = document.cookie
    .split('; ')
    .find((part) => part.startsWith('vendero_admin_access_token='))

  return tokenEntry?.split('=')[1] ?? null
}

async function requestJson(path: string, body?: Record<string, unknown>, method = 'POST') {
  const token = getAdminToken()
  let response: Response

  try {
    response = await fetch(path, {
      method,
      headers: {
        'content-type': 'application/json',
        authorization: token ? `Bearer ${token}` : '',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
  } catch {
    throw new Error('Unable to reach the admin API')
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload?.message ?? payload?.error?.message ?? 'Request failed')
  }

  return response.json().catch(() => ({}))
}

function gatewaySourceLabel(source?: string | null) {
  return source === 'db' ? 'DB + Redis' : 'empty'
}

type Plan = {
  id: number
  code: string
  name: string
  description?: string | null
  billingInterval: string
  durationDays: number | null
  priceAmount: string
  currency: string
  isActive: boolean
  isPublic: boolean
  isDefault: boolean
  requiresPaymentVerification: boolean
  featureConfig?: Record<string, unknown>
  features: Array<{
    id: number
    featureKey: string
    isEnabled: boolean
    limitValue: number | null
  }>
}

export type PaymentGatewaySummary = {
  provider: string
  selectedMode: 'test' | 'live'
  mode: 'test' | 'live'
  modeLabel: string
  checkout: {
    provider: string
    mode: 'test' | 'live'
    modeLabel: string
    keyId: string | null
    configured: boolean
    source: string | null
  }
  configs: Array<{
    provider: string
    mode: 'test' | 'live'
    modeLabel: string
    keyId: string | null
    configured: boolean
    keySecretConfigured: boolean
    webhookSecretConfigured: boolean
    isActive: boolean
    isDefault: boolean
    source: string | null
    updatedAt: string | null
  }>
}

function ModalShell({
  title,
  description,
  open,
  onClose,
  children,
}: {
  title: string
  description?: string
  open: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-4xl rounded-3xl border border-border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <p className="text-xl font-semibold">{title}</p>
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function buildFeatureState(plan?: Plan | null) {
  const enabledKeys = new Set(
    (plan?.features ?? []).filter((item) => item.isEnabled).map((item) => item.featureKey)
  )
  const hasAllAccess = plan?.featureConfig?.allAccess === true || plan?.featureConfig?.all_access === true

  return FEATURE_OPTIONS.reduce<Record<string, boolean>>((acc, feature) => {
    acc[feature.key] =
      hasAllAccess ||
      enabledKeys.has(feature.key) ||
      Boolean(feature.aliases?.some((alias) => enabledKeys.has(alias)))
    return acc
  }, {})
}

function buildFeaturePayload(featureState: Record<string, boolean>) {
  return FEATURE_OPTIONS.map((feature) => ({
    featureKey: feature.key,
    isEnabled: Boolean(featureState[feature.key]),
  }))
}

function FeatureSelector({
  featureState,
  onChange,
}: {
  featureState: Record<string, boolean>
  onChange: (key: string, checked: boolean) => void
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {FEATURE_OPTIONS.map((feature) => (
        <label
          key={feature.key}
          className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/40 px-3 py-3 text-sm"
        >
          <input
            type="checkbox"
            checked={Boolean(featureState[feature.key])}
            onChange={(event) => onChange(feature.key, event.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <span className="flex-1">{feature.label}</span>
          {feature.comingSoon ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
              Coming soon
            </span>
          ) : null}
        </label>
      ))}
    </div>
  )
}

export function CreatePlanButton() {
  const [open, setOpen] = useState(false)
  const [working, setWorking] = useState(false)
  const [code, setCode] = useState('premium_plus')
  const [name, setName] = useState('Premium Plus')
  const [description, setDescription] = useState('Premium plan with advanced vendor tools.')
  const [priceAmount, setPriceAmount] = useState('2499')
  const [durationDays, setDurationDays] = useState('30')
  const [billingInterval, setBillingInterval] = useState('monthly')
  const [freeTrialDays, setFreeTrialDays] = useState('7')
  const [isPublic, setIsPublic] = useState(true)
  const [isDefault, setIsDefault] = useState(false)
  const [requiresPaymentVerification, setRequiresPaymentVerification] = useState(true)
  const [featureState, setFeatureState] = useState<Record<string, boolean>>(() => buildFeatureState())

  async function createPlan() {
    setWorking(true)
    try {
      await requestJson('/api/v1/admin/subscriptions/plans', {
        code,
        name,
        description,
        billingInterval,
        priceAmount: Number(priceAmount || 0),
        durationDays: Number(durationDays || 30),
        isPublic,
        isDefault,
        requiresPaymentVerification,
        featureConfig: {
          freeTrialDays: Number(freeTrialDays || 7),
          trialEnabled: Number(freeTrialDays || 0) > 0,
        },
        features: buildFeaturePayload(featureState),
      })
      window.location.reload()
    } finally {
      setWorking(false)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Create plan</Button>
      <ModalShell
        title="Create subscription plan"
        description="Add plan details, free trial days, and feature access."
        open={open}
        onClose={() => setOpen(false)}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Plan code" />
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Plan name" />
          <Input
            value={priceAmount}
            onChange={(event) => setPriceAmount(event.target.value)}
            placeholder="Price in INR"
            type="number"
          />
          <Input
            value={durationDays}
            onChange={(event) => setDurationDays(event.target.value)}
            placeholder="Duration days"
            type="number"
          />
          <Input
            value={freeTrialDays}
            onChange={(event) => setFreeTrialDays(event.target.value)}
            placeholder="Free trial days"
            type="number"
          />
          <select
            value={billingInterval}
            onChange={(event) => setBillingInterval(event.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
            <option value="lifetime">Lifetime</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="mt-3 min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Plan description"
        />
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />
            Public
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} />
            Default plan
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={requiresPaymentVerification}
              onChange={(event) => setRequiresPaymentVerification(event.target.checked)}
            />
            Requires payment verification
          </label>
        </div>
        <div className="mt-4">
          <FeatureSelector
            featureState={featureState}
            onChange={(key, checked) => setFeatureState((current) => ({ ...current, [key]: checked }))}
          />
        </div>
        <div className="mt-5">
          <Button onClick={createPlan} disabled={working}>
            {working ? 'Creating...' : 'Create plan'}
          </Button>
        </div>
      </ModalShell>
    </>
  )
}

export function UpdatePlanButton({ plan }: { plan: Plan }) {
  const [working, setWorking] = useState(false)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(plan.name)
  const [description, setDescription] = useState(plan.description ?? '')
  const [priceAmount, setPriceAmount] = useState(String(plan.priceAmount))
  const [durationDays, setDurationDays] = useState(String(plan.durationDays ?? 30))
  const [freeTrialDays, setFreeTrialDays] = useState(
    String(Number(plan.featureConfig?.freeTrialDays ?? 7))
  )
  const [isActive, setIsActive] = useState(plan.isActive)
  const [isPublic, setIsPublic] = useState(plan.isPublic)
  const [isDefault, setIsDefault] = useState(plan.isDefault)
  const [requiresPaymentVerification, setRequiresPaymentVerification] = useState(plan.requiresPaymentVerification)
  const [featureState, setFeatureState] = useState<Record<string, boolean>>(() => buildFeatureState(plan))

  async function updatePlan() {
    setWorking(true)
    try {
      await requestJson(
        `/api/v1/admin/subscriptions/plans/${plan.id}`,
        {
          name,
          description,
          priceAmount: Number(priceAmount || 0),
          durationDays: Number(durationDays || 30),
          isActive,
          isPublic,
          isDefault,
          requiresPaymentVerification,
          featureConfig: {
            freeTrialDays: Number(freeTrialDays || 7),
            trialEnabled: Number(freeTrialDays || 0) > 0,
          },
          features: buildFeaturePayload(featureState),
        },
        'PUT'
      )
      window.location.reload()
    } finally {
      setWorking(false)
    }
  }

  async function deletePlan() {
    const confirmed = window.confirm('Delete this subscription plan?')
    if (!confirmed) return
    setWorking(true)
    try {
      await requestJson(`/api/v1/admin/subscriptions/plans/${plan.id}`, undefined, 'DELETE')
      window.location.reload()
    } finally {
      setWorking(false)
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <Button onClick={() => setOpen(true)} size="sm" variant="outline">
          Edit
        </Button>
        <Button onClick={deletePlan} size="sm" variant="outline" disabled={working}>
          Delete
        </Button>
      </div>
      <ModalShell
        title={`Edit ${plan.name}`}
        description="Update pricing, visibility, trial settings, and enabled features."
        open={open}
        onClose={() => setOpen(false)}
      >
        <div className="rounded-xl bg-background/40">
          <div className="grid gap-3 md:grid-cols-2">
            <Input value={name} onChange={(event) => setName(event.target.value)} />
            <Input value={priceAmount} onChange={(event) => setPriceAmount(event.target.value)} type="number" />
            <Input value={durationDays} onChange={(event) => setDurationDays(event.target.value)} type="number" />
            <Input value={freeTrialDays} onChange={(event) => setFreeTrialDays(event.target.value)} type="number" />
          </div>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="mt-3 min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
              Active
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />
              Public
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} />
              Default
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={requiresPaymentVerification}
                onChange={(event) => setRequiresPaymentVerification(event.target.checked)}
              />
              Requires payment verification
            </label>
          </div>
          <div className="mt-4">
            <FeatureSelector
              featureState={featureState}
              onChange={(key, checked) => setFeatureState((current) => ({ ...current, [key]: checked }))}
            />
          </div>
          <div className="mt-4">
            <Button onClick={updatePlan} disabled={working}>
              {working ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </div>
      </ModalShell>
    </>
  )
}

export function AssignPlanButton({ plans }: { plans: Plan[] }) {
  const [working, setWorking] = useState(false)
  const [vendorProfileId, setVendorProfileId] = useState('')
  const [subscriptionPlanId, setSubscriptionPlanId] = useState(String(plans[0]?.id ?? ''))
  const [paymentStatus, setPaymentStatus] = useState('pending_verification')

  async function assignPlan() {
    setWorking(true)
    try {
      await requestJson('/api/v1/admin/subscriptions/assign', {
        vendorProfileId: Number(vendorProfileId),
        subscriptionPlanId: Number(subscriptionPlanId),
        status: paymentStatus === 'verified' || paymentStatus === 'none' ? 'active' : 'inactive',
        paymentStatus,
      })
      window.location.reload()
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Input
        value={vendorProfileId}
        onChange={(event) => setVendorProfileId(event.target.value)}
        placeholder="Vendor profile id"
        className="w-40"
      />
      <select
        value={subscriptionPlanId}
        onChange={(event) => setSubscriptionPlanId(event.target.value)}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
      >
        {plans.map((plan) => (
          <option key={plan.id} value={plan.id}>
            {plan.name}
          </option>
        ))}
      </select>
      <select
        value={paymentStatus}
        onChange={(event) => setPaymentStatus(event.target.value)}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="none">none</option>
        <option value="pending_verification">pending_verification</option>
        <option value="verified">verified</option>
        <option value="rejected">rejected</option>
      </select>
      <Button onClick={assignPlan} variant="outline" disabled={working}>
        {working ? 'Assigning...' : 'Assign plan'}
      </Button>
    </div>
  )
}

export function CreatePaymentButton({ plans }: { plans: Plan[] }) {
  const [working, setWorking] = useState(false)
  const [vendorProfileId, setVendorProfileId] = useState('')
  const [subscriptionPlanId, setSubscriptionPlanId] = useState(String(plans[0]?.id ?? ''))
  const [amount, setAmount] = useState('1499')
  const [providerReference, setProviderReference] = useState('')

  async function createPayment() {
    setWorking(true)
    try {
      await requestJson('/api/v1/admin/subscriptions/payments', {
        vendorProfileId: Number(vendorProfileId),
        subscriptionPlanId: Number(subscriptionPlanId),
        amount: Number(amount),
        providerName: 'manual-admin',
        providerReference: providerReference || null,
        paymentMethod: 'manual_transfer',
      })
      window.location.reload()
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Input
        value={vendorProfileId}
        onChange={(event) => setVendorProfileId(event.target.value)}
        placeholder="Vendor profile id"
        className="w-40"
      />
      <select
        value={subscriptionPlanId}
        onChange={(event) => setSubscriptionPlanId(event.target.value)}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
      >
        {plans.map((plan) => (
          <option key={plan.id} value={plan.id}>
            {plan.name}
          </option>
        ))}
      </select>
      <Input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Amount" className="w-32" />
      <Input
        value={providerReference}
        onChange={(event) => setProviderReference(event.target.value)}
        placeholder="Reference"
        className="w-40"
      />
      <Button onClick={createPayment} variant="outline" disabled={working}>
        {working ? 'Creating...' : 'Add payment'}
      </Button>
    </div>
  )
}

export function VerifyPaymentButton({
  paymentId,
  decision,
}: {
  paymentId: number
  decision: 'verify' | 'reject'
}) {
  const [working, setWorking] = useState(false)

  async function verify() {
    const notes =
      window.prompt(
        decision === 'verify' ? 'Verification notes' : 'Rejection reason',
        decision === 'verify' ? 'Payment confirmed' : 'Payment proof mismatch'
      ) ?? ''

    setWorking(true)
    try {
      await requestJson(`/api/v1/admin/subscriptions/payments/${paymentId}/verify`, {
        decision,
        notes,
      })
      window.location.reload()
    } finally {
      setWorking(false)
    }
  }

  return (
    <Button
      onClick={verify}
      size="sm"
      variant={decision === 'verify' ? 'default' : 'outline'}
      disabled={working}
    >
      {working ? 'Saving...' : decision === 'verify' ? 'Verify' : 'Reject'}
    </Button>
  )
}

export function RunMaintenanceButton() {
  const [working, setWorking] = useState(false)

  async function run() {
    setWorking(true)
    try {
      await requestJson('/api/v1/admin/subscriptions/maintenance/run', {})
      window.location.reload()
    } finally {
      setWorking(false)
    }
  }

  return (
    <Button onClick={run} variant="outline" disabled={working}>
      {working ? 'Running...' : 'Run maintenance'}
    </Button>
  )
}

export function PaymentGatewaySettingsButton({
  summary,
}: {
  summary: PaymentGatewaySummary | null
}) {
  const initialMode = summary?.selectedMode ?? 'test'
  const [open, setOpen] = useState(false)
  const [working, setWorking] = useState(false)
  const [mode, setMode] = useState<'test' | 'live'>(initialMode)
  const [keyId, setKeyId] = useState('')
  const [keySecret, setKeySecret] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [makeDefault, setMakeDefault] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  const activeConfig = summary?.configs?.find((config) => config.mode === summary.selectedMode) ?? null
  const selectedConfig = summary?.configs?.find((config) => config.mode === mode) ?? null

  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  useEffect(() => {
    const config = summary?.configs?.find((item) => item.mode === mode)
    setKeyId(config?.keyId ?? '')
    setKeySecret('')
    setWebhookSecret('')
    setIsActive(config?.isActive ?? true)
    setMakeDefault(config?.isDefault ?? mode === summary?.selectedMode)
    setMessage(null)
  }, [mode, summary])

  async function saveConfig() {
    setWorking(true)
    setMessage(null)
    try {
      await requestJson(
        '/api/v1/admin/subscriptions/payment-gateway',
        {
          mode,
          keyId,
          keySecret: keySecret || null,
          webhookSecret: webhookSecret || null,
          isActive,
          makeDefault,
        },
        'PUT'
      )
      window.location.reload()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save gateway settings')
    } finally {
      setWorking(false)
    }
  }

  async function activateMode() {
    setWorking(true)
    setMessage(null)
    try {
      await requestJson('/api/v1/admin/subscriptions/payment-gateway/mode', { mode })
      window.location.reload()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to activate gateway mode')
    } finally {
      setWorking(false)
    }
  }

  async function deleteConfig() {
    const confirmed = window.confirm(
      `Delete Razorpay ${mode === 'live' ? 'Production' : 'Test'} keys?`
    )
    if (!confirmed) return

    setWorking(true)
    setMessage(null)
    try {
      await requestJson(`/api/v1/admin/subscriptions/payment-gateway/${mode}`, undefined, 'DELETE')
      window.location.reload()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to delete gateway settings')
    } finally {
      setWorking(false)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline">
        Payment gateway
      </Button>
      <ModalShell
        title="Payment gateway"
        description={`${summary?.modeLabel ?? 'Test'} mode is selected for Razorpay checkout.`}
        open={open}
        onClose={() => setOpen(false)}
      >
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border/70 bg-background/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Active mode</p>
              <p className="mt-2 text-lg font-semibold">{summary?.modeLabel ?? 'Test'}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Key id</p>
              <p className="mt-2 truncate text-sm font-medium">{activeConfig?.keyId ?? 'Not configured'}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Source</p>
              <p className="mt-2 text-sm font-medium">{gatewaySourceLabel(activeConfig?.source)}</p>
            </div>
          </div>

          <div className="inline-flex rounded-lg border border-border bg-background p-1">
            {(['test', 'live'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                  mode === item ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {item === 'live' ? 'Production' : 'Test'}
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              value={keyId}
              onChange={(event) => setKeyId(event.target.value)}
              placeholder="Razorpay key id"
            />
            <Input
              value={keySecret}
              onChange={(event) => setKeySecret(event.target.value)}
              placeholder={
                selectedConfig?.keySecretConfigured
                  ? 'Secret configured'
                  : 'Razorpay key secret'
              }
              type="password"
            />
            <Input
              value={webhookSecret}
              onChange={(event) => setWebhookSecret(event.target.value)}
              placeholder={
                selectedConfig?.webhookSecretConfigured
                  ? 'Webhook secret configured'
                  : 'Webhook secret'
              }
              type="password"
            />
            <div className="flex flex-wrap items-center gap-4 rounded-md border border-input bg-background px-3 py-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                />
                Active
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={makeDefault}
                  onChange={(event) => setMakeDefault(event.target.checked)}
                />
                Use for checkout
              </label>
            </div>
          </div>

          {message ? <p className="text-sm font-medium text-red-600">{message}</p> : null}

          <div className="flex flex-wrap gap-3">
            <Button onClick={saveConfig} disabled={working || !keyId.trim()}>
              {working ? 'Saving...' : 'Save keys'}
            </Button>
            <Button onClick={activateMode} variant="outline" disabled={working}>
              {working ? 'Activating...' : `Activate ${mode === 'live' ? 'Production' : 'Test'}`}
            </Button>
            <Button onClick={deleteConfig} variant="outline" disabled={working || !selectedConfig?.source}>
              {working ? 'Deleting...' : 'Delete keys'}
            </Button>
          </div>
        </div>
      </ModalShell>
    </>
  )
}

export function SubscriptionQuickActions({ plans }: { plans: Plan[] }) {
  const uniquePlans = useMemo(() => plans, [plans])

  return (
    <div className="flex flex-col gap-3">
      <AssignPlanButton plans={uniquePlans} />
      <CreatePaymentButton plans={uniquePlans} />
      <RunMaintenanceButton />
    </div>
  )
}
