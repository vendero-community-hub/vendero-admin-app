import { API_URL, ENV_HEADERS } from '@/lib/environment'
import { cookies } from 'next/headers'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ReferralProgramPanel, type ReferralProgramData } from './referral-program-panel'

async function getReferralProgramData() {
  const cookieStore = await cookies()
  const token = cookieStore.get('vendero_admin_access_token')?.value
  if (!token) return null

  const response = await fetch(`${API_URL}/api/v1/admin/referral-program`, {
    cache: 'no-store',
    headers: { ...ENV_HEADERS, authorization: `Bearer ${token}` },
  })

  if (!response.ok) return null
  const payload = await response.json()
  return (payload.data?.data ?? payload.data) as ReferralProgramData
}

function formatCurrency(amount: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(Number.isFinite(Number(amount)) ? Number(amount) : 0)
}

export default async function ReferralProgramPage() {
  const data = await getReferralProgramData()
  const analytics = data?.analytics ?? {
    activeReferrals: 0,
    closedReferrals: 0,
    paidRewardAmount: 0,
    payableRewardAmount: 0,
    qualifiedReferrals: 0,
    rewardingReferrals: 0,
    totalDiscountAmount: 0,
    totalReferrals: 0,
    totalRewardAmount: 0,
    vendorAccounts: 0,
    vendorSpecificRules: 0,
  }
  const currency = data?.settings?.currency ?? 'INR'

  return (
    <main className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="overflow-hidden border-emerald-400/20 bg-card/85">
          <CardHeader className="relative">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-300 via-sky-300 to-amber-300" />
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Reward Program
            </Badge>
            <CardTitle className="text-3xl">Referral rewards controlled by admin</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7">
              Configure global referral reward rules, close or activate specific vendors, set
              subscription purchase discounts, and track who referred whom with payable ledger
              entries.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Reward Snapshot</CardTitle>
            <CardDescription>Current referral program earning posture.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Payable</p>
              <p className="mt-1 text-2xl font-semibold">
                {formatCurrency(analytics.payableRewardAmount, currency)}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Qualified referrals</p>
              <p className="mt-1 text-2xl font-semibold">
                {analytics.qualifiedReferrals ?? analytics.rewardingReferrals ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Paid</p>
              <p className="mt-1 text-2xl font-semibold">
                {formatCurrency(analytics.paidRewardAmount, currency)}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Discounts</p>
              <p className="mt-1 text-2xl font-semibold">
                {formatCurrency(analytics.totalDiscountAmount, currency)}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <ReferralProgramPanel initialData={data} />
    </main>
  )
}
