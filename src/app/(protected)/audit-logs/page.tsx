import { API_URL, ENV_HEADERS } from '@/lib/environment'
import { cookies } from 'next/headers'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AuditLogsPanel, type AuditLogsData } from './audit-logs-panel'


async function getAuditLogs() {
  const cookieStore = await cookies()
  const token = cookieStore.get('vendero_admin_access_token')?.value
  if (!token) return null

  const response = await fetch(`${API_URL}/api/v1/admin/audit-logs?limit=80`, {
    cache: 'no-store',
    headers: { ...ENV_HEADERS, authorization: `Bearer ${token}` },
  })

  if (!response.ok) return null
  const payload = await response.json()
  return (payload.data?.data ?? payload.data) as AuditLogsData
}

export default async function AuditLogsPage() {
  const data = await getAuditLogs()
  const analytics = data?.analytics ?? { total: 0, total24h: 0, actorCount24h: 0, topActions: [], topResources: [] }

  return (
    <main className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Audit Logs
            </Badge>
            <CardTitle className="text-3xl">Browse admin and platform audit events</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7">
              Search actions, resources, actor identity, request IDs, IP addresses, paths, and metadata.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Audit Snapshot</CardTitle>
            <CardDescription>Recorded operational history.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Total</p>
              <p className="mt-1 text-2xl font-semibold">{analytics.total}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">24h</p>
              <p className="mt-1 text-2xl font-semibold">{analytics.total24h}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Actors</p>
              <p className="mt-1 text-2xl font-semibold">{analytics.actorCount24h}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <AuditLogsPanel initialData={data} />
    </main>
  )
}
