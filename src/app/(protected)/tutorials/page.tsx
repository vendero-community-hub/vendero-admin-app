import { API_URL, ENV_HEADERS } from '@/lib/environment'
import { cookies } from 'next/headers'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TutorialVideosPanel, type TutorialVideosData } from './tutorial-videos-panel'

async function getTutorialData() {
  const cookieStore = await cookies()
  const token = cookieStore.get('vendero_admin_access_token')?.value
  if (!token) return null

  const response = await fetch(`${API_URL}/api/v1/admin/tutorial-videos`, {
    cache: 'no-store',
    headers: { ...ENV_HEADERS, authorization: `Bearer ${token}` },
  })

  if (!response.ok) return null
  const payload = await response.json()
  return (payload.data?.data ?? payload.data) as TutorialVideosData
}

export default async function TutorialsPage() {
  const data = await getTutorialData()
  const summary = data?.summary ?? {
    videoCount: 0,
    publishedCount: 0,
    draftCount: 0,
    featureCount: 0,
    screenCount: 0,
  }

  return (
    <main className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Tutorial Control
            </Badge>
            <CardTitle className="text-3xl">Manage app video tutorials</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7">
              Add YouTube tutorial videos for the Help center and connect each video to a
              Vendero feature or mobile screen. Published videos appear inside the app cards.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Video Snapshot</CardTitle>
            <CardDescription>Current tutorial coverage in the mobile app.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Published</p>
              <p className="mt-1 text-2xl font-semibold">{summary.publishedCount}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Drafts</p>
              <p className="mt-1 text-2xl font-semibold">{summary.draftCount}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Features</p>
              <p className="mt-1 text-2xl font-semibold">{summary.featureCount}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Screens</p>
              <p className="mt-1 text-2xl font-semibold">{summary.screenCount}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <TutorialVideosPanel initialData={data} />
    </main>
  )
}
