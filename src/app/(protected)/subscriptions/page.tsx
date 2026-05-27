import { API_URL, ENV_HEADERS } from '@/lib/environment'
import { cookies } from 'next/headers'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  CreatePlanButton,
  PaymentGatewaySettingsButton,
  SubscriptionQuickActions,
  UpdatePlanButton,
  VerifyPaymentButton,
} from './subscription-actions'
import type { PaymentGatewaySummary } from './subscription-actions'

type Overview = {
  analytics: {
    totalPlans: number
    activePlans: number
    activeSubscribers: number
    expiredSubscribers: number
    paymentPendingVerification: number
    verifiedPayments: number
    monthlyRevenueBooked: number
  }
  plans: Array<{
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
  }>
  memberships: Array<{
    id: number
    vendorProfileId: number
    status: string
    planName: string
    planCode: string | null
    paymentStatus: string
    expiresAt: string | null
    vendorProfile: {
      businessName: string
      user: {
        fullName: string | null
        phone: string
        email: string
      }
    }
  }>
  payments: Array<{
    id: number
    amount: string
    currency: string
    status: string
    providerReference: string | null
    providerName: string | null
    paidAt: string | null
    vendorProfile: {
      businessName: string
      user: {
        phone: string
      }
    }
    plan: {
      name: string
    } | null
  }>
  histories: Array<{
    id: number
    action: string
    notes: string | null
    createdAt: string
    vendorProfile: {
      businessName: string
      user: {
        phone: string
      }
    }
    plan: {
      name: string
    } | null
  }>
  paymentGateway: PaymentGatewaySummary
}

async function getOverview() {
  const cookieStore = await cookies()
  const token = cookieStore.get('vendero_admin_access_token')?.value
  if (!token) return null

  const response = await fetch(`${API_URL}/api/v1/admin/subscriptions/overview`, {
    cache: 'no-store',
    headers: {
      ...ENV_HEADERS,
      authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) return null
  const payload = await response.json()
  return (payload.data?.data ?? payload.data) as Overview
}

function variantForStatus(status: string): 'success' | 'warning' | 'danger' | 'secondary' {
  if (['active', 'verified'].includes(status)) return 'success'
  if (['expired', 'rejected', 'failed', 'refunded'].includes(status)) return 'danger'
  if (['pending_verification', 'inactive', 'initiated'].includes(status)) return 'warning'
  return 'secondary'
}

function configNumber(config: Record<string, unknown> | undefined, key: string, fallback = 0) {
  const value = Number(config?.[key] ?? fallback)
  return Number.isFinite(value) ? value : fallback
}

function configString(config: Record<string, unknown> | undefined, key: string, fallback = '') {
  const value = config?.[key]
  return typeof value === 'string' ? value : fallback
}

function planBillingTerms(plan: Overview['plans'][number]) {
  const firstPaymentAmount = configNumber(plan.featureConfig, 'firstPaymentAmount', 0)
  const firstPaymentCycles = configNumber(
    plan.featureConfig,
    'firstPaymentCycles',
    configNumber(plan.featureConfig, 'firstPaymentMonths', 0)
  )
  const trialEnabled = plan.featureConfig?.trialEnabled !== false
  const trialDays = trialEnabled ? configNumber(plan.featureConfig, 'freeTrialDays', 0) : 0
  const trialPaymentTiming = configString(
    plan.featureConfig,
    'trialPaymentTiming',
    configString(plan.featureConfig, 'trialCheckoutMode', 'before_trial')
  )
  const firstPaymentText =
    firstPaymentAmount > 0 && firstPaymentCycles > 0
      ? `First payment ₹${firstPaymentAmount} covers ${firstPaymentCycles} ${firstPaymentCycles === 1 ? 'cycle' : 'cycles'}`
      : 'No introductory first payment configured'
  const regularText = `Then ₹${plan.priceAmount} ${plan.currency} every ${plan.billingInterval}`
  const trialText =
    trialDays > 0
      ? `${trialDays} day free trial • first payment ${trialPaymentTiming === 'after_trial' ? 'after trial' : 'before trial'} • one use per vendor per plan`
      : 'Free trial disabled'

  return [firstPaymentText, regularText, trialText]
}

export default async function SubscriptionsPage() {
  const overview = await getOverview()
  const analytics = overview?.analytics ?? {
    totalPlans: 0,
    activePlans: 0,
    activeSubscribers: 0,
    expiredSubscribers: 0,
    paymentPendingVerification: 0,
    verifiedPayments: 0,
    monthlyRevenueBooked: 0,
  }
  const plans = overview?.plans ?? []
  const memberships = overview?.memberships ?? []
  const payments = overview?.payments ?? []
  const histories = overview?.histories ?? []
  const paymentGateway = overview?.paymentGateway ?? null

  return (
    <main className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Subscription Module
            </Badge>
            <CardTitle className="text-3xl">Custom plans, payment controls, and lifecycle rules</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7">
              Configure plan features, control who gets access, verify payments manually, block on expiry,
              queue reminders, and keep a full history trail for every subscription action.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <CreatePlanButton />
            <PaymentGatewaySettingsButton summary={paymentGateway} />
            <SubscriptionQuickActions plans={plans} />
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
            <CardDescription>Live subscription and billing posture.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Active subs</p>
              <p className="mt-1 text-2xl font-semibold">{analytics.activeSubscribers}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Pending payments</p>
              <p className="mt-1 text-2xl font-semibold">{analytics.paymentPendingVerification}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Expired subs</p>
              <p className="mt-1 text-2xl font-semibold">{analytics.expiredSubscribers}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Verified revenue</p>
              <p className="mt-1 text-2xl font-semibold">₹{analytics.monthlyRevenueBooked}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Plans</CardTitle>
            <CardDescription>Fully customizable plan catalog shown as subscription cards.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            {plans.map((plan) => (
              <div key={plan.id} className="rounded-2xl border border-border/70 bg-background/30 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{plan.name}</p>
                      <Badge variant={plan.isActive ? 'success' : 'secondary'}>{plan.code}</Badge>
                      {plan.isDefault ? <Badge variant="warning">Default</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {plan.billingInterval} • {plan.durationDays ?? 'custom'} days • ₹{plan.priceAmount} {plan.currency}
                    </p>
                  </div>
                  <UpdatePlanButton plan={plan} />
                </div>
                {plan.description ? (
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{plan.description}</p>
                ) : null}
                <div className="mt-3 grid gap-2 text-xs">
                  {planBillingTerms(plan).map((term) => (
                    <p key={term} className="rounded-xl border border-border/60 bg-background/45 px-3 py-2 text-muted-foreground">
                      {term}
                    </p>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {plan.features.map((feature) => (
                    <Badge
                      key={feature.id}
                      variant={feature.isEnabled ? 'success' : 'secondary'}
                      className="rounded-full px-3 py-1"
                    >
                      {feature.featureKey.replace(/_/g, ' ')}
                      {feature.limitValue !== null ? ` • ${feature.limitValue}` : ''}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Subscribers</CardTitle>
            <CardDescription>Current vendor access state and expiry blockers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {memberships.map((membership) => (
              <div key={membership.id} className="rounded-xl border border-border/70 bg-background/30 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{membership.vendorProfile.businessName}</p>
                  <Badge variant={variantForStatus(membership.status)}>{membership.status}</Badge>
                  <Badge variant={variantForStatus(membership.paymentStatus)}>{membership.paymentStatus}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {membership.planName} • {membership.vendorProfile.user.phone} • expires{' '}
                  {membership.expiresAt ? new Date(membership.expiresAt).toLocaleDateString() : 'custom'}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Payment verification</CardTitle>
            <CardDescription>Manual or assisted payment approval workflow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {payments.map((payment) => (
              <div key={payment.id} className="rounded-xl border border-border/70 bg-background/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{payment.vendorProfile.businessName}</p>
                      <Badge variant={variantForStatus(payment.status)}>{payment.status}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      ₹{payment.amount} {payment.currency} • {payment.plan?.name ?? 'Unmapped plan'} •{' '}
                      {payment.providerReference ?? 'No reference'}
                    </p>
                  </div>
                  {payment.status === 'pending_verification' ? (
                    <div className="flex gap-2">
                      <VerifyPaymentButton paymentId={payment.id} decision="verify" />
                      <VerifyPaymentButton paymentId={payment.id} decision="reject" />
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>History</CardTitle>
            <CardDescription>Immutable subscription operations timeline.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {histories.map((history) => (
              <div key={history.id} className="rounded-xl border border-border/70 bg-background/30 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{history.action}</p>
                  <Badge variant="secondary">{history.plan?.name ?? 'No plan'}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {history.vendorProfile.businessName} • {history.vendorProfile.user.phone} •{' '}
                  {new Date(history.createdAt).toLocaleString()}
                </p>
                {history.notes ? (
                  <p className="mt-2 text-sm text-muted-foreground">{history.notes}</p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
