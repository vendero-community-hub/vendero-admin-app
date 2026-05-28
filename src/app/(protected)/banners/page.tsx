import { API_URL, ENV_HEADERS } from '@/lib/environment'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { BarChart3, Eye, IndianRupee, MousePointerClick, Plus, Settings2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type BannerStatus = 'draft' | 'pending_review' | 'active' | 'paused' | 'rejected' | 'expired'
type BannerOwnerType = 'vendor' | 'vendero'
type BannerActionType =
  | 'none'
  | 'own_profile'
  | 'vendor_profile'
  | 'group'
  | 'broadcast'
  | 'direct_chat'
  | 'screen'
  | 'video_screen'
  | 'detail_screen'
  | 'external_url'
type PricingModel = 'per_day' | 'per_week' | 'per_month' | 'per_view' | 'per_click' | 'flat'

type Banner = {
  id: number
  publicId: string
  ownerType: BannerOwnerType
  vendorProfileId: number | null
  title: string
  subtitle: string | null
  body: string | null
  imageUrl: string
  videoUrl: string | null
  ctaLabel: string | null
  actionType: BannerActionType
  actionPayload: Record<string, unknown>
  detailPayload: Record<string, unknown>
  placement: string
  status: BannerStatus
  startsAt: string | null
  endsAt: string | null
  priority: number
  bidAmount: number
  pricingModel: PricingModel | null
  pricing: {
    currency: string
    pricePerDay: number
    pricePerWeek: number
    pricePerMonth: number
    pricePerView: number
    pricePerClick: number
    flatPrice: number
  }
  limits: {
    maxViews: number | null
    maxClicks: number | null
    dailyViewCap: number | null
    dailyClickCap: number | null
  }
  metrics: {
    views: number
    clicks: number
    spendAmount: number
    ctr: number
  }
  rejectedReason?: string | null
  createdAt: string | null
  updatedAt?: string | null
}

type PricingSettings = {
  perDayEnabled: boolean
  perWeekEnabled: boolean
  perMonthEnabled: boolean
  perViewEnabled: boolean
  perClickEnabled: boolean
  flatEnabled: boolean
  defaultPricePerDay: number
  defaultPricePerWeek: number
  defaultPricePerMonth: number
  defaultPricePerView: number
  defaultPricePerClick: number
  defaultFlatPrice: number
  currency: string
  policy: Record<string, unknown>
}

type BannerOverview = {
  summary: {
    total: number
    active: number
    pendingReview: number
    vendorOwned: number
    venderoOwned: number
    views: number
    clicks: number
    spendAmount: number
    ctr: number
  }
  pricingSettings: PricingSettings
  ledger: Array<{ entryType: string; amount: number; count: number }>
  banners: Banner[]
}

const emptyPricingSettings: PricingSettings = {
  perDayEnabled: true,
  perWeekEnabled: true,
  perMonthEnabled: true,
  perViewEnabled: false,
  perClickEnabled: false,
  flatEnabled: true,
  defaultPricePerDay: 0,
  defaultPricePerWeek: 0,
  defaultPricePerMonth: 0,
  defaultPricePerView: 0,
  defaultPricePerClick: 0,
  defaultFlatPrice: 0,
  currency: 'INR',
  policy: {
    reviewRequiredForVendorBanners: true,
    firstBatchSize: 3,
    rotation: 'bid_priority_ctr',
  },
}

const emptyOverview: BannerOverview = {
  summary: {
    total: 0,
    active: 0,
    pendingReview: 0,
    vendorOwned: 0,
    venderoOwned: 0,
    views: 0,
    clicks: 0,
    spendAmount: 0,
    ctr: 0,
  },
  pricingSettings: emptyPricingSettings,
  ledger: [],
  banners: [],
}

const actionTypes: BannerActionType[] = [
  'detail_screen',
  'video_screen',
  'screen',
  'external_url',
  'own_profile',
  'vendor_profile',
  'direct_chat',
  'group',
  'broadcast',
  'none',
]

const pricingModels: PricingModel[] = ['per_day', 'per_week', 'per_month', 'per_view', 'per_click', 'flat']
const statuses: BannerStatus[] = ['active', 'pending_review', 'paused', 'draft', 'rejected', 'expired']
const appScreenTargets = [
  'marketplace',
  'crm',
  'invoice',
  'chats',
  'availability',
  'my_trips',
  'leads',
  'subscription',
  'vendor_search',
  'white_label',
]

function unwrapPayload(payload: any) {
  return payload?.data?.data ?? payload?.data ?? payload
}

async function getAdminToken() {
  const cookieStore = await cookies()
  return cookieStore.get('vendero_admin_access_token')?.value ?? null
}

async function adminRequest(path: string, init?: RequestInit) {
  const token = await getAdminToken()
  if (!token) return null
  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData

  const response = await fetch(`${API_URL}${path}`, {
    cache: 'no-store',
    ...init,
    headers: {
      ...ENV_HEADERS,
      ...(init?.body && !isFormData ? { 'content-type': 'application/json' } : {}),
      authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  })

  if (!response.ok) return null
  const payload = await response.json().catch(() => ({}))
  return unwrapPayload(payload)
}

async function getBannerOverview() {
  const overview = await adminRequest('/api/v1/admin/banners')
  return (overview ?? emptyOverview) as BannerOverview
}

function parseNumber(value: FormDataEntryValue | null, fallback = 0) {
  const nextValue = Number(value ?? fallback)
  return Number.isFinite(nextValue) ? nextValue : fallback
}

function parseOptionalNumber(value: FormDataEntryValue | null) {
  if (value === null || String(value).trim() === '') return null
  const nextValue = Number(value)
  return Number.isFinite(nextValue) ? nextValue : null
}

function parseText(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim()
  return text || null
}

function getUploadFile(formData: FormData, name: string) {
  const value = formData.get(name)
  if (!value || typeof value === 'string') return null
  if ('size' in value && Number(value.size) > 0) return value as File
  return null
}

async function uploadBannerImage(formData: FormData) {
  const file = getUploadFile(formData, 'bannerFile')
  if (!file) return null

  const uploadFormData = new FormData()
  uploadFormData.append('scope', 'banner')
  uploadFormData.append('file', file)

  const uploaded = await adminRequest('/api/v1/admin/media/upload', {
    method: 'POST',
    body: uploadFormData,
  })

  const url = uploaded?.url ?? uploaded?.fileUrl ?? uploaded?.publicUrl
  return typeof url === 'string' && url.trim() ? url.trim() : null
}

function parseTextLines(value: FormDataEntryValue | null) {
  return String(value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function parseFeatureLines(value: FormDataEntryValue | null) {
  return parseTextLines(value).map((line) => {
    const [title, ...rest] = line.split(':')
    const cleanTitle = title.trim()
    const text = rest.join(':').trim()
    return {
      title: cleanTitle,
      text: text || cleanTitle,
    }
  })
}

function parseJsonObject(value: FormDataEntryValue | null, fallback: Record<string, unknown>) {
  const text = String(value ?? '').trim()
  if (!text) return fallback

  try {
    const parsed = JSON.parse(text)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

function normalizeActionTarget(value: string | null) {
  if (!value) return null
  const numeric = Number(value)
  return Number.isFinite(numeric) && String(numeric) === value ? numeric : value
}

function objectValue(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function buildActionPayload(formData: FormData, actionType: BannerActionType) {
  const basePayload = parseJsonObject(formData.get('actionPayloadJson'), {})
  const screenKey = parseText(formData.get('screenKey'))
  const externalUrl = parseText(formData.get('externalUrl'))
  const videoUrl = parseText(formData.get('videoUrl'))
  const actionTarget = normalizeActionTarget(parseText(formData.get('actionTarget')))
  const actionTitle = parseText(formData.get('actionTitle'))

  if (actionType === 'screen') {
    return { ...basePayload, screenKey: screenKey ?? basePayload.screenKey ?? 'marketplace' }
  }

  if (actionType === 'external_url') {
    return { ...basePayload, url: externalUrl ?? basePayload.url }
  }

  if (actionType === 'video_screen') {
    return { ...basePayload, videoUrl: videoUrl ?? basePayload.videoUrl }
  }

  if (actionType === 'vendor_profile' || actionType === 'direct_chat') {
    return {
      ...basePayload,
      vendorProfileId: actionTarget ?? basePayload.vendorProfileId,
      vendorName: actionTitle ?? basePayload.vendorName,
      title: actionTitle ?? basePayload.title,
    }
  }

  if (actionType === 'group') {
    return {
      ...basePayload,
      conversationId: actionTarget ?? basePayload.conversationId,
      conversation: {
        id: actionTarget ?? objectValue(basePayload.conversation).id,
        title: actionTitle ?? objectValue(basePayload.conversation).title ?? 'Group',
      },
    }
  }

  if (actionType === 'broadcast') {
    return {
      ...basePayload,
      broadcastListId: actionTarget ?? basePayload.broadcastListId,
      name: actionTitle ?? basePayload.name ?? 'Broadcast',
    }
  }

  return basePayload
}

function buildDetailPayload(formData: FormData) {
  const basePayload = parseJsonObject(formData.get('detailPayloadJson'), {})
  const title = parseText(formData.get('detailTitle'))
  const body = parseText(formData.get('detailBody'))
  const features = parseFeatureLines(formData.get('featureList'))
  const images = parseTextLines(formData.get('detailImageUrls'))
  const ctaUrl = parseText(formData.get('detailCtaUrl')) ?? parseText(formData.get('externalUrl'))
  const ctaScreenKey = parseText(formData.get('detailCtaScreenKey'))
  const ctaLabel = parseText(formData.get('detailCtaLabel')) ?? parseText(formData.get('ctaLabel')) ?? 'Open'

  return {
    ...basePayload,
    ...(title ? { title } : {}),
    ...(body ? { body } : {}),
    ...(features.length ? { features } : {}),
    ...(images.length ? { images } : {}),
    ...(ctaUrl || ctaScreenKey
      ? {
          cta: {
            ...objectValue(basePayload.cta),
            label: ctaLabel,
            ...(ctaUrl ? { url: ctaUrl } : {}),
            ...(ctaScreenKey
              ? { actionType: 'screen', screenKey: ctaScreenKey, actionPayload: { screenKey: ctaScreenKey } }
              : {}),
          },
        }
      : {}),
  }
}

function money(value: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value)
}

function compactNumber(value: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(value)
}

function label(value: string) {
  return value.replace(/_/g, ' ')
}

function formValue(value: unknown) {
  return value === null || value === undefined ? '' : String(value)
}

function featureListText(banner: Banner) {
  const features = banner.detailPayload?.features
  if (!Array.isArray(features)) return ''

  return features
    .map((feature) => {
      if (typeof feature === 'string') return feature
      if (!feature || typeof feature !== 'object') return ''
      const typedFeature = feature as Record<string, unknown>
      const title = String(typedFeature.title ?? typedFeature.label ?? '').trim()
      const text = String(typedFeature.text ?? typedFeature.body ?? typedFeature.description ?? '').trim()
      return title && text ? `${title}: ${text}` : title || text
    })
    .filter(Boolean)
    .join('\n')
}

function detailImageText(banner: Banner) {
  const images = banner.detailPayload?.images
  return Array.isArray(images) ? images.map((image) => String(image)).join('\n') : ''
}

function statusVariant(status: BannerStatus): 'default' | 'success' | 'warning' | 'danger' | 'secondary' {
  if (status === 'active') return 'success'
  if (status === 'pending_review' || status === 'draft') return 'warning'
  if (status === 'rejected' || status === 'expired') return 'danger'
  return 'secondary'
}

async function updatePricingSettings(formData: FormData) {
  'use server'

  const policy = parseJsonObject(formData.get('policyJson'), emptyPricingSettings.policy)
  await adminRequest('/api/v1/admin/banners/pricing', {
    method: 'PUT',
    body: JSON.stringify({
      perDayEnabled: formData.has('perDayEnabled'),
      perWeekEnabled: formData.has('perWeekEnabled'),
      perMonthEnabled: formData.has('perMonthEnabled'),
      perViewEnabled: formData.has('perViewEnabled'),
      perClickEnabled: formData.has('perClickEnabled'),
      flatEnabled: formData.has('flatEnabled'),
      defaultPricePerDay: parseNumber(formData.get('defaultPricePerDay')),
      defaultPricePerWeek: parseNumber(formData.get('defaultPricePerWeek')),
      defaultPricePerMonth: parseNumber(formData.get('defaultPricePerMonth')),
      defaultPricePerView: parseNumber(formData.get('defaultPricePerView')),
      defaultPricePerClick: parseNumber(formData.get('defaultPricePerClick')),
      defaultFlatPrice: parseNumber(formData.get('defaultFlatPrice')),
      currency: String(formData.get('currency') ?? 'INR').trim() || 'INR',
      policy,
    }),
  })

  revalidatePath('/banners')
}

async function createVenderoBanner(formData: FormData) {
  'use server'

  const actionType = String(formData.get('actionType') ?? 'detail_screen') as BannerActionType
  const imageUrl = await uploadBannerImage(formData)
  await adminRequest('/api/v1/admin/banners', {
    method: 'POST',
    body: JSON.stringify({
      ownerType: 'vendero',
      title: String(formData.get('title') ?? '').trim(),
      subtitle: parseText(formData.get('subtitle')),
      body: parseText(formData.get('body')),
      imageUrl: imageUrl ?? '',
      videoUrl: parseText(formData.get('videoUrl')),
      ctaLabel: parseText(formData.get('ctaLabel')) ?? 'Open',
      placement: String(formData.get('placement') ?? 'home').trim() || 'home',
      status: String(formData.get('status') ?? 'active') as BannerStatus,
      actionType,
      actionPayload: buildActionPayload(formData, actionType),
      detailPayload: buildDetailPayload(formData),
      priority: parseNumber(formData.get('priority')),
      bidAmount: parseNumber(formData.get('bidAmount')),
      currency: String(formData.get('currency') ?? 'INR').trim() || 'INR',
      pricingModel: parseText(formData.get('pricingModel')) as PricingModel | null,
      pricePerDay: parseNumber(formData.get('pricePerDay')),
      pricePerWeek: parseNumber(formData.get('pricePerWeek')),
      pricePerMonth: parseNumber(formData.get('pricePerMonth')),
      pricePerView: parseNumber(formData.get('pricePerView')),
      pricePerClick: parseNumber(formData.get('pricePerClick')),
      flatPrice: parseNumber(formData.get('flatPrice')),
      maxViews: parseOptionalNumber(formData.get('maxViews')),
      maxClicks: parseOptionalNumber(formData.get('maxClicks')),
      dailyViewCap: parseOptionalNumber(formData.get('dailyViewCap')),
      dailyClickCap: parseOptionalNumber(formData.get('dailyClickCap')),
    }),
  })

  revalidatePath('/banners')
}

async function updateBannerQuickAction(formData: FormData) {
  'use server'

  const id = String(formData.get('id') ?? '').trim()
  if (!id) return
  const actionType = String(formData.get('actionType') ?? 'detail_screen') as BannerActionType
  const uploadedImageUrl = await uploadBannerImage(formData)
  const imageUrl = uploadedImageUrl ?? String(formData.get('imageUrl') ?? '').trim()

  await adminRequest(`/api/v1/admin/banners/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      ownerType: String(formData.get('ownerType') ?? 'vendero') as BannerOwnerType,
      title: String(formData.get('title') ?? '').trim(),
      subtitle: parseText(formData.get('subtitle')),
      body: parseText(formData.get('body')),
      imageUrl,
      videoUrl: parseText(formData.get('videoUrl')),
      ctaLabel: parseText(formData.get('ctaLabel')) ?? 'Open',
      placement: String(formData.get('placement') ?? 'home').trim() || 'home',
      actionType,
      actionPayload: buildActionPayload(formData, actionType),
      detailPayload: buildDetailPayload(formData),
      status: String(formData.get('status') ?? 'paused') as BannerStatus,
      startsAt: parseText(formData.get('startsAt')),
      endsAt: parseText(formData.get('endsAt')),
      priority: parseNumber(formData.get('priority')),
      bidAmount: parseNumber(formData.get('bidAmount')),
      currency: String(formData.get('currency') ?? 'INR').trim() || 'INR',
      pricingModel: parseText(formData.get('pricingModel')) as PricingModel | null,
      pricePerDay: parseNumber(formData.get('pricePerDay')),
      pricePerWeek: parseNumber(formData.get('pricePerWeek')),
      pricePerMonth: parseNumber(formData.get('pricePerMonth')),
      pricePerView: parseNumber(formData.get('pricePerView')),
      pricePerClick: parseNumber(formData.get('pricePerClick')),
      flatPrice: parseNumber(formData.get('flatPrice')),
      maxViews: parseOptionalNumber(formData.get('maxViews')),
      maxClicks: parseOptionalNumber(formData.get('maxClicks')),
      dailyViewCap: parseOptionalNumber(formData.get('dailyViewCap')),
      dailyClickCap: parseOptionalNumber(formData.get('dailyClickCap')),
      rejectedReason: parseText(formData.get('rejectedReason')),
    }),
  })

  revalidatePath('/banners')
}

async function deleteBannerAction(formData: FormData) {
  'use server'

  const id = String(formData.get('id') ?? '').trim()
  if (!id) return

  await adminRequest(`/api/v1/admin/banners/${id}`, {
    method: 'DELETE',
  })

  revalidatePath('/banners')
}

function PricingToggle({
  name,
  labelText,
  checked,
}: {
  name: keyof Pick<
    PricingSettings,
    'perDayEnabled' | 'perWeekEnabled' | 'perMonthEnabled' | 'perViewEnabled' | 'perClickEnabled' | 'flatEnabled'
  >
  labelText: string
  checked: boolean
}) {
  return (
    <label className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/30 px-3 text-sm">
      <span className="font-medium">{labelText}</span>
      <input name={name} type="checkbox" defaultChecked={checked} className="h-4 w-4 accent-primary" />
    </label>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{children}</label>
}

function JsonTextarea({
  name,
  defaultValue,
  rows = 5,
}: {
  name: string
  defaultValue: Record<string, unknown>
  rows?: number
}) {
  return (
    <textarea
      name={name}
      rows={rows}
      defaultValue={JSON.stringify(defaultValue, null, 2)}
      className="min-h-28 w-full rounded-md border border-border bg-background/70 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
    />
  )
}

function MetricTile({
  labelText,
  value,
  icon: Icon,
}: {
  labelText: string
  value: string | number
  icon: typeof BarChart3
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/30 p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <p className="text-xs">{labelText}</p>
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  )
}

export default async function BannersPage() {
  const overview = await getBannerOverview()
  const summary = overview.summary ?? emptyOverview.summary
  const pricing = overview.pricingSettings ?? emptyPricingSettings
  const chargeLedger = overview.ledger.find((row) => row.entryType === 'charge')
  const earnedAmount = chargeLedger?.amount ?? summary.spendAmount

  return (
    <main className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Banner Ads
            </Badge>
            <CardTitle className="text-3xl">Dynamic home banners, bidding, and ad billing</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7">
              Home now reads banners from the API. Vendor-created ads wait for review, while Vendero ads
              can route to app screens, video promos, detail pages, chats, profiles, groups, broadcasts,
              or external web links.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Ad Revenue</CardTitle>
            <CardDescription>Charges counted from view and click ledger rows.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <MetricTile icon={IndianRupee} labelText="Earned" value={money(earnedAmount, pricing.currency)} />
            <MetricTile icon={BarChart3} labelText="Active" value={summary.active} />
            <MetricTile icon={Eye} labelText="Views" value={compactNumber(summary.views)} />
            <MetricTile icon={MousePointerClick} labelText="Clicks" value={compactNumber(summary.clicks)} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              <CardTitle>Pricing Controls</CardTitle>
            </div>
            <CardDescription>Switch available charge methods on or off and set default banner prices.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updatePricingSettings} className="space-y-5">
              <div className="grid gap-2 sm:grid-cols-2">
                <PricingToggle name="perDayEnabled" labelText="Per day" checked={pricing.perDayEnabled} />
                <PricingToggle name="perWeekEnabled" labelText="Per week" checked={pricing.perWeekEnabled} />
                <PricingToggle name="perMonthEnabled" labelText="Per month" checked={pricing.perMonthEnabled} />
                <PricingToggle name="perViewEnabled" labelText="Per view" checked={pricing.perViewEnabled} />
                <PricingToggle name="perClickEnabled" labelText="Per click" checked={pricing.perClickEnabled} />
                <PricingToggle name="flatEnabled" labelText="Flat price" checked={pricing.flatEnabled} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <FieldLabel>Currency</FieldLabel>
                  <Input name="currency" defaultValue={pricing.currency} />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Default flat</FieldLabel>
                  <Input name="defaultFlatPrice" type="number" step="0.01" defaultValue={pricing.defaultFlatPrice} />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Default per day</FieldLabel>
                  <Input name="defaultPricePerDay" type="number" step="0.01" defaultValue={pricing.defaultPricePerDay} />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Default per week</FieldLabel>
                  <Input name="defaultPricePerWeek" type="number" step="0.01" defaultValue={pricing.defaultPricePerWeek} />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Default per month</FieldLabel>
                  <Input name="defaultPricePerMonth" type="number" step="0.01" defaultValue={pricing.defaultPricePerMonth} />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Default per view</FieldLabel>
                  <Input name="defaultPricePerView" type="number" step="0.01" defaultValue={pricing.defaultPricePerView} />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Default per click</FieldLabel>
                  <Input name="defaultPricePerClick" type="number" step="0.01" defaultValue={pricing.defaultPricePerClick} />
                </div>
              </div>

              <div className="space-y-1.5">
                <FieldLabel>Banner policy JSON</FieldLabel>
                <JsonTextarea name="policyJson" defaultValue={pricing.policy} />
              </div>

              <Button type="submit" className="w-full sm:w-auto">
                Save pricing controls
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              <CardTitle>Create Vendero Ad</CardTitle>
            </div>
            <CardDescription>Use this for in-app product promos, feature detail screens, and video screens.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createVenderoBanner} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <FieldLabel>Title</FieldLabel>
                  <Input name="title" required placeholder="Promote marketplace listings" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <FieldLabel>Subtitle</FieldLabel>
                  <Input name="subtitle" placeholder="Show vendors what they can do next" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <FieldLabel>Upload banner image</FieldLabel>
                  <Input name="bannerFile" type="file" accept="image/*" required />
                  <p className="text-xs text-muted-foreground">
                    Required size: 1200 x 500 px. The uploaded file URL is saved automatically.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>CTA</FieldLabel>
                  <Input name="ctaLabel" defaultValue="Open" />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Placement</FieldLabel>
                  <Input name="placement" defaultValue="home" />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Status</FieldLabel>
                  <select name="status" defaultValue="active" className="h-10 w-full rounded-md border border-border bg-background/70 px-3 text-sm">
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {label(status)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Action</FieldLabel>
                  <select name="actionType" defaultValue="detail_screen" className="h-10 w-full rounded-md border border-border bg-background/70 px-3 text-sm">
                    {actionTypes.map((type) => (
                      <option key={type} value={type}>
                        {label(type)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Screen target</FieldLabel>
                  <select name="screenKey" defaultValue="marketplace" className="h-10 w-full rounded-md border border-border bg-background/70 px-3 text-sm">
                    {appScreenTargets.map((screen) => (
                      <option key={screen} value={screen}>
                        {label(screen)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>External URL</FieldLabel>
                  <Input name="externalUrl" placeholder="https://..." />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Action target ID</FieldLabel>
                  <Input name="actionTarget" placeholder="Vendor, group, or broadcast ID" />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Action title</FieldLabel>
                  <Input name="actionTitle" placeholder="Optional target label" />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Video URL</FieldLabel>
                  <Input name="videoUrl" placeholder="https://..." />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Pricing model</FieldLabel>
                  <select name="pricingModel" defaultValue="flat" className="h-10 w-full rounded-md border border-border bg-background/70 px-3 text-sm">
                    <option value="">No charge</option>
                    {pricingModels.map((model) => (
                      <option key={model} value={model}>
                        {label(model)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Bid amount</FieldLabel>
                  <Input name="bidAmount" type="number" step="0.01" defaultValue="0" />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Priority</FieldLabel>
                  <Input name="priority" type="number" defaultValue="0" />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Currency</FieldLabel>
                  <Input name="currency" defaultValue={pricing.currency} />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Flat price</FieldLabel>
                  <Input name="flatPrice" type="number" step="0.01" defaultValue={pricing.defaultFlatPrice} />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Per day</FieldLabel>
                  <Input name="pricePerDay" type="number" step="0.01" defaultValue={pricing.defaultPricePerDay} />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Per week</FieldLabel>
                  <Input name="pricePerWeek" type="number" step="0.01" defaultValue={pricing.defaultPricePerWeek} />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Per month</FieldLabel>
                  <Input name="pricePerMonth" type="number" step="0.01" defaultValue={pricing.defaultPricePerMonth} />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Per view</FieldLabel>
                  <Input name="pricePerView" type="number" step="0.01" defaultValue={pricing.defaultPricePerView} />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Per click</FieldLabel>
                  <Input name="pricePerClick" type="number" step="0.01" defaultValue={pricing.defaultPricePerClick} />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Max views</FieldLabel>
                  <Input name="maxViews" type="number" placeholder="Optional" />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Max clicks</FieldLabel>
                  <Input name="maxClicks" type="number" placeholder="Optional" />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Daily views</FieldLabel>
                  <Input name="dailyViewCap" type="number" placeholder="Optional" />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Daily clicks</FieldLabel>
                  <Input name="dailyClickCap" type="number" placeholder="Optional" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <FieldLabel>Body</FieldLabel>
                  <textarea
                    name="body"
                    rows={3}
                    className="w-full rounded-md border border-border bg-background/70 px-3 py-2 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                    placeholder="Short detail page copy"
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Detail title</FieldLabel>
                  <Input name="detailTitle" placeholder="Detail screen headline" />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Detail CTA screen</FieldLabel>
                  <select name="detailCtaScreenKey" defaultValue="" className="h-10 w-full rounded-md border border-border bg-background/70 px-3 text-sm">
                    <option value="">No app CTA</option>
                    {appScreenTargets.map((screen) => (
                      <option key={screen} value={screen}>
                        {label(screen)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <FieldLabel>Detail body</FieldLabel>
                  <textarea
                    name="detailBody"
                    rows={3}
                    className="w-full rounded-md border border-border bg-background/70 px-3 py-2 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                    placeholder="Longer copy for the banner detail screen"
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Feature list</FieldLabel>
                  <textarea
                    name="featureList"
                    rows={5}
                    className="min-h-28 w-full rounded-md border border-border bg-background/70 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                    placeholder={'Fast matching: Show nearby vendors\nSimple CRM: Track every lead'}
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Detail image URLs</FieldLabel>
                  <textarea
                    name="detailImageUrls"
                    rows={5}
                    className="min-h-28 w-full rounded-md border border-border bg-background/70 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                    placeholder={'https://...\nhttps://...'}
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Detail CTA label</FieldLabel>
                  <Input name="detailCtaLabel" placeholder="Explore" />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Detail CTA URL</FieldLabel>
                  <Input name="detailCtaUrl" placeholder="https://..." />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Action payload JSON</FieldLabel>
                  <JsonTextarea
                    name="actionPayloadJson"
                    defaultValue={{
                      screenKey: 'marketplace',
                      url: 'https://vendero.in',
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Detail payload JSON</FieldLabel>
                  <JsonTextarea
                    name="detailPayloadJson"
                    defaultValue={{
                      features: [
                        { title: 'Create richer listings', text: 'Add photos, city coverage, and service details.' },
                        { title: 'Get more qualified leads', text: 'Send vendors to the right next screen with CTA.' },
                      ],
                      cta: { label: 'Explore marketplace', url: 'https://vendero.in' },
                    }}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full sm:w-auto">
                Create Vendero banner
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle>Live Banner Queue</CardTitle>
          <CardDescription>
            Algorithm uses bid, priority, CTR, limits, active window, and recently seen exclusions. The app requests banners in batches of 3.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {overview.banners.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 p-8 text-center text-sm text-muted-foreground">
              No banners created yet.
            </div>
          ) : (
            overview.banners.map((banner) => (
              <form key={banner.publicId} action={updateBannerQuickAction} className="rounded-xl border border-border/70 bg-background/25 p-4">
                <input type="hidden" name="id" value={banner.publicId} />
                <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="flex gap-4">
                    <div className="h-24 w-36 shrink-0 overflow-hidden rounded-lg border border-border/70 bg-muted">
                      <img src={banner.imageUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={statusVariant(banner.status)}>{label(banner.status)}</Badge>
                        <Badge variant={banner.ownerType === 'vendor' ? 'warning' : 'default'}>
                          {banner.ownerType === 'vendor' ? 'Vendor' : 'Vendero'}
                        </Badge>
                        <Badge variant="outline">{label(banner.actionType)}</Badge>
                      </div>
                      <div>
                        <h3 className="truncate text-base font-semibold">{banner.title}</h3>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {banner.subtitle ?? banner.body ?? 'No summary'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>{banner.placement}</span>
                        <span>{compactNumber(banner.metrics.views)} views</span>
                        <span>{compactNumber(banner.metrics.clicks)} clicks</span>
                        <span>{(banner.metrics.ctr * 100).toFixed(1)}% CTR</span>
                        <span>{money(banner.metrics.spendAmount, banner.pricing.currency)} spend</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5 sm:col-span-2">
                      <FieldLabel>Title</FieldLabel>
                      <Input name="title" required defaultValue={banner.title} />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <FieldLabel>Subtitle</FieldLabel>
                      <Input name="subtitle" defaultValue={banner.subtitle ?? ''} />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <FieldLabel>Replace banner image</FieldLabel>
                      <input type="hidden" name="imageUrl" value={banner.imageUrl} />
                      <Input name="bannerFile" type="file" accept="image/*" />
                      <p className="text-xs text-muted-foreground">
                        Leave empty to keep current image. Required size: 1200 x 500 px.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Owner</FieldLabel>
                      <select name="ownerType" defaultValue={banner.ownerType} className="h-10 w-full rounded-md border border-border bg-background/70 px-3 text-sm">
                        <option value="vendero">Vendero</option>
                        <option value="vendor">Vendor</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Placement</FieldLabel>
                      <Input name="placement" defaultValue={banner.placement} />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>CTA label</FieldLabel>
                      <Input name="ctaLabel" defaultValue={banner.ctaLabel ?? 'Open'} />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Action</FieldLabel>
                      <select name="actionType" defaultValue={banner.actionType} className="h-10 w-full rounded-md border border-border bg-background/70 px-3 text-sm">
                        {actionTypes.map((type) => (
                          <option key={type} value={type}>
                            {label(type)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Screen target</FieldLabel>
                      <select name="screenKey" defaultValue={formValue(banner.actionPayload?.screenKey ?? 'marketplace')} className="h-10 w-full rounded-md border border-border bg-background/70 px-3 text-sm">
                        {appScreenTargets.map((screen) => (
                          <option key={screen} value={screen}>
                            {label(screen)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>External URL</FieldLabel>
                      <Input name="externalUrl" defaultValue={formValue(banner.actionPayload?.url)} placeholder="https://..." />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Action target ID</FieldLabel>
                      <Input
                        name="actionTarget"
                        defaultValue={formValue(
                          banner.actionPayload?.vendorProfileId ??
                            banner.actionPayload?.conversationId ??
                            banner.actionPayload?.broadcastListId
                        )}
                        placeholder="Vendor, group, or broadcast ID"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Action title</FieldLabel>
                      <Input
                        name="actionTitle"
                        defaultValue={formValue(
                          banner.actionPayload?.vendorName ??
                            banner.actionPayload?.title ??
                            banner.actionPayload?.name
                        )}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Video URL</FieldLabel>
                      <Input name="videoUrl" defaultValue={banner.videoUrl ?? formValue(banner.actionPayload?.videoUrl)} />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Status</FieldLabel>
                      <select name="status" defaultValue={banner.status} className="h-10 w-full rounded-md border border-border bg-background/70 px-3 text-sm">
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {label(status)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Pricing model</FieldLabel>
                      <select name="pricingModel" defaultValue={banner.pricingModel ?? ''} className="h-10 w-full rounded-md border border-border bg-background/70 px-3 text-sm">
                        <option value="">No charge</option>
                        {pricingModels.map((model) => (
                          <option key={model} value={model}>
                            {label(model)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Bid</FieldLabel>
                      <Input name="bidAmount" type="number" step="0.01" defaultValue={banner.bidAmount} />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Priority</FieldLabel>
                      <Input name="priority" type="number" defaultValue={banner.priority} />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Currency</FieldLabel>
                      <Input name="currency" defaultValue={banner.pricing.currency} />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Starts at</FieldLabel>
                      <Input name="startsAt" defaultValue={banner.startsAt ?? ''} placeholder="Optional ISO date" />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Ends at</FieldLabel>
                      <Input name="endsAt" defaultValue={banner.endsAt ?? ''} placeholder="Optional ISO date" />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Per view</FieldLabel>
                      <Input name="pricePerView" type="number" step="0.01" defaultValue={banner.pricing.pricePerView} />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Per click</FieldLabel>
                      <Input name="pricePerClick" type="number" step="0.01" defaultValue={banner.pricing.pricePerClick} />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Per day</FieldLabel>
                      <Input name="pricePerDay" type="number" step="0.01" defaultValue={banner.pricing.pricePerDay} />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Per week</FieldLabel>
                      <Input name="pricePerWeek" type="number" step="0.01" defaultValue={banner.pricing.pricePerWeek} />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Per month</FieldLabel>
                      <Input name="pricePerMonth" type="number" step="0.01" defaultValue={banner.pricing.pricePerMonth} />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Flat</FieldLabel>
                      <Input name="flatPrice" type="number" step="0.01" defaultValue={banner.pricing.flatPrice} />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Max views</FieldLabel>
                      <Input name="maxViews" type="number" defaultValue={banner.limits.maxViews ?? ''} />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Max clicks</FieldLabel>
                      <Input name="maxClicks" type="number" defaultValue={banner.limits.maxClicks ?? ''} />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Daily views</FieldLabel>
                      <Input name="dailyViewCap" type="number" defaultValue={banner.limits.dailyViewCap ?? ''} />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Daily clicks</FieldLabel>
                      <Input name="dailyClickCap" type="number" defaultValue={banner.limits.dailyClickCap ?? ''} />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <FieldLabel>Body</FieldLabel>
                      <textarea
                        name="body"
                        rows={3}
                        defaultValue={banner.body ?? ''}
                        className="w-full rounded-md border border-border bg-background/70 px-3 py-2 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Detail title</FieldLabel>
                      <Input name="detailTitle" defaultValue={formValue(banner.detailPayload?.title)} />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Detail CTA screen</FieldLabel>
                      <select name="detailCtaScreenKey" defaultValue={formValue(objectValue(banner.detailPayload?.cta).screenKey)} className="h-10 w-full rounded-md border border-border bg-background/70 px-3 text-sm">
                        <option value="">No app CTA</option>
                        {appScreenTargets.map((screen) => (
                          <option key={screen} value={screen}>
                            {label(screen)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <FieldLabel>Detail body</FieldLabel>
                      <textarea
                        name="detailBody"
                        rows={3}
                        defaultValue={formValue(banner.detailPayload?.body)}
                        className="w-full rounded-md border border-border bg-background/70 px-3 py-2 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Feature list</FieldLabel>
                      <textarea
                        name="featureList"
                        rows={5}
                        defaultValue={featureListText(banner)}
                        className="min-h-28 w-full rounded-md border border-border bg-background/70 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Detail image URLs</FieldLabel>
                      <textarea
                        name="detailImageUrls"
                        rows={5}
                        defaultValue={detailImageText(banner)}
                        className="min-h-28 w-full rounded-md border border-border bg-background/70 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Detail CTA label</FieldLabel>
                      <Input name="detailCtaLabel" defaultValue={formValue(objectValue(banner.detailPayload?.cta).label)} />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Detail CTA URL</FieldLabel>
                      <Input name="detailCtaUrl" defaultValue={formValue(objectValue(banner.detailPayload?.cta).url)} />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Action payload JSON</FieldLabel>
                      <JsonTextarea name="actionPayloadJson" defaultValue={banner.actionPayload ?? {}} />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Detail payload JSON</FieldLabel>
                      <JsonTextarea name="detailPayloadJson" defaultValue={banner.detailPayload ?? {}} />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <FieldLabel>Reject reason</FieldLabel>
                      <Input name="rejectedReason" defaultValue={banner.rejectedReason ?? ''} placeholder="Only needed when rejecting" />
                    </div>
                    <div className="flex flex-wrap gap-2 sm:col-span-2">
                      <Button type="submit" variant="outline" className="w-full sm:w-auto">
                        Update banner
                      </Button>
                      <Button
                        type="submit"
                        formAction={deleteBannerAction}
                        variant="outline"
                        className="w-full border-red-200 text-red-700 hover:bg-red-50 sm:w-auto"
                      >
                        Delete banner
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            ))
          )}
        </CardContent>
      </Card>
    </main>
  )
}
