'use client'

import { useMemo, useState } from 'react'
import { Hash, Pencil, Plus, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useActionModal } from '@/components/ui/action-modal'

export type HashtagCatalogItem = {
  id: number
  tag: string
  category: string | null
  keywords: string[]
  guidance: string | null
  priority: number
  isActive: boolean
  createdAt: string | null
  updatedAt: string | null
}

function adminToken() {
  return document.cookie
    .split('; ')
    .find((part) => part.startsWith('vendero_admin_access_token='))
    ?.split('=')[1]
}

async function request(path: string, method = 'GET', body?: Record<string, unknown>) {
  const response = await fetch(path, {
    method,
    cache: 'no-store',
    headers: {
      authorization: `Bearer ${adminToken() ?? ''}`,
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.message ?? payload?.error?.message ?? 'Unable to save hashtag')
  }
  return payload?.data?.data ?? payload?.data ?? payload
}

function sortHashtags(items: HashtagCatalogItem[]) {
  return [...items].sort((a, b) => b.priority - a.priority || a.tag.localeCompare(b.tag))
}

export function InstagramHashtagsPanel({ initialHashtags }: { initialHashtags: HashtagCatalogItem[] }) {
  const [hashtags, setHashtags] = useState(sortHashtags(initialHashtags))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const actionModal = useActionModal()
  const shown = useMemo(() => hashtags.filter((item) =>
    `${item.tag} ${item.category ?? ''} ${item.keywords.join(' ')}`.toLowerCase().includes(filter.toLowerCase())
  ), [hashtags, filter])

  async function refresh() {
    setBusy(true)
    setError(null)
    try {
      const data = await request('/api/v1/admin/instagram/hashtags')
      setHashtags(sortHashtags(Array.isArray(data.hashtags) ? data.hashtags : []))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load hashtags')
    } finally {
      setBusy(false)
    }
  }

  async function edit(item?: HashtagCatalogItem) {
    const result = await actionModal.form({
      title: item ? `Edit ${item.tag}` : 'Add Instagram hashtag',
      description: 'Use topic keywords to suggest this tag when they appear in a vendor caption.',
      confirmLabel: item ? 'Save hashtag' : 'Add hashtag',
      fields: [
        { name: 'tag', label: 'Hashtag', defaultValue: item?.tag ?? '', placeholder: '#vadodarafood', required: true },
        { name: 'category', label: 'Category', defaultValue: item?.category ?? '', placeholder: 'Food' },
        { name: 'keywords', label: 'Topic keywords, comma separated', defaultValue: item?.keywords.join(', ') ?? '', placeholder: 'tiffin, lunch, vadodara' },
        { name: 'guidance', label: 'Why suggest it?', type: 'textarea', defaultValue: item?.guidance ?? '', placeholder: 'Good fit for local meal posts' },
        { name: 'priority', label: 'Priority (0–100)', defaultValue: String(item?.priority ?? 50), required: true },
        { name: 'isActive', label: 'Suggest to vendors', type: 'switch', defaultValue: item?.isActive ?? true },
      ],
    })
    if (!result.confirmed) return
    setBusy(true)
    setError(null)
    try {
      const data = await request(
        item ? `/api/v1/admin/instagram/hashtags/${item.id}` : '/api/v1/admin/instagram/hashtags',
        item ? 'PUT' : 'POST',
        {
          tag: result.values.tag,
          category: result.values.category,
          keywords: result.values.keywords,
          guidance: result.values.guidance,
          priority: Number(result.values.priority),
          isActive: result.values.isActive === 'true',
        }
      )
      const saved = data.hashtag as HashtagCatalogItem
      setHashtags((current) => sortHashtags([...current.filter((value) => value.id !== saved.id), saved]))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save hashtag')
    } finally {
      setBusy(false)
    }
  }

  async function toggle(item: HashtagCatalogItem) {
    setBusy(true)
    setError(null)
    try {
      const data = await request(`/api/v1/admin/instagram/hashtags/${item.id}`, 'PUT', {
        tag: item.tag,
        category: item.category,
        keywords: item.keywords,
        guidance: item.guidance,
        priority: item.priority,
        isActive: !item.isActive,
      })
      const saved = data.hashtag as HashtagCatalogItem
      setHashtags((current) => sortHashtags(current.map((value) => value.id === saved.id ? saved : value)))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update hashtag')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="border-border/70 bg-card/85">
      <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Curated hashtags</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {hashtags.filter((item) => item.isActive).length} active of {hashtags.length} total
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void refresh()} disabled={busy}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button onClick={() => void edit()} disabled={busy}>
            <Plus className="mr-2 h-4 w-4" /> Add hashtag
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          aria-label="Search curated hashtags"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:max-w-sm"
          placeholder="Search hashtags or topics"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
        {error ? <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
        {!shown.length ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            {filter ? 'No hashtags match this search.' : 'No hashtags yet. Add a curated tag to suggest it in Content Pilot and Ads.'}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((item) => (
              <div key={item.id} className="rounded-xl border border-border/70 bg-background/45 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-semibold"><Hash className="h-4 w-4" />{item.tag}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{item.category || 'All topics'} · Priority {item.priority}</p>
                  </div>
                  <Badge variant={item.isActive ? 'default' : 'outline'}>{item.isActive ? 'Active' : 'Paused'}</Badge>
                </div>
                {item.guidance ? <p className="mt-3 text-sm text-muted-foreground">{item.guidance}</p> : null}
                {item.keywords.length ? <p className="mt-3 text-xs text-muted-foreground">Matches: {item.keywords.join(', ')}</p> : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => void edit(item)} disabled={busy}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void toggle(item)} disabled={busy}>
                    {item.isActive ? 'Pause' : 'Activate'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      {actionModal.modal}
    </Card>
  )
}
