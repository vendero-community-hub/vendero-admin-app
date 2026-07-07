"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Store,
  Trash2,
  UserRoundCheck,
  UserRoundX,
  X,
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
import { Input } from "@/components/ui/input";
import { useActionModal } from "@/components/ui/action-modal";

type BadgeTone =
  | "default"
  | "secondary"
  | "outline"
  | "success"
  | "warning"
  | "danger";

export type VendorRecord = {
  id: number;
  userId: number;
  businessName: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  isActive: boolean;
  subscriptionTier: string;
  lastLoginAt: string | null;
  lastSeenAt: string | null;
  verificationStatus: "pending" | "approved" | "rejected";
  isVerified: boolean;
  onboardingCompleted: boolean;
  registrationStatus: "draft" | "completed";
  createdAt: string | null;
  updatedAt: string | null;
  subscription: {
    status: string;
    planName: string;
    planCode: string | null;
    paymentStatus: string;
    expiresAt: string | null;
    nextBillingAt: string | null;
  };
  kyc: {
    totalDocuments: number;
    pendingDocuments: number;
    approvedDocuments: number;
    rejectedDocuments: number;
    manualReviewDocuments: number;
  };
  marketplace: {
    id: number | null;
    isPublic: boolean;
    profileStatus: "draft" | "live" | "hidden";
    reviewAverage: number;
    reviewCount: number;
    cabListings: number;
    serviceListings: number;
    activeLeads: number;
    logoUrl: string | null;
  };
  operations: {
    activeTrips: number;
    acceptedTrips: number;
  };
};

export type VendorManagementOverview = {
  generatedAt: string;
  summary: {
    total: number;
    active: number;
    inactive: number;
    registrationDrafts: number;
    pendingKyc: number;
    approvedKyc: number;
    rejectedKyc: number;
    activeSubscriptions: number;
    pendingSubscriptionPayments: number;
    expiredSubscriptions: number;
    marketplaceLive: number;
    marketplaceHidden: number;
    marketplaceDraft: number;
  };
  vendors: VendorRecord[];
};

type VendorDetail = {
  vendor: VendorRecord;
  documents: Array<{
    id: number;
    documentType: string;
    fileUrl: string | null;
    status: string;
    providerName: string | null;
    providerStatus: string;
    verificationMode: string;
    reviewNotes: string | null;
    rejectionReason: string | null;
    createdAt: string;
    updatedAt: string | null;
  }>;
  cabs: Array<{
    id: number;
    cabNumber: string | null;
    color: string | null;
    status: string | null;
    vendorStatus: string | null;
    categoryName: string | null;
    modelName: string | null;
    verificationStatus: VendorRecord["verificationStatus"];
    verifiedAt: string | null;
  }>;
  drivers: Array<{
    id: number;
    fullName: string | null;
    phone: string | null;
    licenseNumber: string | null;
    verificationStatus: VendorRecord["verificationStatus"];
    phoneVerifiedAt: string | null;
    verifiedAt: string | null;
  }>;
  recentTrips: Array<{
    id: number;
    status: string;
    tripType: string;
    pickupDatetime: string | null;
    rateTotal: string | null;
    createdAt: string;
    updatedAt: string | null;
  }>;
  deviceSessions: Array<{
    id: number;
    deviceLabel: string | null;
    platform: string | null;
    lastSeenAt: string | null;
    revokedAt: string | null;
    isCurrent: boolean;
    createdAt: string;
  }>;
  subscriptionHistory: Array<{
    id: number;
    action: string;
    notes: string | null;
    metadata: string | Record<string, unknown> | null;
    createdAt: string;
  }>;
  featureUsage: {
    summary: {
      featureCount: number;
      enabledFeatureCount: number;
      usedFeatureCount: number;
      unusedFeatureCount: number;
      eventCount: number;
      lastUsedAt: string | null;
    };
    features: Array<{
      featureKey: string;
      title: string;
      module: string;
      status: string;
      isEnabled: boolean;
      eventCount: number;
      hasUsed: boolean;
      lastUsedAt: string | null;
    }>;
    recentEvents: Array<{
      id: number;
      featureKey: string;
      eventName: string;
      eventType: string;
      routeName: string | null;
      screenName: string | null;
      occurredAt: string | null;
    }>;
  };
};

type ResourceType = "drivers" | "cabs";

const EMPTY_SUMMARY: VendorManagementOverview["summary"] = {
  total: 0,
  active: 0,
  inactive: 0,
  registrationDrafts: 0,
  pendingKyc: 0,
  approvedKyc: 0,
  rejectedKyc: 0,
  activeSubscriptions: 0,
  pendingSubscriptionPayments: 0,
  expiredSubscriptions: 0,
  marketplaceLive: 0,
  marketplaceHidden: 0,
  marketplaceDraft: 0,
};

function getAdminToken() {
  const tokenEntry = document.cookie
    .split("; ")
    .find((part) => part.startsWith("vendero_admin_access_token="));

  return tokenEntry?.split("=")[1] ?? null;
}

async function requestJson(
  path: string,
  body?: Record<string, unknown>,
  method = body ? "POST" : "GET",
) {
  const token = getAdminToken();
  const response = await fetch(path, {
    method,
    headers: {
      "content-type": "application/json",
      authorization: token ? `Bearer ${token}` : "",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      payload?.message ?? payload?.error?.message ?? "Request failed",
    );
  }

  return payload?.data?.data ?? payload?.data ?? payload;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusTone(status: string): BadgeTone {
  if (["active", "approved", "verified", "live"].includes(status))
    return "success";
  if (["rejected", "failed", "expired", "hidden"].includes(status))
    return "danger";
  if (["pending", "pending_verification", "draft", "inactive"].includes(status))
    return "warning";
  return "secondary";
}

function marketplaceLabel(vendor: VendorRecord) {
  if (
    vendor.marketplace.isPublic &&
    vendor.marketplace.profileStatus === "live"
  )
    return "live";
  return vendor.marketplace.profileStatus;
}

function locationLabel(vendor: VendorRecord) {
  return (
    [vendor.city, vendor.state].filter(Boolean).join(", ") || "Location not set"
  );
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
  icon: typeof Building2;
  tone?: BadgeTone;
}) {
  return (
    <Card className="border-border/70 bg-card/80">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {value}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {note}
            </p>
          </div>
          <div className="rounded-lg border border-border/70 bg-secondary/60 p-3">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
        <Badge variant={tone} className="mt-4">
          Live control
        </Badge>
      </CardContent>
    </Card>
  );
}

function ResourceVerificationList({
  title,
  rows,
  resourceType,
  vendor,
  workingAction,
  onUpdate,
}: {
  title: string;
  rows: Array<VendorDetail["drivers"][number] | VendorDetail["cabs"][number]>;
  resourceType: ResourceType;
  vendor: VendorRecord;
  workingAction: string | null;
  onUpdate: (
    vendor: VendorRecord,
    resourceType: ResourceType,
    resourceId: number,
    verificationStatus: VendorRecord["verificationStatus"],
  ) => void;
}) {
  return (
    <div>
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-2 space-y-2">
        {rows.map((resource) => {
          const isDriver = resourceType === "drivers";
          const driver = isDriver
            ? (resource as VendorDetail["drivers"][number])
            : null;
          const cab = !isDriver
            ? (resource as VendorDetail["cabs"][number])
            : null;
          const label =
            driver?.fullName ??
            cab?.cabNumber ??
            cab?.modelName ??
            cab?.categoryName ??
            "Resource";
          const meta = [
            driver?.phone,
            driver?.licenseNumber ? `DL ${driver.licenseNumber}` : null,
            cab?.categoryName,
            cab?.modelName,
            cab?.color,
          ]
            .filter(Boolean)
            .join(" - ");
          const status = resource.verificationStatus ?? "pending";

          return (
            <div
              key={`${resourceType}-${resource.id}`}
              className="rounded-lg border border-border/70 bg-background/30 px-3 py-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {meta || "No extra detail"}
                  </p>
                </div>
                <Badge variant={statusTone(status)}>{status}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {status === "approved" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onUpdate(vendor, resourceType, resource.id, "pending")
                    }
                    disabled={
                      workingAction ===
                      `${vendor.id}:resource-${resourceType}-${resource.id}-pending`
                    }
                  >
                    <ShieldAlert className="h-4 w-4" />
                    Pending
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() =>
                      onUpdate(vendor, resourceType, resource.id, "approved")
                    }
                    disabled={
                      workingAction ===
                      `${vendor.id}:resource-${resourceType}-${resource.id}-approved`
                    }
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Approve
                  </Button>
                )}
                {status !== "rejected" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onUpdate(vendor, resourceType, resource.id, "rejected")
                    }
                    disabled={
                      workingAction ===
                      `${vendor.id}:resource-${resourceType}-${resource.id}-rejected`
                    }
                  >
                    <ShieldAlert className="h-4 w-4" />
                    Reject
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
        {!rows.length ? (
          <p className="text-sm text-muted-foreground">
            No {title.toLowerCase()} created yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function VendorFeatureUsage({
  featureUsage,
}: {
  featureUsage: VendorDetail["featureUsage"] | undefined;
}) {
  const summary = featureUsage?.summary;
  const features = featureUsage?.features ?? [];

  return (
    <div className="rounded-lg border border-border/70 bg-card/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">Feature usage</p>
          <p className="text-sm text-muted-foreground">
            Used {summary?.usedFeatureCount ?? 0} of{" "}
            {summary?.featureCount ?? features.length} tracked feature tags.
          </p>
        </div>
        <Badge variant={(summary?.usedFeatureCount ?? 0) > 0 ? "success" : "warning"}>
          {summary?.eventCount ?? 0} events
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-lg border border-border/70 bg-background/30 p-3">
          <p className="text-muted-foreground">Used</p>
          <p className="mt-1 text-xl font-semibold">{summary?.usedFeatureCount ?? 0}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-background/30 p-3">
          <p className="text-muted-foreground">Not used</p>
          <p className="mt-1 text-xl font-semibold">{summary?.unusedFeatureCount ?? 0}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-background/30 p-3">
          <p className="text-muted-foreground">Last use</p>
          <p className="mt-1 text-sm font-semibold">{formatDate(summary?.lastUsedAt)}</p>
        </div>
      </div>

      <div className="mt-4 max-h-72 space-y-2 overflow-auto pr-1">
        {features.map((feature) => (
          <div
            key={feature.featureKey}
            className="grid gap-2 rounded-lg border border-border/70 bg-background/30 px-3 py-2 text-sm md:grid-cols-[1fr_auto]"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-medium">{feature.title}</p>
                <Badge
                  variant={
                    !feature.isEnabled
                      ? "warning"
                      : feature.hasUsed
                        ? "success"
                        : "secondary"
                  }
                >
                  {!feature.isEnabled
                    ? "not enabled"
                    : feature.hasUsed
                      ? "used"
                      : "not used"}
                </Badge>
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {feature.module} - {feature.featureKey}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <Badge variant="outline">{feature.eventCount} events</Badge>
              <span className="text-xs text-muted-foreground">
                {formatDate(feature.lastUsedAt)}
              </span>
            </div>
          </div>
        ))}
        {!features.length ? (
          <p className="text-sm text-muted-foreground">
            No feature usage data has been collected for this vendor yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function VendorProfileModal({
  vendor,
  detail,
  loading,
  workingAction,
  onClose,
  onResourceVerification,
}: {
  vendor: VendorRecord;
  detail: VendorDetail | null;
  loading: boolean;
  workingAction: string | null;
  onClose: () => void;
  onResourceVerification: (
    vendor: VendorRecord,
    resourceType: ResourceType,
    resourceId: number,
    verificationStatus: VendorRecord["verificationStatus"],
  ) => void;
}) {
  const current = detail?.vendor ?? vendor;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-6xl overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p className="text-xl font-semibold">{current.businessName}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {current.contactName ?? "Owner not set"} -{" "}
              {current.phone ?? "No phone"} - {locationLabel(current)}
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={onClose}
            title="Close profile"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="max-h-[82vh] overflow-y-auto p-5">
          {loading ? (
            <p className="text-sm text-muted-foreground">
              Loading vendor profile...
            </p>
          ) : (
            <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
              <section className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-border/70 bg-card/60 p-4">
                    <p className="text-sm text-muted-foreground">Account</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant={current.isActive ? "success" : "danger"}>
                        {current.isActive ? "active" : "inactive"}
                      </Badge>
                      {!current.onboardingCompleted ? (
                        <Badge variant="warning">registration draft</Badge>
                      ) : null}
                      <Badge variant={statusTone(current.verificationStatus)}>
                        KYC {current.verificationStatus}
                      </Badge>
                      <Badge variant={statusTone(marketplaceLabel(current))}>
                        Marketplace {marketplaceLabel(current)}
                      </Badge>
                    </div>
                    <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                      <p>Email: {current.email ?? "Not provided"}</p>
                      <p>Last login: {formatDate(current.lastLoginAt)}</p>
                      <p>Last seen: {formatDate(current.lastSeenAt)}</p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/70 bg-card/60 p-4">
                    <p className="text-sm text-muted-foreground">
                      Subscription
                    </p>
                    <p className="mt-3 text-lg font-semibold">
                      {current.subscription.planName}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant={statusTone(current.subscription.status)}>
                        {current.subscription.status}
                      </Badge>
                      <Badge
                        variant={statusTone(current.subscription.paymentStatus)}
                      >
                        {current.subscription.paymentStatus}
                      </Badge>
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">
                      Expires {formatDate(current.subscription.expiresAt)}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-border/70 bg-card/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">KYC documents</p>
                      <p className="text-sm text-muted-foreground">
                        {current.kyc.pendingDocuments} pending,{" "}
                        {current.kyc.approvedDocuments} approved,{" "}
                        {current.kyc.rejectedDocuments} rejected
                      </p>
                    </div>
                    <Badge
                      variant={
                        current.kyc.manualReviewDocuments > 0
                          ? "warning"
                          : "secondary"
                      }
                    >
                      {current.kyc.manualReviewDocuments} manual review
                    </Badge>
                  </div>
                  <div className="mt-4 space-y-2">
                    {(detail?.documents ?? []).map((document) => (
                      <div
                        key={document.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/30 px-3 py-2 text-sm"
                      >
                        <span>{document.documentType}</span>
                        <div className="flex flex-wrap gap-2">
                          {document.fileUrl ? (
                            <a
                              className="text-primary underline-offset-4 hover:underline"
                              href={document.fileUrl}
                              rel="noreferrer"
                              target="_blank"
                            >
                              Open file
                            </a>
                          ) : null}
                          <Badge variant={statusTone(document.status)}>
                            {document.status}
                          </Badge>
                          <Badge variant={statusTone(document.providerStatus)}>
                            {document.providerStatus}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {!detail?.documents.length ? (
                      <p className="text-sm text-muted-foreground">
                        No document records available.
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-lg border border-border/70 bg-card/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">Resource verification</p>
                      <p className="text-sm text-muted-foreground">
                        Optional for cabs and drivers. Approved resources show
                        the verified icon to customers and vendors.
                      </p>
                    </div>
                    <Badge variant="outline">Optional</Badge>
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <ResourceVerificationList
                      title="Drivers"
                      rows={detail?.drivers ?? []}
                      resourceType="drivers"
                      vendor={current}
                      workingAction={workingAction}
                      onUpdate={onResourceVerification}
                    />
                    <ResourceVerificationList
                      title="Cabs"
                      rows={detail?.cabs ?? []}
                      resourceType="cabs"
                      vendor={current}
                      workingAction={workingAction}
                      onUpdate={onResourceVerification}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-border/70 bg-card/60 p-4">
                  <p className="font-semibold">Recent trips</p>
                  <div className="mt-4 space-y-2">
                    {(detail?.recentTrips ?? []).map((trip) => (
                      <div
                        key={trip.id}
                        className="grid gap-2 rounded-lg border border-border/70 bg-background/30 px-3 py-2 text-sm md:grid-cols-[0.5fr_0.7fr_1fr_0.8fr]"
                      >
                        <span>#{trip.id}</span>
                        <Badge
                          variant={statusTone(trip.status)}
                          className="w-fit"
                        >
                          {trip.status}
                        </Badge>
                        <span className="text-muted-foreground">
                          {trip.tripType}
                        </span>
                        <span className="text-muted-foreground">
                          {formatDate(trip.pickupDatetime)}
                        </span>
                      </div>
                    ))}
                    {!detail?.recentTrips.length ? (
                      <p className="text-sm text-muted-foreground">
                        No recent trip records available.
                      </p>
                    ) : null}
                  </div>
                </div>

                <VendorFeatureUsage featureUsage={detail?.featureUsage} />
              </section>

              <aside className="space-y-4">
                <div className="rounded-lg border border-border/70 bg-card/60 p-4">
                  <p className="font-semibold">Marketplace profile</p>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg border border-border/70 bg-background/30 p-3">
                      <p className="text-muted-foreground">Cab listings</p>
                      <p className="mt-1 text-xl font-semibold">
                        {current.marketplace.cabListings}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-background/30 p-3">
                      <p className="text-muted-foreground">Services</p>
                      <p className="mt-1 text-xl font-semibold">
                        {current.marketplace.serviceListings}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-background/30 p-3">
                      <p className="text-muted-foreground">Active leads</p>
                      <p className="mt-1 text-xl font-semibold">
                        {current.marketplace.activeLeads}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-background/30 p-3">
                      <p className="text-muted-foreground">Reviews</p>
                      <p className="mt-1 text-xl font-semibold">
                        {current.marketplace.reviewCount}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border/70 bg-card/60 p-4">
                  <p className="font-semibold">Device sessions</p>
                  <div className="mt-4 space-y-2">
                    {(detail?.deviceSessions ?? []).map((session) => (
                      <div
                        key={session.id}
                        className="rounded-lg border border-border/70 bg-background/30 px-3 py-2 text-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span>
                            {session.deviceLabel ??
                              session.platform ??
                              "Device"}
                          </span>
                          <Badge
                            variant={session.revokedAt ? "danger" : "success"}
                          >
                            {session.revokedAt ? "revoked" : "active"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-muted-foreground">
                          Last seen {formatDate(session.lastSeenAt)}
                        </p>
                      </div>
                    ))}
                    {!detail?.deviceSessions.length ? (
                      <p className="text-sm text-muted-foreground">
                        No session records available.
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-lg border border-border/70 bg-card/60 p-4">
                  <p className="font-semibold">Subscription history</p>
                  <div className="mt-4 space-y-2">
                    {(detail?.subscriptionHistory ?? []).map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-border/70 bg-background/30 px-3 py-2 text-sm"
                      >
                        <p>{item.action}</p>
                        <p className="mt-1 text-muted-foreground">
                          {formatDate(item.createdAt)}
                        </p>
                      </div>
                    ))}
                    {!detail?.subscriptionHistory.length ? (
                      <p className="text-sm text-muted-foreground">
                        No subscription history yet.
                      </p>
                    ) : null}
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function VendorManagementPanel({
  overview,
}: {
  overview: VendorManagementOverview | null;
}) {
  const summary = overview?.summary ?? EMPTY_SUMMARY;
  const vendors = overview?.vendors ?? [];
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedVendor, setSelectedVendor] = useState<VendorRecord | null>(
    null,
  );
  const [selectedDetail, setSelectedDetail] = useState<VendorDetail | null>(
    null,
  );
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [workingAction, setWorkingAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(
    overview ? null : "Vendor data is unavailable.",
  );
  const actionModal = useActionModal();

  const filteredVendors = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return vendors.filter((vendor) => {
      const matchesSearch =
        !normalized ||
        [
          vendor.businessName,
          vendor.contactName,
          vendor.phone,
          vendor.email,
          vendor.city,
          vendor.state,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalized));

      const matchesFilter =
        filter === "all" ||
        (filter === "active" && vendor.isActive) ||
        (filter === "inactive" && !vendor.isActive) ||
        (filter === "registration_drafts" && !vendor.onboardingCompleted) ||
        (filter === "pending_kyc" && vendor.verificationStatus === "pending") ||
        (filter === "approved_kyc" &&
          vendor.verificationStatus === "approved") ||
        (filter === "premium" && vendor.subscription.status === "active") ||
        (filter === "marketplace_live" &&
          vendor.marketplace.isPublic &&
          vendor.marketplace.profileStatus === "live");

      return matchesSearch && matchesFilter;
    });
  }, [filter, query, vendors]);

  async function openProfile(vendor: VendorRecord) {
    setSelectedVendor(vendor);
    setSelectedDetail(null);
    setLoadingDetail(true);
    setMessage(null);
    try {
      const detail = await requestJson(`/api/v1/admin/vendors/${vendor.id}`);
      setSelectedDetail(detail as VendorDetail);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load vendor profile.",
      );
    } finally {
      setLoadingDetail(false);
    }
  }

  async function runAction(
    vendor: VendorRecord,
    key: string,
    path: string,
    body: Record<string, unknown>,
  ) {
    setWorkingAction(`${vendor.id}:${key}`);
    setMessage(null);
    try {
      await requestJson(path, body);
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to update vendor.",
      );
    } finally {
      setWorkingAction(null);
    }
  }

  async function updateActivation(vendor: VendorRecord) {
    const nextActive = !vendor.isActive;
    if (!nextActive) {
      const confirmed = await actionModal.confirm({
        title: `Deactivate ${vendor.businessName}?`,
        description: "The vendor will no longer be active in admin-controlled workflows.",
        confirmLabel: "Deactivate vendor",
        variant: "danger",
      });
      if (!confirmed) return;
    }

    return runAction(
      vendor,
      "activation",
      `/api/v1/admin/vendors/${vendor.id}/activation`,
      {
        isActive: nextActive,
      },
    );
  }

  function updateKyc(
    vendor: VendorRecord,
    verificationStatus: VendorRecord["verificationStatus"],
  ) {
    return runAction(
      vendor,
      `kyc-${verificationStatus}`,
      `/api/v1/admin/vendors/${vendor.id}/kyc`,
      {
        verificationStatus,
      },
    );
  }

  async function updateResourceVerification(
    vendor: VendorRecord,
    resourceType: ResourceType,
    resourceId: number,
    verificationStatus: VendorRecord["verificationStatus"],
  ) {
    const key = `resource-${resourceType}-${resourceId}-${verificationStatus}`;
    setWorkingAction(`${vendor.id}:${key}`);
    setMessage(null);
    try {
      const detail = await requestJson(
        `/api/v1/admin/vendors/${vendor.id}/resources/${resourceType}/${resourceId}/verification`,
        { verificationStatus },
      );
      setSelectedDetail(detail as VendorDetail);
      setSelectedVendor((detail as VendorDetail).vendor);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to update resource.",
      );
    } finally {
      setWorkingAction(null);
    }
  }

  function updateMarketplace(vendor: VendorRecord, visible: boolean) {
    return runAction(
      vendor,
      visible ? "marketplace-live" : "marketplace-hide",
      `/api/v1/admin/vendors/${vendor.id}/marketplace`,
      {
        isPublic: visible,
        profileStatus: visible ? "live" : "hidden",
      },
    );
  }

  async function deleteVendor(vendor: VendorRecord) {
    const confirmed = await actionModal.confirm({
      title: `Delete ${vendor.businessName}?`,
      description:
        "This removes the vendor account, sessions, profile, and linked vendor records.",
      confirmLabel: "Delete vendor",
      variant: "danger",
    });

    if (!confirmed) return;

    setWorkingAction(`${vendor.id}:delete`);
    setMessage(null);
    try {
      await requestJson(
        `/api/v1/admin/vendors/${vendor.id}`,
        undefined,
        "DELETE",
      );
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to delete vendor.",
      );
    } finally {
      setWorkingAction(null);
    }
  }

  return (
    <main className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Vendor Management
            </Badge>
            <CardTitle className="text-3xl">Core vendor control desk</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7">
              View vendor profiles, account activation, KYC posture,
              subscription state, and marketplace visibility from one admin
              surface.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Vendor posture</CardTitle>
            <CardDescription>Latest admin snapshot.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Inactive</p>
              <p className="mt-1 text-2xl font-semibold">{summary.inactive}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Pending KYC</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.pendingKyc}
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Sub payments</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.pendingSubscriptionPayments}
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Hidden profiles</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.marketplaceHidden}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Total vendors"
          value={summary.total}
          note={`${summary.active} active accounts`}
          icon={Building2}
          tone="default"
        />
        <MetricCard
          label="Registration drafts"
          value={summary.registrationDrafts}
          note="OTP verified but onboarding not finished"
          icon={UserRoundCheck}
          tone={summary.registrationDrafts > 0 ? "warning" : "success"}
        />
        <MetricCard
          label="Pending KYC"
          value={summary.pendingKyc}
          note={`${summary.approvedKyc} approved, ${summary.rejectedKyc} rejected`}
          icon={ShieldAlert}
          tone={summary.pendingKyc > 0 ? "warning" : "success"}
        />
        <MetricCard
          label="Active subscriptions"
          value={summary.activeSubscriptions}
          note={`${summary.expiredSubscriptions} expired memberships`}
          icon={CreditCard}
          tone="success"
        />
        <MetricCard
          label="Marketplace live"
          value={summary.marketplaceLive}
          note={`${summary.marketplaceDraft} draft public profiles`}
          icon={Store}
          tone="default"
        />
      </section>

      <section>
        <Card className="border-border/70 bg-card/80">
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardDescription className="uppercase tracking-[0.2em] text-muted-foreground">
                  Vendors
                </CardDescription>
                <CardTitle className="mt-2 text-2xl">
                  Vendor profile registry
                </CardTitle>
              </div>
              <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
                {filteredVendors.length} shown
              </Badge>
            </div>

            <div className="grid gap-3 border-t border-border/70 pt-4 lg:grid-cols-[1fr_220px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="pl-9"
                  placeholder="Search business, owner, phone, city"
                />
              </div>
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <option value="all">All vendors</option>
                <option value="active">Active accounts</option>
                <option value="inactive">Inactive accounts</option>
                <option value="registration_drafts">Registration drafts</option>
                <option value="pending_kyc">Pending KYC</option>
                <option value="approved_kyc">Approved KYC</option>
                <option value="premium">Active subscription</option>
                <option value="marketplace_live">Marketplace live</option>
              </select>
            </div>
            {message ? (
              <p className="rounded-lg border border-border/70 bg-background/40 px-3 py-2 text-sm text-muted-foreground">
                {message}
              </p>
            ) : null}
          </CardHeader>

          <CardContent>
            <div className="overflow-hidden rounded-lg border border-border/70">
              <div className="hidden grid-cols-[1.35fr_0.75fr_0.8fr_0.8fr_0.8fr_1.35fr] gap-4 bg-background/30 px-5 py-4 text-[11px] uppercase tracking-[0.18em] text-muted-foreground xl:grid">
                <span>Vendor</span>
                <span>Account</span>
                <span>KYC</span>
                <span>Subscription</span>
                <span>Marketplace</span>
                <span>Actions</span>
              </div>

              {filteredVendors.map((vendor) => {
                const activationKey = `${vendor.id}:activation`;
                const deleteKey = `${vendor.id}:delete`;
                const marketplaceLive =
                  vendor.marketplace.isPublic &&
                  vendor.marketplace.profileStatus === "live";

                return (
                  <div
                    key={vendor.id}
                    className="grid gap-4 border-t border-border/70 px-5 py-4 xl:grid-cols-[1.35fr_0.75fr_0.8fr_0.8fr_0.8fr_1.35fr] xl:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {vendor.businessName}
                      </p>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {vendor.contactName ?? "Owner not set"} -{" "}
                        {vendor.phone ?? "No phone"}
                      </p>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {locationLabel(vendor)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:block xl:space-y-2">
                      {!vendor.onboardingCompleted ? (
                        <Badge variant="warning">registration draft</Badge>
                      ) : null}
                      <Badge variant={vendor.isActive ? "success" : "danger"}>
                        {vendor.isActive ? "active" : "inactive"}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        Seen {formatDate(vendor.lastSeenAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:block xl:space-y-2">
                      <Badge variant={statusTone(vendor.verificationStatus)}>
                        {vendor.verificationStatus}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {vendor.kyc.pendingDocuments} docs pending
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:block xl:space-y-2">
                      <Badge variant={statusTone(vendor.subscription.status)}>
                        {vendor.subscription.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {vendor.subscription.planName}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:block xl:space-y-2">
                      <Badge variant={statusTone(marketplaceLabel(vendor))}>
                        {marketplaceLabel(vendor)}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {vendor.marketplace.cabListings +
                          vendor.marketplace.serviceListings}{" "}
                        listings
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openProfile(vendor)}
                        title="View vendor profile"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        title="Manage vendor account"
                      >
                        <Link href={`/vendors/${vendor.id}`}>
                          <Settings className="h-4 w-4" />
                          Manage
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateActivation(vendor)}
                        disabled={workingAction === activationKey}
                        title={
                          vendor.isActive
                            ? "Deactivate vendor"
                            : "Activate vendor"
                        }
                      >
                        {vendor.isActive ? (
                          <UserRoundX className="h-4 w-4" />
                        ) : (
                          <UserRoundCheck className="h-4 w-4" />
                        )}
                        {vendor.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      {vendor.verificationStatus === "approved" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateKyc(vendor, "pending")}
                          disabled={
                            workingAction === `${vendor.id}:kyc-pending`
                          }
                          title="Move KYC to pending"
                        >
                          <ShieldAlert className="h-4 w-4" />
                          Pending
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => updateKyc(vendor, "approved")}
                          disabled={
                            workingAction === `${vendor.id}:kyc-approved`
                          }
                          title="Approve KYC"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          Approve
                        </Button>
                      )}
                      {vendor.verificationStatus !== "rejected" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateKyc(vendor, "rejected")}
                          disabled={
                            workingAction === `${vendor.id}:kyc-rejected`
                          }
                          title="Reject KYC"
                        >
                          <ShieldAlert className="h-4 w-4" />
                          Reject
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateMarketplace(vendor, !marketplaceLive)
                        }
                        disabled={
                          workingAction ===
                          `${vendor.id}:${
                            marketplaceLive
                              ? "marketplace-hide"
                              : "marketplace-live"
                          }`
                        }
                        title={
                          marketplaceLive
                            ? "Hide marketplace profile"
                            : "Publish marketplace profile"
                        }
                      >
                        {marketplaceLive ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        {marketplaceLive ? "Hide" : "Publish"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500/40 text-red-600 hover:bg-red-500/10 hover:text-red-700"
                        onClick={() => deleteVendor(vendor)}
                        disabled={workingAction === deleteKey}
                        title="Delete vendor"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}

              {!filteredVendors.length ? (
                <p className="border-t border-border/70 px-5 py-8 text-sm text-muted-foreground">
                  No vendors match the current filters.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>

      {selectedVendor ? (
        <VendorProfileModal
          vendor={selectedVendor}
          detail={selectedDetail}
          loading={loadingDetail}
          workingAction={workingAction}
          onClose={() => {
            setSelectedVendor(null);
            setSelectedDetail(null);
          }}
          onResourceVerification={updateResourceVerification}
        />
      ) : null}
      {actionModal.modal}
    </main>
  );
}
