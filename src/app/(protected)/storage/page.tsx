import { API_URL, ENV_HEADERS } from '@/lib/environment'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Folder,
  HardDrive,
  Search,
  ShieldAlert,
} from 'lucide-react'
import { DeleteStorageFileForm } from './storage-actions'

type StorageUsage = {
  table: string
  column: string
  rowId: string | null
  resourceType: string
  resourceLabel: string
  matchedIdentifier: string
  preview: string | null
}

type StorageFile = {
  key: string
  name: string
  folder: string
  scope: string | null
  ownerId: number | null
  sizeBytes: number
  lastModified: string | null
  url: string | null
  used: boolean
  usageCount: number
  usages: StorageUsage[]
}

type FolderSummary = {
  prefix: string
  depth: number
  fileCount: number
  sizeBytes: number
}

type StorageOverview = {
  generatedAt: string
  bucket: string
  prefix: string
  limit: number
  nextContinuationToken: string | null
  isTruncated: boolean
  scanned: {
    objectCount: number
    sizeBytes: number
    truncated: boolean
    maxObjects: number
  }
  folders: FolderSummary[]
  files: StorageFile[]
}

const fallbackOverview: StorageOverview = {
  generatedAt: new Date().toISOString(),
  bucket: 'not connected',
  prefix: 'uploads/',
  limit: 100,
  nextContinuationToken: null,
  isTruncated: false,
  scanned: {
    objectCount: 0,
    sizeBytes: 0,
    truncated: false,
    maxObjects: 0,
  },
  folders: [],
  files: [],
}

async function resolveSearchParams(
  searchParams?: Promise<Record<string, string | string[] | undefined>>,
) {
  return searchParams ? await Promise.resolve(searchParams) : {}
}

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

async function adminRequest(path: string, init?: RequestInit) {
  const cookieStore = await cookies()
  const token = cookieStore.get('vendero_admin_access_token')?.value
  if (!token) throw new Error('Admin login required')

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      ...ENV_HEADERS,
      ...(init?.headers ?? {}),
      authorization: `Bearer ${token}`,
    },
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.message ?? payload?.error?.message ?? `Request failed with ${response.status}`)
  }

  return payload?.data?.data ?? payload?.data
}

async function getStorageData(params: Record<string, string | string[] | undefined>) {
  const prefix = singleParam(params.prefix) ?? 'uploads/'
  const cursor = singleParam(params.cursor)
  const limit = singleParam(params.limit) ?? '100'
  const folderScanLimit = singleParam(params.folderScanLimit) ?? '5000'
  const search = new URLSearchParams({
    prefix,
    limit,
    includeUsage: 'true',
    folderScanLimit,
  })
  if (cursor) search.set('continuationToken', cursor)

  try {
    return (await adminRequest(`/api/v1/admin/storage?${search.toString()}`)) as StorageOverview
  } catch {
    return fallbackOverview
  }
}

async function deleteStorageFile(formData: FormData) {
  'use server'

  const key = String(formData.get('key') ?? '').trim()
  const force = String(formData.get('force') ?? '') === 'true'
  if (!key) return

  await adminRequest('/api/v1/admin/storage', {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ key, force }),
  })
  revalidatePath('/storage')
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

function formatDate(value: string | null) {
  if (!value) return 'Unknown'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function storageHref(params: Record<string, string | number | null | undefined>) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).length > 0) {
      search.set(key, String(value))
    }
  })
  return `/storage${search.toString() ? `?${search.toString()}` : ''}`
}

export default async function StoragePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await resolveSearchParams(searchParams)
  const overview = await getStorageData(params)
  const usedFiles = overview.files.filter((file) => file.used)
  const unusedFiles = overview.files.length - usedFiles.length
  const currentPrefix = singleParam(params.prefix) ?? overview.prefix ?? 'uploads/'
  const currentLimit = singleParam(params.limit) ?? String(overview.limit ?? 100)
  const folderScanLimit = singleParam(params.folderScanLimit) ?? String(overview.scanned.maxObjects || 5000)

  return (
    <main className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Storage
            </Badge>
            <CardTitle className="text-3xl">Cloudflare storage audit</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7">
              Browse R2 folders and files, review storage usage, see whether an upload is linked to
              any app resource, and delete objects from Cloudflare storage.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Bucket Snapshot</CardTitle>
            <CardDescription>{overview.bucket}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Scanned</p>
              <p className="mt-1 text-2xl font-semibold">{overview.scanned.objectCount}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Space</p>
              <p className="mt-1 text-2xl font-semibold">{formatBytes(overview.scanned.sizeBytes)}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Page files</p>
              <p className="mt-1 text-2xl font-semibold">{overview.files.length}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/70 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <HardDrive className="h-4 w-4 text-sky-300" />
              Prefix
            </CardTitle>
            <CardDescription className="break-all font-mono text-xs">{overview.prefix}</CardDescription>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              Unused
            </CardTitle>
            <CardDescription>{unusedFiles} files on this page are not linked in scanned resources.</CardDescription>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4 text-amber-300" />
              Used
            </CardTitle>
            <CardDescription>{usedFiles.length} files still appear in database resources.</CardDescription>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-300" />
              Scan Limit
            </CardTitle>
            <CardDescription>
              {overview.scanned.truncated
                ? `Folder totals are limited to ${overview.scanned.maxObjects} objects.`
                : 'Folder totals include the scanned prefix.'}
            </CardDescription>
          </CardHeader>
        </Card>
      </section>

      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle>Storage Filters</CardTitle>
          <CardDescription>Open a folder prefix or search another upload path.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[1fr_140px_170px_auto]" action="/storage">
            <Input name="prefix" defaultValue={currentPrefix} placeholder="uploads/banner/" />
            <Input name="limit" defaultValue={currentLimit} inputMode="numeric" />
            <Input name="folderScanLimit" defaultValue={folderScanLimit} inputMode="numeric" />
            <Button type="submit">
              <Search className="h-4 w-4" />
              Scan
            </Button>
          </form>
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Folders</CardTitle>
            <CardDescription>Aggregated from the scanned object set.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[640px] space-y-2 overflow-auto pr-1">
            {overview.folders.length ? (
              overview.folders.map((folder) => (
                <Link
                  key={folder.prefix}
                  href={storageHref({
                    prefix: folder.prefix,
                    limit: currentLimit,
                    folderScanLimit,
                  })}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/30 p-3 transition-colors hover:bg-accent/40"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <Folder className="h-4 w-4 text-sky-300" />
                      <span className="truncate font-mono">{folder.prefix}</span>
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {folder.fileCount} files · {formatBytes(folder.sizeBytes)}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-border/80 p-4 text-sm text-muted-foreground">
                No folders found for this prefix.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle>Files</CardTitle>
              <CardDescription>Usage is checked against resource URL, media, metadata, and settings columns.</CardDescription>
            </div>
            {overview.nextContinuationToken ? (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={storageHref({
                    prefix: currentPrefix,
                    limit: currentLimit,
                    folderScanLimit,
                    cursor: overview.nextContinuationToken,
                  })}
                >
                  Next page
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.files.length ? (
              overview.files.map((file) => (
                <div key={file.key} className="rounded-xl border border-border/70 bg-background/30 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="break-all font-mono text-sm font-semibold text-foreground">{file.name}</p>
                        <Badge variant={file.used ? 'warning' : 'success'} className="rounded-full">
                          {file.used ? `${file.usageCount} linked` : 'Not linked'}
                        </Badge>
                        {file.scope ? <Badge variant="outline">{file.scope}</Badge> : null}
                      </div>
                      <p className="break-all font-mono text-xs text-muted-foreground">{file.key}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>{formatBytes(file.sizeBytes)}</span>
                        <span>{formatDate(file.lastModified)}</span>
                        <span className="break-all">Folder: {file.folder || 'root'}</span>
                        {file.ownerId !== null ? <span>Owner user: {file.ownerId}</span> : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {file.url ? (
                        <Button asChild size="sm" variant="outline">
                          <a href={file.url} target="_blank" rel="noreferrer">
                            Open
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      ) : null}
                      <DeleteStorageFileForm
                        fileKey={file.key}
                        force={file.used}
                        usageCount={file.usageCount}
                        action={deleteStorageFile}
                      />
                    </div>
                  </div>

                  {file.usages.length ? (
                    <div className="mt-4 space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
                        Linked resources
                      </p>
                      {file.usages.slice(0, 8).map((usage) => (
                        <div
                          key={`${file.key}-${usage.table}-${usage.column}-${usage.rowId}`}
                          className="rounded-lg border border-border/60 bg-background/40 p-3 text-xs"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{usage.resourceLabel}</Badge>
                            <span className="font-mono text-muted-foreground">
                              {usage.table}.{usage.column}
                            </span>
                          </div>
                          {usage.preview ? (
                            <p className="mt-2 break-all text-muted-foreground">{usage.preview}</p>
                          ) : null}
                        </div>
                      ))}
                      {file.usages.length > 8 ? (
                        <p className="text-xs text-muted-foreground">
                          +{file.usages.length - 8} more linked rows hidden in this compact view.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-border/80 p-5 text-sm text-muted-foreground">
                No storage files found for this prefix.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
