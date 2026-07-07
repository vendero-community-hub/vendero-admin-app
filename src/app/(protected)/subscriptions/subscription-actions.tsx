'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useActionModal } from '@/components/ui/action-modal'

const FEATURE_OPTIONS = [
  { key: 'trip_sharing', label: 'Trip sharing', aliases: ['trip_access', 'trip_share_basic'] },
  { key: 'premium_trip_access', label: 'Access premium trip', aliases: ['premium_preview_trips', 'premium_only_trips'] },
  { key: 'vendero_trips', label: 'Vendero trips', aliases: ['vendero_trip_access', 'vendero_cab_trips'] },
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

function formatOtpCooldown(seconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(Number(seconds) || 0))
  const minutes = Math.floor(totalSeconds / 60)
  const remainingSeconds = totalSeconds % 60

  if (minutes <= 0) {
    return `${remainingSeconds}s`
  }

  return `${minutes}m ${String(remainingSeconds).padStart(2, '0')}s`
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
    const error = new Error(payload?.message ?? payload?.error?.message ?? 'Request failed') as Error & {
      retryAfterSeconds?: number
    }
    const retryAfterSeconds = Number(
      payload?.retryAfterSeconds ?? payload?.error?.retryAfterSeconds ?? payload?.data?.retryAfterSeconds
    )
    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
      error.retryAfterSeconds = Math.ceil(retryAfterSeconds)
    }
    throw error
  }

  return response.json().catch(() => ({}))
}

function gatewaySourceLabel(source?: string | null) {
  return source === 'db' ? 'DB + Redis' : 'empty'
}

function extractApiData<T>(payload: unknown): T {
  const record = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
  const data = record.data && typeof record.data === 'object' ? (record.data as Record<string, unknown>) : null
  return ((data?.data ?? record.data ?? payload) as T)
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
  pricingOptions?: Array<{
    id: string
    label: string
    periodType: 'month' | 'day'
    periodValue: number
    priceAmount: number
    currency: string
    isDefault?: boolean
    displayOrder?: number
  }>
  features: Array<{
    id: number
    featureKey: string
    isEnabled: boolean
    limitValue: number | null
  }>
}

type PricingDraft = {
  id: string
  label: string
  periodType: 'month' | 'day'
  periodValue: string
  priceAmount: string
  isDefault: boolean
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
    maskedKeyId?: string | null
    keyIdRevealed?: boolean
    configured: boolean
    source: string | null
  }
  configs: Array<{
    provider: string
    mode: 'test' | 'live'
    modeLabel: string
    keyId: string | null
    maskedKeyId?: string | null
    keyIdRevealed?: boolean
    keySecret?: string | null
    keySecretRevealed?: boolean
    webhookSecret?: string | null
    webhookSecretRevealed?: boolean
    configured: boolean
    keySecretConfigured: boolean
    webhookSecretConfigured: boolean
    isActive: boolean
    isDefault: boolean
    source: string | null
    updatedAt: string | null
  }>
}

type PaymentGatewayOtpAction =
  | 'reveal_gateway_keys'
  | 'save_gateway_keys'
  | 'activate_gateway_mode'
  | 'delete_gateway_keys'

const PAYMENT_GATEWAY_OTP_ACTION_LABELS: Record<PaymentGatewayOtpAction, string> = {
  reveal_gateway_keys: 'view active key',
  save_gateway_keys: 'save key changes',
  activate_gateway_mode: 'change checkout mode',
  delete_gateway_keys: 'delete keys',
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

function buildTrialFeatureState(plan?: Plan | null) {
  const config = plan?.featureConfig ?? {}
  const trialKeys = Array.isArray(config.trialFeatureKeys)
    ? new Set(config.trialFeatureKeys.map((item) => String(item)))
    : null
  const trialConfig =
    config.trialFeatures && typeof config.trialFeatures === 'object' && !Array.isArray(config.trialFeatures)
      ? (config.trialFeatures as Record<string, unknown>)
      : null

  if (!trialKeys && !trialConfig) {
    return buildFeatureState(plan)
  }

  return FEATURE_OPTIONS.reduce<Record<string, boolean>>((acc, feature) => {
    acc[feature.key] =
      Boolean(trialKeys?.has(feature.key)) ||
      Boolean(feature.aliases?.some((alias) => trialKeys?.has(alias))) ||
      trialConfig?.[feature.key] === true ||
      Boolean(feature.aliases?.some((alias) => trialConfig?.[alias] === true))
    return acc
  }, {})
}

function enabledFeatureKeys(featureState: Record<string, boolean>) {
  return FEATURE_OPTIONS.filter((feature) => featureState[feature.key]).map((feature) => feature.key)
}

function slugFromName(name: string) {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'subscription_plan'
  )
}

function pricingLabel(option: PricingDraft) {
  const value = Number(option.periodValue || 0)
  const unit = option.periodType === 'month' ? (value === 1 ? 'month' : 'months') : value === 1 ? 'day' : 'days'
  return option.label.trim() || `${value || 1} ${unit}`
}

function defaultPricingDraft(): PricingDraft[] {
  return [
    {
      id: `price-${Date.now()}`,
      label: '1 month',
      periodType: 'month',
      periodValue: '1',
      priceAmount: '249',
      isDefault: true,
    },
  ]
}

function pricingDraftsFromPlan(plan?: Plan | null): PricingDraft[] {
  const configured: Array<Record<string, unknown>> = Array.isArray(plan?.pricingOptions)
    ? (plan?.pricingOptions as Array<Record<string, unknown>>)
    : Array.isArray(plan?.featureConfig?.pricingOptions)
      ? (plan?.featureConfig?.pricingOptions as Array<Record<string, unknown>>)
      : []

  const rows = configured
    .map((option, index) => ({
      id: String(option.id ?? `price-${index + 1}`),
      label: String(option.label ?? ''),
      periodType: String(option.periodType ?? 'month') === 'day' ? 'day' : ('month' as 'month' | 'day'),
      periodValue: String(option.periodValue ?? option.months ?? option.days ?? 1),
      priceAmount: String(option.priceAmount ?? option.amount ?? option.price ?? plan?.priceAmount ?? 0),
      isDefault: option.isDefault === true || option.default === true,
    }))
    .filter((option) => Number(option.periodValue) > 0 && Number(option.priceAmount) >= 0)

  if (!rows.length && plan) {
    rows.push({
      id: 'default',
      label: plan.durationDays ? `${plan.durationDays} days` : '1 month',
      periodType: plan.durationDays ? 'day' : 'month',
      periodValue: String(plan.durationDays ?? 1),
      priceAmount: String(plan.priceAmount ?? 0),
      isDefault: true,
    })
  }

  if (!rows.length) return defaultPricingDraft()
  if (!rows.some((option) => option.isDefault)) rows[0].isDefault = true
  return rows
}

function pricingOptionsPayload(rows: PricingDraft[]) {
  const normalized = rows
    .map((option, index) => ({
      id: option.id || `price-${index + 1}`,
      label: pricingLabel(option),
      periodType: option.periodType,
      periodValue: Math.max(1, Math.round(Number(option.periodValue || 1))),
      priceAmount: Math.max(0, Number(option.priceAmount || 0)),
      isDefault: option.isDefault,
      displayOrder: index,
    }))
    .filter((option) => option.periodValue > 0)

  if (!normalized.some((option) => option.isDefault) && normalized[0]) normalized[0].isDefault = true
  return normalized
}

function planPricingFields(rows: PricingDraft[]) {
  const options = pricingOptionsPayload(rows)
  const defaultOption = options.find((option) => option.isDefault) ?? options[0]
  const monthValue = defaultOption?.periodType === 'month' ? defaultOption.periodValue : 0
  return {
    billingInterval:
      monthValue === 1
        ? 'monthly'
        : monthValue === 3
          ? 'quarterly'
          : monthValue === 12
            ? 'yearly'
            : 'custom',
    durationDays: defaultOption?.periodType === 'day' ? defaultOption.periodValue : null,
    priceAmount: defaultOption?.priceAmount ?? 0,
    pricingOptions: options,
  }
}

function configNumber(config: Record<string, unknown> | undefined, key: string, fallback = 0) {
  const value = Number(config?.[key] ?? fallback)
  return Number.isFinite(value) ? value : fallback
}

function configBoolean(config: Record<string, unknown> | undefined, key: string, fallback = false) {
  const value = config?.[key]
  return typeof value === 'boolean' ? value : fallback
}

function configString(config: Record<string, unknown> | undefined, key: string, fallback = '') {
  const value = config?.[key]
  return typeof value === 'string' ? value : fallback
}

function buildBillingFeatureConfig(
  existingConfig: Record<string, unknown> | undefined,
  values: {
    trialEnabled: boolean
    freeTrialDays: string
    trialPaymentTiming: string
    trialFeatureKeys: string[]
    upfrontPricingEnabled: boolean
    firstPaymentAmount: string
    firstPaymentCycles: string
    firstPaymentCollectionMode: string
    pricingOptions: ReturnType<typeof pricingOptionsPayload>
  }
) {
  const trialDays = values.trialEnabled ? Number(values.freeTrialDays || 0) : 0
  const firstPaymentAmount = values.upfrontPricingEnabled ? Number(values.firstPaymentAmount || 0) : 0
  const firstPaymentCycles = values.upfrontPricingEnabled ? Number(values.firstPaymentCycles || 0) : 0

  return {
    ...(existingConfig ?? {}),
    freeTrialDays: Number.isFinite(trialDays) ? trialDays : 0,
    trialEnabled: values.trialEnabled,
    trialPaymentTiming: values.trialPaymentTiming,
    trialFeatureKeys: values.trialEnabled ? values.trialFeatureKeys : [],
    upfrontPricingEnabled: values.upfrontPricingEnabled,
    firstPaymentAmount: Number.isFinite(firstPaymentAmount) ? firstPaymentAmount : 0,
    firstPaymentCycles: Number.isFinite(firstPaymentCycles) ? firstPaymentCycles : 0,
    firstPaymentCollectionMode: values.firstPaymentCollectionMode,
    pricingOptions: values.pricingOptions,
  }
}

function BillingPolicyFields({
  trialEnabled,
  freeTrialDays,
  trialPaymentTiming,
  firstPaymentAmount,
  firstPaymentCycles,
  firstPaymentCollectionMode,
  onTrialEnabledChange,
  onFreeTrialDaysChange,
  onTrialPaymentTimingChange,
  onFirstPaymentAmountChange,
  onFirstPaymentCyclesChange,
  onFirstPaymentCollectionModeChange,
}: {
  trialEnabled: boolean
  freeTrialDays: string
  trialPaymentTiming: string
  firstPaymentAmount: string
  firstPaymentCycles: string
  firstPaymentCollectionMode: string
  onTrialEnabledChange: (value: boolean) => void
  onFreeTrialDaysChange: (value: string) => void
  onTrialPaymentTimingChange: (value: string) => void
  onFirstPaymentAmountChange: (value: string) => void
  onFirstPaymentCyclesChange: (value: string) => void
  onFirstPaymentCollectionModeChange: (value: string) => void
}) {
  return (
    <div className="mt-4 rounded-2xl border border-border/70 bg-background/35 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Billing offer controls</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Set the first payment amount, how long that amount covers, and whether checkout happens before or after a free trial.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={trialEnabled}
            onChange={(event) => onTrialEnabledChange(event.target.checked)}
          />
          Free trial active
        </label>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Free trial days</span>
          <Input
            value={freeTrialDays}
            onChange={(event) => onFreeTrialDaysChange(event.target.value)}
            type="number"
            min="0"
            disabled={!trialEnabled}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">First payment timing</span>
          <select
            value={trialPaymentTiming}
            onChange={(event) => onTrialPaymentTimingChange(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            disabled={!trialEnabled}
          >
            <option value="before_trial">Take first payment before free trial</option>
            <option value="after_trial">Take first payment after free trial</option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Upfront amount per month / cycle</span>
          <Input
            value={firstPaymentAmount}
            onChange={(event) => onFirstPaymentAmountChange(event.target.value)}
            placeholder="49"
            type="number"
            min="0"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">First payment cycles / months</span>
          <Input
            value={firstPaymentCycles}
            onChange={(event) => onFirstPaymentCyclesChange(event.target.value)}
            placeholder="3"
            type="number"
            min="0"
          />
        </label>
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="text-muted-foreground">Collection mode</span>
          <select
            value={firstPaymentCollectionMode}
            onChange={(event) => onFirstPaymentCollectionModeChange(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="upfront_total">Take all offer months upfront</option>
            <option value="per_cycle">Take one offer month at a time</option>
          </select>
        </label>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        Example: monthly ₹249 with upfront amount ₹50 for 3 months charges ₹150 upfront when “all offer months” is selected.
      </p>
    </div>
  )
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

const PLAN_STEPS = ['Subscription Detail', 'Features', 'Plan Pricing'] as const

function StepTabs({ step, onStepChange }: { step: number; onStepChange: (step: number) => void }) {
  return (
    <div className="mb-5 grid gap-2 md:grid-cols-3">
      {PLAN_STEPS.map((label, index) => (
        <button
          key={label}
          type="button"
          onClick={() => onStepChange(index)}
          className={`rounded-xl border px-3 py-3 text-left text-sm font-semibold ${
            step === index
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border/70 bg-background/40 text-muted-foreground'
          }`}
        >
          <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-background text-xs">
            {index + 1}
          </span>
          {label}
        </button>
      ))}
    </div>
  )
}

function DetailStep({
  name,
  description,
  trialEnabled,
  freeTrialDays,
  isActive,
  isPublic,
  isDefault,
  requiresPaymentVerification,
  onNameChange,
  onDescriptionChange,
  onTrialEnabledChange,
  onFreeTrialDaysChange,
  onIsActiveChange,
  onIsPublicChange,
  onIsDefaultChange,
  onRequiresPaymentVerificationChange,
  showActive,
}: {
  name: string
  description: string
  trialEnabled: boolean
  freeTrialDays: string
  isActive?: boolean
  isPublic: boolean
  isDefault: boolean
  requiresPaymentVerification: boolean
  onNameChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onTrialEnabledChange: (value: boolean) => void
  onFreeTrialDaysChange: (value: string) => void
  onIsActiveChange?: (value: boolean) => void
  onIsPublicChange: (value: boolean) => void
  onIsDefaultChange: (value: boolean) => void
  onRequiresPaymentVerificationChange: (value: boolean) => void
  showActive?: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Plan name</span>
          <Input value={name} onChange={(event) => onNameChange(event.target.value)} placeholder="Premium Plus" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Free trial days</span>
          <Input
            value={freeTrialDays}
            onChange={(event) => onFreeTrialDaysChange(event.target.value)}
            type="number"
            min="0"
            disabled={!trialEnabled}
          />
        </label>
      </div>
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">Description</span>
        <textarea
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Describe who this plan is for."
        />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/40 px-4 py-3 text-sm font-medium">
          <span>Free trial</span>
          <input
            type="checkbox"
            checked={trialEnabled}
            onChange={(event) => onTrialEnabledChange(event.target.checked)}
          />
        </label>
        {showActive ? (
          <label className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/40 px-4 py-3 text-sm font-medium">
            <span>Active</span>
            <input
              type="checkbox"
              checked={Boolean(isActive)}
              onChange={(event) => onIsActiveChange?.(event.target.checked)}
            />
          </label>
        ) : null}
        <label className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/40 px-4 py-3 text-sm font-medium">
          <span>Public</span>
          <input type="checkbox" checked={isPublic} onChange={(event) => onIsPublicChange(event.target.checked)} />
        </label>
        <label className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/40 px-4 py-3 text-sm font-medium">
          <span>Default plan</span>
          <input type="checkbox" checked={isDefault} onChange={(event) => onIsDefaultChange(event.target.checked)} />
        </label>
        <label className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/40 px-4 py-3 text-sm font-medium md:col-span-2">
          <span>Requires payment verification</span>
          <input
            type="checkbox"
            checked={requiresPaymentVerification}
            onChange={(event) => onRequiresPaymentVerificationChange(event.target.checked)}
          />
        </label>
      </div>
    </div>
  )
}

function FeatureWizardStep({
  trialEnabled,
  activeTab,
  onActiveTabChange,
  trialFeatureState,
  planFeatureState,
  onTrialFeatureChange,
  onPlanFeatureChange,
}: {
  trialEnabled: boolean
  activeTab: 'trial' | 'plan'
  onActiveTabChange: (tab: 'trial' | 'plan') => void
  trialFeatureState: Record<string, boolean>
  planFeatureState: Record<string, boolean>
  onTrialFeatureChange: (key: string, checked: boolean) => void
  onPlanFeatureChange: (key: string, checked: boolean) => void
}) {
  const currentState = trialEnabled && activeTab === 'trial' ? trialFeatureState : planFeatureState
  const currentChange = trialEnabled && activeTab === 'trial' ? onTrialFeatureChange : onPlanFeatureChange

  return (
    <div>
      {trialEnabled ? (
        <div className="mb-4 inline-flex rounded-xl border border-border/70 bg-background/40 p-1 text-sm">
          <button
            type="button"
            onClick={() => onActiveTabChange('trial')}
            className={`rounded-lg px-4 py-2 font-semibold ${activeTab === 'trial' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
          >
            Free trial features
          </button>
          <button
            type="button"
            onClick={() => onActiveTabChange('plan')}
            className={`rounded-lg px-4 py-2 font-semibold ${activeTab === 'plan' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
          >
            Active subscription features
          </button>
        </div>
      ) : null}
      <FeatureSelector featureState={currentState} onChange={currentChange} />
    </div>
  )
}

function PricingManagementStep({
  upfrontPricingEnabled,
  firstPaymentAmount,
  firstPaymentCycles,
  firstPaymentCollectionMode,
  pricingRows,
  onUpfrontPricingEnabledChange,
  onFirstPaymentAmountChange,
  onFirstPaymentCyclesChange,
  onFirstPaymentCollectionModeChange,
  onPricingRowsChange,
}: {
  upfrontPricingEnabled: boolean
  firstPaymentAmount: string
  firstPaymentCycles: string
  firstPaymentCollectionMode: string
  pricingRows: PricingDraft[]
  onUpfrontPricingEnabledChange: (value: boolean) => void
  onFirstPaymentAmountChange: (value: string) => void
  onFirstPaymentCyclesChange: (value: string) => void
  onFirstPaymentCollectionModeChange: (value: string) => void
  onPricingRowsChange: (rows: PricingDraft[]) => void
}) {
  function updateRow(index: number, patch: Partial<PricingDraft>) {
    onPricingRowsChange(pricingRows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)))
  }

  function makeDefault(index: number) {
    onPricingRowsChange(pricingRows.map((row, rowIndex) => ({ ...row, isDefault: rowIndex === index })))
  }

  function addPrice() {
    onPricingRowsChange([
      ...pricingRows,
      {
        id: `price-${Date.now()}`,
        label: '',
        periodType: 'month',
        periodValue: '1',
        priceAmount: '0',
        isDefault: pricingRows.length === 0,
      },
    ])
  }

  function removePrice(index: number) {
    const nextRows = pricingRows.filter((_row, rowIndex) => rowIndex !== index)
    if (nextRows.length && !nextRows.some((row) => row.isDefault)) nextRows[0].isDefault = true
    onPricingRowsChange(nextRows.length ? nextRows : defaultPricingDraft())
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/70 bg-background/35 p-4">
        <label className="flex items-center justify-between gap-3 text-sm font-semibold">
          <span>Upfront pricing</span>
          <input
            type="checkbox"
            checked={upfrontPricingEnabled}
            onChange={(event) => onUpfrontPricingEnabledChange(event.target.checked)}
          />
        </label>
        {upfrontPricingEnabled ? (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Upfront amount</span>
              <Input value={firstPaymentAmount} onChange={(event) => onFirstPaymentAmountChange(event.target.value)} type="number" min="0" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Months/cycles covered</span>
              <Input value={firstPaymentCycles} onChange={(event) => onFirstPaymentCyclesChange(event.target.value)} type="number" min="0" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Collection mode</span>
              <select
                value={firstPaymentCollectionMode}
                onChange={(event) => onFirstPaymentCollectionModeChange(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="upfront_total">Take all upfront</option>
                <option value="per_cycle">Take one month/cycle at a time</option>
              </select>
            </label>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border/70 bg-background/35 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">Plan prices</p>
          <Button type="button" variant="outline" onClick={addPrice}>
            Add price
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {pricingRows.map((row, index) => (
            <div key={row.id} className="grid gap-3 rounded-xl border border-border/70 bg-background/40 p-3 md:grid-cols-[1fr_150px_150px_150px_auto]">
              <Input value={row.label} onChange={(event) => updateRow(index, { label: event.target.value })} placeholder="Label e.g. 3 months" />
              <select
                value={row.periodType}
                onChange={(event) => updateRow(index, { periodType: event.target.value === 'day' ? 'day' : 'month' })}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="month">Month wise</option>
                <option value="day">Day wise</option>
              </select>
              <Input
                value={row.periodValue}
                onChange={(event) => updateRow(index, { periodValue: event.target.value })}
                type="number"
                min="1"
                placeholder={row.periodType === 'month' ? 'Months' : 'Days'}
              />
              <Input value={row.priceAmount} onChange={(event) => updateRow(index, { priceAmount: event.target.value })} type="number" min="0" placeholder="Price" />
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                  <input type="radio" checked={row.isDefault} onChange={() => makeDefault(index)} />
                  Default
                </label>
                <Button type="button" variant="outline" onClick={() => removePrice(index)}>
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function CreatePlanButton() {
  const [open, setOpen] = useState(false)
  const [working, setWorking] = useState(false)
  const [step, setStep] = useState(0)
  const [name, setName] = useState('Premium Plus')
  const [description, setDescription] = useState('Premium plan with advanced vendor tools.')
  const [trialEnabled, setTrialEnabled] = useState(true)
  const [freeTrialDays, setFreeTrialDays] = useState('7')
  const [trialPaymentTiming, setTrialPaymentTiming] = useState('before_trial')
  const [featureTab, setFeatureTab] = useState<'trial' | 'plan'>('trial')
  const [upfrontPricingEnabled, setUpfrontPricingEnabled] = useState(false)
  const [firstPaymentAmount, setFirstPaymentAmount] = useState('49')
  const [firstPaymentCycles, setFirstPaymentCycles] = useState('1')
  const [firstPaymentCollectionMode, setFirstPaymentCollectionMode] = useState('upfront_total')
  const [isPublic, setIsPublic] = useState(true)
  const [isDefault, setIsDefault] = useState(false)
  const [requiresPaymentVerification, setRequiresPaymentVerification] = useState(true)
  const [featureState, setFeatureState] = useState<Record<string, boolean>>(() => buildFeatureState())
  const [trialFeatureState, setTrialFeatureState] = useState<Record<string, boolean>>(() => buildFeatureState())
  const [pricingRows, setPricingRows] = useState<PricingDraft[]>(() => defaultPricingDraft())

  async function createPlan() {
    const pricingFields = planPricingFields(pricingRows)
    setWorking(true)
    try {
      await requestJson('/api/v1/admin/subscriptions/plans', {
        code: `${slugFromName(name)}_${Date.now().toString().slice(-5)}`,
        name,
        description,
        billingInterval: pricingFields.billingInterval,
        priceAmount: pricingFields.priceAmount,
        durationDays: pricingFields.durationDays,
        isPublic,
        isDefault,
        requiresPaymentVerification,
        featureConfig: buildBillingFeatureConfig(undefined, {
          trialEnabled,
          freeTrialDays,
          trialPaymentTiming,
          trialFeatureKeys: enabledFeatureKeys(trialFeatureState),
          upfrontPricingEnabled,
          firstPaymentAmount,
          firstPaymentCycles,
          firstPaymentCollectionMode,
          pricingOptions: pricingFields.pricingOptions,
        }),
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
        description="Create details, feature access, and pricing options in three steps."
        open={open}
        onClose={() => setOpen(false)}
      >
        <StepTabs step={step} onStepChange={setStep} />
        {step === 0 ? (
          <DetailStep
            name={name}
            description={description}
            trialEnabled={trialEnabled}
            freeTrialDays={freeTrialDays}
            isPublic={isPublic}
            isDefault={isDefault}
            requiresPaymentVerification={requiresPaymentVerification}
            onNameChange={setName}
            onDescriptionChange={setDescription}
            onTrialEnabledChange={setTrialEnabled}
            onFreeTrialDaysChange={setFreeTrialDays}
            onIsPublicChange={setIsPublic}
            onIsDefaultChange={setIsDefault}
            onRequiresPaymentVerificationChange={setRequiresPaymentVerification}
          />
        ) : step === 1 ? (
          <FeatureWizardStep
            trialEnabled={trialEnabled}
            activeTab={featureTab}
            onActiveTabChange={setFeatureTab}
            trialFeatureState={trialFeatureState}
            planFeatureState={featureState}
            onTrialFeatureChange={(key, checked) =>
              setTrialFeatureState((current) => ({ ...current, [key]: checked }))
            }
            onPlanFeatureChange={(key, checked) =>
              setFeatureState((current) => ({ ...current, [key]: checked }))
            }
          />
        ) : (
          <PricingManagementStep
            upfrontPricingEnabled={upfrontPricingEnabled}
            firstPaymentAmount={firstPaymentAmount}
            firstPaymentCycles={firstPaymentCycles}
            firstPaymentCollectionMode={firstPaymentCollectionMode}
            pricingRows={pricingRows}
            onUpfrontPricingEnabledChange={setUpfrontPricingEnabled}
            onFirstPaymentAmountChange={setFirstPaymentAmount}
            onFirstPaymentCyclesChange={setFirstPaymentCycles}
            onFirstPaymentCollectionModeChange={setFirstPaymentCollectionMode}
            onPricingRowsChange={setPricingRows}
          />
        )}
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={() => setStep((current) => Math.max(current - 1, 0))} disabled={step === 0 || working}>
            Back
          </Button>
          {step < 2 ? (
            <Button type="button" onClick={() => setStep((current) => Math.min(current + 1, 2))}>
              Next
            </Button>
          ) : (
            <Button onClick={createPlan} disabled={working}>
              {working ? 'Creating...' : 'Create plan'}
            </Button>
          )}
        </div>
      </ModalShell>
    </>
  )
}

export function UpdatePlanButton({ plan }: { plan: Plan }) {
  const [working, setWorking] = useState(false)
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [name, setName] = useState(plan.name)
  const [description, setDescription] = useState(plan.description ?? '')
  const [trialEnabled, setTrialEnabled] = useState(
    configBoolean(plan.featureConfig, 'trialEnabled', configNumber(plan.featureConfig, 'freeTrialDays', 7) > 0)
  )
  const [freeTrialDays, setFreeTrialDays] = useState(
    String(Number(plan.featureConfig?.freeTrialDays ?? 7))
  )
  const [trialPaymentTiming, setTrialPaymentTiming] = useState(
    configString(
      plan.featureConfig,
      'trialPaymentTiming',
      configString(plan.featureConfig, 'trialCheckoutMode', 'before_trial')
    )
  )
  const [featureTab, setFeatureTab] = useState<'trial' | 'plan'>('trial')
  const [upfrontPricingEnabled, setUpfrontPricingEnabled] = useState(
    configBoolean(
      plan.featureConfig,
      'upfrontPricingEnabled',
      configNumber(plan.featureConfig, 'firstPaymentAmount', 0) > 0
    )
  )
  const [firstPaymentAmount, setFirstPaymentAmount] = useState(
    String(configNumber(plan.featureConfig, 'firstPaymentAmount', 0))
  )
  const [firstPaymentCycles, setFirstPaymentCycles] = useState(
    String(
      configNumber(
        plan.featureConfig,
        'firstPaymentCycles',
        configNumber(plan.featureConfig, 'firstPaymentMonths', 0)
      )
    )
  )
  const [firstPaymentCollectionMode, setFirstPaymentCollectionMode] = useState(
    configString(plan.featureConfig, 'firstPaymentCollectionMode', 'upfront_total')
  )
  const [isActive, setIsActive] = useState(plan.isActive)
  const [isPublic, setIsPublic] = useState(plan.isPublic)
  const [isDefault, setIsDefault] = useState(plan.isDefault)
  const [requiresPaymentVerification, setRequiresPaymentVerification] = useState(plan.requiresPaymentVerification)
  const [featureState, setFeatureState] = useState<Record<string, boolean>>(() => buildFeatureState(plan))
  const [trialFeatureState, setTrialFeatureState] = useState<Record<string, boolean>>(() => buildTrialFeatureState(plan))
  const [pricingRows, setPricingRows] = useState<PricingDraft[]>(() => pricingDraftsFromPlan(plan))
  const actionModal = useActionModal()

  async function updatePlan() {
    const pricingFields = planPricingFields(pricingRows)
    setWorking(true)
    try {
      await requestJson(
        `/api/v1/admin/subscriptions/plans/${plan.id}`,
        {
          name,
          description,
          billingInterval: pricingFields.billingInterval,
          priceAmount: pricingFields.priceAmount,
          durationDays: pricingFields.durationDays,
          isActive,
          isPublic,
          isDefault,
          requiresPaymentVerification,
          featureConfig: buildBillingFeatureConfig(plan.featureConfig, {
            trialEnabled,
            freeTrialDays,
            trialPaymentTiming,
            trialFeatureKeys: enabledFeatureKeys(trialFeatureState),
            upfrontPricingEnabled,
            firstPaymentAmount,
            firstPaymentCycles,
            firstPaymentCollectionMode,
            pricingOptions: pricingFields.pricingOptions,
          }),
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
    const confirmed = await actionModal.confirm({
      title: 'Delete subscription plan?',
      description: `Delete ${plan.name}? Existing payments stay in history, but the plan will no longer be available.`,
      confirmLabel: 'Delete plan',
      variant: 'danger',
    })
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
        <StepTabs step={step} onStepChange={setStep} />
        {step === 0 ? (
          <DetailStep
            name={name}
            description={description}
            trialEnabled={trialEnabled}
            freeTrialDays={freeTrialDays}
            isActive={isActive}
            isPublic={isPublic}
            isDefault={isDefault}
            requiresPaymentVerification={requiresPaymentVerification}
            onNameChange={setName}
            onDescriptionChange={setDescription}
            onTrialEnabledChange={setTrialEnabled}
            onFreeTrialDaysChange={setFreeTrialDays}
            onIsActiveChange={setIsActive}
            onIsPublicChange={setIsPublic}
            onIsDefaultChange={setIsDefault}
            onRequiresPaymentVerificationChange={setRequiresPaymentVerification}
            showActive
          />
        ) : step === 1 ? (
          <FeatureWizardStep
            trialEnabled={trialEnabled}
            activeTab={featureTab}
            onActiveTabChange={setFeatureTab}
            trialFeatureState={trialFeatureState}
            planFeatureState={featureState}
            onTrialFeatureChange={(key, checked) =>
              setTrialFeatureState((current) => ({ ...current, [key]: checked }))
            }
            onPlanFeatureChange={(key, checked) =>
              setFeatureState((current) => ({ ...current, [key]: checked }))
            }
          />
        ) : (
          <PricingManagementStep
            upfrontPricingEnabled={upfrontPricingEnabled}
            firstPaymentAmount={firstPaymentAmount}
            firstPaymentCycles={firstPaymentCycles}
            firstPaymentCollectionMode={firstPaymentCollectionMode}
            pricingRows={pricingRows}
            onUpfrontPricingEnabledChange={setUpfrontPricingEnabled}
            onFirstPaymentAmountChange={setFirstPaymentAmount}
            onFirstPaymentCyclesChange={setFirstPaymentCycles}
            onFirstPaymentCollectionModeChange={setFirstPaymentCollectionMode}
            onPricingRowsChange={setPricingRows}
          />
        )}
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={() => setStep((current) => Math.max(current - 1, 0))} disabled={step === 0 || working}>
            Back
          </Button>
          {step < 2 ? (
            <Button type="button" onClick={() => setStep((current) => Math.min(current + 1, 2))}>
              Next
            </Button>
          ) : (
            <Button onClick={updatePlan} disabled={working}>
              {working ? 'Saving...' : 'Save changes'}
            </Button>
          )}
        </div>
      </ModalShell>
      {actionModal.modal}
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
  label,
  verifyTitle,
  verifyDescription,
  verifyConfirmLabel,
  defaultNotes,
}: {
  paymentId: number
  decision: 'verify' | 'reject'
  label?: string
  verifyTitle?: string
  verifyDescription?: string
  verifyConfirmLabel?: string
  defaultNotes?: string
}) {
  const [working, setWorking] = useState(false)
  const actionModal = useActionModal()

  async function verify() {
    const notes = await actionModal.prompt({
      title:
        decision === 'verify'
          ? (verifyTitle ?? 'Verify payment and activate subscription?')
          : 'Reject payment?',
      description:
        decision === 'verify'
          ? (verifyDescription ??
            'This will mark the order verified and create or refresh an active subscription for this vendor, even if the Razorpay order is still marked created.')
          : 'This will reject the payment and block subscription access for this membership.',
      label: decision === 'verify' ? 'Verification notes' : 'Rejection reason',
      defaultValue: decision === 'verify' ? (defaultNotes ?? 'Payment confirmed') : 'Payment proof mismatch',
      confirmLabel: decision === 'verify' ? (verifyConfirmLabel ?? 'Verify and activate') : 'Reject payment',
      variant: decision === 'verify' ? 'default' : 'danger',
      textarea: true,
    })
    if (notes === null) return

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
    <>
      <Button
        onClick={verify}
        size="sm"
        variant={decision === 'verify' ? 'default' : 'outline'}
        disabled={working}
      >
        {working ? 'Saving...' : (label ?? (decision === 'verify' ? 'Verify' : 'Reject'))}
      </Button>
      {actionModal.modal}
    </>
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
  const [secureSummary, setSecureSummary] = useState<PaymentGatewaySummary | null>(null)
  const [mode, setMode] = useState<'test' | 'live'>(initialMode)
  const [keyId, setKeyId] = useState('')
  const [keySecret, setKeySecret] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [makeDefault, setMakeDefault] = useState(true)
  const [otpChallengeId, setOtpChallengeId] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpAction, setOtpAction] = useState<PaymentGatewayOtpAction | null>(null)
  const [otpCooldownSeconds, setOtpCooldownSeconds] = useState(0)
  const [keysRevealed, setKeysRevealed] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const actionModal = useActionModal()

  const effectiveSummary = secureSummary ?? summary
  const otpCooldownActive = otpCooldownSeconds > 0
  const activeConfig = effectiveSummary?.configs?.find((config) => config.mode === effectiveSummary.selectedMode) ?? null
  const selectedConfig = effectiveSummary?.configs?.find((config) => config.mode === mode) ?? null
  const activeKeyLabel = activeConfig?.keyIdRevealed
    ? activeConfig.keyId ?? 'Not configured'
    : activeConfig?.configured
      ? 'Verify OTP to view'
      : 'Not configured'

  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  useEffect(() => {
    const config = effectiveSummary?.configs?.find((item) => item.mode === mode)
    setKeyId(config?.keyIdRevealed ? config.keyId ?? '' : '')
    setKeySecret(config?.keySecretRevealed ? config.keySecret ?? '' : '')
    setWebhookSecret(config?.webhookSecretRevealed ? config.webhookSecret ?? '' : '')
    setIsActive(config?.isActive ?? true)
    setMakeDefault(config?.isDefault ?? mode === effectiveSummary?.selectedMode)
    setMessage(null)
  }, [mode, effectiveSummary])

  useEffect(() => {
    if (!otpCooldownActive) return undefined

    const timer = window.setInterval(() => {
      setOtpCooldownSeconds((current) => Math.max(current - 1, 0))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [otpCooldownActive])

  function clearOtp() {
    setOtpChallengeId('')
    setOtpCode('')
    setOtpAction(null)
  }

  async function requestGatewayOtp(action: PaymentGatewayOtpAction) {
    if (otpCooldownActive) return

    setWorking(true)
    setMessage(null)
    try {
      const payload = await requestJson('/api/v1/admin/subscriptions/payment-gateway/otp/request', { action })
      const data = extractApiData<{ challengeId: string; devOtpCode?: string; retryAfterSeconds?: number }>(payload)
      setOtpChallengeId(data.challengeId)
      setOtpCode(data.devOtpCode ?? '')
      setOtpAction(action)
      setOtpCooldownSeconds(data.retryAfterSeconds ?? 60)
      setMessage(
        data.devOtpCode
          ? `OTP generated for ${PAYMENT_GATEWAY_OTP_ACTION_LABELS[action]}: ${data.devOtpCode}`
          : `OTP sent to your admin phone for ${PAYMENT_GATEWAY_OTP_ACTION_LABELS[action]}.`
      )
    } catch (error) {
      const retryAfterSeconds = Number(
        typeof error === 'object' && error !== null && 'retryAfterSeconds' in error
          ? error.retryAfterSeconds
          : 0
      )
      if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
        setOtpCooldownSeconds(Math.ceil(retryAfterSeconds))
      }
      const fallbackMessage = error instanceof Error ? error.message : 'Unable to request OTP'
      setMessage(
        Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
          ? `${fallbackMessage} Try again in ${formatOtpCooldown(retryAfterSeconds)}.`
          : fallbackMessage
      )
    } finally {
      setWorking(false)
    }
  }

  function requireOtpReady(action: PaymentGatewayOtpAction) {
    if (!otpChallengeId || !otpCode.trim()) {
      setMessage(`Request OTP for ${PAYMENT_GATEWAY_OTP_ACTION_LABELS[action]} and enter the code first.`)
      return false
    }
    if (otpAction !== action) {
      setMessage(`Request a fresh OTP for ${PAYMENT_GATEWAY_OTP_ACTION_LABELS[action]}.`)
      return false
    }
    return true
  }

  async function revealKeys() {
    if (!requireOtpReady('reveal_gateway_keys')) return

    setWorking(true)
    setMessage(null)
    try {
      const payload = await requestJson('/api/v1/admin/subscriptions/payment-gateway/reveal', {
        challengeId: otpChallengeId,
        otpCode,
      })
      const data = extractApiData<PaymentGatewaySummary>(payload)
      setSecureSummary(data)
      setKeysRevealed(true)
      clearOtp()
      setMessage('Gateway keys revealed for this verified session.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to verify OTP')
    } finally {
      setWorking(false)
    }
  }

  async function saveConfig() {
    if (!requireOtpReady('save_gateway_keys')) return
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
          otpChallengeId,
          otpCode,
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
    if (!requireOtpReady('activate_gateway_mode')) return
    setWorking(true)
    setMessage(null)
    try {
      await requestJson('/api/v1/admin/subscriptions/payment-gateway/mode', {
        mode,
        otpChallengeId,
        otpCode,
      })
      window.location.reload()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to activate gateway mode')
    } finally {
      setWorking(false)
    }
  }

  async function deleteConfig() {
    if (!requireOtpReady('delete_gateway_keys')) return
    const confirmed = await actionModal.confirm({
      title: `Delete Razorpay ${mode === 'live' ? 'Production' : 'Test'} keys?`,
      description: 'Checkout will stop using this key set after deletion.',
      confirmLabel: 'Delete keys',
      variant: 'danger',
    })
    if (!confirmed) return

    setWorking(true)
    setMessage(null)
    try {
      await requestJson(
        `/api/v1/admin/subscriptions/payment-gateway/${mode}`,
        { otpChallengeId, otpCode },
        'DELETE'
      )
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
        description={`${effectiveSummary?.modeLabel ?? 'Test'} mode is selected for Razorpay checkout.`}
        open={open}
        onClose={() => setOpen(false)}
      >
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border/70 bg-background/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Active mode</p>
              <p className="mt-2 text-lg font-semibold">{effectiveSummary?.modeLabel ?? 'Test'}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Key id</p>
              <p className="mt-2 truncate text-sm font-medium">
                {activeKeyLabel}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Source</p>
              <p className="mt-2 text-sm font-medium">{gatewaySourceLabel(activeConfig?.source)}</p>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-background/40 p-4">
            <p className="text-sm font-semibold">Payment gateway OTP</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              OTP is required before viewing the active Razorpay key, saving key changes, activating a mode, or deleting keys.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
              <Input
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value)}
                placeholder="6 digit OTP"
                inputMode="numeric"
                maxLength={6}
              />
              <Button
                type="button"
                onClick={() => requestGatewayOtp('reveal_gateway_keys')}
                variant="outline"
                disabled={working || otpCooldownActive}
              >
                {otpCooldownActive ? `Retry in ${formatOtpCooldown(otpCooldownSeconds)}` : 'View key OTP'}
              </Button>
            </div>
            {otpCooldownActive ? (
              <p className="mt-2 text-xs font-medium text-muted-foreground">
                OTP limit active. You can request again in {formatOtpCooldown(otpCooldownSeconds)}.
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => requestGatewayOtp('save_gateway_keys')}
                variant="outline"
                disabled={working || otpCooldownActive}
              >
                {otpCooldownActive ? `Retry in ${formatOtpCooldown(otpCooldownSeconds)}` : 'Save OTP'}
              </Button>
              <Button
                type="button"
                onClick={() => requestGatewayOtp('activate_gateway_mode')}
                variant="outline"
                disabled={working || otpCooldownActive}
              >
                {otpCooldownActive ? `Retry in ${formatOtpCooldown(otpCooldownSeconds)}` : 'Mode OTP'}
              </Button>
              <Button
                type="button"
                onClick={() => requestGatewayOtp('delete_gateway_keys')}
                variant="outline"
                disabled={working || otpCooldownActive}
              >
                {otpCooldownActive ? `Retry in ${formatOtpCooldown(otpCooldownSeconds)}` : 'Delete OTP'}
              </Button>
              <Button
                type="button"
                onClick={revealKeys}
                disabled={
                  working ||
                  otpAction !== 'reveal_gateway_keys' ||
                  !otpChallengeId ||
                  otpCode.trim().length !== 6
                }
              >
                {keysRevealed ? 'Key verified' : 'Verify & view key'}
              </Button>
            </div>
            {otpAction ? (
              <p className="mt-2 text-xs text-muted-foreground">
                OTP ready for {PAYMENT_GATEWAY_OTP_ACTION_LABELS[otpAction]}.
              </p>
            ) : null}
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
              placeholder={
                selectedConfig?.keyId
                  ? 'Razorpay key id'
                  : selectedConfig?.configured
                    ? 'Existing key hidden - verify OTP to view or replace'
                    : 'Razorpay key id'
              }
            />
            <Input
              value={keySecret}
              onChange={(event) => setKeySecret(event.target.value)}
              placeholder={
                selectedConfig?.keySecretConfigured
                  ? 'Secret configured - verify OTP to view or replace'
                  : 'Razorpay key secret'
              }
              type={selectedConfig?.keySecretRevealed ? 'text' : 'password'}
            />
            <Input
              value={webhookSecret}
              onChange={(event) => setWebhookSecret(event.target.value)}
              placeholder={
                selectedConfig?.webhookSecretConfigured
                  ? 'Webhook secret configured - verify OTP to view or replace'
                  : 'Webhook secret'
              }
              type={selectedConfig?.webhookSecretRevealed ? 'text' : 'password'}
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
      {actionModal.modal}
    </>
  )
}

export function SubscriptionQuickActions({ plans }: { plans: Plan[] }) {
  const uniquePlans = useMemo(() => plans, [plans])

  return (
    <div className="flex flex-col gap-3">
      <AssignPlanButton plans={uniquePlans} />
      <RunMaintenanceButton />
    </div>
  )
}
