"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  formatLabel,
  requestJson,
  type SiteTheme,
  type SiteThemeComponent,
  type SiteThemesData,
} from "./site-themes-panel";
import { whiteLabelWebUrl } from "@/lib/environment";
import { fixedComponentForKey } from "@/lib/site-fixed-components";
import { uploadAdminMedia } from "@/lib/trusted-media";

type ThemeWizardStep = "details" | "settings";

type AddonForm = {
  name: string;
  price: string;
  description: string;
};

type ThemeDetailsForm = {
  slug: string;
  name: string;
  bannerImageObjectKeys: string;
  bannerImageUrls: string;
  themeType: string;
  rendererKey: string;
  shortDescription: string;
  description: string;
  oneTimePrice: string;
  currency: string;
  status: "draft" | "live" | "hidden";
  isActive: boolean;
  sortOrder: string;
  testVendorIds: string;
  pageBg: string;
  font: string;
  primaryActionBg: string;
  primaryActionFont: string;
  customizationOptions: string[];
  addonServices: AddonForm[];
  generateDefaultStructure: boolean;
};

const themeTypes = ["static", "dynamic", "dynamic-checkout"];

const customizationOptions = [
  { key: "content", label: "Theme content" },
  { key: "colorSchema", label: "Color schema" },
  { key: "assets", label: "Theme assets" },
  { key: "businessData", label: "Business data" },
  { key: "tripCalculator", label: "Trip calculator" },
  { key: "services", label: "Services" },
  { key: "routes", label: "Trips and routes" },
  { key: "seo", label: "SEO content" },
];

const defaultStoreSearch = fixedComponentForKey("store-search");

const defaultComponents = [
  {
    componentKey: "brand-header",
    name: "Brand Header",
    componentType: "header",
    rendererKey: "brand-header",
    defaultProps: {
      title: "Vendero Cabs",
      actionLabel: "Call now",
      navItems: ["Home", "Routes", "Cabs", "Contact"],
    },
  },
  {
    componentKey: defaultStoreSearch?.componentKey ?? "store-search",
    name: defaultStoreSearch?.name ?? "Fixed Store Search",
    componentType: defaultStoreSearch?.componentType ?? "search",
    rendererKey: defaultStoreSearch?.rendererKey ?? "store-search",
    defaultProps: defaultStoreSearch?.defaultProps ?? {
      title: "Search your trip",
      subtitle: "Search pickup and drop places from the live place database.",
      actionLabel: "Continue",
    },
    settingsSchema: defaultStoreSearch?.settingsSchema,
    assetSchema: defaultStoreSearch?.assetSchema,
    metadata: defaultStoreSearch?.metadata,
  },
  {
    componentKey: "cab-list",
    name: "Cab List",
    componentType: "fleet",
    rendererKey: "cab-list",
    defaultProps: {
      title: "Popular cab options",
      subtitle:
        "Show sedan, SUV, and traveller availability with live fare controls.",
    },
  },
  {
    componentKey: "popular-routes",
    name: "Popular Routes",
    componentType: "routes",
    rendererKey: "popular-routes",
    defaultProps: {
      title: "High demand routes",
      subtitle: "Create city-to-city pages from vendor route data.",
    },
  },
  {
    componentKey: "seo-sections",
    name: "SEO Sections",
    componentType: "seo",
    rendererKey: "seo-sections",
    defaultProps: {
      title: "Route SEO and FAQs",
      subtitle:
        "Admin managed content for route, airport, service, and vehicle landing pages.",
    },
  },
  {
    componentKey: "contact-footer",
    name: "Contact Footer",
    componentType: "footer",
    rendererKey: "contact-footer",
    defaultProps: {
      title: "Ready to book a cab?",
      actionLabel: "Contact vendor",
    },
  },
] satisfies Array<{
  componentKey: string;
  name: string;
  componentType: string;
  rendererKey: string;
  defaultProps: Record<string, unknown>;
  settingsSchema?: Record<string, unknown>;
  assetSchema?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}>;

const defaultPages = [
  {
    pageKey: "home",
    name: "Home",
    pathTemplate: "/",
    componentKeys: [
      "brand-header",
      "store-search",
      "cab-list",
      "popular-routes",
      "seo-sections",
      "contact-footer",
    ],
  },
  {
    pageKey: "route",
    name: "Route Landing",
    pathTemplate: "/routes/:from-to-:to",
    componentKeys: [
      "brand-header",
      "hero-search",
      "popular-routes",
      "seo-sections",
      "contact-footer",
    ],
  },
  {
    pageKey: "service",
    name: "Service Landing",
    pathTemplate: "/services/:service",
    componentKeys: [
      "brand-header",
      "hero-search",
      "cab-list",
      "seo-sections",
      "contact-footer",
    ],
  },
];

const emptyAddon = (): AddonForm => ({
  name: "",
  price: "",
  description: "",
});

function slugFromName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function lines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function recordFrom(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function textFrom(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function arrayFrom(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function formFromTheme(theme?: SiteTheme | null): ThemeDetailsForm {
  const defaultSettings = recordFrom(theme?.defaultSettings);
  const colorSchema = recordFrom(defaultSettings.colorSchema);
  const supportedSettings = recordFrom(theme?.supportedSettings);
  const metadata = recordFrom(theme?.metadata);
  const userEditable = arrayFrom(supportedSettings.userEditable).filter(
    (item): item is string => typeof item === "string",
  );
  const bannerImageObjectKeys = arrayFrom(metadata.bannerImageObjectKeys).filter(
    (item): item is string =>
      typeof item === "string" && item.trim().length > 0,
  );
  const bannerImageUrls = arrayFrom(metadata.bannerImageUrls).filter(
    (item): item is string =>
      typeof item === "string" && item.trim().length > 0,
  );
  const testVendorIds = arrayFrom(metadata.testVendorIds).filter(
    (item): item is string | number =>
      typeof item === "string" || typeof item === "number",
  );
  const addonServices = (theme?.addonServices ?? []).map((addon) => {
    const record = recordFrom(addon);
    return {
      name: textFrom(record.name),
      price: String(record.price ?? ""),
      description: textFrom(record.description),
    };
  });

  return {
    slug: theme?.slug ?? "",
    name: theme?.name ?? "",
    bannerImageObjectKeys: (bannerImageObjectKeys.length
      ? bannerImageObjectKeys
      : [theme?.previewImageObjectKey]
    )
      .filter(Boolean)
      .join("\n"),
    bannerImageUrls: (bannerImageUrls.length
      ? bannerImageUrls
      : [theme?.previewImageUrl]
    )
      .filter(Boolean)
      .join("\n"),
    themeType: theme?.themeType ?? "dynamic",
    rendererKey: theme?.rendererKey ?? "simple-store",
    shortDescription: theme?.shortDescription ?? "",
    description: theme?.description ?? "",
    oneTimePrice: String(theme?.oneTimePrice ?? 0),
    currency: theme?.currency ?? "INR",
    status: theme?.status ?? "draft",
    isActive: theme?.isActive ?? true,
    sortOrder: String(theme?.sortOrder ?? 0),
    testVendorIds: testVendorIds.map(String).join("\n"),
    pageBg: textFrom(colorSchema.pageBg, "#F8FAFC"),
    font: textFrom(colorSchema.font, "#111827"),
    primaryActionBg: textFrom(colorSchema.primaryActionBg, "#2563EB"),
    primaryActionFont: textFrom(colorSchema.primaryActionFont, "#FFFFFF"),
    customizationOptions: userEditable.length
      ? userEditable
      : customizationOptions.map((item) => item.key),
    addonServices: addonServices.length ? addonServices : [emptyAddon()],
    generateDefaultStructure: !theme,
  };
}

function addonPayload(addons: AddonForm[]) {
  return addons
    .map((addon) => ({
      key: slugFromName(addon.name),
      name: addon.name.trim(),
      price: Number(addon.price || 0),
      description: addon.description.trim(),
      adminImplemented: true,
    }))
    .filter((addon) => addon.name);
}

function buildThemePayload(form: ThemeDetailsForm) {
  const bannerImageObjectKeys = lines(form.bannerImageObjectKeys);
  const slug = form.slug.trim() || slugFromName(form.name);
  const selectedOptions = form.customizationOptions;
  const addonServices = addonPayload(form.addonServices);
  const pageSchema = {
    pages: defaultPages.map((page) => ({
      pageKey: page.pageKey,
      name: page.name,
      pathTemplate: page.pathTemplate,
      componentKeys: page.componentKeys,
    })),
    isr: { revalidateSeconds: 300 },
  };

  return {
    slug,
    name: form.name.trim(),
    themeType: form.themeType,
    rendererKey: form.rendererKey.trim() || slug,
    shortDescription: form.shortDescription.trim() || null,
    description: form.description.trim() || null,
    previewUrl: whiteLabelWebUrl(`/preview/site?themeSlug=${slug}&path=/`),
    previewImageObjectKey: bannerImageObjectKeys[0] ?? null,
    oneTimePrice: Number(form.oneTimePrice || 0),
    currency: form.currency.trim() || "INR",
    subscriptionHostingIncluded: true,
    status: form.status,
    isActive: form.isActive,
    sortOrder: Number(form.sortOrder || 0),
    defaultSettings: {
      colorSchema: {
        pageBg: form.pageBg,
        font: form.font,
        primaryActionBg: form.primaryActionBg,
        primaryActionFont: form.primaryActionFont,
      },
      modules: {
        tripSearch: selectedOptions.includes("tripCalculator"),
        cabList: selectedOptions.includes("services"),
        routePackages: selectedOptions.includes("routes"),
        seo: selectedOptions.includes("seo"),
      },
      assets: {
        bannerImageObjectKeys,
        carouselEnabled: bannerImageObjectKeys.length > 1,
      },
    },
    supportedSettings: {
      userEditable: selectedOptions,
      adminOnly: [
        "pages",
        "components",
        "addonServices",
        "rendererKey",
        "themeJson",
      ],
    },
    assetSchema: {
      logoObjectKey: { type: "image", label: "Logo" },
      bannerImageObjectKeys: {
        type: "image-list",
        label: "Banner images",
        carousel: bannerImageObjectKeys.length > 1,
      },
      shareImageObjectKey: { type: "image", label: "SEO share image" },
    },
    componentSchema: {
      components: defaultComponents.map((component) => component.componentKey),
      generatedBy: "theme-detail-wizard",
    },
    pageSchema,
    addonServices,
    metadata: {
      bannerImageObjectKeys,
      testVendorIds: lines(form.testVendorIds),
      customizationOptions: selectedOptions,
      generatedBy: "theme-detail-wizard",
      addonServiceCount: addonServices.length,
    },
  };
}

async function ensureDefaultStructure(
  themeSlug: string,
  components: SiteThemeComponent[],
) {
  const existingComponentKeys = new Set(
    components.map((component) => component.componentKey),
  );

  for (const component of defaultComponents) {
    if (existingComponentKeys.has(component.componentKey)) continue;
    try {
      await requestJson(
        "/api/v1/admin/site-theme-components",
        {
          componentKey: component.componentKey,
          name: component.name,
          componentType: component.componentType,
          rendererKey: component.rendererKey,
          defaultProps: component.defaultProps,
          settingsSchema: component.settingsSchema ?? {
            editableProps: Object.keys(component.defaultProps),
          },
          assetSchema: component.assetSchema ?? {},
          status: "live",
          isActive: true,
          metadata: component.metadata ?? {},
        },
        "POST",
      );
    } catch {
      // Component keys are shared globally; existing rows are safe to reuse.
    }
  }

  for (const [index, page] of defaultPages.entries()) {
    await requestJson(
      "/api/v1/admin/site-theme-pages",
      {
        themeSlug,
        pageKey: page.pageKey,
        name: page.name,
        pathTemplate: page.pathTemplate,
        componentKeys: page.componentKeys,
        settingsSchema: { generatedBy: "theme-detail-wizard" },
        isrRevalidateSeconds: 300,
        isActive: true,
        sortOrder: index * 10,
      },
      "POST",
    );
  }
}

export function ThemeDetailsPanel({
  initialData,
  theme = null,
}: {
  initialData: SiteThemesData;
  theme?: SiteTheme | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState<ThemeWizardStep>("details");
  const [form, setForm] = useState(() => formFromTheme(theme));
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const components = initialData?.components ?? [];
  const knownVendorIds = useMemo(
    () =>
      Array.from(
        new Set(
          (initialData?.assignments ?? []).map((assignment) =>
            String(assignment.vendorProfileId),
          ),
        ),
      ).sort((left, right) => Number(left) - Number(right)),
    [initialData?.assignments],
  );
  const isEditing = Boolean(theme);

  const bannerImageObjectKeys = useMemo(
    () => lines(form.bannerImageObjectKeys),
    [form.bannerImageObjectKeys],
  );
  const bannerImageUrls = useMemo(
    () => lines(form.bannerImageUrls),
    [form.bannerImageUrls],
  );
  const selectedTestVendorIds = useMemo(
    () => lines(form.testVendorIds),
    [form.testVendorIds],
  );

  function setField<K extends keyof ThemeDetailsForm>(
    key: K,
    value: ThemeDetailsForm[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleCustomization(key: string) {
    setForm((current) => {
      const exists = current.customizationOptions.includes(key);
      return {
        ...current,
        customizationOptions: exists
          ? current.customizationOptions.filter((item) => item !== key)
          : [...current.customizationOptions, key],
      };
    });
  }

  async function uploadThemeBanners(files: FileList | null) {
    if (!files?.length) return;
    setWorking(true);
    setMessage("Uploading theme images…");
    const uploaded: Array<{ id: string; objectKey: string; url: string | null }> = [];
    try {
      for (const file of Array.from(files).slice(0, 12)) {
        const asset = await uploadAdminMedia(file, "platform.site-theme-asset");
        uploaded.push({ id: asset.id, objectKey: asset.objectKey, url: asset.url });
      }
      setForm((current) => ({
        ...current,
        bannerImageObjectKeys: [
          ...lines(current.bannerImageObjectKeys),
          ...uploaded.map((asset) => asset.objectKey),
        ].join("\n"),
        bannerImageUrls: [
          ...lines(current.bannerImageUrls),
          ...uploaded.map((asset) => asset.url).filter((value): value is string => Boolean(value)),
        ].join("\n"),
      }));
      setMessage(`${uploaded.length} theme image${uploaded.length === 1 ? "" : "s"} uploaded.`);
    } catch (error) {
      await Promise.all(
        uploaded.map((asset) =>
          requestJson(
            `/api/v1/admin/media/assets/${encodeURIComponent(asset.id)}`,
            undefined,
            "DELETE",
          ).catch(() => null),
        ),
      );
      setMessage(error instanceof Error ? error.message : "Unable to upload theme images");
    } finally {
      setWorking(false);
    }
  }

  function removeThemeBanner(index: number) {
    setForm((current) => ({
      ...current,
      bannerImageObjectKeys: lines(current.bannerImageObjectKeys)
        .filter((_, itemIndex) => itemIndex !== index)
        .join("\n"),
      bannerImageUrls: lines(current.bannerImageUrls)
        .filter((_, itemIndex) => itemIndex !== index)
        .join("\n"),
    }));
  }

  function updateAddon(index: number, patch: Partial<AddonForm>) {
    setForm((current) => ({
      ...current,
      addonServices: current.addonServices.map((addon, addonIndex) =>
        addonIndex === index ? { ...addon, ...patch } : addon,
      ),
    }));
  }

  function removeAddon(index: number) {
    setForm((current) => ({
      ...current,
      addonServices:
        current.addonServices.length === 1
          ? [emptyAddon()]
          : current.addonServices.filter(
              (_, addonIndex) => addonIndex !== index,
            ),
    }));
  }

  function toggleTestVendor(vendorId: string) {
    setForm((current) => {
      const currentIds = lines(current.testVendorIds);
      const nextIds = currentIds.includes(vendorId)
        ? currentIds.filter((item) => item !== vendorId)
        : [...currentIds, vendorId];
      return { ...current, testVendorIds: nextIds.join("\n") };
    });
  }

  async function submitTheme() {
    setWorking(true);
    setMessage("");
    try {
      const payload = buildThemePayload(form);
      const saved = (await requestJson(
        theme
          ? `/api/v1/admin/site-themes/${theme.id}`
          : "/api/v1/admin/site-themes",
        payload,
        theme ? "PUT" : "POST",
      )) as SiteTheme;

      if (!theme && form.generateDefaultStructure) {
        await ensureDefaultStructure(saved.slug, components);
      }

      setMessage(theme ? "Theme details updated." : "Theme created.");
      router.push(`/site-themes/${saved.slug}/editor`);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save theme",
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {isEditing ? "Edit theme details" : "Create theme"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fill theme data once. JSON settings and starter pages are generated
            automatically.
          </p>
        </div>
        <div className="flex rounded-lg border border-border p-1">
          {[
            ["details", "Theme Detail"],
            ["settings", "Settings"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={[
                "rounded-md px-3 py-1.5 text-sm font-medium",
                step === key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground",
              ].join(" ")}
              onClick={() => setStep(key as ThemeWizardStep)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {message ? (
        <div className="rounded-lg border border-border/70 bg-card/60 px-3 py-2 text-sm text-muted-foreground">
          {message}
        </div>
      ) : null}

      {step === "details" ? (
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Theme Detail</CardTitle>
            <CardDescription>
              Basic catalog, pricing, banner, and renderer data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Theme name"
                value={form.name}
                onChange={(event) => {
                  const name = event.target.value;
                  setForm((current) => ({
                    ...current,
                    name,
                    slug: current.slug || slugFromName(name),
                  }));
                }}
              />
              <Input
                placeholder="Slug"
                value={form.slug}
                onChange={(event) =>
                  setField("slug", slugFromName(event.target.value))
                }
              />
            </div>
            <label className="grid gap-2 text-sm font-medium text-muted-foreground">
              <span>Theme banner images</span>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={working}
                onChange={(event) => {
                  void uploadThemeBanners(event.target.files);
                  event.target.value = "";
                }}
              />
            </label>
            {bannerImageUrls.length ? (
              <div className="grid gap-2 md:grid-cols-3">
                {bannerImageUrls.map((image, index) => (
                  <div key={`${bannerImageObjectKeys[index] ?? image}-${index}`} className="space-y-2">
                    <img
                      src={image}
                      alt=""
                      className="h-24 w-full rounded-lg border border-border object-cover"
                    />
                    <Button type="button" size="sm" variant="outline" onClick={() => removeThemeBanner(index)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="grid gap-3 md:grid-cols-3">
              <select
                className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                value={form.themeType}
                onChange={(event) => setField("themeType", event.target.value)}
              >
                {themeTypes.map((type) => (
                  <option key={type} value={type}>
                    {formatLabel(type)}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Render key"
                value={form.rendererKey}
                onChange={(event) =>
                  setField("rendererKey", event.target.value)
                }
              />
              <select
                className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                value={form.status}
                onChange={(event) =>
                  setField(
                    "status",
                    event.target.value as ThemeDetailsForm["status"],
                  )
                }
                aria-label="Lifecycle status"
              >
                {["draft", "live", "hidden"].map((status) => (
                  <option key={status} value={status}>
                    {formatLabel(status)}
                  </option>
                ))}
              </select>
            </div>
            <p className="rounded-lg border border-border/70 bg-card/50 px-3 py-2 text-xs text-muted-foreground">
              Lifecycle status controls whether the theme is draft-only, visible
              for live selection, or hidden/paused while admin reviews changes.
            </p>
            <Input
              placeholder="Short description"
              value={form.shortDescription}
              onChange={(event) =>
                setField("shortDescription", event.target.value)
              }
            />
            <textarea
              className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Long description"
              value={form.description}
              onChange={(event) => setField("description", event.target.value)}
            />
            <div className="grid gap-3 md:grid-cols-[1fr_0.6fr_0.6fr_auto]">
              <Input
                placeholder="Price"
                value={form.oneTimePrice}
                onChange={(event) =>
                  setField("oneTimePrice", event.target.value)
                }
              />
              <Input
                placeholder="Currency"
                value={form.currency}
                onChange={(event) => setField("currency", event.target.value)}
              />
              <Input
                placeholder="Sort order"
                value={form.sortOrder}
                onChange={(event) => setField("sortOrder", event.target.value)}
              />
              <label className="flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setField("isActive", event.target.checked)
                  }
                />
                Active
              </label>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Settings and add-ons</CardTitle>
            <CardDescription>
              Select user controls and paid admin-implemented add-on services.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 md:grid-cols-4">
              {[
                ["pageBg", "Page"],
                ["font", "Text"],
                ["primaryActionBg", "Action"],
                ["primaryActionFont", "Action text"],
              ].map(([key, label]) => (
                <label key={key} className="space-y-2 text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <Input
                    type="color"
                    value={form[key as keyof ThemeDetailsForm] as string}
                    onChange={(event) =>
                      setField(
                        key as keyof ThemeDetailsForm,
                        event.target.value as never,
                      )
                    }
                  />
                </label>
              ))}
            </div>
            <div>
              <p className="text-sm font-semibold">Customization options</p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {customizationOptions.map((option) => (
                  <label
                    key={option.key}
                    className="flex items-center gap-2 rounded-lg border border-border/70 px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={form.customizationOptions.includes(option.key)}
                      onChange={() => toggleCustomization(option.key)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-3 rounded-lg border border-border/70 p-3">
              <div>
                <p className="text-sm font-semibold">Test vendor selector</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  In test mode, only these vendor IDs should see and review this
                  theme.
                </p>
              </div>
              {knownVendorIds.length ? (
                <div className="flex flex-wrap gap-2">
                  {knownVendorIds.map((vendorId) => (
                    <label
                      key={vendorId}
                      className="flex items-center gap-2 rounded-full border border-border/70 px-3 py-1.5 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTestVendorIds.includes(vendorId)}
                        onChange={() => toggleTestVendor(vendorId)}
                      />
                      Vendor #{vendorId}
                    </label>
                  ))}
                </div>
              ) : null}
              <textarea
                className="min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="Optional manual vendor profile IDs, one per line"
                value={form.testVendorIds}
                onChange={(event) =>
                  setField("testVendorIds", event.target.value)
                }
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Add-on services</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      addonServices: [...current.addonServices, emptyAddon()],
                    }))
                  }
                >
                  Add service
                </Button>
              </div>
              {form.addonServices.map((addon, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-lg border border-border/70 p-3 md:grid-cols-[1fr_0.5fr_1.2fr_auto]"
                >
                  <Input
                    placeholder="Service name"
                    value={addon.name}
                    onChange={(event) =>
                      updateAddon(index, { name: event.target.value })
                    }
                  />
                  <Input
                    placeholder="Price"
                    value={addon.price}
                    onChange={(event) =>
                      updateAddon(index, { price: event.target.value })
                    }
                  />
                  <Input
                    placeholder="Description"
                    value={addon.description}
                    onChange={(event) =>
                      updateAddon(index, { description: event.target.value })
                    }
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => removeAddon(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            {!isEditing ? (
              <label className="flex items-center gap-2 rounded-lg border border-border/70 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.generateDefaultStructure}
                  onChange={(event) =>
                    setField("generateDefaultStructure", event.target.checked)
                  }
                />
                Create default components and page JSON automatically
              </label>
            ) : null}
            <div className="grid gap-2 md:grid-cols-3">
              {defaultPages.map((page) => (
                <div
                  key={page.pageKey}
                  className="rounded-lg border border-border/70 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{page.name}</p>
                    <Badge variant="outline">{page.pathTemplate}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {page.componentKeys.join(", ")}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {step === "settings" ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep("details")}
          >
            Back
          </Button>
        ) : null}
        {step === "details" ? (
          <Button
            type="button"
            onClick={() => setStep("settings")}
            disabled={!form.name.trim()}
          >
            Next
          </Button>
        ) : (
          <Button
            type="button"
            onClick={submitTheme}
            disabled={working || !form.name.trim()}
          >
            {working
              ? "Saving..."
              : isEditing
                ? "Update theme"
                : "Create theme"}
          </Button>
        )}
      </div>
    </section>
  );
}
