'use client'

import { useMemo, useState } from 'react'
import {
  CheckCircle2,
  IndianRupee,
  Pencil,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useActionModal } from '@/components/ui/action-modal'

type BadgeTone = 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger'

type VendorSummary = {
  id: number
  businessName: string
  contactName?: string | null
  contactPhone?: string | null
  city?: string | null
  state?: string | null
  user?: {
    fullName?: string | null
    phone?: string | null
    email?: string | null
  } | null
}

type ReferralSettings = {
  status: 'active' | 'paused' | 'closed'
  eligibilityMode: 'all_vendors' | 'only_selected' | 'exclude_selected'
  defaultReferralAmount: number
  defaultDiscountAmount: number
  currency: string
  startAt: string | null
  endAt: string | null
  termsTitle: string
  termsBody: string | null
  rules: Record<string, unknown> & { maxRewardsPerReferee?: number | null }
  maxRewardsPerReferee?: number | null
}

type VendorRule = {
  id: number
  vendorProfileId: number
  status: 'inherit' | 'active' | 'closed'
  referralAmount: number | null
  discountAmount: number | null
  currency: string | null
  startAt: string | null
  endAt: string | null
  maxRewardsPerReferee: number | null
  notes: string | null
  vendor: VendorSummary | null
}

type ReferralPayoutDetails = {
  status: 'not_submitted' | 'pending_approval' | 'approved' | 'rejected'
  bankAccountHolderName?: string | null
  accountHolderName: string | null
  bankName: string | null
  bankAccountNumber: string | null
  bankAccountNumberMasked: string | null
  bankIfscCode?: string | null
  ifscCode: string | null
  upiId: string | null
  submittedAt: string | null
  approvedAt?: string | null
  rejectedAt?: string | null
  reviewedBy: number | null
  reviewNotes?: string | null
  rejectionReason: string | null
}

type ReferralAccount = {
  id: number
  vendorProfileId: number
  referralCode: string
  status: 'active' | 'closed'
  joinedAt: string | null
  termsAcceptedAt: string | null
  payoutDetails: ReferralPayoutDetails
  vendor: VendorSummary | null
}

type ReferralRow = {
  id: number
  referralCode: string
  status: string
  totalRewardAmount: number
  totalDiscountAmount: number
  joinedAt: string | null
  firstSubscriptionPaidAt: string | null
  lastRewardedAt: string | null
  referrer: VendorSummary | null
  referee: VendorSummary | null
}

type LedgerRow = {
  id: number
  entryType: 'reward' | 'discount' | 'adjustment'
  amount: number
  currency: string
  status: 'pending' | 'payable' | 'paid' | 'cancelled'
  ruleSource: 'global' | 'vendor'
  notes: string | null
  createdAt: string | null
  paidAt: string | null
  referrer: VendorSummary | null
  referee: VendorSummary | null
  payment: {
    id: number
    amount: number
    currency: string
    status: string
    paidAt: string | null
  } | null
}

export type ReferralProgramData = {
  settings: ReferralSettings
  analytics: {
    activeReferrals: number
    closedReferrals: number
    paidRewardAmount: number
    payableRewardAmount: number
    qualifiedReferrals?: number
    pendingPayoutApprovals?: number
    rewardingReferrals: number
    totalDiscountAmount: number
    totalReferrals: number
    totalRewardAmount: number
    vendorAccounts: number
    vendorSpecificRules: number
  }
  accounts: ReferralAccount[]
  chart: Array<{ label: string; rewards: number; amount: number }>
  terms: {
    title: string
    body: string
    bullets: string[]
  }
  vendorRules: VendorRule[]
  referrals: ReferralRow[]
  ledger: LedgerRow[]
  vendors: VendorSummary[]
} | null

type SettingsForm = {
  status: ReferralSettings['status']
  eligibilityMode: ReferralSettings['eligibilityMode']
  defaultReferralAmount: string
  defaultDiscountAmount: string
  currency: string
  startAt: string
  endAt: string
  termsTitle: string
  termsBody: string
  maxRewardsPerReferee: string
}

type RuleForm = {
  id?: number
  vendorProfileId: string
  status: VendorRule['status']
  referralAmount: string
  discountAmount: string
  currency: string
  startAt: string
  endAt: string
  maxRewardsPerReferee: string
  notes: string
}

const emptyRuleForm: RuleForm = {
  vendorProfileId: '',
  status: 'active',
  referralAmount: '',
  discountAmount: '',
  currency: 'INR',
  startAt: '',
  endAt: '',
  maxRewardsPerReferee: '',
  notes: '',
}

function fallbackData(): NonNullable<ReferralProgramData> {
  return {
    settings: {
      status: 'active',
      eligibilityMode: 'all_vendors',
      defaultReferralAmount: 50,
      defaultDiscountAmount: 0,
      currency: 'INR',
      startAt: null,
      endAt: null,
      termsTitle: 'Vendero Referral Rewards',
      termsBody: '',
      rules: { maxRewardsPerReferee: null },
      maxRewardsPerReferee: null,
    },
    analytics: {
      activeReferrals: 0,
      closedReferrals: 0,
      paidRewardAmount: 0,
      payableRewardAmount: 0,
      qualifiedReferrals: 0,
      pendingPayoutApprovals: 0,
      rewardingReferrals: 0,
      totalDiscountAmount: 0,
      totalReferrals: 0,
      totalRewardAmount: 0,
      vendorAccounts: 0,
      vendorSpecificRules: 0,
    },
    accounts: [],
    chart: [],
    terms: {
      title: 'Vendero Referral Rewards',
      body: '',
      bullets: [],
    },
    vendorRules: [],
    referrals: [],
    ledger: [],
    vendors: [],
  }
}

function getAdminToken() {
  const tokenEntry = document.cookie
    .split('; ')
    .find((part) => part.startsWith('vendero_admin_access_token='))
  return tokenEntry?.split('=')[1] ?? null
}

function unwrapPayload(payload: any) {
  return payload?.data?.data ?? payload?.data ?? payload
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

  if (!response.ok) {
    throw new Error(payload?.message ?? payload?.error?.message ?? 'Request failed')
  }

  return unwrapPayload(payload)
}

function formatCurrency(amount: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(Number.isFinite(Number(amount)) ? Number(amount) : 0)
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not set'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not set'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  }).format(date)
}

function inputDate(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function positiveInteger(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const number = Math.floor(Number(value))
  return Number.isFinite(number) && number > 0 ? number : null
}

function settingsMaxRewards(settings: ReferralSettings) {
  return positiveInteger(settings.maxRewardsPerReferee ?? settings.rules?.maxRewardsPerReferee)
}

function statusTone(status: string): BadgeTone {
  if (['active', 'rewarding', 'payable', 'paid', 'approved'].includes(status)) return 'success'
  if (['paused', 'pending', 'pending_approval', 'inherit', 'not_submitted'].includes(status)) return 'warning'
  if (['closed', 'blocked', 'cancelled', 'rejected'].includes(status)) return 'danger'
  return 'secondary'
}

function vendorName(vendor?: VendorSummary | null) {
  if (!vendor) return 'Unknown vendor'
  return vendor.businessName ?? vendor.user?.fullName ?? `Vendor #${vendor.id}`
}

function settingsFormFrom(settings: ReferralSettings): SettingsForm {
  return {
    status: settings.status,
    eligibilityMode: settings.eligibilityMode,
    defaultReferralAmount: String(settings.defaultReferralAmount ?? 50),
    defaultDiscountAmount: String(settings.defaultDiscountAmount ?? 0),
    currency: settings.currency ?? 'INR',
    startAt: inputDate(settings.startAt),
    endAt: inputDate(settings.endAt),
    termsTitle: settings.termsTitle ?? 'Vendero Referral Rewards',
    termsBody: settings.termsBody ?? '',
    maxRewardsPerReferee: settingsMaxRewards(settings)
      ? String(settingsMaxRewards(settings))
      : '',
  }
}

function ruleFormFrom(rule: VendorRule): RuleForm {
  return {
    id: rule.id,
    vendorProfileId: String(rule.vendorProfileId),
    status: rule.status,
    referralAmount: rule.referralAmount === null ? '' : String(rule.referralAmount),
    discountAmount: rule.discountAmount === null ? '' : String(rule.discountAmount),
    currency: rule.currency ?? 'INR',
    startAt: inputDate(rule.startAt),
    endAt: inputDate(rule.endAt),
    maxRewardsPerReferee:
      rule.maxRewardsPerReferee === null ? '' : String(rule.maxRewardsPerReferee),
    notes: rule.notes ?? '',
  }
}

function ModalSheet({
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-5">
      <div className="w-full max-w-3xl rounded-t-3xl border border-border bg-background shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <p className="text-lg font-semibold">{title}</p>
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          <Button variant="outline" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="max-h-[78vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}

function SwitchField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border/70 bg-background/30 p-3">
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-10 cursor-pointer appearance-none rounded-full bg-muted shadow-inner transition checked:bg-primary before:block before:h-5 before:w-5 before:rounded-full before:bg-white before:transition checked:before:translate-x-5"
      />
    </label>
  )
}

export function ReferralProgramPanel({ initialData }: { initialData: ReferralProgramData }) {
  const [data, setData] = useState<NonNullable<ReferralProgramData>>(initialData ?? fallbackData())
  const [settingsForm, setSettingsForm] = useState(() => settingsFormFrom(data.settings))
  const [ruleForm, setRuleForm] = useState<RuleForm>(emptyRuleForm)
  const [ruleModalOpen, setRuleModalOpen] = useState(false)
  const [termsModalOpen, setTermsModalOpen] = useState(false)
  const [working, setWorking] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const actionModal = useActionModal()
  const currency = data.settings.currency ?? 'INR'
  const maxChartAmount = Math.max(1, ...data.chart.map((item) => item.amount))
  const payableLedger = useMemo(
    () => data.ledger.filter((entry) => entry.entryType === 'reward' && entry.status === 'payable'),
    [data.ledger]
  )
  const payoutAccounts = useMemo(
    () =>
      [...(data.accounts ?? [])]
        .filter((account) => account.payoutDetails?.status !== 'not_submitted')
        .sort((left, right) => {
          const leftPending = left.payoutDetails?.status === 'pending_approval' ? 0 : 1
          const rightPending = right.payoutDetails?.status === 'pending_approval' ? 0 : 1
          return leftPending - rightPending
        }),
    [data.accounts]
  )

  async function refresh() {
    const nextData = (await requestJson('/api/v1/admin/referral-program')) as NonNullable<ReferralProgramData>
    setData(nextData)
    setSettingsForm(settingsFormFrom(nextData.settings))
    return nextData
  }

  async function saveSettings() {
    setWorking('settings')
    setMessage('')
    try {
      const nextData = (await requestJson(
        '/api/v1/admin/referral-program/settings',
        {
          rules: {
            ...(data.settings.rules ?? {}),
            maxRewardsPerReferee: settingsForm.maxRewardsPerReferee
              ? Number(settingsForm.maxRewardsPerReferee)
              : null,
          },
          status: settingsForm.status,
          eligibilityMode: settingsForm.eligibilityMode,
          defaultReferralAmount: Number(settingsForm.defaultReferralAmount || 0),
          defaultDiscountAmount: Number(settingsForm.defaultDiscountAmount || 0),
          currency: settingsForm.currency.trim() || 'INR',
          startAt: settingsForm.startAt || null,
          endAt: settingsForm.endAt || null,
          termsTitle: settingsForm.termsTitle.trim(),
          termsBody: settingsForm.termsBody.trim() || null,
        },
        'PUT'
      )) as NonNullable<ReferralProgramData>
      setData(nextData)
      setSettingsForm(settingsFormFrom(nextData.settings))
      setMessage('Global referral program settings saved.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save settings')
    } finally {
      setWorking(null)
    }
  }

  async function saveRule() {
    setWorking('rule')
    setMessage('')
    try {
      const body = {
        vendorProfileId: Number(ruleForm.vendorProfileId),
        status: ruleForm.status,
        referralAmount: ruleForm.referralAmount ? Number(ruleForm.referralAmount) : null,
        discountAmount: ruleForm.discountAmount ? Number(ruleForm.discountAmount) : null,
        currency: ruleForm.currency.trim() || null,
        startAt: ruleForm.startAt || null,
        endAt: ruleForm.endAt || null,
        maxRewardsPerReferee: ruleForm.maxRewardsPerReferee
          ? Number(ruleForm.maxRewardsPerReferee)
          : null,
        notes: ruleForm.notes.trim() || null,
      }
      const path = ruleForm.id
        ? `/api/v1/admin/referral-program/vendor-rules/${ruleForm.id}`
        : '/api/v1/admin/referral-program/vendor-rules'
      const method = ruleForm.id ? 'PUT' : 'POST'
      const nextData = (await requestJson(path, body, method)) as NonNullable<ReferralProgramData>
      setData(nextData)
      setRuleForm(emptyRuleForm)
      setRuleModalOpen(false)
      setMessage('Vendor referral rule saved.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save vendor rule')
    } finally {
      setWorking(null)
    }
  }

  async function deleteRule(rule: VendorRule) {
    const confirmed = await actionModal.confirm({
      title: 'Delete referral rule?',
      description: `Delete referral rule for ${vendorName(rule.vendor)}?`,
      confirmLabel: 'Delete rule',
      variant: 'danger',
    })
    if (!confirmed) return
    setWorking(`delete-rule-${rule.id}`)
    setMessage('')
    try {
      const nextData = (await requestJson(
        `/api/v1/admin/referral-program/vendor-rules/${rule.id}`,
        undefined,
        'DELETE'
      )) as NonNullable<ReferralProgramData>
      setData(nextData)
      setMessage('Vendor rule deleted.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to delete vendor rule')
    } finally {
      setWorking(null)
    }
  }

  async function updateLedger(entry: LedgerRow, status: LedgerRow['status']) {
    setWorking(`ledger-${entry.id}-${status}`)
    setMessage('')
    try {
      const nextData = (await requestJson(
        `/api/v1/admin/referral-program/ledger/${entry.id}/status`,
        {
          status,
          notes:
            status === 'paid'
              ? 'Marked paid from admin reward program panel.'
              : `Marked ${status} from admin reward program panel.`,
        },
        'POST'
      )) as NonNullable<ReferralProgramData>
      setData(nextData)
      setMessage(`Ledger entry marked ${status}.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update ledger')
    } finally {
      setWorking(null)
    }
  }

  async function updatePayoutStatus(
    account: ReferralAccount,
    status: 'approved' | 'rejected'
  ) {
    if (status === 'rejected') {
      const confirmed = await actionModal.confirm({
        title: 'Reject payout details?',
        description: `Reject payout details for ${vendorName(account.vendor)}? The vendor can resubmit from the mobile app.`,
        confirmLabel: 'Reject details',
        variant: 'danger',
      })
      if (!confirmed) return
    }

    setWorking(`payout-${account.id}-${status}`)
    setMessage('')
    try {
      const nextData = (await requestJson(
        `/api/v1/admin/referral-program/accounts/${account.id}/payout-status`,
        {
          status,
          notes:
            status === 'rejected'
              ? 'Rejected from admin reward program panel.'
              : 'Approved from admin reward program panel.',
        },
        'POST'
      )) as NonNullable<ReferralProgramData>
      setData(nextData)
      setMessage(`Payout details ${status}.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update payout status')
    } finally {
      setWorking(null)
    }
  }

  return (
    <div className="space-y-6">
      {message ? (
        <div className="rounded-xl border border-border bg-card/80 px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
              Global Control
            </CardTitle>
            <CardDescription>
              Decide whether referral rewards are open for all vendors, selected vendors only, or
              closed for specific vendors.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SwitchField
              label="Program active"
              description="When off, vendors can see the page but cannot use referral codes."
              checked={settingsForm.status === 'active'}
              onChange={(checked) =>
                setSettingsForm((current) => ({
                  ...current,
                  status: checked ? 'active' : 'paused',
                }))
              }
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Referral amount</span>
                <Input
                  type="number"
                  min={0}
                  value={settingsForm.defaultReferralAmount}
                  onChange={(event) =>
                    setSettingsForm((current) => ({
                      ...current,
                      defaultReferralAmount: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Purchase discount</span>
                <Input
                  type="number"
                  min={0}
                  value={settingsForm.defaultDiscountAmount}
                  onChange={(event) =>
                    setSettingsForm((current) => ({
                      ...current,
                      defaultDiscountAmount: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Bonus frequency</span>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={settingsForm.maxRewardsPerReferee}
                  onChange={(event) =>
                    setSettingsForm((current) => ({
                      ...current,
                      maxRewardsPerReferee: event.target.value,
                    }))
                  }
                >
                  <option value="">Every verified payment</option>
                  <option value="1">One time per referred vendor</option>
                  <option value="2">First 2 paid subscriptions</option>
                  <option value="3">First 3 paid subscriptions</option>
                  <option value="12">First 12 paid subscriptions</option>
                </select>
                <p className="text-xs leading-5 text-muted-foreground">
                  Use every payment for monthly rewards. Use one time for a single bonus.
                </p>
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Eligibility mode</span>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={settingsForm.eligibilityMode}
                  onChange={(event) =>
                    setSettingsForm((current) => ({
                      ...current,
                      eligibilityMode: event.target.value as ReferralSettings['eligibilityMode'],
                    }))
                  }
                >
                  <option value="all_vendors">All vendors active</option>
                  <option value="only_selected">Only selected vendors active</option>
                  <option value="exclude_selected">Close selected vendors</option>
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Currency</span>
                <Input
                  value={settingsForm.currency}
                  onChange={(event) =>
                    setSettingsForm((current) => ({ ...current, currency: event.target.value }))
                  }
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Start date</span>
                <Input
                  type="date"
                  value={settingsForm.startAt}
                  onChange={(event) =>
                    setSettingsForm((current) => ({ ...current, startAt: event.target.value }))
                  }
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">End date</span>
                <Input
                  type="date"
                  value={settingsForm.endAt}
                  onChange={(event) =>
                    setSettingsForm((current) => ({ ...current, endAt: event.target.value }))
                  }
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button onClick={saveSettings} disabled={working === 'settings'} className="w-full">
                <CheckCircle2 className="h-4 w-4" />
                {working === 'settings' ? 'Saving...' : 'Save global rules'}
              </Button>
              <Button variant="outline" onClick={() => setTermsModalOpen(true)} className="w-full">
                Edit terms text
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <CardTitle>Reward Analytics</CardTitle>
            <CardDescription>Reward entries created from verified subscription payments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                ['Vendor codes', data.analytics.vendorAccounts],
                ['Payout approvals', data.analytics.pendingPayoutApprovals ?? 0],
                ['Qualified', data.analytics.qualifiedReferrals ?? data.analytics.rewardingReferrals],
                ['Rewarding', data.analytics.rewardingReferrals],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-border/70 bg-background/35 p-3">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
            <div className="flex h-52 items-end gap-3 rounded-2xl border border-border/70 bg-background/30 p-4">
              {data.chart.map((item) => (
                <div key={item.label} className="flex h-full flex-1 flex-col justify-end gap-2">
                  <div
                    className="min-h-2 rounded-t-lg bg-gradient-to-t from-emerald-400 to-sky-300"
                    style={{ height: `${Math.max(6, (item.amount / maxChartAmount) * 100)}%` }}
                    title={`${item.label}: ${formatCurrency(item.amount, currency)}`}
                  />
                  <div className="text-center">
                    <p className="text-[11px] text-muted-foreground">{item.label}</p>
                    <p className="text-xs font-semibold">{item.rewards}</p>
                  </div>
                </div>
              ))}
              {!data.chart.length ? (
                <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                  Reward chart will appear after verified referral subscription payments.
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/70 bg-card/85">
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Bank & UPI Approvals</CardTitle>
            <CardDescription>
              Review payout details submitted by vendors before reward payments are marked paid.
            </CardDescription>
          </div>
          <Badge variant="warning" className="rounded-full px-3 py-1">
            {data.analytics.pendingPayoutApprovals ?? 0} pending
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {payoutAccounts.slice(0, 12).map((account) => {
            const payout = account.payoutDetails
            return (
              <div key={account.id} className="rounded-xl border border-border/70 bg-background/35 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{vendorName(account.vendor)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Code {account.referralCode} - submitted {formatDate(payout.submittedAt)}
                    </p>
                  </div>
                  <Badge variant={statusTone(payout.status)} className="rounded-full px-3 py-1">
                    {payout.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                    <p className="text-xs text-muted-foreground">Account holder</p>
                    <p className="mt-1 font-medium">
                      {payout.bankAccountHolderName ?? payout.accountHolderName ?? 'Not set'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                    <p className="text-xs text-muted-foreground">Bank account</p>
                    <p className="mt-1 font-mono text-xs">
                      {payout.bankAccountNumber ?? payout.bankAccountNumberMasked ?? 'Not set'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                    <p className="text-xs text-muted-foreground">Bank / IFSC</p>
                    <p className="mt-1 font-medium">{payout.bankName ?? 'Not set'}</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {payout.bankIfscCode ?? payout.ifscCode ?? 'IFSC not set'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                    <p className="text-xs text-muted-foreground">UPI ID</p>
                    <p className="mt-1 font-mono text-xs">{payout.upiId ?? 'Not set'}</p>
                  </div>
                </div>
                {payout.status === 'pending_approval' ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => updatePayoutStatus(account, 'approved')}
                      disabled={working === `payout-${account.id}-approved`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updatePayoutStatus(account, 'rejected')}
                      disabled={working === `payout-${account.id}-rejected`}
                    >
                      Reject
                    </Button>
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-muted-foreground">
                    Reviewed {formatDate(payout.approvedAt ?? payout.rejectedAt)}
                    {payout.reviewNotes ?? payout.rejectionReason
                      ? ` - ${payout.reviewNotes ?? payout.rejectionReason}`
                      : ''}
                  </p>
                )}
              </div>
            )
          })}
          {!payoutAccounts.length ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              No payout details have been submitted yet. Vendors will appear here after joining the
              reward program with bank account and UPI details.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Specific Vendor Rules</CardTitle>
              <CardDescription>
                Override amount, discount, active dates, or close a vendor referral code.
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                setRuleForm(emptyRuleForm)
                setRuleModalOpen(true)
              }}
            >
              Add rule
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.vendorRules.map((rule) => (
              <div key={rule.id} className="rounded-xl border border-border/70 bg-background/35 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{vendorName(rule.vendor)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Reward {rule.referralAmount === null ? 'global' : formatCurrency(rule.referralAmount, rule.currency ?? currency)}
                      {' - '}
                      Discount {rule.discountAmount === null ? 'global' : formatCurrency(rule.discountAmount, rule.currency ?? currency)}
                    </p>
                  </div>
                  <Badge variant={statusTone(rule.status)} className="rounded-full px-3 py-1">
                    {rule.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {formatDate(rule.startAt)} to {formatDate(rule.endAt)}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRuleForm(ruleFormFrom(rule))
                        setRuleModalOpen(true)
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteRule(rule)}
                      disabled={working === `delete-rule-${rule.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {!data.vendorRules.length ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                No vendor-specific rules yet. Global rules apply to every active vendor code.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/85">
          <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Payable Ledger</CardTitle>
              <CardDescription>Rewards waiting for admin payout action.</CardDescription>
            </div>
            <Button variant="outline" onClick={refresh}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {payableLedger.slice(0, 8).map((entry) => (
              <div key={entry.id} className="rounded-xl border border-border/70 bg-background/35 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {formatCurrency(entry.amount, entry.currency)} to {vendorName(entry.referrer)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Referred {vendorName(entry.referee)} - {formatDate(entry.createdAt)}
                    </p>
                  </div>
                  <Badge variant={statusTone(entry.status)} className="rounded-full px-3 py-1">
                    {entry.status}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => updateLedger(entry, 'paid')}
                    disabled={working === `ledger-${entry.id}-paid`}
                  >
                    <IndianRupee className="h-3.5 w-3.5" />
                    Mark paid
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateLedger(entry, 'cancelled')}
                    disabled={working === `ledger-${entry.id}-cancelled`}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
            {!payableLedger.length ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                No payable rewards yet. Rewards will appear after referred vendors pay for a
                subscription.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/70 bg-card/85">
        <CardHeader>
          <CardTitle>Who Referred Whom</CardTitle>
          <CardDescription>Referral chains and reward totals.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-3 pr-4">Referrer</th>
                <th className="py-3 pr-4">Referred vendor</th>
                <th className="py-3 pr-4">Code</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Rewards</th>
                <th className="py-3 pr-4">Discounts</th>
                <th className="py-3 pr-4">Last reward</th>
              </tr>
            </thead>
            <tbody>
              {data.referrals.slice(0, 80).map((referral) => (
                <tr key={referral.id} className="border-b border-border/60">
                  <td className="py-3 pr-4 font-medium">{vendorName(referral.referrer)}</td>
                  <td className="py-3 pr-4">{vendorName(referral.referee)}</td>
                  <td className="py-3 pr-4 font-mono text-xs">{referral.referralCode}</td>
                  <td className="py-3 pr-4">
                    <Badge variant={statusTone(referral.status)} className="rounded-full px-3 py-1">
                      {referral.status}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4">{formatCurrency(referral.totalRewardAmount, currency)}</td>
                  <td className="py-3 pr-4">{formatCurrency(referral.totalDiscountAmount, currency)}</td>
                  <td className="py-3 pr-4">{formatDate(referral.lastRewardedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.referrals.length ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              No vendor has joined through another vendor code yet.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <ModalSheet
        open={ruleModalOpen}
        onClose={() => setRuleModalOpen(false)}
        title={ruleForm.id ? 'Edit Vendor Rule' : 'Create Vendor Rule'}
        description="Use this when a vendor needs a custom reward amount, discount, active window, or closure."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm sm:col-span-2">
            <span className="text-muted-foreground">Vendor</span>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={ruleForm.vendorProfileId}
              onChange={(event) =>
                setRuleForm((current) => ({ ...current, vendorProfileId: event.target.value }))
              }
              disabled={Boolean(ruleForm.id)}
            >
              <option value="">Choose vendor</option>
              {data.vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendorName(vendor)} {vendor.user?.phone ? `- ${vendor.user.phone}` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">Status</span>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={ruleForm.status}
              onChange={(event) =>
                setRuleForm((current) => ({
                  ...current,
                  status: event.target.value as VendorRule['status'],
                }))
              }
            >
              <option value="active">Active for this vendor</option>
              <option value="closed">Closed for this vendor</option>
              <option value="inherit">Use global status</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">Currency</span>
            <Input
              value={ruleForm.currency}
              onChange={(event) =>
                setRuleForm((current) => ({ ...current, currency: event.target.value }))
              }
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">Reward override</span>
            <Input
              type="number"
              min={0}
              placeholder="Blank uses global"
              value={ruleForm.referralAmount}
              onChange={(event) =>
                setRuleForm((current) => ({ ...current, referralAmount: event.target.value }))
              }
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">Discount override</span>
            <Input
              type="number"
              min={0}
              placeholder="Blank uses global"
              value={ruleForm.discountAmount}
              onChange={(event) =>
                setRuleForm((current) => ({ ...current, discountAmount: event.target.value }))
              }
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">Start date</span>
            <Input
              type="date"
              value={ruleForm.startAt}
              onChange={(event) =>
                setRuleForm((current) => ({ ...current, startAt: event.target.value }))
              }
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">End date</span>
            <Input
              type="date"
              value={ruleForm.endAt}
              onChange={(event) =>
                setRuleForm((current) => ({ ...current, endAt: event.target.value }))
              }
            />
          </label>
          <label className="space-y-2 text-sm sm:col-span-2">
            <span className="text-muted-foreground">Max rewards per referred vendor</span>
            <Input
              type="number"
              min={1}
              placeholder="Blank uses global bonus frequency"
              value={ruleForm.maxRewardsPerReferee}
              onChange={(event) =>
                setRuleForm((current) => ({
                  ...current,
                  maxRewardsPerReferee: event.target.value,
                }))
              }
            />
          </label>
          <label className="space-y-2 text-sm sm:col-span-2">
            <span className="text-muted-foreground">Admin notes</span>
            <textarea
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={ruleForm.notes}
              onChange={(event) =>
                setRuleForm((current) => ({ ...current, notes: event.target.value }))
              }
            />
          </label>
          <Button
            className="sm:col-span-2"
            onClick={saveRule}
            disabled={working === 'rule' || !ruleForm.vendorProfileId}
          >
            {working === 'rule' ? 'Saving...' : 'Save vendor rule'}
          </Button>
        </div>
      </ModalSheet>

      <ModalSheet
        open={termsModalOpen}
        onClose={() => setTermsModalOpen(false)}
        title="Referral Terms"
        description="This copy is shown in the vendor app referral screen."
      >
        <div className="space-y-4">
          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">Terms title</span>
            <Input
              value={settingsForm.termsTitle}
              onChange={(event) =>
                setSettingsForm((current) => ({ ...current, termsTitle: event.target.value }))
              }
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">Terms body</span>
            <textarea
              className="min-h-44 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={settingsForm.termsBody}
              onChange={(event) =>
                setSettingsForm((current) => ({ ...current, termsBody: event.target.value }))
              }
            />
          </label>
          <div className="rounded-xl border border-border/70 bg-background/30 p-4 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">Default vendor bullets</p>
            <ul className="mt-3 space-y-2">
              {data.terms.bullets.map((term) => (
                <li key={term}>- {term}</li>
              ))}
            </ul>
          </div>
          <Button
            onClick={async () => {
              await saveSettings()
              setTermsModalOpen(false)
            }}
            disabled={working === 'settings'}
          >
            Save terms
          </Button>
        </div>
      </ModalSheet>
      {actionModal.modal}
    </div>
  )
}
