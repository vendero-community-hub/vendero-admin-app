"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Archive,
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Inbox,
  Loader2,
  MessageSquareText,
  Phone,
  RefreshCcw,
  RotateCcw,
  Search,
  ShieldCheck,
  UserRound,
  UserX,
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
import { WhatsPilotAccountOperationsPanel } from "./whatsapp-pilot-account-operations-panel";

type LifecycleTab = "operations" | "requests" | "deleted";
type LooseRecord = Record<string, unknown>;
type BadgeTone =
  | "default"
  | "secondary"
  | "outline"
  | "success"
  | "warning"
  | "danger";

type PageInfo = {
  page: number;
  limit: number;
  total: number | null;
  totalPages: number | null;
  hasNext: boolean;
};

const REQUEST_FILTERS = [
  "all",
  "pending",
  "processing",
  "failed",
  "rejected",
  "cancelled",
  "completed",
] as const;

function getAdminToken() {
  return document.cookie
    .split("; ")
    .find((part) => part.startsWith("vendero_admin_access_token="))
    ?.split("=")[1];
}

function asRecord(value: unknown): LooseRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as LooseRecord)
    : null;
}

function envelopeCandidates(value: unknown) {
  const candidates: unknown[] = [value];
  let current = value;
  for (let depth = 0; depth < 4; depth += 1) {
    const record = asRecord(current);
    if (!record) break;
    const next = record.data ?? record.payload ?? record.result;
    if (next === undefined || candidates.includes(next)) break;
    candidates.push(next);
    current = next;
  }
  return candidates;
}

function errorText(value: unknown, fallback: string) {
  for (const candidate of envelopeCandidates(value)) {
    const record = asRecord(candidate);
    if (!record) continue;
    const error = asRecord(record.error);
    for (const item of [
      error?.message,
      record.message,
      record.error,
      record.errorCode,
    ]) {
      if (typeof item === "string" && item.trim()) return item;
    }
  }
  return fallback;
}

async function apiRequest(path: string, init?: RequestInit) {
  const token = getAdminToken();
  const response = await fetch(path, {
    cache: "no-store",
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(errorText(payload, response.statusText || "Request failed"));
  }
  return payload as unknown;
}

function pick(record: LooseRecord | null, keys: string[]) {
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function textValue(record: LooseRecord | null, keys: string[], fallback = "") {
  const value = pick(record, keys);
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  return fallback;
}

function numberValue(record: LooseRecord | null, keys: string[]) {
  const value = pick(record, keys);
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function nested(record: LooseRecord | null, keys: string[]) {
  return asRecord(pick(record, keys));
}

function rowsFrom(value: unknown, keys: string[]) {
  for (const candidate of envelopeCandidates(value)) {
    if (Array.isArray(candidate)) {
      return candidate.map(asRecord).filter(Boolean) as LooseRecord[];
    }
    const record = asRecord(candidate);
    if (!record) continue;
    for (const key of keys) {
      if (Array.isArray(record[key])) {
        return (record[key] as unknown[])
          .map(asRecord)
          .filter(Boolean) as LooseRecord[];
      }
    }
  }
  return [];
}

function pageInfoFrom(
  value: unknown,
  rows: LooseRecord[],
  requestedPage: number,
  requestedLimit: number,
): PageInfo {
  let page = requestedPage;
  let limit = requestedLimit;
  let total: number | null = null;
  let totalPages: number | null = null;
  let explicitHasMore: boolean | null = null;

  for (const candidate of envelopeCandidates(value)) {
    const record = asRecord(candidate);
    if (!record) continue;
    const metadata =
      nested(record, ["pagination", "pageInfo", "meta"]) ?? record;
    page =
      numberValue(metadata, ["page", "currentPage", "current_page"]) ?? page;
    limit =
      numberValue(metadata, ["limit", "perPage", "per_page", "pageSize"]) ??
      limit;
    total = numberValue(metadata, ["total", "totalCount", "total_count"]) ?? total;
    totalPages =
      numberValue(metadata, ["totalPages", "lastPage", "total_pages"]) ??
      totalPages;
    const hasMore = pick(metadata, ["hasMore", "hasNext", "has_more"]);
    if (typeof hasMore === "boolean") explicitHasMore = hasMore;
  }
  if (totalPages === null && total !== null && limit > 0) {
    totalPages = Math.max(1, Math.ceil(total / limit));
  }
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext:
      explicitHasMore ??
      (totalPages !== null ? page < totalPages : rows.length >= limit),
  };
}

function countFromPayload(value: unknown, keys: string[]) {
  for (const candidate of envelopeCandidates(value)) {
    const record = asRecord(candidate);
    if (!record) continue;
    const direct = numberValue(record, keys);
    if (direct !== null) return direct;
    const metadata = nested(record, ["pagination", "pageInfo", "meta", "counts"]);
    const fromMetadata = numberValue(metadata, keys);
    if (fromMetadata !== null) return fromMetadata;
  }
  return null;
}

function formatDate(value: unknown) {
  if (typeof value !== "string" || !value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusLabel(status: string) {
  return status ? status.replaceAll("_", " ") : "unknown";
}

function statusTone(status: string): BadgeTone {
  if (["active", "connected", "completed", "approved"].includes(status)) {
    return "success";
  }
  if (["pending", "processing", "frozen"].includes(status)) return "warning";
  if (["failed", "deleted", "rejected"].includes(status)) return "danger";
  if (["cancelled", "disconnected"].includes(status)) return "secondary";
  return "outline";
}

function requestId(record: LooseRecord) {
  return textValue(record, ["requestId", "publicId", "id"]);
}

function accountRecord(record: LooseRecord) {
  return nested(record, ["account", "whatsPilotAccount", "accountGeneration"]);
}

function vendorRecord(record: LooseRecord) {
  return nested(record, ["vendor", "vendorProfile", "requesterVendor"]);
}

function accountId(record: LooseRecord) {
  const account = accountRecord(record);
  return (
    textValue(record, ["accountPublicId", "accountId", "whatsPilotAccountId"]) ||
    textValue(account, ["publicId", "accountPublicId", "id"])
  );
}

function vendorName(record: LooseRecord) {
  const vendor = vendorRecord(record);
  const account = accountRecord(record);
  return (
    textValue(record, ["businessName", "vendorBusinessName", "name"]) ||
    textValue(vendor, ["businessName", "displayName", "name"]) ||
    textValue(account, ["businessName", "name"], "Unnamed vendor")
  );
}

function personLabel(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return `Admin #${value}`;
  const person = asRecord(value);
  if (!person) return "Not set";
  return (
    textValue(person, ["fullName", "displayName", "name", "email"]) ||
    textValue(person, ["businessName"]) ||
    (textValue(person, ["id"]) ? `Admin #${textValue(person, ["id"])}` : "Not set")
  );
}

function phoneLabels(record: LooseRecord) {
  const account = accountRecord(record);
  const raw = pick(record, ["phoneNumbers", "phones"]) ?? pick(account, ["phoneNumbers", "phones"]);
  if (!Array.isArray(raw)) return [];
  return raw
    .map((phone) => {
      if (typeof phone === "string" || typeof phone === "number") return String(phone);
      return textValue(asRecord(phone), [
        "displayPhoneNumber",
        "phoneNumber",
        "phone",
        "number",
        "phoneNumberId",
      ]);
    })
    .filter(Boolean);
}

function requestStatus(record: LooseRecord) {
  return textValue(record, ["status", "requestStatus"], "unknown").toLowerCase();
}

function requestTimestamp(record: LooseRecord) {
  return pick(record, ["requestedAt", "createdAt", "submittedAt"]);
}

function Notice({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  const Icon = tone === "error" ? XCircle : CheckCircle2;
  return (
    <div
      className={`flex gap-2 rounded-lg border p-3 text-sm ${
        tone === "error"
          ? "border-rose-500/30 bg-rose-500/10 text-rose-600"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
      }`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function PageControls({
  info,
  disabled,
  onPage,
}: {
  info: PageInfo;
  disabled: boolean;
  onPage: (page: number) => void;
}) {
  if (info.page <= 1 && !info.hasNext && (info.totalPages ?? 1) <= 1) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs text-muted-foreground">
      <p>
        Page {info.page}
        {info.totalPages ? ` of ${info.totalPages}` : ""}
        {info.total !== null ? ` · ${info.total.toLocaleString("en-IN")} total` : ""}
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={disabled || info.page <= 1}
          onClick={() => onPage(Math.max(1, info.page - 1))}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled || !info.hasNext}
          onClick={() => onPage(info.page + 1)}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function WhatsPilotLifecyclePanel() {
  const [activeTab, setActiveTab] = useState<LifecycleTab>("operations");
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  const refreshPendingCount = useCallback(async () => {
    try {
      const params = new URLSearchParams({ status: "pending", page: "1", limit: "1" });
      const payload = await apiRequest(
        `/api/v1/admin/whatsapp-pilot/deletion-requests?${params.toString()}`,
      );
      const rows = rowsFrom(payload, ["requests", "deletionRequests", "items", "results"]);
      setPendingCount(
        countFromPayload(payload, ["pendingCount", "pending", "total", "totalCount"]) ??
          rows.filter((row) => requestStatus(row) === "pending").length,
      );
    } catch {
      setPendingCount(null);
    }
  }, []);

  useEffect(() => {
    void refreshPendingCount();
  }, [refreshPendingCount]);

  const tabs: Array<{ id: LifecycleTab; label: string; icon: typeof ShieldCheck }> = [
    { id: "operations", label: "Account Operations", icon: ShieldCheck },
    { id: "requests", label: "Deletion Requests", icon: Inbox },
    { id: "deleted", label: "Deleted Accounts", icon: Archive },
  ];

  return (
    <section className="space-y-5 pt-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            WhatsPilot account lifecycle
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review deletion requests, retire account generations, and inspect retained
            WhatsPilot history without reconnecting it.
          </p>
        </div>
        <Badge variant="outline">Admin-only archive</Badge>
      </div>

      <div
        className="flex gap-2 overflow-x-auto rounded-xl border bg-card p-2"
        role="tablist"
        aria-label="WhatsPilot account lifecycle sections"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                selected
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.id === "requests" && pendingCount !== null ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] ${
                    selected ? "bg-primary-foreground/15" : "bg-amber-500/15 text-amber-500"
                  }`}
                >
                  {pendingCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div role="tabpanel">
        {activeTab === "operations" ? <WhatsPilotAccountOperationsPanel /> : null}
        {activeTab === "requests" ? (
          <DeletionRequestsPanel onChanged={refreshPendingCount} />
        ) : null}
        {activeTab === "deleted" ? <DeletedAccountsPanel /> : null}
      </div>
    </section>
  );
}

function DeletionRequestsPanel({ onChanged }: { onChanged: () => Promise<void> }) {
  const [filter, setFilter] = useState<(typeof REQUEST_FILTERS)[number]>("pending");
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<LooseRecord[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo>({
    page: 1,
    limit: 20,
    total: null,
    totalPages: null,
    hasNext: false,
  });
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const actionModal = useActionModal();

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (filter !== "all") params.set("status", filter);
      if (appliedQuery) params.set("q", appliedQuery);
      const payload = await apiRequest(
        `/api/v1/admin/whatsapp-pilot/deletion-requests?${params.toString()}`,
      );
      let nextRows = rowsFrom(payload, [
        "requests",
        "deletionRequests",
        "items",
        "results",
      ]);
      if (filter !== "all") {
        nextRows = nextRows.filter((row) => requestStatus(row) === filter);
      }
      if (appliedQuery) {
        const needle = appliedQuery.toLowerCase();
        nextRows = nextRows.filter((row) =>
          [vendorName(row), requestId(row), accountId(row), ...phoneLabels(row)]
            .join(" ")
            .toLowerCase()
            .includes(needle),
        );
      }
      setRows(nextRows);
      setPageInfo(pageInfoFrom(payload, nextRows, page, 20));
    } catch (caught) {
      setRows([]);
      setError(caught instanceof Error ? caught.message : "Unable to load deletion requests.");
    } finally {
      setLoading(false);
    }
  }, [appliedQuery, filter, page]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  async function approve(record: LooseRecord, retry: boolean) {
    const id = requestId(record);
    if (!id) return;
    const confirmed = await actionModal.confirm({
      title: retry ? "Retry this account archive?" : "Approve this deletion request?",
      description: retry
        ? "The same idempotent archive workflow will run again. Canonical WhatsPilot records remain retained."
        : "The account generation will be permanently retired and its history will remain in the admin-only archive.",
      confirmLabel: retry ? "Retry archive" : "Approve and archive",
      variant: "danger",
    });
    if (!confirmed) return;
    setWorking(`approve-${id}`);
    setError(null);
    setMessage(null);
    try {
      await apiRequest(
        `/api/v1/admin/whatsapp-pilot/deletion-requests/${encodeURIComponent(id)}/approve`,
        { method: "POST", body: JSON.stringify(retry ? { retry: true } : {}) },
      );
      setMessage(retry ? "Archive retry started." : "Deletion request approved; archival has started.");
      await Promise.all([loadRequests(), onChanged()]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to approve this request.");
    } finally {
      setWorking(null);
    }
  }

  async function reject(record: LooseRecord) {
    const id = requestId(record);
    if (!id) return;
    const result = await actionModal.prompt({
      title: "Reject this deletion request?",
      description:
        "The account remains frozen after rejection. Use Reopen separately if the vendor should regain access to the same generation.",
      label: "Rejection reason",
      placeholder: "Explain why this request was rejected.",
      textarea: true,
      required: true,
      confirmLabel: "Reject request",
      variant: "danger",
    });
    if (result === null) return;
    if (!result.trim()) {
      setError("A rejection reason is required.");
      return;
    }
    setWorking(`reject-${id}`);
    setError(null);
    setMessage(null);
    try {
      await apiRequest(
        `/api/v1/admin/whatsapp-pilot/deletion-requests/${encodeURIComponent(id)}/reject`,
        { method: "POST", body: JSON.stringify({ reason: result.trim() }) },
      );
      setMessage("Deletion request rejected. The account generation remains frozen.");
      await Promise.all([loadRequests(), onChanged()]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to reject this request.");
    } finally {
      setWorking(null);
    }
  }

  async function reopen(record: LooseRecord) {
    const id = accountId(record);
    if (!id) return;
    const result = await actionModal.prompt({
      title: `Reopen ${vendorName(record)}?`,
      description:
        "This returns a frozen, non-deleted generation to active/disconnected. The vendor must complete secure Meta signup before messaging resumes.",
      label: "Reopen reason",
      placeholder: "Record why access is being reopened.",
      textarea: true,
      required: true,
      confirmLabel: "Reopen account",
    });
    if (result === null) return;
    if (!result.trim()) {
      setError("A reopen reason is required.");
      return;
    }
    setWorking(`reopen-${id}`);
    setError(null);
    setMessage(null);
    try {
      await apiRequest(
        `/api/v1/admin/whatsapp-pilot/accounts/${encodeURIComponent(id)}/reopen`,
        { method: "POST", body: JSON.stringify({ reason: result.trim() }) },
      );
      setMessage("The frozen account generation was reopened in disconnected state.");
      await Promise.all([loadRequests(), onChanged()]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to reopen this account.");
    } finally {
      setWorking(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Deletion requests</CardTitle>
              <CardDescription>
                Approvals and direct admin deletions share the same retained archive workflow.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" disabled={loading} onClick={() => void loadRequests()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {REQUEST_FILTERS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setFilter(value);
                    setPage(1);
                  }}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                    filter === value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {statusLabel(value)}
                </button>
              ))}
            </div>
            <div className="flex min-w-0 gap-2 lg:w-[360px]">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      setAppliedQuery(query.trim());
                      setPage(1);
                    }
                  }}
                  className="pl-9"
                  placeholder="Vendor, phone, request ID…"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setAppliedQuery(query.trim());
                  setPage(1);
                }}
              >
                Search
              </Button>
            </div>
          </div>

          {error ? <Notice tone="error">{error}</Notice> : null}
          {message ? <Notice tone="success">{message}</Notice> : null}

          {loading && !rows.length ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed p-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading deletion requests…
            </div>
          ) : rows.length ? (
            <div className="divide-y overflow-hidden rounded-xl border">
              {rows.map((record, index) => {
                const id = requestId(record);
                const status = requestStatus(record);
                const targetId = accountId(record);
                const account = accountRecord(record);
                const vendor = vendorRecord(record);
                const generation =
                  numberValue(record, ["generation", "accountGeneration"]) ??
                  numberValue(account, ["generation"]);
                const wabaId =
                  textValue(record, ["wabaId", "whatsappBusinessAccountId"]) ||
                  textValue(account, ["wabaId", "whatsappBusinessAccountId"]);
                const cleanupError = nested(record, ["cleanupError"]);
                const failureCode =
                  textValue(cleanupError, ["code"]) ||
                  textValue(record, ["cleanupErrorCode", "errorCode"]);
                const failureMessage =
                  textValue(cleanupError, ["message"]) ||
                  textValue(record, [
                    "failureReason",
                    "errorMessage",
                    "cleanupErrorMessage",
                    "lastError",
                  ]);
                const failure = [failureCode, failureMessage]
                  .filter(
                    (value, failureIndex, values) =>
                      value && values.indexOf(value) === failureIndex,
                  )
                  .join(": ");
                const canReopen = ["rejected", "cancelled"].includes(status) && Boolean(targetId);
                return (
                  <article key={id || `${status}-${index}`} className="space-y-4 p-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{vendorName(record)}</p>
                          <Badge variant={statusTone(status)} className="capitalize">
                            {statusLabel(status)}
                          </Badge>
                          {generation !== null ? (
                            <Badge variant="outline">Generation {generation}</Badge>
                          ) : null}
                        </div>
                        <p className="break-all font-mono text-xs text-muted-foreground">
                          Request {id || "ID unavailable"}
                          {targetId ? ` · Account ${targetId}` : ""}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {textValue(record, ["reason", "deletionReason", "requestReason"], "No reason supplied")}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>Requested {formatDate(requestTimestamp(record))}</span>
                          <span>
                            By {personLabel(
                              pick(record, [
                                "requester",
                                "requestedBy",
                                "requesterAdmin",
                                "requesterName",
                                "requestedByName",
                                "requestedByUserId",
                              ]) ?? vendor,
                            )}
                          </span>
                          {wabaId ? <span>WABA {wabaId}</span> : null}
                          {phoneLabels(record).length ? (
                            <span>{phoneLabels(record).join(", ")}</span>
                          ) : null}
                        </div>
                        {pick(record, ["reviewedAt", "completedAt", "updatedAt"]) ? (
                          <p className="text-xs text-muted-foreground">
                            Reviewed {formatDate(pick(record, ["reviewedAt", "completedAt", "updatedAt"]))} by{" "}
                            {personLabel(
                              pick(record, [
                                "reviewer",
                                "reviewedBy",
                                "reviewerName",
                                "reviewedByName",
                                "reviewedByUserId",
                              ]),
                            )}
                          </p>
                        ) : null}
                        {textValue(record, ["reviewReason", "rejectionReason"]) ? (
                          <p className="text-xs text-muted-foreground">
                            Review note: {textValue(record, ["reviewReason", "rejectionReason"])}
                          </p>
                        ) : null}
                        {failure ? (
                          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600">
                            {failure}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        {status === "pending" ? (
                          <>
                            <Button
                              size="sm"
                              disabled={working !== null || !id}
                              onClick={() => void approve(record, false)}
                            >
                              {working === `approve-${id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
                              disabled={working !== null || !id}
                              onClick={() => void reject(record)}
                            >
                              {working === `reject-${id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
                              Reject
                            </Button>
                          </>
                        ) : null}
                        {status === "failed" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={working !== null || !id}
                            onClick={() => void approve(record, true)}
                          >
                            {working === `approve-${id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                            Retry archive
                          </Button>
                        ) : null}
                        {canReopen ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={working !== null}
                            onClick={() => void reopen(record)}
                          >
                            {working === `reopen-${targetId}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                            Reopen frozen account
                          </Button>
                        ) : null}
                        {status === "processing" ? (
                          <span className="flex items-center gap-2 text-xs text-amber-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving account history to MongoDB
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed p-10 text-sm text-muted-foreground">
              <Inbox className="h-5 w-5" />
              No deletion requests match this view.
            </div>
          )}

          <PageControls
            info={pageInfo}
            disabled={loading || working !== null}
            onPage={setPage}
          />
        </CardContent>
      </Card>
      {actionModal.modal}
    </div>
  );
}

function deletedAccountId(record: LooseRecord) {
  return (
    textValue(record, ["accountPublicId", "publicId", "accountId", "id", "_id"]) ||
    accountId(record)
  );
}

function deletedAccountStatus(record: LooseRecord) {
  return textValue(record, ["lifecycleState", "status"], "deleted").toLowerCase();
}

function countLabel(record: LooseRecord, keys: string[]) {
  const counts = nested(record, ["counts", "totals"]);
  return numberValue(record, keys) ?? numberValue(counts, keys) ?? 0;
}

function conversationId(record: LooseRecord) {
  return textValue(record, [
    "conversationPublicId",
    "publicId",
    "conversationId",
    "id",
    "_id",
  ]);
}

function conversationName(record: LooseRecord) {
  const contact = nested(record, ["contact", "customer", "recipient"]);
  return (
    textValue(record, ["contactName", "displayName", "name", "subject"]) ||
    textValue(contact, ["displayName", "name", "profileName"]) ||
    textValue(record, ["phoneNumber", "waId", "contactPhone"], "Unknown contact")
  );
}

function conversationPhone(record: LooseRecord) {
  const contact = nested(record, ["contact", "customer", "recipient"]);
  return (
    textValue(record, ["phoneNumber", "waId", "contactPhone", "recipientPhone"]) ||
    textValue(contact, ["phoneNumber", "phone", "waId"])
  );
}

function conversationPreview(record: LooseRecord) {
  const lastMessage = nested(record, ["lastMessage", "latestMessage"]);
  return (
    textValue(record, [
      "lastMessage",
      "lastMessagePreview",
      "preview",
      "lastMessageText",
      "last_message_preview",
    ]) ||
    textValue(lastMessage, ["body", "text", "message", "caption"]) ||
    "No message preview"
  );
}

function conversationTimestamp(record: LooseRecord) {
  const lastMessage = nested(record, ["lastMessage", "latestMessage"]);
  return (
    pick(record, ["lastMessageAt", "last_message_at", "updatedAt", "createdAt"]) ??
    pick(lastMessage, ["providerTimestamp", "sentAt", "receivedAt", "createdAt"])
  );
}

function contactAvatarUrl(record: LooseRecord) {
  const contact = nested(record, ["contact", "customer", "recipient"]);
  return safeMediaUrl(
    pick(record, ["avatarUrl", "profilePictureUrl", "profileUrl"]) ??
      pick(contact, ["avatarUrl", "profilePictureUrl", "profileUrl"]),
  );
}

function initials(value: string) {
  return (
    value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "WA"
  );
}

function messageId(record: LooseRecord) {
  return textValue(record, [
    "messagePublicId",
    "publicId",
    "messageId",
    "id",
    "_id",
    "providerMessageId",
  ]);
}

function messageDirection(record: LooseRecord) {
  const raw = textValue(record, ["direction", "messageDirection", "senderType"]).toLowerCase();
  if (["outbound", "sent", "business", "agent", "admin"].includes(raw)) return "outbound";
  return "inbound";
}

function messageTime(record: LooseRecord) {
  return textValue(record, [
    "providerTimestamp",
    "sentAt",
    "receivedAt",
    "timestamp",
    "createdAt",
    "occurredAt",
  ]);
}

function messageText(record: LooseRecord) {
  const payload = nested(record, ["payload"]);
  const content = nested(record, ["content", "messageContent"]);
  const text = nested(record, ["text"]);
  const payloadText = nested(payload, ["text"]);
  return (
    textValue(record, ["body", "text", "message", "caption", "contentText"]) ||
    textValue(content, ["body", "text", "caption"]) ||
    textValue(text, ["body", "text"]) ||
    textValue(payload, ["body", "text", "message", "caption", "contentText"]) ||
    textValue(payloadText, ["body", "text"])
  );
}

function messageStatusTimeline(record: LooseRecord) {
  const values: Array<{ label: string; value: unknown }> = [
    { label: "Received", value: pick(record, ["receivedAt"]) },
    { label: "Sent", value: pick(record, ["sentAt"]) },
    { label: "Delivered", value: pick(record, ["deliveredAt"]) },
    { label: "Read", value: pick(record, ["readAt"]) },
    { label: "Failed", value: pick(record, ["failedAt"]) },
  ];
  return values.filter(
    (item): item is { label: string; value: string } =>
      typeof item.value === "string" && Boolean(item.value),
  );
}

function messageFailure(record: LooseRecord) {
  const code = textValue(record, ["errorCode", "failureCode"]);
  const message = textValue(record, ["errorMessage", "failureReason"]);
  if (!code && !message) return null;
  return [code, message].filter(Boolean).join(" · ");
}

function reactionLabels(value: unknown) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values
    .map((reaction) => {
      if (typeof reaction === "string") return reaction;
      const record = asRecord(reaction);
      const label = textValue(record, ["emoji", "reaction", "value"], "Reaction");
      const count = numberValue(record, ["count"]);
      return count !== null && count > 1 ? `${label} ${count}` : label;
    })
    .filter(Boolean);
}

function safeMediaUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  if (value.startsWith("/")) return value;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

type MediaItem = {
  key: string;
  url: string | null;
  mime: string;
  name: string;
  unavailable: boolean;
};

function mediaItems(record: LooseRecord): MediaItem[] {
  const payload = nested(record, ["payload"]);
  const raw =
    pick(record, ["attachment", "attachments", "media", "mediaItems"]) ??
    pick(payload, ["attachment", "attachments", "media", "mediaItems"]);
  const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const directUrl =
    pick(record, ["mediaUrl", "attachmentUrl", "archivedMediaUrl"]) ??
    pick(payload, ["mediaUrl", "attachmentUrl", "archivedMediaUrl"]);
  if (!values.length && directUrl) {
    values.push({
      url: directUrl,
      mimeType:
        pick(record, ["mimeType", "mediaMimeType"]) ??
        pick(payload, ["mimeType", "mediaMimeType"]),
      fileName:
        pick(record, ["fileName", "mediaFileName"]) ??
        pick(payload, ["fileName", "mediaFileName"]),
      status:
        pick(record, ["mediaStatus", "attachmentStatus"]) ??
        pick(payload, ["mediaStatus", "attachmentStatus"]),
    });
  }
  return values.map((value, index) => {
    const item = asRecord(value);
    const url = safeMediaUrl(
      typeof value === "string"
        ? value
        : pick(item, ["archivedUrl", "url", "mediaUrl", "downloadUrl"]),
    );
    const status = textValue(item, ["status", "archiveStatus", "availability"]).toLowerCase();
    return {
      key: textValue(item, ["publicId", "id", "objectKey"], `media-${index}`),
      url,
      mime: textValue(item, ["mimeType", "mime", "contentType", "type"]).toLowerCase(),
      name: textValue(item, ["fileName", "name", "title"], "Archived attachment"),
      unavailable: !url || ["unavailable", "expired", "missing", "failed"].includes(status),
    };
  });
}

function MediaPreview({ item }: { item: MediaItem }) {
  if (item.unavailable || !item.url) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
        <FileText className="h-4 w-4" />
        Archived media is unavailable or expired.
      </div>
    );
  }
  if (item.mime.startsWith("image/")) {
    return (
      <a href={item.url} target="_blank" rel="noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.url} alt={item.name} className="max-h-72 max-w-full rounded-lg border object-contain" loading="lazy" />
      </a>
    );
  }
  if (item.mime.startsWith("video/")) {
    return <video src={item.url} controls preload="metadata" className="max-h-72 max-w-full rounded-lg border" />;
  }
  if (item.mime.startsWith("audio/")) {
    return <audio src={item.url} controls preload="metadata" className="max-w-full" />;
  }
  return (
    <a href={item.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border p-3 text-xs underline underline-offset-2">
      <FileText className="h-4 w-4" />
      {item.name}
    </a>
  );
}

function DeletedAccountsPanel() {
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [conversationQuery, setConversationQuery] = useState("");
  const [page, setPage] = useState(1);
  const [accounts, setAccounts] = useState<LooseRecord[]>([]);
  const [accountPage, setAccountPage] = useState<PageInfo>({ page: 1, limit: 20, total: null, totalPages: null, hasNext: false });
  const [selectedAccount, setSelectedAccount] = useState<LooseRecord | null>(null);
  const [conversations, setConversations] = useState<LooseRecord[]>([]);
  const [conversationPage, setConversationPage] = useState<PageInfo>({ page: 1, limit: 25, total: null, totalPages: null, hasNext: false });
  const [selectedConversation, setSelectedConversation] = useState<LooseRecord | null>(null);
  const [messages, setMessages] = useState<LooseRecord[]>([]);
  const [messagePage, setMessagePage] = useState<PageInfo>({ page: 1, limit: 50, total: null, totalPages: null, hasNext: false });
  const [loading, setLoading] = useState<string | null>("accounts");
  const [error, setError] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    setLoading("accounts");
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (appliedQuery) params.set("q", appliedQuery);
      const payload = await apiRequest(
        `/api/v1/admin/whatsapp-pilot/deleted-accounts?${params.toString()}`,
      );
      let rows = rowsFrom(payload, ["accounts", "deletedAccounts", "items", "results"]);
      if (appliedQuery) {
        const needle = appliedQuery.toLowerCase();
        rows = rows.filter((record) =>
          [vendorName(record), deletedAccountId(record), ...phoneLabels(record), textValue(record, ["wabaId"])]
            .join(" ")
            .toLowerCase()
            .includes(needle),
        );
      }
      setAccounts(rows);
      setAccountPage(pageInfoFrom(payload, rows, page, 20));
      setSelectedAccount((current) => {
        if (!current) return current;
        return rows.find((row) => deletedAccountId(row) === deletedAccountId(current)) ?? current;
      });
    } catch (caught) {
      setAccounts([]);
      setError(caught instanceof Error ? caught.message : "Unable to load deleted accounts.");
    } finally {
      setLoading(null);
    }
  }, [appliedQuery, page]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  async function loadConversations(record: LooseRecord, nextPage: number) {
    const id = deletedAccountId(record);
    if (!id) return;
    setLoading("conversations");
    setError(null);
    setSelectedAccount(record);
    if (nextPage === 1) {
      setSelectedConversation(null);
      setMessages([]);
      setConversationQuery("");
    }
    try {
      const params = new URLSearchParams({ page: String(nextPage), limit: "25" });
      const payload = await apiRequest(
        `/api/v1/admin/whatsapp-pilot/deleted-accounts/${encodeURIComponent(id)}/conversations?${params.toString()}`,
      );
      const rows = rowsFrom(payload, [
        "conversations",
        "contacts",
        "threads",
        "items",
        "results",
      ]);
      setConversations(rows);
      setConversationPage(pageInfoFrom(payload, rows, nextPage, 25));
    } catch (caught) {
      setConversations([]);
      setError(caught instanceof Error ? caught.message : "Unable to load archived conversations.");
    } finally {
      setLoading(null);
    }
  }

  async function loadMessages(conversation: LooseRecord, nextPage: number) {
    if (!selectedAccount) return;
    const accountPublicId = deletedAccountId(selectedAccount);
    const id = conversationId(conversation);
    if (!accountPublicId || !id) return;
    setLoading("messages");
    setError(null);
    setSelectedConversation(conversation);
    try {
      const params = new URLSearchParams({ page: String(nextPage), limit: "50" });
      const payload = await apiRequest(
        `/api/v1/admin/whatsapp-pilot/deleted-accounts/${encodeURIComponent(accountPublicId)}/conversations/${encodeURIComponent(id)}/messages?${params.toString()}`,
      );
      const rows = rowsFrom(payload, ["messages", "chat", "items", "results"]);
      const chronological = rows
        .map((row, index) => ({ row, index }))
        .sort((left, right) => {
          const leftTime = Date.parse(messageTime(left.row));
          const rightTime = Date.parse(messageTime(right.row));
          if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) return left.index - right.index;
          return leftTime - rightTime;
        })
        .map(({ row }) => row);
      setMessages(chronological);
      setMessagePage(pageInfoFrom(payload, rows, nextPage, 50));
    } catch (caught) {
      setMessages([]);
      setError(caught instanceof Error ? caught.message : "Unable to load the archived transcript.");
    } finally {
      setLoading(null);
    }
  }

  const selectedAccountId = selectedAccount ? deletedAccountId(selectedAccount) : "";
  const selectedConversationId = selectedConversation ? conversationId(selectedConversation) : "";
  const selectedPhones = useMemo(
    () => (selectedAccount ? phoneLabels(selectedAccount) : []),
    [selectedAccount],
  );
  const visibleConversations = useMemo(() => {
    const needle = conversationQuery.trim().toLowerCase();
    if (!needle) return conversations;
    return conversations.filter((conversation) =>
      [
        conversationName(conversation),
        conversationPhone(conversation),
        conversationPreview(conversation),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [conversationQuery, conversations]);

  function closeArchivedInbox() {
    setSelectedAccount(null);
    setSelectedConversation(null);
    setConversations([]);
    setMessages([]);
    setConversationQuery("");
    setError(null);
  }

  return (
    <div className="space-y-5">
      {!selectedAccount ? (
        <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Deleted WhatsPilot accounts</CardTitle>
              <CardDescription>
                Immutable account generations retained for audited, read-only inspection.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" disabled={loading === "accounts"} onClick={() => void loadAccounts()}>
              {loading === "accounts" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    setAppliedQuery(query.trim());
                    setPage(1);
                  }
                }}
                className="pl-9"
                placeholder="Business, account ID, WABA, or phone…"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setAppliedQuery(query.trim());
                setPage(1);
              }}
            >
              <Search className="h-4 w-4" />
              Search archive
            </Button>
          </div>

          {error ? <Notice tone="error">{error}</Notice> : null}

          {loading === "accounts" && !accounts.length ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed p-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading deleted accounts…
            </div>
          ) : accounts.length ? (
            <div className="divide-y overflow-hidden rounded-xl border">
              {accounts.map((record, index) => {
                const id = deletedAccountId(record);
                const account = accountRecord(record);
                const generation =
                  numberValue(record, ["generation", "accountGeneration"]) ??
                  numberValue(account, ["generation"]);
                const wabaId =
                  textValue(record, ["wabaId", "whatsappBusinessAccountId"]) ||
                  textValue(account, ["wabaId", "whatsappBusinessAccountId"]);
                const conversationCount = countLabel(record, ["conversationCount", "conversations"]);
                const messageCount = countLabel(record, ["messageCount", "messages"]);
                const phones = phoneLabels(record);
                const selected = id && id === selectedAccountId;
                return (
                  <article
                    key={id || `deleted-${index}`}
                    className={`p-4 transition-colors ${selected ? "bg-primary/5" : "hover:bg-muted/30"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold">{vendorName(record)}</p>
                          <Badge variant={statusTone(deletedAccountStatus(record))} className="capitalize">
                            {statusLabel(deletedAccountStatus(record))}
                          </Badge>
                          {generation !== null ? <Badge variant="outline">Gen {generation}</Badge> : null}
                        </div>
                        <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                          {id || "Account ID unavailable"}
                        </p>
                        {wabaId ? <p className="mt-1 break-all text-xs text-muted-foreground">WABA {wabaId}</p> : null}
                      </div>
                      <Archive className="h-5 w-5 shrink-0 text-muted-foreground" />
                    </div>
                    {phones.length ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {phones.map((phone) => (
                          <Badge key={phone} variant="secondary">
                            <Phone className="mr-1 h-3 w-3" />
                            {phone}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
                      <div className="rounded-lg bg-muted/40 p-2">
                        <p className="text-muted-foreground">Contacts</p>
                        <p className="mt-1 font-semibold">
                          {countLabel(record, ["contactCount", "contacts"]).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-2">
                        <p className="text-muted-foreground">Conversations</p>
                        <p className="mt-1 font-semibold">{conversationCount.toLocaleString("en-IN")}</p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-2">
                        <p className="text-muted-foreground">Messages</p>
                        <p className="mt-1 font-semibold">{messageCount.toLocaleString("en-IN")}</p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-2">
                        <p className="text-muted-foreground">Deleted</p>
                        <p className="mt-1 font-semibold">{formatDate(pick(record, ["deletedAt", "archivedAt", "completedAt"]))}</p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-2">
                        <p className="text-muted-foreground">Source</p>
                        <p className="mt-1 font-semibold capitalize">{statusLabel(textValue(record, ["deletionSource", "source"], "unknown"))}</p>
                      </div>
                    </div>
                    <dl className="mt-3 grid gap-1 text-xs text-muted-foreground">
                      <div className="flex gap-1"><dt>Requester:</dt><dd>{personLabel(pick(record, ["requester", "requestedBy", "requesterName", "requestedByName", "requestedByUserId"]))}</dd></div>
                      <div className="flex gap-1"><dt>Reviewer:</dt><dd>{personLabel(pick(record, ["reviewer", "reviewedBy", "reviewerName", "reviewedByName", "reviewedByUserId"]))}</dd></div>
                    </dl>
                    <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
                      {textValue(record, ["deletionReason", "reason"], "No deletion reason supplied")}
                    </p>
                    <Button
                      size="sm"
                      variant={selected ? "secondary" : "outline"}
                      className="mt-4"
                      aria-label={`Open archived inbox for ${vendorName(record)}`}
                      disabled={!id || loading === "conversations"}
                      onClick={() => void loadConversations(record, 1)}
                    >
                      {loading === "conversations" && selected ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquareText className="h-4 w-4" />}
                      Open archived inbox
                    </Button>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed p-10 text-sm text-muted-foreground">
              <Archive className="h-5 w-5" />
              No deleted WhatsPilot accounts match this search.
            </div>
          )}
          <PageControls info={accountPage} disabled={loading !== null} onPage={setPage} />
        </CardContent>
        </Card>
      ) : null}

      {selectedAccount ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Back to deleted WhatsApp accounts"
                  onClick={closeArchivedInbox}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Accounts
                </Button>
                <div className="min-w-0">
                  <CardTitle>{vendorName(selectedAccount)}</CardTitle>
                  <CardDescription>
                    Deleted WhatsApp account · {selectedAccountId}
                    {selectedPhones.length ? ` · ${selectedPhones.join(", ")}` : ""}
                  </CardDescription>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="danger">Deleted</Badge>
                <Badge variant="secondary">Read-only archive</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid min-h-[640px] overflow-hidden rounded-xl border bg-card lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]">
              <div className="flex min-h-0 flex-col border-b bg-card lg:border-b-0 lg:border-r">
                <div className="border-b p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">Contacts &amp; conversations</p>
                      <p className="text-xs text-muted-foreground">
                        {conversationPage.total ?? conversations.length} retained contacts
                      </p>
                    </div>
                    <Badge variant="outline">
                      {conversationPage.total ?? conversations.length}
                    </Badge>
                  </div>
                  <div className="relative mt-3">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={conversationQuery}
                      onChange={(event) => setConversationQuery(event.target.value)}
                      className="h-9 bg-muted/40 pl-9"
                      placeholder="Search contacts or chats…"
                      aria-label="Search archived conversations"
                    />
                  </div>
                </div>
                {loading === "conversations" && !conversations.length ? (
                  <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                  </div>
                ) : visibleConversations.length ? (
                  <div className="max-h-[570px] flex-1 divide-y overflow-y-auto">
                    {visibleConversations.map((conversation, index) => {
                      const id = conversationId(conversation);
                      const selected = id && id === selectedConversationId;
                      const name = conversationName(conversation);
                      const avatarUrl = contactAvatarUrl(conversation);
                      const handlingMode = textValue(conversation, [
                        "handlingMode",
                        "mode",
                      ]).toLowerCase();
                      return (
                        <button
                          key={id || `conversation-${index}`}
                          type="button"
                          aria-label={`Open archived conversation with ${name}`}
                          aria-pressed={Boolean(selected)}
                          className={`relative grid w-full grid-cols-[42px_minmax(0,1fr)] gap-3 p-3 text-left transition-colors ${selected ? "bg-emerald-50 dark:bg-emerald-950/20" : "hover:bg-muted/50"}`}
                          onClick={() => void loadMessages(conversation, 1)}
                        >
                          {selected ? (
                            <span className="absolute inset-y-2 left-0 w-1 rounded-r bg-emerald-500" />
                          ) : null}
                          <span className="grid h-[42px] w-[42px] place-items-center overflow-hidden rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            {avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              initials(name)
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-start justify-between gap-2">
                              <span className="truncate text-sm font-semibold">{name}</span>
                              <span className="shrink-0 text-[10px] text-muted-foreground">
                                {formatDate(conversationTimestamp(conversation))}
                              </span>
                            </span>
                            {conversationPhone(conversation) ? (
                              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                                {conversationPhone(conversation)}
                              </span>
                            ) : null}
                            <span className="mt-1.5 block truncate text-xs text-muted-foreground">
                              {conversationPreview(conversation)}
                            </span>
                            <span className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                              <span className="rounded-full bg-muted px-2 py-0.5">
                                {countLabel(conversation, ["messageCount", "messages"]).toLocaleString("en-IN")} messages
                              </span>
                              {handlingMode ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300">
                                  {handlingMode === "bot" ? <Bot className="h-3 w-3" /> : <UserRound className="h-3 w-3" />}
                                  {statusLabel(handlingMode)}
                                </span>
                              ) : null}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    {conversationQuery
                      ? "No archived conversations match this search."
                      : "No archived conversations."}
                  </div>
                )}
                <div className="p-3">
                  <PageControls
                    info={conversationPage}
                    disabled={loading !== null}
                    onPage={(nextPage) => void loadConversations(selectedAccount, nextPage)}
                  />
                </div>
              </div>

              <div className="min-w-0 bg-muted/10">
                {selectedConversation ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-card p-4">
                      <div>
                        <p className="font-semibold">{conversationName(selectedConversation)}</p>
                        <p className="text-xs text-muted-foreground">
                          {conversationPhone(selectedConversation) || `Conversation ${selectedConversationId}`}
                        </p>
                      </div>
                      <Badge variant="outline">Exact archived transcript</Badge>
                    </div>
                    {loading === "messages" && !messages.length ? (
                      <div className="flex h-[430px] items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading transcript…
                      </div>
                    ) : messages.length ? (
                      <div className="max-h-[520px] space-y-3 overflow-y-auto p-4">
                        {messages.map((message, index) => {
                          const id = messageId(message);
                          const direction = messageDirection(message);
                          const status = textValue(message, ["deliveryStatus", "providerStatus", "status"]);
                          const payload = nested(message, ["payload"]);
                          const reply =
                            pick(message, ["replyTo", "replyToMessage", "context"]) ??
                            pick(payload, ["replyTo", "replyToMessage", "replyToMessageId", "context"]);
                          const reactions =
                            pick(message, ["reactions", "reactionSummary"]) ??
                            pick(payload, ["reactions", "reactionSummary"]);
                          const reactionBadges = reactionLabels(reactions);
                          const statusTimeline = messageStatusTimeline(message);
                          const failure = messageFailure(message);
                          const media = mediaItems(message);
                          return (
                            <div key={id || `message-${index}`} className={`flex ${direction === "outbound" ? "justify-end" : "justify-start"}`}>
                              <article
                                data-testid="archived-message"
                                data-message-time={messageTime(message)}
                                className={`max-w-[88%] rounded-2xl border p-3 text-sm shadow-sm ${direction === "outbound" ? "border-primary/20 bg-primary/10" : "bg-card"}`}
                              >
                                <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                                  <span>{direction}</span>
                                  <span>{statusLabel(textValue(message, ["messageType", "type"], "text"))}</span>
                                  {status ? <span>{statusLabel(status)}</span> : null}
                                </div>
                                {reply ? (
                                  <div className="mb-2 rounded-lg border-l-2 border-primary bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground">
                                    Reply to {typeof reply === "string" ? reply : textValue(asRecord(reply), ["body", "text", "messageId", "publicId"], "earlier message")}
                                  </div>
                                ) : null}
                                {messageText(message) ? (
                                  <p className="whitespace-pre-wrap break-words leading-6">{messageText(message)}</p>
                                ) : null}
                                {media.length ? (
                                  <div className="mt-2 space-y-2">
                                    {media.map((item) => <MediaPreview key={item.key} item={item} />)}
                                  </div>
                                ) : null}
                                {reactionBadges.length ? (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {reactionBadges.map((reaction, reactionIndex) => (
                                      <Badge key={`${id}-reaction-${reactionIndex}`} variant="secondary">
                                        {reaction}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : null}
                                {statusTimeline.length ? (
                                  <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                                    {statusTimeline.map((event) => (
                                      <span key={event.label} className="rounded-full border px-2 py-0.5">
                                        {event.label} {formatDate(event.value)}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                                {failure ? (
                                  <p className="mt-2 rounded-lg bg-rose-500/10 px-2 py-1.5 text-xs text-rose-600">
                                    {failure}
                                  </p>
                                ) : null}
                                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
                                  <span>{formatDate(messageTime(message))}</span>
                                  {id ? <span className="break-all font-mono">{id}</span> : null}
                                </div>
                              </article>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex h-[430px] items-center justify-center text-sm text-muted-foreground">
                        No messages were retained for this conversation.
                      </div>
                    )}
                    <div className="border-t bg-card p-3">
                      <PageControls
                        info={messagePage}
                        disabled={loading !== null}
                        onPage={(nextPage) => void loadMessages(selectedConversation, nextPage)}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex h-full min-h-[520px] flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
                    <MessageSquareText className="h-8 w-8" />
                    <div>
                      <p className="font-medium text-foreground">Select a conversation</p>
                      <p className="mt-1 text-sm">The archived transcript opens here without reply or mutation controls.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
              <Clock3 className="h-4 w-4" />
              This viewer is read only. Transcript and media access are covered by the WhatsPilot admin audit trail.
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
