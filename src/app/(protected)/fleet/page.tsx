import { API_URL, ENV_HEADERS } from '@/lib/environment'
import { cookies } from 'next/headers'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FleetManagementPanel, type FleetData } from './fleet-management-panel'

async function getFleetData() {
  const cookieStore = await cookies()
  const token = cookieStore.get('vendero_admin_access_token')?.value
  if (!token) return null

  const response = await fetch(`${API_URL}/api/v1/admin/fleet`, {
    cache: 'no-store',
    headers: {
      ...ENV_HEADERS,
      authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) return null
  const payload = await response.json()
  return (payload.data?.data ?? payload.data) as FleetData
}

export default async function FleetPage() {
  const data = await getFleetData()
  const analytics = data?.analytics ?? {
    categoryCount: 0,
    activeCategoryCount: 0,
    cabCount: 0,
    activeCabCount: 0,
    averageOnewayPerKmRate: 0,
    averageRoundTripPerKmRate: 0,
  }

  return (
    <main className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Cabs & Fare
            </Badge>
            <CardTitle className="text-3xl">Manage cab categories, cabs, and fare engine rates</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7">
              These one-way and round-trip rates are used by trip previews, route quotes, and trip
              creation whenever a cab category or cab model is selected.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Fare Snapshot</CardTitle>
            <CardDescription>Current active fleet pricing posture.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Categories</p>
              <p className="mt-1 text-2xl font-semibold">{analytics.activeCategoryCount}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Cabs</p>
              <p className="mt-1 text-2xl font-semibold">{analytics.activeCabCount}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Avg one-way</p>
              <p className="mt-1 text-2xl font-semibold">{analytics.averageOnewayPerKmRate}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Avg round-trip</p>
              <p className="mt-1 text-2xl font-semibold">{analytics.averageRoundTripPerKmRate}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <FleetManagementPanel initialData={data} />
    </main>
  )
}
