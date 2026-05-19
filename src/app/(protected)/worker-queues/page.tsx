import { API_URL, ENV_HEADERS } from '@/lib/environment'
import { cookies } from 'next/headers'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WorkerQueuesPanel, type WorkerQueuesData } from './worker-queues-panel'


async function requestWorker(path: string, token: string) {
  const response = await fetch(`${API_URL}${path}`, {
    cache: 'no-store',
    headers: { ...ENV_HEADERS, authorization: `Bearer ${token}` },
  })
  if (!response.ok) return null
  const payload = await response.json()
  return payload.data?.data ?? payload.data
}

async function getWorkerData() {
  const cookieStore = await cookies()
  const token = cookieStore.get('vendero_admin_access_token')?.value
  if (!token) return null

  const [overview, failedJobs] = await Promise.all([
    requestWorker('/api/v1/admin/worker/overview', token),
    requestWorker('/api/v1/admin/worker/failed-jobs', token),
  ])

  return { overview, failedJobs } as WorkerQueuesData
}

export default async function WorkerQueuesPage() {
  const data = await getWorkerData()
  const totals = data?.overview?.totals ?? { pending: 0, delayed: 0, deadLetters: 0 }

  return (
    <main className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Worker Queues
            </Badge>
            <CardTitle className="text-3xl">Queue depth, dead letters, retries, and cancellations</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7">
              Monitor background job pressure across broadcast, WhatsApp, push, invoice, white-label,
              subscription, and maintenance pipelines.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Queue Snapshot</CardTitle>
            <CardDescription>Current Redis-backed worker posture.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Pending</p>
              <p className="mt-1 text-2xl font-semibold">{totals.pending}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Delayed</p>
              <p className="mt-1 text-2xl font-semibold">{totals.delayed}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Dead</p>
              <p className="mt-1 text-2xl font-semibold">{totals.deadLetters}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <WorkerQueuesPanel initialData={data} />
    </main>
  )
}
