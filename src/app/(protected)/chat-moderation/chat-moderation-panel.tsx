'use client'

import { useMemo, useState } from 'react'
import {
  Ban,
  Eye,
  MessageSquareWarning,
  RadioTower,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useActionModal } from '@/components/ui/action-modal'

type BadgeTone = 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger'

type VendorSummary = {
  id: number
  userId: number | null
  businessName: string | null
  ownerName: string | null
  phone: string | null
  email: string | null
  city: string | null
  state: string | null
  isActive: boolean
  verificationStatus: string | null
  isVerified: boolean
} | null

type ChatMessagePreview = {
  id: string
  messageType: string
  preview: string
  body?: Record<string, any>
  from?: Record<string, any>
  to?: Record<string, any> | null
  timeStamp?: string
  deletedForEveryone?: boolean
  moderation?: Record<string, any> | null
}

type ConversationRecord = {
  id: number
  publicId: string
  type: string
  title: string
  subject: string | null
  isActive: boolean
  memberCount: number
  pendingReportCount: number
  messageCount: number
  creator: VendorSummary
  lastMessageAt: string | null
  lastMessagePreview: string | null
  latestMessage: ChatMessagePreview | null
  metadata: Record<string, any>
  createdAt: string | null
}

type ReportRecord = {
  id: number
  publicId: string
  status: string
  reason: string
  notes: string | null
  moderatorNotes: string | null
  conversationId: number | null
  conversationType: string | null
  conversationSubject: string | null
  messageId: string
  broadcastDispatchId: number | null
  reporter: VendorSummary
  reported: VendorSummary
  message: ChatMessagePreview | null
  reviewedAt: string | null
  createdAt: string | null
}

type BroadcastRecord = {
  id: number
  publicId: string
  broadcastListId: number | null
  listName: string | null
  sender: VendorSummary
  contentDocumentId: string | null
  contentType: string | null
  status: string
  moderationStatus: string
  revokedAt: string | null
  revokeReason: string | null
  totalRecipients: number
  sentCount: number
  deliveredCount: number
  readCount: number
  failedCount: number
  invalidCount: number
  content: ChatMessagePreview | null
  createdAt: string | null
}

type ChatBlockRecord = {
  id: number
  publicId: string
  vendor: VendorSummary
  reason: string
  startsAt: string | null
  expiresAt: string | null
  createdAt: string | null
}

type ConversationDetail = {
  conversation: ConversationRecord
  members: Array<Record<string, any>>
  messages: ChatMessagePreview[]
  reports: ReportRecord[]
}

export type ChatModerationData = {
  conversations: ConversationRecord[]
  reports: ReportRecord[]
  broadcasts: BroadcastRecord[]
  activeBlocks: ChatBlockRecord[]
  filters: {
    q: string
    type: string
    reportStatus: string
    limit: number
  }
  analytics: {
    pendingReports: number
    reports24h: number
    activeBlocks: number
    revokedBroadcasts: number
  }
} | null

const VIEW_OPTIONS = [
  { key: 'reports', label: 'Reports', icon: MessageSquareWarning },
  { key: 'conversations', label: 'Conversations', icon: Search },
  { key: 'broadcasts', label: 'Broadcasts', icon: RadioTower },
  { key: 'blocks', label: 'Blocks', icon: Ban },
] as const

function unwrapPayload(payload: any) {
  return payload?.data?.data ?? payload?.data ?? payload
}

function getAdminToken() {
  const tokenEntry = document.cookie
    .split('; ')
    .find((part) => part.startsWith('vendero_admin_access_token='))
  return tokenEntry?.split('=')[1] ?? null
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

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not set'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function toneForStatus(status: string | null | undefined): BadgeTone {
  if (['active', 'reviewed', 'completed', 'sent', 'delivered', 'read'].includes(String(status))) {
    return 'success'
  }
  if (['revoked', 'failed', 'dismissed', 'blocked'].includes(String(status))) return 'danger'
  if (['pending', 'queued', 'partial', 'processing'].includes(String(status))) return 'warning'
  return 'secondary'
}

function vendorLabel(vendor: VendorSummary) {
  if (!vendor) return 'Unknown vendor'
  return vendor.businessName ?? vendor.ownerName ?? vendor.phone ?? `Vendor #${vendor.id}`
}

function locationLabel(vendor: VendorSummary) {
  if (!vendor) return 'No location'
  return [vendor.city, vendor.state].filter(Boolean).join(', ') || 'No location'
}

export function ChatModerationPanel({ initialData }: { initialData: ChatModerationData }) {
  const [data, setData] = useState<ChatModerationData>(initialData)
  const [view, setView] = useState<(typeof VIEW_OPTIONS)[number]['key']>('reports')
  const [query, setQuery] = useState(initialData?.filters.q ?? '')
  const [conversationType, setConversationType] = useState(initialData?.filters.type ?? 'all')
  const [reportStatus, setReportStatus] = useState(initialData?.filters.reportStatus ?? 'pending')
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null)
  const [conversationDetail, setConversationDetail] = useState<ConversationDetail | null>(null)
  const [blockForm, setBlockForm] = useState({ vendorProfileId: '', durationHours: '24', reason: '' })
  const [working, setWorking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const actionModal = useActionModal()

  const analytics = data?.analytics ?? {
    pendingReports: 0,
    reports24h: 0,
    activeBlocks: 0,
    revokedBroadcasts: 0,
  }

  const selectedConversation = useMemo(
    () => data?.conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [data?.conversations, selectedConversationId]
  )

  async function refreshModeration(nextView = view) {
    setWorking('refresh')
    setError(null)

    try {
      const params = new URLSearchParams({ limit: '30' })
      if (query.trim()) params.set('q', query.trim())
      if (conversationType !== 'all') params.set('type', conversationType)
      if (reportStatus !== 'all') params.set('reportStatus', reportStatus)
      const nextData = await requestJson(`/api/v1/admin/chat-moderation?${params.toString()}`)
      setData(nextData as ChatModerationData)
      setView(nextView)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to refresh moderation data')
    } finally {
      setWorking(null)
    }
  }

  async function inspectConversation(id: number) {
    setSelectedConversationId(id)
    setWorking(`conversation-${id}`)
    setError(null)

    try {
      const detail = await requestJson(`/api/v1/admin/chat-moderation/conversations/${id}`)
      setConversationDetail(detail as ConversationDetail)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to inspect conversation')
    } finally {
      setWorking(null)
    }
  }

  async function updateReportStatus(reportId: number, status: 'reviewed' | 'dismissed') {
    const moderatorNotes = await actionModal.prompt({
      title: status === 'reviewed' ? 'Mark report reviewed?' : 'Dismiss report?',
      label: `${status === 'reviewed' ? 'Review' : 'Dismiss'} note`,
      defaultValue: '',
      confirmLabel: status === 'reviewed' ? 'Mark reviewed' : 'Dismiss',
      textarea: true,
    })
    if (moderatorNotes === null) return
    setWorking(`report-${reportId}`)
    setError(null)

    try {
      await requestJson(
        `/api/v1/admin/chat-moderation/reports/${reportId}/status`,
        { status, moderatorNotes },
        'POST'
      )
      await refreshModeration('reports')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update report')
    } finally {
      setWorking(null)
    }
  }

  async function revokeBroadcast(dispatchId: number) {
    const reason = await actionModal.prompt({
      title: 'Revoke broadcast?',
      description: 'Provide the internal reason for revoking this broadcast.',
      label: 'Revoke reason',
      required: true,
      confirmLabel: 'Revoke broadcast',
      variant: 'danger',
      textarea: true,
    })
    if (!reason?.trim()) return
    setWorking(`broadcast-${dispatchId}`)
    setError(null)

    try {
      await requestJson(
        `/api/v1/admin/chat-moderation/broadcasts/${dispatchId}/revoke`,
        { reason: reason.trim() },
        'POST'
      )
      await refreshModeration('broadcasts')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to revoke broadcast')
    } finally {
      setWorking(null)
    }
  }

  async function blockVendor(vendorProfileId: number, defaultReason = '') {
    const durationHours = Number(blockForm.durationHours || 24)
    const reason =
      defaultReason ||
      blockForm.reason.trim() ||
      (await actionModal.prompt({
        title: 'Block vendor chat?',
        description: `Block this vendor chat for ${durationHours} hour(s).`,
        label: 'Block reason',
        required: true,
        confirmLabel: 'Block vendor',
        variant: 'danger',
        textarea: true,
      }))?.trim() ||
      ''
    if (!reason) return

    setWorking(`vendor-${vendorProfileId}`)
    setError(null)

    try {
      await requestJson(
        `/api/v1/admin/chat-moderation/vendors/${vendorProfileId}/block`,
        { durationHours, reason },
        'POST'
      )
      setBlockForm((current) => ({ ...current, vendorProfileId: '', reason: '' }))
      await refreshModeration('blocks')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to block vendor chat')
    } finally {
      setWorking(null)
    }
  }

  async function revokeBlock(blockId: number) {
    setWorking(`block-${blockId}`)
    setError(null)

    try {
      await requestJson(`/api/v1/admin/chat-moderation/blocks/${blockId}/revoke`, {}, 'POST')
      await refreshModeration('blocks')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to revoke chat block')
    } finally {
      setWorking(null)
    }
  }

  return (
    <>
    <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <Card className="border-border/70 bg-card/80">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardDescription className="uppercase tracking-[0.2em] text-muted-foreground">
                Moderation Queue
              </CardDescription>
              <CardTitle className="mt-2 text-2xl">Chat control desk</CardTitle>
            </div>
            <Button variant="outline" onClick={() => refreshModeration()} disabled={working === 'refresh'}>
              <RefreshCw className="h-4 w-4" />
              {working === 'refresh' ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_150px_160px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void refreshModeration()
                }}
                placeholder="Search conversation, vendor, phone, broadcast"
              />
            </div>
            <select
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              value={conversationType}
              onChange={(event) => setConversationType(event.target.value)}
            >
              <option value="all">All chats</option>
              <option value="direct">Direct</option>
              <option value="group">Group</option>
            </select>
            <select
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              value={reportStatus}
              onChange={(event) => setReportStatus(event.target.value)}
            >
              <option value="pending">Pending reports</option>
              <option value="reviewed">Reviewed</option>
              <option value="dismissed">Dismissed</option>
              <option value="all">All reports</option>
            </select>
            <Button onClick={() => refreshModeration()} disabled={working === 'refresh'}>
              Search
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant={analytics.pendingReports ? 'warning' : 'success'} className="rounded-full px-3 py-1">
              Pending {analytics.pendingReports}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              24h reports {analytics.reports24h}
            </Badge>
            <Badge variant={analytics.activeBlocks ? 'danger' : 'success'} className="rounded-full px-3 py-1">
              Blocks {analytics.activeBlocks}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              Revoked broadcasts {analytics.revokedBroadcasts}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            {VIEW_OPTIONS.map((option) => {
              const Icon = option.icon
              return (
                <Button
                  key={option.key}
                  size="sm"
                  variant={view === option.key ? 'secondary' : 'outline'}
                  onClick={() => setView(option.key)}
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                </Button>
              )
            })}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {error ? (
            <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </p>
          ) : null}

          {view === 'reports' ? (
            <>
              {data?.reports.map((report) => (
                <div key={report.id} className="rounded-xl border border-border/70 bg-background/30 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={toneForStatus(report.status)}>{report.status}</Badge>
                        <Badge variant="outline">{report.reason}</Badge>
                        {report.broadcastDispatchId ? <Badge variant="warning">broadcast</Badge> : null}
                      </div>
                      <p className="mt-3 text-sm leading-6">{report.message?.preview ?? 'Message unavailable'}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Reporter {vendorLabel(report.reporter)} • Reported {vendorLabel(report.reported)} • {formatDate(report.createdAt)}
                      </p>
                      {report.notes ? <p className="mt-2 text-sm text-muted-foreground">{report.notes}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {report.conversationId ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => inspectConversation(report.conversationId!)}
                        >
                          <Eye className="h-4 w-4" />
                          Inspect
                        </Button>
                      ) : null}
                      {report.reported?.id ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => blockVendor(report.reported!.id, `Reported message: ${report.reason}`)}
                          disabled={working === `vendor-${report.reported.id}`}
                        >
                          <Ban className="h-4 w-4" />
                          Block
                        </Button>
                      ) : null}
                      {report.status === 'pending' ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => updateReportStatus(report.id, 'reviewed')}
                            disabled={working === `report-${report.id}`}
                          >
                            <ShieldCheck className="h-4 w-4" />
                            Reviewed
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateReportStatus(report.id, 'dismissed')}
                            disabled={working === `report-${report.id}`}
                          >
                            Dismiss
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
              {!data?.reports.length ? (
                <p className="rounded-xl border border-border/70 bg-background/30 p-5 text-sm text-muted-foreground">
                  No reported messages found for this filter.
                </p>
              ) : null}
            </>
          ) : null}

          {view === 'conversations' ? (
            <>
              {data?.conversations.map((conversation) => (
                <div key={conversation.id} className="rounded-xl border border-border/70 bg-background/30 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">#{conversation.id} {conversation.title}</p>
                        <Badge variant="outline">{conversation.type}</Badge>
                        <Badge variant={conversation.pendingReportCount ? 'warning' : 'success'}>
                          {conversation.pendingReportCount} reports
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {conversation.latestMessage?.preview ?? conversation.lastMessagePreview ?? 'No messages yet'}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {conversation.memberCount} members • {conversation.messageCount} messages • {formatDate(conversation.lastMessageAt)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={selectedConversationId === conversation.id ? 'secondary' : 'outline'}
                      onClick={() => inspectConversation(conversation.id)}
                      disabled={working === `conversation-${conversation.id}`}
                    >
                      <Eye className="h-4 w-4" />
                      Inspect
                    </Button>
                  </div>
                </div>
              ))}
              {!data?.conversations.length ? (
                <p className="rounded-xl border border-border/70 bg-background/30 p-5 text-sm text-muted-foreground">
                  No conversations found.
                </p>
              ) : null}
            </>
          ) : null}

          {view === 'broadcasts' ? (
            <>
              {data?.broadcasts.map((broadcast) => (
                <div key={broadcast.id} className="rounded-xl border border-border/70 bg-background/30 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">Broadcast #{broadcast.id}</p>
                        <Badge variant={toneForStatus(broadcast.status)}>{broadcast.status}</Badge>
                        <Badge variant={toneForStatus(broadcast.moderationStatus)}>
                          {broadcast.moderationStatus}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm">{broadcast.content?.preview ?? 'Broadcast content unavailable'}</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {broadcast.listName ?? 'List'} • {vendorLabel(broadcast.sender)}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Sent {broadcast.sentCount}/{broadcast.totalRecipients} • Delivered {broadcast.deliveredCount} • Read {broadcast.readCount} • {formatDate(broadcast.createdAt)}
                      </p>
                      {broadcast.revokeReason ? (
                        <p className="mt-2 text-sm text-rose-200">{broadcast.revokeReason}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {broadcast.sender?.id ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => blockVendor(broadcast.sender!.id, `Broadcast moderation: ${broadcast.id}`)}
                        >
                          <Ban className="h-4 w-4" />
                          Block sender
                        </Button>
                      ) : null}
                      {broadcast.moderationStatus !== 'revoked' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => revokeBroadcast(broadcast.id)}
                          disabled={working === `broadcast-${broadcast.id}`}
                        >
                          Revoke
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
              {!data?.broadcasts.length ? (
                <p className="rounded-xl border border-border/70 bg-background/30 p-5 text-sm text-muted-foreground">
                  No broadcast dispatches found.
                </p>
              ) : null}
            </>
          ) : null}

          {view === 'blocks' ? (
            <>
              <div className="rounded-xl border border-border/70 bg-background/30 p-4">
                <div className="grid gap-3 lg:grid-cols-[130px_120px_1fr_auto]">
                  <Input
                    value={blockForm.vendorProfileId}
                    onChange={(event) =>
                      setBlockForm((current) => ({ ...current, vendorProfileId: event.target.value }))
                    }
                    placeholder="Vendor ID"
                  />
                  <Input
                    value={blockForm.durationHours}
                    onChange={(event) =>
                      setBlockForm((current) => ({ ...current, durationHours: event.target.value }))
                    }
                    placeholder="Hours"
                  />
                  <Input
                    value={blockForm.reason}
                    onChange={(event) =>
                      setBlockForm((current) => ({ ...current, reason: event.target.value }))
                    }
                    placeholder="Reason"
                  />
                  <Button
                    onClick={() => {
                      const vendorId = Number(blockForm.vendorProfileId)
                      if (Number.isFinite(vendorId) && vendorId > 0) void blockVendor(vendorId)
                    }}
                  >
                    <Ban className="h-4 w-4" />
                    Block
                  </Button>
                </div>
              </div>

              {data?.activeBlocks.map((block) => (
                <div key={block.id} className="rounded-xl border border-border/70 bg-background/30 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{vendorLabel(block.vendor)}</p>
                        <Badge variant="danger">blocked</Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{locationLabel(block.vendor)}</p>
                      <p className="mt-2 text-sm">{block.reason}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Expires {formatDate(block.expiresAt)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => revokeBlock(block.id)}
                      disabled={working === `block-${block.id}`}
                    >
                      Unblock
                    </Button>
                  </div>
                </div>
              ))}
              {!data?.activeBlocks.length ? (
                <p className="rounded-xl border border-border/70 bg-background/30 p-5 text-sm text-muted-foreground">
                  No active vendor chat blocks.
                </p>
              ) : null}
            </>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardDescription className="uppercase tracking-[0.2em] text-muted-foreground">
              Conversation Metadata
            </CardDescription>
            <CardTitle className="mt-2 text-2xl">
              {selectedConversation ? `Conversation #${selectedConversation.id}` : 'Select a conversation'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {conversationDetail ? (
              <>
                <div className="rounded-xl border border-border/70 bg-background/30 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{conversationDetail.conversation.type}</Badge>
                    <Badge variant={conversationDetail.conversation.pendingReportCount ? 'warning' : 'success'}>
                      {conversationDetail.conversation.pendingReportCount} pending reports
                    </Badge>
                  </div>
                  <p className="mt-3 font-semibold">{conversationDetail.conversation.title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Created {formatDate(conversationDetail.conversation.createdAt)} • Last message {formatDate(conversationDetail.conversation.lastMessageAt)}
                  </p>
                </div>

                <div className="rounded-xl border border-border/70 bg-background/30 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Members</p>
                  <div className="mt-3 space-y-2">
                    {conversationDetail.members.map((member) => (
                      <div key={member.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-card/50 p-3">
                        <div>
                          <p className="text-sm font-medium">
                            {member.businessName ?? member.ownerName ?? member.phone ?? `User #${member.userId}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Vendor #{member.vendorProfileId ?? '-'} • {member.role}
                          </p>
                        </div>
                        {member.vendorProfileId ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => blockVendor(Number(member.vendorProfileId), `Conversation #${conversationDetail.conversation.id}`)}
                          >
                            <Ban className="h-4 w-4" />
                            Block
                          </Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="rounded-xl border border-border/70 bg-background/30 p-5 text-sm text-muted-foreground">
                Select a reported message or conversation to inspect members and recent messages.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Recent messages</CardTitle>
            <CardDescription>Latest message documents for the selected conversation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {conversationDetail?.messages.map((message) => (
              <div key={message.id} className="rounded-xl border border-border/70 bg-background/30 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={message.deletedForEveryone ? 'danger' : 'outline'}>
                    {message.messageType}
                  </Badge>
                  {message.moderation?.status ? (
                    <Badge variant={toneForStatus(String(message.moderation.status))}>
                      {String(message.moderation.status)}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-6">{message.preview}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {message.from?.name ?? 'Sender'} • {formatDate(message.timeStamp)}
                </p>
              </div>
            ))}
            {conversationDetail && !conversationDetail.messages.length ? (
              <p className="text-sm text-muted-foreground">No messages found.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </section>
    {actionModal.modal}
    </>
  )
}
