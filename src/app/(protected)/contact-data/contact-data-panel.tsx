"use client";

import { type ReactNode, useMemo, useState } from "react";
import {
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  Download,
  FileDown,
  Filter,
  Plus,
  RefreshCw,
  Search,
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
import { APP_ENV } from "@/lib/environment";

type ContactFilters = {
  q: string;
  commonCount: number | null;
  minCommonCount: number | null;
  maxCommonCount: number | null;
  registrationStatus: string;
};

type ContactRecord = {
  id: number;
  phone: string | null;
  phoneE164: string | null;
  phoneSearch: string | null;
  nationalNumber: string | null;
  commonCount: number;
  sourceCount: number;
  totalSyncs: number;
  sampleNames: string[];
  isRegistered: boolean;
  registeredUserId: number | null;
  registeredVendorProfileId: number | null;
  registeredName: string | null;
  registeredBusinessName: string | null;
  registeredAt: string | null;
  firstSeenAt: string | null;
  lastSyncedAt: string | null;
  createdAt: string | null;
};

type ContactDataset = {
  id: number;
  publicId: string;
  name: string;
  description: string | null;
  purpose: string;
  filterConfig: Partial<ContactFilters>;
  contactCount: number;
  createdByUserId: number | null;
  createdByName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ContactIntelligenceData = {
  generatedAt: string | null;
  filters: ContactFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    total: number;
    registered: number;
    unregistered: number;
    namedContacts: number;
    commonOne: number;
    commonTwo: number;
    commonThreePlus: number;
    unregisteredCommon: number;
    maxCommonCount: number;
    totalKnownLinks: number;
  };
  contacts: ContactRecord[];
  datasets: ContactDataset[];
};

type FilterState = {
  q: string;
  commonCount: string;
  minCommonCount: string;
  maxCommonCount: string;
  registrationStatus: string;
};

const defaultSummary: ContactIntelligenceData["summary"] = {
  total: 0,
  registered: 0,
  unregistered: 0,
  namedContacts: 0,
  commonOne: 0,
  commonTwo: 0,
  commonThreePlus: 0,
  unregisteredCommon: 0,
  maxCommonCount: 0,
  totalKnownLinks: 0,
};

const emptyFilters: FilterState = {
  q: "",
  commonCount: "all",
  minCommonCount: "",
  maxCommonCount: "",
  registrationStatus: "all",
};

function unwrapPayload(payload: any) {
  return payload?.data?.data ?? payload?.data ?? payload;
}

function getAdminToken() {
  return (
    document.cookie
      .split("; ")
      .find((part) => part.startsWith("vendero_admin_access_token="))
      ?.split("=")[1] ?? null
  );
}

function numberOrNull(value: string) {
  if (!value || value === "all") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function filterPayload(filters: FilterState): ContactFilters {
  return {
    q: filters.q.trim(),
    commonCount: numberOrNull(filters.commonCount),
    minCommonCount: numberOrNull(filters.minCommonCount),
    maxCommonCount: numberOrNull(filters.maxCommonCount),
    registrationStatus: filters.registrationStatus,
  };
}

function contactFilterParams(filters: FilterState) {
  const payload = filterPayload(filters);
  const params = new URLSearchParams();

  if (payload.q) params.set("q", payload.q);
  if (payload.commonCount !== null)
    params.set("commonCount", String(payload.commonCount));
  if (payload.minCommonCount !== null)
    params.set("minCommonCount", String(payload.minCommonCount));
  if (payload.maxCommonCount !== null)
    params.set("maxCommonCount", String(payload.maxCommonCount));
  if (payload.registrationStatus !== "all") {
    params.set("registrationStatus", payload.registrationStatus);
  }

  return params;
}

function listParams(filters: FilterState, page: number, limit: number) {
  const params = contactFilterParams(filters);
  params.set("page", String(page));
  params.set("limit", String(limit));
  return params;
}

async function requestJson(
  path: string,
  body?: Record<string, unknown>,
  method = "GET",
) {
  const token = getAdminToken();
  const response = await fetch(path, {
    method,
    headers: {
      "content-type": "application/json",
      "x-vendero-env": APP_ENV,
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
  return unwrapPayload(payload);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("en-IN").format(Number(value ?? 0));
}

function registrationTone(isRegistered: boolean) {
  return isRegistered ? "success" : "secondary";
}

function initialFilterState(data: ContactIntelligenceData | null): FilterState {
  const filters = data?.filters;
  if (!filters) return emptyFilters;

  return {
    q: filters.q ?? "",
    commonCount:
      filters.commonCount === null ? "all" : String(filters.commonCount),
    minCommonCount:
      filters.minCommonCount === null ? "" : String(filters.minCommonCount),
    maxCommonCount:
      filters.maxCommonCount === null ? "" : String(filters.maxCommonCount),
    registrationStatus: filters.registrationStatus ?? "all",
  };
}

function AdminModal({
  open,
  title,
  description,
  children,
  footer,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl rounded-lg border border-border bg-card shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border/70 p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Contact Data
            </p>
            <h2 className="mt-2 text-xl font-semibold">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} title="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="max-h-[70vh] overflow-auto p-5">{children}</div>
        {footer ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-border/70 p-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ContactDataPanel({
  initialData,
}: {
  initialData: ContactIntelligenceData | null;
}) {
  const [data, setData] = useState<ContactIntelligenceData | null>(initialData);
  const [filters, setFilters] = useState<FilterState>(() =>
    initialFilterState(initialData),
  );
  const [datasetName, setDatasetName] = useState("");
  const [datasetPurpose, setDatasetPurpose] = useState("marketing");
  const [datasetDescription, setDatasetDescription] = useState("");
  const [maxItems, setMaxItems] = useState("10000");
  const [pageSize, setPageSize] = useState(initialData?.pagination.limit ?? 50);
  const [working, setWorking] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [datasetOpen, setDatasetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const summary = data?.summary ?? defaultSummary;
  const contacts = data?.contacts ?? [];
  const datasets = data?.datasets ?? [];
  const appliedFilterState = useMemo(() => initialFilterState(data), [data]);
  const appliedPayload = useMemo(
    () => filterPayload(appliedFilterState),
    [appliedFilterState],
  );
  const pagination = data?.pagination ?? {
    page: 1,
    limit: pageSize,
    total: contacts.length,
    totalPages: 1,
  };
  const firstVisible =
    pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const lastVisible = Math.min(
    pagination.total,
    (pagination.page - 1) * pagination.limit + contacts.length,
  );
  const summaryCards = [
    { label: "Total numbers", value: formatNumber(summary.total) },
    { label: "Registered numbers", value: formatNumber(summary.registered) },
    {
      label: "Unregistered numbers",
      value: formatNumber(summary.unregistered),
    },
    {
      label: "Unregistered common",
      value: formatNumber(summary.unregisteredCommon),
    },
  ];
  const activeFilterLabels = [
    appliedPayload.q ? `Search: ${appliedPayload.q}` : null,
    appliedPayload.commonCount !== null
      ? `Common = ${appliedPayload.commonCount}`
      : null,
    appliedPayload.minCommonCount !== null
      ? `Min common ${appliedPayload.minCommonCount}`
      : null,
    appliedPayload.maxCommonCount !== null
      ? `Max common ${appliedPayload.maxCommonCount}`
      : null,
    appliedPayload.registrationStatus === "registered"
      ? "Registered only"
      : null,
    appliedPayload.registrationStatus === "unregistered"
      ? "Unregistered only"
      : null,
  ].filter(Boolean) as string[];

  function updateFilter(key: keyof FilterState, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  async function refresh(nextFilters = filters, page = 1, limit = pageSize) {
    setWorking(true);
    setError(null);
    setMessage(null);
    try {
      const params = listParams(nextFilters, page, limit);
      const nextData = (await requestJson(
        `/api/v1/admin/contact-intelligence?${params.toString()}`,
      )) as ContactIntelligenceData;
      setData(nextData);
      setPageSize(nextData.pagination.limit);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load contacts",
      );
    } finally {
      setWorking(false);
    }
  }

  async function downloadContacts(format: "csv" | "xls", datasetId?: number) {
    const key = datasetId ? `${datasetId}-${format}` : format;
    setExporting(key);
    setError(null);
    setMessage(null);
    try {
      const token = getAdminToken();
      const params = datasetId
        ? new URLSearchParams()
        : contactFilterParams(appliedFilterState);
      params.set("format", format);
      params.set("limit", "50000");
      const path = datasetId
        ? `/api/v1/admin/contact-intelligence/datasets/${datasetId}/export?${params.toString()}`
        : `/api/v1/admin/contact-intelligence/export?${params.toString()}`;
      const response = await fetch(path, {
        headers: {
          "x-vendero-env": APP_ENV,
          authorization: token ? `Bearer ${token}` : "",
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload?.message ?? payload?.error?.message ?? "Export failed",
        );
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const filename =
        disposition.match(/filename="([^"]+)"/)?.[1] ??
        `vendero-contact-${datasetId ?? "data"}.${format}`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Export failed",
      );
    } finally {
      setExporting(null);
    }
  }

  async function createDataset() {
    if (!datasetName.trim()) {
      setError("Dataset name is required");
      return;
    }

    setCreating(true);
    setError(null);
    setMessage(null);
    try {
      const dataset = (await requestJson(
        "/api/v1/admin/contact-intelligence/datasets",
        {
          name: datasetName.trim(),
          description: datasetDescription.trim() || null,
          purpose: datasetPurpose.trim() || "marketing",
          maxItems: Number(maxItems) || 10000,
          filters: appliedPayload,
        },
        "POST",
      )) as ContactDataset;

      setData((current) =>
        current
          ? { ...current, datasets: [dataset, ...current.datasets] }
          : current,
      );
      setDatasetName("");
      setDatasetDescription("");
      setDatasetOpen(false);
      setMessage(
        `Dataset created with ${formatNumber(dataset.contactCount)} contacts`,
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create dataset",
      );
    } finally {
      setCreating(false);
    }
  }

  function resetFilters() {
    setFilters(emptyFilters);
    setFiltersOpen(false);
    void refresh(emptyFilters, 1);
  }

  function applyFilters() {
    setFiltersOpen(false);
    void refresh(filters, 1);
  }

  function refreshCurrentPage() {
    void refresh(appliedFilterState, pagination.page, pagination.limit);
  }

  function goToPage(page: number) {
    const safePage = Math.max(1, Math.min(pagination.totalPages, page));
    if (safePage === pagination.page || working) return;
    void refresh(appliedFilterState, safePage, pagination.limit);
  }

  function changePageSize(value: string) {
    const limit = Number(value) || 50;
    setPageSize(limit);
    void refresh(appliedFilterState, 1, limit);
  }

  function openFilters() {
    setFilters(appliedFilterState);
    setFiltersOpen(true);
  }

  function closeFilters() {
    setFilters(appliedFilterState);
    setFiltersOpen(false);
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.label} className="border-border/70 bg-card/80">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/70 bg-card/80">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardDescription className="uppercase tracking-[0.2em] text-muted-foreground">
                Contact Data
              </CardDescription>
              <CardTitle className="mt-2 text-2xl">Contact numbers</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                Showing {formatNumber(firstVisible)}-{formatNumber(lastVisible)}{" "}
                of {formatNumber(pagination.total)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={openFilters}
                disabled={working}
              >
                <Filter className="h-4 w-4" />
                Filter
              </Button>
              <Button
                variant="outline"
                onClick={() => setDatasetOpen(true)}
                disabled={working}
              >
                <Plus className="h-4 w-4" />
                Create Dataset
              </Button>
              <Button
                variant="outline"
                onClick={refreshCurrentPage}
                disabled={working}
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button
                variant="outline"
                onClick={() => void downloadContacts("csv")}
                disabled={exporting !== null}
              >
                <FileDown className="h-4 w-4" />
                CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => void downloadContacts("xls")}
                disabled={exporting !== null}
              >
                <Download className="h-4 w-4" />
                XLS
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {activeFilterLabels.length ? (
              activeFilterLabels.map((label) => (
                <Badge key={label} variant="outline">
                  {label}
                </Badge>
              ))
            ) : (
              <span>All contact numbers</span>
            )}
          </div>

          {error ? (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </div>
          ) : null}
          {message ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              {message}
            </div>
          ) : null}
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/30 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => goToPage(1)}
                disabled={working || pagination.page <= 1}
                title="First page"
              >
                <ChevronsLeft className="h-4 w-4" />
                First
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => goToPage(pagination.page - 1)}
                disabled={working || pagination.page <= 1}
                title="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => goToPage(pagination.page + 1)}
                disabled={working || pagination.page >= pagination.totalPages}
                title="Next page"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => goToPage(pagination.totalPages)}
                disabled={working || pagination.page >= pagination.totalPages}
                title="Last page"
              >
                Last
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>
                Page {formatNumber(pagination.page)} of{" "}
                {formatNumber(pagination.totalPages)}
              </span>
              <span>Updated {formatDate(data?.generatedAt)}</span>
              <label className="flex items-center gap-2">
                Rows
                <select
                  className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
                  value={pageSize}
                  onChange={(event) => changePageSize(event.target.value)}
                  disabled={working}
                >
                  {[50, 100, 200].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="max-h-[760px] overflow-auto rounded-lg border border-border/70">
            <table className="w-full min-w-[1120px] text-left text-sm">
              <thead className="sticky top-0 bg-background text-xs uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Saved name</th>
                  <th className="px-4 py-3 font-medium">Common</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">All names</th>
                  <th className="px-4 py-3 font-medium">Registered name</th>
                  <th className="px-4 py-3 font-medium">Last sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {contacts.map((contact) => (
                  <tr key={contact.id} className="bg-card/35">
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {contact.phoneE164 ?? contact.phone ?? "-"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {contact.phoneSearch ?? contact.nationalNumber ?? "-"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="max-w-[220px] truncate font-medium">
                        {contact.sampleNames[0] ?? "-"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{contact.commonCount}</Badge>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatNumber(contact.totalSyncs)} syncs
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={registrationTone(contact.isRegistered)}>
                        {contact.isRegistered ? "Registered" : "Not registered"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <p className="max-w-[260px] truncate">
                        {contact.sampleNames.length
                          ? contact.sampleNames.join(", ")
                          : "-"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatNumber(contact.sourceCount)} users
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="max-w-[220px] truncate">
                        {contact.registeredBusinessName ??
                          contact.registeredName ??
                          "-"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {contact.registeredVendorProfileId
                          ? `Vendor #${contact.registeredVendorProfileId}`
                          : contact.registeredUserId
                            ? `User #${contact.registeredUserId}`
                            : "-"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(contact.lastSyncedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!contacts.length ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No contacts match the current filter.
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <AdminModal
        open={filtersOpen}
        title="Filter contacts"
        description="Search and filter the full stored contact database."
        onClose={closeFilters}
        footer={
          <>
            <Button variant="outline" onClick={resetFilters} disabled={working}>
              Reset
            </Button>
            <Button onClick={applyFilters} disabled={working}>
              <Filter className="h-4 w-4" />
              Apply Filter
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={filters.q}
              onChange={(event) => updateFilter("q", event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applyFilters();
              }}
              placeholder="Search phone or saved contact name"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Common count</span>
              <select
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                value={filters.commonCount}
                onChange={(event) =>
                  updateFilter("commonCount", event.target.value)
                }
              >
                <option value="all">Any common count</option>
                {[1, 2, 3, 4, 5].map((count) => (
                  <option key={count} value={count}>
                    Common count {count}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Registration</span>
              <select
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                value={filters.registrationStatus}
                onChange={(event) =>
                  updateFilter("registrationStatus", event.target.value)
                }
              >
                <option value="all">All numbers</option>
                <option value="registered">Registered on Vendero</option>
                <option value="unregistered">Not registered</option>
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Min common count</span>
              <Input
                type="number"
                min={0}
                value={filters.minCommonCount}
                onChange={(event) =>
                  updateFilter("minCommonCount", event.target.value)
                }
                placeholder="0"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Max common count</span>
              <Input
                type="number"
                min={0}
                value={filters.maxCommonCount}
                onChange={(event) =>
                  updateFilter("maxCommonCount", event.target.value)
                }
                placeholder="No limit"
              />
            </label>
          </div>
        </div>
      </AdminModal>

      <AdminModal
        open={datasetOpen}
        title="Create contact dataset"
        description="Save the current filter as a group for later marketing exports."
        onClose={() => setDatasetOpen(false)}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setDatasetOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button onClick={() => void createDataset()} disabled={creating}>
              <Plus className="h-4 w-4" />
              Create Dataset
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="space-y-3">
            <Input
              value={datasetName}
              onChange={(event) => setDatasetName(event.target.value)}
              placeholder="Dataset name"
            />
            <div className="grid gap-3 md:grid-cols-[1fr_140px]">
              <Input
                value={datasetPurpose}
                onChange={(event) => setDatasetPurpose(event.target.value)}
                placeholder="Purpose"
              />
              <Input
                type="number"
                min={1}
                max={50000}
                value={maxItems}
                onChange={(event) => setMaxItems(event.target.value)}
                placeholder="Max"
              />
            </div>
            <Input
              value={datasetDescription}
              onChange={(event) => setDatasetDescription(event.target.value)}
              placeholder="Description"
            />
            <div className="rounded-lg border border-border/70 bg-background/30 p-3 text-sm">
              <p className="mb-2 text-muted-foreground">
                Dataset will use current table filters:
              </p>
              <div className="flex flex-wrap gap-2">
                {activeFilterLabels.length ? (
                  activeFilterLabels.map((label) => (
                    <Badge key={label} variant="outline">
                      {label}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline">All contacts</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-border/70 pt-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-medium">Saved datasets</h3>
              <Badge variant="outline">{formatNumber(datasets.length)}</Badge>
            </div>
            <div className="space-y-3">
              {datasets.map((dataset) => (
                <div
                  key={dataset.id}
                  className="rounded-lg border border-border/70 bg-background/30 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{dataset.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatNumber(dataset.contactCount)} contacts /{" "}
                        {dataset.purpose}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(dataset.createdAt)}
                        {dataset.createdByName
                          ? ` / ${dataset.createdByName}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void downloadContacts("csv", dataset.id)}
                        disabled={exporting !== null}
                      >
                        CSV
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void downloadContacts("xls", dataset.id)}
                        disabled={exporting !== null}
                      >
                        XLS
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {!datasets.length ? (
                <div className="rounded-lg border border-border/70 bg-background/30 p-6 text-center text-sm text-muted-foreground">
                  No datasets created yet.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </AdminModal>
    </section>
  );
}
