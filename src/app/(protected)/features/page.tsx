import { API_URL, ENV_HEADERS } from '@/lib/environment'
import { cookies } from 'next/headers'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FeatureControlPanel, type FeatureControlData } from './feature-control-panel'

async function getFeatureData() {
  const cookieStore = await cookies()
  const token = cookieStore.get('vendero_admin_access_token')?.value
  if (!token) return null

  const response = await fetch(`${API_URL}/api/v1/admin/features`, {
    cache: 'no-store',
    headers: { ...ENV_HEADERS, authorization: `Bearer ${token}` },
  })

  if (!response.ok) return null
  const payload = await response.json()
  return (payload.data?.data ?? payload.data) as FeatureControlData
}

export default async function FeaturesPage() {
  const data = await getFeatureData()
  const summary = data?.summary ?? {
    featureCount: 0,
    publishedCount: 0,
    availableCount: 0,
    comingSoonCount: 0,
    waitlistCount: 0,
    earlyAccessCount: 0,
    openInterestCount: 0,
  }

  return (
    <main className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Feature Control
            </Badge>
            <CardTitle className="text-3xl">Manage app feature cards and access requests</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7">
              The mobile New Features screen reads these cards from the API. Admins can publish
              available updates, prepare coming soon cards, and process waitlist or early access
              interest from vendors.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Feature Snapshot</CardTitle>
            <CardDescription>Current mobile feature list activity.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Published</p>
              <p className="mt-1 text-2xl font-semibold">{summary.publishedCount}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Coming soon</p>
              <p className="mt-1 text-2xl font-semibold">{summary.comingSoonCount}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Waitlist</p>
              <p className="mt-1 text-2xl font-semibold">{summary.waitlistCount}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Early access</p>
              <p className="mt-1 text-2xl font-semibold">{summary.earlyAccessCount}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <FeatureControlPanel initialData={data} />
    </main>
  )
}
