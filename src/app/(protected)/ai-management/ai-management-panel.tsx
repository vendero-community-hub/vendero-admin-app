'use client'

import { useMemo, useState } from 'react'
import { Bot, CheckCircle2, Coins, ImageIcon, Plus, RefreshCw, Save, Sparkles, Star, Trash2, Type, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

export type AiFeaturePricing = {
  code: string
  title: string
  description: string
  outputType: 'text' | 'image' | 'document'
  credits: number
  baseCredits: number
  fixedChargeInr: number | null
  enabled: boolean
  supportsAsync: boolean
  requiresConfirmation: boolean
  allowedQualityTiers: string[]
}

export type AiFeaturePricingData = {
  features: AiFeaturePricing[]
  creditPacks?: AiCreditPack[]
  featurePricingLoadError?: string | null
  creditPacksLoadError?: string | null
}

export type AiCreditPack = {
  id?: string
  code: string
  title: string
  price: number
  currency: 'INR'
  credits: number
  isDefault: boolean
  isActive: boolean
  source?: 'seed' | 'admin'
}

type FeatureDraft = {
  baseCredits: string
  fixedChargeInr: string
  requiresConfirmation: boolean
}

type CreditPackDraft = {
  title: string
  price: string
  credits: string
  isDefault: boolean
  isActive: boolean
}

const EMPTY_PACK = {
  code: '',
  title: '',
  price: '',
  credits: '',
  isDefault: false,
  isActive: true,
}

function adminToken() {
  return document.cookie
    .split('; ')
    .find((part) => part.startsWith('vendero_admin_access_token='))
    ?.split('=')[1]
}

function draftFromFeature(feature: AiFeaturePricing): FeatureDraft {
  return {
    baseCredits: String(feature.baseCredits),
    fixedChargeInr: feature.fixedChargeInr === null ? '' : String(feature.fixedChargeInr),
    requiresConfirmation: feature.requiresConfirmation,
  }
}

function outputIcon(outputType: AiFeaturePricing['outputType']) {
  if (outputType === 'image') return ImageIcon
  if (outputType === 'text') return Type
  return Sparkles
}

function unwrapPayload(payload: any) {
  return payload?.data?.data ?? payload?.data ?? payload
}

function packDraft(pack: AiCreditPack): CreditPackDraft {
  return {
    title: pack.title,
    price: String(pack.price),
    credits: String(pack.credits),
    isDefault: pack.isDefault,
    isActive: pack.isActive,
  }
}

async function requestAdmin(path: string, method: string, body?: Record<string, unknown>) {
  const token = adminToken()
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
    throw new Error(payload?.error?.message ?? payload?.message ?? 'AI credit pack update failed')
  }
  return unwrapPayload(payload)
}

export function AiManagementPanel({
  initialData,
}: {
  initialData: AiFeaturePricingData | null
}) {
  const [features, setFeatures] = useState(initialData?.features ?? [])
  const [creditPacks, setCreditPacks] = useState(initialData?.creditPacks ?? [])
  const [packDrafts, setPackDrafts] = useState<Record<string, CreditPackDraft>>(() =>
    Object.fromEntries((initialData?.creditPacks ?? []).map((pack) => [pack.code, packDraft(pack)])),
  )
  const [newPack, setNewPack] = useState(EMPTY_PACK)
  const [savingPackCode, setSavingPackCode] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, FeatureDraft>>(() =>
    Object.fromEntries((initialData?.features ?? []).map((feature) => [feature.code, draftFromFeature(feature)])),
  )
  const [savingCode, setSavingCode] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(
    initialData ? null : 'AI billing data could not be loaded. Check the API AI_SERVICE_URL and AI_INTERNAL_TOKEN.',
  )
  const featurePricingLoadError = initialData?.featurePricingLoadError ?? null
  const creditPacksLoadError = initialData?.creditPacksLoadError ?? null
  const hasLoadError = !initialData || Boolean(featurePricingLoadError || creditPacksLoadError)

  const summary = useMemo(
    () => ({
      enabled: features.filter((feature) => feature.enabled).length,
      image: features.filter((feature) => feature.outputType === 'image').length,
      text: features.filter((feature) => feature.outputType === 'text').length,
      packs: creditPacks.filter((pack) => pack.isActive).length,
    }),
    [creditPacks, features],
  )

  function changeDraft(code: string, patch: Partial<FeatureDraft>) {
    setDrafts((current) => ({
      ...current,
      [code]: { ...current[code], ...patch },
    }))
  }

  function changePackDraft(code: string, patch: Partial<CreditPackDraft>) {
    setPackDrafts((current) => ({
      ...current,
      [code]: { ...current[code], ...patch },
    }))
  }

  function validatedPackFields(draft: CreditPackDraft) {
    const price = Number(draft.price)
    const credits = Number(draft.credits)
    if (!draft.title.trim()) throw new Error('Pack title is required.')
    if (!Number.isInteger(credits) || credits <= 0) throw new Error('Pack credits must be a positive whole number.')
    if (!Number.isFinite(price) || price <= 0) throw new Error('Pack price must be greater than zero.')
    if (draft.isDefault && !draft.isActive) throw new Error('The recommended default pack must remain active.')
    return {
      title: draft.title.trim(),
      price,
      credits,
      currency: 'INR',
      isDefault: draft.isDefault,
      isActive: draft.isActive,
    }
  }

  async function savePack(pack: AiCreditPack) {
    const draft = packDrafts[pack.code] ?? packDraft(pack)
    setSavingPackCode(pack.code)
    setError(null)
    setMessage(null)
    try {
      const payload = validatedPackFields(draft)
      const data = await requestAdmin(
        `/api/v1/admin/ai/credit-packs/${encodeURIComponent(pack.code)}`,
        'PUT',
        payload,
      )
      const updated = (data?.creditPack ?? data) as AiCreditPack
      setCreditPacks((current) => current.map((item) => (
        item.code === pack.code ? { ...item, ...updated } : updated.isDefault ? { ...item, isDefault: false } : item
      )))
      setPackDrafts((current) => ({
        ...current,
        [pack.code]: packDraft({ ...pack, ...updated }),
        ...(updated.isDefault
          ? Object.fromEntries(Object.entries(current).map(([code, value]) => [code, code === pack.code ? packDraft({ ...pack, ...updated }) : { ...value, isDefault: false }]))
          : {}),
      }))
      setMessage(`${updated.title ?? pack.title} updated.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'AI credit pack update failed')
    } finally {
      setSavingPackCode(null)
    }
  }

  async function createPack() {
    setSavingPackCode('__new__')
    setError(null)
    setMessage(null)
    try {
      const code = newPack.code.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_')
      if (!/^[a-z0-9][a-z0-9_-]{1,63}$/.test(code)) {
        throw new Error('Pack code must be 2–64 lowercase letters, numbers, underscores, or hyphens.')
      }
      const payload = { code, ...validatedPackFields(newPack) }
      const data = await requestAdmin('/api/v1/admin/ai/credit-packs', 'POST', payload)
      const created = (data?.creditPack ?? data) as AiCreditPack
      setCreditPacks((current) => [
        ...current.map((item) => created.isDefault ? { ...item, isDefault: false } : item),
        created,
      ].sort((left, right) => left.credits - right.credits))
      setPackDrafts((current) => ({
        ...Object.fromEntries(Object.entries(current).map(([code, value]) => [code, created.isDefault ? { ...value, isDefault: false } : value])),
        [created.code]: packDraft(created),
      }))
      setNewPack(EMPTY_PACK)
      setMessage(`${created.title} created.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'AI credit pack creation failed')
    } finally {
      setSavingPackCode(null)
    }
  }

  async function deactivatePack(pack: AiCreditPack) {
    if (!window.confirm(`Deactivate ${pack.title}? Existing purchases remain unchanged.`)) return
    setSavingPackCode(pack.code)
    setError(null)
    setMessage(null)
    try {
      const data = await requestAdmin(`/api/v1/admin/ai/credit-packs/${encodeURIComponent(pack.code)}`, 'DELETE')
      const updated = (data?.creditPack ?? data) as AiCreditPack
      setCreditPacks((current) => current.map((item) => item.code === pack.code ? { ...item, ...updated, isActive: false } : item))
      setPackDrafts((current) => ({
        ...current,
        [pack.code]: { ...(current[pack.code] ?? packDraft(pack)), isActive: false },
      }))
      setMessage(`${pack.title} deactivated.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'AI credit pack deactivation failed')
    } finally {
      setSavingPackCode(null)
    }
  }

  async function saveFeature(feature: AiFeaturePricing) {
    const draft = drafts[feature.code]
    const baseCredits = Number(draft.baseCredits)
    const fixedChargeInr = draft.fixedChargeInr.trim() ? Number(draft.fixedChargeInr) : null

    if (!Number.isInteger(baseCredits) || baseCredits <= 0) {
      setError(`${feature.title}: base credits must be a positive whole number.`)
      return
    }
    if (fixedChargeInr !== null && (!Number.isFinite(fixedChargeInr) || fixedChargeInr <= 0)) {
      setError(`${feature.title}: fixed charge must be a positive amount or empty.`)
      return
    }

    setSavingCode(feature.code)
    setError(null)
    setMessage(null)

    try {
      const token = adminToken()
      const response = await fetch(`/api/v1/admin/ai/feature-pricing/${encodeURIComponent(feature.code)}`, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          baseCredits,
          fixedChargeInr,
          requiresConfirmation: draft.requiresConfirmation,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? payload?.message ?? 'AI pricing update failed')
      }

      const updated = unwrapPayload(payload)?.feature as AiFeaturePricing
      setFeatures((current) => current.map((item) => (item.code === feature.code ? { ...item, ...updated } : item)))
      setDrafts((current) => ({ ...current, [feature.code]: draftFromFeature({ ...feature, ...updated }) }))
      setMessage(`${feature.title} pricing updated.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'AI pricing update failed')
    } finally {
      setSavingCode(null)
    }
  }

  return (
    <>
      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-primary/25 bg-primary/10 p-2.5 text-primary">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">AI Service management</h1>
            <p className="text-sm text-muted-foreground">
              Control feature credits, fixed charges, and customer confirmation rules.
            </p>
          </div>
          <Badge className="ml-auto" variant={!initialData ? 'danger' : hasLoadError ? 'warning' : 'success'}>
            {!initialData ? 'Service unavailable' : hasLoadError ? 'Service needs attention' : 'Service connected'}
          </Badge>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Enabled features</CardDescription></CardHeader>
          <CardContent className="text-3xl font-semibold">{summary.enabled}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Image features</CardDescription></CardHeader>
          <CardContent className="text-3xl font-semibold">{summary.image}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Text features</CardDescription></CardHeader>
          <CardContent className="text-3xl font-semibold">{summary.text}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Active credit packs</CardDescription></CardHeader>
          <CardContent className="text-3xl font-semibold">{summary.packs}</CardContent>
        </Card>
      </section>

      {error ? (
        <div className="flex gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-400">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
      {message ? (
        <div className="flex gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      ) : null}

      {featurePricingLoadError || creditPacksLoadError ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-500">
          <div className="flex gap-3">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              {featurePricingLoadError ? <p>Features: {featurePricingLoadError}</p> : null}
              {creditPacksLoadError ? <p>Credit packs: {creditPacksLoadError}</p> : null}
            </div>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" />Retry
          </Button>
        </div>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">AI credit packs</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              These packs appear immediately in the vendor app. Deactivation never changes an in-flight purchase snapshot.
            </p>
          </div>
          <Badge variant="outline">INR checkout</Badge>
        </div>

        <Card className="border-primary/25 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Plus className="h-4 w-4" />Create credit pack</CardTitle>
            <CardDescription>Codes cannot be changed after creation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <label className="space-y-2 text-sm font-medium">
                <span>Code</span>
                <Input
                  value={newPack.code}
                  onChange={(event) => setNewPack((current) => ({ ...current, code: event.target.value }))}
                  placeholder="starter_credits"
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                <span>Title</span>
                <Input
                  value={newPack.title}
                  onChange={(event) => setNewPack((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Starter credits"
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                <span>Credits</span>
                <Input
                  value={newPack.credits}
                  onChange={(event) => setNewPack((current) => ({ ...current, credits: event.target.value }))}
                  inputMode="numeric"
                  type="number"
                  min="1"
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                <span>Price (INR)</span>
                <Input
                  value={newPack.price}
                  onChange={(event) => setNewPack((current) => ({ ...current, price: event.target.value }))}
                  inputMode="decimal"
                  type="number"
                  min="0.01"
                  step="0.01"
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-primary/15 pt-4">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={newPack.isDefault}
                  onChange={(event) => setNewPack((current) => ({ ...current, isDefault: event.target.checked }))}
                />
                Mark as recommended default
              </label>
              <Button onClick={createPack} disabled={Boolean(savingPackCode) || Boolean(creditPacksLoadError)}>
                {savingPackCode === '__new__' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {savingPackCode === '__new__' ? 'Creating…' : 'Create pack'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          {creditPacks.map((pack) => {
            const draft = packDrafts[pack.code] ?? packDraft(pack)
            const saving = savingPackCode === pack.code
            return (
              <Card key={pack.code} className={pack.isActive ? 'border-border/70 bg-card/85' : 'border-border/50 bg-muted/25'}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="flex flex-wrap items-center gap-2">
                        {pack.title}
                        {pack.isDefault ? <Badge variant="warning"><Star className="h-3 w-3" />Recommended</Badge> : null}
                      </CardTitle>
                      <CardDescription className="mt-1">{pack.code} • {pack.source ?? 'admin'}</CardDescription>
                    </div>
                    <Badge variant={pack.isActive ? 'success' : 'secondary'}>{pack.isActive ? 'Active' : 'Inactive'}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="space-y-2 text-sm font-medium sm:col-span-3">
                      <span>Title</span>
                      <Input value={draft.title} onChange={(event) => changePackDraft(pack.code, { title: event.target.value })} />
                    </label>
                    <label className="space-y-2 text-sm font-medium">
                      <span>Credits</span>
                      <Input value={draft.credits} onChange={(event) => changePackDraft(pack.code, { credits: event.target.value })} type="number" min="1" />
                    </label>
                    <label className="space-y-2 text-sm font-medium">
                      <span>Price (INR)</span>
                      <Input value={draft.price} onChange={(event) => changePackDraft(pack.code, { price: event.target.value })} type="number" min="0.01" step="0.01" />
                    </label>
                    <div className="space-y-2 text-sm font-medium">
                      <span className="block">Availability</span>
                      <label className="flex h-10 items-center gap-2 rounded-md border border-input px-3">
                        <input
                          type="checkbox"
                          checked={draft.isActive}
                          disabled={pack.isDefault}
                          onChange={(event) => changePackDraft(pack.code, { isActive: event.target.checked })}
                        />
                        Active
                      </label>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={draft.isDefault}
                        disabled={pack.isDefault}
                        onChange={(event) => changePackDraft(pack.code, { isDefault: event.target.checked })}
                      />
                      Recommended default
                    </label>
                    <div className="flex gap-2">
                      {pack.isActive ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={Boolean(savingPackCode) || pack.isDefault}
                          title={pack.isDefault ? 'Choose another recommended pack before deactivating this one.' : undefined}
                          onClick={() => deactivatePack(pack)}
                        >
                          <Trash2 className="h-4 w-4" />Deactivate
                        </Button>
                      ) : null}
                      <Button size="sm" disabled={Boolean(savingPackCode)} onClick={() => savePack(pack)}>
                        {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {saving ? 'Saving…' : 'Save'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {!creditPacks.length && initialData && !creditPacksLoadError ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No credit packs exist yet. Create the first pack above.</CardContent></Card>
        ) : null}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {features.map((feature) => {
          const Icon = outputIcon(feature.outputType)
          const draft = drafts[feature.code] ?? draftFromFeature(feature)
          const saving = savingCode === feature.code
          return (
            <Card key={feature.code} className="border-border/70 bg-card/85">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div className="rounded-lg border border-border bg-background/40 p-2 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle>{feature.title}</CardTitle>
                      <CardDescription className="mt-1 leading-5">{feature.description}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={feature.enabled ? 'success' : 'secondary'}>
                    {feature.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium">
                    <span className="flex items-center gap-2"><Coins className="h-4 w-4 text-muted-foreground" />Base credits</span>
                    <Input
                      inputMode="numeric"
                      min="1"
                      step="1"
                      type="number"
                      value={draft.baseCredits}
                      onChange={(event) => changeDraft(feature.code, { baseCredits: event.target.value })}
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium">
                    <span>Fixed charge (INR)</span>
                    <Input
                      inputMode="decimal"
                      min="0.01"
                      step="0.01"
                      type="number"
                      value={draft.fixedChargeInr}
                      onChange={(event) => changeDraft(feature.code, { fixedChargeInr: event.target.value })}
                      placeholder="Use credit pricing"
                    />
                  </label>
                </div>

                <Switch
                  checked={draft.requiresConfirmation}
                  description="Ask the vendor to confirm the estimated credit spend before generation."
                  disabled={saving}
                  label="Require customer confirmation"
                  onCheckedChange={(checked) => changeDraft(feature.code, { requiresConfirmation: checked })}
                />

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{feature.outputType}</Badge>
                    {feature.allowedQualityTiers.map((tier) => <Badge key={tier} variant="secondary">{tier}</Badge>)}
                    {feature.supportsAsync ? <Badge variant="outline">async</Badge> : null}
                  </div>
                  <Button disabled={Boolean(savingCode)} onClick={() => saveFeature(feature)} size="sm">
                    {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </section>

      {!features.length && initialData && !featurePricingLoadError ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No enabled AI features were returned by the service.</CardContent></Card>
      ) : null}
    </>
  )
}
