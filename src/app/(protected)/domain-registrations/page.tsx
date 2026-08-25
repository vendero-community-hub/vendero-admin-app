import { cookies } from 'next/headers'
import { API_URL, ENV_HEADERS } from '@/lib/environment'
import {
  DomainRegistrationQueuePanel,
  type DomainRegistrationQueueData,
} from './domain-registration-queue-panel'

async function getDomainRegistrationQueue() {
  const cookieStore = await cookies()
  const token = cookieStore.get('vendero_admin_access_token')?.value
  if (!token) return null

  const params = new URLSearchParams({
    page: '1',
    perPage: '50',
  })
  const response = await fetch(
    `${API_URL}/api/v1/admin/domain-registrations?${params.toString()}`,
    {
      cache: 'no-store',
      headers: {
        ...ENV_HEADERS,
        authorization: `Bearer ${token}`,
      },
    }
  )

  if (!response.ok) return null
  const payload = await response.json().catch(() => ({}))
  const data = payload?.data?.data ?? payload?.data ?? payload
  return data && typeof data === 'object'
    ? (data as DomainRegistrationQueueData)
    : null
}

export default async function DomainRegistrationsPage() {
  const initialData = await getDomainRegistrationQueue()
  return <DomainRegistrationQueuePanel initialData={initialData} />
}
