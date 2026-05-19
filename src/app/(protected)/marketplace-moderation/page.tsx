import { API_URL, ENV_HEADERS } from '@/lib/environment'
import { cookies } from 'next/headers'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  MarketplaceModerationPanel,
  type MarketplaceModerationData,
} from './marketplace-moderation-panel'


async function getModerationData() {
  const cookieStore = await cookies()
  const token = cookieStore.get('vendero_admin_access_token')?.value
  if (!token) return null

  const response = await fetch(`${API_URL}/api/v1/admin/marketplace-moderation?limit=50`, {
    cache: 'no-store',
    headers: {
      ...ENV_HEADERS,
      authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) return null
  const payload = await response.json()
  return (payload.data?.data ?? payload.data) as MarketplaceModerationData
}

export default async function MarketplaceModerationPage() {
  const data = await getModerationData()
  const analytics = data?.analytics ?? {
    pendingListings: 0,
    pendingReviews: 0,
    pendingListingReports: 0,
    flaggedLeads: 0,
    blockedLeads: 0,
    leads24h: 0,
  }

  return (
    <main className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Marketplace Moderation
            </Badge>
            <CardTitle className="text-3xl">Approve listings, moderate reviews, and monitor lead abuse</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7">
              Review pending marketplace supply, keep public reviews clean, and stop suspicious lead
              patterns before they reach vendor workflows.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Trust Snapshot</CardTitle>
            <CardDescription>Current marketplace moderation posture.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Pending listings</p>
              <p className="mt-1 text-2xl font-semibold">{analytics.pendingListings}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Pending reviews</p>
              <p className="mt-1 text-2xl font-semibold">{analytics.pendingReviews}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Listing reports</p>
              <p className="mt-1 text-2xl font-semibold">{analytics.pendingListingReports}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Flagged leads</p>
              <p className="mt-1 text-2xl font-semibold">{analytics.flaggedLeads}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Blocked leads</p>
              <p className="mt-1 text-2xl font-semibold">{analytics.blockedLeads}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <MarketplaceModerationPanel initialData={data} />
    </main>
  )
}
