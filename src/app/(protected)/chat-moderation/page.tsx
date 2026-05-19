import { API_URL, ENV_HEADERS } from '@/lib/environment'
import { cookies } from 'next/headers'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChatModerationPanel,
  type ChatModerationData,
} from './chat-moderation-panel'


async function getModerationData() {
  const cookieStore = await cookies()
  const token = cookieStore.get('vendero_admin_access_token')?.value
  if (!token) return null

  const response = await fetch(`${API_URL}/api/v1/admin/chat-moderation?limit=30`, {
    cache: 'no-store',
    headers: {
      ...ENV_HEADERS,
      authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) return null
  const payload = await response.json()
  return (payload.data?.data ?? payload.data) as ChatModerationData
}

export default async function ChatModerationPage() {
  const data = await getModerationData()

  return (
    <main className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Chat Moderation
            </Badge>
            <CardTitle className="text-3xl">Moderate reports, broadcasts, and vendor chat access</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7">
              Search conversation metadata, inspect reported messages, revoke abusive broadcast
              fan-out, and apply temporary vendor chat blocks from one operator surface.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Risk Snapshot</CardTitle>
            <CardDescription>Live chat moderation posture.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Pending reports</p>
              <p className="mt-1 text-2xl font-semibold">{data?.analytics.pendingReports ?? 0}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Reports 24h</p>
              <p className="mt-1 text-2xl font-semibold">{data?.analytics.reports24h ?? 0}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Active blocks</p>
              <p className="mt-1 text-2xl font-semibold">{data?.analytics.activeBlocks ?? 0}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Revoked broadcasts</p>
              <p className="mt-1 text-2xl font-semibold">{data?.analytics.revokedBroadcasts ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <ChatModerationPanel initialData={data} />
    </main>
  )
}

