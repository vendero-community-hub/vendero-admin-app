import { API_URL, ENV_HEADERS } from '@/lib/environment'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { BarChart3, Eye, IndianRupee, MousePointerClick, Plus, Save, Settings2, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  BannerTargetingFields,
  type BannerCityOption,
  type BannerSubscriptionPlanOption,
} from './banner-targeting-fields'
import { BannerDashboardShell, type BannerDashboardPaymentOrder } from './banner-dashboard-shell'
import { BannerEditModal } from './banner-edit-modal'
import { BannerImageCropFields } from './banner-image-crop-fields'
import { BannerDetailImageFields } from './banner-detail-image-fields'
import { BannerVideoFields } from './banner-video-fields'

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
  imageObjectKey: string
  imageUrl: string
  videoObjectKey: string | null
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
  metadata?: Record<string, any>
  analytics?: {
    cityBreakdown: Array<{ city: string; views: number }>
    viewerVendors: Array<{
      vendorProfileId: number
      userId: number | null
      name: string | null
      avatarObjectKey?: string | null
      avatarUrl: string | null
      city: string | null
      views: number
      clicks: number
      lastSeenAt: string | null
    }>
  }
  rejectedReason?: string | null
  createdAt: string | null
  updatedAt?: string | null
}

type BannerDesignRequest = {
  id: number
  publicId: string
  vendorProfileId: number
  userId: number | null
  title: string
  subtitle: string | null
  requirementNotes: string | null
  contactPhone: string | null
  whatsappPhone: string | null
  scheduledCallAt: string | null
  status: string
  assignedBannerId: number | null
  adminNotes: string | null
  metadata: Record<string, any>
  vendor: {
    businessName: string | null
    contactName: string | null
    avatarUrl: string | null
    city: string | null
    state: string | null
  }
  assignedBanner: {
    id: number | null
    publicId: string
    title: string | null
    status: string | null
  } | null
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
  designRequests: BannerDesignRequest[]
}

type BannerPaymentOrderRow = BannerDashboardPaymentOrder & {
  source: string
  title: string
  vendorName: string
  bannerPublicId: string
  imageUrl: string | null
  orderId: string
}

type UploadedBannerImage = {
  objectKey: string
  assetId: string | null
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
  designRequests: [],
}

const bannerUploadLimitLabel = '10 MB'

const bannerOnPressActions: Array<{ value: BannerActionType; label: string }> = [
  { value: 'detail_screen', label: 'Banner detail page' },
  { value: 'screen', label: 'App screen' },
  { value: 'external_url', label: 'Outside web link' },
  { value: 'vendor_profile', label: 'Vendor profile' },
  { value: 'video_screen', label: 'Uploaded video screen' },
  { value: 'own_profile', label: 'Own vendor profile' },
  { value: 'direct_chat', label: 'Direct chat' },
  { value: 'group', label: 'Group chat' },
  { value: 'broadcast', label: 'Broadcast chat' },
  { value: 'none', label: 'No tap action' },
]
const actionTypes: BannerActionType[] = bannerOnPressActions.map((action) => action.value)

const pricingModels: PricingModel[] = ['per_day', 'per_week', 'per_month', 'per_view', 'per_click', 'flat']
const statuses: BannerStatus[] = ['active', 'pending_review', 'paused', 'draft', 'rejected', 'expired']
const designRequestStatuses = [
  'requested',
  'call_scheduled',
  'in_progress',
  'banner_created',
  'closed',
  'cancelled',
]
const appScreenTargets = [
  'trips',
  'marketplace',
  'crm',
  'invoice',
  'chats',
  'notifications',
  'new_features',
  'availability',
  'my_trips',
  'leads',
  'subscription',
  'referral_program',
  'vendor_search',
  'vendor_settings',
  'banner_center',
  'kyc',
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

function normalizeCityOption(row: any): BannerCityOption | null {
  const id = Number(row?.id ?? row?.placeId ?? 0)
  const city = String(row?.city ?? row?.name ?? row?.cityName ?? '').trim()
  const state = String(row?.state ?? row?.stateName ?? '').trim()
  const label = String(row?.label ?? row?.formattedAddress ?? [city, state].filter(Boolean).join(', ')).trim()

  if (!id || !city) return null
  return { id, city, state, label: label || city }
}

async function getSubscriptionPlanOptions() {
  const overview = await adminRequest('/api/v1/admin/subscriptions/overview')
  const plans = Array.isArray(overview?.plans) ? overview.plans : []

  return plans
    .filter((plan: any) => plan?.isActive !== false)
    .map((plan: any): BannerSubscriptionPlanOption | null => {
      const id = Number(plan?.id ?? 0)
      const code = String(plan?.code ?? '').trim()
      const name = String(plan?.name ?? code).trim()
      if (!id || !code || !name) return null
      return {
        id,
        code,
        name,
        billingInterval: plan?.billingInterval ?? null,
        currency: plan?.currency ?? null,
        priceAmount: Number.isFinite(Number(plan?.priceAmount)) ? Number(plan.priceAmount) : null,
      }
    })
    .filter((plan: BannerSubscriptionPlanOption | null): plan is BannerSubscriptionPlanOption => Boolean(plan))
}

async function getCityOptions() {
  const cities = await adminRequest('/api/v1/locations/places?type=city&includeAirports=false')
  const rows = Array.isArray(cities) ? cities : []

  return rows
    .map(normalizeCityOption)
    .filter((city: BannerCityOption | null): city is BannerCityOption => Boolean(city))
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

async function uploadBannerImage(formData: FormData) {
  const objectKey = String(formData.get('bannerObjectKey') ?? '').trim()
  const assetId = String(formData.get('bannerAssetId') ?? '').trim()
  if (!objectKey && !assetId) return null
  if (!objectKey || !assetId || objectKey.includes('://')) {
    throw new Error('Banner upload did not finish securely. Please choose the image again.')
  }
  return { objectKey, assetId } satisfies UploadedBannerImage
}

function selectedBannerVideo(formData: FormData) {
  const objectKey = String(formData.get('bannerVideoObjectKey') ?? '').trim()
  const assetId = String(formData.get('bannerVideoAssetId') ?? '').trim() || null
  if (!objectKey) return null
  if (objectKey.includes('://')) {
    throw new Error('Banner video upload did not finish securely. Please choose the video again.')
  }
  return { objectKey, assetId } satisfies UploadedBannerImage
}

async function deleteUploadedMedia(assetId?: string | null) {
  if (!assetId) return

  await adminRequest(`/api/v1/admin/media/assets/${encodeURIComponent(assetId)}`, {
    method: 'DELETE',
  }).catch(() => null)
}

function parseTextLines(value: FormDataEntryValue | null) {
  return String(value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function parseTextList(formData: FormData, name: string) {
  return formData
    .getAll(name)
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
}

function parseNumberList(formData: FormData, name: string) {
  return parseTextList(formData, name)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)
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
  delete basePayload.videoUrl
  delete basePayload.video_url
  delete basePayload.videoObjectKey
  delete basePayload.video_object_key
  const screenKey = parseText(formData.get('screenKey'))
  const externalUrl = parseText(formData.get('externalUrl'))
  const actionTarget = normalizeActionTarget(parseText(formData.get('actionTarget')))
  const actionTitle = parseText(formData.get('actionTitle'))

  if (actionType === 'screen') {
    return { ...basePayload, screenKey: screenKey ?? basePayload.screenKey ?? 'marketplace' }
  }

  if (actionType === 'external_url') {
    return { ...basePayload, url: externalUrl ?? basePayload.url }
  }

  if (actionType === 'video_screen') {
    return basePayload
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
  const cleanPayload = { ...basePayload }
  delete cleanPayload.images
  delete cleanPayload.imageUrl
  delete cleanPayload.imageUrls
  const title = parseText(formData.get('detailTitle'))
  const body = parseText(formData.get('detailBody'))
  const features = parseFeatureLines(formData.get('featureList'))
  const imageObjectKeys = parseTextList(formData, 'detailImageObjectKeys')
  const ctaUrl = parseText(formData.get('detailCtaUrl')) ?? parseText(formData.get('externalUrl'))
  const ctaScreenKey = parseText(formData.get('detailCtaScreenKey'))
  const ctaLabel = parseText(formData.get('detailCtaLabel')) ?? parseText(formData.get('ctaLabel')) ?? 'Open'

  return {
    ...cleanPayload,
    ...(title ? { title } : {}),
    ...(body ? { body } : {}),
    ...(features.length ? { features } : {}),
    imageObjectKeys,
    ...(ctaUrl || ctaScreenKey
      ? {
          cta: {
            ...objectValue(cleanPayload.cta),
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

function buildBannerMetadata(formData: FormData, existing: Record<string, unknown> = {}) {
  const metadata = parseJsonObject(formData.get('metadataJson'), existing)
  const audience = parseText(formData.get('targetAudience')) ?? 'all'
  const cityMode = parseText(formData.get('cityMode')) ?? 'all'
  const cities = cityMode === 'selected'
    ? parseTextList(formData, 'targetCities')
        .flatMap((value) => value.split(','))
        .map((city) => city.trim())
        .filter(Boolean)
        .filter((city, index, rows) => rows.indexOf(city) === index)
    : []
  const cityIds = cityMode === 'selected' ? parseNumberList(formData, 'cityIds') : []
  const subscriptionPlanIds = audience === 'subscriptions' ? parseNumberList(formData, 'subscriptionPlanIds') : []
  const subscriptionPlanCodes = audience === 'subscriptions' ? parseTextList(formData, 'subscriptionPlanCodes') : []
  const bannerResizeMode = parseText(formData.get('bannerResizeMode')) ?? 'crop'
  const bannerCropPosition = parseText(formData.get('bannerCropPosition')) ?? 'custom'
  const bannerCropX = parseOptionalNumber(formData.get('bannerCropX')) ?? 50
  const bannerCropY = parseOptionalNumber(formData.get('bannerCropY')) ?? 50

  return {
    ...metadata,
    imageResizer: {
      ...objectValue(metadata.imageResizer),
      mode: bannerResizeMode,
      cropPosition: bannerCropPosition,
      cropX: bannerCropX,
      cropY: bannerCropY,
      width: 1200,
      height: 500,
    },
    targeting: {
      ...objectValue(metadata.targeting),
      audience,
      cityMode,
      cityIds,
      cities,
      subscriptionPlanIds,
      subscriptionPlanCodes,
    },
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

function actionOptionLabel(value: BannerActionType) {
  return bannerOnPressActions.find((action) => action.value === value)?.label ?? label(value)
}

function bannerActionSummary(banner: Banner) {
  const actionPayload = banner.actionPayload ?? {}

  if (banner.actionType === 'screen') {
    return `On press: Screen - ${label(formValue(actionPayload.screenKey ?? actionPayload.screen ?? 'marketplace'))}`
  }

  if (banner.actionType === 'external_url') {
    return `On press: Web link - ${formValue(actionPayload.url || 'not set')}`
  }

  if (banner.actionType === 'vendor_profile') {
    const vendorProfileId = actionPayload.vendorProfileId ?? actionPayload.vendor_profile_id
    return `On press: Vendor profile${vendorProfileId ? ` #${vendorProfileId}` : ' - not set'}`
  }

  if (banner.actionType === 'video_screen') {
    return `On press: Video${banner.videoObjectKey ? '' : ' - video not set'}`
  }

  if (banner.actionType === 'detail_screen') {
    return 'On press: Banner detail page'
  }

  if (banner.actionType === 'none') {
    return 'On press: No action'
  }

  return `On press: ${actionOptionLabel(banner.actionType)}`
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

function detailImageObjectKeys(banner: Banner) {
  const keys = banner.detailPayload?.imageObjectKeys
  return Array.isArray(keys) ? keys.map((key) => String(key)).filter(Boolean) : []
}

function detailImageUrls(banner: Banner) {
  const images = banner.detailPayload?.images
  return Array.isArray(images) ? images.map((image) => String(image)).filter(Boolean) : []
}

function targetSubscriptionPlanIds(banner: Banner) {
  return normalizeUnknownNumberList(objectValue(banner.metadata?.targeting).subscriptionPlanIds)
}

function normalizeUnknownNumberList(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0)
}

function selectedCityOptions(banner: Banner, cityOptions: BannerCityOption[]) {
  const targeting = objectValue(banner.metadata?.targeting)
  const cityIds = normalizeUnknownNumberList(targeting.cityIds)
  const cities = Array.isArray(targeting.cities) ? targeting.cities.map((city) => String(city).trim()).filter(Boolean) : []
  const selected = new Map<number, BannerCityOption>()

  cityIds.forEach((id) => {
    const match = cityOptions.find((city) => city.id === id)
    if (match) selected.set(id, match)
  })

  cities.forEach((cityName, index) => {
    const id = cityIds[index] ?? 0
    const match = id ? cityOptions.find((city) => city.id === id) : cityOptions.find((city) => city.city === cityName)
    if (match) {
      selected.set(match.id, match)
      return
    }
    if (!id) return
    selected.set(id, { id, city: cityName, label: cityName })
  })

  return Array.from(selected.values())
}

function targetAudienceValue(banner: Banner) {
  const audience = formValue(objectValue(banner.metadata?.targeting).audience ?? 'all')
  return audience === 'subscriptions' || audience === 'premium' ? 'subscriptions' : 'all'
}

function numberFromUnknown(value: unknown) {
  const nextValue = Number(value ?? 0)
  return Number.isFinite(nextValue) ? nextValue : 0
}

function bannerPayment(banner: Banner) {
  return objectValue(banner.metadata?.payment)
}

function designRequestPayment(request: BannerDesignRequest) {
  return objectValue(request.metadata?.payment)
}

function bannerOrderAmount(banner: Banner) {
  const payment = bannerPayment(banner)
  return numberFromUnknown(payment.amount ?? payment.quotedAmount)
}

function paymentStatus(value: unknown) {
  return String(value ?? 'not_started').trim() || 'not_started'
}

function paymentDate(value: unknown) {
  const text = String(value ?? '').trim()
  return text || null
}

function bannerPaymentOrders(
  banners: Banner[],
  designRequests: BannerDesignRequest[],
  currency: string
): BannerPaymentOrderRow[] {
  const bannerOrders = banners
    .filter((banner) => banner.ownerType === 'vendor' || Object.keys(bannerPayment(banner)).length > 0)
    .map((banner) => {
      const payment = bannerPayment(banner)
      return {
        id: `banner-${banner.publicId}`,
        source: 'Vendor banner',
        title: banner.title,
        vendorName: banner.vendorProfileId ? `Vendor #${banner.vendorProfileId}` : 'Vendor',
        bannerPublicId: banner.publicId,
        imageUrl: banner.imageUrl,
        amount: bannerOrderAmount(banner),
        currency: String(payment.currency ?? banner.pricing.currency ?? currency),
        status: paymentStatus(payment.status),
        orderId: String(payment.razorpayOrderId ?? ''),
        createdAt: paymentDate(payment.createdAt ?? banner.createdAt),
        paidAt: paymentDate(payment.paidAt),
      }
    })

  const requestOrders = designRequests
    .filter((request) => Object.keys(designRequestPayment(request)).length > 0)
    .map((request) => {
      const payment = designRequestPayment(request)
      return {
        id: `request-${request.publicId}`,
        source: 'Vendero team request',
        title: request.title,
        vendorName: request.vendor.businessName ?? request.vendor.contactName ?? `Vendor #${request.vendorProfileId}`,
        bannerPublicId: request.assignedBanner?.publicId ?? request.publicId,
        imageUrl: null,
        amount: numberFromUnknown(payment.amount ?? payment.quotedAmount),
        currency: String(payment.currency ?? currency),
        status: paymentStatus(payment.status),
        orderId: String(payment.razorpayOrderId ?? ''),
        createdAt: paymentDate(payment.createdAt ?? request.createdAt),
        paidAt: paymentDate(payment.paidAt),
      }
    })

  return [...bannerOrders, ...requestOrders].sort((left, right) => {
    const leftTime = new Date(left.paidAt ?? left.createdAt ?? 0).getTime()
    const rightTime = new Date(right.paidAt ?? right.createdAt ?? 0).getTime()
    return rightTime - leftTime
  })
}

function isSameDay(value: string | null | undefined, date = new Date()) {
  if (!value) return false
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return false
  return parsed.toISOString().slice(0, 10) === date.toISOString().slice(0, 10)
}

function isExpiredBanner(banner: Banner) {
  if (banner.status === 'expired') return true
  if (!banner.endsAt) return false
  const parsed = new Date(banner.endsAt)
  return Number.isFinite(parsed.getTime()) && parsed < new Date()
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

  const uploadedVideo = selectedBannerVideo(formData)
  const submittedActionType = String(formData.get('actionType') ?? '').trim() as BannerActionType
  const actionType: BannerActionType = actionTypes.includes(submittedActionType)
    ? submittedActionType
    : uploadedVideo
      ? 'video_screen'
      : 'detail_screen'
  const uploadedImage = await uploadBannerImage(formData)
  if (!uploadedImage) {
    throw new Error('Banner image upload failed')
  }

  try {
    const created = await adminRequest('/api/v1/admin/banners', {
      method: 'POST',
      body: JSON.stringify({
        ownerType: 'vendero',
        vendorProfileId: null,
        title: `Vendero banner ${new Date().toISOString().slice(0, 10)}`,
        subtitle: null,
        body: null,
        imageObjectKey: uploadedImage.objectKey,
        videoObjectKey: actionType === 'video_screen' ? uploadedVideo?.objectKey ?? null : null,
        ctaLabel: parseText(formData.get('ctaLabel')) ?? (actionType === 'video_screen' ? 'Watch' : 'Open'),
        placement: 'home',
        status: 'active',
        actionType,
        actionPayload: buildActionPayload(formData, actionType),
        detailPayload: {},
        priority: 0,
        bidAmount: 0,
        currency: String(formData.get('currency') ?? 'INR').trim() || 'INR',
        pricingModel: null,
        pricePerDay: 0,
        pricePerWeek: 0,
        pricePerMonth: 0,
        pricePerView: 0,
        pricePerClick: 0,
        flatPrice: 0,
        maxViews: null,
        maxClicks: null,
        dailyViewCap: null,
        dailyClickCap: null,
        metadata: buildBannerMetadata(formData),
      }),
    })

    if (!created) throw new Error('Banner create failed')
  } catch (error) {
    await Promise.all([
      deleteUploadedMedia(uploadedImage.assetId),
      deleteUploadedMedia(uploadedVideo?.assetId),
    ])
    throw error
  }

  revalidatePath('/banners')
}

async function updateDesignRequestAction(formData: FormData) {
  'use server'

  const id = String(formData.get('id') ?? '').trim()
  if (!id) return
  const status = parseText(formData.get('status'))
  const payload = {
    ...(status ? { status } : {}),
    scheduledCallAt: parseText(formData.get('scheduledCallAt')),
    assignedBannerPublicId: parseText(formData.get('assignedBannerPublicId')),
    adminNotes: parseText(formData.get('adminNotes')),
  }

  await adminRequest(`/api/v1/admin/banner-design-requests/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })

  revalidatePath('/banners')
}

async function updateBannerQuickAction(formData: FormData) {
  'use server'

  const id = String(formData.get('id') ?? '').trim()
  if (!id) return
  const actionType = String(formData.get('actionType') ?? 'detail_screen') as BannerActionType
  const uploadedImageUrl = await uploadBannerImage(formData)
  const uploadedVideo = selectedBannerVideo(formData)

  try {
    const updated = await adminRequest(`/api/v1/admin/banners/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ownerType: String(formData.get('ownerType') ?? 'vendero') as BannerOwnerType,
        title: String(formData.get('title') ?? '').trim(),
        subtitle: parseText(formData.get('subtitle')),
        body: parseText(formData.get('body')),
        ...(uploadedImageUrl ? { imageObjectKey: uploadedImageUrl.objectKey } : {}),
        videoObjectKey: actionType === 'video_screen' ? uploadedVideo?.objectKey ?? null : null,
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
        metadata: buildBannerMetadata(
          formData,
          parseJsonObject(formData.get('existingMetadataJson'), {})
        ),
        rejectedReason: parseText(formData.get('rejectedReason')),
      }),
    })

    if (!updated) throw new Error('Banner update failed')
  } catch (error) {
    await Promise.all([
      deleteUploadedMedia(uploadedImageUrl?.assetId),
      deleteUploadedMedia(uploadedVideo?.assetId),
    ])
    throw error
  }

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

function BannerOnPressFields({
  defaultActionType = 'detail_screen',
  defaultScreenKey = 'marketplace',
  defaultExternalUrl = '',
  defaultActionTarget = '',
  defaultActionTitle = '',
  currentVideoObjectKey = null,
  currentVideoUrl = null,
}: {
  defaultActionType?: BannerActionType
  defaultScreenKey?: string
  defaultExternalUrl?: string
  defaultActionTarget?: string
  defaultActionTitle?: string
  currentVideoObjectKey?: string | null
  currentVideoUrl?: string | null
}) {
  return (
    <div className="rounded-md border border-border/70 bg-background/30 p-3 sm:col-span-2">
      <div className="mb-3">
        <FieldLabel>On press action</FieldLabel>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose where this banner opens when a vendor taps it: app screen, outside web link, vendor profile, uploaded video, or banner detail.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <FieldLabel>Open</FieldLabel>
          <select
            name="actionType"
            defaultValue={defaultActionType}
            className="h-10 w-full rounded-md border border-border bg-background/70 px-3 text-sm"
          >
            {bannerOnPressActions.map((action) => (
              <option key={action.value} value={action.value}>
                {action.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <FieldLabel>Screen</FieldLabel>
          <select
            name="screenKey"
            defaultValue={defaultScreenKey}
            className="h-10 w-full rounded-md border border-border bg-background/70 px-3 text-sm"
          >
            {appScreenTargets.map((screen) => (
              <option key={screen} value={screen}>
                {label(screen)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <FieldLabel>Outside web link</FieldLabel>
          <Input name="externalUrl" defaultValue={defaultExternalUrl} placeholder="https://..." />
        </div>
        <div className="space-y-1.5">
          <FieldLabel>Vendor profile ID</FieldLabel>
          <Input name="actionTarget" defaultValue={defaultActionTarget} placeholder="Vendor profile ID" />
        </div>
        <div className="space-y-1.5">
          <FieldLabel>Vendor name</FieldLabel>
          <Input name="actionTitle" defaultValue={defaultActionTitle} placeholder="Optional display name" />
        </div>
        <BannerVideoFields
          currentObjectKey={currentVideoObjectKey}
          currentVideoUrl={currentVideoUrl}
        />
      </div>
    </div>
  )
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

function PricingControlsForm({ pricing }: { pricing: PricingSettings }) {
  return (
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
  )
}

function UploadVenderoAdForm({
  pricing,
  subscriptionPlans,
  cityOptions,
  locationsEndpoint,
  appEnv,
}: {
  pricing: PricingSettings
  subscriptionPlans: BannerSubscriptionPlanOption[]
  cityOptions: BannerCityOption[]
  locationsEndpoint: string
  appEnv: string
}) {
  return (
    <form action={createVenderoBanner} className="space-y-5">
      <input type="hidden" name="currency" value={pricing.currency} />
      <div className="grid gap-3 sm:grid-cols-2">
        <BannerImageCropFields
          required
          helperText={`Uploaded images are resized to 1200 x 500 px automatically. Max file size: ${bannerUploadLimitLabel}.`}
        />
        <BannerOnPressFields />
        <BannerTargetingFields
          subscriptionPlans={subscriptionPlans}
          initialCities={cityOptions}
          locationsEndpoint={locationsEndpoint}
          appEnv={appEnv}
        />
      </div>

      <Button type="submit" className="w-full sm:w-auto">
        Create banner ad
      </Button>
    </form>
  )
}

function EmptyList({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border/80 p-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  )
}

type BannerListProps = {
  banners: Banner[]
  subscriptionPlans: BannerSubscriptionPlanOption[]
  cityOptions: BannerCityOption[]
  locationsEndpoint: string
  appEnv: string
  emptyMessage: string
}

function BannerViewerVendors({ banner }: { banner: Banner }) {
  const viewers = (banner.analytics?.viewerVendors ?? []).slice(0, 4)

  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-background/35 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Viewer vendors</p>
      <div className="space-y-2">
        {viewers.length ? (
          viewers.map((viewer) => (
            <a
              key={`${banner.publicId}-${viewer.vendorProfileId}`}
              href={`/vendors?vendorProfileId=${viewer.vendorProfileId}`}
              className="flex items-center gap-2 rounded-md border border-border/50 bg-background/40 px-2 py-1.5 text-xs hover:bg-background/70"
            >
              {viewer.avatarUrl ? (
                <img src={viewer.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                  {(viewer.name ?? 'V').slice(0, 2).toUpperCase()}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate">
                {viewer.name ?? `Vendor #${viewer.vendorProfileId}`}
                {viewer.city ? ` / ${viewer.city}` : ''}
              </span>
              <span className="shrink-0 text-muted-foreground">
                {compactNumber(viewer.views)}i / {compactNumber(viewer.clicks)}c
              </span>
            </a>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">No vendor viewers yet</span>
        )}
      </div>
    </div>
  )
}

function BannerEditForm({
  banner,
  subscriptionPlans,
  cityOptions,
  locationsEndpoint,
  appEnv,
}: Omit<BannerListProps, 'banners' | 'emptyMessage'> & { banner: Banner }) {
  return (
    <form action={updateBannerQuickAction} className="space-y-5">
      <input type="hidden" name="id" value={banner.publicId} />
      <input type="hidden" name="existingMetadataJson" value={JSON.stringify(banner.metadata ?? {})} />
      <input type="hidden" name="ownerType" value={banner.ownerType} />
      <input type="hidden" name="placement" value={banner.placement} />
      <input type="hidden" name="ctaLabel" value={banner.ctaLabel ?? 'Open'} />
      <input type="hidden" name="body" value={banner.body ?? ''} />
      <input type="hidden" name="actionPayloadJson" value={JSON.stringify(banner.actionPayload ?? {})} />
      <input type="hidden" name="detailPayloadJson" value={JSON.stringify(banner.detailPayload ?? {})} />

      <div className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="overflow-hidden rounded-lg border border-border/70 bg-muted">
            <img src={banner.imageUrl} alt="" className="aspect-[12/5] w-full object-cover" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={statusVariant(banner.status)}>{label(banner.status)}</Badge>
            <Badge variant={banner.ownerType === 'vendor' ? 'warning' : 'default'}>
              {banner.ownerType === 'vendor' ? 'Vendor banner' : 'Vendero banner'}
            </Badge>
            <Badge variant="outline">{actionOptionLabel(banner.actionType)}</Badge>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/35 p-3 text-xs text-muted-foreground">
            <div className="grid grid-cols-2 gap-2">
              <span>{compactNumber(banner.metrics.views)} impressions</span>
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
          <BannerImageCropFields
            label="Replace banner image"
            currentImageUrl={banner.imageUrl}
            helperText={`Leave empty to keep current image. New uploads are resized to 1200 x 500 px. Max file size: ${bannerUploadLimitLabel}.`}
            defaultMode={String(banner.metadata?.imageResizer?.mode ?? 'crop')}
            defaultCropPosition={String(banner.metadata?.imageResizer?.cropPosition ?? 'centre')}
            defaultCropX={formValue(objectValue(banner.metadata?.imageResizer).cropX)}
            defaultCropY={formValue(objectValue(banner.metadata?.imageResizer).cropY)}
          />
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
          <BannerOnPressFields
            defaultActionType={banner.actionType}
            defaultScreenKey={formValue(banner.actionPayload?.screenKey ?? 'marketplace')}
            defaultExternalUrl={formValue(banner.actionPayload?.url)}
            defaultActionTarget={formValue(
              banner.actionPayload?.vendorProfileId ??
                banner.actionPayload?.conversationId ??
                banner.actionPayload?.broadcastListId
            )}
            defaultActionTitle={formValue(
              banner.actionPayload?.vendorName ??
                banner.actionPayload?.title ??
                banner.actionPayload?.name
            )}
            currentVideoObjectKey={banner.videoObjectKey}
            currentVideoUrl={banner.videoUrl}
          />
          <BannerTargetingFields
            subscriptionPlans={subscriptionPlans}
            initialCities={cityOptions}
            locationsEndpoint={locationsEndpoint}
            appEnv={appEnv}
            defaultAudience={targetAudienceValue(banner)}
            defaultSubscriptionPlanIds={targetSubscriptionPlanIds(banner)}
            defaultCityMode={formValue(objectValue(banner.metadata?.targeting).cityMode ?? 'all')}
            defaultSelectedCities={selectedCityOptions(banner, cityOptions)}
          />
          <div className="space-y-1.5">
            <FieldLabel>Starts at</FieldLabel>
            <Input name="startsAt" defaultValue={banner.startsAt ?? ''} placeholder="Optional ISO date" />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Ends at</FieldLabel>
            <Input name="endsAt" defaultValue={banner.endsAt ?? ''} placeholder="Optional ISO date" />
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
          <input type="hidden" name="priority" value={banner.priority} />
          <input type="hidden" name="currency" value={banner.pricing.currency} />
          <input type="hidden" name="pricePerDay" value={banner.pricing.pricePerDay} />
          <input type="hidden" name="pricePerWeek" value={banner.pricing.pricePerWeek} />
          <input type="hidden" name="pricePerMonth" value={banner.pricing.pricePerMonth} />
          <input type="hidden" name="pricePerView" value={banner.pricing.pricePerView} />
          <input type="hidden" name="pricePerClick" value={banner.pricing.pricePerClick} />
          <input type="hidden" name="flatPrice" value={banner.pricing.flatPrice} />
          <input type="hidden" name="maxViews" value={banner.limits.maxViews ?? ''} />
          <input type="hidden" name="maxClicks" value={banner.limits.maxClicks ?? ''} />
          <input type="hidden" name="dailyViewCap" value={banner.limits.dailyViewCap ?? ''} />
          <input type="hidden" name="dailyClickCap" value={banner.limits.dailyClickCap ?? ''} />
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-border/70 pt-4">
        <Button type="submit" variant="outline" className="w-full sm:w-auto">
          <Save className="h-4 w-4" />
          Save banner
        </Button>
        <Button
          type="submit"
          formAction={deleteBannerAction}
          variant="outline"
          className="w-full border-red-200 text-red-700 hover:bg-red-50 sm:w-auto"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>
    </form>
  )
}

function BannerList({
  banners,
  subscriptionPlans,
  cityOptions,
  locationsEndpoint,
  appEnv,
  emptyMessage,
}: BannerListProps) {
  if (!banners.length) return <EmptyList message={emptyMessage} />

  return (
    <div className="space-y-4">
      {banners.map((banner) => {
        const payment = bannerPayment(banner)
        const orderAmount = bannerOrderAmount(banner)
        const currency = String(payment.currency ?? banner.pricing.currency)

        return (
          <div key={banner.publicId} className="rounded-xl border border-border/70 bg-background/25 p-4">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
              <div className="flex min-w-0 gap-4">
                <div className="h-24 w-36 shrink-0 overflow-hidden rounded-lg border border-border/70 bg-muted">
                  <img src={banner.imageUrl} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={statusVariant(banner.status)}>{label(banner.status)}</Badge>
                    <Badge variant={banner.ownerType === 'vendor' ? 'warning' : 'default'}>
                      {banner.ownerType === 'vendor' ? 'Vendor banner' : 'Vendero banner'}
                    </Badge>
                    <Badge variant="outline">{actionOptionLabel(banner.actionType)}</Badge>
                    {banner.ownerType === 'vendor' ? (
                      <Badge variant="outline">
                        Order {money(orderAmount, currency)} / {paymentStatus(payment.status)}
                      </Badge>
                    ) : null}
                  </div>
                  <div>
                    <h3 className="truncate text-base font-semibold">{banner.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {banner.subtitle ?? banner.body ?? 'No summary'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{compactNumber(banner.metrics.views)} impressions</span>
                    <span>{compactNumber(banner.metrics.clicks)} clicks</span>
                    <span>{(banner.metrics.ctr * 100).toFixed(1)}% CTR</span>
                    <span>{money(banner.metrics.spendAmount, banner.pricing.currency)} spend</span>
                    {banner.endsAt ? <span>Ends {new Date(banner.endsAt).toLocaleDateString('en-IN')}</span> : null}
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">{bannerActionSummary(banner)}</p>
                  <BannerViewerVendors banner={banner} />
                </div>
              </div>

              <div className="flex items-start justify-end">
                <BannerEditModal title={`Edit ${banner.title}`}>
                  <BannerEditForm
                    banner={banner}
                    subscriptionPlans={subscriptionPlans}
                    cityOptions={cityOptions}
                    locationsEndpoint={locationsEndpoint}
                    appEnv={appEnv}
                  />
                </BannerEditModal>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TeamRequestsList({ requests }: { requests: BannerDesignRequest[] }) {
  if (!requests.length) return <EmptyList message="No scheduled banner calls yet." />

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <form
          key={request.publicId}
          action={updateDesignRequestAction}
          className="rounded-xl border border-border/70 bg-background/25 p-4"
        >
          <input type="hidden" name="id" value={request.publicId} />
          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant={request.status === 'cancelled' ? 'danger' : request.status === 'banner_created' ? 'success' : 'warning'}>
                  {label(request.status)}
                </Badge>
                <Badge variant="outline">Vendor #{request.vendorProfileId}</Badge>
                {request.assignedBanner ? <Badge variant="success">Banner {request.assignedBanner.publicId}</Badge> : null}
              </div>
              <div>
                <h3 className="text-base font-semibold">{request.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {request.vendor.businessName ?? request.vendor.contactName ?? 'Vendor'}{request.vendor.city ? ` / ${request.vendor.city}` : ''}
                </p>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Call: {request.scheduledCallAt ?? 'Not scheduled'}</p>
                <p>Phone: {request.contactPhone ?? '-'}</p>
                {request.requirementNotes ? <p className="whitespace-pre-wrap">{request.requirementNotes}</p> : null}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <FieldLabel>Status</FieldLabel>
                <select name="status" defaultValue={request.status} className="h-10 w-full rounded-md border border-border bg-background/70 px-3 text-sm">
                  {designRequestStatuses.map((status) => (
                    <option key={status} value={status}>
                      {label(status)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <FieldLabel>Scheduled call</FieldLabel>
                <Input name="scheduledCallAt" defaultValue={request.scheduledCallAt ?? ''} placeholder="YYYY-MM-DD HH:mm" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <FieldLabel>Assigned banner public id</FieldLabel>
                <Input name="assignedBannerPublicId" defaultValue={request.assignedBanner?.publicId ?? ''} placeholder="ban_..." />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <FieldLabel>Admin notes</FieldLabel>
                <textarea
                  name="adminNotes"
                  rows={3}
                  defaultValue={request.adminNotes ?? ''}
                  className="w-full rounded-md border border-border bg-background/70 px-3 py-2 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                />
              </div>
              <Button type="submit" variant="outline" className="w-full sm:w-auto">
                Update request
              </Button>
            </div>
          </div>
        </form>
      ))}
    </div>
  )
}

function PaymentOrdersList({ orders }: { orders: BannerPaymentOrderRow[] }) {
  if (!orders.length) return <EmptyList message="No vendor banner payment orders yet." />

  return (
    <div className="overflow-x-auto rounded-xl border border-border/70">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="bg-background/50 text-xs uppercase tracking-[0.14em] text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Banner / request</th>
            <th className="px-4 py-3">Vendor</th>
            <th className="px-4 py-3">Order value</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Order ID</th>
            <th className="px-4 py-3">Paid at</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/70">
          {orders.map((order) => (
            <tr key={order.id} className="bg-background/20">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {order.imageUrl ? (
                    <img src={order.imageUrl} alt="" className="h-12 w-20 rounded-md object-cover" />
                  ) : (
                    <span className="flex h-12 w-20 items-center justify-center rounded-md bg-muted text-xs font-semibold">Request</span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{order.title}</p>
                    <p className="text-xs text-muted-foreground">{order.source} / {order.bannerPublicId}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">{order.vendorName}</td>
              <td className="px-4 py-3 font-semibold">{money(order.amount, order.currency)}</td>
              <td className="px-4 py-3">
                <Badge variant={['paid', 'verified'].includes(order.status) ? 'success' : order.status === 'failed' ? 'danger' : 'warning'}>
                  {label(order.status)}
                </Badge>
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{order.orderId || '-'}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{order.paidAt ?? order.createdAt ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default async function BannersPage() {
  const [overview, subscriptionPlans, cityOptions] = await Promise.all([
    getBannerOverview(),
    getSubscriptionPlanOptions(),
    getCityOptions(),
  ])
  const summary = overview.summary ?? emptyOverview.summary
  const pricing = overview.pricingSettings ?? emptyPricingSettings
  const chargeLedger = overview.ledger.find((row) => row.entryType === 'charge')
  const earnedAmount = chargeLedger?.amount ?? summary.spendAmount
  const locationsEndpoint = `${API_URL}/api/v1/locations/places`
  const appEnv = ENV_HEADERS['x-vendero-env']
  const allBanners = overview.banners ?? []
  const designRequests = overview.designRequests ?? []
  const liveBanners = allBanners.filter((banner) => banner.status === 'active')
  const vendorBanners = allBanners.filter((banner) => banner.ownerType === 'vendor')
  const paymentOrders = bannerPaymentOrders(allBanners, designRequests, pricing.currency)
  const activeVendero = liveBanners.filter((banner) => banner.ownerType === 'vendero').length
  const activeVendor = liveBanners.filter((banner) => banner.ownerType === 'vendor').length
  const requestsToday = designRequests.filter((request) =>
    isSameDay(request.scheduledCallAt) || isSameDay(request.createdAt)
  ).length
  const expiredBanners = allBanners.filter(isExpiredBanner).length

  return (
    <main className="space-y-6">
      <BannerDashboardShell
        analytics={{
          activeTotal: liveBanners.length,
          activeVendero,
          activeVendor,
          expiredBanners,
          requestsToday,
          currency: pricing.currency,
        }}
        paymentOrders={paymentOrders}
        counts={{
          live: liveBanners.length,
          vendors: vendorBanners.length,
          requests: designRequests.length,
          payments: paymentOrders.length,
        }}
        pricingContent={<PricingControlsForm pricing={pricing} />}
        uploadContent={
          <UploadVenderoAdForm
            pricing={pricing}
            subscriptionPlans={subscriptionPlans}
            cityOptions={cityOptions}
            locationsEndpoint={locationsEndpoint}
            appEnv={appEnv}
          />
        }
        liveContent={
          <BannerList
            banners={liveBanners}
            subscriptionPlans={subscriptionPlans}
            cityOptions={cityOptions}
            locationsEndpoint={locationsEndpoint}
            appEnv={appEnv}
            emptyMessage="No active banners yet."
          />
        }
        vendorContent={
          <BannerList
            banners={vendorBanners}
            subscriptionPlans={subscriptionPlans}
            cityOptions={cityOptions}
            locationsEndpoint={locationsEndpoint}
            appEnv={appEnv}
            emptyMessage="No vendor-created banners yet."
          />
        }
        requestContent={<TeamRequestsList requests={designRequests} />}
        paymentContent={<PaymentOrdersList orders={paymentOrders} />}
      />
    </main>
  )

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

      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle>Vendero Team Banner Requests</CardTitle>
          <CardDescription>
            Vendors who choose Vendero team creation appear here with call schedule and requirement notes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(overview.designRequests ?? []).length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 p-6 text-center text-sm text-muted-foreground">
              No scheduled banner calls yet.
            </div>
          ) : (
            (overview.designRequests ?? []).map((request) => (
              <form
                key={request.publicId}
                action={updateDesignRequestAction}
                className="rounded-xl border border-border/70 bg-background/25 p-4"
              >
                <input type="hidden" name="id" value={request.publicId} />
                <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={request.status === 'cancelled' ? 'danger' : request.status === 'banner_created' ? 'success' : 'warning'}>
                        {label(request.status)}
                      </Badge>
                      <Badge variant="outline">Vendor #{request.vendorProfileId}</Badge>
                      {request.assignedBanner ? (
                        <Badge variant="success">Banner {request.assignedBanner.publicId}</Badge>
                      ) : null}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">{request.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {request.vendor.businessName ?? request.vendor.contactName ?? 'Vendor'}{request.vendor.city ? ` / ${request.vendor.city}` : ''}
                      </p>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>Call: {request.scheduledCallAt ?? 'Not scheduled'}</p>
                      <p>Phone: {request.contactPhone ?? '-'} / WhatsApp: {request.whatsappPhone ?? '-'}</p>
                      {request.requirementNotes ? <p className="whitespace-pre-wrap">{request.requirementNotes}</p> : null}
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <FieldLabel>Status</FieldLabel>
                      <select name="status" defaultValue={request.status} className="h-10 w-full rounded-md border border-border bg-background/70 px-3 text-sm">
                        {designRequestStatuses.map((status) => (
                          <option key={status} value={status}>
                            {label(status)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Scheduled call</FieldLabel>
                      <Input name="scheduledCallAt" defaultValue={request.scheduledCallAt ?? ''} placeholder="YYYY-MM-DD HH:mm" />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <FieldLabel>Assigned banner public id</FieldLabel>
                      <Input name="assignedBannerPublicId" defaultValue={request.assignedBanner?.publicId ?? ''} placeholder="ban_..." />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <FieldLabel>Admin notes</FieldLabel>
                      <textarea
                        name="adminNotes"
                        rows={3}
                        defaultValue={request.adminNotes ?? ''}
                        className="w-full rounded-md border border-border bg-background/70 px-3 py-2 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                      />
                    </div>
                    <Button type="submit" variant="outline" className="w-full sm:w-auto">
                      Update request
                    </Button>
                  </div>
                </div>
              </form>
            ))
          )}
        </CardContent>
      </Card>

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
              <CardTitle>Upload Vendero Ad</CardTitle>
            </div>
            <CardDescription>
              Upload a home banner, choose image fit, set the tap action, then choose who should see it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createVenderoBanner} className="space-y-5">
              <input type="hidden" name="currency" value={pricing.currency} />
              <div className="grid gap-3 sm:grid-cols-2">
                <BannerImageCropFields
                  required
                  helperText={`Uploaded images are resized to 1200 x 500 px automatically. Max file size: ${bannerUploadLimitLabel}.`}
                />
                <BannerOnPressFields />
                <BannerTargetingFields
                  subscriptionPlans={subscriptionPlans}
                  initialCities={cityOptions}
                  locationsEndpoint={locationsEndpoint}
                  appEnv={appEnv}
                />
              </div>

              <Button type="submit" className="w-full sm:w-auto">
                Create banner ad
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
                <input type="hidden" name="existingMetadataJson" value={JSON.stringify(banner.metadata ?? {})} />
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
                        <Badge variant="outline">{actionOptionLabel(banner.actionType)}</Badge>
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
                      <p className="text-xs font-medium text-muted-foreground">{bannerActionSummary(banner)}</p>
                      <div className="space-y-2 rounded-lg border border-border/60 bg-background/35 p-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">City views</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(banner.analytics?.cityBreakdown ?? []).slice(0, 6).length ? (
                              (banner.analytics?.cityBreakdown ?? []).slice(0, 6).map((row) => (
                                <Badge key={`${banner.publicId}-${row.city}`} variant="outline">
                                  {row.city}: {compactNumber(row.views)}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">No city views yet</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Viewer vendors</p>
                          <div className="mt-2 space-y-2">
                            {(banner.analytics?.viewerVendors ?? []).slice(0, 5).length ? (
                              (banner.analytics?.viewerVendors ?? []).slice(0, 5).map((viewer) => (
                                <a
                                  key={`${banner.publicId}-${viewer.vendorProfileId}`}
                                  href={`/vendors?vendorProfileId=${viewer.vendorProfileId}`}
                                  className="flex items-center gap-2 rounded-md border border-border/50 bg-background/40 px-2 py-1.5 text-xs hover:bg-background/70"
                                >
                                  {viewer.avatarUrl ? (
                                    <img src={viewer.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
                                  ) : (
                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                                      {(viewer.name ?? 'V').slice(0, 2).toUpperCase()}
                                    </span>
                                  )}
                                  <span className="min-w-0 flex-1 truncate">
                                    {viewer.name ?? `Vendor #${viewer.vendorProfileId}`}
                                    {viewer.city ? ` / ${viewer.city}` : ''}
                                  </span>
                                  <span className="shrink-0 text-muted-foreground">
                                    {compactNumber(viewer.views)}v / {compactNumber(viewer.clicks)}c
                                  </span>
                                </a>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">No vendor viewers yet</span>
                            )}
                          </div>
                        </div>
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
                    <BannerImageCropFields
                      label="Replace banner image"
                      currentImageUrl={banner.imageUrl}
                      helperText={`Leave empty to keep current image. New uploads are resized to 1200 x 500 px. Max file size: ${bannerUploadLimitLabel}.`}
                      defaultMode={String(banner.metadata?.imageResizer?.mode ?? 'crop')}
                      defaultCropPosition={String(banner.metadata?.imageResizer?.cropPosition ?? 'centre')}
                      defaultCropX={formValue(objectValue(banner.metadata?.imageResizer).cropX)}
                      defaultCropY={formValue(objectValue(banner.metadata?.imageResizer).cropY)}
                    />
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
                    <BannerOnPressFields
                      defaultActionType={banner.actionType}
                      defaultScreenKey={formValue(banner.actionPayload?.screenKey ?? 'marketplace')}
                      defaultExternalUrl={formValue(banner.actionPayload?.url)}
                      defaultActionTarget={formValue(
                        banner.actionPayload?.vendorProfileId ??
                          banner.actionPayload?.conversationId ??
                          banner.actionPayload?.broadcastListId
                      )}
                      defaultActionTitle={formValue(
                        banner.actionPayload?.vendorName ??
                          banner.actionPayload?.title ??
                          banner.actionPayload?.name
                      )}
                      currentVideoObjectKey={banner.videoObjectKey}
                      currentVideoUrl={banner.videoUrl}
                    />
                    <BannerTargetingFields
                      subscriptionPlans={subscriptionPlans}
                      initialCities={cityOptions}
                      locationsEndpoint={locationsEndpoint}
                      appEnv={appEnv}
                      defaultAudience={targetAudienceValue(banner)}
                      defaultSubscriptionPlanIds={targetSubscriptionPlanIds(banner)}
                      defaultCityMode={formValue(objectValue(banner.metadata?.targeting).cityMode ?? 'all')}
                      defaultSelectedCities={selectedCityOptions(banner, cityOptions)}
                    />
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
                    <BannerDetailImageFields
                      objectKeys={detailImageObjectKeys(banner)}
                      urls={detailImageUrls(banner)}
                    />
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
                      <FieldLabel>Metadata JSON</FieldLabel>
                      <JsonTextarea name="metadataJson" defaultValue={banner.metadata ?? {}} rows={4} />
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
