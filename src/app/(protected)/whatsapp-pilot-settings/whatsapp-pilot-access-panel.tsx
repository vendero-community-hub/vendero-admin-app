"use client";

import { useState } from "react";
import {
  Globe2,
  KeyRound,
  Loader2,
  Search,
  ShieldCheck,
  UserPlus,
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
import { Switch } from "@/components/ui/switch";
import { useActionModal } from "@/components/ui/action-modal";

export type WhatsPilotAccessVendor = {
  vendorProfileId: number;
  businessName: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  enabled: boolean;
  note: string | null;
  updatedAt?: string | null;
  userActive: boolean;
};

export type WhatsPilotAccessSettings = {
  environment: string;
  globalAccessEnabled: boolean;
  updatedAt: string | null;
  vendors: WhatsPilotAccessVendor[];
};

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
  return payload.data?.data ?? payload.data;
}

function VendorIdentity({ vendor }: { vendor: WhatsPilotAccessVendor }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-medium">
        {vendor.businessName || `Vendor #${vendor.vendorProfileId}`}
      </p>
      <p className="truncate text-xs text-muted-foreground">
        #{vendor.vendorProfileId} · {vendor.contactName || "No contact name"}
        {vendor.city ? ` · ${vendor.city}` : ""}
      </p>
      <p className="truncate text-xs text-muted-foreground">
        {vendor.phone || vendor.email || "No contact details"}
      </p>
    </div>
  );
}

export function WhatsPilotAccessPanel({
  initialSettings,
}: {
  initialSettings: WhatsPilotAccessSettings | null;
}) {
  const [settings, setSettings] = useState<WhatsPilotAccessSettings | null>(
    initialSettings,
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WhatsPilotAccessVendor[]>([]);
  const [working, setWorking] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const actionModal = useActionModal();

  async function refreshOverview() {
    const next = (await apiRequest(
      "/api/v1/admin/whatsapp-pilot/access-settings",
    )) as WhatsPilotAccessSettings;
    setSettings(next);
  }

  async function updateGlobal(enabled: boolean) {
    const confirmed = await actionModal.confirm({
      title: enabled
        ? "Unlock WhatsPilot for every vendor?"
        : "Return to vendor-only access?",
      description: enabled
        ? "Every active vendor account in this production environment will immediately be able to open and use WhatsPilot."
        : "Only vendors in the early-access list will keep access. Other vendors will see the locked screen.",
      confirmLabel: enabled
        ? "Unlock for all vendors"
        : "Use vendor-only access",
      variant: enabled ? "danger" : "default",
    });
    if (!confirmed) return;

    setWorking("global");
    setError(null);
    setMessage(null);
    try {
      const next = (await apiRequest(
        "/api/v1/admin/whatsapp-pilot/access-settings",
        {
          method: "PUT",
          body: JSON.stringify({ enabled }),
        },
      )) as WhatsPilotAccessSettings;
      setSettings(next);
      setMessage(
        enabled
          ? "WhatsPilot is now unlocked for all vendors."
          : "WhatsPilot is now limited to approved vendors.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to update global access",
      );
    } finally {
      setWorking(null);
    }
  }

  async function searchVendors() {
    const normalized = query.trim();
    if (normalized.length < 2) {
      setError("Enter at least two characters to search vendors.");
      return;
    }
    setWorking("search");
    setError(null);
    try {
      const data = (await apiRequest(
        `/api/v1/admin/whatsapp-pilot/vendor-access/search?q=${encodeURIComponent(normalized)}`,
      )) as WhatsPilotAccessVendor[];
      setResults(data);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Vendor search failed",
      );
    } finally {
      setWorking(null);
    }
  }

  async function updateVendor(
    vendor: WhatsPilotAccessVendor,
    enabled: boolean,
  ) {
    const confirmed =
      enabled ||
      (await actionModal.confirm({
        title: `Remove access for ${vendor.businessName}?`,
        description:
          "The vendor will immediately return to the WhatsPilot locked screen and API requests will be denied.",
        confirmLabel: "Remove access",
        variant: "danger",
      }));
    if (!confirmed) return;

    setWorking(`vendor-${vendor.vendorProfileId}`);
    setError(null);
    setMessage(null);
    try {
      await apiRequest(
        `/api/v1/admin/whatsapp-pilot/vendor-access/${vendor.vendorProfileId}`,
        {
          method: "PUT",
          body: JSON.stringify({
            enabled,
            note: enabled
              ? "Granted from WhatsPilot admin access panel"
              : "Revoked from WhatsPilot admin access panel",
          }),
        },
      );
      setResults((current) =>
        current.map((item) =>
          item.vendorProfileId === vendor.vendorProfileId
            ? { ...item, enabled }
            : item,
        ),
      );
      await refreshOverview();
      setMessage(
        enabled
          ? `Access granted to ${vendor.businessName}.`
          : `Access removed from ${vendor.businessName}.`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to update vendor access",
      );
    } finally {
      setWorking(null);
    }
  }

  return (
    <>
      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-blue-500/25 bg-blue-500/10 p-2.5 text-blue-500">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              WhatsPilot access control
            </h1>
            <p className="text-sm text-muted-foreground">
              Grant early access per vendor, or unlock the product globally
              after Meta approval.
            </p>
          </div>
        </div>
      </section>

      {error ? (
        <div className="flex gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-500">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="flex gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-600">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          {message}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Global production access</CardTitle>
                <CardDescription>
                  One switch controls access for every vendor in{" "}
                  {settings?.environment ?? "this environment"}.
                </CardDescription>
              </div>
              <Globe2 className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border p-4">
              <div>
                <p className="font-medium">Unlock for all vendors</p>
                <p className="text-xs text-muted-foreground">
                  Overrides the individual early-access list.
                </p>
              </div>
              {working === "global" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Switch
                  checked={settings?.globalAccessEnabled ?? false}
                  onCheckedChange={updateGlobal}
                />
              )}
            </div>
            <Badge
              variant={settings?.globalAccessEnabled ? "success" : "secondary"}
            >
              {settings?.globalAccessEnabled
                ? "Globally unlocked"
                : "Vendor allowlist only"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Grant a vendor early access</CardTitle>
            <CardDescription>
              Search by business name, contact, phone, email, or vendor ID
              details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") searchVendors();
                  }}
                  className="pl-9"
                  placeholder="Search vendors…"
                />
              </div>
              <Button
                variant="outline"
                onClick={searchVendors}
                disabled={working === "search"}
              >
                {working === "search" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Search"
                )}
              </Button>
            </div>
            {results.length ? (
              <div className="divide-y rounded-lg border">
                {results.map((vendor) => (
                  <div
                    key={vendor.vendorProfileId}
                    className="flex items-center justify-between gap-4 p-3"
                  >
                    <VendorIdentity vendor={vendor} />
                    <Button
                      size="sm"
                      variant={vendor.enabled ? "outline" : "default"}
                      disabled={working === `vendor-${vendor.vendorProfileId}`}
                      onClick={() => updateVendor(vendor, !vendor.enabled)}
                    >
                      {working === `vendor-${vendor.vendorProfileId}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : vendor.enabled ? (
                        "Remove"
                      ) : (
                        <>
                          <UserPlus className="mr-1.5 h-4 w-4" />
                          Grant
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendors with early access</CardTitle>
          <CardDescription>
            These vendors retain access while the global switch is off.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {settings?.vendors.length ? (
            <div className="divide-y rounded-lg border">
              {settings.vendors.map((vendor) => (
                <div
                  key={vendor.vendorProfileId}
                  className="flex items-center justify-between gap-4 p-3"
                >
                  <VendorIdentity vendor={vendor} />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={working === `vendor-${vendor.vendorProfileId}`}
                    onClick={() => updateVendor(vendor, false)}
                  >
                    Remove access
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No vendors have early access yet.
            </p>
          )}
        </CardContent>
      </Card>
      {actionModal.modal}
    </>
  );
}
