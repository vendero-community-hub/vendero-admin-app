import { API_URL, ENV_HEADERS } from '@/lib/environment'
import { cookies } from 'next/headers'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StoreServicesPanel, type StoreServicesData } from './store-services-panel'

async function getStoreServicesData() {
  const cookieStore = await cookies()
  const token = cookieStore.get('vendero_admin_access_token')?.value
  if (!token) return null

  const response = await fetch(`${API_URL}/api/v1/admin/store-services`, {
    cache: 'no-store',
    headers: { ...ENV_HEADERS, authorization: `Bearer ${token}` },
  })

  if (!response.ok) return null
  const payload = await response.json()
  return (payload.data?.data ?? payload.data) as StoreServicesData
}

export default async function StoreServicesPage() {
  const data = await getStoreServicesData()
  const services = data?.services ?? []
  const requests = data?.requests ?? []
  const quoteReady = requests.filter((request) => request.status === 'quote_ready').length
  const needsInfo = requests.filter((request) => request.status === 'needs_info').length

  return (
    <main className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Vendero Store
            </Badge>
            <CardTitle className="text-3xl">Manage service cards, quotes, and delivery resources</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7">
              These cards power the mobile Store module. Publish Vendero-owned services, attach
              preview and PDF links, collect requirements, set final quote amounts, request missing
              information, and add final documents or resource links when work is complete.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Store Snapshot</CardTitle>
            <CardDescription>Current catalog and request status.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Services</p>
              <p className="mt-1 text-2xl font-semibold">{services.length}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Requests</p>
              <p className="mt-1 text-2xl font-semibold">{requests.length}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Quote ready</p>
              <p className="mt-1 text-2xl font-semibold">{quoteReady}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Needs info</p>
              <p className="mt-1 text-2xl font-semibold">{needsInfo}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <StoreServicesPanel initialData={data} />
    </main>
  )
}
