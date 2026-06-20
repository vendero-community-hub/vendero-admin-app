import { API_URL, ENV_HEADERS } from '@/lib/environment'
import { cookies } from 'next/headers'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SupportPanel, type SupportStaffRecord, type SupportThreadRecord } from './support-panel'

type StaffOverview = {
  staff: SupportStaffRecord[]
}

async function fetchJson<T>(path: string, token: string): Promise<T | null> {
  const response = await fetch(`${API_URL}${path}`, {
    cache: 'no-store',
    headers: {
      ...ENV_HEADERS,
      authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) return null
  const payload = await response.json().catch(() => ({}))
  return (payload.data?.data ?? payload.data ?? payload) as T
}

async function getSupportData() {
  const cookieStore = await cookies()
  const token = cookieStore.get('vendero_admin_access_token')?.value
  if (!token) return { threads: [], staff: [] }

  const [threads, staffOverview] = await Promise.all([
    fetchJson<SupportThreadRecord[]>('/api/v1/admin/support/threads', token),
    fetchJson<StaffOverview>('/api/v1/admin/staff', token),
  ])

  return {
    threads: Array.isArray(threads) ? threads : [],
    staff: Array.isArray(staffOverview?.staff) ? staffOverview.staff : [],
  }
}

export default async function SupportPage() {
  const data = await getSupportData()
  const activeTickets = data.threads.filter(
    (thread) => !['resolved', 'closed'].includes(thread.status)
  ).length
  const onlineVendors = data.threads.filter((thread) => thread.requesterOnline).length
  const unassignedTickets = data.threads.filter((thread) => !thread.assignedAdminUserId).length
  const pendingSupport = data.threads.filter((thread) => thread.status === 'pending_support').length

  return (
    <main className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Live Support
            </Badge>
            <CardTitle className="text-3xl">Admin to vendor ticket chat</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7">
              Handle active vendor support tickets over websocket chat, track online status, review
              shared documents, and transfer tickets between admin staff.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Support Snapshot</CardTitle>
            <CardDescription>Current ticket queue.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Active tickets</p>
              <p className="mt-1 text-2xl font-semibold">{activeTickets}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Vendors online</p>
              <p className="mt-1 text-2xl font-semibold">{onlineVendors}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Unassigned</p>
              <p className="mt-1 text-2xl font-semibold">{unassignedTickets}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Need reply</p>
              <p className="mt-1 text-2xl font-semibold">{pendingSupport}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <SupportPanel initialThreads={data.threads} staff={data.staff} />
    </main>
  )
}
