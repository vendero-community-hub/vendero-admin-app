'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { APP_ENV } from '@/lib/environment'

type SetupRequest = { vendor_profile_id: number; business_name?: string; notes?: string; status: string; test_mode?: boolean }
const base = '/api/v1/admin/sites/payments'
async function request<T>(path: string, body?: unknown): Promise<T> {
  const cookie = document.cookie.split(';').map((item) => item.trim()).find((item) => item.startsWith('vendero_admin_access_token='))?.split('=').slice(1).join('=') ?? ''
  const response = await fetch(path, { method: body ? 'POST' : 'GET', credentials: 'include', cache: 'no-store', headers: { 'content-type': 'application/json', 'x-vendero-env': APP_ENV, authorization: `Bearer ${decodeURIComponent(cookie)}` }, ...(body ? { body: JSON.stringify(body) } : {}) })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.message ?? payload.error?.message ?? 'Payment setup could not be saved.')
  return payload.data
}
export default function SitePaymentsPage() {
  const [items, setItems] = useState<SetupRequest[]>([])
  const [vendorId, setVendorId] = useState('')
  const [form, setForm] = useState({ keyId: '', keySecret: '', webhookSecret: '', testMode: true })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  async function load() { const data = await request<SetupRequest[] | { items: SetupRequest[] }>(base); setItems(Array.isArray(data) ? data : data.items ?? []) }
  useEffect(() => { void load().catch((reason) => setError(reason.message)) }, [])
  async function activate() {
    setPending(true); setError(''); setNotice('')
    try { await request(`${base}/activate`, { vendorProfileId: Number(vendorId), ...form }); setForm({ keyId: '', keySecret: '', webhookSecret: '', testMode: true }); setNotice('Payment credentials verified and activated. Stored secrets are never displayed.'); await load() }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Payment setup failed.') } finally { setPending(false) }
  }
  const input = 'mt-1 block w-full rounded-lg border bg-background p-2 text-sm'
  return <main className="space-y-5"><header><h1 className="text-2xl font-semibold">Website payment setup</h1><p className="mt-1 text-sm text-muted-foreground">Review vendor requests and activate their Razorpay gateway for customer bookings.</p></header>{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}{notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-emerald-800">{notice}</p>}<div className="grid gap-5 lg:grid-cols-2"><section className="space-y-3 rounded-xl border bg-card p-5"><div className="flex justify-between"><h2 className="font-semibold">Setup requests</h2><Button variant="outline" size="sm" disabled={pending} onClick={() => void load().catch((reason) => setError(reason.message))}>Refresh</Button></div>{!items.length && <p className="text-sm text-muted-foreground">No setup requests.</p>}{items.map((item) => <button className="block w-full rounded-lg border p-3 text-left" key={item.vendor_profile_id} disabled={pending} onClick={() => { setVendorId(String(item.vendor_profile_id)); setForm({ keyId:'',keySecret:'',webhookSecret:'',testMode:true }) }}><strong className="block text-sm">{item.business_name ?? `Vendor ${item.vendor_profile_id}`}</strong><span className="text-xs text-muted-foreground">{item.status}</span><p className="mt-1 whitespace-pre-wrap text-sm">{item.notes}</p></button>)}</section><form className="space-y-3 rounded-xl border bg-card p-5" onSubmit={(event) => { event.preventDefault(); void activate() }}><h2 className="font-semibold">Verify and activate gateway</h2><label className="block text-sm">Vendor profile ID<input className={input} type="number" min={1} required value={vendorId} onChange={(event) => setVendorId(event.target.value)} /></label><label className="block text-sm">Razorpay key ID<input className={input} required autoComplete="off" value={form.keyId} onChange={(event) => setForm({ ...form, keyId: event.target.value })} /></label><label className="block text-sm">Razorpay key secret<input className={input} type="password" required autoComplete="new-password" value={form.keySecret} onChange={(event) => setForm({ ...form, keySecret: event.target.value })} /></label><label className="block text-sm">Webhook signing secret<input className={input} type="password" required minLength={16} autoComplete="new-password" value={form.webhookSecret} onChange={(event) => setForm({ ...form, webhookSecret: event.target.value })} /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.testMode} onChange={(event) => setForm({ ...form, testMode: event.target.checked })} />Use Razorpay test mode</label><p className="text-xs text-muted-foreground">Submitting verifies the credentials with Razorpay and stores them securely. Customer payments still require the vendor’s confirmation of each booking.</p><Button type="submit" disabled={pending}>{pending ? 'Verifying credentials…' : 'Verify and activate'}</Button></form></div></main>
}
