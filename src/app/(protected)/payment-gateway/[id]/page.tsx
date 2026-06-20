import { API_URL, ENV_HEADERS } from '@/lib/environment'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Clock3, CreditCard, FileJson2, Route } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type PaymentGatewayOrder = {
  id: number
  publicId: string
  amount: number
  currency: string
  paymentMethod: string | null
  providerName: string | null
  providerReference: string | null
  status: string
  verificationNotes: string | null
  kind: string | null
  orderId: string | null
  gatewayMode: string | null
  providerStatus: string | null
  createdAt: string | null
  updatedAt: string | null
  paidAt: string | null
  verifiedAt: string | null
  metadata: Record<string, unknown>
  vendorProfile: {
    businessName: string
    ownerName: string | null
    phone: string | null
    email: string | null
  } | null
  plan: {
    name: string
    code: string
  } | null
}

type PaymentEvent = {
  id: string
  source: 'subscription_history' | 'audit_log'
  action: string
  notes: string | null
  createdAt: string | null
  metadata: Record<string, unknown>
  method?: string | null
  path?: string | null
}

type PaymentGatewayOrderDetail = {
  order: PaymentGatewayOrder
  events: PaymentEvent[]
}

async function getOrderDetail(id: string) {
  const cookieStore = await cookies()
  const token = cookieStore.get('vendero_admin_access_token')?.value
  if (!token) return null

  const response = await fetch(`${API_URL}/api/v1/admin/subscriptions/payment-gateway/orders/${id}`, {
    cache: 'no-store',
    headers: {
      ...ENV_HEADERS,
      authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) return null
  const payload = await response.json()
  return (payload.data?.data ?? payload.data) as PaymentGatewayOrderDetail
}

async function resolveParams(params: Promise<{ id: string }>) {
  return params
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
  if (order.kind === 'subscription_cycle_payment') return 'Subscription cycle payment'
  return order.paymentMethod ?? 'Payment order'
}

function metadataRows(metadata: Record<string, unknown>) {
  return Object.entries(metadata)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .slice(0, 28)
}

export default async function PaymentGatewayOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await resolveParams(params)
  const detail = await getOrderDetail(resolvedParams.id)

  if (!detail) {
    return (
      <main className="space-y-4">
        <Button asChild variant="outline">
          <Link href="/payment-gateway">
            <ArrowLeft className="h-4 w-4" />
            Back to payment gateway
          </Link>
        </Button>
        <Card className="border-border/70 bg-card/80">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Payment gateway order not found or unavailable.
          </CardContent>
        </Card>
      </main>
    )
  }

  const { order, events } = detail

  return (
    <main className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline">
          <Link href="/payment-gateway">
            <ArrowLeft className="h-4 w-4" />
            Back to orders
          </Link>
        </Button>
        <Badge variant={variantForStatus(order.status)} className="rounded-full px-3 py-1">
          {order.status}
        </Badge>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Payment Order #{order.id}
            </Badge>
            <CardTitle className="text-3xl">{orderKindLabel(order)}</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7">
              Tracking detail for order creation, checkout verification, gateway webhook updates,
              admin review actions, and subscription access changes.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Amount</CardTitle>
            <CardDescription>{order.plan?.name ?? 'Unmapped plan'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-3xl font-semibold">{formatCurrency(order.amount, order.currency)}</p>
            <p className="text-muted-foreground">{order.vendorProfile?.businessName ?? 'Unknown vendor'}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70 bg-card/80">
          <CardContent className="flex items-start gap-3 p-5">
            <CreditCard className="mt-1 h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Provider reference</p>
              <p className="mt-2 break-all text-sm font-medium">
                {order.orderId ?? order.providerReference ?? order.publicId}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/80">
          <CardContent className="flex items-start gap-3 p-5">
            <Clock3 className="mt-1 h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="mt-2 text-sm font-medium">{formatDate(order.createdAt)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/80">
          <CardContent className="flex items-start gap-3 p-5">
            <CheckCircle2 className="mt-1 h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Verified / paid</p>
              <p className="mt-2 text-sm font-medium">
                {formatDate(order.verifiedAt ?? order.paidAt)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/80">
          <CardContent className="flex items-start gap-3 p-5">
            <Route className="mt-1 h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Events tracked</p>
              <p className="mt-2 text-sm font-medium">{events.length}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Order metadata</CardTitle>
            <CardDescription>Gateway ids, pricing ids, checkout state, and source fields.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {metadataRows(order.metadata).length ? (
              metadataRows(order.metadata).map(([key, value]) => (
                <div
                  key={key}
                  className="grid gap-2 rounded-lg border border-border/70 bg-background/30 p-3 text-sm md:grid-cols-[180px_1fr]"
                >
                  <p className="font-medium text-muted-foreground">{key}</p>
                  <p className="break-all">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</p>
                </div>
              ))
            ) : (
              <div className="flex min-h-24 items-center justify-center rounded-lg border border-border/70 bg-background/30 text-sm text-muted-foreground">
                <FileJson2 className="mr-2 h-4 w-4" />
                No metadata stored for this order.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Event tracking</CardTitle>
            <CardDescription>Subscription history and admin audit events related to this payment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {events.length ? (
              events.map((event) => (
                <div key={event.id} className="rounded-lg border border-border/70 bg-background/30 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{event.action}</p>
                      <Badge variant="secondary">{event.source.replace('_', ' ')}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(event.createdAt)}</p>
                  </div>
                  {event.notes ? (
                    <p className="mt-2 text-sm text-muted-foreground">{event.notes}</p>
                  ) : null}
                  {metadataRows(event.metadata).length ? (
                    <div className="mt-3 grid gap-2 text-xs md:grid-cols-2">
                      {metadataRows(event.metadata)
                        .slice(0, 8)
                        .map(([key, value]) => (
                          <p
                            key={`${event.id}-${key}`}
                            className="rounded-md border border-border/60 bg-background/45 px-2 py-1 text-muted-foreground"
                          >
                            {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </p>
                        ))}
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="flex min-h-24 items-center justify-center rounded-lg border border-border/70 bg-background/30 text-sm text-muted-foreground">
                No tracking events found for this payment.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
