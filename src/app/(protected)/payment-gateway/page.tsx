import { API_URL, ENV_HEADERS } from '@/lib/environment'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { ArrowRight, BadgeIndianRupee, CheckCircle2, Clock3, CreditCard, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  CreatePaymentButton,
  PaymentGatewaySettingsButton,
  VerifyPaymentButton,
  type PaymentGatewaySummary,
} from '../subscriptions/subscription-actions'

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

type PaymentGatewayOrder = {
  id: number
  publicId: string
  subscriptionPlanId: number | null
  amount: number
  currency: string
  paymentMethod: string | null
  providerName: string | null
  providerReference: string | null
  status: string
  kind: string | null
  orderId: string | null
  gatewayMode: string | null
  providerStatus: string | null
  membership: {
    id: number
    status: string
    paymentStatus: string
    planName: string | null
    planCode: string | null
    expiresAt: string | null
    active: boolean
  } | null
  createdAt: string | null
  paidAt: string | null
  vendorProfile: {
    businessName: string
    phone: string | null
    email: string | null
  } | null
  plan: {
    name: string
    code: string
  } | null
}

type PaymentGatewayOrdersData = {
  analytics: {
    totalOrders: number
    createdOrders: number
    pendingOrders: number
    verifiedOrders: number
    failedOrders: number
    totalCapturedAmount: number
  }
  orders: PaymentGatewayOrder[]
  plans: Plan[]
  paymentGateway: PaymentGatewaySummary | null
}

async function getPaymentGatewayOrders() {
  const cookieStore = await cookies()
  const token = cookieStore.get('vendero_admin_access_token')?.value
  if (!token) return null

  const response = await fetch(`${API_URL}/api/v1/admin/subscriptions/payment-gateway/orders`, {
    cache: 'no-store',
    headers: {
      ...ENV_HEADERS,
      authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) return null
  const payload = await response.json()
  return (payload.data?.data ?? payload.data) as PaymentGatewayOrdersData
}

function formatCurrency(amount: string | number | null | undefined, currency = 'INR') {
  const value = Number(amount ?? 0)
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(Number.isFinite(value) ? value : 0)
}

function formatDate(value?: string | null) {
  if (!value) return 'Not set'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not set'
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function variantForStatus(status: string): 'success' | 'warning' | 'danger' | 'secondary' {
  if (['active', 'verified', 'captured'].includes(status)) return 'success'
  if (['expired', 'rejected', 'failed', 'refunded'].includes(status)) return 'danger'
  if (['pending_verification', 'initiated', 'created', 'authorized'].includes(status)) return 'warning'
  return 'secondary'
}

function orderKindLabel(order: PaymentGatewayOrder) {
  if (order.kind === 'one_time_checkout') return 'Checkout order'
  if (order.kind === 'subscription_authorization') return 'Subscription authorization'
  if (order.kind === 'subscription_cycle_payment') return 'Subscription cycle'
  return order.paymentMethod ?? 'Payment order'
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CreditCard
  label: string
  value: string | number
}) {
  return (
    <Card className="border-border/70 bg-card/80">
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-3 text-3xl font-semibold">{value}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-secondary/60 p-3">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardContent>
    </Card>
  )
}

export default async function PaymentGatewayPage() {
  const data = await getPaymentGatewayOrders()
  const analytics = data?.analytics ?? {
    createdOrders: 0,
    failedOrders: 0,
    pendingOrders: 0,
    totalCapturedAmount: 0,
    totalOrders: 0,
    verifiedOrders: 0,
  }
  const orders = data?.orders ?? []
  const plans = data?.plans ?? []

  return (
    <main className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Payment Gateway
            </Badge>
            <CardTitle className="text-3xl">Gateway orders and tracking events</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7">
              Track every Razorpay order, subscription authorization, status update, captured payment,
              failed payment, and related subscription event from one page.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <PaymentGatewaySettingsButton summary={data?.paymentGateway ?? null} />
            <CreatePaymentButton plans={plans} />
            <Button asChild variant="outline">
              <Link href="/subscriptions">Back to subscriptions</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Gateway mode</CardTitle>
            <CardDescription>Active checkout configuration.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Badge variant="default" className="rounded-full px-3 py-1">
              {data?.paymentGateway?.modeLabel ?? 'Not configured'}
            </Badge>
            <p className="text-muted-foreground">
              {data?.paymentGateway?.checkout?.configured
                ? `Checkout key: ${data.paymentGateway.checkout.maskedKeyId ?? 'configured'}`
                : 'Configure Razorpay keys before live checkout.'}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={CreditCard} label="Total orders" value={analytics.totalOrders} />
        <StatCard icon={Clock3} label="Created orders" value={analytics.createdOrders} />
        <StatCard icon={Clock3} label="Pending" value={analytics.pendingOrders} />
        <StatCard icon={CheckCircle2} label="Verified" value={analytics.verifiedOrders} />
        <StatCard
          icon={BadgeIndianRupee}
          label="Captured revenue"
          value={formatCurrency(analytics.totalCapturedAmount)}
        />
      </section>

      <section>
        <Card className="border-border/70 bg-card/80">
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardDescription className="uppercase tracking-[0.2em] text-muted-foreground">
                  Order Created List Status
                </CardDescription>
                <CardTitle className="mt-2 text-2xl">Payment orders</CardTitle>
                <CardDescription className="mt-2">
                  Open an order to view checkout, verification, webhook, and admin tracking events.
                </CardDescription>
              </div>
              <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
                {orders.length} shown
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {orders.length ? (
              <div className="overflow-hidden rounded-lg border border-border/70">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="bg-background/60 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Order</th>
                      <th className="px-4 py-3">Vendor</th>
                      <th className="px-4 py-3">Plan</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => {
                      const canCreateSubscription =
                        order.kind === 'one_time_checkout' &&
                        order.status === 'verified' &&
                        Boolean(order.subscriptionPlanId) &&
                        !order.membership?.active

                      return (
                        <tr key={order.id} className="border-t border-border/60">
                          <td className="px-4 py-4">
                            <p className="font-medium">{orderKindLabel(order)}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {order.orderId ?? order.providerReference ?? order.publicId}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-medium">
                              {order.vendorProfile?.businessName ?? 'Unknown vendor'}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {order.vendorProfile?.phone ?? 'No phone'}
                            </p>
                          </td>
                          <td className="px-4 py-4">{order.plan?.name ?? 'Unmapped plan'}</td>
                          <td className="px-4 py-4 font-semibold">
                            {formatCurrency(order.amount, order.currency)}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-2">
                              <Badge variant={variantForStatus(order.status)}>{order.status}</Badge>
                              {order.providerStatus ? (
                                <Badge variant="secondary">{order.providerStatus}</Badge>
                              ) : null}
                              {order.membership ? (
                                <Badge variant={order.membership.active ? 'success' : 'warning'}>
                                  subscription {order.membership.active ? 'active' : order.membership.status}
                                </Badge>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-muted-foreground">{formatDate(order.createdAt)}</td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-2">
                              <Button asChild size="sm" variant="outline">
                                <Link href={`/payment-gateway/${order.publicId ?? order.id}`}>
                                  Details
                                  <ArrowRight className="h-4 w-4" />
                                </Link>
                              </Button>
                              {order.status === 'pending_verification' ? (
                                <>
                                  <VerifyPaymentButton paymentId={order.id} decision="verify" />
                                  <VerifyPaymentButton paymentId={order.id} decision="reject" />
                                </>
                              ) : canCreateSubscription ? (
                                <VerifyPaymentButton
                                  paymentId={order.id}
                                  decision="verify"
                                  label="Create subscription"
                                  verifyTitle="Create subscription with this order?"
                                  verifyDescription={
                                    'This order is already verified but the vendor does not have active ' +
                                    'subscription access. This will start subscription access from now using this order.'
                                  }
                                  verifyConfirmLabel="Create subscription"
                                  defaultNotes="Subscription activated from verified order"
                                />
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex min-h-32 items-center justify-center rounded-lg border border-border/70 bg-background/30 text-sm text-muted-foreground">
                <XCircle className="mr-2 h-4 w-4" />
                No payment gateway orders found.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
