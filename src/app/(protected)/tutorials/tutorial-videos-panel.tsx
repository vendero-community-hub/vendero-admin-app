'use client'

import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, RefreshCw, Trash2, Video } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useActionModal } from '@/components/ui/action-modal'

type TutorialVideo = {
  id: number
  publicId: string
  title: string
  description: string | null
  videoUrl: string
  videoId: string
  provider: 'youtube'
  tag: string | null
  featureKey: string | null
  screenKey: string | null
  sortOrder: number
  isPublished: boolean
  metadata: Record<string, unknown> | null
  createdAt: string | null
  updatedAt: string | null
}

type FeatureOption = {
  id: number
  publicId: string
  title: string
  status: 'available' | 'coming_soon'
}

export type TutorialVideosData = {
  summary: {
    videoCount: number
    publishedCount: number
    draftCount: number
    featureCount: number
    screenCount: number
  }
  videos: TutorialVideo[]
} | null

type TutorialForm = {
  id?: number
  title: string
  description: string
  videoUrl: string
  tag: string
  featureKey: string
  screenKey: string
  sortOrder: string
  isPublished: boolean
}

const emptyForm: TutorialForm = {
  title: '',
  description: '',
  videoUrl: '',
  tag: 'Video',
  featureKey: '',
  screenKey: '',
  sortOrder: '100',
  isPublished: true,
}

const baseFeatureOptions = [
  { value: '', label: 'Select feature' },
  { value: 'help', label: 'Help' },
  { value: 'community', label: 'Community' },
  { value: 'trips', label: 'Trips' },
  { value: 'store', label: 'Store services' },
  { value: 'features', label: 'New features' },
  { value: 'crm', label: 'CRM' },
]

const screenOptions = [
  { value: '', label: 'Select screen' },
  { value: 'vendor_help', label: 'Help center' },
  { value: 'vendor_search', label: 'Vendor search' },
  { value: 'trips', label: 'Trips' },
  { value: 'store_services', label: 'Store services' },
  { value: 'new_features', label: 'New features' },
  { value: 'crm_dashboard', label: 'CRM dashboard' },
]

function getAdminToken() {
  const tokenEntry = document.cookie
    .split('; ')
    .find((part) => part.startsWith('vendero_admin_access_token='))
  return tokenEntry?.split('=')[1] ?? null
}

function unwrapPayload(payload: any) {
  return payload?.data?.data ?? payload?.data ?? payload
}

async function requestJson(path: string, body?: Record<string, unknown>, method = 'GET') {
  const token = getAdminToken()
  const response = await fetch(path, {
    method,
    headers: {
      'content-type': 'application/json',
      authorization: token ? `Bearer ${token}` : '',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload?.message ?? payload?.error?.message ?? 'Request failed')
  }

  return unwrapPayload(payload)
}

function fallbackData(): NonNullable<TutorialVideosData> {
  return {
    summary: {
      videoCount: 0,
      publishedCount: 0,
      draftCount: 0,
      featureCount: 0,
      screenCount: 0,
    },
    videos: [],
  }
}

function label(value: string | null | undefined) {
  if (!value) return 'Not set'
  return value.replace(/_/g, ' ')
}

function optionLabel(options: { value: string; label: string }[], value: string) {
  return options.find((option) => option.value === value)?.label ?? label(value)
}

function addCount(map: Map<string, number>, value: string | null | undefined) {
  if (!value) return
  map.set(value, (map.get(value) ?? 0) + 1)
}

function uniqueOptions(options: { value: string; label: string }[]) {
  const seen = new Set<string>()
  return options.filter((option) => {
    if (!option.value) return true
    if (seen.has(option.value)) return false
    seen.add(option.value)
    return true
  })
}

function formFromVideo(video: TutorialVideo): TutorialForm {
  return {
    id: video.id,
    title: video.title,
    description: video.description ?? '',
    videoUrl: video.videoUrl,
    tag: video.tag ?? '',
    featureKey: video.featureKey ?? '',
    screenKey: video.screenKey ?? '',
    sortOrder: String(video.sortOrder),
    isPublished: video.isPublished,
  }
}

export function TutorialVideosPanel({ initialData }: { initialData: TutorialVideosData }) {
  const [data, setData] = useState<NonNullable<TutorialVideosData>>(initialData ?? fallbackData())
  const [form, setForm] = useState<TutorialForm>(emptyForm)
  const [modalOpen, setModalOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<
    { type: 'all'; key: 'all' } | { type: 'feature' | 'screen'; key: string }
  >({ type: 'all', key: 'all' })
  const [featureCards, setFeatureCards] = useState<FeatureOption[]>([])
  const [working, setWorking] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const actionModal = useActionModal()

  useEffect(() => {
    let active = true

    requestJson('/api/v1/admin/features')
      .then((payload) => {
        const features = Array.isArray(payload?.features) ? payload.features : []
        if (active) {
          setFeatureCards(
            features
              .filter((feature: Partial<FeatureOption>) => feature.publicId && feature.title)
              .map((feature: Partial<FeatureOption>) => ({
                id: Number(feature.id),
                publicId: String(feature.publicId),
                title: String(feature.title),
                status: feature.status === 'available' ? 'available' : 'coming_soon',
              }))
          )
        }
      })
      .catch(() => {
        if (active) setFeatureCards([])
      })

    return () => {
      active = false
    }
  }, [])

  const tutorialFeatureOptions = useMemo(
    () =>
      uniqueOptions([
        ...baseFeatureOptions,
        ...featureCards.map((feature) => ({
          value: feature.publicId,
          label: feature.title,
        })),
      ]),
    [featureCards]
  )

  const filterChips = useMemo(() => {
    const featureCounts = new Map<string, number>()
    const screenCounts = new Map<string, number>()

    data.videos.forEach((video) => {
      addCount(featureCounts, video.featureKey)
      addCount(screenCounts, video.screenKey)
    })

    const chips = [
      {
        id: 'all',
        type: 'all' as const,
        key: 'all',
        prefix: '',
        label: 'All',
        count: data.videos.length,
      },
      ...Array.from(featureCounts.entries()).map(([key, count]) => ({
        id: `feature:${key}`,
        type: 'feature' as const,
        key,
        prefix: 'Feature',
        label: optionLabel(tutorialFeatureOptions, key),
        count,
      })),
      ...Array.from(screenCounts.entries()).map(([key, count]) => ({
        id: `screen:${key}`,
        type: 'screen' as const,
        key,
        prefix: 'Screen',
        label: optionLabel(screenOptions, key),
        count,
      })),
    ]

    return chips.sort((left, right) => {
      if (left.type !== right.type) {
        if (left.type === 'all') return -1
        if (right.type === 'all') return 1
        if (left.type === 'feature') return -1
        return 1
      }
      return left.label.localeCompare(right.label)
    })
  }, [data.videos, tutorialFeatureOptions])

  useEffect(() => {
    const activeFilterId =
      activeFilter.type === 'all' ? 'all' : `${activeFilter.type}:${activeFilter.key}`
    if (!filterChips.some((chip) => chip.id === activeFilterId)) {
      setActiveFilter({ type: 'all', key: 'all' })
    }
  }, [activeFilter, filterChips])

  const filteredVideos = useMemo(() => {
    const sorted = [...data.videos].sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id)
    if (activeFilter.type === 'feature') return sorted.filter((video) => video.featureKey === activeFilter.key)
    if (activeFilter.type === 'screen') return sorted.filter((video) => video.screenKey === activeFilter.key)
    return sorted
  }, [activeFilter, data.videos])

  async function refresh() {
    const nextData = (await requestJson('/api/v1/admin/tutorial-videos')) as NonNullable<TutorialVideosData>
    setData(nextData)
  }

  function openCreate() {
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(video: TutorialVideo) {
    setForm(formFromVideo(video))
    setModalOpen(true)
  }

  async function submitVideo() {
    setWorking('save')
    setMessage('')
    try {
      const body = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        videoUrl: form.videoUrl.trim(),
        tag: form.tag.trim() || null,
        featureKey: form.featureKey.trim() || null,
        screenKey: form.screenKey.trim() || null,
        sortOrder: Number(form.sortOrder || 0),
        isPublished: form.isPublished,
      }

      if (form.id) {
        await requestJson(`/api/v1/admin/tutorial-videos/${form.id}`, body, 'PUT')
        setMessage('Tutorial video updated.')
      } else {
        await requestJson('/api/v1/admin/tutorial-videos', body, 'POST')
        setMessage('Tutorial video created.')
      }

      setModalOpen(false)
      setForm(emptyForm)
      await refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save tutorial video')
    } finally {
      setWorking(null)
    }
  }

  async function deleteVideo(video: TutorialVideo) {
    const confirmed = await actionModal.confirm({
      title: `Delete ${video.title}?`,
      description: 'This removes the tutorial from the Help center and screen video cards.',
      confirmLabel: 'Delete video',
      variant: 'danger',
    })
    if (!confirmed) return

    setWorking(`delete-${video.id}`)
    setMessage('')
    try {
      await requestJson(`/api/v1/admin/tutorial-videos/${video.id}`, undefined, 'DELETE')
      setMessage('Tutorial video deleted.')
      await refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to delete tutorial video')
    } finally {
      setWorking(null)
    }
  }

  return (
    <>
      <section className="space-y-6">
        {message ? (
          <p className="rounded-md border border-border/70 bg-background/40 px-4 py-3 text-sm text-muted-foreground">
            {message}
          </p>
        ) : null}

        <Card className="border-border/70 bg-card/85">
          <CardHeader className="gap-4 lg:flex-row lg:items-start lg:justify-between lg:space-y-0">
            <div>
              <CardTitle>Tutorial videos</CardTitle>
              <CardDescription>Filter by the exact feature or screen key connected to each video.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={refresh}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Add tutorial
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="-mx-1 overflow-x-auto px-1">
              <div className="flex w-max gap-2 pb-1">
                {filterChips.map((chip) => {
                  const active =
                    activeFilter.type === chip.type &&
                    (chip.type === 'all' || activeFilter.key === chip.key)
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() =>
                        setActiveFilter(
                          chip.type === 'all'
                            ? { type: 'all', key: 'all' }
                            : { type: chip.type, key: chip.key }
                        )
                      }
                      className={[
                        'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition',
                        active
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border bg-background/70 text-foreground hover:border-foreground/50',
                      ].join(' ')}
                    >
                      <span className="flex max-w-56 flex-col leading-none">
                        {chip.prefix ? (
                          <span
                            className={[
                              'text-[10px] font-bold uppercase tracking-normal',
                              active ? 'text-background/70' : 'text-muted-foreground',
                            ].join(' ')}
                          >
                            {chip.prefix}
                          </span>
                        ) : null}
                        <span className="truncate capitalize">{chip.label}</span>
                      </span>
                      <span
                        className={[
                          'rounded-full px-2 py-0.5 text-xs',
                          active ? 'bg-background/20 text-background' : 'bg-muted text-muted-foreground',
                        ].join(' ')}
                      >
                        {chip.count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {!filteredVideos.length ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No tutorial videos found.
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {filteredVideos.map((video) => (
                  <article key={video.id} className="rounded-xl border border-border/70 bg-background/30 p-4">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Video className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={video.isPublished ? 'success' : 'secondary'}>
                              {video.isPublished ? 'published' : 'draft'}
                            </Badge>
                            <Badge variant="outline">{video.tag ?? 'Video'}</Badge>
                            {video.featureKey ? <Badge variant="outline">feature: {label(video.featureKey)}</Badge> : null}
                            {video.screenKey ? <Badge variant="outline">screen: {label(video.screenKey)}</Badge> : null}
                          </div>
                          <h3 className="text-lg font-semibold leading-6">{video.title}</h3>
                          {video.description ? (
                            <p className="text-sm leading-6 text-muted-foreground">{video.description}</p>
                          ) : null}
                          <p className="break-all text-xs text-muted-foreground">{video.videoUrl}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
                        <p className="text-xs text-muted-foreground">Sort {video.sortOrder} | ID {video.videoId}</p>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => openEdit(video)}>
                            <Pencil className="h-4 w-4" />
                            Update
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => deleteVideo(video)}
                            disabled={working === `delete-${video.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {modalOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-background text-foreground shadow-2xl">
            <div className="border-b border-border px-5 py-4">
              <p className="text-lg font-semibold leading-6">{form.id ? 'Update tutorial' : 'Create tutorial'}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Paste a YouTube link and choose where this video should appear in the app.
              </p>
            </div>
            <div className="space-y-4 px-5 py-4">
              <Input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Unique video title"
              />
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Description shown below the video tag"
                className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <Input
                value={form.videoUrl}
                onChange={(event) => setForm((current) => ({ ...current, videoUrl: event.target.value }))}
                placeholder="https://www.youtube.com/watch?v=..."
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Input
                    list="tutorial-feature-options"
                    value={form.featureKey}
                    onChange={(event) => setForm((current) => ({ ...current, featureKey: event.target.value }))}
                    placeholder="Feature key, e.g. trips"
                  />
                  <datalist id="tutorial-feature-options">
                    {tutorialFeatureOptions
                      .filter((option) => option.value)
                      .map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                  </datalist>
                </div>
                <div>
                  <Input
                    list="tutorial-screen-options"
                    value={form.screenKey}
                    onChange={(event) => setForm((current) => ({ ...current, screenKey: event.target.value }))}
                    placeholder="Screen key, e.g. vendor_search"
                  />
                  <datalist id="tutorial-screen-options">
                    {screenOptions
                      .filter((option) => option.value)
                      .map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                  </datalist>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  value={form.tag}
                  onChange={(event) => setForm((current) => ({ ...current, tag: event.target.value }))}
                  placeholder="Video tag"
                />
                <Input
                  value={form.sortOrder}
                  onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))}
                  placeholder="Sort"
                  type="number"
                />
                <label className="flex min-h-10 items-center gap-2 rounded-md border border-input px-3 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isPublished}
                    onChange={(event) => setForm((current) => ({ ...current, isPublished: event.target.checked }))}
                  />
                  Published
                </label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-4">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={submitVideo}
                disabled={working === 'save' || !form.title.trim() || !form.videoUrl.trim()}
              >
                {working === 'save' ? 'Saving...' : form.id ? 'Update video' : 'Create video'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {actionModal.modal}
    </>
  )
}
