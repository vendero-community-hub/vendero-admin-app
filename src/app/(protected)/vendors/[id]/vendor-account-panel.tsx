"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Car,
  CheckCircle2,
  Clipboard,
  Database,
  ExternalLink,
  FileText,
  Globe2,
  ImageIcon,
  Link as LinkIcon,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users,
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

type VendorRecord = {
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

type DomainRecord = {
  type: string;
  name: string;
  value: string;
  values?: string[];
};

type CustomDomain = {
  id: number;
  hostname: string;
  status: "pending_dns" | "pending_ssl" | "active" | "disabled";
  provider: string;
  providerVerified: boolean;
  sslStatus: {
    ready: boolean;
    status: "ready" | "pending";
    validFrom?: string | null;
    validTo?: string | null;
    error?: string | null;
  };
  url: string;
  publicLinkToken: string | null;
  publicLinkTokenId: number;
  canonicalStoreLinkUrl: string | null;
  verificationRecord: DomainRecord | null;
  dnsRecord: DomainRecord | null;
  connectedAt: string | null;
  verifiedAt: string | null;
  lastCheckedAt: string | null;
};

type VendorAsset = {
  label: string;
  url: string;
  source: string;
  kind: "image" | "document";
  metadata?: Record<string, unknown>;
};

type SharedLink = {
  id: number;
  publicToken: string;
  linkType: string;
  linkTag: string | null;
  scope: string | null;
  targetUrl: string | null;
  status: string;
  accessCount: number;
  submittedCount: number;
  convertedCount: number;
  lastAccessedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string | null;
};

export type VendorAccountDetail = {
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
  customDomains: CustomDomain[];
  sharedLinks: SharedLink[];
  assets: VendorAsset[];
  marketplace: {
    cabListings: Array<{
      id: number;
      title: string | null;
      companyName: string | null;
      listingStatus: string;
      isActive: boolean;
      createdAt: string | null;
      updatedAt: string | null;
    }>;
    serviceListings: Array<{
      id: number;
      title: string | null;
      companyName: string | null;
      tripType: string;
      listingStatus: string;
      isActive: boolean;
      createdAt: string | null;
      updatedAt: string | null;
    }>;
  };
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
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function locationLabel(vendor: VendorRecord) {
  return (
    [vendor.city, vendor.state].filter(Boolean).join(", ") || "Location not set"
  );
}

function statusTone(status: string): BadgeTone {
  if (["active", "approved", "verified", "live", "ready"].includes(status)) {
    return "success";
  }
  if (["rejected", "failed", "expired", "hidden", "disabled"].includes(status)) {
    return "danger";
  }
  if (
    [
      "pending",
      "pending_dns",
      "pending_ssl",
      "pending_verification",
      "draft",
      "inactive",
    ].includes(status)
  ) {
    return "warning";
  }
  return "secondary";
}

function domainStatusLabel(domain: CustomDomain) {
  if (domain.status === "active") return "Active";
  if (domain.status === "pending_ssl") return "Generating SSL certificate";
  if (domain.status === "pending_dns") return "Waiting for DNS verification";
  return domain.status;
}

function recordValues(record: DomainRecord) {
  const values = record.values?.length ? record.values : [record.value];
  return values.map((value) => String(value ?? "").trim()).filter(Boolean);
}

function recordCopyText(record: DomainRecord) {
  return [
    `Type: ${record.type}`,
    `Name: ${record.name}`,
    ...recordValues(record).map((value, index) =>
      recordValues(record).length > 1 ? `Value ${index + 1}: ${value}` : `Value: ${value}`,
    ),
  ].join("\n");
}

function domainCopyText(domain: CustomDomain) {
  return [
    domain.verificationRecord
      ? `Verify ownership TXT\n${recordCopyText(domain.verificationRecord)}`
      : null,
    domain.dnsRecord ? `Point domain A/CNAME\n${recordCopyText(domain.dnsRecord)}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function CountCard({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: number;
  note: string;
  icon: typeof Database;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold">{value}</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{note}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-secondary/60 p-2">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
    </div>
  );
}

function RecordBlock({
  title,
  record,
  onCopy,
}: {
  title: string;
  record: DomainRecord | null;
  onCopy: (label: string, value: string) => void;
}) {
  if (!record) {
    return (
      <div className="rounded-lg border border-border/70 bg-background/30 p-4 text-sm text-muted-foreground">
        {title} record is not available yet. Check status after the domain is added in Vercel.
      </div>
    );
  }

  const values = recordValues(record);

  return (
    <div className="rounded-lg border border-border/70 bg-background/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onCopy(`${title} record`, recordCopyText(record))}
        >
          <Clipboard className="h-4 w-4" />
          Copy record
        </Button>
      </div>

      <div className="mt-4 grid gap-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default">{record.type}</Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCopy("record name", record.name)}
          >
            <Clipboard className="h-4 w-4" />
            Copy name
          </Button>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Name
          </p>
          <p className="mt-1 break-all font-medium">{record.name}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {values.length > 1 ? "Values" : "Value"}
          </p>
          <div className="mt-2 space-y-2">
            {values.map((value, index) => (
              <div
                key={`${record.name}-${value}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/70 bg-card/60 px-3 py-2"
              >
                <span className="break-all font-medium">
                  {values.length > 1 ? `Value ${index + 1}: ` : null}
                  {value}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCopy("record value", value)}
                >
                  <Clipboard className="h-4 w-4" />
                  Copy value
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomDomainCard({
  domain,
  working,
  onCopy,
  onVerify,
  onRemove,
}: {
  domain: CustomDomain;
  working: string | null;
  onCopy: (label: string, value: string) => void;
  onVerify: (domain: CustomDomain) => void;
  onRemove: (domain: CustomDomain) => void;
}) {
  const verifying = working === `verify:${domain.id}`;
  const removing = working === `remove:${domain.id}`;

  return (
    <div className="rounded-lg border border-border/70 bg-background/30 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Globe2 className="h-4 w-4 text-primary" />
            <p className="break-all font-semibold">{domain.hostname}</p>
            <Badge variant={statusTone(domain.status)}>
              {domainStatusLabel(domain)}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            SSL {domain.sslStatus.ready ? "ready" : "pending"} - Last checked{" "}
            {formatDate(domain.lastCheckedAt)}
          </p>
          {domain.publicLinkToken ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Store token {domain.publicLinkToken}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCopy("all DNS records", domainCopyText(domain))}
            disabled={!domain.verificationRecord && !domain.dnsRecord}
          >
            <Clipboard className="h-4 w-4" />
            Copy all
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href={domain.url} rel="noreferrer" target="_blank">
              <ExternalLink className="h-4 w-4" />
              Open
            </a>
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <RecordBlock
          title="Verify ownership TXT"
          record={domain.verificationRecord}
          onCopy={onCopy}
        />
        <RecordBlock
          title="Point domain A/CNAME"
          record={domain.dnsRecord}
          onCopy={onCopy}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => onVerify(domain)} disabled={verifying}>
          <RefreshCw className="h-4 w-4" />
          Check status
        </Button>
        <Button
          variant="outline"
          onClick={() => onRemove(domain)}
          disabled={removing}
          className="border-red-500/40 text-red-600 hover:bg-red-500/10 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
          Remove
        </Button>
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-sm text-muted-foreground">{label}</p>;
}

export function VendorAccountPanel({
  initialDetail,
}: {
  initialDetail: VendorAccountDetail;
}) {
  const [detail, setDetail] = useState(initialDetail);
  const [hostname, setHostname] = useState("");
  const [working, setWorking] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const actionModal = useActionModal();

  const vendor = detail.vendor;
  const inventory = useMemo(
    () => [
      {
        label: "Documents",
        value: detail.documents.length,
        note: `${vendor.kyc.pendingDocuments} pending KYC documents`,
        icon: FileText,
      },
      {
        label: "Assets",
        value: detail.assets.length,
        note: "Images and document URLs collected for this vendor",
        icon: ImageIcon,
      },
      {
        label: "Cabs",
        value: detail.cabs.length,
        note: `${detail.marketplace.cabListings.length} marketplace cab listings`,
        icon: Car,
      },
      {
        label: "Drivers",
        value: detail.drivers.length,
        note: "Driver profiles and verification data",
        icon: Users,
      },
      {
        label: "Links",
        value: detail.sharedLinks.length,
        note: `${detail.customDomains.length} custom domains connected`,
        icon: LinkIcon,
      },
      {
        label: "Trips",
        value: detail.recentTrips.length,
        note: `${vendor.operations.activeTrips} active and ${vendor.operations.acceptedTrips} accepted`,
        icon: Database,
      },
    ],
    [detail, vendor],
  );

  async function refreshDetail() {
    const nextDetail = (await requestJson(
      `/api/v1/admin/vendors/${vendor.id}`,
    )) as VendorAccountDetail;
    setDetail(nextDetail);
    return nextDetail;
  }

  async function copyText(label: string, value: string) {
    if (!value.trim()) return;
    try {
      await navigator.clipboard.writeText(value);
      setMessage(`Copied ${label}.`);
    } catch {
      setMessage(`Unable to copy ${label}.`);
    }
  }

  async function connectDomain() {
    const normalized = hostname.trim();
    if (!normalized) {
      setMessage("Enter a domain name first.");
      return;
    }

    setWorking("connect");
    setMessage(null);
    try {
      await requestJson(`/api/v1/admin/vendors/${vendor.id}/custom-domains`, {
        hostname: normalized,
      });
      setHostname("");
      await refreshDetail();
      setMessage("Domain connected. Add the DNS records, then check status.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to connect domain.",
      );
    } finally {
      setWorking(null);
    }
  }

  async function verifyDomain(domain: CustomDomain) {
    setWorking(`verify:${domain.id}`);
    setMessage(null);
    try {
      await requestJson(
        `/api/v1/admin/vendors/${vendor.id}/custom-domains/${domain.id}/verify`,
        {},
      );
      await refreshDetail();
      setMessage("Domain status refreshed from Vercel.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to verify domain.",
      );
    } finally {
      setWorking(null);
    }
  }

  async function removeDomain(domain: CustomDomain) {
    const confirmed = await actionModal.confirm({
      title: `Remove ${domain.hostname}?`,
      description:
        "This disconnects the custom domain from the vendor account. DNS records at the registrar are not changed.",
      confirmLabel: "Remove domain",
      variant: "danger",
    });
    if (!confirmed) return;

    setWorking(`remove:${domain.id}`);
    setMessage(null);
    try {
      await requestJson(
        `/api/v1/admin/vendors/${vendor.id}/custom-domains/${domain.id}`,
        undefined,
        "DELETE",
      );
      await refreshDetail();
      setMessage("Custom domain removed from this vendor.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to remove domain.",
      );
    } finally {
      setWorking(null);
    }
  }

  return (
    <main className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline">
          <Link href="/vendors">
            <ArrowLeft className="h-4 w-4" />
            Back to vendors
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <Badge variant={vendor.isActive ? "success" : "danger"}>
            {vendor.isActive ? "active" : "inactive"}
          </Badge>
          <Badge variant={statusTone(vendor.verificationStatus)}>
            KYC {vendor.verificationStatus}
          </Badge>
          <Badge variant={statusTone(vendor.subscription.status)}>
            {vendor.subscription.status}
          </Badge>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Vendor Account
            </Badge>
            <CardTitle className="text-3xl">{vendor.businessName}</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7">
              Manage this vendor account, connected custom domains, saved data,
              marketplace inventory, uploaded assets, and recent operational
              activity.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Account contact</CardTitle>
            <CardDescription>{locationLabel(vendor)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Owner: {vendor.contactName ?? "Owner not set"}</p>
            <p>Phone: {vendor.phone ?? "No phone"}</p>
            <p>Email: {vendor.email ?? "No email"}</p>
            <p>Last seen: {formatDate(vendor.lastSeenAt)}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {inventory.map((item) => (
          <CountCard
            key={item.label}
            label={item.label}
            value={item.value}
            note={item.note}
            icon={item.icon}
          />
        ))}
      </section>

      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Custom domains</CardTitle>
              <CardDescription>
                Add a domain in Vercel for this vendor, show DNS records, and
                verify the connection after records are added.
              </CardDescription>
            </div>
            <Badge variant="outline">{detail.customDomains.length} domains</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <Input
              value={hostname}
              onChange={(event) => setHostname(event.target.value)}
              placeholder="book.yourdomain.com or yourdomain.com"
            />
            <Button onClick={connectDomain} disabled={working === "connect"}>
              <Globe2 className="h-4 w-4" />
              Connect domain
            </Button>
          </div>

          {message ? (
            <p className="rounded-lg border border-border/70 bg-background/30 px-3 py-2 text-sm text-muted-foreground">
              {message}
            </p>
          ) : null}

          <div className="space-y-4">
            {detail.customDomains.map((domain) => (
              <CustomDomainCard
                key={domain.id}
                domain={domain}
                working={working}
                onCopy={copyText}
                onVerify={verifyDomain}
                onRemove={removeDomain}
              />
            ))}
            {!detail.customDomains.length ? (
              <EmptyState label="No custom domains are connected for this vendor yet." />
            ) : null}
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Vendor data</CardTitle>
            <CardDescription>
              Stored operational records for this vendor account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="font-semibold">Documents</p>
              <div className="mt-3 space-y-2">
                {detail.documents.map((document) => (
                  <div
                    key={document.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/30 px-3 py-2 text-sm"
                  >
                    <span>{document.documentType}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusTone(document.status)}>
                        {document.status}
                      </Badge>
                      {document.fileUrl ? (
                        <Button size="sm" variant="outline" asChild>
                          <a href={document.fileUrl} rel="noreferrer" target="_blank">
                            <ExternalLink className="h-4 w-4" />
                            Open
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
                {!detail.documents.length ? (
                  <EmptyState label="No KYC documents uploaded." />
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="font-semibold">Cabs</p>
                <div className="mt-3 space-y-2">
                  {detail.cabs.map((cab) => (
                    <div
                      key={cab.id}
                      className="rounded-lg border border-border/70 bg-background/30 px-3 py-2 text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">
                          {cab.cabNumber ?? cab.modelName ?? "Cab"}
                        </p>
                        <Badge variant={statusTone(cab.verificationStatus)}>
                          {cab.verificationStatus}
                        </Badge>
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        {[cab.categoryName, cab.modelName, cab.color]
                          .filter(Boolean)
                          .join(" - ") || "Cab detail not set"}
                      </p>
                    </div>
                  ))}
                  {!detail.cabs.length ? <EmptyState label="No cabs added." /> : null}
                </div>
              </div>

              <div>
                <p className="font-semibold">Drivers</p>
                <div className="mt-3 space-y-2">
                  {detail.drivers.map((driver) => (
                    <div
                      key={driver.id}
                      className="rounded-lg border border-border/70 bg-background/30 px-3 py-2 text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">
                          {driver.fullName ?? "Driver"}
                        </p>
                        <Badge variant={statusTone(driver.verificationStatus)}>
                          {driver.verificationStatus}
                        </Badge>
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        {[driver.phone, driver.licenseNumber ? `DL ${driver.licenseNumber}` : null]
                          .filter(Boolean)
                          .join(" - ") || "Driver detail not set"}
                      </p>
                    </div>
                  ))}
                  {!detail.drivers.length ? (
                    <EmptyState label="No drivers added." />
                  ) : null}
                </div>
              </div>
            </div>

            <div>
              <p className="font-semibold">Recent trips</p>
              <div className="mt-3 space-y-2">
                {detail.recentTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="grid gap-2 rounded-lg border border-border/70 bg-background/30 px-3 py-2 text-sm md:grid-cols-[0.5fr_0.7fr_1fr_0.9fr]"
                  >
                    <span>#{trip.id}</span>
                    <Badge variant={statusTone(trip.status)} className="w-fit">
                      {trip.status}
                    </Badge>
                    <span className="text-muted-foreground">{trip.tripType}</span>
                    <span className="text-muted-foreground">
                      {formatDate(trip.pickupDatetime)}
                    </span>
                  </div>
                ))}
                {!detail.recentTrips.length ? (
                  <EmptyState label="No recent trips found." />
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle>Assets</CardTitle>
              <CardDescription>
                Images and documents attached to the vendor account, resources,
                and marketplace listings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[520px] space-y-2 overflow-auto pr-1">
                {detail.assets.map((item, index) => (
                  <div
                    key={`${item.source}-${item.url}-${index}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/30 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.label}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {item.source} - {item.kind}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <a href={item.url} rel="noreferrer" target="_blank">
                        <ExternalLink className="h-4 w-4" />
                        Open
                      </a>
                    </Button>
                  </div>
                ))}
                {!detail.assets.length ? (
                  <EmptyState label="No uploaded assets found." />
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle>Shared links</CardTitle>
              <CardDescription>Store, lead, tracking, and trip links.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {detail.sharedLinks.map((link) => (
                  <div
                    key={link.id}
                    className="rounded-lg border border-border/70 bg-background/30 px-3 py-2 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">
                        {link.linkTag ?? link.linkType} - {link.publicToken}
                      </p>
                      <Badge variant={statusTone(link.status)}>{link.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {link.accessCount} views - {link.submittedCount} submissions -
                      created {formatDate(link.createdAt)}
                    </p>
                  </div>
                ))}
                {!detail.sharedLinks.length ? (
                  <EmptyState label="No public links created yet." />
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle>Activity</CardTitle>
              <CardDescription>Sessions, subscription history, and feature usage.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="font-semibold">Device sessions</p>
                <div className="mt-2 space-y-2">
                  {detail.deviceSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/30 px-3 py-2"
                    >
                      <span>{session.deviceLabel ?? session.platform ?? "Device"}</span>
                      <Badge variant={session.revokedAt ? "danger" : "success"}>
                        {session.revokedAt ? "revoked" : "active"}
                      </Badge>
                    </div>
                  ))}
                  {!detail.deviceSessions.length ? (
                    <EmptyState label="No device sessions found." />
                  ) : null}
                </div>
              </div>

              <div>
                <p className="font-semibold">Feature usage</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-border/70 bg-background/30 p-3">
                    <p className="text-muted-foreground">Used</p>
                    <p className="mt-1 font-semibold">
                      {detail.featureUsage.summary.usedFeatureCount}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-background/30 p-3">
                    <p className="text-muted-foreground">Events</p>
                    <p className="mt-1 font-semibold">
                      {detail.featureUsage.summary.eventCount}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-background/30 p-3">
                    <p className="text-muted-foreground">Last use</p>
                    <p className="mt-1 font-semibold">
                      {formatDate(detail.featureUsage.summary.lastUsedAt)}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="font-semibold">Subscription history</p>
                <div className="mt-2 space-y-2">
                  {detail.subscriptionHistory.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-border/70 bg-background/30 px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        <span>{item.action}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(item.createdAt)}
                      </p>
                    </div>
                  ))}
                  {!detail.subscriptionHistory.length ? (
                    <EmptyState label="No subscription history found." />
                  ) : null}
                </div>
              </div>

              {vendor.isVerified ? (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  Vendor KYC is approved.
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>
      {actionModal.modal}
    </main>
  );
}
