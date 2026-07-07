import { API_URL, ENV_HEADERS } from '@/lib/environment'
import { cookies } from 'next/headers'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FeatureAnalyticsPanel, type FeatureAnalyticsData } from './feature-analytics-panel'

async function getFeatureAnalytics() {
  const cookieStore = await cookies()
  const token = cookieStore.get('vendero_admin_access_token')?.value
  if (!token) return null

  const response = await fetch(`${API_URL}/api/v1/admin/features/analytics`, {
    cache: 'no-store',
    headers: { ...ENV_HEADERS, authorization: `Bearer ${token}` },
  })

  if (!response.ok) return null
  const payload = await response.json()
  return (payload.data?.data ?? payload.data) as FeatureAnalyticsData
}

export default async function FeatureAnalyticsPage() {
  const data = await getFeatureAnalytics()
  const summary = data?.summary ?? {
    featureCount: 0,
    enabledFeatureCount: 0,
    usedFeatureCount: 0,
    unusedFeatureCount: 0,
    eventCount: 0,
    activeVendorCount: 0,
    totalVendorCount: 0,
  }

  return (
    <main className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Feature Analytics
            </Badge>
            <CardTitle className="text-3xl">Vendor feature usage dashboard</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7">
              See which vendors use each mobile feature, which features are unused, and which live or
              upcoming modules need review.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Usage Snapshot</CardTitle>
            <CardDescription>Silent mobile analytics from the vendor app.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Used features</p>
              <p className="mt-1 text-2xl font-semibold">{summary.usedFeatureCount}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Unused</p>
              <p className="mt-1 text-2xl font-semibold">{summary.unusedFeatureCount}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Events</p>
              <p className="mt-1 text-2xl font-semibold">{summary.eventCount}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Vendors</p>
              <p className="mt-1 text-2xl font-semibold">{summary.activeVendorCount}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <FeatureAnalyticsPanel initialData={data} />
    </main>
  )
}
