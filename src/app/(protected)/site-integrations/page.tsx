'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AdminIntegrationPanel } from './admin-integration-panel'

export default function SiteIntegrationsPage() {
  const [input, setInput] = useState('')
  const [vendorId, setVendorId] = useState<number | null>(null)
  return <main className="space-y-6"><div><h1 className="text-2xl font-semibold">Website API connections</h1><p className="mt-2 text-sm text-muted-foreground">Create and review keys for one vendor at a time. Every action records your admin account.</p></div><form className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4" onSubmit={(event) => { event.preventDefault(); const id = Number(input); if (Number.isInteger(id) && id > 0) setVendorId(id) }}><label className="text-sm">Vendor profile ID<input className="mt-1 block rounded-lg border bg-background px-3 py-2" type="number" min="1" required value={input} onChange={(event) => setInput(event.target.value)} /></label><Button type="submit">Load vendor connections</Button></form>{vendorId && <AdminIntegrationPanel key={vendorId} vendorProfileId={vendorId} />}</main>
}
