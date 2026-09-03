"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Database,
  Loader2,
  LogOut,
  MessageSquareText,
  Phone,
  Search,
  ShieldAlert,
  Trash2,
  XCircle,
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
  "default" | "secondary" | "outline" | "success" | "warning" | "danger";

type WhatsPilotPhoneNumber = {
  phoneNumberId: string;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  isPrimary: boolean;
  status?: string | null;
};

type WhatsPilotAccountSummary = {
  id: number | string;
  publicId?: string | null;
  accountPublicId?: string | null;
  lifecycleState?: string | null;
  lifecycleStatus?: string | null;
  generation?: number | null;
  status: string;
  businessName: string | null;
  wabaId: string;
  connectedAt: string | null;
  disconnectedAt: string | null;
  lastSyncedAt: string | null;
  metaUnsubscribed: boolean;
  requiresMetaAction?: boolean;
  phoneNumbers?: WhatsPilotPhoneNumber[];
};

type WhatsPilotVendorIdentity = {
  vendorProfileId: number;
  businessName: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  userActive: boolean;
};

export type WhatsPilotAccountSearchResult = WhatsPilotVendorIdentity & {
  account: WhatsPilotAccountSummary | null;
  hasWhatsPilotData: boolean;
};

export type WhatsPilotAccountOperationDetail = {
  vendor: WhatsPilotVendorIdentity;
  account: WhatsPilotAccountSummary | null;
  counts: Record<string, number>;
  hasWhatsPilotData: boolean;
  canDisconnect: boolean;
  canVerifyMetaCleanup: boolean;
  canDelete?: boolean;
  deleteBlockedReason?: string | null;
  // Kept optional while older account-operation responses are being rolled out.
  canPurge?: boolean;
  purgeBlockedReason?: string | null;
  retainedData: string[];
};

type OperationResponse = {
  operation?: string;
  status?: WhatsPilotAccountOperationDetail;
  result?: {
    metaUnsubscribed?: boolean;
    requiresMetaAction?: boolean;
    lifecycleState?: string;
    accountPublicId?: string;
  };
};

const DEFAULT_RETAINED_DATA = [
  "WhatsPilot conversations, messages, contacts, and configuration in the read-only admin archive",
  "Admin audit records",
  "Billing and usage records required for reconciliation",
  "Canonical leads and other business records created outside WhatsPilot",
  "Data held by Meta in WhatsApp Manager",
];

function adminToken() {
  return document.cookie
    .split("; ")
    .find((part) => part.startsWith("vendero_admin_access_token="))
    ?.split("=")[1];
}

async function apiRequest(path: string, init?: RequestInit) {
  const token = adminToken();
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      payload?.error?.message ?? payload?.message ?? "Request failed",
    );
  }
  return (payload?.data?.data ?? payload?.data ?? payload) as unknown;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusTone(status: string | null | undefined): BadgeTone {
  if (status === "connected") return "success";
  if (status === "disconnected") return "secondary";
  if (status === "active") return "success";
  if (status === "frozen") return "warning";
  if (status === "deleted") return "danger";
  if (status === "action_required") return "danger";
  if (status === "pending") return "warning";
  return "outline";
}

function statusLabel(status: string | null | undefined) {
  if (!status) return "Not connected";
  return status.replaceAll("_", " ");
}

function countLabel(key: string) {
  const value = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .trim();
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : "Records";
}

function searchRows(value: unknown) {
  if (Array.isArray(value)) return value as WhatsPilotAccountSearchResult[];
  if (!value || typeof value !== "object") return [];
  const source = value as Record<string, unknown>;
  for (const key of ["results", "accounts", "vendors"]) {
    if (Array.isArray(source[key])) {
      return source[key] as WhatsPilotAccountSearchResult[];
    }
  }
  return [];
}

function operationResponse(value: unknown) {
  return (value && typeof value === "object" ? value : {}) as OperationResponse;
}

function SearchResultCard({
  item,
  selected,
  loading,
  onOpen,
}: {
  item: WhatsPilotAccountSearchResult;
  selected: boolean;
  loading: boolean;
  onOpen: (item: WhatsPilotAccountSearchResult) => void;
}) {
  return (
    <div
      className={`grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center ${
        selected ? "bg-primary/5" : ""
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium">{item.businessName}</p>
          <Badge variant={statusTone(item.account?.status)}>
            {statusLabel(item.account?.status)}
          </Badge>
          {item.account?.lifecycleState || item.account?.lifecycleStatus ? (
            <Badge
              variant={statusTone(
                item.account.lifecycleState ?? item.account.lifecycleStatus,
              )}
            >
              {statusLabel(
                item.account.lifecycleState ?? item.account.lifecycleStatus,
              )}
            </Badge>
          ) : null}
          {item.hasWhatsPilotData ? (
            <Badge variant="outline">Saved data</Badge>
          ) : null}
          {!item.userActive ? (
            <Badge variant="danger">Vendor inactive</Badge>
          ) : null}
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          Vendor #{item.vendorProfileId} ·{" "}
          {item.contactName || "No contact name"}
          {item.city ? ` · ${item.city}` : ""}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {item.phone || item.email || "No contact details"}
        </p>
      </div>
      <Button
        size="sm"
        variant={selected ? "secondary" : "outline"}
        disabled={loading}
        onClick={() => onOpen(item)}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {selected ? "Refresh details" : "View operations"}
      </Button>
    </div>
  );
}

export function WhatsPilotAccountOperationsPanel() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WhatsPilotAccountSearchResult[]>([]);
  const [selected, setSelected] =
    useState<WhatsPilotAccountOperationDetail | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const actionModal = useActionModal();

  const countEntries = useMemo(
    () =>
      Object.entries(selected?.counts ?? {})
        .filter(([, value]) => Number.isFinite(value))
        .sort((left, right) => right[1] - left[1]),
    [selected?.counts],
  );
  const totalRecords = useMemo(
    () => countEntries.reduce((sum, [, value]) => sum + Number(value), 0),
    [countEntries],
  );

  function updateSearchResult(detail: WhatsPilotAccountOperationDetail) {
    setResults((current) =>
      current.map((item) =>
        item.vendorProfileId === detail.vendor.vendorProfileId
          ? {
              ...item,
              ...detail.vendor,
              account: detail.account,
              hasWhatsPilotData: detail.hasWhatsPilotData,
            }
          : item,
      ),
    );
  }

  async function loadDetail(vendorProfileId: number) {
    const detail = (await apiRequest(
      `/api/v1/admin/whatsapp-pilot/account-operations/${vendorProfileId}`,
    )) as WhatsPilotAccountOperationDetail;
    setSelected(detail);
    updateSearchResult(detail);
    return detail;
  }

  async function searchVendors() {
    const normalized = query.trim();
    if (normalized.length < 2) {
      setError("Enter at least two characters to search vendors.");
      return;
    }

    setWorking("search");
    setError(null);
    setMessage(null);
    try {
      const data = await apiRequest(
        "/api/v1/admin/whatsapp-pilot/account-operations/search",
        {
          method: "POST",
          body: JSON.stringify({ query: normalized }),
        },
      );
      const nextResults = searchRows(data);
      setResults(nextResults);
      setSelected(null);
      if (!nextResults.length) {
        setMessage("No vendors matched this search.");
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Vendor search failed.",
      );
    } finally {
      setWorking(null);
    }
  }

  async function openAccount(item: WhatsPilotAccountSearchResult) {
    setWorking(`detail-${item.vendorProfileId}`);
    setError(null);
    setMessage(null);
    try {
      await loadDetail(item.vendorProfileId);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "WhatsPilot account details are unavailable.",
      );
    } finally {
      setWorking(null);
    }
  }

  async function disconnectAccount() {
    if (!selected) return;
    const vendorProfileId = selected.vendor.vendorProfileId;
    const phrase = `DISCONNECT ${vendorProfileId}`;
    const confirmation = await actionModal.form({
      title: `Disconnect WhatsPilot for ${selected.vendor.businessName}?`,
      description:
        "This removes Vendero's Meta webhook subscription, revokes the saved credential, stops automatic replies, and archives open WhatsPilot conversations. It does not delete the customer's WhatsApp Business Account or saved WhatsPilot data.",
      confirmLabel: "Disconnect from Vendero",
      variant: "danger",
      fields: [
        {
          name: "reason",
          label: "Reason (optional)",
          type: "textarea",
          placeholder: "Why is this account being disconnected?",
        },
        {
          name: "confirmation",
          label: `Type ${phrase} to continue`,
          placeholder: phrase,
          required: true,
          description: "The phrase must match exactly.",
        },
      ],
    });
    if (!confirmation.confirmed) return;
    if (confirmation.values.confirmation?.trim() !== phrase) {
      setError(`Confirmation did not match. Type ${phrase} exactly.`);
      return;
    }

    setWorking("disconnect");
    setError(null);
    setMessage(null);
    try {
      const data = operationResponse(
        await apiRequest(
          `/api/v1/admin/whatsapp-pilot/account-operations/${vendorProfileId}/disconnect`,
          {
            method: "POST",
            body: JSON.stringify({
              confirmation: phrase,
              ...(confirmation.values.reason?.trim()
                ? { reason: confirmation.values.reason.trim() }
                : {}),
            }),
          },
        ),
      );
      const next = data.status ?? (await loadDetail(vendorProfileId));
      setSelected(next);
      updateSearchResult(next);
      const requiresMetaAction =
        data.result?.requiresMetaAction ?? next.account?.requiresMetaAction;
      setMessage(
        requiresMetaAction
          ? "Disconnected locally. Meta still requires manual action before the generation can be archived."
          : "WhatsPilot was disconnected from Vendero. Saved data has not been deleted.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to disconnect this WhatsPilot account.",
      );
    } finally {
      setWorking(null);
    }
  }

  async function archiveAccountGeneration() {
    if (!selected?.account) return;
    const vendorProfileId = selected.vendor.vendorProfileId;
    const accountPublicId = String(
      selected.account.publicId ??
        selected.account.accountPublicId ??
        selected.account.id,
    );
    const phrase = `ARCHIVE ${accountPublicId}`;
    const confirmation = await actionModal.form({
      title: `Delete and archive WhatsPilot for ${selected.vendor.businessName}?`,
      description:
        "This freezes the current account generation, disconnects it, and moves its WhatsPilot history into the read-only admin archive. Operational records are retained and this generation can never reconnect or be restored.",
      confirmLabel: "Delete and archive account",
      variant: "danger",
      fields: [
        {
          name: "reason",
          label: "Archive reason",
          type: "textarea",
          placeholder: "Record the customer request or operational reason.",
          required: true,
        },
        {
          name: "confirmation",
          label: `Type ${phrase} to continue`,
          placeholder: phrase,
          required: true,
          description: "The phrase must match exactly.",
        },
        {
          name: "acknowledge",
          label:
            "I understand this account generation cannot be restored and its operational history remains in the admin archive.",
          type: "checkbox",
          defaultValue: false,
        },
      ],
    });
    if (!confirmation.confirmed) return;
    if (confirmation.values.confirmation?.trim() !== phrase) {
      setError(`Confirmation did not match. Type ${phrase} exactly.`);
      return;
    }
    if (!confirmation.values.reason?.trim()) {
      setError("An archive reason is required.");
      return;
    }
    if (confirmation.values.acknowledge !== "true") {
      setError("Confirm that you understand the archive retention policy.");
      return;
    }

    setWorking("archive");
    setError(null);
    setMessage(null);
    try {
      const data = operationResponse(
        await apiRequest(
          `/api/v1/admin/whatsapp-pilot/account-operations/${encodeURIComponent(accountPublicId)}/delete`,
          {
            method: "POST",
            body: JSON.stringify({
              confirmation: phrase,
              reason: confirmation.values.reason.trim(),
              acknowledgeRetention: true,
              source: "admin_direct",
            }),
          },
        ),
      );
      if (data.status) {
        setSelected(data.status);
        updateSearchResult(data.status);
      } else {
        try {
          await loadDetail(vendorProfileId);
        } catch {
          setSelected(null);
        }
      }
      setMessage(
        "The WhatsPilot account generation is being archived. Its operational history remains available only in Deleted Accounts.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to archive this vendor's WhatsPilot account.",
      );
    } finally {
      setWorking(null);
    }
  }

  async function verifyManualMetaCleanup() {
    if (!selected) return;
    const vendorProfileId = selected.vendor.vendorProfileId;
    const phrase = `VERIFY META CLEANUP ${vendorProfileId}`;
    const confirmation = await actionModal.form({
      title: `Verify manual Meta cleanup for ${selected.vendor.businessName}?`,
      description:
        "Use this only after an administrator has removed Vendero's webhook subscription for this WhatsApp Business Account in Meta. This is an audited manual attestation; Vendero cannot verify it with the revoked credential.",
      confirmLabel: "Record Meta cleanup",
      variant: "danger",
      fields: [
        {
          name: "reason",
          label: "Verification notes",
          type: "textarea",
          placeholder: "Where and when was the Meta subscription removed?",
          required: true,
        },
        {
          name: "confirmation",
          label: `Type ${phrase} to continue`,
          placeholder: phrase,
          required: true,
          description: "The phrase must match exactly.",
        },
        {
          name: "acknowledge",
          label:
            "I verified in Meta that Vendero is no longer subscribed to this WhatsApp Business Account.",
          type: "checkbox",
          defaultValue: false,
        },
      ],
    });
    if (!confirmation.confirmed) return;
    if (confirmation.values.confirmation?.trim() !== phrase) {
      setError(`Confirmation did not match. Type ${phrase} exactly.`);
      return;
    }
    if (!confirmation.values.reason?.trim()) {
      setError("Verification notes are required.");
      return;
    }
    if (confirmation.values.acknowledge !== "true") {
      setError("Confirm that you verified the cleanup directly in Meta.");
      return;
    }

    setWorking("meta-cleanup");
    setError(null);
    setMessage(null);
    try {
      const data = operationResponse(
        await apiRequest(
          `/api/v1/admin/whatsapp-pilot/account-operations/${vendorProfileId}/meta-cleanup-verified`,
          {
            method: "POST",
            body: JSON.stringify({
              confirmation: phrase,
              reason: confirmation.values.reason.trim(),
              acknowledge: true,
            }),
          },
        ),
      );
      const next = data.status ?? (await loadDetail(vendorProfileId));
      setSelected(next);
      updateSearchResult(next);
      setMessage(
        "Manual Meta cleanup was recorded. Account archival can now continue.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to record the manual Meta cleanup.",
      );
    } finally {
      setWorking(null);
    }
  }

  return (
    <>
      <section className="space-y-2 pt-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-2.5 text-amber-600">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              WhatsPilot account operations
            </h2>
            <p className="text-sm text-muted-foreground">
              Disconnect a vendor or retire one account generation into the
              read-only admin archive.
            </p>
          </div>
        </div>
      </section>

      {error ? (
        <div className="flex gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-600">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="flex gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-600">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {message}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Find a vendor account</CardTitle>
          <CardDescription>
            Search by vendor ID, business name, contact, phone, or email. No
            operation starts until you review the exact account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void searchVendors();
                }}
                className="pl-9"
                placeholder="Search vendors…"
              />
            </div>
            <Button
              variant="outline"
              disabled={working === "search"}
              onClick={() => void searchVendors()}
            >
              {working === "search" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search
            </Button>
          </div>

          {results.length ? (
            <div className="divide-y overflow-hidden rounded-xl border">
              {results.map((item) => (
                <SearchResultCard
                  key={item.vendorProfileId}
                  item={item}
                  selected={
                    selected?.vendor.vendorProfileId === item.vendorProfileId
                  }
                  loading={working === `detail-${item.vendorProfileId}`}
                  onOpen={(record) => void openAccount(record)}
                />
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {selected ? (
        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{selected.vendor.businessName}</CardTitle>
                    <CardDescription>
                      Vendor #{selected.vendor.vendorProfileId} ·{" "}
                      {selected.vendor.contactName || "No contact name"}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={
                        selected.vendor.userActive ? "success" : "danger"
                      }
                    >
                      {selected.vendor.userActive
                        ? "Vendor active"
                        : "Vendor inactive"}
                    </Badge>
                    <Badge variant={statusTone(selected.account?.status)}>
                      {statusLabel(selected.account?.status)}
                    </Badge>
                    {selected.account?.lifecycleState ||
                    selected.account?.lifecycleStatus ? (
                      <Badge
                        variant={statusTone(
                          selected.account.lifecycleState ??
                            selected.account.lifecycleStatus,
                        )}
                      >
                        {statusLabel(
                          selected.account.lifecycleState ??
                            selected.account.lifecycleStatus,
                        )}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
                <div className="rounded-xl border bg-muted/20 p-4">
                  <div className="flex items-center gap-2 font-medium">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    Vendor contact
                  </div>
                  <p className="mt-3 text-muted-foreground">
                    {selected.vendor.phone || "No phone"}
                  </p>
                  <p className="mt-1 break-all text-muted-foreground">
                    {selected.vendor.email || "No email"}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {selected.vendor.city || "No city"}
                  </p>
                </div>
                <div className="rounded-xl border bg-muted/20 p-4">
                  <div className="flex items-center gap-2 font-medium">
                    <MessageSquareText className="h-4 w-4 text-muted-foreground" />
                    WhatsApp Business account
                  </div>
                  {selected.account ? (
                    <>
                      <p className="mt-3">
                        {selected.account.businessName ||
                          "Business name not set"}
                      </p>
                      <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                        WABA {selected.account.wabaId}
                      </p>
                      <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                        Account {selected.account.publicId ?? selected.account.accountPublicId ?? selected.account.id}
                        {selected.account.generation
                          ? ` · Generation ${selected.account.generation}`
                          : ""}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Last synced {formatDate(selected.account.lastSyncedAt)}
                      </p>
                    </>
                  ) : (
                    <p className="mt-3 text-muted-foreground">
                      No saved WhatsApp account connection.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>Connected phone numbers</CardTitle>
                    <CardDescription>
                      Phone records saved under this WhatsPilot account.
                    </CardDescription>
                  </div>
                  <Phone className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                {selected.account?.phoneNumbers?.length ? (
                  <div className="divide-y rounded-xl border">
                    {selected.account.phoneNumbers.map((phone) => (
                      <div key={phone.phoneNumberId} className="p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium">
                            {phone.displayPhoneNumber ||
                              "Phone number unavailable"}
                          </p>
                          {phone.isPrimary ? (
                            <Badge variant="success">Primary</Badge>
                          ) : null}
                          {phone.status === "deregistered" ? (
                            <Badge variant="secondary">Deregistered</Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {phone.verifiedName || "No verified name"} · ID{" "}
                          {phone.phoneNumberId}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No saved phone numbers.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>Saved WhatsPilot data</CardTitle>
                  <CardDescription>
                    Live record counts are loaded immediately before account
                    operations.
                  </CardDescription>
                </div>
                <Badge
                  variant={selected.hasWhatsPilotData ? "warning" : "secondary"}
                >
                  {selected.hasWhatsPilotData
                    ? `${totalRecords.toLocaleString("en-IN")} records`
                    : "No saved data"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {countEntries.length ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {countEntries.map(([key, value]) => (
                    <div
                      key={key}
                      className="rounded-xl border bg-muted/20 p-4"
                    >
                      <p className="text-xs text-muted-foreground">
                        {countLabel(key)}
                      </p>
                      <p className="mt-2 text-2xl font-semibold">
                        {Number(value).toLocaleString("en-IN")}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                  <Database className="h-5 w-5" />
                  No WhatsPilot operational records were found for this vendor.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-rose-500/30">
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-rose-500/10 p-2 text-rose-600">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Danger zone</CardTitle>
                  <CardDescription>
                    Disconnecting keeps this generation available. Deleting
                    retires it permanently while retaining a read-only archive.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {selected.account?.requiresMetaAction ? (
                <div className="flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      Meta could not confirm webhook removal. Remove Vendero's
                      subscription in Meta, then record that manual cleanup
                      here.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 border-amber-500/40 text-amber-800 hover:bg-amber-500/10"
                    disabled={
                      !selected.canVerifyMetaCleanup || working !== null
                    }
                    onClick={() => void verifyManualMetaCleanup()}
                  >
                    {working === "meta-cleanup" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldAlert className="h-4 w-4" />
                    )}
                    Verify manual cleanup
                  </Button>
                </div>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border p-4">
                  <div className="flex items-start gap-3">
                    <LogOut className="mt-0.5 h-5 w-5 text-amber-600" />
                    <div>
                      <p className="font-medium">Disconnect from Vendero</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Stops WhatsPilot messaging and revokes Vendero's saved
                        credential. Chats and configuration are retained.
                      </p>
                    </div>
                  </div>
                  <Button
                    className="mt-4 border-amber-500/40 text-amber-700 hover:bg-amber-500/10 hover:text-amber-800"
                    variant="outline"
                    disabled={!selected.canDisconnect || working !== null}
                    onClick={() => void disconnectAccount()}
                  >
                    {working === "disconnect" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                    Disconnect account
                  </Button>
                </div>

                <div className="rounded-xl border border-rose-500/25 p-4">
                  <div className="flex items-start gap-3">
                    <Trash2 className="mt-0.5 h-5 w-5 text-rose-600" />
                    <div>
                      <p className="font-medium">Delete and archive account</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Retires this account generation. Conversations, messages,
                        media, and configuration remain in the admin-only archive.
                      </p>
                    </div>
                  </div>
                  <Button
                    className="mt-4 border-rose-500/40 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
                    variant="outline"
                    disabled={
                      !(selected.canDelete ??
                        selected.canPurge ??
                        Boolean(
                          selected.account &&
                            !["deleted"].includes(
                              selected.account.lifecycleState ??
                                selected.account.lifecycleStatus ??
                                "",
                            ),
                        )) || working !== null
                    }
                    onClick={() => void archiveAccountGeneration()}
                  >
                    {working === "archive" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Delete and archive
                  </Button>
                  {!(selected.canDelete ?? selected.canPurge) &&
                  (selected.deleteBlockedReason ?? selected.purgeBlockedReason) ? (
                    <p className="mt-3 text-xs text-rose-600">
                      {selected.deleteBlockedReason ?? selected.purgeBlockedReason}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="font-medium">Data retained after deletion</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Deletion closes access to the current generation; it does not
                  physically erase canonical WhatsPilot history. A later Meta
                  connection starts as a separate, empty generation.
                </p>
                <ul className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                  {(selected.retainedData.length
                    ? selected.retainedData
                    : DEFAULT_RETAINED_DATA
                  ).map((item) => (
                    <li key={item} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {actionModal.modal}
    </>
  );
}
