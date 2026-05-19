import { API_URL, ENV_HEADERS } from '@/lib/environment'
import { cookies } from 'next/headers'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StaffManagementPanel } from './staff-management-panel'


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

type StaffOverview = {
  staff: StaffRecord[]
  permissionCatalog?: Array<{ key: string; label: string; description?: string }>
  analytics: {
    totalStaff: number
    activeStaff: number
    otpEnabledStaff: number
    superStaff?: number
    disabledStaff: number
  }
}

async function getOverview() {
  const cookieStore = await cookies()
  const token = cookieStore.get('vendero_admin_access_token')?.value
  if (!token) return null

  const response = await fetch(`${API_URL}/api/v1/admin/staff`, {
    cache: 'no-store',
    headers: {
      ...ENV_HEADERS,
      authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) return null
  const payload = await response.json()
  return (payload.data?.data ?? payload.data) as StaffOverview
}

export default async function StaffPage() {
  const overview = await getOverview()

  return (
    <main className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Staff Control
            </Badge>
            <CardTitle className="text-3xl">Manage admin staff access and OTP login readiness</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7">
              Staff access is controlled from staff profiles. Create, update, disable, or remove
              admin operators from here.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Snapshot</CardTitle>
            <CardDescription>Current admin staff posture.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Total staff</p>
              <p className="mt-1 text-2xl font-semibold">{overview?.analytics.totalStaff ?? 0}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Active staff</p>
              <p className="mt-1 text-2xl font-semibold">{overview?.analytics.activeStaff ?? 0}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">OTP enabled</p>
              <p className="mt-1 text-2xl font-semibold">{overview?.analytics.otpEnabledStaff ?? 0}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Super staff</p>
              <p className="mt-1 text-2xl font-semibold">{overview?.analytics.superStaff ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <StaffManagementPanel initialData={overview} />
    </main>
  )
}
