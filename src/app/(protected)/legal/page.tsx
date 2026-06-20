import { API_URL, ENV_HEADERS } from '@/lib/environment'
import { cookies } from 'next/headers'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LegalContentPanel, type LegalPoliciesData } from './legal-content-panel'

async function getLegalPolicies() {
  const cookieStore = await cookies()
  const token = cookieStore.get('vendero_admin_access_token')?.value
  if (!token) return null

  const response = await fetch(`${API_URL}/api/v1/admin/legal/policies`, {
    cache: 'no-store',
    headers: { ...ENV_HEADERS, authorization: `Bearer ${token}` },
  })

  if (!response.ok) return null
  const payload = await response.json()
  return (payload.data?.data ?? payload.data) as LegalPoliciesData
}

export default async function LegalContentPage() {
  const data = await getLegalPolicies()
  const summary = data?.summary ?? {
    totalCount: 0,
    publishedCount: 0,
    draftCount: 0,
    archivedCount: 0,
  }

  return (
    <main className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Legal Content
            </Badge>
            <CardTitle className="text-3xl">Manage shared policy pages</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7">
              Privacy Policy, Terms of Service, and Content Policy are stored in the API and reused
              by landing pages, mobile login sheets, and public policy links.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Policy Snapshot</CardTitle>
            <CardDescription>Current central legal content status.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Published</p>
              <p className="mt-1 text-2xl font-semibold">{summary.publishedCount}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Drafts</p>
              <p className="mt-1 text-2xl font-semibold">{summary.draftCount}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Archived</p>
              <p className="mt-1 text-2xl font-semibold">{summary.archivedCount}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Total</p>
              <p className="mt-1 text-2xl font-semibold">{summary.totalCount}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <LegalContentPanel initialData={data} />
    </main>
  )
}
