import { API_URL, ENV_HEADERS } from '@/lib/environment'
import { cookies } from 'next/headers'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WhiteLabelAdminPanel, type WhiteLabelAdminData } from './white-label-admin-panel'


async function getOverview() {
  const cookieStore = await cookies()
  const token = cookieStore.get('vendero_admin_access_token')?.value
  if (!token) return null

  const response = await fetch(`${API_URL}/api/v1/admin/links/overview?limit=50`, {
    cache: 'no-store',
    headers: {
      ...ENV_HEADERS,
      authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) return null
  const payload = await response.json()
  return (payload.data?.data ?? payload.data) as WhiteLabelAdminData
}

export default async function AdminLinksPage() {
  const overview = await getOverview()

  return (
    <main className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              White Label
            </Badge>
            <CardTitle className="text-3xl">Public link control desk</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7">
              Search customer-facing links, revoke public access, review submissions, and audit
              customer opens across trip, lead, and tracking links.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Public Access</CardTitle>
            <CardDescription>Current white-label posture.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Active links</p>
              <p className="mt-1 text-2xl font-semibold">{overview?.analytics.byStatus.active ?? 0}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Revoked</p>
              <p className="mt-1 text-2xl font-semibold">{overview?.analytics.byStatus.revoked ?? 0}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Access 24h</p>
              <p className="mt-1 text-2xl font-semibold">{overview?.analytics.access24h ?? 0}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Submits 24h</p>
              <p className="mt-1 text-2xl font-semibold">{overview?.analytics.submissions24h ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <WhiteLabelAdminPanel initialData={overview} />
    </main>
  )
}

