'use client'

import * as React from 'react'
import { BarChart3, CalendarDays, CreditCard, ImagePlus, Layers3, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type DashboardTab = 'live' | 'vendors' | 'requests' | 'payments'
type ModalKind = 'pricing' | 'upload' | null
type PaymentFilterMode = 'month' | 'date' | 'custom'

export type BannerDashboardPaymentOrder = {
  id: string
  amount: number
  currency: string
  status: string
  createdAt: string | null
  paidAt: string | null
}

type BannerDashboardShellProps = {
  analytics: {
    activeTotal: number
    activeVendero: number
    activeVendor: number
    expiredBanners: number
    requestsToday: number
    currency: string
  }
  paymentOrders: BannerDashboardPaymentOrder[]
  counts: Record<DashboardTab, number>
  pricingContent: React.ReactNode
  uploadContent: React.ReactNode
  liveContent: React.ReactNode
  vendorContent: React.ReactNode
  requestContent: React.ReactNode
  paymentContent: React.ReactNode
}

function monthValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function dateValue(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function isPaidStatus(status: string) {
  return ['paid', 'verified', 'captured', 'success'].includes(status.toLowerCase())
}

function orderDate(order: BannerDashboardPaymentOrder) {
  const value = order.paidAt ?? order.createdAt
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function sameDate(left: Date, right: string) {
  return dateValue(left) === right
}

function filterOrders(
  orders: BannerDashboardPaymentOrder[],
  mode: PaymentFilterMode,
  selectedMonth: string,
  selectedDate: string,
  customFrom: string,
  customTo: string
) {
  return orders.filter((order) => {
    const date = orderDate(order)
    if (!date) return false

    if (mode === 'month') return monthValue(date) === selectedMonth
    if (mode === 'date') return sameDate(date, selectedDate)

    const from = customFrom ? new Date(`${customFrom}T00:00:00`) : null
    const to = customTo ? new Date(`${customTo}T23:59:59`) : null
    if (from && date < from) return false
    if (to && date > to) return false
    return true
  })
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value || 0)
}

function ModalSheet({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean
  title: string
  description: string
  onClose: () => void
  children: React.ReactNode
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
      <button aria-label="Close modal" className="absolute inset-0 cursor-default" type="button" onClick={onClose} />
      <div className="relative z-10 max-h-[88vh] w-full max-w-3xl overflow-auto rounded-2xl border border-border bg-card shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-border bg-card/95 p-5 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function BannerDashboardShell({
  analytics,
  paymentOrders,
  counts,
  pricingContent,
  uploadContent,
  liveContent,
  vendorContent,
  requestContent,
  paymentContent,
}: BannerDashboardShellProps) {
  const [activeTab, setActiveTab] = React.useState<DashboardTab>('live')
  const [modal, setModal] = React.useState<ModalKind>(null)
  const [paymentMode, setPaymentMode] = React.useState<PaymentFilterMode>('month')
  const [selectedMonth, setSelectedMonth] = React.useState(monthValue())
  const [selectedDate, setSelectedDate] = React.useState(dateValue())
  const [customFrom, setCustomFrom] = React.useState(dateValue())
  const [customTo, setCustomTo] = React.useState(dateValue())

  const filteredPayments = React.useMemo(
    () => filterOrders(paymentOrders, paymentMode, selectedMonth, selectedDate, customFrom, customTo),
    [customFrom, customTo, paymentMode, paymentOrders, selectedDate, selectedMonth]
  )
  const paidPayments = filteredPayments.filter((order) => isPaidStatus(order.status))
  const paidTotal = paidPayments.reduce((total, order) => total + Number(order.amount || 0), 0)
  const orderValue = filteredPayments.reduce((total, order) => total + Number(order.amount || 0), 0)

  const tabs: Array<{ id: DashboardTab; label: string; content: React.ReactNode }> = [
    { id: 'live', label: 'Live Banner List', content: liveContent },
    { id: 'vendors', label: 'Vendors Created Banners', content: vendorContent },
    { id: 'requests', label: 'Vendero Team Banner Requests', content: requestContent },
    { id: 'payments', label: 'Vendors Payments Orders List', content: paymentContent },
  ]

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <CardTitle className="text-3xl">Banner Ads Control Room</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7">
              Track Vendero ads, vendor banner orders, impressions, clicks, team call requests, and banner expiry from one place.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => setModal('upload')}>
              <ImagePlus className="h-4 w-4" />
              Upload Vendero ads
            </Button>
            <Button type="button" variant="outline" onClick={() => setModal('pricing')}>
              <Settings2 className="h-4 w-4" />
              Pricing control
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Total Order Payment</CardTitle>
            <CardDescription>Filter by month, single date, or custom date range.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'month', label: 'Month' },
                { id: 'date', label: 'Date wise' },
                { id: 'custom', label: 'Custom date' },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setPaymentMode(option.id as PaymentFilterMode)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-semibold',
                    paymentMode === option.id
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background/40 text-muted-foreground'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {paymentMode === 'month' ? (
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background/70 px-3 text-sm"
              />
            ) : null}
            {paymentMode === 'date' ? (
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background/70 px-3 text-sm"
              />
            ) : null}
            {paymentMode === 'custom' ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(event) => setCustomFrom(event.target.value)}
                  className="h-10 rounded-md border border-border bg-background/70 px-3 text-sm"
                />
                <input
                  type="date"
                  value={customTo}
                  onChange={(event) => setCustomTo(event.target.value)}
                  className="h-10 rounded-md border border-border bg-background/70 px-3 text-sm"
                />
              </div>
            ) : null}
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Paid total</p>
              <p className="mt-2 text-2xl font-semibold">{formatMoney(paidTotal, analytics.currency)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {paidPayments.length} paid / {filteredPayments.length} orders / value {formatMoney(orderValue, analytics.currency)}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70 bg-card/80">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Layers3 className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.16em]">Active banners</p>
            </div>
            <p className="mt-2 text-2xl font-semibold">{analytics.activeTotal}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Vendero {analytics.activeVendero} / Vendors {analytics.activeVendor}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/80">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.16em]">Payment orders</p>
            </div>
            <p className="mt-2 text-2xl font-semibold">{paymentOrders.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Vendor banner and team request orders</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/80">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.16em]">Calls today</p>
            </div>
            <p className="mt-2 text-2xl font-semibold">{analytics.requestsToday}</p>
            <p className="mt-1 text-xs text-muted-foreground">Scheduled or requested today</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/80">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.16em]">Expired banners</p>
            </div>
            <p className="mt-2 text-2xl font-semibold">{analytics.expiredBanners}</p>
            <p className="mt-1 text-xs text-muted-foreground">Status expired or end date crossed</p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition',
                  activeTab === tab.id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background/40 text-muted-foreground hover:bg-background'
                )}
              >
                {tab.label} <span className="ml-1 opacity-75">{counts[tab.id] ?? 0}</span>
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {tabs.find((tab) => tab.id === activeTab)?.content}
        </CardContent>
      </Card>

      <ModalSheet
        open={modal === 'pricing'}
        title="Pricing control"
        description="Switch banner charge methods and default prices."
        onClose={() => setModal(null)}
      >
        {pricingContent}
      </ModalSheet>
      <ModalSheet
        open={modal === 'upload'}
        title="Upload Vendero ads"
        description="Upload a Vendero-owned banner, choose image fit, tap action, and target audience."
        onClose={() => setModal(null)}
      >
        {uploadContent}
      </ModalSheet>
    </div>
  )
}
