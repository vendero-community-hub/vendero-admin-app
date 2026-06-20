import { API_URL, ENV_HEADERS } from "@/lib/environment";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Fingerprint } from "lucide-react";
import { SecureIdReviewActions } from "../../secure-id-actions";

type SecureIdDetail = {
  resourceType: string;
  id: number;
  title: string;
  status: string;
  vendor: {
    id: number;
    businessName: string | null;
    ownerName?: string | null;
    phone: string | null;
    email: string | null;
    city: string | null;
    state: string | null;
  };
  fields: Array<{
    label: string;
    value: string | null;
  }>;
  images: Array<{
    label: string;
    url: string;
    kind?: string;
  }>;
  documents: Array<{
    id: number;
    label: string;
    url: string | null;
    status?: string | null;
    providerStatus?: string | null;
    reviewNotes?: string | null;
    rejectionReason?: string | null;
    createdAt?: string | null;
  }>;
};

function statusVariant(status: string): "success" | "warning" | "danger" | "secondary" | "outline" {
  if (["approved", "verified", "active"].includes(status)) return "success";
  if (["rejected", "failed"].includes(status)) return "danger";
  if (["pending", "manual_review", "queued"].includes(status)) return "warning";
  return "secondary";
}

function typeLabel(resourceType: string) {
  if (resourceType === "vendors") return "Vendor";
  if (resourceType === "drivers") return "Driver";
  if (resourceType === "cabs") return "Cab";
  return "Resource";
}

function locationLabel(vendor: SecureIdDetail["vendor"]) {
  return [vendor.city, vendor.state].filter(Boolean).join(", ") || "Location not set";
}

async function getDetail(resourceType: string, id: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("vendero_admin_access_token")?.value;
  if (!token) return null;

  const response = await fetch(`${API_URL}/api/v1/admin/secure-id/${resourceType}/${id}`, {
    cache: "no-store",
    headers: {
      ...ENV_HEADERS,
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) return null;
  const payload = await response.json();
  return (payload.data?.data ?? payload.data) as SecureIdDetail;
}

async function resolveParams(
  params: Promise<{ resourceType: string; id: string }> | { resourceType: string; id: string },
) {
  return Promise.resolve(params);
}

export default async function SecureIdDetailPage({
  params,
}: {
  params: Promise<{ resourceType: string; id: string }> | { resourceType: string; id: string };
}) {
  const resolvedParams = await resolveParams(params);
  const detail = await getDetail(resolvedParams.resourceType, resolvedParams.id);

  if (!detail) {
    return (
      <main className="space-y-4">
        <Button asChild variant="outline">
          <Link href="/secure-id">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <Card className="border-border/70 bg-card/80">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Secure ID resource not found or unavailable.
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline">
          <Link href={`/secure-id?tab=${detail.resourceType}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to {typeLabel(detail.resourceType)}
          </Link>
        </Button>
        <SecureIdReviewActions
          resourceType={detail.resourceType}
          resourceId={detail.id}
          status={detail.status}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Vendero Secure ID - {typeLabel(detail.resourceType)}
            </Badge>
            <CardTitle className="text-3xl">{detail.title}</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7">
              Review the submitted data, uploaded images, and resource verification status before
              approving this resource for trusted Vendero use.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Verification status</CardTitle>
            <CardDescription>{detail.vendor.businessName ?? "Vendor business"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Badge variant={statusVariant(detail.status)} className="rounded-full px-3 py-1">
              {detail.status}
            </Badge>
            <p className="text-muted-foreground">{detail.vendor.phone ?? "No phone"}</p>
            <p className="text-muted-foreground">{detail.vendor.email ?? "No email"}</p>
            <p className="text-muted-foreground">{locationLabel(detail.vendor)}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Submitted data</CardTitle>
            <CardDescription>All available fields saved with this resource.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {detail.fields.map((item) => (
              <div key={item.label} className="rounded-lg border border-border/70 bg-background/30 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-sm font-medium">{item.value ?? "-"}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Images</CardTitle>
            <CardDescription>Photos and image documents submitted for review.</CardDescription>
          </CardHeader>
          <CardContent>
            {detail.images.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {detail.images.map((image) => (
                  <a
                    key={`${image.label}-${image.url}`}
                    href={image.url}
                    target="_blank"
                    rel="noreferrer"
                    className="overflow-hidden rounded-lg border border-border/70 bg-background/30"
                  >
                    <div className="aspect-video bg-black/20">
                      <img src={image.url} alt={image.label} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex items-center justify-between gap-2 p-3 text-sm">
                      <span className="font-medium">{image.label}</span>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex min-h-32 items-center justify-center rounded-lg border border-border/70 bg-background/30 text-sm text-muted-foreground">
                <Fingerprint className="mr-2 h-4 w-4" />
                No image files uploaded.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Documents</CardTitle>
            <CardDescription>Document records attached to this resource.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.documents.map((document) => (
              <div
                key={`${document.id}-${document.label}`}
                className="flex flex-col gap-3 rounded-lg border border-border/70 bg-background/30 p-4 text-sm lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <p className="font-semibold">{document.label}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {document.status ? (
                      <Badge variant={statusVariant(document.status)}>{document.status}</Badge>
                    ) : null}
                    {document.providerStatus ? (
                      <Badge variant={statusVariant(document.providerStatus)}>
                        {document.providerStatus}
                      </Badge>
                    ) : null}
                  </div>
                  {document.rejectionReason ? (
                    <p className="mt-2 text-sm text-red-200">{document.rejectionReason}</p>
                  ) : null}
                </div>
                {document.url ? (
                  <Button asChild variant="outline" size="sm">
                    <a href={document.url} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Open file
                    </a>
                  </Button>
                ) : (
                  <span className="text-muted-foreground">No file attached</span>
                )}
              </div>
            ))}
            {!detail.documents.length ? (
              <p className="text-sm text-muted-foreground">No document records attached.</p>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
