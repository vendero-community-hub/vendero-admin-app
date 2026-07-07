import { cookies } from 'next/headers'
import { ShieldAlert } from 'lucide-react'
import { API_URL, ENV_HEADERS } from '@/lib/environment'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FraudAlertsPanel, type FraudAlertsData } from './fraud-alerts-panel'

async function getFraudAlertsData() {
  const cookieStore = await cookies()
  const token = cookieStore.get('vendero_admin_access_token')?.value
  if (!token) return null

  const response = await fetch(`${API_URL}/api/v1/admin/fraud-alerts?limit=80`, {
    cache: 'no-store',
    headers: {
      ...ENV_HEADERS,
      authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) return null
  const payload = await response.json()
  return (payload.data?.data ?? payload.data) as FraudAlertsData
}

export default async function FraudAlertsPage() {
  const data = await getFraudAlertsData()

  return (
    <main className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Fraud Alert Center
            </Badge>
            <CardTitle className="flex items-center gap-3 text-3xl">
              <ShieldAlert className="h-7 w-7 text-destructive" />
              Review vendor fraud reports
            </CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7">
              Users submit fraud contact name, number, and description from the mobile app.
              Review the cards here and delete unsafe or incorrect posts from the public center.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Risk Snapshot</CardTitle>
            <CardDescription>Live fraud alert moderation posture.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Active</p>
              <p className="mt-1 text-2xl font-semibold">{data?.analytics.activeReports ?? 0}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">24h</p>
              <p className="mt-1 text-2xl font-semibold">{data?.analytics.reports24h ?? 0}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Deleted</p>
              <p className="mt-1 text-2xl font-semibold">{data?.analytics.deletedReports ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <FraudAlertsPanel initialData={data} />
    </main>
  )
}
