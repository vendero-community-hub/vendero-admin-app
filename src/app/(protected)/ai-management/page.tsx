import { API_URL, ENV_HEADERS } from '@/lib/environment'
import { cookies } from 'next/headers'
import { AiManagementPanel, type AiFeaturePricingData } from './ai-management-panel'

async function getAiFeaturePricing() {
  const cookieStore = await cookies()
  const token = cookieStore.get('vendero_admin_access_token')?.value
  if (!token) return null

  try {
    const headers = { ...ENV_HEADERS, authorization: `Bearer ${token}` }
    const [featuresResponse, packsResponse] = await Promise.all([
      fetch(`${API_URL}/api/v1/admin/ai/feature-pricing`, { cache: 'no-store', headers }),
      fetch(`${API_URL}/api/v1/admin/ai/credit-packs`, { cache: 'no-store', headers }),
    ])

    const featurePayload = await featuresResponse.json().catch(() => ({}))
    const packsPayload = await packsResponse.json().catch(() => ({}))
    const featureData = featuresResponse.ok
      ? ((featurePayload.data?.data ?? featurePayload.data ?? featurePayload) as AiFeaturePricingData)
      : null
    const packsData = packsPayload?.data?.data ?? packsPayload?.data ?? packsPayload
    const responseMessage = (payload: any, fallback: string) =>
      payload?.message ?? payload?.error?.message ?? payload?.details?.message ?? fallback

    return {
      features: Array.isArray(featureData?.features) ? featureData.features : [],
      creditPacks:
        packsResponse.ok && Array.isArray(packsData?.creditPacks) ? packsData.creditPacks : [],
      featurePricingLoadError: featuresResponse.ok
        ? null
        : responseMessage(featurePayload, 'AI feature pricing could not be loaded.'),
      creditPacksLoadError: packsResponse.ok
        ? null
        : responseMessage(packsPayload, 'AI credit packs could not be loaded.'),
    }
  } catch {
    return null
  }
}

export default async function AiManagementPage() {
  const data = await getAiFeaturePricing()

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6">
      <AiManagementPanel initialData={data} />
    </main>
  )
}
