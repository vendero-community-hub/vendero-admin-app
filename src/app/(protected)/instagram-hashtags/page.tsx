import { cookies } from 'next/headers'
import { Hash } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { API_URL, ENV_HEADERS } from '@/lib/environment'
import { InstagramHashtagsPanel, type HashtagCatalogItem } from './instagram-hashtags-panel'

async function loadHashtags(): Promise<HashtagCatalogItem[]> {
  const token = (await cookies()).get('vendero_admin_access_token')?.value
  if (!token) return []
  const response = await fetch(`${API_URL}/api/v1/admin/instagram/hashtags`, {
    cache: 'no-store',
    headers: { ...ENV_HEADERS, authorization: `Bearer ${token}` },
  })
  if (!response.ok) return []
  const payload = await response.json().catch(() => ({}))
  const data = payload?.data?.data ?? payload?.data ?? payload
  return Array.isArray(data?.hashtags) ? data.hashtags : []
}

export default async function InstagramHashtagsPage() {
  const hashtags = await loadHashtags()
  return (
    <main className="space-y-6">
      <Card className="border-border/70 bg-card/85">
        <CardHeader>
          <Badge variant="outline" className="w-fit gap-2 rounded-full px-3 py-1">
            <Hash className="h-3.5 w-3.5" /> Content Pilot
          </Badge>
          <CardTitle className="text-3xl">Instagram hashtag finder</CardTitle>
          <CardDescription className="max-w-3xl text-sm leading-7">
            Curate tags that vendors can find and add in Content Pilot and Ads. Topic keywords help
            match tags to a caption; priority controls their order. These suggestions are editorial
            and do not claim measured Instagram reach.
          </CardDescription>
        </CardHeader>
      </Card>
      <InstagramHashtagsPanel initialHashtags={hashtags} />
    </main>
  )
}
