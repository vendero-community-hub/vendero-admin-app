import { cookies } from 'next/headers'
import { Images } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { API_URL, ENV_HEADERS } from '@/lib/environment'
import {
  ImageLibraryPanel,
  type ImageLibraryPayload,
} from './image-library-panel'

const initialImageType = 'logo'

function recordValue(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {}
}

async function getInitialLibraryData(): Promise<ImageLibraryPayload> {
  const cookieStore = await cookies()
  const token = cookieStore.get('vendero_admin_access_token')?.value
  if (!token) return null

  let firstPage: Record<string, any> | null = null
  const items: unknown[] = []

  for (let page = 1; page <= 100; page += 1) {
    const search = new URLSearchParams({
      imageType: initialImageType,
      includeArchived: 'true',
      perPage: '100',
      page: String(page),
    })
    const response = await fetch(
      `${API_URL}/api/v1/admin/ai/reference-library?${search.toString()}`,
      {
        cache: 'no-store',
        headers: {
          ...ENV_HEADERS,
          authorization: `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) return firstPage ? { ...firstPage, items } : null
    const payload = await response.json().catch(() => null)
    const data = recordValue(payload?.data?.data ?? payload?.data ?? payload)
    if (!firstPage) firstPage = data
    const pageItems = Array.isArray(data.items)
      ? data.items
      : Array.isArray(data.images)
        ? data.images
        : []
    items.push(...pageItems)

    const meta = recordValue(data.meta)
    const lastPage = Number(meta.lastPage ?? meta.last_page ?? page)
    if (
      pageItems.length < 100 ||
      !Number.isFinite(lastPage) ||
      page >= lastPage
    ) {
      break
    }
  }

  return firstPage ? { ...firstPage, items } : null
}

export default async function ImageLibraryPage() {
  const initialData = await getInitialLibraryData()

  return (
    <main className="space-y-6">
      <Card className="overflow-hidden border-border/70 bg-card/85">
        <CardHeader className="relative">
          <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          <Badge variant="outline" className="w-fit gap-2 rounded-full px-3 py-1">
            <Images className="h-3.5 w-3.5" />
            AI Reference Library
          </Badge>
          <CardTitle className="text-3xl">Show users what great AI images can look like</CardTitle>
          <CardDescription className="max-w-3xl text-sm leading-7">
            Upload curated reference images, organize them by fixed image type and dynamic
            categories, and attach clear guidance that the AI composer can use with a vendor&apos;s
            own prompt and gallery images.
          </CardDescription>
        </CardHeader>
      </Card>

      <ImageLibraryPanel
        initialData={initialData}
        initialImageType={initialImageType}
      />
    </main>
  )
}
