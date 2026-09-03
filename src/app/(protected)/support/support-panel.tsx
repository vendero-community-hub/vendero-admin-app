'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCheck,
  Circle,
  FileText,
  Loader2,
  Paperclip,
  RefreshCw,
  Send,
  UserRoundCog,
  X,
} from 'lucide-react'
import { APP_ENV, socketIoEndpoint } from '@/lib/environment'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { uploadAdminMedia } from '@/lib/trusted-media'

type TicketStatus = 'open' | 'pending_support' | 'pending_user' | 'resolved' | 'closed'
type TicketPriority = 'normal' | 'high' | 'urgent'

export type SupportStaffRecord = {
  id: number
  userId: number
  fullName: string | null
  email: string | null
  phone: string | null
  role: 'staff'
  isActive: boolean
}

type AssignedAdmin = {
  id: number
  fullName: string | null
  email: string | null
  role: string | null
} | null

export type SupportThreadRecord = {
  id: number
  publicId: string
  requesterUserId: number
  requesterVendorProfileId: number | null
  requesterDriverId: number | null
  assignedAdminUserId: number | null
  requesterRole: 'vendor' | 'driver'
  requesterName: string
  requesterPhone: string | null
  requesterAvatarUrl: string | null
  requesterOnline: boolean
  subject: string
  category: string
  status: TicketStatus
  priority: TicketPriority
  lastMessageAt: string | null
  lastMessagePreview: string | null
  resolvedAt: string | null
  closedAt: string | null
  createdAt: string | null
  updatedAt: string | null
  assignedAdminUser: AssignedAdmin
}

type SupportMessageRecord = {
  id: number
  publicId: string
  supportThreadId: number
  authorUserId: number | null
  authorRole: 'vendor' | 'driver' | 'admin' | 'staff' | 'system'
  authorLabel: string
  body: string
  attachments: Array<Record<string, any>>
  adminReadAt: string | null
  requesterReadAt: string | null
  createdAt: string | null
  updatedAt: string | null
}

type PendingAttachment = {
  objectKey: string
  type: 'image' | 'document'
  name: string
}

type SupportPanelProps = {
  initialThreads: SupportThreadRecord[]
  staff: SupportStaffRecord[]
}

const statusOptions: TicketStatus[] = ['open', 'pending_support', 'pending_user', 'resolved', 'closed']
const priorityOptions: TicketPriority[] = ['normal', 'high', 'urgent']

function titleCase(value: string | null | undefined) {
  return String(value ?? 'open')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not set'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function statusTone(status: TicketStatus) {
  if (status === 'pending_support') return 'warning'
  if (status === 'pending_user' || status === 'resolved') return 'success'
  if (status === 'closed') return 'secondary'
  return 'default'
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

function sortMessages(messages: SupportMessageRecord[]) {
  return [...messages].sort((a, b) => {
    const aTime = new Date(a.createdAt ?? 0).getTime()
    const bTime = new Date(b.createdAt ?? 0).getTime()
    return aTime - bTime
  })
}

function mergeMessage(current: SupportMessageRecord[], incoming: SupportMessageRecord) {
  if (!incoming?.id) return current
  const exists = current.some((message) => message.id === incoming.id)
  const merged = exists
    ? current.map((message) => (message.id === incoming.id ? { ...message, ...incoming } : message))
    : [...current, incoming]
  return sortMessages(merged)
}

function attachmentLabel(attachment: Record<string, any>) {
  return String(attachment.name ?? attachment.type ?? attachment.url ?? 'Attachment')
}

export function SupportPanel({ initialThreads, staff }: SupportPanelProps) {
  const messageEndRef = useRef<HTMLDivElement | null>(null)
  const threadIdsRef = useRef(new Set(initialThreads.map((thread) => thread.id)))
  const [threads, setThreads] = useState<SupportThreadRecord[]>(initialThreads)
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(initialThreads[0]?.id ?? null)
  const [messages, setMessages] = useState<SupportMessageRecord[]>([])
  const [query, setQuery] = useState('')
  const [body, setBody] = useState('')
  const [attachments, setAttachments] = useState<PendingAttachment[]>([])
  const [uploadingAttachments, setUploadingAttachments] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [saving, setSaving] = useState(false)
  const [socketState, setSocketState] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle')
  const [socket, setSocket] = useState<any>(null)
  const [activeMembers, setActiveMembers] = useState<Array<Record<string, any>>>([])
  const [form, setForm] = useState<{
    status: TicketStatus
    priority: TicketPriority
    assignedAdminUserId: string
  }>({
    status: initialThreads[0]?.status ?? 'open',
    priority: initialThreads[0]?.priority ?? 'normal',
    assignedAdminUserId: initialThreads[0]?.assignedAdminUserId
      ? String(initialThreads[0].assignedAdminUserId)
      : '',
  })

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) ?? null,
    [selectedThreadId, threads]
  )

  const filteredThreads = useMemo(() => {
    const search = query.trim().toLowerCase()
    if (!search) return threads
    return threads.filter((thread) =>
      [
        thread.requesterName,
        thread.requesterPhone ?? '',
        thread.subject,
        thread.category,
        thread.lastMessagePreview ?? '',
      ].some((value) => value.toLowerCase().includes(search))
    )
  }, [query, threads])

  const sharedDocs = useMemo(() => {
    return messages.flatMap((message) =>
      (message.attachments ?? []).map((attachment, index) => ({
        id: `${message.id}-${index}`,
        authorLabel: message.authorLabel,
        createdAt: message.createdAt,
        attachment,
      }))
    )
  }, [messages])

  useEffect(() => {
    threadIdsRef.current = new Set(threads.map((thread) => thread.id))
  }, [threads])

  useEffect(() => {
    const endpoint = socketIoEndpoint()
    const token = getAdminToken()
    if (!token) return undefined

    let active = true
    let createdSocket: any = null
    setSocketState('connecting')

    void import('socket.io-client').then(({ io }) => {
      if (!active) return
      createdSocket = io(endpoint.url, {
        path: endpoint.path,
        transports: ['websocket'],
        auth: {
          token,
          appEnv: APP_ENV,
        },
        extraHeaders: {
          authorization: `Bearer ${token}`,
        },
      })

      createdSocket.on('connect', () => setSocketState('connected'))
      createdSocket.on('disconnect', () => setSocketState('idle'))
      createdSocket.on('connect_error', () => setSocketState('error'))

      createdSocket.on('support:thread:update', (payload: Record<string, any>) => {
        if (!threadIdsRef.current.has(Number(payload.threadId))) {
          requestJson('/api/v1/admin/support/threads')
            .then((nextThreads) => {
              setThreads(Array.isArray(nextThreads) ? nextThreads : [])
            })
            .catch(() => {})
          return
        }

        setThreads((current) =>
          current.map((thread) =>
            thread.id === Number(payload.threadId)
              ? {
                  ...thread,
                  subject: payload.subject ?? thread.subject,
                  category: payload.category ?? thread.category,
                  status: payload.status ?? thread.status,
                  priority: payload.priority ?? thread.priority,
                  lastMessageAt: payload.lastMessageAt ?? thread.lastMessageAt,
                  lastMessagePreview: payload.lastMessagePreview ?? thread.lastMessagePreview,
                  assignedAdminUserId:
                    payload.assignedAdminUserId ?? thread.assignedAdminUserId,
                  assignedAdminUser: payload.assignedAdminUser ?? thread.assignedAdminUser,
                }
              : thread
          )
        )
      })

      createdSocket.on('support:message:new', (message: SupportMessageRecord) => {
        if (!threadIdsRef.current.has(Number(message.supportThreadId))) {
          requestJson('/api/v1/admin/support/threads')
            .then((nextThreads) => {
              setThreads(Array.isArray(nextThreads) ? nextThreads : [])
            })
            .catch(() => {})
        }

        setThreads((current) =>
          current.map((thread) =>
            thread.id === Number(message.supportThreadId)
              ? {
                  ...thread,
                  lastMessageAt: message.createdAt,
                  lastMessagePreview: message.body,
                  status: ['admin', 'staff'].includes(message.authorRole)
                    ? 'pending_user'
                    : 'pending_support',
                }
              : thread
          )
        )
        setMessages((current) => {
          if (Number(message.supportThreadId) !== Number(selectedThreadId)) return current
          return mergeMessage(current, message)
        })
        if (
          Number(message.supportThreadId) === Number(selectedThreadId) &&
          ['vendor', 'driver'].includes(message.authorRole)
        ) {
          createdSocket.emit('support:message:read', { threadId: selectedThreadId }, () => {})
        }
      })

      createdSocket.on('support:message:read', (payload: Record<string, any>) => {
        if (Number(payload.threadId) !== Number(selectedThreadId)) return
        setMessages((current) =>
          current.map((message) => {
            if (payload.adminReadAt && ['vendor', 'driver'].includes(message.authorRole)) {
              return { ...message, adminReadAt: payload.adminReadAt }
            }
            if (payload.requesterReadAt && ['admin', 'staff', 'system'].includes(message.authorRole)) {
              return { ...message, requesterReadAt: payload.requesterReadAt }
            }
            return message
          })
        )
      })

      createdSocket.on('support:presence', (payload: Record<string, any>) => {
        if (Number(payload.threadId) !== Number(selectedThreadId)) return
        if (['vendor', 'driver'].includes(String(payload.role))) {
          setThreads((current) =>
            current.map((thread) =>
              thread.id === Number(payload.threadId)
                ? { ...thread, requesterOnline: Boolean(payload.online) }
                : thread
            )
          )
        }
        setActiveMembers((current) => {
          const withoutMember = current.filter((member) => member.userId !== payload.userId)
          if (!payload.online) return withoutMember
          return [...withoutMember, payload]
        })
      })

      setSocket(createdSocket)
    })

    return () => {
      active = false
      createdSocket?.disconnect()
      setSocket(null)
    }
  }, [selectedThreadId])

  useEffect(() => {
    if (!selectedThread) return
    setForm({
      status: selectedThread.status,
      priority: selectedThread.priority,
      assignedAdminUserId: selectedThread.assignedAdminUserId
        ? String(selectedThread.assignedAdminUserId)
        : '',
    })
  }, [selectedThread])

  useEffect(() => {
    if (!selectedThreadId) return
    setLoadingMessages(true)
    setError(null)
    requestJson(`/api/v1/admin/support/threads/${selectedThreadId}/messages`)
      .then((payload) => {
        setMessages(sortMessages(Array.isArray(payload) ? payload : []))
        return requestJson(`/api/v1/admin/support/threads/${selectedThreadId}/read`, undefined, 'POST')
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Load failed'))
      .finally(() => setLoadingMessages(false))
  }, [selectedThreadId])

  useEffect(() => {
    if (!socket?.connected || !selectedThreadId) return undefined
    socket.emit('support:join', { threadId: selectedThreadId }, (response: any) => {
      if (Array.isArray(response?.data?.membersOnline)) {
        setActiveMembers(response.data.membersOnline)
      }
      socket.emit('support:message:read', { threadId: selectedThreadId }, () => {})
    })
    const timer = setInterval(() => {
      socket.emit('support:presence:ping', { threadId: selectedThreadId }, () => {})
    }, 10000)
    return () => {
      clearInterval(timer)
      socket.emit('support:leave', { threadId: selectedThreadId }, () => {})
      setActiveMembers([])
    }
  }, [selectedThreadId, socket, socketState])

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  async function refreshThreads() {
    setError(null)
    const payload = await requestJson('/api/v1/admin/support/threads')
    setThreads(Array.isArray(payload) ? payload : [])
  }

  function sendMessage() {
    const trimmed = body.trim()
    if (!trimmed || !selectedThreadId || sending) return
    if (!socket?.connected) {
      setError('Live support socket is not connected')
      return
    }

    setSending(true)
    socket.emit(
      'support:message:send',
      {
        threadId: selectedThreadId,
        body: trimmed,
        attachments,
      },
      (response: any) => {
        setSending(false)
        if (response?.success === false) {
          setError(response.message ?? 'Unable to send message')
          return
        }
        setBody('')
        setAttachments([])
      }
    )
  }

  async function uploadAttachments(files: FileList | null) {
    if (!files?.length || uploadingAttachments || attachments.length >= 5) return
    setUploadingAttachments(true)
    setError(null)
    try {
      const selected = Array.from(files).slice(0, 5 - attachments.length)
      const uploaded: PendingAttachment[] = []
      for (const file of selected) {
        const isImage = file.type.startsWith('image/')
        const asset = await uploadAdminMedia(
          file,
          isImage ? 'platform.support-image' : 'platform.support-document'
        )
        if (!asset.objectKey) throw new Error('Trusted media key missing after upload')
        uploaded.push({
          objectKey: asset.objectKey,
          type: isImage ? 'image' : 'document',
          name: file.name,
        })
      }
      setAttachments((current) => [...current, ...uploaded].slice(0, 5))
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Attachment upload failed')
    } finally {
      setUploadingAttachments(false)
    }
  }

  async function saveTicketSettings() {
    if (!selectedThreadId) return
    setSaving(true)
    setError(null)
    try {
      const payload = await requestJson(
        `/api/v1/admin/support/threads/${selectedThreadId}/status`,
        {
          status: form.status,
          priority: form.priority,
          assignedAdminUserId: form.assignedAdminUserId
            ? Number(form.assignedAdminUserId)
            : null,
        },
        'POST'
      )
      setThreads((current) =>
        current.map((thread) => (thread.id === payload.id ? { ...thread, ...payload } : thread))
      )
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save ticket')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="grid min-h-[680px] gap-4 xl:grid-cols-[390px_minmax(0,1fr)]">
      <Card className="border-border/70 bg-card/85">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Active Tickets</CardTitle>
              <CardDescription>{filteredThreads.length} tickets in view</CardDescription>
            </div>
            <Button size="icon" variant="outline" onClick={() => refreshThreads().catch(() => {})}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search vendor, issue, phone"
          />
        </CardHeader>
        <CardContent className="max-h-[560px] space-y-2 overflow-y-auto pr-2">
          {filteredThreads.length ? (
            filteredThreads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                onClick={() => setSelectedThreadId(thread.id)}
                className={cn(
                  'w-full rounded-xl border p-3 text-left transition-colors',
                  selectedThreadId === thread.id
                    ? 'border-primary/60 bg-primary/10'
                    : 'border-border/70 bg-background/25 hover:bg-accent/40'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{thread.requesterName}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{thread.subject}</p>
                  </div>
                  <Badge variant={statusTone(thread.status)}>{titleCase(thread.status)}</Badge>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Circle
                      className={cn(
                        'h-2 w-2',
                        thread.requesterOnline ? 'fill-emerald-400 text-emerald-400' : 'fill-slate-500 text-slate-500'
                      )}
                    />
                    {thread.requesterOnline ? 'Online' : 'Offline'}
                  </span>
                  <span>{formatDate(thread.lastMessageAt)}</span>
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border/80 p-6 text-center text-sm text-muted-foreground">
              No tickets match this search.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="flex min-h-[680px] flex-col border-border/70 bg-card/85">
        {selectedThread ? (
          <>
            <CardHeader className="border-b border-border/70">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{titleCase(selectedThread.category)}</Badge>
                    <Badge variant={statusTone(selectedThread.status)}>
                      {titleCase(selectedThread.status)}
                    </Badge>
                    <Badge variant="secondary">{titleCase(selectedThread.priority)}</Badge>
                    <Badge variant={socketState === 'connected' ? 'success' : 'warning'}>
                      {socketState === 'connected' ? 'Live' : 'Connecting'}
                    </Badge>
                  </div>
                  <CardTitle className="mt-3 text-2xl">{selectedThread.subject}</CardTitle>
                  <CardDescription className="mt-2">
                    {selectedThread.requesterName} - {selectedThread.requesterPhone ?? 'No phone'} -
                    {' '}
                    {selectedThread.requesterOnline ? 'Vendor online' : 'Vendor offline'}
                  </CardDescription>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Attending:{' '}
                    {selectedThread.assignedAdminUser?.fullName ??
                      selectedThread.assignedAdminUser?.email ??
                      'Not assigned'}
                  </p>
                </div>

                <div className="grid min-w-[260px] gap-2 text-xs md:grid-cols-3">
                  <label className="space-y-1">
                    <span className="text-muted-foreground">Status</span>
                    <select
                      value={form.status}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, status: event.target.value as TicketStatus }))
                      }
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-foreground"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {titleCase(status)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-muted-foreground">Priority</span>
                    <select
                      value={form.priority}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, priority: event.target.value as TicketPriority }))
                      }
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-foreground"
                    >
                      {priorityOptions.map((priority) => (
                        <option key={priority} value={priority}>
                          {titleCase(priority)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-muted-foreground">Transfer</span>
                    <select
                      value={form.assignedAdminUserId}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          assignedAdminUserId: event.target.value,
                        }))
                      }
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-foreground"
                    >
                      <option value="">Unassigned</option>
                      {staff
                        .filter((member) => member.isActive)
                        .map((member) => (
                          <option key={member.userId} value={member.userId}>
                            {member.fullName ?? member.email ?? member.phone ?? `Staff #${member.userId}`}
                          </option>
                        ))}
                    </select>
                  </label>
                  <Button
                    className="md:col-span-3"
                    size="sm"
                    disabled={saving}
                    onClick={saveTicketSettings}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRoundCog className="h-4 w-4" />}
                    Save ticket controls
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="grid flex-1 gap-4 p-0 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div className="flex min-h-[520px] flex-col">
                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {loadingMessages ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading chat history
                    </div>
                  ) : messages.length ? (
                    messages.map((message) => {
                      const adminMessage = ['admin', 'staff', 'system'].includes(message.authorRole)
                      return (
                        <div
                          key={message.id}
                          className={cn('flex', adminMessage ? 'justify-end' : 'justify-start')}
                        >
                          <div
                            className={cn(
                              'max-w-[76%] rounded-2xl border px-3 py-2 text-sm',
                              adminMessage
                                ? 'border-primary/40 bg-primary text-primary-foreground'
                                : 'border-border/70 bg-background/50'
                            )}
                          >
                            <p
                              className={cn(
                                'mb-1 text-xs font-semibold',
                                adminMessage ? 'text-primary-foreground/80' : 'text-primary'
                              )}
                            >
                              {message.authorLabel}
                            </p>
                            <p className="whitespace-pre-wrap leading-6">{message.body}</p>
                            {message.attachments?.length ? (
                              <div className="mt-2 space-y-1 border-t border-current/20 pt-2 text-xs">
                                {message.attachments.map((attachment, index) => {
                                  const url = typeof attachment.url === 'string' ? attachment.url : null
                                  return url ? (
                                    <a
                                      className="block font-semibold underline underline-offset-2"
                                      href={url}
                                      key={`${message.id}-${index}`}
                                      rel="noreferrer"
                                      target="_blank"
                                    >
                                      {attachmentLabel(attachment)}
                                    </a>
                                  ) : (
                                    <p key={`${message.id}-${index}`}>{attachmentLabel(attachment)}</p>
                                  )
                                })}
                              </div>
                            ) : null}
                            <div
                              className={cn(
                                'mt-2 flex items-center justify-end gap-1 text-[11px]',
                                adminMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
                              )}
                            >
                              {formatDate(message.createdAt)}
                              {adminMessage ? (
                                <span>
                                  {message.requesterReadAt ? ' - Vendor read' : ' - Vendor not read'}
                                </span>
                              ) : (
                                <>
                                  <span>{message.adminReadAt ? ' - Admin read' : ' - Admin unread'}</span>
                                  <CheckCheck className="h-3 w-3" />
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="rounded-xl border border-dashed border-border/80 p-6 text-center text-sm text-muted-foreground">
                      No chat history yet.
                    </div>
                  )}
                  <div ref={messageEndRef} />
                </div>

                {error ? (
                  <div className="border-t border-border/70 px-4 py-2 text-sm text-rose-300">{error}</div>
                ) : null}

                <div className="border-t border-border/70 p-4">
                  {attachments.length ? (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {attachments.map((attachment, index) => (
                        <div
                          className="flex max-w-full items-center gap-2 rounded-md border border-border/70 bg-background/40 px-2 py-1 text-xs"
                          key={attachment.objectKey}
                        >
                          <Paperclip className="h-3.5 w-3.5 text-primary" />
                          <span className="max-w-56 truncate">{attachment.name}</span>
                          <button
                            aria-label={`Remove ${attachment.name}`}
                            onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                            type="button"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="flex items-end gap-2">
                    <label
                      className={cn(
                        'inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border border-input bg-background',
                        (uploadingAttachments || attachments.length >= 5) && 'cursor-not-allowed opacity-50'
                      )}
                    >
                      {uploadingAttachments ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                      <input
                        accept="image/jpeg,image/png,image/webp,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md"
                        className="hidden"
                        disabled={uploadingAttachments || attachments.length >= 5}
                        multiple
                        onChange={(event) => {
                          void uploadAttachments(event.target.files)
                          event.target.value = ''
                        }}
                        type="file"
                      />
                    </label>
                    <textarea
                      value={body}
                      onChange={(event) => {
                        setBody(event.target.value)
                        socket?.emit(
                          'support:typing',
                          { threadId: selectedThreadId, isTyping: event.target.value.length > 0 },
                          () => {}
                        )
                      }}
                      placeholder="Reply to vendor"
                      className="min-h-[46px] flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                    />
                    <Button disabled={!body.trim() || sending || uploadingAttachments} onClick={sendMessage}>
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Send
                    </Button>
                  </div>
                </div>
              </div>

              <aside className="border-t border-border/70 p-4 lg:border-l lg:border-t-0">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold">Live in ticket</p>
                    <div className="mt-2 space-y-2">
                      {activeMembers.length ? (
                        activeMembers.map((member) => (
                          <div
                            key={`${member.userId}-${member.role}`}
                            className="flex items-center justify-between rounded-lg border border-border/70 bg-background/30 px-3 py-2 text-xs"
                          >
                            <span>{member.displayName ?? `User #${member.userId}`}</span>
                            <Badge variant="success">{titleCase(String(member.role))}</Badge>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">No one else is active in this ticket.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <FileText className="h-4 w-4" />
                      Shared docs
                    </p>
                    <div className="mt-2 space-y-2">
                      {sharedDocs.length ? (
                        sharedDocs.map((doc) => {
                          const url = typeof doc.attachment.url === 'string' ? doc.attachment.url : null
                          const label = attachmentLabel(doc.attachment)
                          return (
                            <div
                              key={doc.id}
                              className="rounded-lg border border-border/70 bg-background/30 px-3 py-2 text-xs"
                            >
                              {url ? (
                                <a className="font-semibold text-primary" href={url} target="_blank" rel="noreferrer">
                                  {label}
                                </a>
                              ) : (
                                <p className="font-semibold">{label}</p>
                              )}
                              <p className="mt-1 text-muted-foreground">
                                {doc.authorLabel} - {formatDate(doc.createdAt)}
                              </p>
                            </div>
                          )
                        })
                      ) : (
                        <p className="text-xs text-muted-foreground">No shared documents in this chat.</p>
                      )}
                    </div>
                  </div>
                </div>
              </aside>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Select a support ticket to open chat.
          </CardContent>
        )}
      </Card>
    </section>
  )
}
