import { API_URL, ENV_HEADERS } from '@/lib/environment'
import { cookies } from 'next/headers'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LandingSubmissionsPanel, type LandingSubmissionsData } from './landing-submissions-panel'

async function getLandingSubmissions() {
  const cookieStore = await cookies()
  const token = cookieStore.get('vendero_admin_access_token')?.value
  if (!token) return null

  const response = await fetch(`${API_URL}/api/v1/admin/landing/submissions?limit=80`, {
    cache: 'no-store',
    headers: { ...ENV_HEADERS, authorization: `Bearer ${token}` },
  })

  if (!response.ok) return null
  const payload = await response.json()
  return (payload.data?.data ?? payload.data) as LandingSubmissionsData
}

export default async function LandingRequestsPage() {
  const data = await getLandingSubmissions()
  const summary = data?.summary ?? { total: 0, byType: {}, byStatus: {} }

  return (
    <main className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Landing Requests
            </Badge>
            <CardTitle className="text-3xl">Review landing page operations and waitlist leads</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7">
              Contact forms, support reports, account deletion requests, and waitlist registrations are stored in the API and managed here.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Request Snapshot</CardTitle>
            <CardDescription>Current public landing intake.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Total</p>
              <p className="mt-1 text-2xl font-semibold">{summary.total}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">New</p>
              <p className="mt-1 text-2xl font-semibold">{summary.byStatus.new ?? 0}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Waitlist</p>
              <p className="mt-1 text-2xl font-semibold">{summary.byType.waitlist ?? 0}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Support</p>
              <p className="mt-1 text-2xl font-semibold">{summary.byType.support ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <LandingSubmissionsPanel initialData={data} />
    </main>
  )
}
