import { API_URL, ENV_HEADERS } from '@/lib/environment'
import { cookies } from 'next/headers'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TripOperationsPanel, type TripOperationsData } from './trip-operations-panel'


async function getTrips() {
  const cookieStore = await cookies()
  const token = cookieStore.get('vendero_admin_access_token')?.value
  if (!token) return null

  const response = await fetch(`${API_URL}/api/v1/admin/trips?limit=25`, {
    cache: 'no-store',
    headers: {
      ...ENV_HEADERS,
      authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) return null
  const payload = await response.json()
  return (payload.data?.data ?? payload.data) as TripOperationsData
}

export default async function TripsPage() {
  const data = await getTrips()

  return (
    <main className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Trip Operations
            </Badge>
            <CardTitle className="text-3xl">Search trips and audit sharing conflicts</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7">
              Inspect trip lifecycle, accepted vendor handoff, recipient state, public links, and
              request conflicts from one admin workspace.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Snapshot</CardTitle>
            <CardDescription>Current trip operations posture.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Open</p>
              <p className="mt-1 text-2xl font-semibold">{data?.analytics.byStatus.open ?? 0}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Shared</p>
              <p className="mt-1 text-2xl font-semibold">{data?.analytics.byStatus.shared ?? 0}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Accepted</p>
              <p className="mt-1 text-2xl font-semibold">{data?.analytics.byStatus.accepted ?? 0}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Conflict flags</p>
              <p className="mt-1 text-2xl font-semibold">{data?.analytics.conflictTripCount ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <TripOperationsPanel initialData={data} />
    </main>
  )
}
