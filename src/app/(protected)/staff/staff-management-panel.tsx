'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type StaffRecord = {
  id: number
  userId: number
  profileId: number
  fullName: string | null
  email: string | null
  phone: string | null
  role: 'staff'
  isSuperStaff: boolean
  isActive: boolean
  otpEnabled: boolean
  adminPagePermissions: string[]
  effectiveAdminPagePermissions: string[]
  lastLoginAt: string | null
  createdAt: string
  activeSessionsCount: number
}

type PermissionDefinition = {
  key: string
  label: string
  description?: string
}

const DEFAULT_PERMISSION_OPTIONS: PermissionDefinition[] = [
  { key: 'overview', label: 'Overview', description: 'Read the operations dashboard.' },
  { key: 'vendors', label: 'Vendors', description: 'Review vendor and marketplace posture.' },
  { key: 'staff', label: 'Staff', description: 'Manage staff accounts and access.' },
  { key: 'verifications', label: 'Verifications', description: 'Review KYC queues.' },
  { key: 'subscriptions', label: 'Subscriptions', description: 'Manage plans and payments.' },
  { key: 'trips', label: 'Trips', description: 'Search trips and audit sharing conflicts.' },
  { key: 'fleet', label: 'Cabs & Fare', description: 'Manage cab categories, cab models, and fare rates.' },
  { key: 'chat_moderation', label: 'Chat Moderation', description: 'Review reports and moderate chat abuse.' },
  { key: 'marketplace_moderation', label: 'Marketplace Moderation', description: 'Approve listings, moderate reviews, and review lead abuse.' },
  { key: 'whatsapp_admin', label: 'WhatsApp Business', description: 'Manage templates, opt-ins, message logs, and usage.' },
  { key: 'server', label: 'Server', description: 'View server and queue telemetry.' },
  { key: 'links', label: 'White Label', description: 'Audit public white-label links.' },
  { key: 'landing', label: 'Landing Requests', description: 'Review public landing page requests.' },
  { key: 'legal_policies', label: 'Legal Content', description: 'Manage central privacy, terms, and content policy text.' },
  { key: 'worker_queues', label: 'Worker Queues', description: 'Inspect queues, dead letters, and retries.' },
  { key: 'audit_logs', label: 'Audit Logs', description: 'Browse platform audit events.' },
]

type StaffOverview = {
  staff: StaffRecord[]
  permissionCatalog?: PermissionDefinition[]
  analytics: {
    totalStaff: number
    activeStaff: number
    otpEnabledStaff: number
    superStaff?: number
    disabledStaff: number
  }
} | null

const DEFAULT_PERMISSION_KEYS = DEFAULT_PERMISSION_OPTIONS.map((item) => item.key)

function formatDate(value: string | null) {
  if (!value) return 'Never'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function unwrapPayload(payload: any) {
  return payload?.data?.data ?? payload?.data ?? payload
}

async function requestJson(path: string, body?: Record<string, unknown>, method = 'POST') {
  const tokenEntry = document.cookie
    .split('; ')
    .find((part) => part.startsWith('vendero_admin_access_token='))
  const token = tokenEntry?.split('=')[1] ?? null

  const response = await fetch(path, {
    method,
    headers: {
      'content-type': 'application/json',
      authorization: token ? `Bearer ${token}` : '',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload?.message ?? payload?.error?.message ?? 'Request failed')
  }

  return response.json().catch(() => ({}))
}

export function StaffManagementPanel({ initialData }: { initialData: StaffOverview }) {
  const [search, setSearch] = useState('')
  const [staff, setStaff] = useState<StaffRecord[]>(initialData?.staff ?? [])
  const [permissionCatalog, setPermissionCatalog] = useState<PermissionDefinition[]>(
    initialData?.permissionCatalog?.length ? initialData.permissionCatalog : DEFAULT_PERMISSION_OPTIONS
  )
  const [workingId, setWorkingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    isSuperStaff: false,
    isActive: true,
    otpEnabled: true,
    adminPagePermissions: DEFAULT_PERMISSION_KEYS,
  })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const filteredStaff = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return staff
    return staff.filter((item) =>
      [item.fullName ?? '', item.email ?? '', item.phone ?? ''].some((value) =>
        value.toLowerCase().includes(query)
      )
    )
  }, [search, staff])

  const permissionKeys = useMemo(() => permissionCatalog.map((item) => item.key), [permissionCatalog])

  function resetForm() {
    setForm({
      fullName: '',
      phone: '',
      email: '',
      isSuperStaff: false,
      isActive: true,
      otpEnabled: true,
      adminPagePermissions: permissionKeys.length ? permissionKeys : DEFAULT_PERMISSION_KEYS,
    })
    setEditingId(null)
  }

  async function refreshList(query = search) {
    const qs = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''
    const payload = await requestJson(`/api/v1/admin/staff${qs}`, undefined, 'GET')
    const data = unwrapPayload(payload)
    setStaff(data.staff ?? [])
    if (Array.isArray(data.permissionCatalog) && data.permissionCatalog.length) {
      setPermissionCatalog(data.permissionCatalog)
    }
  }

  async function saveStaff() {
    setSaving(true)
    setError(null)

    try {
      const payload = {
        fullName: form.fullName,
        phone: form.phone,
        email: form.email || undefined,
        isSuperStaff: form.isSuperStaff,
        isActive: form.isActive,
        otpEnabled: form.otpEnabled,
        adminPagePermissions: form.isSuperStaff ? permissionKeys : form.adminPagePermissions,
      }

      if (editingId) {
        await requestJson(`/api/v1/admin/staff/${editingId}`, payload, 'PUT')
      } else {
        await requestJson('/api/v1/admin/staff', payload)
      }

      resetForm()
      await refreshList()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save staff')
    } finally {
      setSaving(false)
    }
  }

  async function removeStaff(id: number) {
    if (!window.confirm('Delete this staff account? This will revoke their sessions.')) return
    setWorkingId(id)
    setError(null)
    try {
      await requestJson(`/api/v1/admin/staff/${id}`, undefined, 'DELETE')
      setStaff((current) => current.filter((item) => item.id !== id))
      if (editingId === id) resetForm()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to delete staff')
    } finally {
      setWorkingId(null)
    }
  }

  function startEdit(item: StaffRecord) {
    setEditingId(item.id)
    setForm({
      fullName: item.fullName ?? '',
      phone: item.phone ?? '',
      email: item.email ?? '',
      isSuperStaff: item.isSuperStaff,
      isActive: item.isActive,
      otpEnabled: item.otpEnabled,
      adminPagePermissions: item.adminPagePermissions?.length ? item.adminPagePermissions : permissionKeys,
    })
    setError(null)
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle>{editingId ? 'Edit staff' : 'Create staff'}</CardTitle>
          <CardDescription>
            Staff users authenticate through OTP using their linked staff profile access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={form.fullName}
            onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
            placeholder="Full name"
          />
          <Input
            value={form.phone}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            placeholder="Phone number"
          />
          <Input
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            placeholder="Email (optional)"
          />

          <label className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/30 px-3 py-3 text-sm">
            <input
              type="checkbox"
              checked={form.isSuperStaff}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  isSuperStaff: event.target.checked,
                  adminPagePermissions: event.target.checked ? permissionKeys : current.adminPagePermissions,
                }))
              }
              className="h-4 w-4"
            />
            Super staff access
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/30 px-3 py-3 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
              className="h-4 w-4"
            />
            Staff account active
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/30 px-3 py-3 text-sm">
            <input
              type="checkbox"
              checked={form.otpEnabled}
              onChange={(event) => setForm((current) => ({ ...current, otpEnabled: event.target.checked }))}
              className="h-4 w-4"
            />
            OTP login enabled
          </label>

          <div className="space-y-3 rounded-xl border border-border/70 bg-background/20 p-4">
            <p className="text-sm font-medium">Page access permissions</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {permissionCatalog.map((option) => (
                <label
                  key={option.key}
                  className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/30 px-3 py-3 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={form.isSuperStaff || form.adminPagePermissions.includes(option.key)}
                    disabled={form.isSuperStaff}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        adminPagePermissions: event.target.checked
                          ? [...current.adminPagePermissions, option.key]
                          : current.adminPagePermissions.filter((permission) => permission !== option.key),
                      }))
                    }}
                    className="h-4 w-4"
                  />
                  <span>
                    <span className="block">{option.label}</span>
                    {option.description ? (
                      <span className="mt-0.5 block text-xs text-muted-foreground">{option.description}</span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {error ? (
            <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={saveStaff}
              disabled={
                !form.fullName ||
                !form.phone ||
                (!form.isSuperStaff && !form.adminPagePermissions.length) ||
                saving
              }
            >
              {saving ? 'Saving...' : editingId ? 'Update staff' : 'Create staff'}
            </Button>
            {editingId ? (
              <Button variant="outline" onClick={resetForm} disabled={saving}>
                Cancel edit
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardDescription className="uppercase tracking-[0.2em] text-muted-foreground">
                Staff Directory
              </CardDescription>
              <CardTitle className="mt-2 text-2xl">Admin staff users</CardTitle>
            </div>
            <Button variant="outline" onClick={() => refreshList()} disabled={saving || workingId !== null}>
              Refresh
            </Button>
          </div>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email, or phone"
          />
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredStaff.map((item) => (
            <div key={item.id} className="rounded-xl border border-border/70 bg-background/30 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{item.fullName ?? 'Unnamed staff'}</p>
                    {item.isSuperStaff ? <Badge variant="outline">Super staff</Badge> : null}
                    <Badge variant={item.isActive ? 'success' : 'secondary'}>{item.isActive ? 'Active' : 'Disabled'}</Badge>
                    <Badge variant={item.otpEnabled ? 'success' : 'warning'}>{item.otpEnabled ? 'OTP on' : 'OTP off'}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.phone}</p>
                  <p className="text-sm text-muted-foreground">{item.email}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Last login {formatDate(item.lastLoginAt)} • Active sessions {item.activeSessionsCount ?? 0}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(item.effectiveAdminPagePermissions ?? item.adminPagePermissions)?.map((permission) => (
                      <Badge key={permission} variant="outline" className="rounded-full px-2.5 py-0.5">
                        {permission}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startEdit(item)}
                    disabled={workingId === item.id}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      setWorkingId(item.id)
                      setError(null)
                      try {
                        await requestJson(`/api/v1/admin/staff/${item.id}`, {
                          isActive: !item.isActive,
                        }, 'PUT')
                        await refreshList()
                      } catch (requestError) {
                        setError(requestError instanceof Error ? requestError.message : 'Unable to update staff')
                      } finally {
                        setWorkingId(null)
                      }
                    }}
                    disabled={workingId === item.id}
                  >
                    {workingId === item.id ? 'Saving...' : item.isActive ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeStaff(item.id)}
                    disabled={workingId === item.id}
                  >
                    {workingId === item.id ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {filteredStaff.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-background/20 p-6 text-sm text-muted-foreground">
              No staff users match the current search.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  )
}
