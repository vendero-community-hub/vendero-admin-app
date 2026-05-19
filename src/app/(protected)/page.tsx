import { API_URL, ENV_HEADERS } from "@/lib/environment";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  MessageCircle,
  RadioTower,
  ServerCrash,
  ShieldCheck,
  TriangleAlert,
  Users,
  Waypoints,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type QueueRow = {
  key: string;
  pending: number;
  delayed: number;
  deadLetters: number;
};

type OverviewPayload = {
  generatedAt: string;
  range: {
    label: string;
    since: string | null;
    liveSince: string | null;
  };
  metrics: {
    liveVendors: number;
    activeTrips: number;
    acceptedTrips: number;
    pendingKyc: number;
    failedQueues: number;
    activeBroadcasts: number;
    whatsappUsage: number;
  };
  vendorActivity: {
    totalVendors: number;
    joinedToday: number;
    verification: {
      pending: number;
      approved: number;
      rejected: number;
    };
    liveVendors: number;
    recentLiveVendors: Array<{
      id: number;
      businessName: string | null;
      city: string | null;
      state: string | null;
      verificationStatus: string | null;
      lastSeenAt: string | null;
    }>;
  };
  tripOperations: {
    activeTrips: number;
    acceptedTrips: number;
    completedToday: number;
    cancelledToday: number;
    byStatus: Record<string, number>;
    recentTrips: Array<{
      id: number;
      status: string;
      tripType: string | null;
      rateTotal: string | null;
      pickupDatetime: string | null;
      updatedAt: string | null;
      ownerBusinessName: string | null;
      acceptedBusinessName: string | null;
    }>;
  };
  kyc: {
    pendingDocuments: number;
    pendingVendors: number;
    manualReviewDocuments: number;
    providerQueuedDocuments: number;
    recentPending: Array<{
      id: number;
      documentType: string;
      status: string;
      providerStatus: string;
      createdAt: string;
      businessName: string | null;
    }>;
  };
  queues: {
    totals: {
      pending: number;
      delayed: number;
      deadLetters: number;
    };
    queues: QueueRow[];
    topFailedQueues: QueueRow[];
    unavailableReason?: string;
  };
  broadcasts: {
    activeDispatches: number;
    activeLists: number;
    failed24h: number;
    completed24h: number;
    recentDispatches: Array<{
      id: number;
      status: string;
      totalRecipients: number;
      sentCount: number;
      deliveredCount: number;
      failedCount: number;
      createdAt: string;
      listName: string | null;
    }>;
  };
  whatsapp: {
    sent24h: number;
    vendorCount24h: number;
    queuePending: number;
    queueDelayed: number;
    queueFailed: number;
    dailyUsage: Array<{ label: string; total: number }>;
  };
};

const fallbackOverview: OverviewPayload = {
  generatedAt: new Date().toISOString(),
  range: {
    label: "Last 24 hours",
    since: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    liveSince: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  metrics: {
    liveVendors: 0,
    activeTrips: 0,
    acceptedTrips: 0,
    pendingKyc: 0,
    failedQueues: 0,
    activeBroadcasts: 0,
    whatsappUsage: 0,
  },
  vendorActivity: {
    totalVendors: 0,
    joinedToday: 0,
    verification: { pending: 0, approved: 0, rejected: 0 },
    liveVendors: 0,
    recentLiveVendors: [],
  },
  tripOperations: {
    activeTrips: 0,
    acceptedTrips: 0,
    completedToday: 0,
    cancelledToday: 0,
    byStatus: {},
    recentTrips: [],
  },
  kyc: {
    pendingDocuments: 0,
    pendingVendors: 0,
    manualReviewDocuments: 0,
    providerQueuedDocuments: 0,
    recentPending: [],
  },
  queues: {
    totals: { pending: 0, delayed: 0, deadLetters: 0 },
    queues: [],
    topFailedQueues: [],
  },
  broadcasts: {
    activeDispatches: 0,
    activeLists: 0,
    failed24h: 0,
    completed24h: 0,
    recentDispatches: [],
  },
  whatsapp: {
    sent24h: 0,
    vendorCount24h: 0,
    queuePending: 0,
    queueDelayed: 0,
    queueFailed: 0,
    dailyUsage: [],
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeOverview(value: unknown): OverviewPayload {
  const source = isRecord(value) ? (value as Partial<OverviewPayload>) : {};
  const vendorActivity =
    source.vendorActivity ?? fallbackOverview.vendorActivity;
  const tripOperations =
    source.tripOperations ?? fallbackOverview.tripOperations;
  const kyc = source.kyc ?? fallbackOverview.kyc;
  const queues = source.queues ?? fallbackOverview.queues;
  const broadcasts = source.broadcasts ?? fallbackOverview.broadcasts;
  const whatsapp = source.whatsapp ?? fallbackOverview.whatsapp;

  return {
    ...fallbackOverview,
    ...source,
    range: { ...fallbackOverview.range, ...(source.range ?? {}) },
    metrics: { ...fallbackOverview.metrics, ...(source.metrics ?? {}) },
    vendorActivity: {
      ...fallbackOverview.vendorActivity,
      ...vendorActivity,
      verification: {
        ...fallbackOverview.vendorActivity.verification,
        ...(vendorActivity.verification ?? {}),
      },
      recentLiveVendors: Array.isArray(vendorActivity.recentLiveVendors)
        ? vendorActivity.recentLiveVendors
        : [],
    },
    tripOperations: {
      ...fallbackOverview.tripOperations,
      ...tripOperations,
      byStatus: isRecord(tripOperations.byStatus)
        ? tripOperations.byStatus
        : {},
      recentTrips: Array.isArray(tripOperations.recentTrips)
        ? tripOperations.recentTrips
        : [],
    },
    kyc: {
      ...fallbackOverview.kyc,
      ...kyc,
      recentPending: Array.isArray(kyc.recentPending) ? kyc.recentPending : [],
    },
    queues: {
      ...fallbackOverview.queues,
      ...queues,
      totals: { ...fallbackOverview.queues.totals, ...(queues.totals ?? {}) },
      queues: Array.isArray(queues.queues) ? queues.queues : [],
      topFailedQueues: Array.isArray(queues.topFailedQueues)
        ? queues.topFailedQueues
        : [],
    },
    broadcasts: {
      ...fallbackOverview.broadcasts,
      ...broadcasts,
      recentDispatches: Array.isArray(broadcasts.recentDispatches)
        ? broadcasts.recentDispatches
        : [],
    },
    whatsapp: {
      ...fallbackOverview.whatsapp,
      ...whatsapp,
      dailyUsage: Array.isArray(whatsapp.dailyUsage) ? whatsapp.dailyUsage : [],
    },
  };
}

function unwrapOverviewPayload(payload: unknown) {
  if (!isRecord(payload)) return fallbackOverview;

  const wrappedData = payload.data;
  const overview =
    isRecord(wrappedData) && isRecord(wrappedData.data)
      ? wrappedData.data
      : wrappedData;

  return normalizeOverview(overview);
}

async function getOverview() {
  const cookieStore = await cookies();
  const token = cookieStore.get("vendero_admin_access_token")?.value;

  if (!token) {
    return { overview: fallbackOverview, mode: "auth" as const };
  }

  try {
    const response = await fetch(
      `${API_URL}/api/v1/admin/operations/overview`,
      {
        cache: "no-store",
        headers: { ...ENV_HEADERS, authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Operations overview failed with ${response.status}`);
    }

    const payload = await response.json();
    return { overview: unwrapOverviewPayload(payload), mode: "live" as const };
  } catch {
    return { overview: fallbackOverview, mode: "fallback" as const };
  }
}

function formatNumber(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric.toLocaleString("en-IN") : "0";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "No signal";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function rupees(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return "Fare not set";
  return `₹${amount.toLocaleString("en-IN")}`;
}

function statusTone(status: string | null | undefined) {
  const normalized = String(status ?? "").toLowerCase();
  if (
    [
      "accepted",
      "completed",
      "approved",
      "active",
      "sent",
      "delivered",
    ].includes(normalized)
  ) {
    return "success" as const;
  }
  if (["failed", "cancelled", "rejected"].includes(normalized)) {
    return "danger" as const;
  }
  return "warning" as const;
}

function formatQueueName(key: string) {
  return key.replace(/^queue:/, "").replace(/\./g, " ");
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number;
  note: string;
  icon: typeof Users;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const iconClass =
    tone === "danger"
      ? "text-rose-300"
      : tone === "warning"
      ? "text-amber-300"
      : tone === "success"
      ? "text-emerald-300"
      : "text-primary";

  return (
    <Card className="border-border/70 bg-card/80">
      <CardContent className="p-4">
        <div className="flex min-h-32 flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm leading-5 text-muted-foreground">{label}</p>
            <div className="rounded-lg border border-border/70 bg-secondary/60 p-2">
              <Icon className={`h-4 w-4 ${iconClass}`} />
            </div>
          </div>
          <div>
            <p className="text-3xl font-semibold tracking-tight">
              {formatNumber(value)}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {note}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const width = max > 0 ? Math.max(4, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="h-2 overflow-hidden rounded-full bg-secondary">
      <div
        className="h-full rounded-full bg-primary"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export default async function AdminHomePage() {
  const { overview, mode } = await getOverview();
  const maxQueueDepth = Math.max(
    ...overview.queues.queues.map(
      (queue) => queue.pending + queue.delayed + queue.deadLetters
    ),
    1
  );
  const maxWhatsappDaily = Math.max(
    ...overview.whatsapp.dailyUsage.map((item) => item.total),
    1
  );

  const metricCards = [
    {
      label: "Live vendors",
      value: overview.metrics.liveVendors,
      note: "Seen in the last 10 minutes",
      icon: Users,
      tone: "success" as const,
    },
    {
      label: "Active trips",
      value: overview.metrics.activeTrips,
      note: "Open or shared trips",
      icon: Waypoints,
    },
    {
      label: "Accepted trips",
      value: overview.metrics.acceptedTrips,
      note: "Assigned to vendors",
      icon: BadgeCheck,
      tone: "success" as const,
    },
    {
      label: "Pending KYC",
      value: overview.metrics.pendingKyc,
      note: "Vendor profiles awaiting review",
      icon: ShieldCheck,
      tone:
        overview.metrics.pendingKyc > 0
          ? ("warning" as const)
          : ("success" as const),
    },
    {
      label: "Failed queues",
      value: overview.metrics.failedQueues,
      note: "Dead-letter jobs",
      icon: ServerCrash,
      tone:
        overview.metrics.failedQueues > 0
          ? ("danger" as const)
          : ("success" as const),
    },
    {
      label: "Active broadcasts",
      value: overview.metrics.activeBroadcasts,
      note: "Queued, processing or partial",
      icon: RadioTower,
    },
    {
      label: "WhatsApp usage",
      value: overview.metrics.whatsappUsage,
      note: "Messages sent in 24h",
      icon: MessageCircle,
    },
  ];

  return (
    <main className="space-y-6">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={mode === "live" ? "success" : "warning"}
              className="rounded-full px-3 py-1"
            >
              {mode === "live"
                ? "Live API"
                : mode === "auth"
                ? "Login required"
                : "Fallback data"}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              {overview.range.label}
            </Badge>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight lg:text-3xl">
            Operational dashboard
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Core-team view for vendor activity, trip flow, KYC, worker queues,
            broadcasts and WhatsApp usage.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          Updated {formatDate(overview.generatedAt)}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {metricCards.map((item) => (
          <MetricCard key={item.label} {...item} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="border-border/70 bg-card/80">
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardDescription className="uppercase tracking-[0.2em] text-muted-foreground">
                Trip Operations
              </CardDescription>
              <CardTitle className="mt-2 text-2xl">
                Active and accepted trip flow
              </CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="rounded-full px-3 py-1">
                Completed today {overview.tripOperations.completedToday}
              </Badge>
              <Badge
                variant={
                  overview.tripOperations.cancelledToday > 0
                    ? "warning"
                    : "success"
                }
                className="rounded-full px-3 py-1"
              >
                Cancelled today {overview.tripOperations.cancelledToday}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-4">
              {Object.entries(overview.tripOperations.byStatus).map(
                ([status, total]) => (
                  <div
                    key={status}
                    className="rounded-xl border border-border/70 bg-background/30 p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {status}
                    </p>
                    <p className="mt-2 text-2xl font-semibold">
                      {formatNumber(total)}
                    </p>
                  </div>
                )
              )}
              {Object.keys(overview.tripOperations.byStatus).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No trip records yet.
                </p>
              ) : null}
            </div>

            <div className="mt-5 overflow-hidden rounded-xl border border-border/70">
              <div className="hidden grid-cols-[0.55fr_1.5fr_1fr_0.8fr_1fr] gap-4 bg-background/30 px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground md:grid">
                <span>ID</span>
                <span>Owner</span>
                <span>Status</span>
                <span>Fare</span>
                <span>Pickup</span>
              </div>
              {overview.tripOperations.recentTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="grid gap-2 border-t border-border/70 px-4 py-3 text-sm md:grid-cols-[0.55fr_1.5fr_1fr_0.8fr_1fr] md:items-center"
                >
                  <span className="font-medium">#{trip.id}</span>
                  <span>
                    {trip.ownerBusinessName ?? "Unknown vendor"}
                    {trip.acceptedBusinessName ? (
                      <span className="block text-xs text-muted-foreground">
                        Assigned: {trip.acceptedBusinessName}
                      </span>
                    ) : null}
                  </span>
                  <span>
                    <Badge
                      variant={statusTone(trip.status)}
                      className="rounded-full px-3 py-1 capitalize"
                    >
                      {trip.status}
                    </Badge>
                  </span>
                  <span>{rupees(trip.rateTotal)}</span>
                  <span className="text-muted-foreground">
                    {formatDate(trip.pickupDatetime)}
                  </span>
                </div>
              ))}
              {!overview.tripOperations.recentTrips.length ? (
                <p className="border-t border-border/70 px-4 py-4 text-sm text-muted-foreground">
                  No recent trips.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardDescription className="uppercase tracking-[0.2em] text-muted-foreground">
              Live Vendors
            </CardDescription>
            <CardTitle className="mt-2 text-2xl">
              Online vendor signal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border/70 bg-background/30 p-3">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="mt-1 text-xl font-semibold">
                  {overview.vendorActivity.totalVendors}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/30 p-3">
                <p className="text-xs text-muted-foreground">Joined today</p>
                <p className="mt-1 text-xl font-semibold">
                  {overview.vendorActivity.joinedToday}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/30 p-3">
                <p className="text-xs text-muted-foreground">Approved</p>
                <p className="mt-1 text-xl font-semibold">
                  {overview.vendorActivity.verification.approved}
                </p>
              </div>
            </div>
            {overview.vendorActivity.recentLiveVendors.map((vendor) => (
              <div
                key={vendor.id}
                className="rounded-xl border border-border/70 bg-background/30 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {vendor.businessName ?? `Vendor #${vendor.id}`}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[vendor.city, vendor.state].filter(Boolean).join(", ") ||
                        "Location not set"}
                    </p>
                  </div>
                  <Badge
                    variant={statusTone(vendor.verificationStatus)}
                    className="rounded-full px-3 py-1 capitalize"
                  >
                    {vendor.verificationStatus ?? "pending"}
                  </Badge>
                </div>
                <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Activity className="h-3.5 w-3.5" />
                  Last seen {formatDate(vendor.lastSeenAt)}
                </p>
              </div>
            ))}
            {!overview.vendorActivity.recentLiveVendors.length ? (
              <p className="text-sm text-muted-foreground">
                No vendor sessions reported in the selected window.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="border-border/70 bg-card/80">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardDescription className="uppercase tracking-[0.2em] text-muted-foreground">
                KYC
              </CardDescription>
              <CardTitle className="mt-2 text-xl">
                Pending verification
              </CardTitle>
            </div>
            <Button asChild variant="outline" size="sm" className="rounded-xl">
              <Link href="/verifications">
                Open
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Badge
                variant="warning"
                className="justify-center rounded-full py-1"
              >
                {overview.kyc.pendingDocuments} pending
              </Badge>
              <Badge
                variant="danger"
                className="justify-center rounded-full py-1"
              >
                {overview.kyc.manualReviewDocuments} manual
              </Badge>
              <Badge
                variant="outline"
                className="justify-center rounded-full py-1"
              >
                {overview.kyc.providerQueuedDocuments} provider
              </Badge>
            </div>
            {overview.kyc.recentPending.map((document) => (
              <div
                key={document.id}
                className="rounded-xl border border-border/70 bg-background/30 p-4"
              >
                <p className="font-medium">
                  {document.businessName ?? `Vendor document #${document.id}`}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {document.documentType} • {document.providerStatus} •{" "}
                  {formatDate(document.createdAt)}
                </p>
              </div>
            ))}
            {!overview.kyc.recentPending.length ? (
              <p className="text-sm text-muted-foreground">
                No pending KYC documents.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardDescription className="uppercase tracking-[0.2em] text-muted-foreground">
                Queues
              </CardDescription>
              <CardTitle className="mt-2 text-xl">Worker pressure</CardTitle>
            </div>
            <Button asChild variant="outline" size="sm" className="rounded-xl">
              <Link href="/server">
                Server
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-border/70 bg-background/30 p-3">
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="mt-1 text-xl font-semibold">
                  {overview.queues.totals.pending}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/30 p-3">
                <p className="text-xs text-muted-foreground">Delayed</p>
                <p className="mt-1 text-xl font-semibold">
                  {overview.queues.totals.delayed}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/30 p-3">
                <p className="text-xs text-muted-foreground">Failed</p>
                <p className="mt-1 text-xl font-semibold">
                  {overview.queues.totals.deadLetters}
                </p>
              </div>
            </div>
            {overview.queues.queues.slice(0, 6).map((queue) => {
              const depth = queue.pending + queue.delayed + queue.deadLetters;
              return (
                <div key={queue.key} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-muted-foreground">
                      {formatQueueName(queue.key)}
                    </span>
                    <span className="font-medium">{depth}</span>
                  </div>
                  <ProgressBar value={depth} max={maxQueueDepth} />
                </div>
              );
            })}
            {overview.queues.unavailableReason ? (
              <p className="text-xs text-amber-300">
                {overview.queues.unavailableReason}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardDescription className="uppercase tracking-[0.2em] text-muted-foreground">
              Broadcast And WhatsApp
            </CardDescription>
            <CardTitle className="mt-2 text-xl">Messaging throughput</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/70 bg-background/30 p-3">
                <p className="text-xs text-muted-foreground">Active lists</p>
                <p className="mt-1 text-xl font-semibold">
                  {overview.broadcasts.activeLists}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/30 p-3">
                <p className="text-xs text-muted-foreground">Failed 24h</p>
                <p className="mt-1 text-xl font-semibold">
                  {overview.broadcasts.failed24h}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/30 p-3">
                <p className="text-xs text-muted-foreground">WA vendors</p>
                <p className="mt-1 text-xl font-semibold">
                  {overview.whatsapp.vendorCount24h}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/30 p-3">
                <p className="text-xs text-muted-foreground">WA failed</p>
                <p className="mt-1 text-xl font-semibold">
                  {overview.whatsapp.queueFailed}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {overview.whatsapp.dailyUsage.map((point) => (
                <div
                  key={point.label}
                  className="grid grid-cols-[4.5rem_1fr_2.5rem] items-center gap-3 text-sm"
                >
                  <span className="text-muted-foreground">{point.label}</span>
                  <ProgressBar value={point.total} max={maxWhatsappDaily} />
                  <span className="text-right font-medium">{point.total}</span>
                </div>
              ))}
              {!overview.whatsapp.dailyUsage.length ? (
                <p className="text-sm text-muted-foreground">
                  No WhatsApp messages recorded this week.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardDescription className="uppercase tracking-[0.2em] text-muted-foreground">
              Active Broadcasts
            </CardDescription>
            <CardTitle className="mt-2 text-xl">Latest dispatches</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.broadcasts.recentDispatches.map((dispatch) => (
              <div
                key={dispatch.id}
                className="rounded-xl border border-border/70 bg-background/30 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {dispatch.listName ?? `Dispatch #${dispatch.id}`}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {dispatch.sentCount}/{dispatch.totalRecipients} sent •{" "}
                      {dispatch.deliveredCount} delivered •{" "}
                      {dispatch.failedCount} failed
                    </p>
                  </div>
                  <Badge
                    variant={statusTone(dispatch.status)}
                    className="rounded-full px-3 py-1 capitalize"
                  >
                    {dispatch.status}
                  </Badge>
                </div>
                <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5" />
                  {formatDate(dispatch.createdAt)}
                </p>
              </div>
            ))}
            {!overview.broadcasts.recentDispatches.length ? (
              <p className="text-sm text-muted-foreground">
                No broadcast dispatches yet.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardDescription className="uppercase tracking-[0.2em] text-muted-foreground">
              Queue Exceptions
            </CardDescription>
            <CardTitle className="mt-2 text-xl">Failed job focus</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.queues.topFailedQueues.map((queue) => (
              <div
                key={queue.key}
                className="rounded-xl border border-border/70 bg-background/30 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium capitalize">
                      {formatQueueName(queue.key)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {queue.pending} pending • {queue.delayed} delayed
                    </p>
                  </div>
                  <Badge variant="danger" className="rounded-full px-3 py-1">
                    {queue.deadLetters} failed
                  </Badge>
                </div>
              </div>
            ))}
            {!overview.queues.topFailedQueues.length ? (
              <div className="rounded-xl border border-border/70 bg-background/30 p-4">
                <p className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  No failed queue jobs
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Dead-letter queues are empty right now.
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <Button
          asChild
          variant="outline"
          className="justify-between rounded-xl"
        >
          <Link href="/verifications">
            KYC desk
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="justify-between rounded-xl"
        >
          <Link href="/server">
            Queue dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="justify-between rounded-xl"
        >
          <Link href="/links">
            White-label links
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="justify-between rounded-xl"
        >
          <Link href="/vendors">
            Vendor review
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </section>

      {mode !== "live" ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
          <div className="flex items-center gap-2 font-medium">
            <TriangleAlert className="h-4 w-4" />
            Dashboard is not connected to the live admin API.
          </div>
          <p className="mt-2 text-amber-100/80">
            Sign in as an admin or check the API connection to see live platform
            operations data.
          </p>
        </div>
      ) : null}
    </main>
  );
}
