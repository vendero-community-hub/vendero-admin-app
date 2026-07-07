"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  Car,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Lock,
  PauseCircle,
  Radar,
  RotateCcw,
  Settings2,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useActionModal } from "@/components/ui/action-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type GrowthFeatureStatus = "locked" | "requested" | "needs_setup" | "enabled" | "paused" | string;

export type SiteGrowthFeature = {
  key: string;
  category: "analytics" | "conversion" | "operations" | "widgets" | "corporate";
  title: string;
  priceLabel: string;
  publicWidget: boolean;
  requiredAddon: string;
  status: GrowthFeatureStatus;
  enabled: boolean;
  vendorVisibleStatus: string;
  metrics: Record<string, number | string | boolean | null>;
  warnings: Array<{ code: string; severity: string; message: string }>;
  config?: Record<string, unknown>;
  ownership?: Record<string, unknown>;
  logs?: Array<Record<string, unknown>>;
  requestedAt?: string | null;
  enabledAt?: string | null;
  pausedAt?: string | null;
  detailHref?: string;
};

export type SiteGrowthSite = {
  id: number;
  label: string;
  vendor: string;
  theme: string;
  status: string;
  domain: string;
  features: SiteGrowthFeature[];
  warnings: Array<{ featureKey: string; code: string; severity: string; message: string }>;
};

export type SiteGrowthData = {
  catalog: Array<Pick<SiteGrowthFeature, "key" | "category" | "title" | "priceLabel" | "publicWidget" | "requiredAddon">>;
  categories: Array<{ key: SiteGrowthFeature["category"]; label: string }>;
  tabs: Array<{ key: SiteGrowthFeature["category"]; label: string; featureKeys: string[] }>;
  summary: {
    sites: number;
    featureCount: number;
    enabledCount: number;
    requestedCount: number;
    needsSetupCount: number;
    warningCount: number;
  };
  sites: SiteGrowthSite[];
} | null;

function getAdminToken() {
  const tokenEntry = document.cookie
    .split("; ")
    .find((part) => part.startsWith("vendero_admin_access_token="));
  return tokenEntry?.split("=")[1] ?? null;
}

async function requestJson(path: string, body?: Record<string, unknown>, method = "GET") {
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
  if (!response.ok) throw new Error(payload?.message ?? "Request failed");
  return payload?.data?.data ?? payload?.data ?? payload;
}

function formatLabel(value: string) {
  return value.replace(/[_-]+/g, " ");
}

function formatCount(value: unknown) {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
    Number.isFinite(number) ? number : 0,
  );
}

function badgeVariant(value: string) {
  if (["enabled", "active", "success", "approved"].includes(value)) return "success";
  if (["requested", "needs_setup", "warning", "paused"].includes(value)) return "warning";
  if (["danger", "failed", "locked"].includes(value)) return "danger";
  return "outline";
}

function metricPreview(metrics: Record<string, unknown>) {
  const entries = Object.entries(metrics).filter(([, value]) => value !== null && value !== undefined);
  return entries.slice(0, 4);
}

function formatDate(value: unknown) {
  const date = value ? new Date(String(value)) : null;
  if (!date || Number.isNaN(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function jsonPreview(value: unknown) {
  const record = value && typeof value === "object" ? value : {};
  const text = JSON.stringify(record, null, 2);
  return text === "{}" ? "No configuration saved yet." : text;
}

function fallbackData(): NonNullable<SiteGrowthData> {
  return {
    catalog: [],
    categories: [
      { key: "analytics", label: "Analytics" },
      { key: "conversion", label: "Conversion" },
      { key: "operations", label: "Operations" },
      { key: "widgets", label: "Widgets" },
      { key: "corporate", label: "Corporate" },
    ],
    tabs: [],
    summary: {
      sites: 0,
      featureCount: 0,
      enabledCount: 0,
      requestedCount: 0,
      needsSetupCount: 0,
      warningCount: 0,
    },
    sites: [],
  };
}

function categoryIcon(category: string) {
  if (category === "analytics") return BarChart3;
  if (category === "conversion") return Radar;
  if (category === "operations") return Wrench;
  if (category === "corporate") return ClipboardList;
  return Sparkles;
}

function FeatureDetailSections({ feature, site }: { feature: SiteGrowthFeature; site: SiteGrowthSite }) {
  const metricRows = Object.entries(feature.metrics ?? {});
  const logs = Array.isArray(feature.logs) ? feature.logs : [];
  const ownership = feature.ownership ?? {};
  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <article className="rounded-xl border border-border/70 bg-background/30 p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Overview</p>
          <h3 className="mt-2 font-semibold">{feature.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {feature.priceLabel} for {site.label}. Vendor status is {formatLabel(feature.vendorVisibleStatus)}.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant={badgeVariant(feature.status)}>{formatLabel(feature.status)}</Badge>
            <Badge variant={feature.enabled ? "success" : "outline"}>
              {feature.enabled ? "Enabled" : "Not enabled"}
            </Badge>
            <Badge variant="outline">{feature.publicWidget ? "Public widget" : "Admin automation"}</Badge>
          </div>
        </article>

        <article className="rounded-xl border border-border/70 bg-background/30 p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Enablement History</p>
          <dl className="mt-3 grid gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Requested</dt>
              <dd>{formatDate(feature.requestedAt)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Enabled</dt>
              <dd>{formatDate(feature.enabledAt)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Paused</dt>
              <dd>{formatDate(feature.pausedAt)}</dd>
            </div>
          </dl>
        </article>

        <article className="rounded-xl border border-border/70 bg-background/30 p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Configuration</p>
          <pre className="mt-3 max-h-64 overflow-auto rounded-lg border border-border/70 bg-card/60 p-3 text-xs text-muted-foreground">
            {jsonPreview(feature.config)}
          </pre>
        </article>

        <article className="rounded-xl border border-border/70 bg-background/30 p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Ownership</p>
          <pre className="mt-3 max-h-64 overflow-auto rounded-lg border border-border/70 bg-card/60 p-3 text-xs text-muted-foreground">
            {jsonPreview(ownership)}
          </pre>
        </article>
      </div>

      <article className="rounded-xl border border-border/70 bg-background/30 p-4">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Analytics</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {metricRows.length ? (
            metricRows.map(([key, value]) => (
              <div key={key} className="rounded-lg border border-border/70 bg-card/60 p-3">
                <p className="text-xs uppercase text-muted-foreground">{formatLabel(key)}</p>
                <p className="mt-1 text-lg font-semibold">{formatCount(value)}</p>
              </div>
            ))
          ) : (
            <p className="rounded-lg border border-dashed border-border/70 p-3 text-sm text-muted-foreground">
              No analytics rows yet.
            </p>
          )}
        </div>
      </article>

      <details className="rounded-xl border border-border/70 bg-background/30 p-4">
        <summary className="cursor-pointer text-sm font-semibold">Event and log inspection</summary>
        <div className="mt-3 space-y-2">
          {logs.length ? (
            logs.slice(0, 12).map((log, index) => (
              <pre key={index} className="overflow-auto rounded-lg border border-border/70 bg-card/60 p-3 text-xs text-muted-foreground">
                {JSON.stringify(log, null, 2)}
              </pre>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No event logs recorded for this feature yet.</p>
          )}
        </div>
      </details>
    </div>
  );
}

export function SiteGrowthPanel({
  initialData,
  focusFeatureKey,
}: {
  initialData: SiteGrowthData;
  focusFeatureKey?: string;
}) {
  const actionModal = useActionModal();
  const [data, setData] = useState<NonNullable<SiteGrowthData>>(initialData ?? fallbackData());
  const initialFeature = data.catalog.find((feature) => feature.key === focusFeatureKey);
  const [activeCategory, setActiveCategory] = useState<SiteGrowthFeature["category"]>(
    initialFeature?.category ?? "analytics",
  );
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(data.sites[0]?.id ?? null);
  const [message, setMessage] = useState("");

  const selectedSite = useMemo(
    () => data.sites.find((site) => site.id === selectedSiteId) ?? data.sites[0] ?? null,
    [data.sites, selectedSiteId],
  );
  const visibleFeatures = useMemo(() => {
    const rows = selectedSite?.features ?? [];
    return rows.filter((feature) =>
      focusFeatureKey ? feature.key === focusFeatureKey : feature.category === activeCategory,
    );
  }, [activeCategory, focusFeatureKey, selectedSite]);

  async function refreshData() {
    const next = (await requestJson("/api/v1/admin/vendero-sites/growth-features")) as NonNullable<SiteGrowthData>;
    setData(next);
    if (!selectedSiteId && next.sites[0]) setSelectedSiteId(next.sites[0].id);
    return next;
  }

  async function updateFeature(feature: SiteGrowthFeature, action: string) {
    if (!selectedSite) return;
    const confirmed = await actionModal.confirm({
      title: `${formatLabel(action)} ${feature.title}`,
      description: `${selectedSite.label} will show ${formatLabel(action)} to admins and vendors for this paid feature.`,
      confirmLabel: formatLabel(action),
    });
    if (!confirmed) return;

    setMessage("");
    try {
      await requestJson(
        `/api/v1/admin/vendero-sites/vendor-sites/${selectedSite.id}/growth-features/${feature.key}`,
        {
          action,
          config: {
            publicWidgetEnabled: feature.publicWidget,
            safeUrgency: feature.key === "urgency_booking_trigger",
            callWhatsappFallback: true,
          },
          ownership: {
            purchased: action === "enable",
            requiredAddon: feature.requiredAddon,
          },
        },
        "PUT",
      );
      await refreshData();
      setMessage(`${feature.title} updated for ${selectedSite.label}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Growth feature update failed");
    }
  }

  const tabs = data.categories.length ? data.categories : fallbackData().categories;

  return (
    <section className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Taxi And Travel Growth
            </Badge>
            <CardTitle className="text-3xl">Growth Features</CardTitle>
            <CardDescription className="max-w-3xl leading-7">
              Enable paid taxi and travel growth features per vendor site, review live analytics,
              and keep public widgets safe for showcase-only sites.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Rollout Snapshot</CardTitle>
            <CardDescription>Enabled, requested, setup, and warning states.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["Sites", data.summary.sites],
              ["Enabled", data.summary.enabledCount],
              ["Requested", data.summary.requestedCount],
              ["Warnings", data.summary.warningCount],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-border/70 bg-background/30 p-3">
                <p className="text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-semibold">{formatCount(value)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {message ? (
        <div className="rounded-xl border border-border/70 bg-card/70 px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
        <aside className="space-y-3">
          <Card className="border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle>Vendor Sites</CardTitle>
              <CardDescription>Choose a site to configure.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.sites.length ? (
                data.sites.map((site) => (
                  <button
                    key={site.id}
                    type="button"
                    className={`w-full rounded-lg border px-3 py-3 text-left text-sm transition ${
                      selectedSite?.id === site.id
                        ? "border-primary bg-primary/10"
                        : "border-border/70 bg-background/30 hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedSiteId(site.id)}
                  >
                    <span className="block font-semibold">{site.label}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{site.vendor}</span>
                  </button>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                  No vendor sites found.
                </p>
              )}
            </CardContent>
          </Card>
        </aside>

        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-border/70 bg-card/70 p-1">
            <div className="flex min-w-max gap-1">
              {tabs.map((tab) => {
                const Icon = categoryIcon(tab.key);
                return (
                  <button
                    key={tab.key}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      activeCategory === tab.key
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    }`}
                    type="button"
                    onClick={() => setActiveCategory(tab.key)}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedSite ? (
            <Card className="border-border/70 bg-card/80">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>{selectedSite.label}</CardTitle>
                  <CardDescription>
                    {selectedSite.vendor} · {selectedSite.theme} · {selectedSite.domain || "No domain"}
                  </CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => void refreshData()}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedSite.warnings.length ? (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                    <div className="flex items-start gap-2 text-sm text-amber-100">
                      <AlertTriangle className="mt-0.5 h-4 w-4" />
                      <div>
                        <p className="font-semibold">Warnings need review before public launch.</p>
                        <p className="mt-1 text-amber-100/80">
                          {selectedSite.warnings.length} warning(s) across consent, template approval,
                          inventory, urgency, and fare freshness.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-3 lg:grid-cols-2">
                  {visibleFeatures.map((feature) => {
                    const Icon = categoryIcon(feature.category);
                    return (
                      <article key={feature.key} className="rounded-xl border border-border/70 bg-background/30 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Icon className="h-4 w-4 text-primary" />
                              <h2 className="font-semibold">{feature.title}</h2>
                              {focusFeatureKey ? (
                                <Badge variant="outline">Detail page</Badge>
                              ) : null}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {feature.priceLabel} · {feature.publicWidget ? "public widget" : "admin automation"}
                            </p>
                          </div>
                          <Badge variant={badgeVariant(feature.status)}>{formatLabel(feature.status)}</Badge>
                        </div>

                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          {metricPreview(feature.metrics).map(([key, value]) => (
                            <div key={key} className="rounded-lg border border-border/70 bg-card/60 p-3">
                              <p className="text-xs uppercase text-muted-foreground">{formatLabel(key)}</p>
                              <p className="mt-1 text-xl font-semibold">{formatCount(value)}</p>
                            </div>
                          ))}
                          {!metricPreview(feature.metrics).length ? (
                            <div className="rounded-lg border border-dashed border-border/70 p-3 text-sm text-muted-foreground">
                              No data yet.
                            </div>
                          ) : null}
                        </div>

                        {feature.warnings.length ? (
                          <div className="mt-4 space-y-2">
                            {feature.warnings.map((warning) => (
                              <div key={warning.code} className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                                <p className="font-semibold">{formatLabel(warning.code)}</p>
                                <p className="mt-1 text-amber-100/80">{warning.message}</p>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => void updateFeature(feature, "enable")}>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Enable
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => void updateFeature(feature, "request")}>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Request
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => void updateFeature(feature, "needs_setup")}>
                            <Settings2 className="mr-2 h-4 w-4" />
                            Needs setup
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => void updateFeature(feature, "pause")}>
                            <PauseCircle className="mr-2 h-4 w-4" />
                            Pause
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => void updateFeature(feature, "disable")}>
                            <Lock className="mr-2 h-4 w-4" />
                            Lock
                          </Button>
                          {!focusFeatureKey ? (
                            <Button asChild size="sm" variant="ghost">
                              <Link href={`/site-growth/${feature.key}?siteId=${selectedSite.id}`}>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Detail
                              </Link>
                            </Button>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>

                {focusFeatureKey && visibleFeatures[0] ? (
                  <FeatureDetailSections feature={visibleFeatures[0]} site={selectedSite} />
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {actionModal.modal}
    </section>
  );
}
