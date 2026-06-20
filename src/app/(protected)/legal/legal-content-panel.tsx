'use client'

import { useMemo, useRef, useState } from 'react'
import {
  Bold,
  Eye,
  FileText,
  Heading2,
  List,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type BadgeTone = 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger'
type LegalPolicyStatus = 'draft' | 'published' | 'archived'

type LegalPolicy = {
  id: number
  publicId: string
  slug: string
  title: string
  description: string | null
  contentHtml: string
  contentText: string
  status: LegalPolicyStatus
  version: number
  publishedAt: string | null
  createdAt: string | null
  updatedAt: string | null
}

export type LegalPoliciesData = {
  policies: LegalPolicy[]
  summary: {
    totalCount: number
    publishedCount: number
    draftCount: number
    archivedCount: number
  }
} | null

type PolicyForm = {
  id?: number
  slug: string
  title: string
  description: string
  contentHtml: string
  status: LegalPolicyStatus
  version: string
}

const starterHtml = `<h2>Policy Section</h2>
<p>Write the policy text here.</p>`

const emptyPolicyForm: PolicyForm = {
  slug: '',
  title: '',
  description: '',
  contentHtml: starterHtml,
  status: 'draft',
  version: '1',
}

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

function fallbackData(): NonNullable<LegalPoliciesData> {
  return {
    policies: [],
    summary: {
      totalCount: 0,
      publishedCount: 0,
      draftCount: 0,
      archivedCount: 0,
    },
  }
}

function formFromPolicy(policy: LegalPolicy): PolicyForm {
  return {
    id: policy.id,
    slug: policy.slug,
    title: policy.title,
    description: policy.description ?? '',
    contentHtml: policy.contentHtml,
    status: policy.status,
    version: String(policy.version),
  }
}

function toneForStatus(status: LegalPolicyStatus): BadgeTone {
  if (status === 'published') return 'success'
  if (status === 'draft') return 'warning'
  return 'secondary'
}

function label(value: string) {
  return value.replace(/-/g, ' ').replace(/_/g, ' ')
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not published'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function PolicyHtmlEditor({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  function insertSnippet(open: string, close = '', placeholder = 'Text') {
    const target = textareaRef.current
    const start = target?.selectionStart ?? value.length
    const end = target?.selectionEnd ?? value.length
    const selected = value.slice(start, end) || placeholder
    const nextValue = `${value.slice(0, start)}${open}${selected}${close}${value.slice(end)}`
    const nextCursor = start + open.length + selected.length + close.length

    onChange(nextValue)
    window.setTimeout(() => {
      target?.focus()
      target?.setSelectionRange(nextCursor, nextCursor)
    }, 0)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => insertSnippet('<h2>', '</h2>', 'Section title')}>
          <Heading2 className="h-4 w-4" />
          Heading
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => insertSnippet('<p>', '</p>', 'Paragraph text')}>
          <FileText className="h-4 w-4" />
          Paragraph
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => insertSnippet('<strong>', '</strong>', 'Important text')}>
          <Bold className="h-4 w-4" />
          Bold
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => insertSnippet('<ul>\n  <li>', '</li>\n</ul>', 'List item')}
        >
          <List className="h-4 w-4" />
          List
        </Button>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[460px] w-full rounded-md border border-input bg-background px-3 py-3 font-mono text-sm leading-6 text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        spellCheck={false}
      />
    </div>
  )
}

export function LegalContentPanel({ initialData }: { initialData: LegalPoliciesData }) {
  const [data, setData] = useState<NonNullable<LegalPoliciesData>>(initialData ?? fallbackData())
  const [form, setForm] = useState<PolicyForm>(() => {
    const contentPolicy = (initialData?.policies ?? []).find((policy) => policy.slug === 'content-policy')
    return contentPolicy ? formFromPolicy(contentPolicy) : emptyPolicyForm
  })
  const [message, setMessage] = useState('')
  const [working, setWorking] = useState<string | null>(null)

  const sortedPolicies = useMemo(
    () =>
      [...data.policies].sort((left, right) => {
        const order = ['terms-of-service', 'privacy-policy', 'content-policy']
        const leftIndex = order.indexOf(left.slug)
        const rightIndex = order.indexOf(right.slug)
        const leftOrder = leftIndex >= 0 ? leftIndex : order.length
        const rightOrder = rightIndex >= 0 ? rightIndex : order.length
        return leftOrder - rightOrder || left.title.localeCompare(right.title)
      }),
    [data.policies]
  )

  async function refresh() {
    const nextData = (await requestJson('/api/v1/admin/legal/policies')) as NonNullable<LegalPoliciesData>
    setData(nextData)
    if (form.id) {
      const updated = nextData.policies.find((policy) => policy.id === form.id)
      if (updated) setForm(formFromPolicy(updated))
    }
  }

  async function submitPolicy() {
    setWorking('save')
    setMessage('')
    try {
      const body = {
        slug: normalizeSlug(form.slug),
        title: form.title.trim(),
        description: form.description.trim() || null,
        contentHtml: form.contentHtml.trim(),
        status: form.status,
        version: Number(form.version || 1),
      }

      if (form.id) {
        await requestJson(`/api/v1/admin/legal/policies/${form.id}`, body, 'PUT')
        setMessage('Policy updated.')
      } else {
        await requestJson('/api/v1/admin/legal/policies', body, 'POST')
        setMessage('Policy created.')
      }

      await refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save policy')
    } finally {
      setWorking(null)
    }
  }

  async function deletePolicy(policy: LegalPolicy) {
    const confirmed = window.confirm(`Delete ${policy.title}? This removes it from public apps and policy links until it is recreated.`)
    if (!confirmed) return

    setWorking(`delete-${policy.id}`)
    setMessage('')
    try {
      await requestJson(`/api/v1/admin/legal/policies/${policy.id}`, undefined, 'DELETE')
      setMessage('Policy deleted.')
      setForm(emptyPolicyForm)
      await refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to delete policy')
    } finally {
      setWorking(null)
    }
  }

  const saveDisabled =
    working === 'save' ||
    !normalizeSlug(form.slug) ||
    !form.title.trim() ||
    form.contentHtml.trim().length < 10

  return (
    <section className="space-y-6">
      {message ? (
        <p className="rounded-md border border-border/70 bg-background/40 px-4 py-3 text-sm text-muted-foreground">{message}</p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Policies</CardTitle>
                <CardDescription>Published rows are visible in all connected apps.</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setForm(emptyPolicyForm)}>
                <Plus className="h-4 w-4" />
                New
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {!sortedPolicies.length ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No policy content found.
              </div>
            ) : (
              sortedPolicies.map((policy) => (
                <article key={policy.id} className="rounded-xl border border-border/70 bg-background/30 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={toneForStatus(policy.status)}>{label(policy.status)}</Badge>
                        <Badge variant="outline">{policy.slug}</Badge>
                      </div>
                      <h3 className="text-base font-semibold">{policy.title}</h3>
                      <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {policy.description ?? policy.contentText}
                      </p>
                      <p className="text-xs text-muted-foreground">Published {formatDate(policy.publishedAt)}</p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setForm(formFromPolicy(policy))}>
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={working === `delete-${policy.id}`}
                        onClick={() => deletePolicy(policy)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>{form.id ? 'Edit policy content' : 'Create policy content'}</CardTitle>
                <CardDescription>
                  HTML saved here is sanitized by the API before it is shown in WebView, bottom sheets, or policy pages.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={refresh}>
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
                <Button type="button" disabled={saveDisabled} onClick={submitPolicy}>
                  <Save className="h-4 w-4" />
                  {working === 'save' ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 lg:grid-cols-[1fr_1fr_140px_110px]">
              <Input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Policy title"
              />
              <Input
                value={form.slug}
                onChange={(event) => setForm((current) => ({ ...current, slug: normalizeSlug(event.target.value) }))}
                placeholder="policy-slug"
              />
              <select
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as LegalPolicyStatus }))}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
              <Input
                value={form.version}
                onChange={(event) => setForm((current) => ({ ...current, version: event.target.value }))}
                placeholder="Version"
                type="number"
                min={1}
              />
            </div>

            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Short description used by policy pages and WebView headers"
              className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            />

            <div className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
              <PolicyHtmlEditor
                value={form.contentHtml}
                onChange={(contentHtml) => setForm((current) => ({ ...current, contentHtml }))}
              />
              <div className="rounded-xl border border-border/70 bg-background/30 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Eye className="h-4 w-4" />
                  Preview
                </div>
                <div
                  className="max-w-none text-sm leading-7 [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:text-muted-foreground [&_p]:mb-3 [&_p]:text-muted-foreground [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5"
                  dangerouslySetInnerHTML={{ __html: form.contentHtml }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
