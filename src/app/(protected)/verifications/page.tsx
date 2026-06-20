import { API_URL, ENV_HEADERS } from '@/lib/environment'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ReviewKycButton } from './review-kyc-button'


type KycOverview = {
  summary: {
    total: number
    pending: number
    approved: number
    rejected: number
    manualReview: number
    providerQueued: number
  }
  documents: Array<{
    id: number
    documentType: string
    documentNumber: string | null
    fileUrl: string | null
    status: 'pending' | 'approved' | 'rejected'
    providerName: string | null
    providerStatus: string
    verificationMode: 'provider' | 'manual'
    reviewNotes: string | null
    rejectionReason: string | null
    createdAt: string
    vendorProfile: {
      id: number
      businessName: string
      city: string | null
      state: string | null
      user: {
        fullName: string | null
        phone: string
        email: string
      }
      premiumMembership?: {
        status: string
        planName: string
      } | null
    }
  }>
}

const EMPTY_SUMMARY: KycOverview['summary'] = {
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  manualReview: 0,
  providerQueued: 0,
}

async function getOverview() {
  const cookieStore = await cookies()
  const token = cookieStore.get('vendero_admin_access_token')?.value

  if (!token) {
    return null
  }

  const response = await fetch(`${API_URL}/api/v1/admin/kyc/overview`, {
    cache: 'no-store',
    headers: {
      ...ENV_HEADERS,
      authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    return null
  }

  const payload = await response.json()
  return payload.data as KycOverview
}

function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'secondary' {
  if (status === 'approved' || status === 'verified') return 'success'
  if (status === 'rejected' || status === 'failed') return 'danger'
  if (status === 'pending' || status === 'queued' || status === 'processing') return 'warning'
  return 'secondary'
}

export default async function AdminVerificationsPage() {
  const overview = await getOverview()
  const summary = overview?.summary ?? EMPTY_SUMMARY
  const documents = overview?.documents ?? []

  return (
    <main className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              KYC Control
            </Badge>
            <CardTitle className="text-3xl">Verification review desk</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7">
              Review vendor document submissions, catch provider downtime fallbacks, and keep
              onboarding moving even when automated KYC checks are unavailable.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Queue posture</CardTitle>
            <CardDescription>Live trust operations summary.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Pending</p>
              <p className="mt-1 text-2xl font-semibold">{summary.pending}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Manual review</p>
              <p className="mt-1 text-2xl font-semibold">{summary.manualReview}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Provider queued</p>
              <p className="mt-1 text-2xl font-semibold">{summary.providerQueued}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Rejected</p>
              <p className="mt-1 text-2xl font-semibold">{summary.rejected}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Document queue</CardTitle>
            <CardDescription>
              Aadhaar, PAN, and other vendor identity submissions routed through provider or
              manual fallback.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {documents.map((document) => (
              <div
                key={document.id}
                className="grid gap-4 rounded-2xl border border-border/70 bg-background/30 p-4 xl:grid-cols-[1.1fr_0.9fr]"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">
                      {document.vendorProfile.businessName} • {document.documentType}
                    </p>
                    <Badge variant={statusVariant(document.status)}>{document.status}</Badge>
                    <Badge variant={statusVariant(document.providerStatus)}>
                      {document.verificationMode} • {document.providerStatus}
                    </Badge>
                  </div>

                  <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                    <p>
                      Owner: {document.vendorProfile.user.fullName ?? 'Unknown'} •{' '}
                      {document.vendorProfile.user.phone}
                    </p>
                    <p>
                      Email: {document.vendorProfile.user.email || 'Not provided'}
                    </p>
                    <p>
                      Location: {document.vendorProfile.city ?? '-'}, {document.vendorProfile.state ?? '-'}
                    </p>
                    <p>
                      Membership: {document.vendorProfile.premiumMembership?.planName ?? 'Basic'} •{' '}
                      {document.vendorProfile.premiumMembership?.status ?? 'inactive'}
                    </p>
                    <p>Document no: {document.documentNumber ?? 'Not provided'}</p>
                    <p>Provider: {document.providerName ?? 'Manual review'}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    {document.fileUrl ? (
                      <Link
                        href={document.fileUrl}
                        target="_blank"
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        Open uploaded file
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">No file attached</span>
                    )}
                    <span className="text-muted-foreground">
                      Submitted {new Date(document.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {document.reviewNotes ? (
                    <p className="rounded-xl border border-border/60 bg-card/70 px-3 py-2 text-sm text-muted-foreground">
                      Review notes: {document.reviewNotes}
                    </p>
                  ) : null}
                  {document.rejectionReason ? (
                    <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                      Rejection reason: {document.rejectionReason}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-3 rounded-2xl border border-border/70 bg-card/70 p-4">
                  <p className="text-sm font-medium">Review action</p>
                  <p className="text-sm text-muted-foreground">
                    Use manual review whenever the provider is down or a document needs human
                    verification before approval.
                  </p>
                  <div className="flex gap-2">
                    <ReviewKycButton documentId={document.id} decision="approve" />
                    <ReviewKycButton documentId={document.id} decision="reject" />
                  </div>
                </div>
              </div>
            ))}

            {!documents.length ? (
              <p className="text-sm text-muted-foreground">
                No KYC document records are available yet.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
