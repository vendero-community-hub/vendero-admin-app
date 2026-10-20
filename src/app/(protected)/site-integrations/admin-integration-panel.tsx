'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { APP_ENV } from '@/lib/environment'

type ApiKey = { publicId: string; name: string; prefix: string; scopes: string[]; expiresAt: string; revokedAt: string | null; lastUsedAt: string | null }
type Connection = { publicId: string; name: string; status: string; catalogSource: string; webhookUrl?: string | null; keys: ApiKey[] }
type Data = { connections: Connection[]; scopes: string[]; choices: { cabs: { id: number; name: string }[]; sites: { publicId: string; name: string }[] } }
const base = '/api/v1/admin/sites/integrations'
const labels: Record<string, string> = { 'business:read': 'Business information', 'cabs:read': 'Read cabs', 'routes:read': 'Read routes', 'fares:quote': 'Calculate fares', 'leads:create': 'Create inquiries', 'bookings:create': 'Create booking requests', 'bookings:read': 'Customer bookings', 'customers:verify': 'Verify customer WhatsApp', 'customers:read': 'Customer profile', 'chat:read': 'Read customer chat', 'chat:write': 'Send customer chat', 'support:read': 'Read support tickets', 'support:write': 'Create and reply to support', 'payments:create': 'Customer booking payments' }

export function AdminIntegrationPanel({ vendorProfileId }: { vendorProfileId: number }) {
  const scopedRequest = useCallback(async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
    const token = document.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith('vendero_admin_access_token='))?.split('=').slice(1).join('=') ?? ''
    const response = await fetch(`${path}${path.includes('?') ? '&' : '?'}vendorProfileId=${vendorProfileId}`, { ...init, cache: 'no-store', headers: { 'content-type': 'application/json', 'x-vendero-env': APP_ENV, authorization: `Bearer ${decodeURIComponent(token)}`, ...init.headers } })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.message ?? payload.error?.message ?? 'Request failed.')
    return payload.data as T
  }, [vendorProfileId])
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState('')
  const [source, setSource] = useState('operational')
  const [cabIds, setCabIds] = useState<number[]>([])
  const [sitePublicId, setSitePublicId] = useState('')
  const [selected, setSelected] = useState('')
  const [keyName, setKeyName] = useState('Website server')
  const [scopes, setScopes] = useState<string[]>(['business:read', 'cabs:read', 'routes:read'])
  const [expiresAt, setExpiresAt] = useState(() => new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10))
  const [secret, setSecret] = useState('')
  const [notice, setNotice] = useState('')
  const [webhookTarget, setWebhookTarget] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [audit, setAudit] = useState<Array<{ id: number; action: string; created_at: string; response_status: number | null }> | null>(null)
  const load = useCallback(async () => { setData(await scopedRequest<Data>(base)) }, [scopedRequest])
  useEffect(() => { void load().catch((reason) => setError(reason.message)) }, [load])
  async function run(action: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('')
    try { await action(); await load() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Request failed.') } finally { setBusy(false) }
  }
  async function create() {
    await run(async () => {
      const row = await scopedRequest<{ publicId: string }>(base, { method: 'POST', body: JSON.stringify({ name, catalogSource: source, approvedCabIds: cabIds, sitePublicId }) })
      setSelected(row.publicId); setName(''); setNotice('Connection created. Choose permissions and generate its first key.')
    })
  }
  async function issue(connectionId: string, key?: ApiKey) {
    await run(async () => {
      const result = await scopedRequest<{ secret: string }>(`${base}/${connectionId}/keys${key ? `/${key.publicId}/rotate` : ''}`, { method: 'POST', body: JSON.stringify({ name: key?.name ?? keyName, scopes: key?.scopes ?? scopes, expiresAt: `${expiresAt}T23:59:59.000Z` }) })
      setSecret(result.secret); setSelected('')
    })
  }
  const inputClass = 'mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950'
  return <section className="space-y-5 rounded-xl border border-neutral-200 bg-white p-5">
    <div><h2 className="text-lg font-semibold">Developer API</h2><p className="mt-1 text-sm text-neutral-600">Manage developer access for this vendor’s externally hosted websites. Choose the catalog and permissions each connection may use.</p><a className="mt-2 inline-block text-sm font-medium text-blue-700 underline" href="/api/v1/integrations/v1/openapi.json" target="_blank" rel="noreferrer">API reference (OpenAPI)</a></div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {secret && <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4"><h3 className="font-semibold">Save your key now</h3><p className="text-sm">This secret is shown once. Give it to your developer for server-side storage. Keep it out of browser code.</p><code className="block break-all rounded bg-white p-3 text-sm">{secret}</code><div className="flex gap-2"><Button type="button" variant="outline" onClick={() => void navigator.clipboard.writeText(secret).then(() => setNotice('Key copied.')).catch(() => setError('Copy failed. Select and copy the key above.'))}>Copy key</Button><Button type="button" variant="outline" onClick={() => setSecret('')}>I saved the key</Button></div></div>}
    {webhookSecret && <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-4"><h3 className="font-medium">Save the webhook signing secret</h3><p className="text-sm">Shown once. Your server uses this to verify Vendero event signatures.</p><code className="block break-all rounded bg-white p-3 text-sm">{webhookSecret}</code><Button variant="outline" onClick={() => setWebhookSecret('')}>I saved the secret</Button></div>}
    {webhookTarget && <form className="space-y-3 rounded-lg border p-4" onSubmit={(event) => { event.preventDefault(); void run(async () => { const result = await scopedRequest<{ secret: string | null }>(`${base}/${webhookTarget}/webhook`, { method: 'PUT', body: JSON.stringify({ url: webhookUrl || null }) }); setWebhookSecret(result.secret ?? ''); setWebhookTarget(''); setNotice(webhookUrl ? 'Webhook configured. Save its signing secret.' : 'Webhook disabled.') }) }}><h3 className="font-medium">Signed webhook</h3><label className="block text-sm">Your public HTTPS receiver URL<input type="url" placeholder="https://your-website.example/api/vendero-events" className={inputClass} value={webhookUrl} onChange={(event) => setWebhookUrl(event.target.value)} /></label><p className="text-xs text-neutral-500">Receives inquiry and booking creation events with resource IDs. Saving rotates the signing secret. Clear the URL to disable delivery.</p><div className="flex gap-2"><Button disabled={busy} type="submit">Save webhook</Button><Button variant="outline" type="button" onClick={() => setWebhookTarget('')}>Cancel</Button></div></form>}
    {!data && !error && <p role="status" className="text-sm text-neutral-500">Loading connections…</p>}
    {data && <>
      <form onSubmit={(event) => { event.preventDefault(); void create() }} className="space-y-3 rounded-lg bg-neutral-50 p-4">
        <h3 className="font-medium">New connection</h3><label className="block text-sm">Connection name<input required value={name} maxLength={160} onChange={(event) => setName(event.target.value)} className={inputClass} placeholder="My booking website" /></label>
        <label className="block text-sm">Catalog<select value={source} onChange={(event) => setSource(event.target.value)} className={inputClass}><option value="operational">Selected approved cabs — no website template needed</option><option value="published_site">An existing published website catalog</option></select></label>
        {source === 'operational' ? <fieldset><legend className="text-sm">Approve cabs for this connection</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{data.choices.cabs.map((cab) => <label key={cab.id} className="flex items-center gap-2 rounded border bg-white p-2 text-sm"><input type="checkbox" checked={cabIds.includes(cab.id)} onChange={(event) => setCabIds((values) => event.target.checked ? [...values, cab.id] : values.filter((id) => id !== cab.id))} />{cab.name}</label>)}</div>{!data.choices.cabs.length && <p className="mt-2 text-sm text-neutral-600">Add a live, approved cab with fares before creating an independent connection.</p>}<p className="mt-2 text-xs text-neutral-500">Selected cab rates are approved as a fixed catalog version. Create a new connection to approve changed rates. Route prices are calculated by Vendero.</p></fieldset> : <label className="block text-sm">Published website<select required value={sitePublicId} onChange={(event) => setSitePublicId(event.target.value)} className={inputClass}><option value="">Choose a website</option>{data.choices.sites.map((site) => <option key={site.publicId} value={site.publicId}>{site.name}</option>)}</select></label>}
        <Button disabled={busy || (source === 'operational' && !cabIds.length)} type="submit">Create connection</Button>
      </form>
      {selected && <form onSubmit={(event) => { event.preventDefault(); void issue(selected) }} className="space-y-3 rounded-lg border p-4"><h3 className="font-medium">Generate a server key</h3><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Key name<input required className={inputClass} value={keyName} onChange={(event) => setKeyName(event.target.value)} /></label><label className="text-sm">Expires on<input required type="date" className={inputClass} value={expiresAt} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setExpiresAt(event.target.value)} /></label></div><fieldset><legend className="text-sm font-medium">Permissions</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{data.scopes.map((scope) => <label className="flex items-center gap-2 text-sm" key={scope}><input type="checkbox" checked={scopes.includes(scope)} onChange={(event) => setScopes((values) => event.target.checked ? [...values, scope] : values.filter((value) => value !== scope))} />{labels[scope] ?? scope}</label>)}</div></fieldset><p className="text-xs text-neutral-600">Inquiries and bookings also need customer WhatsApp verification. Customer profiles, history, chat and support require the customer’s verified session.</p><div className="flex gap-2"><Button disabled={busy || !scopes.length} type="submit">Generate key</Button><Button type="button" variant="outline" onClick={() => setSelected('')}>Cancel</Button></div></form>}
      <div className="space-y-3">{!data.connections.length && <p className="text-sm text-neutral-500">No developer connections yet.</p>}{data.connections.map((connection) => <article key={connection.publicId} className="rounded-lg border p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-medium">{connection.name}</h3><p className="text-xs text-neutral-500">{connection.status} · {connection.catalogSource === 'operational' ? 'Approved cab catalog' : 'Published site catalog'}</p></div><div className="flex flex-wrap gap-2">{connection.status === 'active' && <Button size="sm" variant="outline" disabled={busy} onClick={() => setSelected(connection.publicId)}>New key</Button>}{connection.status !== 'revoked' && <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(async () => { await scopedRequest(`${base}/${connection.publicId}`, { method: 'PATCH', body: JSON.stringify({ status: connection.status === 'active' ? 'paused' : 'active' }) }) })}>{connection.status === 'active' ? 'Pause' : 'Resume'}</Button>}<Button size="sm" variant="outline" disabled={busy} onClick={() => { setWebhookTarget(connection.publicId); setWebhookUrl(connection.webhookUrl ?? '') }}>Webhook</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => void run(async () => setAudit(await scopedRequest(`${base}/${connection.publicId}/audit`)))}>Activity</Button></div></div><ul className="mt-3 divide-y">{connection.keys.map((key) => <li key={key.publicId} className="flex flex-wrap justify-between gap-3 py-3"><div><p className="text-sm font-medium">{key.name} <code className="text-xs text-neutral-500">{key.prefix}…</code></p><p className="mt-1 text-xs text-neutral-500">{key.revokedAt ? 'Revoked' : `Expires ${new Date(key.expiresAt).toLocaleDateString()}`} · Last used {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'never'}</p><p className="mt-1 text-xs text-neutral-500">{key.scopes.map((scope) => labels[scope] ?? scope).join(', ')}</p></div>{!key.revokedAt && <div className="flex gap-2"><Button size="sm" variant="outline" disabled={busy || connection.status !== 'active'} onClick={() => void issue(connection.publicId, key)}>Rotate</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => void run(async () => { await scopedRequest(`${base}/${connection.publicId}/keys/${key.publicId}/revoke`, { method: 'POST' }) })}>Revoke</Button></div>}</li>)}</ul></article>)}</div>
      {audit && <div className="rounded-lg bg-neutral-50 p-4"><div className="flex justify-between"><h3 className="font-medium">Recent API activity</h3><Button size="sm" variant="outline" onClick={() => setAudit(null)}>Close</Button></div>{!audit.length && <p className="mt-2 text-sm">No activity yet.</p>}<ul className="mt-2 max-h-64 overflow-auto text-xs">{audit.map((event) => <li className="border-b py-2" key={event.id}>{new Date(event.created_at).toLocaleString()} · {event.action}{event.response_status ? ` · ${event.response_status}` : ''}</li>)}</ul></div>}
    </>}
  </section>
}
