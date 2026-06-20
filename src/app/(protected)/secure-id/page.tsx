import { API_URL, ENV_HEADERS } from "@/lib/environment";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cookies } from "next/headers";
import Link from "next/link";
import { Car, Fingerprint, ShieldCheck, UserRoundCheck } from "lucide-react";

type ResourceTab = "vendors" | "drivers" | "cabs";

type SecureIdResource = {
  resourceType: ResourceTab;
  id: number;
  vendorProfileId: number;
  title: string;
  subtitle: string;
  phone: string | null;
  status: string;
  submittedAt: string | null;
  city: string | null;
  state: string | null;
  documentCount: number;
  imageUrl: string | null;
};

type SecureIdOverview = {
  generatedAt: string;
  summary: Record<ResourceTab, {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }>;
  resources: Record<ResourceTab, SecureIdResource[]>;
};

const EMPTY_OVERVIEW: SecureIdOverview = {
  generatedAt: new Date().toISOString(),
  summary: {
    vendors: { total: 0, pending: 0, approved: 0, rejected: 0 },
    drivers: { total: 0, pending: 0, approved: 0, rejected: 0 },
    cabs: { total: 0, pending: 0, approved: 0, rejected: 0 },
  },
  resources: {
    vendors: [],
    drivers: [],
    cabs: [],
  },
};

const TAB_META: Record<ResourceTab, {
  label: string;
  title: string;
  description: string;
  icon: typeof Fingerprint;
}> = {
  vendors: {
    label: "Vendor",
    title: "Vendor account verifications",
    description: "Own account KYC and profile identity resources.",
    icon: ShieldCheck,
  },
  drivers: {
    label: "Driver",
    title: "Driver account verifications",
    description: "Driver photo, phone, Aadhaar, and license review.",
    icon: UserRoundCheck,
  },
  cabs: {
    label: "Cab",
    title: "Cab verifications",
    description: "Cab photos, RC, insurance, and cab profile review.",
    icon: Car,
  },
};

function statusVariant(status: string): "success" | "warning" | "danger" | "secondary" | "outline" {
  if (["approved", "verified", "active"].includes(status)) return "success";
  if (["rejected", "failed"].includes(status)) return "danger";
  if (["pending", "manual_review", "queued"].includes(status)) return "warning";
  return "secondary";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not submitted";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function locationLabel(row: SecureIdResource) {
  return [row.city, row.state].filter(Boolean).join(", ") || "Location not set";
}

async function getOverview() {
  const cookieStore = await cookies();
  const token = cookieStore.get("vendero_admin_access_token")?.value;
  if (!token) return null;

  const response = await fetch(`${API_URL}/api/v1/admin/secure-id`, {
    cache: "no-store",
    headers: {
      ...ENV_HEADERS,
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) return null;
  const payload = await response.json();
  return (payload.data?.data ?? payload.data) as SecureIdOverview;
}

async function resolveSearchParams(
  searchParams?: Promise<Record<string, string | string[] | undefined>>,
) {
  return searchParams ? await Promise.resolve(searchParams) : {};
}

export default async function SecureIdPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [overview, resolvedSearchParams] = await Promise.all([
    getOverview(),
    resolveSearchParams(searchParams),
  ]);
  const data = overview ?? EMPTY_OVERVIEW;
  const requestedTab = String(resolvedSearchParams.tab ?? "vendors");
  const activeTab: ResourceTab = ["vendors", "drivers", "cabs"].includes(requestedTab)
    ? (requestedTab as ResourceTab)
    : "vendors";
  const activeRows = data.resources[activeTab] ?? [];
  const activeMeta = TAB_META[activeTab];
  const ActiveIcon = activeMeta.icon;

  return (
    <main className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Vendero Secure ID
            </Badge>
            <CardTitle className="text-3xl">Resource verification desk</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7">
              Review vendor accounts, driver accounts, and cab resources from one secure
              verification queue. Open any resource to inspect submitted fields and uploaded files.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Pending work</CardTitle>
            <CardDescription>Live Secure ID queue summary.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3 text-sm">
            {(["vendors", "drivers", "cabs"] as ResourceTab[]).map((key) => (
              <div key={key} className="rounded-lg border border-border/70 bg-background/30 p-3">
                <p className="text-muted-foreground">{TAB_META[key].label}</p>
                <p className="mt-1 text-2xl font-semibold">{data.summary[key].pending}</p>
                <p className="mt-1 text-xs text-muted-foreground">{data.summary[key].total} total</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {(["vendors", "drivers", "cabs"] as ResourceTab[]).map((key) => {
          const Icon = TAB_META[key].icon;
          return (
            <Link key={key} href={`/secure-id?tab=${key}`}>
              <Card className={`border-border/70 bg-card/80 transition-colors hover:bg-accent/40 ${activeTab === key ? "ring-2 ring-primary/50" : ""}`}>
                <CardContent className="flex items-start justify-between gap-3 p-5">
                  <div>
                    <p className="text-sm text-muted-foreground">{TAB_META[key].label}</p>
                    <p className="mt-2 text-3xl font-semibold">{data.summary[key].total}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {data.summary[key].approved} approved, {data.summary[key].rejected} rejected
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-secondary/60 p-3">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>

      <section>
        <Card className="border-border/70 bg-card/80">
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardDescription className="uppercase tracking-[0.2em] text-muted-foreground">
                  {activeMeta.label} Tab
                </CardDescription>
                <CardTitle className="mt-2 flex items-center gap-2 text-2xl">
                  <ActiveIcon className="h-5 w-5 text-primary" />
                  {activeMeta.title}
                </CardTitle>
                <CardDescription className="mt-2">{activeMeta.description}</CardDescription>
              </div>
              <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
                {activeRows.length} shown
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border border-border/70">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-background/60 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Resource</th>
                    <th className="px-4 py-3">Vendor / Owner</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Files</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {activeRows.map((row) => (
                    <tr key={`${row.resourceType}-${row.id}`} className="bg-card/40">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 overflow-hidden rounded-lg border border-border/70 bg-background/50">
                            {row.imageUrl ? (
                              <img src={row.imageUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Fingerprint className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold">{row.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{row.phone ?? "No phone"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p>{row.subtitle}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{locationLabel(row)}</p>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">{row.documentCount}</td>
                      <td className="px-4 py-4 text-muted-foreground">{formatDate(row.submittedAt)}</td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/secure-id/${row.resourceType}/${row.id}`}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          Open detail
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!activeRows.length ? (
                <p className="p-5 text-sm text-muted-foreground">
                  No resources found in this Secure ID tab.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
