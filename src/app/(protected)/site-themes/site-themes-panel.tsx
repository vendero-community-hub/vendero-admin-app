"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { HexColorPicker } from "react-colorful";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BarChart3,
  Bot,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Copy,
  CreditCard,
  Database,
  Eye,
  ExternalLink,
  FileSearch,
  FileText,
  Globe2,
  GripVertical,
  Image,
  Layers3,
  Library,
  ListTree,
  Monitor,
  Palette,
  Pencil,
  Plus,
  Rocket,
  RotateCcw,
  Save,
  Search,
  Send,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tablet,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { useActionModal } from "@/components/ui/action-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  normalizeWhiteLabelPreviewUrl,
  whiteLabelWebUrl,
} from "@/lib/environment";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { uploadAdminMedia as uploadTrustedAdminMedia } from "@/lib/trusted-media";
import { HtmlCodePreview } from "./html-code-preview";
import { SiteComponentPreview } from "./site-component-preview";
import {
  fixedComponentForKey,
  isFixedComponent,
  mergeFixedSiteComponents,
} from "@/lib/site-fixed-components";
import {
  THEME_DATA_SCHEMA_VERSION,
  defaultDataFieldsForThemeDataset,
  normalizeThemeDataFieldKey,
  normalizeThemeDataKey,
  previewItemsForThemeDataset,
  themeDataDefinitionForKey,
  themeDataDefinitions,
} from "@/lib/theme-data-registry";

type ThemeStatus = "draft" | "live" | "hidden";
type PreviewDevice = "desktop" | "tablet" | "mobile";
type EditorSidebarTab = "pages" | "components";

const previewDevices: Array<{
  key: PreviewDevice;
  label: string;
  icon: typeof Monitor;
  width: string;
}> = [
  { key: "desktop", label: "Desktop", icon: Monitor, width: "100%" },
  { key: "tablet", label: "Tab", icon: Tablet, width: "720px" },
  { key: "mobile", label: "Mobile", icon: Smartphone, width: "390px" },
];

export type SiteThemePage = {
  id: number;
  themeId: number;
  pageKey: string;
  name: string;
  pathTemplate: string;
  componentKeys: string[];
  htmlCode: string;
  cssCode: string;
  jsCode: string;
  settingsSchema: Record<string, unknown>;
  isrRevalidateSeconds: number;
  isActive: boolean;
  sortOrder: number;
};

export type SiteTheme = {
  id: number;
  publicId: string;
  slug: string;
  name: string;
  themeType: string;
  rendererKey: string;
  shortDescription: string | null;
  description: string | null;
  previewUrl: string | null;
  previewImageObjectKey: string | null;
  previewImageUrl: string | null;
  figmaFileKey: string | null;
  figmaNodeId: string | null;
  oneTimePrice: number;
  currency: string;
  subscriptionHostingIncluded: boolean;
  status: ThemeStatus;
  isActive: boolean;
  sortOrder: number;
  defaultSettings: Record<string, unknown>;
  supportedSettings: Record<string, unknown>;
  assetSchema: Record<string, unknown>;
  componentSchema: Record<string, unknown>;
  pageSchema: Record<string, unknown>;
  addonServices: Array<Record<string, unknown>>;
  metadata: Record<string, unknown>;
  pages?: SiteThemePage[];
};

export type SiteThemeComponent = {
  id: number;
  publicId: string;
  componentKey: string;
  name: string;
  componentType: string;
  rendererKey: string;
  figmaFileKey: string | null;
  figmaNodeId: string | null;
  htmlCode: string;
  cssCode: string;
  jsCode: string;
  settingsSchema: Record<string, unknown>;
  defaultProps: Record<string, unknown>;
  assetSchema: Record<string, unknown>;
  status: ThemeStatus;
  isActive: boolean;
  sortOrder: number;
  metadata?: Record<string, unknown>;
};

export type SiteThemeAssignment = {
  id: number;
  vendorProfileId: number;
  themeId: number;
  status: string;
  selectedAddonServices: string[];
  paymentStatus: string;
  themeName?: string | null;
  themeSlug?: string | null;
};

type SiteAnalyticsSiteRow = {
  id: number;
  vendor: string;
  domain: string;
  theme: string;
  status: string;
  paymentStatus: string;
  traffic: number;
  crawlerHits: number;
  aiHits: number;
  errors: number;
  seoStatus: string;
  device: string;
  topRoute: string;
};

type SiteAnalytics = {
  activeAssignments: Array<number | SiteThemeAssignment>;
  activationRequests: Array<number | SiteThemeAssignment>;
  addonRequests: Array<{
    id: string;
    vendor: string;
    theme: string;
    service: string;
    status: string;
    paymentStatus: string;
    priority: string;
  }>;
  siteRows: SiteAnalyticsSiteRow[];
  activeSiteRows: SiteAnalyticsSiteRow[];
  paymentRows: Array<{
    id: number;
    vendor: string;
    theme: string;
    amount: number;
    addonCount: number;
    status: string;
  }>;
  trafficSeries: Array<{ label: string; value: number }>;
  deviceRows: Array<{ label: string; value: number }>;
  botRows: Array<{ label: string; kind?: string; value: number }>;
  routeRows: Array<{
    route: string;
    searches: number;
    device: string;
    source: string;
  }>;
  errorRows: Array<{
    id: string | number;
    site: string;
    route: string;
    device: string;
    error: string;
    count: number;
    occurredAt?: string | null;
  }>;
  visitorRows?: Array<Record<string, unknown>>;
  sessionRows?: Array<Record<string, unknown>>;
  crawlerRows?: Array<Record<string, unknown>>;
  routeIntentRows?: Array<Record<string, unknown>>;
  abortedRouteRows?: Array<Record<string, unknown>>;
  peakDemandRows?: Array<Record<string, unknown>>;
  geoReferralRows?: Array<Record<string, unknown>>;
  highIntentRows?: Array<Record<string, unknown>>;
  fareResistanceRows?: Array<Record<string, unknown>>;
  recoveryRows?: Array<Record<string, unknown>>;
  quotePdfRows?: Array<Record<string, unknown>>;
  realtimeProgressRows?: Array<Record<string, unknown>>;
  paymentFunnelRows?: Array<{ label: string; value: number }>;
  routeIntentCounts?: Array<{ label: string; value: number }>;
  recoveryStatusCounts?: Array<{ label: string; value: number }>;
  metrics: {
    activationRequests: number;
    addonRequests: number;
    activeSites: number;
    errors: number;
    paymentsTotal: number;
    pendingPaymentTotal: number;
    paidPayments: number;
    pendingPayments: number;
    themesCount: number;
    siteTraffic: number;
    crawlerReq: number;
    googleCrawlerReq: number;
    seoDone: number;
    aiReq: number;
    opens?: number;
    pageViews?: number;
    uniqueDevices?: number;
    sessions?: number;
    identifiedVisitors?: number;
    leads?: number;
    bookings?: number;
    payments?: number;
    paidRuntimePayments?: number;
    crawlerHits?: number;
    routeIntents?: number;
    abortedRoutes?: number;
    highIntentVisitors?: number;
    quotePdfDownloads?: number;
    recoveryFunnels?: number;
    paymentRevenue?: number;
  };
};

type VendorSiteRecord = {
  id: number;
  publicId: string;
  vendorProfileId: number;
  themeId: number;
  assignmentId?: number | null;
  siteName: string;
  vendorName?: string | null;
  themeName?: string | null;
  themeSlug?: string | null;
  primaryHostname?: string | null;
  subdomain?: string | null;
  domain: string;
  canonicalUrl?: string | null;
  status: string;
  paymentStatus: string;
  publishedSnapshotId?: number | null;
  publishedAt?: string | null;
};

type ProductionOpsAlert = {
  id: string;
  type: string;
  severity: string;
  status: string;
  message: string;
  runbookKey?: string | null;
  assignedAdminUserId?: number | null;
};

type ProductionOpsStatus = {
  key: string;
  label: string;
  status: string;
  tone: "success" | "warning" | "danger" | "neutral";
};

type ProductionOpsSite = {
  id: number;
  publicId?: string | null;
  label: string;
  vendor: string;
  vendorProfileId: number;
  theme: string;
  domain: string;
  status: string;
  publishedSnapshotId?: number | null;
  rollbackSnapshotId?: number | null;
  fallbackUrl?: string | null;
  featureFlags: Record<string, boolean>;
  planGates: {
    requiredPlan?: string;
    status?: string;
    lockedFeatures?: unknown[];
  };
  addonGates: {
    requiredAddons?: unknown[];
    enabledAddons?: unknown[];
  };
  beta: {
    enabled: boolean;
    selectedVendorOnly: boolean;
    label?: string;
    vendorFeedbackUrl?: string;
  };
  rollback: {
    enabled: boolean;
    lastRollbackAt?: string | null;
    lastRollbackReason?: string | null;
  };
  dataRetention: {
    analyticsDays: number;
    routePartialTextDays: number;
    identifiedVisitorDays: number;
    recoveryEventDays: number;
    quotePdfDays: number;
  };
  privacy: {
    analyticsConsentRequired: boolean;
    recoveryConsentRequired: boolean;
    capturePartialRouteText: boolean;
    maskHighIntentIdentity: boolean;
    allowDeviceIdentityStitching: boolean;
    visitorDeleteFlowEnabled: boolean;
    reviewStatus: string;
  };
  operationalStatuses: ProductionOpsStatus[];
  alerts: ProductionOpsAlert[];
  rollbackAvailable: boolean;
};

type ProductionOpsData = {
  featureFlagDefaults: Record<string, boolean>;
  runbooks: Array<{ key: string; title: string; href: string; summary: string }>;
  backupRestoreNotes: Record<string, string>;
  privacyReview: string[];
  totals: {
    sites: number;
    rendererEnabled: number;
    betaSites: number;
    openAlerts: number;
    rollbackReady: number;
  };
  sites: ProductionOpsSite[];
};

type SeoOverview = {
  links: {
    siteUrl: string;
    sitemapUrl: string;
    robotsUrl: string;
    jsonldUrl: string;
    searchConsoleUrl: string;
    richResultsTestUrl: string;
    schemaValidatorUrl: string;
  };
  publicUrls: string[];
  searchConsole: {
    property?: {
      id: number;
      verificationStatus?: string;
      searchConsoleSiteStatus?: string;
      sitemapSubmitStatus?: string;
      sitemapSubmitReason?: string | null;
      sitemapSubmitAttemptCount?: number;
      sitemapSubmitNextAttemptAt?: string | null;
      sitemapSubmitLastError?: string | null;
      sitemapSubmittedAt?: string | null;
    } | null;
    verificationToken?: {
      id: number;
      googleVerificationCode?: string | null;
      metaTag?: string | null;
      fileName?: string | null;
      status?: string;
    } | null;
    stepper?: Record<string, string>;
    oauth?: { authUrl?: string | null; connected?: boolean };
  };
  validation: {
    valid: boolean;
    issues: Array<{
      code: string;
      severity: "error" | "warning";
      message: string;
      pagePath?: string | null;
    }>;
  };
  aiSearchReadiness: Array<{ key: string; label: string; ready: boolean }>;
  fallbackInstructions: { manual: string; dns: string };
};

type AiSeoGenerationScope = "all" | "pages" | "routes";
type AiSeoWorkingAction = "load" | "generate" | "approve";

type AiSeoGenerationResult = {
  pageDataId: number;
  pageDataPublicId?: string | null;
  pageKey: string;
  path: string;
  routeKey?: string | null;
  scope?: string | null;
  mode: "ai" | "fallback" | string;
  warnings: string[];
  provider?: string | null;
};

type AiSeoGenerationFailure = {
  pageKey: string;
  path: string;
  routeKey?: string | null;
  errorCode?: string | null;
  message: string;
};

type AiSeoJob = {
  id: number;
  publicId: string;
  status: string;
  jobType: string;
  inputJson: Record<string, unknown>;
  resultJson: {
    generationMode?: string | null;
    results?: AiSeoGenerationResult[];
    failures?: AiSeoGenerationFailure[];
    pageDataIds?: number[];
  };
  errorCode?: string | null;
  errorMessage?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
};

type AiSeoPageData = {
  id: number;
  publicId: string;
  pageKey: string;
  routePattern?: string | null;
  title?: string | null;
  metaDescription?: string | null;
  seoJson: Record<string, unknown>;
  contentJson: Record<string, unknown>;
  schemaJson: Record<string, unknown>;
  suggestionsJson: Record<string, unknown>;
  scoreJson: Record<string, unknown>;
  status: string;
  generatedBy?: string | null;
  seoIntakeStatus?: string | null;
  seoAuditScore?: number | null;
  metadata: Record<string, unknown>;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type AiSeoOverview = {
  site?: Record<string, unknown> | null;
  profile?: Record<string, unknown> | null;
  jobs: AiSeoJob[];
  drafts: AiSeoPageData[];
  approved: AiSeoPageData[];
  counts: Record<string, number>;
};

type AiSeoGenerateResponse = {
  job: AiSeoJob;
  profile?: Record<string, unknown> | null;
  results: AiSeoGenerationResult[];
  failures: AiSeoGenerationFailure[];
  drafts: AiSeoPageData[];
  overview: AiSeoOverview;
};

type AiSeoApproveResponse = {
  job: AiSeoJob;
  approved: AiSeoPageData[];
  archivedCount: number;
  overview: AiSeoOverview;
};

type RuntimeBookingRow = {
  id: number;
  publicId: string;
  siteName?: string | null;
  vendorName?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  bookingStatus: string;
  paymentStatus: string;
  paymentMode: string;
  totalAmount: number;
  advanceAmount: number;
  balanceAmount: number;
  currency: string;
  createdAt?: string | null;
  routeIntentJson?: Record<string, unknown>;
  events?: Array<{ eventType: string; status: string; message?: string | null; createdAt?: string | null }>;
  payments?: Array<{ providerOrderId?: string | null; amount: number; status: string; provider?: string | null }>;
  notifications?: Array<{ channel: string; recipientType: string; status: string; messageTemplateKey?: string | null }>;
};

type RuntimeBookingOverview = {
  rows: RuntimeBookingRow[];
  summary: {
    total: number;
    confirmed: number;
    pendingPayment: number;
    failed: number;
  };
};

type RuntimeRecoveryOverview = {
  settings: {
    enabled: boolean;
    browserPromptEnabled: boolean;
    whatsappApiEnabled: boolean;
    paidAddonEnabled: boolean;
    consentRequired: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
    cooldownMinutes: number;
    abandonedWindowMinutes: number;
    expiryMinutes: number;
    templateStatus: string;
    templateName?: string | null;
  };
  funnel: {
    rows: Array<{ status: string; total: number }>;
    statuses: string[];
  };
};

type RuntimeRulesOverview = {
  fleet: Array<{ id: number; cabType?: string; inventoryState?: string; availableCount?: number | null; manualOverride?: boolean }>;
  tariffs: Array<{ id: number; ruleType?: string; city?: string | null; cabType?: string | null; multiplier?: number; status?: string }>;
  corporates: Array<{ id: number; companyName?: string; status?: string; invoiceFlag?: boolean }>;
  recovery: RuntimeRecoveryOverview["funnel"];
};

export type SiteThemesData = {
  themes: SiteTheme[];
  components: SiteThemeComponent[];
  assignments: SiteThemeAssignment[];
  vendorSites?: VendorSiteRecord[];
  analytics?: SiteAnalytics;
  productionOps?: ProductionOpsData;
  summary: {
    themeCount: number;
    liveThemeCount: number;
    componentCount: number;
    activeAssignmentCount: number;
  };
} | null;

type ThemeForm = {
  id: number | null;
  slug: string;
  name: string;
  themeType: string;
  rendererKey: string;
  shortDescription: string;
  description: string;
  previewUrl: string;
  previewImageObjectKey: string;
  figmaFileKey: string;
  figmaNodeId: string;
  oneTimePrice: string;
  currency: string;
  subscriptionHostingIncluded: boolean;
  status: ThemeStatus;
  isActive: boolean;
  sortOrder: string;
  defaultSettings: string;
  supportedSettings: string;
  assetSchema: string;
  componentSchema: string;
  pageSchema: string;
  addonServices: string;
  metadata: string;
};

type ComponentForm = {
  id: number | null;
  componentKey: string;
  name: string;
  componentType: string;
  rendererKey: string;
  figmaFileKey: string;
  figmaNodeId: string;
  htmlCode: string;
  cssCode: string;
  jsCode: string;
  settingsSchema: string;
  defaultProps: string;
  assetSchema: string;
  status: ThemeStatus;
  isActive: boolean;
  sortOrder: string;
};

type PageForm = {
  id: number | null;
  themeSlug: string;
  pageKey: string;
  name: string;
  pathTemplate: string;
  componentKeys: string;
  htmlCode: string;
  cssCode: string;
  jsCode: string;
  settingsSchema: string;
  isrRevalidateSeconds: string;
  isActive: boolean;
  sortOrder: string;
};

type BuilderNodeType = "page" | "section" | "group" | "component";

type BuilderSelection = {
  type: BuilderNodeType;
  id: string;
  componentIndex?: number;
};

type BuilderGroup = {
  id: string;
  name: string;
  enabled: boolean;
  layoutKey: string;
  layout: BuilderLayout;
  htmlCode: string;
  cssCode: string;
  jsCode: string;
};

type BuilderLayout = {
  container: "contained" | "wide" | "narrow" | "full";
  direction: "vertical" | "horizontal" | "columns";
  columns: number;
  gap: string;
  paddingTop: string;
  paddingBottom: string;
  paddingInline: string;
  marginTop: string;
  marginBottom: string;
  backgroundColor: string;
  backgroundGradient: string;
  backgroundImageObjectKey: string;
  backgroundImageUrl: string;
  alignItems: "stretch" | "start" | "center" | "end";
  justifyContent: "start" | "center" | "space-between";
};

type PageDesignSettings = {
  backgroundColor: string;
  textColor: string;
  backgroundImageObjectKey: string;
  backgroundImageUrl: string;
  minHeight: string;
};

type BuilderSection = {
  id: string;
  name: string;
  enabled: boolean;
  layout: BuilderLayout;
  htmlCode: string;
  cssCode: string;
  jsCode: string;
  groups: BuilderGroup[];
};

type BuilderState = {
  sections: BuilderSection[];
  disabledComponentKeys: string[];
};

type ComponentDataFieldType = "text" | "number" | "image" | "url" | "boolean" | "json";

type ComponentDataField = {
  key: string;
  label: string;
  type: ComponentDataFieldType;
  required: boolean;
  example: string;
};

type ComponentNavigationLink = {
  label: string;
  href: string;
};

type ComponentContentDraft = {
  title: string;
  subtitle: string;
  actionLabel: string;
  imageObjectKey: string;
  imageUrl: string;
  logoImageObjectKey: string;
  logoImageUrl: string;
  logoText: string;
  headerBackgroundColor: string;
  headerPadding: string;
  headerMargin: string;
  headerWidth: string;
  headerGap: string;
  headerFlexDirection: "row" | "row-reverse" | "column";
  headerJustifyContent: "start" | "center" | "end" | "space-between";
  headerAlignItems: "stretch" | "start" | "center" | "end";
  headerLinkPlacement: "left" | "center" | "right" | "stretch";
  headerLinkColor: string;
  headerLinkBackgroundColor: string;
  headerLinkHoverColor: string;
  headerLinkHoverBackgroundColor: string;
  headerLinkActiveColor: string;
  headerLinkActiveBackgroundColor: string;
  headerLinkBorderRadius: string;
  headerLinkMinWidth: string;
  headerLinkHeight: string;
  headerLinkPadding: string;
  searchMode: "single" | "route";
  dataSource: "places" | "products" | "vendors" | "custom";
  placeType: "city" | "airport";
  label: string;
  placeholder: string;
  pickupLabel: string;
  pickupPlaceholder: string;
  dropLabel: string;
  dropPlaceholder: string;
  minCharacters: string;
  loadingMessage: string;
  emptyMessage: string;
  onSelectAction: string;
  resultPathTemplate: string;
  componentBackgroundColor: string;
  componentBackgroundGradient: string;
  componentBackgroundImageObjectKey: string;
  componentBackgroundImageUrl: string;
  componentTextColor: string;
  componentPadding: string;
  cornerRadius: string;
  fontFamily: string;
  headingLevel: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
  navigationLinksJson: string;
  datasetKey: string;
  dataFieldsJson: string;
  dataItemsJson: string;
  fareCalculationMode: "none" | "simple" | "advanced";
  baseFare: string;
  perKm: string;
  minKmPerDay: string;
  minOneWayKm: string;
  driverAllowancePerDay: string;
  nightCharge: string;
  hotelIncluded: boolean;
  hotelPerNight: string;
  tollMode: "included" | "estimate" | "actual";
  tollAmount: string;
  parkingMode: "included" | "estimate" | "actual";
  parkingAmount: string;
  stateTaxMode: "included" | "estimate" | "actual";
  stateTaxAmount: string;
  airportPickupCharge: string;
  airportDropCharge: string;
  cleaningCharge: string;
  gstPercent: string;
  seasonalMultiplier: string;
  demandMultiplier: string;
  eventMultiplier: string;
  distanceRangesJson: string;
};

const emptyThemeForm: ThemeForm = {
  id: null,
  slug: "",
  name: "",
  themeType: "custom_site",
  rendererKey: "simple-store",
  shortDescription: "",
  description: "",
  previewUrl: "",
  previewImageObjectKey: "",
  figmaFileKey: "",
  figmaNodeId: "",
  oneTimePrice: "0",
  currency: "INR",
  subscriptionHostingIncluded: true,
  status: "draft",
  isActive: true,
  sortOrder: "0",
  defaultSettings: "{}",
  supportedSettings: "{}",
  assetSchema: "{}",
  componentSchema: "{}",
  pageSchema: "{}",
  addonServices: "[]",
  metadata: "{}",
};

const emptyComponentForm: ComponentForm = {
  id: null,
  componentKey: "",
  name: "",
  componentType: "content",
  rendererKey: "",
  figmaFileKey: "",
  figmaNodeId: "",
  htmlCode: "",
  cssCode: "",
  jsCode: "",
  settingsSchema: "{}",
  defaultProps: "{}",
  assetSchema: "{}",
  status: "live",
  isActive: true,
  sortOrder: "0",
};

const emptyPageForm: PageForm = {
  id: null,
  themeSlug: "",
  pageKey: "",
  name: "",
  pathTemplate: "/",
  componentKeys: "",
  htmlCode: "",
  cssCode: "",
  jsCode: "",
  settingsSchema: "{}",
  isrRevalidateSeconds: "300",
  isActive: true,
  sortOrder: "0",
};

function fallbackData(): NonNullable<SiteThemesData> {
  return {
    themes: [],
    components: [],
    assignments: [],
    vendorSites: [],
    productionOps: undefined,
    summary: {
      themeCount: 0,
      liveThemeCount: 0,
      componentCount: 0,
      activeAssignmentCount: 0,
    },
  };
}

function getAdminToken() {
  const tokenEntry = document.cookie
    .split("; ")
    .find((part) => part.startsWith("vendero_admin_access_token="));
  return tokenEntry?.split("=")[1] ?? null;
}

function unwrapPayload(payload: any) {
  return payload?.data?.data ?? payload?.data ?? payload;
}

function requestErrorMessage(payload: any, fallback: string) {
  const directCandidates = [
    payload?.message,
    payload?.error?.message,
    payload?.data?.message,
    payload?.data?.error?.message,
    payload?.errors?.[0]?.message,
    payload?.data?.errors?.[0]?.message,
    payload?.error,
    payload?.errorCode,
  ];
  const message = directCandidates.find(
    (candidate) => typeof candidate === "string" && candidate.trim(),
  );
  return message ?? fallback;
}

export async function requestJson(
  path: string,
  body?: Record<string, unknown>,
  method = "GET",
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
      requestErrorMessage(payload, response.statusText || "Request failed"),
    );
  }
  return unwrapPayload(payload);
}

async function uploadAdminMedia(file: File) {
  const asset = await uploadTrustedAdminMedia(file, "platform.site-theme-asset");
  return {
    id: asset.id,
    objectKey: asset.objectKey,
    key: asset.objectKey,
    url: asset.url,
    fileUrl: asset.url,
  };
}

function jsonText(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

function parseJson(value: string, fallback: unknown) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function recordFromUnknown(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringFromUnknown(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function boolFromUnknown(value: unknown, fallback = true) {
  return typeof value === "boolean" ? value : fallback;
}

function numberFromUnknown(value: unknown, fallback: number) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : fallback;
}

function optionFromUnknown<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
) {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function parseLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function builderId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

function defaultBuilderGroup(): BuilderGroup {
  return {
    id: "main-group",
    name: "Main group",
    enabled: true,
    layoutKey: "stack",
    layout: defaultBuilderLayout(),
    htmlCode: "",
    cssCode: "",
    jsCode: "",
  };
}

function defaultBuilderLayout(): BuilderLayout {
  return {
    container: "contained",
    direction: "vertical",
    columns: 1,
    gap: "",
    paddingTop: "",
    paddingBottom: "",
    paddingInline: "",
    marginTop: "",
    marginBottom: "",
    backgroundColor: "",
    backgroundGradient: "",
    backgroundImageObjectKey: "",
    backgroundImageUrl: "",
    alignItems: "stretch",
    justifyContent: "start",
  };
}

function defaultBuilderSection(): BuilderSection {
  return {
    id: "main-section",
    name: "Main section",
    enabled: true,
    layout: defaultBuilderLayout(),
    htmlCode: "",
    cssCode: "",
    jsCode: "",
    groups: [defaultBuilderGroup()],
  };
}

function builderLayoutFrom(value: unknown): BuilderLayout {
  const record = recordFromUnknown(value);
  return {
    container: optionFromUnknown(
      record.container,
      ["contained", "wide", "narrow", "full"] as const,
      "contained",
    ),
    direction: optionFromUnknown(
      record.direction,
      ["vertical", "horizontal", "columns"] as const,
      "vertical",
    ),
    columns: Math.min(6, Math.max(1, numberFromUnknown(record.columns, 1))),
    gap: stringFromUnknown(record.gap),
    paddingTop: stringFromUnknown(record.paddingTop),
    paddingBottom: stringFromUnknown(record.paddingBottom),
    paddingInline: stringFromUnknown(record.paddingInline),
    marginTop: stringFromUnknown(record.marginTop),
    marginBottom: stringFromUnknown(record.marginBottom),
    backgroundColor: stringFromUnknown(record.backgroundColor),
    backgroundGradient: stringFromUnknown(record.backgroundGradient),
    backgroundImageObjectKey: stringFromUnknown(record.backgroundImageObjectKey),
    backgroundImageUrl: stringFromUnknown(record.backgroundImageUrl),
    alignItems: optionFromUnknown(
      record.alignItems,
      ["stretch", "start", "center", "end"] as const,
      "stretch",
    ),
    justifyContent: optionFromUnknown(
      record.justifyContent,
      ["start", "center", "space-between"] as const,
      "start",
    ),
  };
}

function builderGroupFrom(value: unknown, fallbackIndex: number): BuilderGroup {
  const record = recordFromUnknown(value);
  return {
    id: stringFromUnknown(record.id, `group-${fallbackIndex + 1}`),
    name: stringFromUnknown(record.name, `Group ${fallbackIndex + 1}`),
    enabled: boolFromUnknown(record.enabled, true),
    layoutKey: stringFromUnknown(record.layoutKey, "stack"),
    layout: builderLayoutFrom(record.layout),
    htmlCode: stringFromUnknown(record.htmlCode),
    cssCode: stringFromUnknown(record.cssCode),
    jsCode: stringFromUnknown(record.jsCode),
  };
}

function builderSectionFrom(value: unknown, fallbackIndex: number): BuilderSection {
  const record = recordFromUnknown(value);
  const groups = Array.isArray(record.groups)
    ? record.groups.map(builderGroupFrom)
    : [];
  return {
    id: stringFromUnknown(record.id, `section-${fallbackIndex + 1}`),
    name: stringFromUnknown(record.name, `Section ${fallbackIndex + 1}`),
    enabled: boolFromUnknown(record.enabled, true),
    layout: builderLayoutFrom(record.layout),
    htmlCode: stringFromUnknown(record.htmlCode),
    cssCode: stringFromUnknown(record.cssCode),
    jsCode: stringFromUnknown(record.jsCode),
    groups: groups.length ? groups : [defaultBuilderGroup()],
  };
}

function builderStateFromSettings(settingsSchema: string): BuilderState {
  const settings = recordFromUnknown(parseJson(settingsSchema, {}));
  const builder = recordFromUnknown(settings.builder);
  const sections = Array.isArray(builder.sections)
    ? builder.sections.map(builderSectionFrom)
    : [];
  return {
    sections: sections.length ? sections : [defaultBuilderSection()],
    disabledComponentKeys: Array.isArray(builder.disabledComponentKeys)
      ? builder.disabledComponentKeys.map(String)
      : [],
  };
}

function stripDerivedThemeMediaUrls(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripDerivedThemeMediaUrls);
  if (!value || typeof value !== "object") return value;
  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (
      /(?:avatar|backgroundImage|banner|coverImage|file|image|logo|media|photo|receipt|signature|thumbnail|video)(?:Url|Urls)$/u.test(
        key,
      ) ||
      key === "bannerImages"
    ) {
      continue;
    }
    output[key] = stripDerivedThemeMediaUrls(item);
  }
  return output;
}

function settingsWithBuilderState(settingsSchema: string, builderState: BuilderState) {
  const settings = recordFromUnknown(parseJson(settingsSchema, {}));
  return JSON.stringify(
    stripDerivedThemeMediaUrls({
      ...settings,
      builder: builderState,
    }),
    null,
    2,
  );
}

function pageDesignFromSettings(settingsSchema: string): PageDesignSettings {
  const settings = recordFromUnknown(parseJson(settingsSchema, {}));
  const design = recordFromUnknown(settings.pageDesign);
  return {
    backgroundColor: stringFromUnknown(design.backgroundColor),
    textColor: stringFromUnknown(design.textColor),
    backgroundImageObjectKey: stringFromUnknown(design.backgroundImageObjectKey),
    backgroundImageUrl: stringFromUnknown(design.backgroundImageUrl),
    minHeight: stringFromUnknown(design.minHeight),
  };
}

function settingsWithPageDesign(
  settingsSchema: string,
  pageDesign: PageDesignSettings,
) {
  const settings = recordFromUnknown(parseJson(settingsSchema, {}));
  return JSON.stringify(
    stripDerivedThemeMediaUrls({
      ...settings,
      pageDesign,
    }),
    null,
    2,
  );
}

function pageDesignPreviewStyle(pageDesign: PageDesignSettings): CSSProperties {
  const style: CSSProperties = {};
  if (pageDesign.backgroundColor) style.backgroundColor = pageDesign.backgroundColor;
  if (pageDesign.textColor) style.color = pageDesign.textColor;
  if (pageDesign.minHeight) style.minHeight = pageDesign.minHeight;
  if (pageDesign.backgroundImageUrl) {
    style.backgroundImage = `url("${pageDesign.backgroundImageUrl}")`;
    style.backgroundPosition = "center";
    style.backgroundSize = "cover";
  }
  return style;
}

function pagePathFromTemplate(pathTemplate: string) {
  const path = pathTemplate.trim() || "/";
  return path.startsWith("/") ? path : `/${path}`;
}

function themePagePreviewUrl(themeSlug: string, pathTemplate: string) {
  const params = new URLSearchParams({
    themeSlug,
    path: pagePathFromTemplate(pathTemplate),
  });
  return whiteLabelWebUrl(`/preview/site?${params.toString()}`);
}

function sectionContainerWidth(container: BuilderLayout["container"]) {
  if (container === "full") return "none";
  if (container === "wide") return "1360px";
  if (container === "narrow") return "880px";
  return "1160px";
}

function spacingStyleValue(value: string) {
  return value.trim() || undefined;
}

function sectionOuterPreviewStyle(layout: BuilderLayout): CSSProperties {
  const backgroundImages = [
    spacingStyleValue(layout.backgroundGradient),
    layout.backgroundImageUrl.trim()
      ? `url("${layout.backgroundImageUrl.trim()}")`
      : "",
  ].filter(Boolean);
  return {
    backgroundColor: spacingStyleValue(layout.backgroundColor),
    backgroundImage: backgroundImages.length ? backgroundImages.join(", ") : undefined,
    backgroundPosition: layout.backgroundImageUrl.trim() ? "center" : undefined,
    backgroundSize: layout.backgroundImageUrl.trim() ? "cover" : undefined,
    marginTop: spacingStyleValue(layout.marginTop),
    marginBottom: spacingStyleValue(layout.marginBottom),
    paddingTop: spacingStyleValue(layout.paddingTop),
    paddingBottom: spacingStyleValue(layout.paddingBottom),
  };
}

function sectionInnerPreviewStyle(
  layout: BuilderLayout,
  previewDevice: PreviewDevice,
): CSSProperties {
  const columnCount = Math.min(6, Math.max(1, Number(layout.columns) || 1));
  const shouldUseColumns =
    previewDevice !== "mobile" &&
    layout.direction !== "vertical" &&
    columnCount > 1;

  return {
    alignItems: layout.alignItems,
    display: "grid",
    gap: spacingStyleValue(layout.gap) ?? "18px",
    gridTemplateColumns: shouldUseColumns
      ? `repeat(${columnCount}, minmax(0, 1fr))`
      : "minmax(0, 1fr)",
    justifyContent:
      layout.justifyContent === "start" ? undefined : layout.justifyContent,
    marginLeft: "auto",
    marginRight: "auto",
    maxWidth: sectionContainerWidth(layout.container),
    paddingLeft: spacingStyleValue(layout.paddingInline) ?? "18px",
    paddingRight: spacingStyleValue(layout.paddingInline) ?? "18px",
    width: "100%",
  };
}

function groupPreviewStyle(layoutKey: string, layout?: BuilderLayout): CSSProperties {
  const style: CSSProperties = {
    ...(layout ? sectionOuterPreviewStyle(layout) : {}),
    display: "grid",
    gap: spacingStyleValue(layout?.gap ?? "") ?? "14px",
  };
  if (layout?.paddingInline) {
    style.paddingLeft = layout.paddingInline;
    style.paddingRight = layout.paddingInline;
  }
  if (/grid|column|two/.test(layoutKey.toLowerCase())) {
    style.gridTemplateColumns = "repeat(auto-fit, minmax(220px, 1fr))";
  }
  return style;
}

function containsUnsafeCode(value: string) {
  const code = value.toLowerCase();
  return (
    code.includes("<script") ||
    code.includes("document.cookie") ||
    code.includes("eval(") ||
    code.includes("http://")
  );
}

function htmlComment(value: string) {
  return value.replace(/-->/g, "--&gt;");
}

function defaultComponentHtml(componentKey: string, component?: SiteThemeComponent | null) {
  return `<section data-component="${componentKey}" data-renderer="${component?.rendererKey ?? componentKey}">
  <!-- ${htmlComment(component?.name ?? componentKey)} renders through ${component?.componentType ?? "content"} -->
</section>`;
}

function buildPageCodeSnapshot(
  page: PageForm,
  componentKeys: string[],
  components: SiteThemeComponent[],
) {
  const componentCode = componentKeys.map((componentKey) => {
    const component = componentForKey(components, componentKey);
    return {
      html: component?.htmlCode?.trim() || defaultComponentHtml(componentKey, component),
      css: component?.cssCode?.trim() || "",
      js: component?.jsCode?.trim() || "",
    };
  });
  const generatedHtml = `<main data-theme-page="${page.pageKey || "page"}" data-path="${page.pathTemplate || "/"}">
${componentCode.map((item) => item.html).join("\n\n")}
</main>`;

  return {
    htmlCode: page.htmlCode.trim() || generatedHtml,
    cssCode: [...componentCode.map((item) => item.css), page.cssCode].filter(Boolean).join("\n\n"),
    jsCode: [...componentCode.map((item) => item.js), page.jsCode].filter(Boolean).join("\n\n"),
  };
}

export function formatMoney(value: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

export function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/-/g, " ");
}

function pageFormForNewThemePage(theme?: SiteTheme): PageForm {
  return {
    ...emptyPageForm,
    themeSlug: theme?.slug ?? "",
    pageKey: "home",
    name: "Home",
    pathTemplate: "/",
  };
}

function uniquePageSlug(base: string, existing: Set<string>) {
  const cleaned =
    base
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "page";
  let candidate = cleaned;
  let index = 2;
  while (existing.has(candidate)) {
    candidate = `${cleaned}-${index}`;
    index += 1;
  }
  return candidate;
}

function pageFormForNewDraftPage(theme?: SiteTheme): PageForm {
  const pages = theme?.pages ?? [];
  if (!pages.length) return pageFormForNewThemePage(theme);
  const existingKeys = new Set(pages.map((page) => page.pageKey));
  const existingPaths = new Set(pages.map((page) => page.pathTemplate));
  const pageNumber = pages.length + 1;
  const pageKey = uniquePageSlug(`page-${pageNumber}`, existingKeys);
  let pathTemplate = `/${pageKey}`;
  let pathIndex = 2;
  while (existingPaths.has(pathTemplate)) {
    pathTemplate = `/${pageKey}-${pathIndex}`;
    pathIndex += 1;
  }
  const maxSortOrder = pages.reduce(
    (max, page) => Math.max(max, page.sortOrder ?? 0),
    0,
  );
  return {
    ...emptyPageForm,
    themeSlug: theme?.slug ?? "",
    pageKey,
    name: `Page ${pageNumber}`,
    pathTemplate,
    isrRevalidateSeconds: "300",
    isActive: true,
    sortOrder: String(maxSortOrder + 10),
    settingsSchema: settingsWithBuilderState("{}", {
      sections: [defaultBuilderSection()],
      disabledComponentKeys: [],
    }),
  };
}

function componentNameForKey(
  components: SiteThemeComponent[],
  componentKey: string,
) {
  return (
    components.find((component) => component.componentKey === componentKey)
      ?.name ?? formatLabel(componentKey)
  );
}

function componentForKey(
  components: SiteThemeComponent[],
  componentKey: string,
) {
  return components.find(
    (component) => component.componentKey === componentKey,
  );
}

function componentContentDraftFrom(
  component?: SiteThemeComponent | null,
): ComponentContentDraft {
  const props = recordFromUnknown(component?.defaultProps);
  const settings = recordFromUnknown(component?.settingsSchema);
  const dataRequirements = recordFromUnknown(
    settings.dataRequirements ?? props.dataRequirements,
  );
  return {
    title: stringFromUnknown(props.title, component?.name ?? ""),
    subtitle: stringFromUnknown(props.subtitle),
    actionLabel: stringFromUnknown(props.actionLabel),
    imageObjectKey: stringFromUnknown(props.imageObjectKey),
    imageUrl: stringFromUnknown(props.imageUrl),
    logoImageObjectKey: stringFromUnknown(props.logoImageObjectKey ?? props.logoObjectKey),
    logoImageUrl: stringFromUnknown(props.logoImageUrl ?? props.logoUrl),
    logoText: stringFromUnknown(props.logoText),
    headerBackgroundColor: stringFromUnknown(props.headerBackgroundColor),
    headerPadding: stringFromUnknown(props.headerPadding, "12px 14px"),
    headerMargin: stringFromUnknown(props.headerMargin),
    headerWidth: stringFromUnknown(props.headerWidth),
    headerGap: stringFromUnknown(props.headerGap, "14px"),
    headerFlexDirection: optionFromUnknown(
      props.headerFlexDirection,
      ["row", "row-reverse", "column"] as const,
      "row",
    ),
    headerJustifyContent: optionFromUnknown(
      props.headerJustifyContent,
      ["start", "center", "end", "space-between"] as const,
      "space-between",
    ),
    headerAlignItems: optionFromUnknown(
      props.headerAlignItems,
      ["stretch", "start", "center", "end"] as const,
      "center",
    ),
    headerLinkPlacement: optionFromUnknown(
      props.headerLinkPlacement,
      ["left", "center", "right", "stretch"] as const,
      "right",
    ),
    headerLinkColor: stringFromUnknown(props.headerLinkColor),
    headerLinkBackgroundColor: stringFromUnknown(props.headerLinkBackgroundColor),
    headerLinkHoverColor: stringFromUnknown(props.headerLinkHoverColor),
    headerLinkHoverBackgroundColor: stringFromUnknown(props.headerLinkHoverBackgroundColor),
    headerLinkActiveColor: stringFromUnknown(props.headerLinkActiveColor),
    headerLinkActiveBackgroundColor: stringFromUnknown(props.headerLinkActiveBackgroundColor),
    headerLinkBorderRadius: stringFromUnknown(props.headerLinkBorderRadius, "8px"),
    headerLinkMinWidth: stringFromUnknown(props.headerLinkMinWidth),
    headerLinkHeight: stringFromUnknown(props.headerLinkHeight, "34px"),
    headerLinkPadding: stringFromUnknown(props.headerLinkPadding, "10px 11px"),
    searchMode: optionFromUnknown(
      props.searchMode,
      ["single", "route"] as const,
      "single",
    ),
    dataSource: optionFromUnknown(
      props.dataSource,
      ["places", "products", "vendors", "custom"] as const,
      "places",
    ),
    placeType: optionFromUnknown(props.placeType, ["city", "airport"] as const, "city"),
    label: stringFromUnknown(props.label, "Search"),
    placeholder: stringFromUnknown(props.placeholder, "Search city, airport, or place"),
    pickupLabel: stringFromUnknown(props.pickupLabel, "Pickup"),
    pickupPlaceholder: stringFromUnknown(props.pickupPlaceholder, "Search pickup city"),
    dropLabel: stringFromUnknown(props.dropLabel, "Drop"),
    dropPlaceholder: stringFromUnknown(props.dropPlaceholder, "Search drop city"),
    minCharacters: String(numberFromUnknown(props.minCharacters, 2)),
    loadingMessage: stringFromUnknown(props.loadingMessage, "Searching places..."),
    emptyMessage: stringFromUnknown(
      props.emptyMessage,
      "No place found. Try a nearby city or another spelling.",
    ),
    onSelectAction: stringFromUnknown(props.onSelectAction, "hold_selection"),
    resultPathTemplate: stringFromUnknown(props.resultPathTemplate, "/cab/{pickup}-to-{drop}"),
    componentBackgroundColor: stringFromUnknown(props.componentBackgroundColor),
    componentBackgroundGradient: stringFromUnknown(props.componentBackgroundGradient),
    componentBackgroundImageObjectKey: stringFromUnknown(
      props.componentBackgroundImageObjectKey,
    ),
    componentBackgroundImageUrl: stringFromUnknown(props.componentBackgroundImageUrl),
    componentTextColor: stringFromUnknown(props.componentTextColor),
    componentPadding: stringFromUnknown(props.componentPadding),
    cornerRadius: stringFromUnknown(props.cornerRadius),
    fontFamily: stringFromUnknown(props.fontFamily),
    headingLevel: optionFromUnknown(
      props.headingLevel,
      ["h1", "h2", "h3", "h4", "h5", "h6"] as const,
      "h2",
    ),
    fontSize: stringFromUnknown(props.fontSize),
    fontWeight: stringFromUnknown(props.fontWeight, "700"),
    lineHeight: stringFromUnknown(props.lineHeight),
    letterSpacing: stringFromUnknown(props.letterSpacing),
    navigationLinksJson: jsonText(
      normalizeNavigationLinks(
        props.navigationLinks ?? props.links ?? settings.navigationLinks ?? [],
      ),
    ),
    datasetKey: normalizeThemeDataKey(
      stringFromUnknown(
        props.datasetKey ?? dataRequirements.datasetKey,
        inferComponentDatasetKey(component),
      ),
    ),
    dataFieldsJson: jsonText(dataRequirements.fields ?? []),
    dataItemsJson: jsonText(props.items ?? []),
    fareCalculationMode: optionFromUnknown(
      props.fareCalculationMode ?? props.fareEngineMode,
      ["none", "simple", "advanced"] as const,
      "simple",
    ),
    baseFare: String(numberFromUnknown(props.baseFare, 150)),
    perKm: String(numberFromUnknown(props.perKm ?? props.perKmRate, 18)),
    minKmPerDay: String(numberFromUnknown(props.minKmPerDay, 300)),
    minOneWayKm: String(numberFromUnknown(props.minOneWayKm, 0)),
    driverAllowancePerDay: String(numberFromUnknown(props.driverAllowancePerDay, 0)),
    nightCharge: String(numberFromUnknown(props.nightCharge, 0)),
    hotelIncluded: boolFromUnknown(props.hotelIncluded, false),
    hotelPerNight: String(numberFromUnknown(props.hotelPerNight, 0)),
    tollMode: optionFromUnknown(props.tollMode, ["included", "estimate", "actual"] as const, "included"),
    tollAmount: String(numberFromUnknown(props.tollAmount ?? props.toll, 0)),
    parkingMode: optionFromUnknown(props.parkingMode, ["included", "estimate", "actual"] as const, "included"),
    parkingAmount: String(numberFromUnknown(props.parkingAmount ?? props.parking, 0)),
    stateTaxMode: optionFromUnknown(props.stateTaxMode, ["included", "estimate", "actual"] as const, "included"),
    stateTaxAmount: String(numberFromUnknown(props.stateTaxAmount ?? props.stateTax, 0)),
    airportPickupCharge: String(numberFromUnknown(props.airportPickupCharge, 0)),
    airportDropCharge: String(numberFromUnknown(props.airportDropCharge, 0)),
    cleaningCharge: String(numberFromUnknown(props.cleaningCharge, 0)),
    gstPercent: String(numberFromUnknown(props.gstPercent ?? props.taxPercent, 5)),
    seasonalMultiplier: String(numberFromUnknown(props.seasonalMultiplier, 1)),
    demandMultiplier: String(numberFromUnknown(props.demandMultiplier, 1)),
    eventMultiplier: String(numberFromUnknown(props.eventMultiplier, 1)),
    distanceRangesJson: jsonText(props.distanceRanges ?? []),
  };
}

function componentPayloadFrom(
  component: SiteThemeComponent,
  defaultProps: Record<string, unknown>,
  settingsSchema?: Record<string, unknown>,
) {
  return {
    componentKey: component.componentKey,
    name: component.name,
    componentType: component.componentType,
    rendererKey: component.rendererKey,
    figmaFileKey: component.figmaFileKey ?? "",
    figmaNodeId: component.figmaNodeId ?? "",
    htmlCode: component.htmlCode ?? "",
    cssCode: component.cssCode ?? "",
    jsCode: component.jsCode ?? "",
    settingsSchema: settingsSchema ?? component.settingsSchema ?? {},
    defaultProps,
    assetSchema: component.assetSchema ?? {},
    status: component.status,
    isActive: component.isActive,
    sortOrder: component.sortOrder ?? 0,
    metadata: component.metadata ?? {},
  };
}

function normalizeDataFields(value: unknown): ComponentDataField[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((field) => {
      const record = recordFromUnknown(field);
      const key = stringFromUnknown(record.key ?? record.fieldKey)
        .trim()
        .replace(/[^a-zA-Z0-9_.-]+/g, "_");
      if (!key) return null;
      return {
        key,
        label: stringFromUnknown(record.label, formatLabel(key)),
        type: optionFromUnknown(
          record.type ?? record.dataType,
          ["text", "number", "image", "url", "boolean", "json"] as const,
          "text",
        ),
        required: boolFromUnknown(record.required ?? record.isRequired, false),
        example: stringFromUnknown(record.example),
      };
    })
    .filter((field): field is ComponentDataField => Boolean(field));
}

function normalizeNavigationLinks(value: unknown): ComponentNavigationLink[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((link) => {
      const record = recordFromUnknown(link);
      const label = stringFromUnknown(record.label ?? record.name ?? record.title).trim();
      const href = stringFromUnknown(record.href ?? record.path ?? record.url).trim();
      if (!label || !href) return null;
      return { label, href };
    })
    .filter((link): link is ComponentNavigationLink => Boolean(link));
}

function componentCapability(component?: SiteThemeComponent | null) {
  const props = recordFromUnknown(component?.defaultProps);
  const settings = recordFromUnknown(component?.settingsSchema);
  const metadata = recordFromUnknown(component?.metadata);
  return stringFromUnknown(
    metadata.capability ?? settings.capability ?? props.capability,
  ).toLowerCase();
}

function componentDataRequirementsFromDraft(draft: ComponentContentDraft) {
  return {
    schemaVersion: THEME_DATA_SCHEMA_VERSION,
    datasetKey: normalizeThemeDataKey(draft.datasetKey.trim()),
    fields: normalizeDataFields(parseJson(draft.dataFieldsJson, [])),
  };
}

function componentDataItemsFromDraft(draft: ComponentContentDraft) {
  const parsed = parseJson(draft.dataItemsJson, []);
  return Array.isArray(parsed) ? parsed : [];
}

function componentDefaultPropsFromDraft(draft: ComponentContentDraft) {
  const {
    dataFieldsJson,
    dataItemsJson,
    distanceRangesJson,
    navigationLinksJson,
    imageUrl: _imageUrl,
    logoImageUrl: _logoImageUrl,
    componentBackgroundImageUrl: _componentBackgroundImageUrl,
    ...contentDraft
  } = draft;
  const dataRequirements = componentDataRequirementsFromDraft(draft);
  const dataItems = componentDataItemsFromDraft(draft);
  const distanceRanges = parseJson(distanceRangesJson, []);
  const navigationLinks = normalizeNavigationLinks(parseJson(navigationLinksJson, []));
  return {
    ...contentDraft,
    minCharacters: Math.max(1, Math.min(10, Number(draft.minCharacters || 2))),
    baseFare: Number(draft.baseFare || 0),
    perKm: Number(draft.perKm || 0),
    minKmPerDay: Number(draft.minKmPerDay || 0),
    minOneWayKm: Number(draft.minOneWayKm || 0),
    driverAllowancePerDay: Number(draft.driverAllowancePerDay || 0),
    nightCharge: Number(draft.nightCharge || 0),
    hotelPerNight: Number(draft.hotelPerNight || 0),
    tollAmount: Number(draft.tollAmount || 0),
    parkingAmount: Number(draft.parkingAmount || 0),
    stateTaxAmount: Number(draft.stateTaxAmount || 0),
    airportPickupCharge: Number(draft.airportPickupCharge || 0),
    airportDropCharge: Number(draft.airportDropCharge || 0),
    cleaningCharge: Number(draft.cleaningCharge || 0),
    gstPercent: Number(draft.gstPercent || 0),
    seasonalMultiplier: Number(draft.seasonalMultiplier || 1),
    demandMultiplier: Number(draft.demandMultiplier || 1),
    eventMultiplier: Number(draft.eventMultiplier || 1),
    distanceRanges: Array.isArray(distanceRanges) ? distanceRanges : [],
    navigationLinks,
    datasetKey: dataRequirements.datasetKey,
    dataRequirements,
    items: dataItems,
  };
}

function inferComponentDatasetKey(component?: SiteThemeComponent | null) {
  const key = `${component?.componentKey ?? ""} ${component?.rendererKey ?? ""}`.toLowerCase();
  if (/review|testimonial/.test(key)) return "reviews";
  if (/route|location/.test(key)) return "routes";
  if (/service/.test(key)) return "services";
  if (/calculative|calculated|calculator|booking-total|bookingtotal|route-cab|cab-fare|fare-option|fareoptions|total-price|pricetotal/.test(key)) {
    return "calculativeCabsData";
  }
  if (/tariff|rate|fare/.test(key)) return "tariffs";
  if (/offer|deal|promotion|package/.test(key)) return "offers";
  if (/area|city|coverage|served/.test(key)) return "serviceAreas";
  if (/business|profile|vendor-info|company/.test(key)) return "businessInfo";
  if (/gallery|image|photo|slider|carousel/.test(key)) return "gallery";
  if (/cab|taxi|vehicle|fleet|car/.test(key)) return "cabs";
  if (/faq/.test(key)) return "faqs";
  return "items";
}

function defaultDataFieldsForDataset(datasetKey: string): ComponentDataField[] {
  return defaultDataFieldsForThemeDataset(datasetKey);
}

function defaultDataItemsForDataset(datasetKey: string) {
  return previewItemsForThemeDataset(datasetKey);
}

function getBuilderPageForm(
  pageForm: PageForm,
  theme?: SiteTheme,
  builderPageId?: number | null,
) {
  if (pageForm.themeSlug === theme?.slug && (pageForm.id || pageForm.pageKey)) {
    return pageForm;
  }
  const activePage =
    theme?.pages?.find((page) => page.id === builderPageId) ??
    theme?.pages?.[0];
  return activePage && theme
    ? formFromPage(theme, activePage)
    : pageFormForNewThemePage(theme);
}

function formFromTheme(theme: SiteTheme): ThemeForm {
  return {
    id: theme.id,
    slug: theme.slug,
    name: theme.name,
    themeType: theme.themeType,
    rendererKey: theme.rendererKey,
    shortDescription: theme.shortDescription ?? "",
    description: theme.description ?? "",
    previewUrl: theme.previewUrl ?? "",
    previewImageObjectKey: theme.previewImageObjectKey ?? "",
    figmaFileKey: theme.figmaFileKey ?? "",
    figmaNodeId: theme.figmaNodeId ?? "",
    oneTimePrice: String(theme.oneTimePrice ?? 0),
    currency: theme.currency ?? "INR",
    subscriptionHostingIncluded: theme.subscriptionHostingIncluded,
    status: theme.status,
    isActive: theme.isActive,
    sortOrder: String(theme.sortOrder ?? 0),
    defaultSettings: jsonText(theme.defaultSettings),
    supportedSettings: jsonText(theme.supportedSettings),
    assetSchema: jsonText(theme.assetSchema),
    componentSchema: jsonText(theme.componentSchema),
    pageSchema: jsonText(theme.pageSchema),
    addonServices: JSON.stringify(theme.addonServices ?? [], null, 2),
    metadata: jsonText(theme.metadata),
  };
}

function formFromComponent(component: SiteThemeComponent): ComponentForm {
  return {
    id: component.id,
    componentKey: component.componentKey,
    name: component.name,
    componentType: component.componentType,
    rendererKey: component.rendererKey,
    figmaFileKey: component.figmaFileKey ?? "",
    figmaNodeId: component.figmaNodeId ?? "",
    htmlCode: component.htmlCode ?? "",
    cssCode: component.cssCode ?? "",
    jsCode: component.jsCode ?? "",
    settingsSchema: jsonText(component.settingsSchema),
    defaultProps: jsonText(component.defaultProps),
    assetSchema: jsonText(component.assetSchema),
    status: component.status,
    isActive: component.isActive,
    sortOrder: String(component.sortOrder ?? 0),
  };
}

function formFromPage(theme: SiteTheme, page: SiteThemePage): PageForm {
  return {
    id: page.id,
    themeSlug: theme.slug,
    pageKey: page.pageKey,
    name: page.name,
    pathTemplate: page.pathTemplate,
    componentKeys: page.componentKeys.join("\n"),
    htmlCode: page.htmlCode ?? "",
    cssCode: page.cssCode ?? "",
    jsCode: page.jsCode ?? "",
    settingsSchema: jsonText(page.settingsSchema),
    isrRevalidateSeconds: String(page.isrRevalidateSeconds ?? 300),
    isActive: page.isActive,
    sortOrder: String(page.sortOrder ?? 0),
  };
}

function ComponentLibraryItem({
  component,
  onAdd,
  onDragStart,
}: {
  component: SiteThemeComponent;
  onAdd: () => void;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
}) {
  const canOpenEditor = component.id > 0;
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="group cursor-grab rounded-lg border border-border/70 bg-background/55 p-3 active:cursor-grabbing"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{component.name}</p>
              <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                {component.componentKey}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 px-2"
              onClick={onAdd}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            {canOpenEditor ? (
              <Button asChild type="button" size="sm" variant="ghost">
                <Link
                  href={`/site-themes/components/${component.componentKey}/editor`}
                >
                  Edit
                </Link>
              </Button>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="rounded-full text-[10px]">
              {formatLabel(component.componentType)}
            </Badge>
            <Badge variant="outline" className="rounded-full text-[10px]">
              {component.rendererKey}
            </Badge>
            {isFixedComponent(component) ? (
              <Badge variant="success" className="rounded-full text-[10px]">
                fixed
              </Badge>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function CodeEditorTextarea({
  label,
  value,
  onChange,
  minHeight = 180,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minHeight?: number;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </span>
      <textarea
        className="w-full rounded-md border border-border bg-slate-950 px-3 py-2 font-mono text-xs leading-relaxed text-slate-100 outline-none focus:ring-2 focus:ring-primary/30"
        style={{ minHeight }}
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SettingsSection({
  title,
  icon,
  badge,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="rounded-lg border border-border/70 bg-card/35"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-semibold">
        <span className="flex min-w-0 items-center gap-2">
          {icon}
          <span className="truncate">{title}</span>
        </span>
        {badge ? <span className="shrink-0">{badge}</span> : null}
      </summary>
      <div className="space-y-2 border-t border-border/70 p-3">{children}</div>
    </details>
  );
}

const colorSwatches = [
  "#ffffff",
  "#f8fafc",
  "#111827",
  "#0f172a",
  "#0f766e",
  "#2563eb",
  "#f59e0b",
  "#dc2626",
];

const fontFamilyOptions = [
  { label: "System", value: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  { label: "Inter / Sans", value: "Inter, system-ui, sans-serif" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Mono", value: "'SFMono-Regular', Consolas, 'Liberation Mono', monospace" },
  { label: "Display", value: "'Arial Black', Impact, system-ui, sans-serif" },
];

function normalizeHexColor(value: string, fallback = "#ffffff") {
  const color = value.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color) ? color : fallback;
}

function parseLinearGradient(value: string) {
  const match = value
    .trim()
    .match(
      /^linear-gradient\(\s*(\d{1,3})deg\s*,\s*(#[0-9a-fA-F]{3,6})\s*,\s*(#[0-9a-fA-F]{3,6})\s*\)$/i,
    );
  return {
    angle: Math.min(360, Math.max(0, Number(match?.[1] ?? 135))),
    start: normalizeHexColor(match?.[2] ?? "#ffffff", "#ffffff"),
    end: normalizeHexColor(match?.[3] ?? "#0f766e", "#0f766e"),
  };
}

function gradientValue({
  angle,
  start,
  end,
}: {
  angle: number;
  start: string;
  end: string;
}) {
  return `linear-gradient(${angle}deg, ${start}, ${end})`;
}

function ColorPickerField({
  label,
  value,
  onChange,
  fallback = "#ffffff",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  fallback?: string;
}) {
  const color = normalizeHexColor(value, fallback);
  return (
    <div className="space-y-2 rounded-md border border-border/70 bg-background/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span
            className="h-6 w-6 rounded-md border border-border"
            style={{ backgroundColor: color }}
          />
          {value ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => onChange("")}
            >
              Clear
            </Button>
          ) : null}
        </div>
      </div>
      <HexColorPicker
        color={color}
        onChange={onChange}
        style={{ width: "100%" }}
      />
      <div className="grid grid-cols-8 gap-1">
        {colorSwatches.map((swatch) => (
          <button
            key={`${label}-${swatch}`}
            type="button"
            className="h-7 rounded-md border border-border/70"
            style={{ backgroundColor: swatch }}
            title={swatch}
            onClick={() => onChange(swatch)}
          />
        ))}
      </div>
    </div>
  );
}

function GradientPickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  if (!value.trim()) {
    return (
      <div className="space-y-2 rounded-md border border-border/70 bg-background/40 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-muted-foreground">{label}</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              onChange(
                gradientValue({
                  angle: 135,
                  start: "#ffffff",
                  end: "#0f766e",
                }),
              )
            }
          >
            <Plus className="h-3.5 w-3.5" />
            Add gradient
          </Button>
        </div>
        <div className="h-10 rounded-md border border-dashed border-border/70 bg-muted/30" />
      </div>
    );
  }
  const gradient = parseLinearGradient(value);
  const updateGradient = (patch: Partial<typeof gradient>) => {
    onChange(gradientValue({ ...gradient, ...patch }));
  };
  const preview = gradientValue(gradient);
  return (
    <div className="space-y-3 rounded-md border border-border/70 bg-background/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        {value ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => onChange("")}
          >
            Clear
          </Button>
        ) : null}
      </div>
      <div
        className="h-14 rounded-md border border-border/70"
        style={{ background: preview }}
      />
      <label className="block space-y-2 text-xs font-semibold text-muted-foreground">
        <span>Angle</span>
        <input
          type="range"
          min={0}
          max={360}
          value={gradient.angle}
          onChange={(event) => updateGradient({ angle: Number(event.target.value) })}
          className="w-full accent-primary"
        />
      </label>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
        <ColorPickerField
          label="Start color"
          value={gradient.start}
          onChange={(start) => updateGradient({ start })}
        />
        <ColorPickerField
          label="End color"
          fallback="#0f766e"
          value={gradient.end}
          onChange={(end) => updateGradient({ end })}
        />
      </div>
    </div>
  );
}

function TrustedThemeImageField({
  label,
  url,
  disabled,
  onSelect,
  onClear,
}: {
  label: string;
  url: string;
  disabled?: boolean;
  onSelect: (file: File) => void;
  onClear: () => void;
}) {
  return (
    <div className="grid gap-2 rounded-md border border-border/70 bg-background/30 p-2">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      {url ? (
        <img src={url} alt="" className="h-20 w-full rounded-md object-cover" />
      ) : null}
      <div className="flex items-center gap-2">
        <Input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onSelect(file);
          }}
        />
        {url ? (
          <Button type="button" size="sm" variant="outline" onClick={onClear}>
            Clear
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function LayoutSettingsFields({
  layout,
  onChange,
  onImageSelect,
  disabled,
}: {
  layout: BuilderLayout;
  onChange: (patch: Partial<BuilderLayout>) => void;
  onImageSelect: (file: File) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-1">
        <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
          <span>Container</span>
          <select
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
            value={layout.container}
            onChange={(event) =>
              onChange({ container: event.target.value as BuilderLayout["container"] })
            }
          >
            <option value="contained">Contained</option>
            <option value="wide">Wide</option>
            <option value="narrow">Narrow</option>
            <option value="full">Full width</option>
          </select>
        </label>
        <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
          <span>Direction</span>
          <select
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
            value={layout.direction}
            onChange={(event) =>
              onChange({ direction: event.target.value as BuilderLayout["direction"] })
            }
          >
            <option value="vertical">Vertical stack</option>
            <option value="horizontal">Horizontal row</option>
            <option value="columns">Responsive columns</option>
          </select>
        </label>
        <Input
          max={6}
          min={1}
          placeholder="Columns"
          type="number"
          value={layout.columns}
          onChange={(event) =>
            onChange({
              columns: Math.min(6, Math.max(1, Number(event.target.value || 1))),
            })
          }
        />
        <Input
          placeholder="Gap, for example 24px"
          value={layout.gap}
          onChange={(event) => onChange({ gap: event.target.value })}
        />
      </div>
      <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-1">
        <Input
          placeholder="Padding top"
          value={layout.paddingTop}
          onChange={(event) => onChange({ paddingTop: event.target.value })}
        />
        <Input
          placeholder="Padding bottom"
          value={layout.paddingBottom}
          onChange={(event) => onChange({ paddingBottom: event.target.value })}
        />
        <Input
          placeholder="Padding left/right"
          value={layout.paddingInline}
          onChange={(event) => onChange({ paddingInline: event.target.value })}
        />
        <Input
          placeholder="Margin top"
          value={layout.marginTop}
          onChange={(event) => onChange({ marginTop: event.target.value })}
        />
        <Input
          placeholder="Margin bottom"
          value={layout.marginBottom}
          onChange={(event) => onChange({ marginBottom: event.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <ColorPickerField
          label="Background color"
          value={layout.backgroundColor}
          onChange={(backgroundColor) => onChange({ backgroundColor })}
        />
        <GradientPickerField
          label="Background gradient"
          value={layout.backgroundGradient}
          onChange={(backgroundGradient) => onChange({ backgroundGradient })}
        />
        <TrustedThemeImageField
          label="Background image"
          url={layout.backgroundImageUrl}
          disabled={disabled}
          onSelect={onImageSelect}
          onClear={() =>
            onChange({ backgroundImageObjectKey: "", backgroundImageUrl: "" })
          }
        />
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-1">
        <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
          <span>Align items</span>
          <select
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
            value={layout.alignItems}
            onChange={(event) =>
              onChange({ alignItems: event.target.value as BuilderLayout["alignItems"] })
            }
          >
            <option value="stretch">Stretch</option>
            <option value="start">Start</option>
            <option value="center">Center</option>
            <option value="end">End</option>
          </select>
        </label>
        <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
          <span>Distribute</span>
          <select
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
            value={layout.justifyContent}
            onChange={(event) =>
              onChange({
                justifyContent: event.target.value as BuilderLayout["justifyContent"],
              })
            }
          >
            <option value="start">Start</option>
            <option value="center">Center</option>
            <option value="space-between">Space between</option>
          </select>
        </label>
      </div>
    </div>
  );
}

export function ThemeEditorPanel({
  initialData,
  themeSlug,
  initialPageId = null,
}: {
  initialData: SiteThemesData;
  themeSlug: string;
  initialPageId?: number | null;
}) {
  const [data, setData] = useState<NonNullable<SiteThemesData>>(
    initialData ?? fallbackData(),
  );
  const [pageForm, setPageForm] = useState<PageForm>(() => {
    const theme = (initialData?.themes ?? []).find(
      (item) => item.slug === themeSlug,
    );
    const page =
      theme?.pages?.find((item) => item.id === initialPageId) ??
      theme?.pages?.[0];
    return page && theme
      ? formFromPage(theme, page)
      : pageFormForNewThemePage(theme);
  });
  const [builderPageId, setBuilderPageId] = useState<number | null>(() => {
    const theme = (initialData?.themes ?? []).find(
      (item) => item.slug === themeSlug,
    );
    return (
      theme?.pages?.find((item) => item.id === initialPageId)?.id ??
      theme?.pages?.[0]?.id ??
      null
    );
  });
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
  const [editorSidebarTab, setEditorSidebarTab] =
    useState<EditorSidebarTab>("pages");
  const [dragCanvasIndex, setDragCanvasIndex] = useState<number | null>(null);
  const [dragTreeNode, setDragTreeNode] = useState<BuilderSelection | null>(null);
  const [selectedNode, setSelectedNode] = useState<BuilderSelection>({
    type: "page",
    id: "page",
  });
  const [componentContentDrafts, setComponentContentDrafts] = useState<
    Record<string, ComponentContentDraft>
  >({});
  const [working, setWorking] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const [pageCodeTouched, setPageCodeTouched] = useState({
    html: false,
    css: false,
    js: false,
  });
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);
  const actionModal = useActionModal();

  const sortedThemes = useMemo(
    () =>
      [...data.themes].sort(
        (left, right) => left.sortOrder - right.sortOrder || left.id - right.id,
      ),
    [data.themes],
  );
  const selectedTheme =
    sortedThemes.find((theme) => theme.slug === themeSlug) ?? sortedThemes[0];
  const builderPageForm = getBuilderPageForm(
    pageForm,
    selectedTheme,
    builderPageId,
  );
  const builderComponentKeys = parseLines(builderPageForm.componentKeys);
  const activeComponents = useMemo(
    () =>
      mergeFixedSiteComponents(data.components).sort(
        (left, right) => left.sortOrder - right.sortOrder || left.id - right.id,
      ),
    [data.components],
  );
  const previewWidth =
    previewDevices.find((device) => device.key === previewDevice)?.width ??
    "100%";
  const builderState = useMemo(
    () => builderStateFromSettings(builderPageForm.settingsSchema),
    [builderPageForm.settingsSchema],
  );
  const pageDesign = useMemo(
    () => pageDesignFromSettings(builderPageForm.settingsSchema),
    [builderPageForm.settingsSchema],
  );
  const selectedSection = builderState.sections.find(
    (section) => section.id === selectedNode.id,
  );
  const selectedGroup = builderState.sections
    .flatMap((section) => section.groups)
    .find((group) => group.id === selectedNode.id);
  const selectedComponentKey =
    selectedNode.type === "component" &&
    typeof selectedNode.componentIndex === "number"
      ? builderComponentKeys[selectedNode.componentIndex]
      : null;
  const selectedComponent = selectedComponentKey
    ? componentForKey(activeComponents, selectedComponentKey)
    : null;
  const selectedComponentContentDraft = selectedComponentKey
    ? componentContentDrafts[selectedComponentKey] ??
      componentContentDraftFrom(selectedComponent)
    : null;
  const selectedFixedComponent = selectedComponentKey
    ? fixedComponentForKey(selectedComponentKey)
    : null;
  const selectedComponentIsFixed = Boolean(
    selectedComponent && isFixedComponent(selectedComponent),
  );
  const selectedComponentCapability = componentCapability(selectedComponent);
  const selectedComponentRendererKey = selectedComponent
    ? `${selectedComponent.componentKey} ${selectedComponent.rendererKey}`.toLowerCase()
    : "";
  const selectedComponentIsFixedSearch =
    selectedComponentIsFixed &&
    (selectedComponentCapability === "search" ||
      /(^|[-_\s])(store-search|place-search|fixed-place-search|fixed-search)([-_\s]|$)/.test(
        selectedComponentRendererKey,
      ));
  const selectedComponentIsHeader =
    selectedComponentCapability === "navigation" ||
    /(^|[-_\s])(site-header|header|navbar|nav)([-_\s]|$)/.test(
      selectedComponentRendererKey,
    );
  const selectedComponentIndex =
    selectedNode.type === "component" &&
    typeof selectedNode.componentIndex === "number"
      ? selectedNode.componentIndex
      : null;
  const selectedComponentPreviewProps = selectedComponentContentDraft
    ? componentDefaultPropsFromDraft(selectedComponentContentDraft)
    : null;
  const selectedComponentPreviewPropsJson = selectedComponentPreviewProps
    ? JSON.stringify(selectedComponentPreviewProps)
    : "";
  const selectedDataFields = selectedComponentContentDraft
    ? normalizeDataFields(parseJson(selectedComponentContentDraft.dataFieldsJson, []))
    : [];
  const selectedDataItems = selectedComponentContentDraft
    ? componentDataItemsFromDraft(selectedComponentContentDraft)
    : [];
  const selectedDistanceRanges = selectedComponentContentDraft
    ? parseJson(selectedComponentContentDraft.distanceRangesJson, [])
    : [];
  const selectedNavigationLinks = selectedComponentContentDraft
    ? normalizeNavigationLinks(parseJson(selectedComponentContentDraft.navigationLinksJson, []))
    : [];
  const pageDesignJson = JSON.stringify(pageDesign);
  const enabledComponentKeys = builderComponentKeys.filter(
    (componentKey) => !builderState.disabledComponentKeys.includes(componentKey),
  );
  const enabledSections = builderState.sections.filter((section) => section.enabled);
  const pageCodeSnapshot = buildPageCodeSnapshot(
    builderPageForm,
    enabledComponentKeys,
    activeComponents,
  );
  const validationGroups = useMemo(() => {
    const pageIssues: string[] = [];
    const sectionIssues: string[] = [];
    const groupIssues: string[] = [];
    const componentIssues: string[] = [];
    const seoIssues: string[] = [];
    const performanceIssues: string[] = [];

    if (!builderPageForm.name.trim()) pageIssues.push("Page name is required.");
    if (!builderPageForm.pageKey.trim()) pageIssues.push("Page key is required.");
    if (!builderPageForm.pathTemplate.trim()) pageIssues.push("Path is required.");
    if (!builderState.sections.length) sectionIssues.push("Add at least one section.");
    builderState.sections.forEach((section) => {
      if (!section.name.trim()) sectionIssues.push("A section is missing a name.");
      if (!section.groups.length) groupIssues.push(`${section.name} has no groups.`);
      section.groups.forEach((group) => {
        if (!group.name.trim()) groupIssues.push("A group is missing a name.");
        if (containsUnsafeCode(`${group.htmlCode}\n${group.cssCode}\n${group.jsCode}`)) {
          groupIssues.push(`${group.name} contains code that needs review.`);
        }
      });
      if (containsUnsafeCode(`${section.htmlCode}\n${section.cssCode}\n${section.jsCode}`)) {
        sectionIssues.push(`${section.name} contains code that needs review.`);
      }
    });
    if (!builderComponentKeys.length) componentIssues.push("Add at least one component.");
    builderComponentKeys.forEach((componentKey) => {
      if (!componentForKey(activeComponents, componentKey)) {
        componentIssues.push(`${componentKey} is not in the component library.`);
      }
    });
    if (!builderComponentKeys.some((key) => key.toLowerCase().includes("seo"))) {
      seoIssues.push("Add an SEO or FAQ component before publishing.");
    }
    if (containsUnsafeCode(`${pageCodeSnapshot.htmlCode}\n${pageCodeSnapshot.cssCode}\n${pageCodeSnapshot.jsCode}`)) {
      performanceIssues.push("Page code includes scripts or URLs that need CSP review.");
    }
    if (builderComponentKeys.length > 12) {
      performanceIssues.push("Page has many components; check mobile performance before publish.");
    }

    return {
      page: pageIssues,
      section: sectionIssues,
      group: groupIssues,
      component: componentIssues,
      seo: seoIssues,
      performance: performanceIssues,
    };
  }, [activeComponents, builderComponentKeys, builderPageForm, builderState, pageCodeSnapshot]);

  useEffect(() => {
    function handlePreviewMessage(event: MessageEvent) {
      const data = recordFromUnknown(event.data);
      if (
        data.source !== "vendero-theme-builder-preview" ||
        data.type !== "component-selected"
      ) {
        return;
      }
      const componentIndex = Number(data.componentIndex);
      if (
        !Number.isFinite(componentIndex) ||
        componentIndex < 0 ||
        componentIndex >= builderComponentKeys.length
      ) {
        return;
      }
      setSelectedNode({
        type: "component",
        id: `${builderComponentKeys[componentIndex]}-${componentIndex}`,
        componentIndex,
      });
    }

    window.addEventListener("message", handlePreviewMessage);
    return () => window.removeEventListener("message", handlePreviewMessage);
  }, [builderComponentKeys]);

  function postPreviewBuilderState() {
    const target = previewFrameRef.current?.contentWindow;
    if (!target) return;
    const componentPreview =
      selectedComponentIndex !== null && selectedComponentPreviewPropsJson
        ? {
            componentIndex: selectedComponentIndex,
            props: parseJson(selectedComponentPreviewPropsJson, {}),
          }
        : null;
    target.postMessage(
      {
        source: "vendero-theme-builder-admin",
        type: "builder-state-updated",
        selectedComponentIndex,
        pageDesign: parseJson(pageDesignJson, {}),
        componentPreview,
      },
      "*",
    );
  }

  useEffect(() => {
    postPreviewBuilderState();
  }, [
    selectedComponentIndex,
    selectedComponentPreviewPropsJson,
    pageDesignJson,
  ]);

  function pageCodeValue(
    key: "html" | "css" | "js",
    savedValue: string,
    generatedValue: string,
  ) {
    return pageCodeTouched[key] || savedValue ? savedValue : generatedValue;
  }

  function setPageCodeField(
    key: "htmlCode" | "cssCode" | "jsCode",
    value: string,
  ) {
    const touchedKey =
      key === "htmlCode" ? "html" : key === "cssCode" ? "css" : "js";
    setPageCodeTouched((current) => ({ ...current, [touchedKey]: true }));
    setBuilderPageForm({ ...builderPageForm, [key]: value });
  }

  function setBuilderState(nextBuilderState: BuilderState) {
    setBuilderPageForm({
      ...builderPageForm,
      settingsSchema: settingsWithBuilderState(
        builderPageForm.settingsSchema,
        nextBuilderState,
      ),
    });
  }

  function updatePageDesign(patch: Partial<PageDesignSettings>) {
    setBuilderPageForm({
      ...builderPageForm,
      settingsSchema: settingsWithPageDesign(builderPageForm.settingsSchema, {
        ...pageDesign,
        ...patch,
      }),
    });
  }

  function updateSection(sectionId: string, patch: Partial<BuilderSection>) {
    setBuilderState({
      ...builderState,
      sections: builderState.sections.map((section) =>
        section.id === sectionId ? { ...section, ...patch } : section,
      ),
    });
  }

  function updateSectionLayout(
    sectionId: string,
    patch: Partial<BuilderLayout>,
  ) {
    setBuilderState({
      ...builderState,
      sections: builderState.sections.map((section) =>
        section.id === sectionId
          ? { ...section, layout: { ...section.layout, ...patch } }
          : section,
      ),
    });
  }

  function updateGroup(groupId: string, patch: Partial<BuilderGroup>) {
    setBuilderState({
      ...builderState,
      sections: builderState.sections.map((section) => ({
        ...section,
        groups: section.groups.map((group) =>
          group.id === groupId ? { ...group, ...patch } : group,
        ),
      })),
    });
  }

  function updateGroupLayout(groupId: string, patch: Partial<BuilderLayout>) {
    setBuilderState({
      ...builderState,
      sections: builderState.sections.map((section) => ({
        ...section,
        groups: section.groups.map((group) =>
          group.id === groupId
            ? { ...group, layout: { ...group.layout, ...patch } }
            : group,
        ),
      })),
    });
  }

  function addSection() {
    const section = {
      ...defaultBuilderSection(),
      id: builderId("section"),
      name: `Section ${builderState.sections.length + 1}`,
    };
    setBuilderState({
      ...builderState,
      sections: [...builderState.sections, section],
    });
    setSelectedNode({ type: "section", id: section.id });
  }

  function duplicateSection(section: BuilderSection) {
    const nextSection = {
      ...section,
      id: builderId("section"),
      name: `${section.name} copy`,
      groups: section.groups.map((group) => ({
        ...group,
        id: builderId("group"),
      })),
    };
    setBuilderState({
      ...builderState,
      sections: [...builderState.sections, nextSection],
    });
    setSelectedNode({ type: "section", id: nextSection.id });
  }

  function removeSection(sectionId: string) {
    const nextSections = builderState.sections.filter(
      (section) => section.id !== sectionId,
    );
    setBuilderState({
      ...builderState,
      sections: nextSections.length ? nextSections : [defaultBuilderSection()],
    });
    setSelectedNode({ type: "page", id: "page" });
  }

  function addGroup(sectionId: string) {
    const section = builderState.sections.find((item) => item.id === sectionId);
    if (!section) return;
    const group = {
      ...defaultBuilderGroup(),
      id: builderId("group"),
      name: `Group ${section.groups.length + 1}`,
    };
    updateSection(sectionId, { groups: [...section.groups, group] });
    setSelectedNode({ type: "group", id: group.id });
  }

  function duplicateGroup(sectionId: string, group: BuilderGroup) {
    const section = builderState.sections.find((item) => item.id === sectionId);
    if (!section) return;
    const nextGroup = {
      ...group,
      id: builderId("group"),
      name: `${group.name} copy`,
    };
    updateSection(sectionId, { groups: [...section.groups, nextGroup] });
    setSelectedNode({ type: "group", id: nextGroup.id });
  }

  function removeGroup(groupId: string) {
    setBuilderState({
      ...builderState,
      sections: builderState.sections.map((section) => {
        const groups = section.groups.filter((group) => group.id !== groupId);
        return {
          ...section,
          groups: groups.length ? groups : [defaultBuilderGroup()],
        };
      }),
    });
    setSelectedNode({ type: "page", id: "page" });
  }

  function toggleComponentEnabled(componentKey: string) {
    const disabled = builderState.disabledComponentKeys.includes(componentKey);
    setBuilderState({
      ...builderState,
      disabledComponentKeys: disabled
        ? builderState.disabledComponentKeys.filter((key) => key !== componentKey)
        : [...builderState.disabledComponentKeys, componentKey],
    });
  }

  function duplicateBuilderComponent(index: number) {
    const nextKeys = [...builderComponentKeys];
    nextKeys.splice(index + 1, 0, builderComponentKeys[index]);
    updateBuilderComponentKeys(nextKeys);
  }

  async function refresh(nextPageForm = builderPageForm) {
    const nextData = (await requestJson(
      "/api/v1/admin/site-themes",
    )) as NonNullable<SiteThemesData>;
    setData(nextData);
    const theme = nextData.themes.find((item) => item.slug === themeSlug);
    const savedPage = theme?.pages?.find(
      (page) =>
        page.pageKey === nextPageForm.pageKey &&
        page.pathTemplate === nextPageForm.pathTemplate,
    );
    if (theme && savedPage) {
      setBuilderPageId(savedPage.id);
      setPageForm(formFromPage(theme, savedPage));
      setDirty(false);
    } else if (theme) {
      setBuilderPageId(nextPageForm.id);
      setPageForm({
        ...nextPageForm,
        themeSlug: theme.slug,
      });
      setDirty(!nextPageForm.id);
    }
  }

  function setBuilderPageForm(nextForm: PageForm) {
    setDirty(true);
    setPageForm({
      ...nextForm,
      themeSlug: selectedTheme?.slug ?? themeSlug,
    });
  }

  function updateBuilderComponentKeys(keys: string[]) {
    setBuilderPageForm({
      ...builderPageForm,
      componentKeys: keys.join("\n"),
    });
  }

  function addBuilderComponent(componentKey: string, targetIndex?: number) {
    const nextKeys = [...builderComponentKeys];
    const insertIndex =
      typeof targetIndex === "number" ? targetIndex : nextKeys.length;
    nextKeys.splice(insertIndex, 0, componentKey);
    updateBuilderComponentKeys(nextKeys);
    setSelectedNode({
      type: "component",
      id: `${componentKey}-${insertIndex}`,
      componentIndex: insertIndex,
    });
  }

  function moveBuilderComponent(fromIndex: number, toIndex: number) {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= builderComponentKeys.length ||
      toIndex >= builderComponentKeys.length
    ) {
      return;
    }
    const nextKeys = [...builderComponentKeys];
    const [moved] = nextKeys.splice(fromIndex, 1);
    nextKeys.splice(toIndex, 0, moved);
    updateBuilderComponentKeys(nextKeys);
  }

  function removeBuilderComponent(index: number) {
    updateBuilderComponentKeys(
      builderComponentKeys.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  function updateComponentContentDraft(
    componentKey: string,
    patch: Partial<ComponentContentDraft>,
  ) {
    const component = componentForKey(activeComponents, componentKey);
    setComponentContentDrafts((current) => ({
      ...current,
      [componentKey]: {
        ...(current[componentKey] ?? componentContentDraftFrom(component)),
        ...patch,
      },
    }));
  }

  async function upsertHeaderLink(index?: number) {
    if (!selectedComponentKey || !selectedComponentContentDraft) return;
    const links = normalizeNavigationLinks(
      parseJson(selectedComponentContentDraft.navigationLinksJson, []),
    );
    const existing = typeof index === "number" ? links[index] : null;
    const result = await actionModal.form({
      title: existing ? "Edit header link" : "Add header link",
      description:
        "Use a page path like /routes or a section anchor like #cab-list.",
      confirmLabel: existing ? "Save link" : "Add link",
      fields: [
        {
          name: "label",
          label: "Link name",
          defaultValue: existing?.label ?? "",
          placeholder: "Cabs",
          required: true,
        },
        {
          name: "href",
          label: "Path or section id",
          defaultValue: existing?.href ?? "",
          placeholder: "#cab-list or /routes",
          required: true,
        },
      ],
    });
    if (!result.confirmed) return;
    const nextLink = {
      label: result.values.label.trim(),
      href: result.values.href.trim(),
    };
    if (!nextLink.label || !nextLink.href) return;
    const nextLinks =
      typeof index === "number"
        ? links.map((link, linkIndex) => (linkIndex === index ? nextLink : link))
        : [...links, nextLink];
    updateComponentContentDraft(selectedComponentKey, {
      navigationLinksJson: jsonText(nextLinks),
    });
  }

  function deleteHeaderLink(index: number) {
    if (!selectedComponentKey || !selectedComponentContentDraft) return;
    const links = normalizeNavigationLinks(
      parseJson(selectedComponentContentDraft.navigationLinksJson, []),
    ).filter((_link, linkIndex) => linkIndex !== index);
    updateComponentContentDraft(selectedComponentKey, {
      navigationLinksJson: jsonText(links),
    });
  }

  async function uploadThemeImage(
    file: File | null | undefined,
    label: string,
    onUploaded: (asset: { objectKey: string; url: string }) => void,
  ) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage(`Please upload an image file for ${label}.`);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage(`${label} must be 5 MB or smaller.`);
      return;
    }
    setWorking("theme-media");
    try {
      const uploaded = recordFromUnknown(await uploadAdminMedia(file));
      const objectKey = stringFromUnknown(uploaded.objectKey ?? uploaded.key).trim();
      const url = stringFromUnknown(uploaded.url ?? uploaded.fileUrl).trim();
      if (!objectKey || !url) {
        throw new Error("Upload finished without a trusted media key and preview URL.");
      }
      onUploaded({ objectKey, url });
      setMessage(`${label} uploaded. Save the page to apply it.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `${label} upload failed.`);
    } finally {
      setWorking(null);
    }
  }

  async function uploadHeaderLogo(file: File | null | undefined) {
    if (!file || !selectedComponentKey) return;
    await uploadThemeImage(file, "Header logo", ({ objectKey, url }) => {
      updateComponentContentDraft(selectedComponentKey, {
        logoImageObjectKey: objectKey,
        logoImageUrl: url,
      });
    });
  }

  async function addComponentDataField() {
    if (!selectedComponentKey || !selectedComponentContentDraft) return;
    const result = await actionModal.form({
      title: "Add component data field",
      description:
        "Define one field this component needs. Vendors can later fill these same keys from their own dataset.",
      confirmLabel: "Add field",
      fields: [
        {
          name: "key",
          label: "Field key",
          placeholder: "price",
          required: true,
        },
        {
          name: "label",
          label: "Label",
          placeholder: "Fare text",
          required: true,
        },
        {
          name: "type",
          label: "Type",
          placeholder: "text, number, image, url, boolean, json",
          defaultValue: "text",
          required: true,
        },
        {
          name: "required",
          label: "Required field",
          type: "checkbox",
        },
        {
          name: "example",
          label: "Example value",
          placeholder: "Rs. 2,499",
        },
      ],
    });
    if (!result.confirmed) return;
    const type = optionFromUnknown(
      result.values.type,
      ["text", "number", "image", "url", "boolean", "json"] as const,
      "text",
    );
    const nextField: ComponentDataField = {
      key: normalizeThemeDataFieldKey(result.values.key, type),
      label: result.values.label.trim(),
      type,
      required: result.values.required === "true",
      example: result.values.example ?? "",
    };
    const fields = normalizeDataFields(
      parseJson(selectedComponentContentDraft.dataFieldsJson, []),
    ).filter((field) => field.key !== nextField.key);
    updateComponentContentDraft(selectedComponentKey, {
      dataFieldsJson: jsonText([...fields, nextField]),
    });
  }

  async function editComponentDataField(fieldKey: string) {
    if (!selectedComponentKey || !selectedComponentContentDraft) return;
    const fields = normalizeDataFields(
      parseJson(selectedComponentContentDraft.dataFieldsJson, []),
    );
    const existing = fields.find((field) => field.key === fieldKey);
    if (!existing) return;
    const result = await actionModal.form({
      title: "Edit component data field",
      description: "Change the field label, type, requirement, or example.",
      confirmLabel: "Save field",
      fields: [
        { name: "key", label: "Field key", defaultValue: existing.key, required: true },
        { name: "label", label: "Label", defaultValue: existing.label, required: true },
        { name: "type", label: "Type", defaultValue: existing.type, required: true },
        { name: "required", label: "Required field", type: "checkbox", defaultValue: existing.required },
        { name: "example", label: "Example value", defaultValue: existing.example },
      ],
    });
    if (!result.confirmed) return;
    const type = optionFromUnknown(
      result.values.type,
      ["text", "number", "image", "url", "boolean", "json"] as const,
      existing.type,
    );
    const nextField: ComponentDataField = {
      key: normalizeThemeDataFieldKey(result.values.key, type),
      label: result.values.label.trim(),
      type,
      required: result.values.required === "true",
      example: result.values.example ?? "",
    };
    updateComponentContentDraft(selectedComponentKey, {
      dataFieldsJson: jsonText(fields.map((field) => (field.key === fieldKey ? nextField : field))),
    });
  }

  function deleteComponentDataField(fieldKey: string) {
    if (!selectedComponentKey || !selectedComponentContentDraft) return;
    const fields = normalizeDataFields(
      parseJson(selectedComponentContentDraft.dataFieldsJson, []),
    ).filter((field) => field.key !== fieldKey);
    updateComponentContentDraft(selectedComponentKey, {
      dataFieldsJson: jsonText(fields),
    });
  }

  function dataItemFormFields(fields: ComponentDataField[], item?: Record<string, unknown>) {
    return fields.map((field) => {
      const value = item?.[field.key];
      return {
        name: field.key,
        label: field.label,
        defaultValue:
          field.type === "boolean"
            ? boolFromUnknown(value, false)
            : field.type === "json"
              ? jsonText(value ?? {})
              : stringFromUnknown(value, field.example),
        placeholder: field.example,
        required: field.required,
        type:
          field.type === "boolean"
            ? ("checkbox" as const)
            : field.type === "json"
              ? ("textarea" as const)
              : field.type === "image"
                ? ("image" as const)
              : ("text" as const),
        imagePurpose: "platform.site-theme-asset" as const,
      };
    });
  }

  function dataItemFromValues(fields: ComponentDataField[], values: Record<string, string>) {
    return fields.reduce<Record<string, unknown>>((item, field) => {
      const value = values[field.key];
      if (field.type === "number") item[field.key] = Number(value || 0);
      else if (field.type === "boolean") item[field.key] = value === "true";
      else if (field.type === "json") item[field.key] = parseJson(value, {});
      else item[field.key] = value ?? "";
      return item;
    }, {});
  }

  async function addComponentDataItem() {
    if (!selectedComponentKey || !selectedComponentContentDraft) return;
    const fields = normalizeDataFields(parseJson(selectedComponentContentDraft.dataFieldsJson, []));
    if (!fields.length) {
      await addComponentDataField();
      return;
    }
    const result = await actionModal.form({
      title: "Add dummy data item",
      description: "Create one preview row for this component. This data is used only for theme building and preview.",
      confirmLabel: "Add item",
      fields: dataItemFormFields(fields),
    });
    if (!result.confirmed) return;
    const items = componentDataItemsFromDraft(selectedComponentContentDraft);
    updateComponentContentDraft(selectedComponentKey, {
      dataItemsJson: jsonText([...items, dataItemFromValues(fields, result.values)]),
    });
  }

  async function editComponentDataItem(index: number) {
    if (!selectedComponentKey || !selectedComponentContentDraft) return;
    const fields = normalizeDataFields(parseJson(selectedComponentContentDraft.dataFieldsJson, []));
    const items = componentDataItemsFromDraft(selectedComponentContentDraft);
    const existing = recordFromUnknown(items[index]);
    const result = await actionModal.form({
      title: "Edit dummy data item",
      description: "Update this preview row without editing JSON.",
      confirmLabel: "Save item",
      fields: dataItemFormFields(fields, existing),
    });
    if (!result.confirmed) return;
    updateComponentContentDraft(selectedComponentKey, {
      dataItemsJson: jsonText(
        items.map((item, itemIndex) =>
          itemIndex === index ? dataItemFromValues(fields, result.values) : item,
        ),
      ),
    });
  }

  function deleteComponentDataItem(index: number) {
    if (!selectedComponentKey || !selectedComponentContentDraft) return;
    const items = componentDataItemsFromDraft(selectedComponentContentDraft).filter(
      (_item, itemIndex) => itemIndex !== index,
    );
    updateComponentContentDraft(selectedComponentKey, {
      dataItemsJson: jsonText(items),
    });
  }

  function distanceRangesFromDraft(draft: ComponentContentDraft) {
    const parsed = parseJson(draft.distanceRangesJson, []);
    return Array.isArray(parsed) ? parsed.map(recordFromUnknown) : [];
  }

  async function upsertDistanceRange(index?: number) {
    if (!selectedComponentKey || !selectedComponentContentDraft) return;
    const ranges = distanceRangesFromDraft(selectedComponentContentDraft);
    const existing = typeof index === "number" ? ranges[index] : null;
    const result = await actionModal.form({
      title: existing ? "Edit distance range" : "Add distance range",
      description: "Advanced mode can use different per-km rates for different route distances.",
      confirmLabel: existing ? "Save range" : "Add range",
      fields: [
        { name: "fromKm", label: "From KM", defaultValue: stringFromUnknown(existing?.fromKm ?? existing?.from, "0"), required: true },
        { name: "toKm", label: "To KM", defaultValue: stringFromUnknown(existing?.toKm ?? existing?.to, "9999"), required: true },
        { name: "perKmRate", label: "Per KM rate", defaultValue: stringFromUnknown(existing?.perKmRate ?? existing?.rate, selectedComponentContentDraft.perKm), required: true },
        { name: "baseFare", label: "Base fare override", defaultValue: stringFromUnknown(existing?.baseFare ?? ""), placeholder: "Optional" },
      ],
    });
    if (!result.confirmed) return;
    const nextRange = {
      fromKm: Number(result.values.fromKm || 0),
      toKm: Number(result.values.toKm || 0),
      perKmRate: Number(result.values.perKmRate || 0),
      baseFare: result.values.baseFare ? Number(result.values.baseFare) : undefined,
    };
    const nextRanges =
      typeof index === "number"
        ? ranges.map((range, rangeIndex) => (rangeIndex === index ? nextRange : range))
        : [...ranges, nextRange];
    updateComponentContentDraft(selectedComponentKey, {
      distanceRangesJson: jsonText(nextRanges),
    });
  }

  function deleteDistanceRange(index: number) {
    if (!selectedComponentKey || !selectedComponentContentDraft) return;
    const ranges = distanceRangesFromDraft(selectedComponentContentDraft).filter(
      (_range, rangeIndex) => rangeIndex !== index,
    );
    updateComponentContentDraft(selectedComponentKey, {
      distanceRangesJson: jsonText(ranges),
    });
  }

  function seedSelectedComponentData() {
    if (!selectedComponentKey || !selectedComponentContentDraft) return;
    const datasetKey = normalizeThemeDataKey(
      selectedComponentContentDraft.datasetKey.trim() ||
        inferComponentDatasetKey(selectedComponent),
    );
    updateComponentContentDraft(selectedComponentKey, {
      datasetKey,
      dataFieldsJson: jsonText(defaultDataFieldsForDataset(datasetKey)),
      dataItemsJson: jsonText(defaultDataItemsForDataset(datasetKey)),
    });
  }

  async function persistComponentContentDraft(
    componentKey: string,
    draft: ComponentContentDraft,
  ) {
    const component = componentForKey(activeComponents, componentKey);
    if (!component) return null;
    const defaultProps = {
      ...recordFromUnknown(component.defaultProps),
      ...componentDefaultPropsFromDraft(draft),
    };
    const settingsSchema = {
      ...recordFromUnknown(component.settingsSchema),
      dataRequirements: componentDataRequirementsFromDraft(draft),
    };
    const payload = componentPayloadFrom(component, defaultProps, settingsSchema);
    if (component.id < 0) {
      await requestJson("/api/v1/admin/site-theme-components", payload, "POST");
      return "Fixed component created and settings saved.";
    }
    await requestJson(
      `/api/v1/admin/site-theme-components/${component.id}`,
      payload,
      "PUT",
    );
    return "Component content updated.";
  }

  async function persistComponentContentDrafts() {
    const drafts = Object.entries(componentContentDrafts);
    let savedCount = 0;
    for (const [componentKey, draft] of drafts) {
      const message = await persistComponentContentDraft(componentKey, draft);
      if (message) savedCount += 1;
    }
    return savedCount;
  }

  async function saveSelectedComponentContent() {
    if (!selectedComponent || !selectedComponentKey || !selectedComponentContentDraft) return;
    setWorking("component-content");
    setMessage("");
    try {
      const message = await persistComponentContentDraft(
        selectedComponentKey,
        selectedComponentContentDraft,
      );
      const pageMessage = await persistPage();
      setMessage(`${message ?? "Component content updated."} ${pageMessage}`);
      await refresh(builderPageForm);
      setComponentContentDrafts((current) => {
        const nextDrafts = { ...current };
        delete nextDrafts[selectedComponentKey];
        return nextDrafts;
      });
      setPreviewRefreshKey((current) => current + 1);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to update component content",
      );
    } finally {
      setWorking(null);
    }
  }

  function handleLibraryDragStart(
    event: DragEvent<HTMLElement>,
    componentKey: string,
  ) {
    event.dataTransfer.setData(
      "application/x-vendero-component-key",
      componentKey,
    );
    event.dataTransfer.effectAllowed = "copy";
  }

  function handleCanvasDragStart(
    event: DragEvent<HTMLElement>,
    index: number,
  ) {
    setDragCanvasIndex(index);
    event.dataTransfer.setData(
      "application/x-vendero-canvas-index",
      String(index),
    );
    event.dataTransfer.effectAllowed = "move";
  }

  function handleBuilderDrop(
    event: DragEvent<HTMLElement>,
    targetIndex?: number,
  ) {
    event.preventDefault();
    const sourceIndexValue = event.dataTransfer.getData(
      "application/x-vendero-canvas-index",
    );
    const componentKey = event.dataTransfer.getData(
      "application/x-vendero-component-key",
    );

    if (sourceIndexValue !== "") {
      const sourceIndex = Number(sourceIndexValue);
      const nextKeys = [...builderComponentKeys];
      if (!Number.isFinite(sourceIndex) || sourceIndex < 0) return;
      const [moved] = nextKeys.splice(sourceIndex, 1);
      const insertIndex =
        typeof targetIndex === "number"
          ? targetIndex > sourceIndex
            ? targetIndex - 1
            : targetIndex
          : nextKeys.length;
      nextKeys.splice(Math.max(0, insertIndex), 0, moved);
      updateBuilderComponentKeys(nextKeys);
      setDragCanvasIndex(null);
      return;
    }

    if (componentKey) {
      addBuilderComponent(componentKey, targetIndex);
    }
  }

  function handleBuilderPageChange(pageId: string) {
    if (pageId === "new") {
      const nextPage = pageFormForNewDraftPage(selectedTheme);
      setBuilderPageId(null);
      setPageForm(nextPage);
      setPageCodeTouched({ html: false, css: false, js: false });
      setSelectedNode({ type: "page", id: "page" });
      setDirty(true);
      setMessage("New page draft ready. Add sections/components, then Save.");
      return;
    }
    const page = selectedTheme?.pages?.find(
      (item) => String(item.id) === pageId,
    );
    if (page && selectedTheme) {
      if (builderPageId === page.id) {
        setBuilderPageId(null);
        setSelectedNode({ type: "page", id: "page" });
        return;
      }
      if (builderPageForm.id === page.id) {
        setBuilderPageId(page.id);
        setSelectedNode({ type: "page", id: "page" });
        return;
      }
      setBuilderPageId(page.id);
      setPageForm(formFromPage(selectedTheme, page));
      setPageCodeTouched({ html: false, css: false, js: false });
      setSelectedNode({ type: "page", id: "page" });
      setDirty(false);
    }
  }

  function pagePayloadFrom(form: PageForm, sortOrder?: number) {
    return {
      themeSlug: selectedTheme?.slug ?? themeSlug,
      pageKey: form.pageKey.trim(),
      name: form.name.trim(),
      pathTemplate: form.pathTemplate.trim(),
      componentKeys: parseLines(form.componentKeys),
      htmlCode: form.htmlCode,
      cssCode: form.cssCode,
      jsCode: form.jsCode,
      settingsSchema: parseJson(form.settingsSchema, {}),
      isrRevalidateSeconds: Number(form.isrRevalidateSeconds || 300),
      isActive: form.isActive,
      sortOrder: sortOrder ?? Number(form.sortOrder || 0),
    };
  }

  async function ensureFixedComponentRows(componentKeys: string[]) {
    const uniqueKeys = Array.from(new Set(componentKeys));
    for (const componentKey of uniqueKeys) {
      const component = componentForKey(activeComponents, componentKey);
      if (!component || component.id > 0 || !isFixedComponent(component)) continue;
      try {
        await requestJson(
          "/api/v1/admin/site-theme-components",
          componentPayloadFrom(component, recordFromUnknown(component.defaultProps)),
          "POST",
        );
      } catch {
        // Another admin or migration may have created the fixed row already.
      }
    }
  }

  async function persistPage() {
    await ensureFixedComponentRows(builderComponentKeys);
    const body = pagePayloadFrom(builderPageForm);
    if (builderPageForm.id) {
      await requestJson(
        `/api/v1/admin/site-theme-pages/${builderPageForm.id}`,
        body,
        "PUT",
      );
      return "Theme page updated.";
    }
    await requestJson("/api/v1/admin/site-theme-pages", body, "POST");
    return "Theme page created.";
  }

  async function saveBuilderChanges() {
    setWorking("page");
    setMessage("");
    try {
      const componentDraftCount = await persistComponentContentDrafts();
      const pageMessage = await persistPage();
      setMessage(
        componentDraftCount > 0
          ? `${componentDraftCount} component setting${
              componentDraftCount === 1 ? "" : "s"
            } saved. ${pageMessage}`
          : pageMessage,
      );
      await refresh(builderPageForm);
      setComponentContentDrafts({});
      setDirty(false);
      setPreviewRefreshKey((current) => current + 1);
      return true;
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save theme page",
      );
      return false;
    } finally {
      setWorking(null);
    }
  }

  async function submitPage() {
    await saveBuilderChanges();
  }

  async function saveAndOpenPreview() {
    const saved = await saveBuilderChanges();
    if (saved) {
      window.open(themePreviewUrl, "_blank", "noopener,noreferrer");
    }
  }

  async function duplicatePage() {
    setWorking("page-duplicate");
    setMessage("");
    try {
      const duplicate = {
        ...builderPageForm,
        id: null,
        pageKey: `${builderPageForm.pageKey || "page"}-copy`,
        name: `${builderPageForm.name || "Page"} copy`,
        pathTemplate:
          builderPageForm.pathTemplate === "/"
            ? "/copy"
            : `${builderPageForm.pathTemplate}-copy`,
        sortOrder: String(Number(builderPageForm.sortOrder || 0) + 1),
      };
      await requestJson("/api/v1/admin/site-theme-pages", pagePayloadFrom(duplicate), "POST");
      setMessage("Page duplicated.");
      await refresh(duplicate);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to duplicate page");
    } finally {
      setWorking(null);
    }
  }

  async function deletePage() {
    if (!builderPageForm.id) return;
    const confirmed = await actionModal.confirm({
      title: "Delete page",
      description: `Delete "${builderPageForm.name}" from this theme? This also removes its sections, groups, and component instances.`,
      confirmLabel: "Delete page",
      variant: "danger",
    });
    if (!confirmed) return;
    setWorking("page-delete");
    setMessage("");
    try {
      const remainingPages = sortedThemePages.filter(
        (page) => page.id !== builderPageForm.id,
      );
      const nextPageForm =
        remainingPages[0] && selectedTheme
          ? formFromPage(selectedTheme, remainingPages[0])
          : pageFormForNewDraftPage(selectedTheme);
      await requestJson(
        `/api/v1/admin/site-theme-pages/${builderPageForm.id}`,
        undefined,
        "DELETE",
      );
      setMessage("Page deleted.");
      await refresh(nextPageForm);
      setSelectedNode({ type: "page", id: "page" });
      setPageCodeTouched({ html: false, css: false, js: false });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete page");
    } finally {
      setWorking(null);
    }
  }

  async function movePage(pageId: number, direction: -1 | 1) {
    if (!selectedTheme) return;
    const pages = [...(selectedTheme.pages ?? [])].sort(
      (left, right) => left.sortOrder - right.sortOrder || left.id - right.id,
    );
    const index = pages.findIndex((page) => page.id === pageId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= pages.length) return;
    const current = pages[index];
    const target = pages[targetIndex];
    setWorking("page-order");
    setMessage("");
    try {
      await Promise.all([
        requestJson(
          `/api/v1/admin/site-theme-pages/${current.id}`,
          pagePayloadFrom(formFromPage(selectedTheme, current), target.sortOrder),
          "PUT",
        ),
        requestJson(
          `/api/v1/admin/site-theme-pages/${target.id}`,
          pagePayloadFrom(formFromPage(selectedTheme, target), current.sortOrder),
          "PUT",
        ),
      ]);
      setMessage("Page order updated.");
      await refresh(builderPageForm);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to reorder pages");
    } finally {
      setWorking(null);
    }
  }

  async function movePageTo(sourceId: number, targetId: number) {
    if (!selectedTheme || sourceId === targetId) return;
    const pages = [...(selectedTheme.pages ?? [])].sort(
      (left, right) => left.sortOrder - right.sortOrder || left.id - right.id,
    );
    const sourceIndex = pages.findIndex((page) => page.id === sourceId);
    const targetIndex = pages.findIndex((page) => page.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const nextPages = [...pages];
    const [moved] = nextPages.splice(sourceIndex, 1);
    nextPages.splice(targetIndex, 0, moved);
    setWorking("page-order");
    setMessage("");
    try {
      await Promise.all(
        nextPages.map((page, index) =>
          requestJson(
            `/api/v1/admin/site-theme-pages/${page.id}`,
            pagePayloadFrom(formFromPage(selectedTheme, page), index * 10),
            "PUT",
          ),
        ),
      );
      setMessage("Page order updated.");
      await refresh(builderPageForm);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to reorder pages");
    } finally {
      setWorking(null);
    }
  }

  function moveSectionTo(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    const sourceIndex = builderState.sections.findIndex(
      (section) => section.id === sourceId,
    );
    const targetIndex = builderState.sections.findIndex(
      (section) => section.id === targetId,
    );
    if (sourceIndex < 0 || targetIndex < 0) return;
    const nextSections = [...builderState.sections];
    const [moved] = nextSections.splice(sourceIndex, 1);
    nextSections.splice(targetIndex, 0, moved);
    setBuilderState({ ...builderState, sections: nextSections });
  }

  function moveGroupTo(sectionId: string, sourceId: string, targetId: string) {
    const section = builderState.sections.find((item) => item.id === sectionId);
    if (!section || sourceId === targetId) return;
    const sourceIndex = section.groups.findIndex((group) => group.id === sourceId);
    const targetIndex = section.groups.findIndex((group) => group.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const nextGroups = [...section.groups];
    const [moved] = nextGroups.splice(sourceIndex, 1);
    nextGroups.splice(targetIndex, 0, moved);
    updateSection(sectionId, { groups: nextGroups });
  }

  const sortedThemePages = [...(selectedTheme?.pages ?? [])].sort(
    (left, right) => left.sortOrder - right.sortOrder || left.id - right.id,
  );
  const validationCount = Object.values(validationGroups).reduce(
    (total, issues) => total + issues.length,
    0,
  );
  const themePreviewUrl = themePagePreviewUrl(
    selectedTheme?.slug ?? themeSlug,
    builderPageForm.pathTemplate,
  );
  const previewFrameParams = new URLSearchParams({
    builderSelect: "1",
    previewRefresh: String(previewRefreshKey),
  });
  const previewFrameUrl = `${themePreviewUrl}&${previewFrameParams.toString()}`;

  if (!selectedTheme) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 p-8 text-center text-sm text-muted-foreground">
        Theme not found.
      </div>
    );
  }

  return (
    <section className="fixed inset-0 z-50 flex h-screen flex-col overflow-hidden bg-background text-foreground">
      {actionModal.modal}
      <div className="flex h-14 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-background/95 px-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Button asChild type="button" size="sm" variant="outline">
            <Link href="/site-themes">
              <ArrowLeft className="h-4 w-4" />
              Theme cards
            </Link>
          </Button>
          <Badge variant="outline" className="rounded-full">
            {selectedTheme.name}
          </Badge>
          <Badge variant="secondary" className="rounded-full">
            {selectedTheme.rendererKey}
          </Badge>
          {message ? (
            <span className="text-sm text-muted-foreground">{message}</span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {previewDevices.map((device) => {
            const Icon = device.icon;
            return (
              <Button
                key={device.key}
                type="button"
                size="sm"
                variant={previewDevice === device.key ? "default" : "outline"}
                onClick={() => setPreviewDevice(device.key)}
              >
                <Icon className="h-4 w-4" />
                {device.label}
              </Button>
            );
          })}
          <Button
            type="button"
            size="sm"
            title="Save theme page"
            onClick={() => void submitPage()}
            disabled={
              working === "page" ||
              !builderPageForm.pageKey.trim() ||
              !builderPageForm.name.trim()
            }
          >
            <Save className="h-4 w-4" />
            {working === "page" ? "Saving..." : dirty ? "Save changes" : "Save"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            title="Save and open white-label preview"
            onClick={() => void saveAndOpenPreview()}
            disabled={
              working === "page" ||
              !builderPageForm.pageKey.trim() ||
              !builderPageForm.name.trim()
            }
          >
            <ExternalLink className="h-4 w-4" />
            Preview
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[320px_minmax(0,1fr)_380px]">
        <aside className="flex min-h-0 flex-col border-r border-border/70 bg-background p-3">
          <div className="mb-3 grid shrink-0 grid-cols-2 gap-2 rounded-lg border border-border/70 bg-muted/30 p-1">
            {(["pages", "components"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                className={[
                  "flex h-9 items-center justify-center gap-2 rounded-md text-xs font-semibold transition-colors",
                  editorSidebarTab === tab
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
                ].join(" ")}
                onClick={() => setEditorSidebarTab(tab)}
              >
                {tab === "pages" ? (
                  <ListTree className="h-3.5 w-3.5" />
                ) : (
                  <Library className="h-3.5 w-3.5" />
                )}
                {tab === "pages" ? "Page" : "Components"}
              </button>
            ))}
          </div>
          <div
            className={
              editorSidebarTab === "pages"
                ? "flex min-h-0 flex-1 flex-col"
                : "hidden"
            }
          >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <ListTree className="h-4 w-4" />
                Theme tree
              </h3>
              <p className="text-xs text-muted-foreground">
                Page to section to group to component.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              title="Create page"
              onClick={() => handleBuilderPageChange("new")}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {!builderPageForm.id ? (
              <div className="rounded-lg border border-primary/60 bg-primary/10 p-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    onClick={() => setSelectedNode({ type: "page", id: "page" })}
                  >
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {builderPageForm.name || "New page"}
                      </p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">
                        {builderPageForm.pathTemplate || "/new-page"}
                      </p>
                    </span>
                  </button>
                  <Badge variant="warning">draft</Badge>
                </div>
              </div>
            ) : null}
            {sortedThemePages.map((page) => {
              const isCurrent = page.id === builderPageId;
              return (
                <div
                  key={page.id}
                  draggable
                  onDragStart={() =>
                    setDragTreeNode({ type: "page", id: String(page.id) })
                  }
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (dragTreeNode?.type === "page") {
                      void movePageTo(Number(dragTreeNode.id), page.id);
                    }
                    setDragTreeNode(null);
                  }}
                  className={[
                    "rounded-lg border p-2",
                    isCurrent
                      ? "border-primary/60 bg-primary/10"
                      : "border-border/70 bg-card/50 hover:border-border",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      onClick={() => handleBuilderPageChange(String(page.id))}
                    >
                      {isCurrent ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <span className="min-w-0">
                        <p className="truncate text-sm font-semibold">{page.name}</p>
                        <p className="truncate font-mono text-[11px] text-muted-foreground">
                          {page.pathTemplate}
                        </p>
                      </span>
                    </button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      title="Move page up"
                      onClick={() => void movePage(page.id, -1)}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      title="Move page down"
                      onClick={() => void movePage(page.id, 1)}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {isCurrent ? (
                    <div className="mt-2 space-y-1 border-l border-border/70 pl-3">
                      <div className="mb-2 rounded-md border border-border/60 bg-background/45 p-2 text-xs">
                        <div className="grid gap-1 text-muted-foreground">
                          <span className="flex items-center justify-between gap-2">
                            <span>Title</span>
                            <span className="truncate font-medium text-foreground">{page.name}</span>
                          </span>
                          <span className="flex items-center justify-between gap-2">
                            <span>Path</span>
                            <span className="truncate font-mono text-foreground">{page.pathTemplate}</span>
                          </span>
                          <span className="flex items-center justify-between gap-2">
                            <span>Key</span>
                            <span className="truncate font-mono text-foreground">{page.pageKey}</span>
                          </span>
                          <span className="flex items-center justify-between gap-2">
                            <span>Status</span>
                            <Badge variant={page.isActive ? "success" : "warning"}>
                              {page.isActive ? "active" : "hidden"}
                            </Badge>
                          </span>
                        </div>
                      </div>
                      {builderState.sections.map((section) => (
                        <div
                          key={section.id}
                          draggable
                          onDragStart={() =>
                            setDragTreeNode({ type: "section", id: section.id })
                          }
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => {
                            if (dragTreeNode?.type === "section") {
                              moveSectionTo(dragTreeNode.id, section.id);
                            }
                            setDragTreeNode(null);
                          }}
                          className="rounded-md border border-border/60 bg-background/35 p-2"
                        >
                          <button
                            type="button"
                            className={[
                              "flex w-full items-center justify-between gap-2 text-left text-xs font-semibold",
                              selectedNode.type === "section" &&
                              selectedNode.id === section.id
                                ? "text-primary"
                                : "",
                            ].join(" ")}
                            onClick={() =>
                              setSelectedNode({
                                type: "section",
                                id: section.id,
                              })
                            }
                          >
                            <span className="truncate">
                              {section.enabled ? "" : "Hidden "} {section.name}
                            </span>
                            <Badge variant="outline">section</Badge>
                          </button>
                          <div className="mt-2 space-y-1 border-l border-border/70 pl-3">
                            {section.groups.map((group) => (
                              <div
                                key={group.id}
                                draggable
                                onDragStart={() =>
                                  setDragTreeNode({
                                    type: "group",
                                    id: group.id,
                                  })
                                }
                                onDragOver={(event) => event.preventDefault()}
                                onDrop={() => {
                                  if (dragTreeNode?.type === "group") {
                                    moveGroupTo(
                                      section.id,
                                      dragTreeNode.id,
                                      group.id,
                                    );
                                  }
                                  setDragTreeNode(null);
                                }}
                                className="rounded-md border border-border/60 bg-card/40 p-2"
                              >
                                <button
                                  type="button"
                                  className={[
                                    "flex w-full items-center justify-between gap-2 text-left text-xs",
                                    selectedNode.type === "group" &&
                                    selectedNode.id === group.id
                                      ? "text-primary"
                                      : "",
                                  ].join(" ")}
                                  onClick={() =>
                                    setSelectedNode({
                                      type: "group",
                                      id: group.id,
                                    })
                                  }
                                >
                                  <span className="truncate">
                                    {group.enabled ? "" : "Hidden "} {group.name}
                                  </span>
                                  <Badge variant="outline">group</Badge>
                                </button>
                                <div className="mt-2 space-y-1 border-l border-border/70 pl-3">
                                  {builderComponentKeys.map((componentKey, index) => (
                                    <button
                                      key={`${componentKey}-tree-${index}`}
                                      type="button"
                                      draggable
                                      onDragStart={(event) =>
                                        handleCanvasDragStart(event, index)
                                      }
                                      onDragOver={(event) => event.preventDefault()}
                                      onDrop={(event) => handleBuilderDrop(event, index)}
                                      className={[
                                        "flex w-full items-center justify-between gap-2 rounded border border-transparent px-2 py-1 text-left text-xs hover:border-border/70 hover:bg-background/40",
                                        selectedNode.type === "component" &&
                                        selectedNode.componentIndex === index
                                          ? "border-primary/60 bg-primary/10 text-primary"
                                          : "",
                                        builderState.disabledComponentKeys.includes(
                                          componentKey,
                                        )
                                          ? "opacity-50"
                                          : "",
                                      ].join(" ")}
                                      onClick={() =>
                                        setSelectedNode({
                                          type: "component",
                                          id: `${componentKey}-${index}`,
                                          componentIndex: index,
                                        })
                                      }
                                    >
                                      <span className="truncate">
                                        {componentNameForKey(
                                          activeComponents,
                                          componentKey,
                                        )}
                                      </span>
                                      <GripVertical className="h-3 w-3 text-muted-foreground" />
                                    </button>
                                  ))}
                                  {!builderComponentKeys.length ? (
                                    <p className="rounded border border-dashed border-border/70 p-2 text-center text-xs text-muted-foreground">
                                      Empty group
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 w-full justify-start text-xs"
                              onClick={() => addGroup(section.id)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add group
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 w-full justify-start"
                        onClick={addSection}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add section
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
            {!sortedThemePages.length ? (
              <TableEmpty label="No pages yet. Create and save a page." />
            ) : null}
          </div>
          </div>

          <div
            className={
              editorSidebarTab === "components"
                ? "flex min-h-0 flex-1 flex-col"
                : "hidden"
            }
          >
          <div className="flex min-h-0 flex-1 flex-col">
            <div>
              <h3 className="text-sm font-semibold">Components Library</h3>
              <p className="text-xs text-muted-foreground">
                Drag components into the selected group.
              </p>
            </div>
            <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {activeComponents.map((component) => (
                <ComponentLibraryItem
                  key={component.id}
                  component={component}
                  onAdd={() => addBuilderComponent(component.componentKey)}
                  onDragStart={(event) =>
                    handleLibraryDragStart(event, component.componentKey)
                  }
                />
              ))}
              {!activeComponents.length ? (
                <TableEmpty label="No components yet." />
              ) : null}
            </div>
          </div>
          </div>
        </aside>

        <div className="min-h-0 space-y-4 overflow-y-auto bg-muted/20 p-4">
          <div className="rounded-xl border border-border/70 bg-background/25 p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Responsive Preview</h3>
                <p className="text-xs text-muted-foreground">
                  {builderPageForm.pathTemplate || "/"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {dirty ? <Badge variant="warning">Unsaved</Badge> : <Badge variant="success">Saved</Badge>}
                <Badge variant="outline" className="rounded-full">
                  {previewDevice}
                </Badge>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl bg-muted/45 p-4">
              <div
                className="mx-auto overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm transition-all"
                style={{
                  maxWidth: previewWidth,
                  width: previewDevice === "desktop" ? "100%" : previewWidth,
                }}
              >
                <iframe
                  ref={previewFrameRef}
                  key={previewFrameUrl}
                  className="h-[720px] w-full border-0 bg-white"
                  src={previewFrameUrl}
                  title={`${selectedTheme.name} runtime preview`}
                  onLoad={postPreviewBuilderState}
                />
              </div>
              {dirty ? (
                <p className="mx-auto mt-2 max-w-xl text-center text-xs text-muted-foreground">
                  Preview applies page design live. Save to publish layout, content, and data changes.
                </p>
              ) : null}
              <div
                className="hidden"
                style={{
                  maxWidth: previewWidth,
                  width: previewDevice === "desktop" ? "100%" : previewWidth,
                }}
              >
                {enabledSections.length ? (
                  enabledSections.map((section, sectionIndex) => {
                    const enabledGroups = section.groups.filter((group) => group.enabled);
                    return (
	                      <section
	                        key={`${section.id}-preview-section`}
	                        className={[
	                          "group/section relative border-b border-border/60 transition-shadow last:border-b-0",
	                          selectedNode.type === "section" && selectedNode.id === section.id
	                            ? "ring-2 ring-primary/50"
	                            : "hover:ring-1 hover:ring-primary/25",
	                        ].join(" ")}
	                        onClick={() => setSelectedNode({ type: "section", id: section.id })}
	                        style={sectionOuterPreviewStyle(section.layout)}
	                      >
	                        <div className="absolute right-3 top-3 z-10 hidden gap-1 rounded-md border border-border/70 bg-background/90 p-1 shadow-sm group-hover/section:flex">
	                          <Button
	                            type="button"
	                            size="sm"
	                            variant="ghost"
	                            className="h-7 w-7 p-0"
	                            title="Edit section"
	                            onClick={(event) => {
	                              event.stopPropagation();
	                              setSelectedNode({ type: "section", id: section.id });
	                            }}
	                          >
	                            <Pencil className="h-3.5 w-3.5" />
	                          </Button>
	                          <Button
	                            type="button"
	                            size="sm"
	                            variant="ghost"
	                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
	                            title="Remove section"
	                            onClick={(event) => {
	                              event.stopPropagation();
	                              removeSection(section.id);
	                            }}
	                          >
	                            <X className="h-3.5 w-3.5" />
	                          </Button>
	                        </div>
	                        <div
	                          className="mx-auto"
                          style={sectionInnerPreviewStyle(section.layout, previewDevice)}
                        >
                          {enabledGroups.length ? (
                            enabledGroups.map((group, groupIndex) => {
                              const previewKeys =
                                sectionIndex === 0 && groupIndex === 0
                                  ? enabledComponentKeys
                                  : [];
                              return (
	                                <div
	                                  key={`${group.id}-preview-group`}
	                                  className={[
	                                    "group/container relative min-w-0 rounded-md border border-transparent p-1 transition-colors",
	                                    selectedNode.type === "group" && selectedNode.id === group.id
	                                      ? "border-primary/60"
	                                      : "hover:border-primary/30",
	                                  ].join(" ")}
	                                  onClick={(event) => {
	                                    event.stopPropagation();
	                                    setSelectedNode({ type: "group", id: group.id });
	                                  }}
	                                  style={groupPreviewStyle(group.layoutKey, group.layout)}
	                                >
	                                  <div className="absolute right-2 top-2 z-10 hidden gap-1 rounded-md border border-border/70 bg-background/90 p-1 shadow-sm group-hover/container:flex">
	                                    <Button
	                                      type="button"
	                                      size="sm"
	                                      variant="ghost"
	                                      className="h-7 w-7 p-0"
	                                      title="Edit container"
	                                      onClick={(event) => {
	                                        event.stopPropagation();
	                                        setSelectedNode({ type: "group", id: group.id });
	                                      }}
	                                    >
	                                      <Pencil className="h-3.5 w-3.5" />
	                                    </Button>
	                                    <Button
	                                      type="button"
	                                      size="sm"
	                                      variant="ghost"
	                                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
	                                      title="Remove container"
	                                      onClick={(event) => {
	                                        event.stopPropagation();
	                                        removeGroup(group.id);
	                                      }}
	                                    >
	                                      <X className="h-3.5 w-3.5" />
	                                    </Button>
	                                  </div>
	                                  {previewKeys.length ? (
	                                    previewKeys.map((componentKey, index) => (
	                                      <div
	                                        key={`${componentKey}-preview-${index}`}
	                                        className={[
	                                          "group/element relative rounded-md border border-transparent transition-colors",
	                                          selectedNode.type === "component" &&
	                                          selectedNode.componentIndex === index
	                                            ? "border-primary/70"
	                                            : "hover:border-primary/35",
	                                        ].join(" ")}
	                                        onClick={(event) => {
	                                          event.stopPropagation();
	                                          setSelectedNode({
	                                            type: "component",
	                                            id: `${componentKey}-${index}`,
	                                            componentIndex: index,
	                                          });
	                                        }}
	                                      >
	                                        <div className="absolute right-2 top-2 z-20 hidden gap-1 rounded-md border border-border/70 bg-background/90 p-1 shadow-sm group-hover/element:flex">
	                                          <Button
	                                            type="button"
	                                            size="sm"
	                                            variant="ghost"
	                                            className="h-7 w-7 p-0"
	                                            title="Edit element"
	                                            onClick={(event) => {
	                                              event.stopPropagation();
	                                              setSelectedNode({
	                                                type: "component",
	                                                id: `${componentKey}-${index}`,
	                                                componentIndex: index,
	                                              });
	                                            }}
	                                          >
	                                            <Pencil className="h-3.5 w-3.5" />
	                                          </Button>
	                                          <Button
	                                            type="button"
	                                            size="sm"
	                                            variant="ghost"
	                                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
	                                            title="Remove element"
	                                            onClick={(event) => {
	                                              event.stopPropagation();
	                                              removeBuilderComponent(index);
	                                            }}
	                                          >
	                                            <X className="h-3.5 w-3.5" />
	                                          </Button>
	                                        </div>
	                                        <SiteComponentPreview
	                                          componentKey={componentKey}
	                                          component={componentForKey(activeComponents, componentKey)}
	                                          theme={selectedTheme}
	                                          index={index}
	                                        />
	                                      </div>
	                                    ))
                                  ) : (
                                    <div className="grid min-h-32 place-items-center rounded-lg border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
                                      {sectionIndex === 0 && groupIndex === 0
                                        ? "Preview appears after enabled components are added."
                                        : "Empty group"}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="grid min-h-32 place-items-center rounded-lg border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
                              Add a group to render this section.
                            </div>
                          )}
                        </div>
                      </section>
                    );
                  })
                ) : (
                  <div className="grid min-h-80 place-items-center border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                    Enable a section to preview this page.
                  </div>
                )}
              </div>
            </div>
          </div>

	          <div className="hidden rounded-xl border border-border/70 bg-background/25">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 p-3">
              <div>
                <h3 className="text-sm font-semibold">Canvas Components</h3>
                <p className="text-xs text-muted-foreground">
                  Drag to reorder. Disabled components remain in the tree but do not render.
                </p>
              </div>
              <Button
                type="button"
                onClick={submitPage}
                disabled={
                  working === "page" ||
                  !builderPageForm.pageKey.trim() ||
                  !builderPageForm.name.trim()
                }
              >
                <Save className="h-4 w-4" />
                {working === "page" ? "Saving..." : "Save"}
              </Button>
            </div>
            <div
              className="min-h-[260px] space-y-2 p-3"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleBuilderDrop(event)}
            >
              {builderComponentKeys.map((componentKey, index) => (
                <div
                  key={`${componentKey}-${index}`}
                  draggable
                  onDragStart={(event) => handleCanvasDragStart(event, index)}
                  onDragEnd={() => setDragCanvasIndex(null)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleBuilderDrop(event, index)}
                  className={[
                    "flex items-center gap-3 rounded-lg border border-border/70 bg-card/70 p-3 hover:border-primary/40",
                    dragCanvasIndex === index ? "opacity-50" : "",
                    builderState.disabledComponentKeys.includes(componentKey)
                      ? "opacity-60"
                      : "",
                  ].join(" ")}
                  onClick={() =>
                    setSelectedNode({
                      type: "component",
                      id: `${componentKey}-${index}`,
                      componentIndex: index,
                    })
                  }
                >
                  <div className="grid h-10 w-10 shrink-0 cursor-grab place-items-center rounded-md bg-primary/10 text-primary active:cursor-grabbing">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {componentNameForKey(activeComponents, componentKey)}
                    </p>
                    <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                      {componentKey}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0"
                      title="Move up"
                      onClick={(event) => {
                        event.stopPropagation();
                        moveBuilderComponent(index, index - 1);
                      }}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0"
                      title="Move down"
                      onClick={(event) => {
                        event.stopPropagation();
                        moveBuilderComponent(index, index + 1);
                      }}
                      disabled={index === builderComponentKeys.length - 1}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0"
                      title="Duplicate"
                      onClick={(event) => {
                        event.stopPropagation();
                        duplicateBuilderComponent(index);
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0"
                      title={
                        builderState.disabledComponentKeys.includes(componentKey)
                          ? "Enable"
                          : "Disable"
                      }
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleComponentEnabled(componentKey);
                      }}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      title="Delete"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeBuilderComponent(index);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              {!builderComponentKeys.length ? (
                <div className="grid min-h-[240px] place-items-center rounded-lg border border-dashed border-border/80 bg-background/40 p-8 text-center">
                  <div>
                    <Layers3 className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-3 text-sm font-semibold">Page canvas is empty</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Drag or add components from the library.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

	          <div className="hidden rounded-xl border border-border/70 bg-background/25 p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Sandboxed HTML Preview</h3>
                <p className="font-mono text-xs text-muted-foreground">
                  {builderPageForm.pageKey || "page"} / {builderPageForm.pathTemplate || "/"}
                </p>
              </div>
              <Badge variant="outline" className="rounded-full">HTML CSS JS</Badge>
            </div>
            <HtmlCodePreview
              title={builderPageForm.name || "Theme page"}
              htmlCode={pageCodeSnapshot.htmlCode}
              cssCode={pageCodeSnapshot.cssCode}
              jsCode={pageCodeSnapshot.jsCode}
              minHeight={360}
            />
          </div>
        </div>

        <aside className="min-h-0 space-y-4 overflow-y-auto border-l border-border/70 bg-background p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Settings</h3>
              <p className="text-xs text-muted-foreground">
                Selected {selectedNode.type}
              </p>
            </div>
            <Badge variant={validationCount ? "warning" : "success"}>
              {validationCount} issues
            </Badge>
          </div>

          {selectedNode.type === "page" ? (
            <div className="space-y-3">
              <SettingsSection
                badge={!builderPageForm.id ? <Badge variant="warning">draft</Badge> : null}
                icon={<FileText className="h-3.5 w-3.5" />}
                title="Page settings"
              >
                <Input
                  placeholder="Page name"
                  value={builderPageForm.name}
                  onChange={(event) =>
                    setBuilderPageForm({ ...builderPageForm, name: event.target.value })
                  }
                />
                <Input
                  placeholder="Page key"
                  value={builderPageForm.pageKey}
                  onChange={(event) =>
                    setBuilderPageForm({ ...builderPageForm, pageKey: event.target.value })
                  }
                />
                <Input
                  placeholder="Path"
                  value={builderPageForm.pathTemplate}
                  onChange={(event) =>
                    setBuilderPageForm({ ...builderPageForm, pathTemplate: event.target.value })
                  }
                />
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-1">
                  <Input
                    placeholder="ISR seconds"
                    value={builderPageForm.isrRevalidateSeconds}
                    onChange={(event) =>
                      setBuilderPageForm({
                        ...builderPageForm,
                        isrRevalidateSeconds: event.target.value,
                      })
                    }
                  />
                  <Input
                    placeholder="Sort order"
                    value={builderPageForm.sortOrder}
                    onChange={(event) =>
                      setBuilderPageForm({
                        ...builderPageForm,
                        sortOrder: event.target.value,
                      })
                    }
                  />
                </div>
                <label className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={builderPageForm.isActive}
                    onChange={(event) =>
                      setBuilderPageForm({
                        ...builderPageForm,
                        isActive: event.target.checked,
                      })
                    }
                  />
                  Enabled page
                </label>
              </SettingsSection>

              <SettingsSection
                defaultOpen={false}
                icon={<Palette className="h-3.5 w-3.5" />}
                title="Page design"
              >
                <ColorPickerField
                  label="Page background color"
                  value={pageDesign.backgroundColor}
                  onChange={(backgroundColor) => updatePageDesign({ backgroundColor })}
                />
                <ColorPickerField
                  fallback="#111827"
                  label="Page text color"
                  value={pageDesign.textColor}
                  onChange={(textColor) => updatePageDesign({ textColor })}
                />
                <TrustedThemeImageField
                  label="Page background image"
                  url={pageDesign.backgroundImageUrl}
                  disabled={working === "theme-media"}
                  onSelect={(file) =>
                    void uploadThemeImage(file, "Page background", ({ objectKey, url }) =>
                      updatePageDesign({
                        backgroundImageObjectKey: objectKey,
                        backgroundImageUrl: url,
                      }),
                    )
                  }
                  onClear={() =>
                    updatePageDesign({ backgroundImageObjectKey: "", backgroundImageUrl: "" })
                  }
                />
                <Input
                  placeholder="Minimum page height, for example 100vh"
                  value={pageDesign.minHeight}
                  onChange={(event) => updatePageDesign({ minHeight: event.target.value })}
                />
                <div
                  className="h-12 rounded-md border border-border/70"
                  style={pageDesignPreviewStyle(pageDesign)}
                />
              </SettingsSection>

              <SettingsSection
                icon={<Settings2 className="h-3.5 w-3.5" />}
                title="Page actions"
              >
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" onClick={submitPage}>
                    <Save className="h-3.5 w-3.5" />
                    Save page
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void duplicatePage()}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Duplicate
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void deletePage()}
                    disabled={!builderPageForm.id || working === "page-delete"}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {working === "page-delete" ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </SettingsSection>
            </div>
          ) : null}

          {selectedNode.type === "section" && selectedSection ? (
            <div className="space-y-3">
              <Input
                placeholder="Section name"
                value={selectedSection.name}
                onChange={(event) =>
                  updateSection(selectedSection.id, { name: event.target.value })
                }
              />
              <label className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedSection.enabled}
                  onChange={(event) =>
                    updateSection(selectedSection.id, {
                      enabled: event.target.checked,
                    })
                  }
                />
                Enabled section
              </label>
              <div className="rounded-lg border border-border/70 bg-card/40 p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Layout
                  </p>
                  <Badge variant="outline" className="rounded-full">
                    {selectedSection.layout.container} / {selectedSection.layout.direction}
                  </Badge>
                </div>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-1">
                  <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
                    <span>Container</span>
                    <select
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                      value={selectedSection.layout.container}
                      onChange={(event) =>
                        updateSectionLayout(selectedSection.id, {
                          container: event.target.value as BuilderLayout["container"],
                        })
                      }
                    >
                      <option value="contained">Contained</option>
                      <option value="wide">Wide</option>
                      <option value="narrow">Narrow</option>
                      <option value="full">Full width</option>
                    </select>
                  </label>
                  <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
                    <span>Direction</span>
                    <select
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                      value={selectedSection.layout.direction}
                      onChange={(event) =>
                        updateSectionLayout(selectedSection.id, {
                          direction: event.target.value as BuilderLayout["direction"],
                        })
                      }
                    >
                      <option value="vertical">Vertical stack</option>
                      <option value="horizontal">Horizontal row</option>
                      <option value="columns">Responsive columns</option>
                    </select>
                  </label>
                  <Input
                    max={6}
                    min={1}
                    placeholder="Columns"
                    type="number"
                    value={selectedSection.layout.columns}
                    onChange={(event) =>
                      updateSectionLayout(selectedSection.id, {
                        columns: Math.min(
                          6,
                          Math.max(1, Number(event.target.value || 1)),
                        ),
                      })
                    }
                  />
                  <Input
                    placeholder="Gap, for example 24px"
                    value={selectedSection.layout.gap}
                    onChange={(event) =>
                      updateSectionLayout(selectedSection.id, {
                        gap: event.target.value,
                      })
                    }
                  />
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-3 xl:grid-cols-1">
                  <Input
                    placeholder="Padding top"
                    value={selectedSection.layout.paddingTop}
                    onChange={(event) =>
                      updateSectionLayout(selectedSection.id, {
                        paddingTop: event.target.value,
                      })
                    }
                  />
                  <Input
                    placeholder="Padding bottom"
                    value={selectedSection.layout.paddingBottom}
                    onChange={(event) =>
                      updateSectionLayout(selectedSection.id, {
                        paddingBottom: event.target.value,
                      })
                    }
                  />
                  <Input
                    placeholder="Padding left/right"
                    value={selectedSection.layout.paddingInline}
                    onChange={(event) =>
                      updateSectionLayout(selectedSection.id, {
                        paddingInline: event.target.value,
                      })
                    }
                  />
                  <Input
                    placeholder="Margin top"
                    value={selectedSection.layout.marginTop}
                    onChange={(event) =>
                      updateSectionLayout(selectedSection.id, {
                        marginTop: event.target.value,
                      })
                    }
                  />
                  <Input
                    placeholder="Margin bottom"
                    value={selectedSection.layout.marginBottom}
                    onChange={(event) =>
                      updateSectionLayout(selectedSection.id, {
                        marginBottom: event.target.value,
                      })
                    }
                  />
                </div>
                <div className="mt-2 grid gap-2">
                  <ColorPickerField
                    label="Background color"
                    value={selectedSection.layout.backgroundColor}
                    onChange={(backgroundColor) =>
                      updateSectionLayout(selectedSection.id, {
                        backgroundColor,
                      })
                    }
                  />
                  <GradientPickerField
                    label="Background gradient"
                    value={selectedSection.layout.backgroundGradient}
                    onChange={(backgroundGradient) =>
                      updateSectionLayout(selectedSection.id, {
                        backgroundGradient,
                      })
                    }
                  />
                  <TrustedThemeImageField
                    label="Section background image"
                    url={selectedSection.layout.backgroundImageUrl}
                    disabled={working === "theme-media"}
                    onSelect={(file) =>
                      void uploadThemeImage(file, "Section background", ({ objectKey, url }) =>
                        updateSectionLayout(selectedSection.id, {
                          backgroundImageObjectKey: objectKey,
                          backgroundImageUrl: url,
                        }),
                      )
                    }
                    onClear={() =>
                      updateSectionLayout(selectedSection.id, {
                        backgroundImageObjectKey: "",
                        backgroundImageUrl: "",
                      })
                    }
                  />
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-1">
                  <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
                    <span>Align items</span>
                    <select
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                      value={selectedSection.layout.alignItems}
                      onChange={(event) =>
                        updateSectionLayout(selectedSection.id, {
                          alignItems: event.target.value as BuilderLayout["alignItems"],
                        })
                      }
                    >
                      <option value="stretch">Stretch</option>
                      <option value="start">Start</option>
                      <option value="center">Center</option>
                      <option value="end">End</option>
                    </select>
                  </label>
                  <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
                    <span>Distribute</span>
                    <select
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                      value={selectedSection.layout.justifyContent}
                      onChange={(event) =>
                        updateSectionLayout(selectedSection.id, {
                          justifyContent: event.target.value as BuilderLayout["justifyContent"],
                        })
                      }
                    >
                      <option value="start">Start</option>
                      <option value="center">Center</option>
                      <option value="space-between">Space between</option>
                    </select>
                  </label>
                </div>
              </div>
              <CodeEditorTextarea
                label="Section HTML"
                value={selectedSection.htmlCode}
                onChange={(value) => updateSection(selectedSection.id, { htmlCode: value })}
                minHeight={120}
              />
              <CodeEditorTextarea
                label="Section CSS"
                value={selectedSection.cssCode}
                onChange={(value) => updateSection(selectedSection.id, { cssCode: value })}
                minHeight={100}
              />
              <CodeEditorTextarea
                label="Section JS"
                value={selectedSection.jsCode}
                onChange={(value) => updateSection(selectedSection.id, { jsCode: value })}
                minHeight={100}
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => addGroup(selectedSection.id)}>
                  <Plus className="h-3.5 w-3.5" />
                  Add group
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => duplicateSection(selectedSection)}>
                  <Copy className="h-3.5 w-3.5" />
                  Duplicate
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => removeSection(selectedSection.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          ) : null}

          {selectedNode.type === "group" && selectedGroup ? (
            <div className="space-y-3">
              <Input
                placeholder="Group name"
                value={selectedGroup.name}
                onChange={(event) =>
                  updateGroup(selectedGroup.id, { name: event.target.value })
                }
              />
              <Input
                placeholder="Layout key"
                value={selectedGroup.layoutKey}
                onChange={(event) =>
                  updateGroup(selectedGroup.id, { layoutKey: event.target.value })
                }
              />
              <label className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedGroup.enabled}
                  onChange={(event) =>
                    updateGroup(selectedGroup.id, { enabled: event.target.checked })
                  }
                />
                Enabled group
              </label>
              <SettingsSection
                badge={<Badge variant="outline">{selectedGroup.layout.container}</Badge>}
                icon={<Palette className="h-3.5 w-3.5" />}
                title="Group layout"
              >
                <LayoutSettingsFields
                  layout={selectedGroup.layout}
                  onChange={(patch) => updateGroupLayout(selectedGroup.id, patch)}
                  disabled={working === "theme-media"}
                  onImageSelect={(file) =>
                    void uploadThemeImage(file, "Group background", ({ objectKey, url }) =>
                      updateGroupLayout(selectedGroup.id, {
                        backgroundImageObjectKey: objectKey,
                        backgroundImageUrl: url,
                      }),
                    )
                  }
                />
              </SettingsSection>
              <CodeEditorTextarea
                label="Group HTML"
                value={selectedGroup.htmlCode}
                onChange={(value) => updateGroup(selectedGroup.id, { htmlCode: value })}
                minHeight={120}
              />
              <CodeEditorTextarea
                label="Group CSS"
                value={selectedGroup.cssCode}
                onChange={(value) => updateGroup(selectedGroup.id, { cssCode: value })}
                minHeight={100}
              />
              <CodeEditorTextarea
                label="Group JS"
                value={selectedGroup.jsCode}
                onChange={(value) => updateGroup(selectedGroup.id, { jsCode: value })}
                minHeight={100}
              />
              <div className="flex flex-wrap gap-2">
                {builderState.sections.map((section) =>
                  section.groups.some((group) => group.id === selectedGroup.id) ? (
                    <Button
                      key={section.id}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => duplicateGroup(section.id, selectedGroup)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Duplicate
                    </Button>
                  ) : null,
                )}
                <Button type="button" size="sm" variant="outline" onClick={() => removeGroup(selectedGroup.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          ) : null}

          {selectedNode.type === "component" && selectedComponentKey ? (
            <div className="space-y-3">
	              <div className="rounded-lg border border-border/70 bg-card/50 p-3">
	                <p className="font-semibold">
	                  {componentNameForKey(activeComponents, selectedComponentKey)}
                </p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {selectedComponentKey}
                </p>
                {selectedComponent ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatLabel(selectedComponent.componentType)} / {selectedComponent.rendererKey}
	                  </p>
	                ) : null}
                {selectedComponentIsFixed ? (
                  <div className="mt-3 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700">
                    Fixed component. Build and test once in white-label, then reuse in any theme.
                  </div>
                ) : null}
	              </div>
	              {selectedComponentContentDraft ? (
	                <div className="rounded-lg border border-border/70 bg-card/40 p-3">
	                  <div className="mb-3 flex items-center justify-between gap-2">
	                    <p className="text-xs font-semibold uppercase text-muted-foreground">
	                      {selectedComponentIsHeader
                          ? "Header settings"
                          : selectedComponentIsFixedSearch
                            ? "Search settings"
                            : "Content"}
	                    </p>
	                    <Badge variant="outline" className="rounded-full">
	                      {selectedComponentIsHeader
                          ? "Navigation"
                          : selectedComponentIsFixedSearch
                            ? "Fixed behavior"
                            : "Text / image"}
	                    </Badge>
	                  </div>
	                  <div className="space-y-2">
                      {!selectedComponentIsHeader ? (
                        <>
  	                    <Input
  	                      placeholder="Title text"
  	                      value={selectedComponentContentDraft.title}
  	                      onChange={(event) =>
  	                        updateComponentContentDraft(selectedComponentKey, {
  	                          title: event.target.value,
  	                        })
  	                      }
  	                    />
  	                    <Input
  	                      placeholder="Subtitle text"
  	                      value={selectedComponentContentDraft.subtitle}
  	                      onChange={(event) =>
  	                        updateComponentContentDraft(selectedComponentKey, {
  	                          subtitle: event.target.value,
  	                        })
  	                      }
  	                    />
  	                    <Input
  	                      placeholder="Button text"
  	                      value={selectedComponentContentDraft.actionLabel}
  	                      onChange={(event) =>
  	                        updateComponentContentDraft(selectedComponentKey, {
  	                          actionLabel: event.target.value,
  	                        })
  	                      }
  	                    />
                        </>
                      ) : null}
                      {!selectedComponentIsFixed ? (
	                    <TrustedThemeImageField
	                      label="Component image"
	                      url={selectedComponentContentDraft.imageUrl}
	                      disabled={working === "theme-media"}
	                      onSelect={(file) =>
	                        void uploadThemeImage(file, "Component image", ({ objectKey, url }) =>
	                          updateComponentContentDraft(selectedComponentKey, {
	                            imageObjectKey: objectKey,
	                            imageUrl: url,
	                          }),
	                        )
	                      }
	                      onClear={() =>
	                        updateComponentContentDraft(selectedComponentKey, {
	                          imageObjectKey: "",
	                          imageUrl: "",
	                        })
	                      }
	                    />
                      ) : null}
                      {selectedComponentIsHeader ? (
                        <SettingsSection
                          badge={<Badge variant="outline">Logo</Badge>}
                          defaultOpen
                          icon={<Image className="h-3.5 w-3.5" />}
                          title="Brand identity"
                        >
                          <Input
                            placeholder="Brand name"
                            value={selectedComponentContentDraft.title}
                            onChange={(event) =>
                              updateComponentContentDraft(selectedComponentKey, {
                                title: event.target.value,
                              })
                            }
                          />
                          <Input
                            placeholder="Subtitle or tagline"
                            value={selectedComponentContentDraft.subtitle}
                            onChange={(event) =>
                              updateComponentContentDraft(selectedComponentKey, {
                                subtitle: event.target.value,
                              })
                            }
                          />
                          <div className="grid gap-2 rounded-md border border-border/70 bg-background/40 p-2">
                            {selectedComponentContentDraft.logoImageUrl ? (
                              <div className="flex items-center gap-3 rounded-md border border-border/60 bg-card/50 p-2">
                                <img
                                  alt=""
                                  className="h-12 w-12 rounded-md border border-border/60 bg-background object-contain"
                                  src={selectedComponentContentDraft.logoImageUrl}
                                />
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-foreground">Current logo</p>
                                  <p className="truncate text-[11px] text-muted-foreground">
                                    {selectedComponentContentDraft.logoImageUrl}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <p className="rounded-md border border-dashed border-border/70 px-3 py-2 text-xs text-muted-foreground">
                                No logo image selected. Header will use logo text or brand initials.
                              </p>
                            )}
                            <Input
                              accept="image/*"
                              disabled={working === "component-content"}
                              type="file"
                              onChange={(event) => {
                                const file = event.target.files?.[0] ?? null;
                                event.target.value = "";
                                void uploadHeaderLogo(file);
                              }}
                            />
                            <Input
                              placeholder="Logo text fallback, for example VS"
                              value={selectedComponentContentDraft.logoText}
                              onChange={(event) =>
                                updateComponentContentDraft(selectedComponentKey, {
                                  logoText: event.target.value,
                                })
                              }
                            />
                            <div className="flex flex-wrap gap-2">
                              {selectedComponentContentDraft.logoImageUrl ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    updateComponentContentDraft(selectedComponentKey, {
                                      logoImageObjectKey: "",
                                      logoImageUrl: "",
                                    })
                                  }
                                >
                                  <X className="h-3.5 w-3.5" />
                                  Remove logo
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </SettingsSection>
                      ) : null}
                      {selectedComponentIsHeader ? (
                        <SettingsSection
                          badge={<Badge variant="outline">Layout</Badge>}
                          defaultOpen={false}
                          icon={<Settings2 className="h-3.5 w-3.5" />}
                          title="Header layout"
                        >
                          <ColorPickerField
                            label="Header background"
                            value={selectedComponentContentDraft.headerBackgroundColor}
                            onChange={(headerBackgroundColor) =>
                              updateComponentContentDraft(selectedComponentKey, {
                                headerBackgroundColor,
                              })
                            }
                          />
                          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-1">
                            <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
                              <span>Links place</span>
                              <select
                                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                                value={selectedComponentContentDraft.headerLinkPlacement}
                                onChange={(event) =>
                                  updateComponentContentDraft(selectedComponentKey, {
                                    headerLinkPlacement: event.target.value as ComponentContentDraft["headerLinkPlacement"],
                                  })
                                }
                              >
                                <option value="left">Left</option>
                                <option value="center">Center</option>
                                <option value="right">Right</option>
                                <option value="stretch">Stretch</option>
                              </select>
                            </label>
                            <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
                              <span>Flex direction</span>
                              <select
                                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                                value={selectedComponentContentDraft.headerFlexDirection}
                                onChange={(event) =>
                                  updateComponentContentDraft(selectedComponentKey, {
                                    headerFlexDirection: event.target.value as ComponentContentDraft["headerFlexDirection"],
                                  })
                                }
                              >
                                <option value="row">Row</option>
                                <option value="row-reverse">Row reverse</option>
                                <option value="column">Column</option>
                              </select>
                            </label>
                            <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
                              <span>Justify content</span>
                              <select
                                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                                value={selectedComponentContentDraft.headerJustifyContent}
                                onChange={(event) =>
                                  updateComponentContentDraft(selectedComponentKey, {
                                    headerJustifyContent: event.target.value as ComponentContentDraft["headerJustifyContent"],
                                  })
                                }
                              >
                                <option value="start">Start</option>
                                <option value="center">Center</option>
                                <option value="end">End</option>
                                <option value="space-between">Space between</option>
                              </select>
                            </label>
                            <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
                              <span>Align items</span>
                              <select
                                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                                value={selectedComponentContentDraft.headerAlignItems}
                                onChange={(event) =>
                                  updateComponentContentDraft(selectedComponentKey, {
                                    headerAlignItems: event.target.value as ComponentContentDraft["headerAlignItems"],
                                  })
                                }
                              >
                                <option value="stretch">Stretch</option>
                                <option value="start">Start</option>
                                <option value="center">Center</option>
                                <option value="end">End</option>
                              </select>
                            </label>
                            <Input
                              placeholder="Header padding, for example 12px 14px"
                              value={selectedComponentContentDraft.headerPadding}
                              onChange={(event) =>
                                updateComponentContentDraft(selectedComponentKey, {
                                  headerPadding: event.target.value,
                                })
                              }
                            />
                            <Input
                              placeholder="Header margin"
                              value={selectedComponentContentDraft.headerMargin}
                              onChange={(event) =>
                                updateComponentContentDraft(selectedComponentKey, {
                                  headerMargin: event.target.value,
                                })
                              }
                            />
                            <Input
                              placeholder="Header width, for example 100%"
                              value={selectedComponentContentDraft.headerWidth}
                              onChange={(event) =>
                                updateComponentContentDraft(selectedComponentKey, {
                                  headerWidth: event.target.value,
                                })
                              }
                            />
                            <Input
                              placeholder="Header gap"
                              value={selectedComponentContentDraft.headerGap}
                              onChange={(event) =>
                                updateComponentContentDraft(selectedComponentKey, {
                                  headerGap: event.target.value,
                                })
                              }
                            />
                          </div>
                        </SettingsSection>
                      ) : null}
                      {selectedComponentIsHeader ? (
                        <SettingsSection
                          badge={<Badge variant="outline">Links</Badge>}
                          defaultOpen={false}
                          icon={<Palette className="h-3.5 w-3.5" />}
                          title="Header link style"
                        >
                          <ColorPickerField
                            fallback="#4b5563"
                            label="Link text color"
                            value={selectedComponentContentDraft.headerLinkColor}
                            onChange={(headerLinkColor) =>
                              updateComponentContentDraft(selectedComponentKey, {
                                headerLinkColor,
                              })
                            }
                          />
                          <ColorPickerField
                            label="Link background"
                            value={selectedComponentContentDraft.headerLinkBackgroundColor}
                            onChange={(headerLinkBackgroundColor) =>
                              updateComponentContentDraft(selectedComponentKey, {
                                headerLinkBackgroundColor,
                              })
                            }
                          />
                          <ColorPickerField
                            fallback="#0f766e"
                            label="Hover text color"
                            value={selectedComponentContentDraft.headerLinkHoverColor}
                            onChange={(headerLinkHoverColor) =>
                              updateComponentContentDraft(selectedComponentKey, {
                                headerLinkHoverColor,
                              })
                            }
                          />
                          <ColorPickerField
                            label="Hover background"
                            value={selectedComponentContentDraft.headerLinkHoverBackgroundColor}
                            onChange={(headerLinkHoverBackgroundColor) =>
                              updateComponentContentDraft(selectedComponentKey, {
                                headerLinkHoverBackgroundColor,
                              })
                            }
                          />
                          <ColorPickerField
                            fallback="#0f766e"
                            label="Active text color"
                            value={selectedComponentContentDraft.headerLinkActiveColor}
                            onChange={(headerLinkActiveColor) =>
                              updateComponentContentDraft(selectedComponentKey, {
                                headerLinkActiveColor,
                              })
                            }
                          />
                          <ColorPickerField
                            label="Active background"
                            value={selectedComponentContentDraft.headerLinkActiveBackgroundColor}
                            onChange={(headerLinkActiveBackgroundColor) =>
                              updateComponentContentDraft(selectedComponentKey, {
                                headerLinkActiveBackgroundColor,
                              })
                            }
                          />
                          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-1">
                            <Input
                              placeholder="Link corner radius"
                              value={selectedComponentContentDraft.headerLinkBorderRadius}
                              onChange={(event) =>
                                updateComponentContentDraft(selectedComponentKey, {
                                  headerLinkBorderRadius: event.target.value,
                                })
                              }
                            />
                            <Input
                              placeholder="Link min width"
                              value={selectedComponentContentDraft.headerLinkMinWidth}
                              onChange={(event) =>
                                updateComponentContentDraft(selectedComponentKey, {
                                  headerLinkMinWidth: event.target.value,
                                })
                              }
                            />
                            <Input
                              placeholder="Link height"
                              value={selectedComponentContentDraft.headerLinkHeight}
                              onChange={(event) =>
                                updateComponentContentDraft(selectedComponentKey, {
                                  headerLinkHeight: event.target.value,
                                })
                              }
                            />
                            <Input
                              placeholder="Link padding"
                              value={selectedComponentContentDraft.headerLinkPadding}
                              onChange={(event) =>
                                updateComponentContentDraft(selectedComponentKey, {
                                  headerLinkPadding: event.target.value,
                                })
                              }
                            />
                          </div>
                        </SettingsSection>
                      ) : null}
                      {selectedComponentIsHeader ? (
                        <SettingsSection
                          badge={<Badge variant="outline">{selectedNavigationLinks.length}</Badge>}
                          defaultOpen
                          icon={<Globe2 className="h-3.5 w-3.5" />}
                          title="Header links"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-muted-foreground">
                              Add page paths or section anchors like #cab-list.
                            </p>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => void upsertHeaderLink()}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add link
                            </Button>
                          </div>
                          {selectedNavigationLinks.length ? (
                            <div className="grid gap-2">
                              {selectedNavigationLinks.map((link, index) => (
                                <div
                                  key={`${link.href}-${index}`}
                                  className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-card/50 px-2 py-1.5 text-xs"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate font-semibold text-foreground">{link.label}</p>
                                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                                      {link.href}
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 gap-1">
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => void upsertHeaderLink(index)}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => deleteHeaderLink(index)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="rounded-md border border-dashed border-border/70 px-3 py-2 text-xs text-muted-foreground">
                              No links yet. Click Add link to create the header navigation.
                            </p>
                          )}
                        </SettingsSection>
                      ) : null}
                      {selectedComponentIsFixedSearch ? (
                        <div className="space-y-2 rounded-md border border-border/70 bg-background/40 p-3">
                          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-1">
                            <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
                              <span>Search mode</span>
                              <select
                                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                                value={selectedComponentContentDraft.searchMode}
                                onChange={(event) =>
                                  updateComponentContentDraft(selectedComponentKey, {
                                    searchMode: event.target.value as ComponentContentDraft["searchMode"],
                                  })
                                }
                              >
                                <option value="single">Single input</option>
                                <option value="route">Pickup and drop</option>
                              </select>
                            </label>
                            <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
                              <span>Data source</span>
                              <select
                                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                                value={selectedComponentContentDraft.dataSource}
                                onChange={(event) =>
                                  updateComponentContentDraft(selectedComponentKey, {
                                    dataSource: event.target.value as ComponentContentDraft["dataSource"],
                                  })
                                }
                              >
                                <option value="places">Places</option>
                                <option value="products">Products</option>
                                <option value="vendors">Vendors</option>
                                <option value="custom">Custom API</option>
                              </select>
                            </label>
                            <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
                              <span>Place type</span>
                              <select
                                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                                value={selectedComponentContentDraft.placeType}
                                onChange={(event) =>
                                  updateComponentContentDraft(selectedComponentKey, {
                                    placeType: event.target.value as ComponentContentDraft["placeType"],
                                  })
                                }
                              >
                                <option value="city">City</option>
                                <option value="airport">Airport</option>
                              </select>
                            </label>
                            <Input
                              placeholder="Minimum characters"
                              type="number"
                              value={selectedComponentContentDraft.minCharacters}
                              onChange={(event) =>
                                updateComponentContentDraft(selectedComponentKey, {
                                  minCharacters: event.target.value,
                                })
                              }
                            />
                          </div>
                          {selectedComponentContentDraft.searchMode === "route" ? (
                            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-1">
                              <Input
                                placeholder="Pickup label"
                                value={selectedComponentContentDraft.pickupLabel}
                                onChange={(event) =>
                                  updateComponentContentDraft(selectedComponentKey, {
                                    pickupLabel: event.target.value,
                                  })
                                }
                              />
                              <Input
                                placeholder="Pickup placeholder"
                                value={selectedComponentContentDraft.pickupPlaceholder}
                                onChange={(event) =>
                                  updateComponentContentDraft(selectedComponentKey, {
                                    pickupPlaceholder: event.target.value,
                                  })
                                }
                              />
                              <Input
                                placeholder="Drop label"
                                value={selectedComponentContentDraft.dropLabel}
                                onChange={(event) =>
                                  updateComponentContentDraft(selectedComponentKey, {
                                    dropLabel: event.target.value,
                                  })
                                }
                              />
                              <Input
                                placeholder="Drop placeholder"
                                value={selectedComponentContentDraft.dropPlaceholder}
                                onChange={(event) =>
                                  updateComponentContentDraft(selectedComponentKey, {
                                    dropPlaceholder: event.target.value,
                                  })
                                }
                              />
                            </div>
                          ) : (
                            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-1">
                              <Input
                                placeholder="Input label"
                                value={selectedComponentContentDraft.label}
                                onChange={(event) =>
                                  updateComponentContentDraft(selectedComponentKey, {
                                    label: event.target.value,
                                  })
                                }
                              />
                              <Input
                                placeholder="Input placeholder"
                                value={selectedComponentContentDraft.placeholder}
                                onChange={(event) =>
                                  updateComponentContentDraft(selectedComponentKey, {
                                    placeholder: event.target.value,
                                  })
                                }
                              />
                            </div>
                          )}
                          <Input
                            placeholder="Loading message"
                            value={selectedComponentContentDraft.loadingMessage}
                            onChange={(event) =>
                              updateComponentContentDraft(selectedComponentKey, {
                                loadingMessage: event.target.value,
                              })
                            }
                          />
                          <Input
                            placeholder="Empty message"
                            value={selectedComponentContentDraft.emptyMessage}
                            onChange={(event) =>
                              updateComponentContentDraft(selectedComponentKey, {
                                emptyMessage: event.target.value,
                              })
                            }
                          />
                          <Input
                            placeholder="Route path template"
                            value={selectedComponentContentDraft.resultPathTemplate}
                            onChange={(event) =>
                              updateComponentContentDraft(selectedComponentKey, {
                                resultPathTemplate: event.target.value,
                              })
                            }
                          />
                        </div>
                      ) : null}
                      {selectedComponentIsFixedSearch && selectedComponentContentDraft.searchMode === "route" ? (
                        <SettingsSection
                          badge={<Badge variant="outline">{selectedComponentContentDraft.fareCalculationMode}</Badge>}
                          defaultOpen={false}
                          icon={<CreditCard className="h-3.5 w-3.5" />}
                          title="Fare calculator engine"
                        >
                          <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
                            <span>Calculation mode</span>
                            <select
                              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                              value={selectedComponentContentDraft.fareCalculationMode}
                              onChange={(event) =>
                                updateComponentContentDraft(selectedComponentKey, {
                                  fareCalculationMode: event.target.value as ComponentContentDraft["fareCalculationMode"],
                                })
                              }
                            >
                              <option value="none">No calculation - show per km rate only</option>
                              <option value="simple">Simple KM and day count</option>
                              <option value="advanced">Range-wise advanced fare calculator</option>
                            </select>
                          </label>
                          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-1">
                            <Input
                              placeholder="Base fare"
                              value={selectedComponentContentDraft.baseFare}
                              onChange={(event) =>
                                updateComponentContentDraft(selectedComponentKey, { baseFare: event.target.value })
                              }
                            />
                            <Input
                              placeholder="Per KM rate"
                              value={selectedComponentContentDraft.perKm}
                              onChange={(event) =>
                                updateComponentContentDraft(selectedComponentKey, { perKm: event.target.value })
                              }
                            />
                            <Input
                              placeholder="Minimum KM per day"
                              value={selectedComponentContentDraft.minKmPerDay}
                              onChange={(event) =>
                                updateComponentContentDraft(selectedComponentKey, { minKmPerDay: event.target.value })
                              }
                            />
                            <Input
                              placeholder="Minimum one-way KM"
                              value={selectedComponentContentDraft.minOneWayKm}
                              onChange={(event) =>
                                updateComponentContentDraft(selectedComponentKey, { minOneWayKm: event.target.value })
                              }
                            />
                            <Input
                              placeholder="Driver allowance per day"
                              value={selectedComponentContentDraft.driverAllowancePerDay}
                              onChange={(event) =>
                                updateComponentContentDraft(selectedComponentKey, { driverAllowancePerDay: event.target.value })
                              }
                            />
                            <Input
                              placeholder="GST percent"
                              value={selectedComponentContentDraft.gstPercent}
                              onChange={(event) =>
                                updateComponentContentDraft(selectedComponentKey, { gstPercent: event.target.value })
                              }
                            />
                          </div>
                          {selectedComponentContentDraft.fareCalculationMode === "advanced" ? (
                            <div className="space-y-2">
                              <label className="flex items-center gap-2 rounded-md border border-border/70 bg-background/50 px-3 py-2 text-sm">
                                <input
                                  checked={selectedComponentContentDraft.hotelIncluded}
                                  type="checkbox"
                                  onChange={(event) =>
                                    updateComponentContentDraft(selectedComponentKey, {
                                      hotelIncluded: event.target.checked,
                                    })
                                  }
                                />
                                Hotel charge enabled
                              </label>
                              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-1">
                                <Input
                                  placeholder="Hotel per night"
                                  value={selectedComponentContentDraft.hotelPerNight}
                                  onChange={(event) =>
                                    updateComponentContentDraft(selectedComponentKey, { hotelPerNight: event.target.value })
                                  }
                                />
                                <Input
                                  placeholder="Night charge"
                                  value={selectedComponentContentDraft.nightCharge}
                                  onChange={(event) =>
                                    updateComponentContentDraft(selectedComponentKey, { nightCharge: event.target.value })
                                  }
                                />
                                <Input
                                  placeholder="Airport pickup charge"
                                  value={selectedComponentContentDraft.airportPickupCharge}
                                  onChange={(event) =>
                                    updateComponentContentDraft(selectedComponentKey, { airportPickupCharge: event.target.value })
                                  }
                                />
                                <Input
                                  placeholder="Airport drop charge"
                                  value={selectedComponentContentDraft.airportDropCharge}
                                  onChange={(event) =>
                                    updateComponentContentDraft(selectedComponentKey, { airportDropCharge: event.target.value })
                                  }
                                />
                                <Input
                                  placeholder="Cleaning charge"
                                  value={selectedComponentContentDraft.cleaningCharge}
                                  onChange={(event) =>
                                    updateComponentContentDraft(selectedComponentKey, { cleaningCharge: event.target.value })
                                  }
                                />
                                <Input
                                  placeholder="Seasonal multiplier, e.g. 1.2"
                                  value={selectedComponentContentDraft.seasonalMultiplier}
                                  onChange={(event) =>
                                    updateComponentContentDraft(selectedComponentKey, { seasonalMultiplier: event.target.value })
                                  }
                                />
                                <Input
                                  placeholder="Demand multiplier, e.g. 1.1"
                                  value={selectedComponentContentDraft.demandMultiplier}
                                  onChange={(event) =>
                                    updateComponentContentDraft(selectedComponentKey, { demandMultiplier: event.target.value })
                                  }
                                />
                                <Input
                                  placeholder="Event multiplier, e.g. 1.15"
                                  value={selectedComponentContentDraft.eventMultiplier}
                                  onChange={(event) =>
                                    updateComponentContentDraft(selectedComponentKey, { eventMultiplier: event.target.value })
                                  }
                                />
                              </div>
                              {[
                                ["tollMode", "tollAmount", "Toll"],
                                ["parkingMode", "parkingAmount", "Parking"],
                                ["stateTaxMode", "stateTaxAmount", "State tax"],
                              ].map(([modeKey, amountKey, label]) => (
                                <div key={modeKey} className="grid gap-2 md:grid-cols-[1fr_1fr] xl:grid-cols-1">
                                  <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
                                    <span>{label}</span>
                                    <select
                                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                                      value={String(selectedComponentContentDraft[modeKey as keyof ComponentContentDraft])}
                                      onChange={(event) =>
                                        updateComponentContentDraft(selectedComponentKey, {
                                          [modeKey]: event.target.value,
                                        } as Partial<ComponentContentDraft>)
                                      }
                                    >
                                      <option value="included">Included</option>
                                      <option value="estimate">Estimate automatically</option>
                                      <option value="actual">Actual / excluded</option>
                                    </select>
                                  </label>
                                  <Input
                                    placeholder={`${label} estimate amount`}
                                    value={String(selectedComponentContentDraft[amountKey as keyof ComponentContentDraft])}
                                    onChange={(event) =>
                                      updateComponentContentDraft(selectedComponentKey, {
                                        [amountKey]: event.target.value,
                                      } as Partial<ComponentContentDraft>)
                                    }
                                  />
                                </div>
                              ))}
                              <div className="space-y-2 rounded-md border border-border/70 bg-background/40 p-2">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs font-semibold uppercase text-muted-foreground">Distance range rates</p>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => void upsertDistanceRange()}
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add range
                                  </Button>
                                </div>
                                {Array.isArray(selectedDistanceRanges) && selectedDistanceRanges.length ? (
                                  <div className="grid gap-2">
                                    {selectedDistanceRanges.map((value, index) => {
                                      const range = recordFromUnknown(value);
                                      return (
                                        <div
                                          key={`distance-range-${index}`}
                                          className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-card/50 px-2 py-1.5 text-xs"
                                        >
                                          <div>
                                            <p className="font-semibold text-foreground">
                                              {stringFromUnknown(range.fromKm ?? range.from, "0")} - {stringFromUnknown(range.toKm ?? range.to, "9999")} km
                                            </p>
                                            <p className="text-muted-foreground">
                                              Rs. {stringFromUnknown(range.perKmRate ?? range.rate, selectedComponentContentDraft.perKm)}/km
                                            </p>
                                          </div>
                                          <div className="flex shrink-0 gap-1">
                                            <Button
                                              type="button"
                                              size="icon"
                                              variant="ghost"
                                              onClick={() => void upsertDistanceRange(index)}
                                            >
                                              <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                              type="button"
                                              size="icon"
                                              variant="ghost"
                                              onClick={() => deleteDistanceRange(index)}
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground">
                                    No ranges yet. The engine uses the default per-km rate until you add a range.
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : null}
                        </SettingsSection>
                      ) : null}
                      <SettingsSection
                        badge={<Badge variant="outline">Fill</Badge>}
                        defaultOpen={false}
                        icon={<Palette className="h-3.5 w-3.5" />}
                        title="Component appearance"
                      >
                        <ColorPickerField
                          label="Background color"
                          value={selectedComponentContentDraft.componentBackgroundColor}
                          onChange={(componentBackgroundColor) =>
                            updateComponentContentDraft(selectedComponentKey, {
                              componentBackgroundColor,
                            })
                          }
                        />
                        <GradientPickerField
                          label="Background gradient"
                          value={selectedComponentContentDraft.componentBackgroundGradient}
                          onChange={(componentBackgroundGradient) =>
                            updateComponentContentDraft(selectedComponentKey, {
                              componentBackgroundGradient,
                            })
                          }
                        />
                        <TrustedThemeImageField
                          label="Component background image"
                          url={selectedComponentContentDraft.componentBackgroundImageUrl}
                          disabled={working === "theme-media"}
                          onSelect={(file) =>
                            void uploadThemeImage(
                              file,
                              "Component background",
                              ({ objectKey, url }) =>
                                updateComponentContentDraft(selectedComponentKey, {
                                  componentBackgroundImageObjectKey: objectKey,
                                  componentBackgroundImageUrl: url,
                                }),
                            )
                          }
                          onClear={() =>
                            updateComponentContentDraft(selectedComponentKey, {
                              componentBackgroundImageObjectKey: "",
                              componentBackgroundImageUrl: "",
                            })
                          }
                        />
                        <ColorPickerField
                          fallback="#111827"
                          label="Text color"
                          value={selectedComponentContentDraft.componentTextColor}
                          onChange={(componentTextColor) =>
                            updateComponentContentDraft(selectedComponentKey, {
                              componentTextColor,
                            })
                          }
                        />
                        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-1">
                          <Input
                            placeholder="Padding, for example 24px"
                            value={selectedComponentContentDraft.componentPadding}
                            onChange={(event) =>
                              updateComponentContentDraft(selectedComponentKey, {
                                componentPadding: event.target.value,
                              })
                            }
                          />
                          <Input
                            placeholder="Corner radius, for example 8px"
                            value={selectedComponentContentDraft.cornerRadius}
                            onChange={(event) =>
                              updateComponentContentDraft(selectedComponentKey, {
                                cornerRadius: event.target.value,
                              })
                            }
                          />
                        </div>
                      </SettingsSection>
                      <SettingsSection
                        badge={<Badge variant="outline">{selectedComponentContentDraft.headingLevel}</Badge>}
                        defaultOpen={false}
                        icon={<FileText className="h-3.5 w-3.5" />}
                        title="Typography"
                      >
                        <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
                          <span>Font family</span>
                          <select
                            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                            value={selectedComponentContentDraft.fontFamily}
                            onChange={(event) =>
                              updateComponentContentDraft(selectedComponentKey, {
                                fontFamily: event.target.value,
                              })
                            }
                          >
                            <option value="">Theme default</option>
                            {fontFamilyOptions.map((font) => (
                              <option key={font.label} value={font.value}>
                                {font.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-1">
                          <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
                            <span>Heading level</span>
                            <select
                              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                              value={selectedComponentContentDraft.headingLevel}
                              onChange={(event) =>
                                updateComponentContentDraft(selectedComponentKey, {
                                  headingLevel: event.target.value as ComponentContentDraft["headingLevel"],
                                })
                              }
                            >
                              <option value="h1">H1</option>
                              <option value="h2">H2</option>
                              <option value="h3">H3</option>
                              <option value="h4">H4</option>
                              <option value="h5">H5</option>
                              <option value="h6">H6</option>
                            </select>
                          </label>
                          <Input
                            placeholder="Font size, for example 42px"
                            value={selectedComponentContentDraft.fontSize}
                            onChange={(event) =>
                              updateComponentContentDraft(selectedComponentKey, {
                                fontSize: event.target.value,
                              })
                            }
                          />
                          <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
                            <span>Weight</span>
                            <select
                              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                              value={selectedComponentContentDraft.fontWeight}
                              onChange={(event) =>
                                updateComponentContentDraft(selectedComponentKey, {
                                  fontWeight: event.target.value,
                                })
                              }
                            >
                              <option value="400">Regular</option>
                              <option value="500">Medium</option>
                              <option value="600">Semi bold</option>
                              <option value="700">Bold</option>
                              <option value="800">Extra bold</option>
                              <option value="900">Black</option>
                            </select>
                          </label>
                          <Input
                            placeholder="Line height, for example 1.1"
                            value={selectedComponentContentDraft.lineHeight}
                            onChange={(event) =>
                              updateComponentContentDraft(selectedComponentKey, {
                                lineHeight: event.target.value,
                              })
                            }
                          />
                          <Input
                            placeholder="Letter spacing"
                            value={selectedComponentContentDraft.letterSpacing}
                            onChange={(event) =>
                              updateComponentContentDraft(selectedComponentKey, {
                                letterSpacing: event.target.value,
                              })
                            }
                          />
                        </div>
                      </SettingsSection>
                      <SettingsSection
                        badge={
                          <Badge variant="outline" className="rounded-full">
                            {selectedComponentContentDraft.datasetKey || "items"}
                          </Badge>
                        }
                        defaultOpen={false}
                        icon={<Database className="h-3.5 w-3.5" />}
                        title="Data and dummy dataset"
                      >
                        <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
                          <span>Dataset preset</span>
                          <select
                            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                            value={
                              themeDataDefinitionForKey(selectedComponentContentDraft.datasetKey)
                                ? normalizeThemeDataKey(selectedComponentContentDraft.datasetKey)
                                : "__custom"
                            }
                            onChange={(event) => {
                              const datasetKey = event.target.value;
                              if (datasetKey === "__custom") return;
                              updateComponentContentDraft(selectedComponentKey, {
                                datasetKey,
                              });
                            }}
                          >
                            {themeDataDefinitions.map((definition) => (
                              <option key={definition.key} value={definition.key}>
                                {definition.label}
                              </option>
                            ))}
                            <option value="__custom">Custom dataset</option>
                          </select>
                        </label>
                        <Input
                          placeholder="Custom dataset key"
                          value={selectedComponentContentDraft.datasetKey}
                          onChange={(event) =>
                            updateComponentContentDraft(selectedComponentKey, {
                              datasetKey: normalizeThemeDataKey(event.target.value),
                            })
                          }
                        />
                        {themeDataDefinitionForKey(selectedComponentContentDraft.datasetKey) ? (
                          <p className="rounded-md border border-border/70 bg-card/40 px-3 py-2 text-xs text-muted-foreground">
                            {themeDataDefinitionForKey(selectedComponentContentDraft.datasetKey)?.description}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void addComponentDataField()}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add field
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={seedSelectedComponentData}
                          >
                            <Database className="h-3.5 w-3.5" />
                            Seed preset data
                          </Button>
                        </div>
                        <div className="space-y-2 rounded-md border border-border/70 bg-background/40 p-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold uppercase text-muted-foreground">Required fields</p>
                            <Badge variant="outline">{selectedDataFields.length}</Badge>
                          </div>
                          {selectedDataFields.length ? (
                            <div className="grid gap-2">
                              {selectedDataFields.map((field) => (
                                <div
                                  key={field.key}
                                  className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-card/50 px-2 py-1.5 text-xs"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate font-semibold text-foreground">{field.label}</p>
                                    <p className="font-mono text-[11px] text-muted-foreground">
                                      {field.key} / {field.type}
                                      {field.required ? " / required" : ""}
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 gap-1">
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => void editComponentDataField(field.key)}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => deleteComponentDataField(field.key)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">Add fields before creating dummy items.</p>
                          )}
                        </div>
                        <div className="space-y-2 rounded-md border border-border/70 bg-background/40 p-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold uppercase text-muted-foreground">Dummy data items</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{selectedDataItems.length}</Badge>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => void addComponentDataItem()}
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Add item
                              </Button>
                            </div>
                          </div>
                          {selectedDataItems.length ? (
                            <div className="grid gap-2">
                              {selectedDataItems.map((value, index) => {
                                const item = recordFromUnknown(value);
                                const label =
                                  stringFromUnknown(item.title ?? item.name ?? item.routeTitle ?? item.cabTitle) ||
                                  `Item ${index + 1}`;
                                const sublabel = selectedDataFields
                                  .slice(0, 3)
                                  .map((field) => stringFromUnknown(item[field.key]))
                                  .filter(Boolean)
                                  .join(" / ");
                                return (
                                  <div
                                    key={`data-item-${index}`}
                                    className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-card/50 px-2 py-1.5 text-xs"
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate font-semibold text-foreground">{label}</p>
                                      <p className="truncate text-muted-foreground">{sublabel || "Preview row"}</p>
                                    </div>
                                    <div className="flex shrink-0 gap-1">
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => void editComponentDataItem(index)}
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => deleteComponentDataItem(index)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              No dummy items yet. Use Add item or Seed preset data.
                            </p>
                          )}
                        </div>
                      </SettingsSection>
                      {selectedFixedComponent ? (
                        <p className="text-xs text-muted-foreground">
                          Default renderer: {selectedFixedComponent.rendererKey}
                        </p>
                      ) : null}
	                    <Button
	                      type="button"
	                      size="sm"
	                      onClick={() => void saveSelectedComponentContent()}
	                      disabled={working === "component-content" || !selectedComponent}
	                    >
	                      <Save className="h-3.5 w-3.5" />
	                      {working === "component-content" ? "Saving..." : "Apply content"}
	                    </Button>
	                  </div>
	                </div>
	              ) : null}
	              <div className="grid gap-2">
                {selectedComponent && selectedComponent.id > 0 ? (
                  <Button asChild type="button" size="sm" variant="outline">
                    <Link href={`/site-themes/components/${selectedComponentKey}/editor`}>
                      Open component editor
                    </Link>
                  </Button>
                ) : (
                  <Button type="button" size="sm" variant="outline" disabled>
                    Save settings first
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    typeof selectedNode.componentIndex === "number"
                      ? duplicateBuilderComponent(selectedNode.componentIndex)
                      : undefined
                  }
                >
                  <Copy className="h-3.5 w-3.5" />
                  Duplicate component
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => toggleComponentEnabled(selectedComponentKey)}
                >
                  <Eye className="h-3.5 w-3.5" />
                  {builderState.disabledComponentKeys.includes(selectedComponentKey)
                    ? "Enable"
                    : "Disable"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    typeof selectedNode.componentIndex === "number"
                      ? removeBuilderComponent(selectedNode.componentIndex)
                      : undefined
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete component
                </Button>
              </div>
            </div>
          ) : null}

          <SettingsSection
            defaultOpen={false}
            icon={<FileSearch className="h-3.5 w-3.5" />}
            title="Developer code"
          >
            {containsUnsafeCode(`${pageCodeSnapshot.htmlCode}\n${pageCodeSnapshot.cssCode}\n${pageCodeSnapshot.jsCode}`) ? (
              <div className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                Code uses scripts, cookies, eval, or non-HTTPS URLs. Review CSP before publishing.
              </div>
            ) : null}
            <div className="space-y-3">
              <CodeEditorTextarea
                label="Page HTML"
                value={pageCodeValue("html", builderPageForm.htmlCode, pageCodeSnapshot.htmlCode)}
                onChange={(value) => setPageCodeField("htmlCode", value)}
                minHeight={130}
              />
              <CodeEditorTextarea
                label="Page CSS"
                value={pageCodeValue("css", builderPageForm.cssCode, pageCodeSnapshot.cssCode)}
                onChange={(value) => setPageCodeField("cssCode", value)}
                minHeight={110}
              />
              <CodeEditorTextarea
                label="Page JS"
                value={pageCodeValue("js", builderPageForm.jsCode, pageCodeSnapshot.jsCode)}
                onChange={(value) => setPageCodeField("jsCode", value)}
                minHeight={110}
              />
            </div>
          </SettingsSection>

          <SettingsSection
            defaultOpen={false}
            icon={<ShieldCheck className="h-3.5 w-3.5" />}
            title="Validation before publish"
          >
            <div className="space-y-2">
              {Object.entries(validationGroups).map(([group, issues]) => (
                <div key={group} className="rounded-lg border border-border/70 bg-card/40 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      {group}
                    </p>
                    <Badge variant={issues.length ? "warning" : "success"}>
                      {issues.length ? issues.length : "ok"}
                    </Badge>
                  </div>
                  {issues.length ? (
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {issues.map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          </SettingsSection>
        </aside>
      </div>
    </section>
  );
}

type SiteDashboardTab =
  | "analytics"
  | "active-sites"
  | "addon-requests"
  | "payments"
  | "themes"
  | "components"
  | "vendor-site-editor"
  | "business-runtime"
  | "booking-recovery"
  | "runtime-rules"
  | "ai-seo"
  | "seo-auditor"
  | "seo-export"
  | "search-console"
  | "production-ops"
  | "third-party-libraries"
  | "media-assets"
  | "error-logs";

function formatCount(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(value);
}

function themeHasSeo(theme?: SiteTheme | null) {
  if (!theme) return false;
  const searchable = JSON.stringify([
    theme.addonServices,
    theme.componentSchema,
    theme.pageSchema,
    theme.pages?.flatMap((page) => page.componentKeys),
  ]).toLowerCase();
  return (
    searchable.includes("seo") ||
    searchable.includes("google") ||
    searchable.includes("crawler")
  );
}

function buildSiteAnalytics(data: NonNullable<SiteThemesData>): SiteAnalytics {
  const themesById = new Map(data.themes.map((theme) => [theme.id, theme]));
  const activeAssignments = data.assignments.filter(
    (assignment) => assignment.status === "active",
  );
  const activationRequests = data.assignments.filter(
    (assignment) => assignment.status !== "active",
  );
  const addonRequests = data.assignments.flatMap((assignment) =>
    (assignment.selectedAddonServices ?? []).map((addon, addonIndex) => {
      const theme = themesById.get(assignment.themeId);
      return {
        id: `${assignment.id}-${addon}-${addonIndex}`,
        vendor: `Vendor #${assignment.vendorProfileId}`,
        theme: assignment.themeName ?? theme?.name ?? "Theme",
        service: formatLabel(addon),
        status: assignment.status === "active" ? "setup_pending" : "requested",
        paymentStatus: assignment.paymentStatus,
        priority:
          assignment.paymentStatus === "theme_price_pending"
            ? "High"
            : "Normal",
      };
    }),
  );

  const siteRows = data.assignments.map((assignment) => {
    const theme = themesById.get(assignment.themeId);
    const hasSeo = themeHasSeo(theme);
    return {
      id: assignment.id,
      vendor: `Vendor #${assignment.vendorProfileId}`,
      domain: `${assignment.themeSlug ?? theme?.slug ?? "site"}-${assignment.vendorProfileId}.vendero.in`,
      theme: assignment.themeName ?? theme?.name ?? "Theme",
      status: assignment.status,
      paymentStatus: assignment.paymentStatus,
      traffic: 0,
      crawlerHits: 0,
      aiHits: 0,
      errors: 0,
      seoStatus: hasSeo ? "completed" : "pending",
      device: "unknown",
      topRoute: "none",
    };
  });

  const activeSiteRows = siteRows.filter((site) => site.status === "active");
  const paidAssignments = data.assignments.filter(
    (assignment) => assignment.paymentStatus !== "theme_price_pending",
  );
  const pendingPayments = data.assignments.filter(
    (assignment) => assignment.paymentStatus === "theme_price_pending",
  );
  const paymentsTotal = paidAssignments.reduce((total, assignment) => {
    const theme = themesById.get(assignment.themeId);
    return total + (theme?.oneTimePrice ?? 0);
  }, 0);
  const pendingPaymentTotal = pendingPayments.reduce((total, assignment) => {
    const theme = themesById.get(assignment.themeId);
    return total + (theme?.oneTimePrice ?? 0);
  }, 0);
  const seoDone = siteRows.filter((site) => site.seoStatus === "completed");
  const paymentRows = data.assignments.map((assignment) => {
    const theme = themesById.get(assignment.themeId);
    const addonCount = assignment.selectedAddonServices?.length ?? 0;
    return {
      id: assignment.id,
      vendor: `Vendor #${assignment.vendorProfileId}`,
      theme: assignment.themeName ?? theme?.name ?? "Theme",
      amount: theme?.oneTimePrice ?? 0,
      addonCount,
      status: assignment.paymentStatus,
    };
  });
  const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return {
      label: date.toLocaleDateString("en-IN", { weekday: "short" }),
      value: 0,
    };
  });

  return {
    activeAssignments,
    activationRequests,
    addonRequests,
    siteRows,
    activeSiteRows,
    paymentRows,
    trafficSeries: lastSevenDays,
    deviceRows: [],
    botRows: [],
    routeRows: [],
    errorRows: [],
    metrics: {
      activationRequests: activationRequests.length,
      addonRequests: addonRequests.length,
      activeSites: activeAssignments.length,
      errors: 0,
      paymentsTotal,
      pendingPaymentTotal,
      paidPayments: paidAssignments.length,
      pendingPayments: pendingPayments.length,
      themesCount: data.themes.length,
      siteTraffic: 0,
      crawlerReq: 0,
      googleCrawlerReq: 0,
      seoDone: seoDone.length,
      aiReq: 0,
    },
  };
}

type SeoSiteRow = {
  id: number;
  label: string;
  vendor: string;
  theme: string;
  domain: string;
  status: string;
  paymentStatus: string;
};

function originForSeoSite(site: SeoSiteRow) {
  const value = site.domain.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value.replace(/\/+$/, "");
  return `https://${value.replace(/\/+$/, "")}`;
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

function seoSiteRows(data: NonNullable<SiteThemesData>, analytics: SiteAnalytics): SeoSiteRow[] {
  const vendorSites = data.vendorSites ?? [];
  if (vendorSites.length) {
    return vendorSites
      .filter((site) => site.status === "active")
      .map((site) => ({
        id: site.id,
        label: site.siteName || site.vendorName || `Vendor site #${site.id}`,
        vendor: site.vendorName || `Vendor #${site.vendorProfileId}`,
        theme: site.themeName || "Theme",
        domain: site.canonicalUrl || site.primaryHostname || site.subdomain || site.domain,
        status: site.status,
        paymentStatus: site.paymentStatus,
      }));
  }

  return analytics.activeSiteRows.map((site) => ({
    id: site.id,
    label: site.vendor,
    vendor: site.vendor,
    theme: site.theme,
    domain: site.domain,
    status: site.status,
    paymentStatus: site.paymentStatus,
  }));
}

function aiSeoSiteRows(
  data: NonNullable<SiteThemesData>,
  analytics: SiteAnalytics,
): SeoSiteRow[] {
  const vendorSites = data.vendorSites ?? [];
  if (vendorSites.length) {
    return vendorSites.map((site) => ({
      id: site.id,
      label: site.siteName || site.vendorName || `Vendor site #${site.id}`,
      vendor: site.vendorName || `Vendor #${site.vendorProfileId}`,
      theme: site.themeName || site.themeSlug || "Theme",
      domain:
        site.canonicalUrl ||
        site.primaryHostname ||
        site.subdomain ||
        site.domain ||
        "",
      status: site.status,
      paymentStatus: site.paymentStatus,
    }));
  }

  return analytics.siteRows.map((site) => ({
    id: site.id,
    label: site.vendor,
    vendor: site.vendor,
    theme: site.theme,
    domain: site.domain,
    status: site.status,
    paymentStatus: site.paymentStatus,
  }));
}

function aiSeoPagePath(row: AiSeoPageData) {
  const seo = recordFromUnknown(row.seoJson);
  const explicitPath = stringFromUnknown(
    row.routePattern ?? seo.path ?? seo.canonicalPath,
  ).trim();
  if (explicitPath) return explicitPath;
  if (row.pageKey === "home") return "/";
  return `/${row.pageKey.replace(/^\/+/, "")}`;
}

function aiSeoGenerationForRow(
  overview: AiSeoOverview,
  row: AiSeoPageData,
): AiSeoGenerationResult | undefined {
  return [...overview.jobs]
    .sort((left, right) => right.id - left.id)
    .flatMap((job) => job.resultJson?.results ?? [])
    .find(
      (result) =>
        result.pageDataId === row.id ||
        (result.pageDataPublicId && result.pageDataPublicId === row.publicId),
    );
}

function latestAiSeoDraftJob(overview: AiSeoOverview) {
  const draftIds = new Set(overview.drafts.map((row) => row.id));
  return [...overview.jobs]
    .sort((left, right) => right.id - left.id)
    .find((job) =>
      (job.resultJson?.pageDataIds ?? []).some((id) => draftIds.has(Number(id))),
    );
}

function latestAiSeoFailures(overview: AiSeoOverview) {
  return [...overview.jobs]
    .sort((left, right) => right.id - left.id)
    .find((job) => (job.resultJson?.failures?.length ?? 0) > 0)?.resultJson
    ?.failures ?? [];
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon: typeof Activity;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  const toneClass =
    tone === "danger"
      ? "bg-rose-500/10 text-rose-300"
      : tone === "warning"
        ? "bg-amber-500/10 text-amber-300"
        : tone === "success"
          ? "bg-emerald-500/10 text-emerald-300"
          : "bg-primary/10 text-primary";
  return (
    <Card className="border-border/70 bg-card/80">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              {label}
            </p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
            {detail ? (
              <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
            ) : null}
          </div>
          <div
            className={`grid h-10 w-10 place-items-center rounded-lg ${toneClass}`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BarChart({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: number; kind?: string }>;
}) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <Card className="border-border/70 bg-card/80">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => (
          <div key={`${row.label}-${row.kind ?? ""}`} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">{row.label}</span>
              <span className="text-muted-foreground">
                {formatCount(row.value)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TableEmpty({ label }: { label: string }) {
  return (
    <p className="rounded-xl border border-dashed border-border/80 p-8 text-center text-sm text-muted-foreground">
      {label}
    </p>
  );
}

function DashboardTabs({
  activeTab,
  setActiveTab,
  counts,
}: {
  activeTab: SiteDashboardTab;
  setActiveTab: (tab: SiteDashboardTab) => void;
  counts: Record<SiteDashboardTab, number>;
}) {
  const tabs: Array<{
    id: SiteDashboardTab;
    label: string;
    icon: typeof Activity;
  }> = [
    { id: "analytics", label: "Analytics Dashboard", icon: BarChart3 },
    { id: "active-sites", label: "Active Vendor Sites", icon: Globe2 },
    { id: "addon-requests", label: "Add-on Requests", icon: Wrench },
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "themes", label: "Theme", icon: Palette },
    { id: "components", label: "Components Library", icon: Layers3 },
    { id: "vendor-site-editor", label: "Vendor Site Editor", icon: Settings2 },
    { id: "business-runtime", label: "Bookings Runtime", icon: ClipboardList },
    { id: "booking-recovery", label: "Recovery Settings", icon: RotateCcw },
    { id: "runtime-rules", label: "Runtime Rules", icon: ListTree },
    { id: "ai-seo", label: "AI SEO Generator", icon: Sparkles },
    { id: "seo-auditor", label: "SEO Auditor", icon: FileSearch },
    { id: "seo-export", label: "SEO Export Center", icon: FileText },
    { id: "search-console", label: "Google Search Console", icon: Search },
    { id: "production-ops", label: "Production Ops", icon: ShieldCheck },
    { id: "third-party-libraries", label: "Third-Party Libraries", icon: Library },
    { id: "media-assets", label: "Media Assets", icon: Image },
    { id: "error-logs", label: "Error Logs", icon: ShieldAlert },
  ];
  return (
    <div className="overflow-x-auto rounded-xl border border-border/70 bg-card/70 p-1">
      <div className="flex min-w-max gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={[
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              <span
                className={[
                  "rounded-full px-2 py-0.5 text-xs",
                  activeTab === tab.id
                    ? "bg-primary-foreground/20"
                    : "bg-background/70",
                ].join(" ")}
              >
                {counts[tab.id]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function displayCell(value: unknown) {
  if (value === null || value === undefined || value === "") return "none";
  if (typeof value === "number") return Number.isInteger(value) ? formatCount(value) : value.toFixed(2);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 16).replace("T", " ");
  return String(value);
}

function CompactRowsTable({
  title,
  description,
  rows,
  columns,
  empty,
}: {
  title: string;
  description: string;
  rows: Array<Record<string, unknown>>;
  columns: Array<{ key: string; label: string }>;
  empty: string;
}) {
  return (
    <Card className="border-border/70 bg-card/80">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {rows.length ? (
          <table className="w-full min-w-[680px] text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                {columns.map((column) => (
                  <th className="py-2 pr-3" key={column.key}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 8).map((row, rowIndex) => (
                <tr key={String(row.id ?? rowIndex)} className="border-t border-border/70">
                  {columns.map((column) => (
                    <td className="max-w-[220px] truncate py-3 pr-3" key={column.key}>
                      {displayCell(row[column.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <TableEmpty label={empty} />
        )}
      </CardContent>
    </Card>
  );
}

function AnalyticsDashboard({
  data,
  analytics,
}: {
  data: NonNullable<SiteThemesData>;
  analytics: SiteAnalytics;
}) {
  const metrics = analytics.metrics;
  const [filters, setFilters] = useState({
    date: "30d",
    vendor: "",
    site: "",
    theme: "",
    device: "all",
    browser: "",
    page: "",
    crawlerType: "all",
    eventType: "all",
  });
  const phase8Metrics = [
    { label: "Opens", value: metrics.opens ?? metrics.siteTraffic, detail: "First-party site opens", icon: Eye },
    { label: "Page views", value: metrics.pageViews ?? metrics.siteTraffic, detail: "Public page views", icon: Activity },
    { label: "Unique devices", value: metrics.uniqueDevices ?? 0, detail: "First-party device tokens", icon: Smartphone },
    { label: "Sessions", value: metrics.sessions ?? 0, detail: "30-minute public sessions", icon: Monitor },
    { label: "Identified visitors", value: metrics.identifiedVisitors ?? 0, detail: "Masked contact stitching", icon: ShieldCheck },
    { label: "Leads", value: metrics.leads ?? 0, detail: "Inquiry and lead events", icon: ClipboardList },
    { label: "Bookings", value: metrics.bookings ?? 0, detail: "Runtime booking records", icon: Rocket },
    { label: "Payments", value: metrics.payments ?? 0, detail: `${metrics.paidRuntimePayments ?? 0} paid`, icon: CreditCard },
    { label: "Crawler hits", value: metrics.crawlerHits ?? metrics.crawlerReq, detail: "Search and AI crawler hits", icon: Bot },
    { label: "Errors", value: metrics.errors, detail: "Site, page, component errors", icon: AlertTriangle, tone: metrics.errors ? "danger" : "success" },
    { label: "Route intents", value: metrics.routeIntents ?? 0, detail: `${metrics.abortedRoutes ?? 0} abandoned`, icon: ListTree },
    { label: "Quote PDFs", value: metrics.quotePdfDownloads ?? 0, detail: "Generated or downloaded quotes", icon: FileText },
  ] as const;
  return (
    <div className="space-y-5">
      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle>Analytics Filters</CardTitle>
          <CardDescription>
            Filter context for admin review across vendor, site, theme, device, crawler, page, and event type.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
            {[
              ["vendor", "Vendor"],
              ["site", "Site"],
              ["theme", "Theme"],
              ["browser", "Browser"],
              ["page", "Page"],
            ].map(([key, label]) => (
              <label className="space-y-1 text-xs font-semibold uppercase text-muted-foreground" key={key}>
                {label}
                <Input
                  value={String(filters[key as keyof typeof filters])}
                  onChange={(event) => setFilters((current) => ({ ...current, [key]: event.target.value }))}
                  placeholder={label}
                />
              </label>
            ))}
            {[
              ["date", "Date", ["30d", "7d", "today"]],
              ["device", "Device", ["all", "desktop", "mobile", "tablet", "crawler"]],
              ["crawlerType", "Crawler", ["all", "search_engine", "answer_engine", "ai_training", "social_preview"]],
              ["eventType", "Event", ["all", "page_view", "search", "error", "seo_crawl"]],
            ].map(([key, label, options]) => (
              <label className="space-y-1 text-xs font-semibold uppercase text-muted-foreground" key={String(key)}>
                {String(label)}
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  value={String(filters[key as keyof typeof filters])}
                  onChange={(event) => setFilters((current) => ({ ...current, [String(key)]: event.target.value }))}
                >
                  {(options as string[]).map((option) => (
                    <option key={option} value={option}>
                      {option.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {phase8Metrics.map((metric) => (
          <MetricCard
            detail={metric.detail}
            icon={metric.icon}
            key={metric.label}
            label={metric.label}
            tone={"tone" in metric ? metric.tone : "default"}
            value={typeof metric.value === "number" ? formatCount(metric.value) : metric.value}
          />
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Vendor site activation req"
          value={metrics.activationRequests}
          detail="Requests waiting for activation"
          icon={Globe2}
          tone={metrics.activationRequests ? "warning" : "success"}
        />
        <MetricCard
          label="Add-on setup req"
          value={metrics.addonRequests}
          detail="Admin implementation queue"
          icon={Wrench}
          tone={metrics.addonRequests ? "warning" : "success"}
        />
        <MetricCard
          label="Total active sites"
          value={metrics.activeSites}
          detail={`${data.assignments.length} total vendor site records`}
          icon={ShieldCheck}
          tone="success"
        />
        <MetricCard
          label="Errors"
          value={metrics.errors}
          detail="ISR, route, and activation issues"
          icon={AlertTriangle}
          tone={metrics.errors ? "danger" : "success"}
        />
        <MetricCard
          label="Payments total"
          value={formatMoney(metrics.paymentsTotal)}
          detail={`${metrics.paidPayments} paid records`}
          icon={CreditCard}
        />
        <MetricCard
          label="Themes count"
          value={metrics.themesCount}
          detail={`${data.summary.liveThemeCount} live themes`}
          icon={Palette}
        />
        <MetricCard
          label="Sites user traffic"
          value={formatCount(metrics.siteTraffic)}
          detail="User hits across active sites"
          icon={Activity}
        />
        <MetricCard
          label="Crawler req"
          value={formatCount(metrics.crawlerReq)}
          detail={`${formatCount(metrics.googleCrawlerReq)} Google crawler hits`}
          icon={Search}
        />
        <MetricCard
          label="SEO done"
          value={metrics.seoDone}
          detail="Sites with SEO components or services"
          icon={ShieldCheck}
          tone="success"
        />
        <MetricCard
          label="AI search req"
          value={formatCount(metrics.aiReq)}
          detail="AI bot and answer-engine hits"
          icon={Bot}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <BarChart title="Traffic by day" rows={analytics.trafficSeries} />
        <BarChart title="Traffic by device" rows={analytics.deviceRows} />
        <BarChart title="Crawler and AI hits" rows={analytics.botRows} />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <BarChart title="Route intent states" rows={analytics.routeIntentCounts ?? []} />
        <BarChart title="Booking recovery funnel" rows={analytics.recoveryStatusCounts ?? []} />
        <BarChart title="Payment funnel" rows={analytics.paymentFunnelRows ?? []} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Route Search Demand</CardTitle>
            <CardDescription>
              Routes searched by users, crawler, AI source, and device.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Route</th>
                  <th className="py-2 pr-3">Searches</th>
                  <th className="py-2 pr-3">Device</th>
                  <th className="py-2 pr-3">Source</th>
                </tr>
              </thead>
              <tbody>
                {analytics.routeRows.map((row) => (
                  <tr key={row.route} className="border-t border-border/70">
                    <td className="py-3 pr-3 font-mono text-xs">{row.route}</td>
                    <td className="py-3 pr-3 font-semibold">
                      {formatCount(row.searches)}
                    </td>
                    <td className="py-3 pr-3">{row.device}</td>
                    <td className="py-3 pr-3">{row.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>SEO Completion</CardTitle>
            <CardDescription>
              Successful SEO setup by active vendor site.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {analytics.siteRows.slice(0, 8).map((site) => (
              <div
                key={site.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/30 p-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{site.vendor}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {site.theme}
                  </p>
                </div>
                <Badge
                  variant={
                    site.seoStatus === "completed" ? "success" : "warning"
                  }
                >
                  {site.seoStatus}
                </Badge>
              </div>
            ))}
            {!analytics.siteRows.length ? (
              <TableEmpty label="No vendor sites yet." />
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <CompactRowsTable
          title="Devices And Identified Visitors"
          description="Privacy-safe device/session stitching with masked contact data."
          rows={analytics.visitorRows ?? []}
          columns={[
            { key: "deviceToken", label: "Device" },
            { key: "identityStatus", label: "Identity" },
            { key: "phone", label: "Phone" },
            { key: "opens", label: "Opens" },
            { key: "pageViews", label: "Views" },
            { key: "lastSeenAt", label: "Last seen" },
          ]}
          empty="No public visitors yet."
        />
        <CompactRowsTable
          title="Sessions"
          description="Public sessions with entry path, referrer, and device class."
          rows={analytics.sessionRows ?? []}
          columns={[
            { key: "sessionId", label: "Session" },
            { key: "identityStatus", label: "Identity" },
            { key: "entryPath", label: "Entry" },
            { key: "device", label: "Device" },
            { key: "pageViews", label: "Views" },
            { key: "lastSeenAt", label: "Last seen" },
          ]}
          empty="No sessions recorded yet."
        />
        <CompactRowsTable
          title="Crawler Dashboard"
          description="Crawler name, type, page, hit count, status, and first/last crawl."
          rows={analytics.crawlerRows ?? []}
          columns={[
            { key: "crawler", label: "Crawler" },
            { key: "type", label: "Type" },
            { key: "page", label: "Page" },
            { key: "hits", label: "Hits" },
            { key: "status", label: "Status" },
            { key: "lastCrawlAt", label: "Last crawl" },
          ]}
          empty="No crawler hits yet."
        />
        <CompactRowsTable
          title="Route Intent"
          description="Started, selected, quoted, abandoned, recovered, booked, and paid route events."
          rows={analytics.routeIntentRows ?? []}
          columns={[
            { key: "route", label: "Route" },
            { key: "status", label: "Status" },
            { key: "cab", label: "Cab" },
            { key: "trip", label: "Trip" },
            { key: "fare", label: "Fare" },
            { key: "occurredAt", label: "Time" },
          ]}
          empty="No route intent yet."
        />
        <CompactRowsTable
          title="Aborted Routes"
          description="Masked partial text and abandonment reason for visitors who left before quote or booking."
          rows={analytics.abortedRouteRows ?? []}
          columns={[
            { key: "partialText", label: "Partial" },
            { key: "lastStep", label: "Last step" },
            { key: "deviceToken", label: "Device" },
            { key: "routeSuggestion", label: "Suggestion" },
            { key: "reason", label: "Reason" },
          ]}
          empty="No abandoned route discovery yet."
        />
        <CompactRowsTable
          title="Peak Demand Heatmap"
          description="Demand by hour, weekday, route, city, cab type, and trip type."
          rows={analytics.peakDemandRows ?? []}
          columns={[
            { key: "day", label: "Day" },
            { key: "hour", label: "Hour" },
            { key: "route", label: "Route" },
            { key: "cab", label: "Cab" },
            { key: "trip", label: "Trip" },
            { key: "score", label: "Score" },
          ]}
          empty="No peak demand data yet."
        />
        <CompactRowsTable
          title="Geo Referral"
          description="QR, hotel, airport, restaurant, and campaign source attribution."
          rows={analytics.geoReferralRows ?? []}
          columns={[
            { key: "source", label: "Source" },
            { key: "code", label: "Code" },
            { key: "visits", label: "Visits" },
            { key: "leads", label: "Leads" },
            { key: "bookings", label: "Bookings" },
            { key: "revenue", label: "Revenue" },
          ]}
          empty="No geo referral traffic yet."
        />
        <CompactRowsTable
          title="High-Intent Visitors"
          description="Repeated same-route searches with privacy-safe follow-up eligibility."
          rows={analytics.highIntentRows ?? []}
          columns={[
            { key: "route", label: "Route" },
            { key: "repeatCount", label: "Repeats" },
            { key: "identityStatus", label: "Identity" },
            { key: "allowedAction", label: "Action" },
            { key: "latestActivityAt", label: "Latest" },
          ]}
          empty="No high-intent visitors yet."
        />
        <CompactRowsTable
          title="Fare Resistance"
          description="Quote views versus drop-offs by fare band, route, cab, and trip type."
          rows={analytics.fareResistanceRows ?? []}
          columns={[
            { key: "quoteId", label: "Quote" },
            { key: "route", label: "Route" },
            { key: "amount", label: "Fare" },
            { key: "band", label: "Band" },
            { key: "status", label: "Status" },
            { key: "viewedAt", label: "Viewed" },
          ]}
          empty="No fare resistance signals yet."
        />
        <CompactRowsTable
          title="Recovery Funnel"
          description="Abandoned, prompted, sent, clicked, resumed, recovered, suppressed, and expired states."
          rows={analytics.recoveryRows ?? []}
          columns={[
            { key: "funnelId", label: "Funnel" },
            { key: "status", label: "Status" },
            { key: "checkoutStep", label: "Step" },
            { key: "promptStatus", label: "Prompt" },
            { key: "campaignId", label: "Campaign" },
            { key: "recoveredAt", label: "Recovered" },
          ]}
          empty="No recovery funnel data yet."
        />
        <CompactRowsTable
          title="Quote PDFs"
          description="Generated, downloaded, shared quote PDFs and conversion state."
          rows={analytics.quotePdfRows ?? []}
          columns={[
            { key: "route", label: "Route" },
            { key: "customer", label: "Customer" },
            { key: "amount", label: "Amount" },
            { key: "downloadCount", label: "Downloads" },
            { key: "conversionState", label: "Conversion" },
            { key: "lastDownloadedAt", label: "Last download" },
          ]}
          empty="No quote PDF activity yet."
        />
        <CompactRowsTable
          title="Realtime Progress"
          description="Publish, activation, Search Console, booking, payment, and analytics progress."
          rows={analytics.realtimeProgressRows ?? []}
          columns={[
            { key: "type", label: "Type" },
            { key: "status", label: "Status" },
            { key: "label", label: "Label" },
            { key: "percent", label: "Percent" },
            { key: "message", label: "Message" },
            { key: "occurredAt", label: "Time" },
          ]}
          empty="No realtime progress events yet."
        />
      </div>
    </div>
  );
}

function AddonRequestsDashboard({ analytics }: { analytics: SiteAnalytics }) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
        Add-on services are admin-implemented paid work. Use this queue to
        separate vendor requests from live site health.
      </div>

      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle>Add-on Service Requests</CardTitle>
          <CardDescription>
            Admin-controlled SEO, Google optimization, image generation, and
            setup work.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {analytics.addonRequests.length ? (
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Vendor</th>
                  <th className="py-2 pr-3">Theme</th>
                  <th className="py-2 pr-3">Service</th>
                  <th className="py-2 pr-3">Priority</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Payment</th>
                </tr>
              </thead>
              <tbody>
                {analytics.addonRequests.map((request) => (
                  <tr key={request.id} className="border-t border-border/70">
                    <td className="py-3 pr-3 font-semibold">
                      {request.vendor}
                    </td>
                    <td className="py-3 pr-3">{request.theme}</td>
                    <td className="py-3 pr-3">{request.service}</td>
                    <td className="py-3 pr-3">
                      <Badge
                        variant={
                          request.priority === "High" ? "warning" : "outline"
                        }
                      >
                        {request.priority}
                      </Badge>
                    </td>
                    <td className="py-3 pr-3">
                      {formatLabel(request.status)}
                    </td>
                    <td className="py-3 pr-3">{request.paymentStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <TableEmpty label="No add-on setup requests yet." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ActiveVendorSites({ analytics }: { analytics: SiteAnalytics }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard
          label="Active vendor sites"
          value={analytics.activeSiteRows.length}
          icon={Globe2}
          tone="success"
        />
        <MetricCard
          label="User traffic"
          value={formatCount(analytics.metrics.siteTraffic)}
          icon={Activity}
        />
        <MetricCard
          label="Crawler hits"
          value={formatCount(analytics.metrics.crawlerReq)}
          icon={Search}
        />
        <MetricCard
          label="Error log"
          value={analytics.metrics.errors}
          icon={AlertTriangle}
          tone={analytics.metrics.errors ? "danger" : "success"}
        />
      </div>
      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle>Active Vendor Site Analytics</CardTitle>
          <CardDescription>
            Site traffic, route demand, crawler/AI hits, device type, and error
            count.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {analytics.activeSiteRows.length ? (
            <table className="w-full min-w-[920px] text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Site</th>
                  <th className="py-2 pr-3">Theme</th>
                  <th className="py-2 pr-3">Traffic</th>
                  <th className="py-2 pr-3">Crawler</th>
                  <th className="py-2 pr-3">AI</th>
                  <th className="py-2 pr-3">Top route</th>
                  <th className="py-2 pr-3">Device</th>
                  <th className="py-2 pr-3">Errors</th>
                </tr>
              </thead>
              <tbody>
                {analytics.activeSiteRows.map((site) => (
                  <tr key={site.id} className="border-t border-border/70">
                    <td className="py-3 pr-3">
                      <p className="font-semibold">{site.vendor}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {site.domain}
                      </p>
                    </td>
                    <td className="py-3 pr-3">{site.theme}</td>
                    <td className="py-3 pr-3">{formatCount(site.traffic)}</td>
                    <td className="py-3 pr-3">
                      {formatCount(site.crawlerHits)}
                    </td>
                    <td className="py-3 pr-3">{formatCount(site.aiHits)}</td>
                    <td className="py-3 pr-3 font-mono text-xs">
                      {site.topRoute}
                    </td>
                    <td className="py-3 pr-3">{site.device}</td>
                    <td className="py-3 pr-3">
                      <Badge variant={site.errors ? "danger" : "success"}>
                        {site.errors}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <TableEmpty label="No active vendor sites yet." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PaymentsDashboard({
  analytics,
}: {
  analytics: SiteAnalytics;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard
          label="Payments total"
          value={formatMoney(analytics.metrics.paymentsTotal)}
          icon={CreditCard}
        />
        <MetricCard
          label="Pending value"
          value={formatMoney(analytics.metrics.pendingPaymentTotal)}
          icon={AlertTriangle}
          tone={analytics.metrics.pendingPaymentTotal ? "warning" : "success"}
        />
        <MetricCard
          label="Paid"
          value={analytics.metrics.paidPayments}
          icon={ShieldCheck}
          tone="success"
        />
        <MetricCard
          label="Pending"
          value={analytics.metrics.pendingPayments}
          icon={CreditCard}
          tone={analytics.metrics.pendingPayments ? "warning" : "success"}
        />
      </div>
      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle>Theme Payments</CardTitle>
          <CardDescription>
            Theme one-time payments, pending records, and add-on counts.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {analytics.paymentRows.length ? (
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Vendor</th>
                  <th className="py-2 pr-3">Theme</th>
                  <th className="py-2 pr-3">Amount</th>
                  <th className="py-2 pr-3">Add-ons</th>
                  <th className="py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {analytics.paymentRows.map((payment) => (
                  <tr key={payment.id} className="border-t border-border/70">
                    <td className="py-3 pr-3 font-semibold">
                      {payment.vendor}
                    </td>
                    <td className="py-3 pr-3">{payment.theme}</td>
                    <td className="py-3 pr-3">{formatMoney(payment.amount)}</td>
                    <td className="py-3 pr-3">{payment.addonCount}</td>
                    <td className="py-3 pr-3">
                      <Badge
                        variant={
                          payment.status === "theme_price_pending"
                            ? "warning"
                            : "success"
                        }
                      >
                        {payment.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <TableEmpty label="No payments yet." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ThemeCatalog({
  themes,
  onPublish,
  onLifecycle,
}: {
  themes: SiteTheme[];
  onPublish: (theme: SiteTheme) => void;
  onLifecycle: (theme: SiteTheme, lifecycleState: "draft" | "live" | "paused") => void;
}) {
  return (
    <Card className="border-border/70 bg-card/80">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Theme</CardTitle>
          <CardDescription>
            Website themes available for vendor site activation.
          </CardDescription>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/site-themes/dummy-data">
              <Database className="h-4 w-4" />
              Dummy data
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/site-themes/new">
              <Plus className="h-4 w-4" />
              Create theme
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {themes.map((theme) => (
          <article
            key={theme.id}
            className="overflow-hidden rounded-xl border border-border/70 bg-background/30"
          >
            {theme.previewImageUrl ? (
              <img
                src={theme.previewImageUrl}
                alt=""
                className="h-32 w-full object-cover"
              />
            ) : null}
            <div className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        theme.status === "live" ? "success" : "secondary"
                      }
                      className="rounded-full"
                    >
                      {theme.status}
                    </Badge>
                    <Badge variant="outline" className="rounded-full">
                      {theme.rendererKey}
                    </Badge>
                  </div>
                  <h3 className="mt-2 font-semibold">{theme.name}</h3>
                  <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                    {theme.slug}
                  </p>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Palette className="h-5 w-5" />
                </div>
              </div>
              <p className="min-h-10 text-sm leading-5 text-muted-foreground">
                {theme.shortDescription}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong>
                  {formatMoney(theme.oneTimePrice, theme.currency)}
                </strong>
                <span className="text-xs text-muted-foreground">
                  Hosting in subscription
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild type="button" size="sm">
                  <Link href={`/site-themes/${theme.slug}/editor`}>
                    <Palette className="h-3.5 w-3.5" />
                    Open editor
                  </Link>
                </Button>
                {theme.previewUrl ? (
                  <a
                    href={normalizeWhiteLabelPreviewUrl(theme.previewUrl) ?? theme.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Preview
                  </a>
                ) : null}
                <Button asChild size="sm" variant="outline">
                  <Link href={`/site-themes/${theme.slug}/details`}>
                    Edit details
                  </Link>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onPublish(theme)}
                >
                  <Send className="h-3.5 w-3.5" />
                  Publish
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onLifecycle(theme, "live")}
                >
                  <Rocket className="h-3.5 w-3.5" />
                  Promote
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onLifecycle(theme, "draft")}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Rollback
                </Button>
              </div>
              {theme.pages?.length ? (
                <div className="rounded-lg border border-border/70 bg-card/40 p-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Pages
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {theme.pages.map((page) => (
                      <Link
                        key={page.id}
                        href={`/site-themes/${theme.slug}/editor?page=${page.id}`}
                        className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground"
                      >
                        {page.pageKey}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </article>
        ))}
        {!themes.length ? <TableEmpty label="No themes created yet." /> : null}
      </CardContent>
    </Card>
  );
}

function ComponentsLibrary({
  components,
}: {
  components: SiteThemeComponent[];
}) {
  return (
    <Card className="border-border/70 bg-card/80">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Components Library</CardTitle>
          <CardDescription>
            Reusable site components imported from Figma or created by admin.
          </CardDescription>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/site-themes/components/new">
            <Plus className="h-4 w-4" />
            Create component
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {components.map((component) => (
          <article
            key={component.id}
            className="rounded-xl border border-border/70 bg-background/30 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{component.name}</h3>
                <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                  {component.componentKey}
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-1.5">
                <Badge
                  variant={component.status === "live" ? "success" : "secondary"}
                  className="rounded-full"
                >
                  {component.status}
                </Badge>
                {isFixedComponent(component) ? (
                  <Badge variant="outline" className="rounded-full">
                    fixed
                  </Badge>
                ) : null}
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {formatLabel(component.componentType)} / {component.rendererKey}
            </p>
            {component.figmaNodeId ? (
              <p className="mt-2 rounded-lg border border-border/70 bg-card/40 p-2 font-mono text-xs text-muted-foreground">
                Figma node {component.figmaNodeId}
              </p>
            ) : null}
            <div className="mt-4">
              {component.id > 0 ? (
                <Button asChild size="sm" variant="outline">
                  <Link
                    href={`/site-themes/components/${component.componentKey}/editor`}
                  >
                    Edit component
                  </Link>
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Add to a theme and save settings to create the component row.
                </span>
              )}
            </div>
          </article>
        ))}
        {!components.length ? (
          <TableEmpty label="No components created yet." />
        ) : null}
      </CardContent>
    </Card>
  );
}

function WorkspacePanel({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: typeof Activity;
  children: ReactNode;
}) {
  return (
    <Card className="border-border/70 bg-card/80">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function VendorSiteEditorPanel({
  assignments,
}: {
  assignments: SiteThemeAssignment[];
}) {
  return (
    <WorkspacePanel
      title="Vendor Site Editor"
      description="Edit vendor-specific theme assignment, overrides, status, and setup progress."
      icon={Settings2}
    >
      {assignments.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 pr-3">Vendor</th>
                <th className="py-2 pr-3">Theme</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Payment</th>
                <th className="py-2 pr-3">Add-ons</th>
                <th className="py-2 pr-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => (
                <tr key={assignment.id} className="border-t border-border/70">
                  <td className="py-3 pr-3 font-semibold">
                    Vendor #{assignment.vendorProfileId}
                  </td>
                  <td className="py-3 pr-3">
                    {assignment.themeName ?? assignment.themeSlug ?? assignment.themeId}
                  </td>
                  <td className="py-3 pr-3">
                    <Badge
                      variant={
                        assignment.status === "active" ? "success" : "warning"
                      }
                    >
                      {formatLabel(assignment.status)}
                    </Badge>
                  </td>
                  <td className="py-3 pr-3">{assignment.paymentStatus}</td>
                  <td className="py-3 pr-3">
                    {assignment.selectedAddonServices?.length ?? 0}
                  </td>
                  <td className="py-3 pr-3">
                    <Button size="sm" variant="outline" type="button" disabled>
                      Open editor
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <TableEmpty label="No vendor site assignments yet." />
      )}
    </WorkspacePanel>
  );
}

function AiSeoGeneratorPanel({
  rows,
  overviews,
  working,
  onLoad,
  onGenerate,
  onApprove,
}: {
  rows: SeoSiteRow[];
  overviews: Record<number, AiSeoOverview | undefined>;
  working: Record<number, AiSeoWorkingAction | undefined>;
  onLoad: (site: SeoSiteRow) => void;
  onGenerate: (site: SeoSiteRow, scope: AiSeoGenerationScope) => void;
  onApprove: (site: SeoSiteRow) => void;
}) {
  return (
    <WorkspacePanel
      title="AI SEO Generator"
      description="Generate, review, and explicitly approve vendor-specific page and route SEO content."
      icon={Sparkles}
    >
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
        Generation only creates review drafts. Public metadata stays unchanged
        until an admin uses the separate Approve &amp; publish action.
      </div>
      {rows.length ? (
        <div className="mt-4 grid gap-4">
          {rows.map((site) => {
            const overview = overviews[site.id];
            const workingAction = working[site.id];
            const draftJob = overview ? latestAiSeoDraftJob(overview) : undefined;
            const failures = overview ? latestAiSeoFailures(overview) : [];
            const statusLabel = workingAction
              ? workingAction === "load"
                ? "Loading"
                : workingAction === "generate"
                  ? "Generating drafts"
                  : "Publishing"
              : overview?.drafts.length
                ? "Review required"
                : overview?.approved.length
                  ? "Published"
                  : overview
                    ? "Ready to generate"
                    : "Status not loaded";

            return (
              <div
                key={site.id}
                className="rounded-xl border border-border/70 bg-background/30 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{site.label}</p>
                      <Badge
                        variant={site.status === "active" ? "success" : "warning"}
                      >
                        Site {formatLabel(site.status)}
                      </Badge>
                      <Badge
                        variant={
                          overview?.drafts.length
                            ? "warning"
                            : overview?.approved.length
                              ? "success"
                              : "secondary"
                        }
                      >
                        {statusLabel}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {site.vendor} · {site.theme}
                    </p>
                    {site.domain ? (
                      <p className="mt-1 font-mono text-xs text-muted-foreground">
                        {originForSeoSite(site)}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      disabled={Boolean(workingAction)}
                      onClick={() => onLoad(site)}
                    >
                      <RotateCcw
                        className={`mr-2 h-4 w-4 ${
                          workingAction === "load" ? "animate-spin" : ""
                        }`}
                      />
                      {overview ? "Refresh status" : "Load status"}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      type="button"
                      disabled={Boolean(workingAction)}
                      onClick={() => onGenerate(site, "all")}
                    >
                      <Sparkles
                        className={`mr-2 h-4 w-4 ${
                          workingAction === "generate" ? "animate-pulse" : ""
                        }`}
                      />
                      Generate all SEO
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      disabled={Boolean(workingAction)}
                      onClick={() => onGenerate(site, "pages")}
                    >
                      Page drafts
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      disabled={Boolean(workingAction)}
                      onClick={() => onGenerate(site, "routes")}
                    >
                      Route drafts
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      disabled={
                        Boolean(workingAction) ||
                        !overview?.drafts.length ||
                        !draftJob
                      }
                      onClick={() => onApprove(site)}
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Approve &amp; publish
                    </Button>
                  </div>
                </div>

                {overview ? (
                  <>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-border/70 bg-card/60 p-3">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">
                          Drafts to review
                        </p>
                        <p className="mt-1 text-xl font-semibold">
                          {formatCount(overview.drafts.length)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-card/60 p-3">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">
                          Approved pages
                        </p>
                        <p className="mt-1 text-xl font-semibold">
                          {formatCount(overview.approved.length)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-card/60 p-3">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">
                          Latest generation
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {draftJob
                            ? formatLabel(
                                draftJob.resultJson?.generationMode ||
                                  draftJob.status,
                              )
                            : "Not generated"}
                        </p>
                      </div>
                    </div>

                    {overview.drafts.length ? (
                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full min-w-[920px] text-sm">
                          <thead className="text-left text-xs uppercase text-muted-foreground">
                            <tr>
                              <th className="py-2 pr-3">Page / path</th>
                              <th className="py-2 pr-3">Meta title &amp; description</th>
                              <th className="py-2 pr-3">Generation</th>
                              <th className="py-2 pr-3">State</th>
                            </tr>
                          </thead>
                          <tbody>
                            {overview.drafts.map((row) => {
                              const generation = aiSeoGenerationForRow(
                                overview,
                                row,
                              );
                              const seo = recordFromUnknown(row.seoJson);
                              const title =
                                row.title ||
                                stringFromUnknown(seo.metaTitle ?? seo.title) ||
                                "Title pending";
                              const description =
                                row.metaDescription ||
                                stringFromUnknown(
                                  seo.metaDescription ?? seo.description,
                                ) ||
                                "Description pending";
                              const metadata = recordFromUnknown(row.metadata);
                              const metadataWarnings = Array.isArray(
                                metadata.warnings,
                              )
                                ? metadata.warnings.filter(
                                    (warning): warning is string =>
                                      typeof warning === "string" &&
                                      Boolean(warning.trim()),
                                  )
                                : [];
                              const warnings =
                                generation?.warnings?.length
                                  ? generation.warnings
                                  : metadataWarnings;
                              const mode =
                                generation?.mode ||
                                stringFromUnknown(
                                  metadata.mode ?? metadata.generationMode,
                                ) ||
                                "generated";
                              const provider =
                                generation?.provider ||
                                stringFromUnknown(metadata.provider);

                              return (
                                <tr
                                  key={row.id}
                                  className="border-t border-border/70 align-top"
                                >
                                  <td className="py-3 pr-3">
                                    <p className="font-semibold">
                                      {formatLabel(row.pageKey)}
                                    </p>
                                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                                      {aiSeoPagePath(row)}
                                    </p>
                                  </td>
                                  <td className="max-w-xl py-3 pr-3">
                                    <p className="font-semibold">{title}</p>
                                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                      {description}
                                    </p>
                                  </td>
                                  <td className="py-3 pr-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Badge
                                        variant={
                                          mode === "ai"
                                            ? "success"
                                            : mode === "fallback"
                                              ? "warning"
                                              : "secondary"
                                        }
                                      >
                                        {formatLabel(mode)}
                                      </Badge>
                                      {provider ? (
                                        <span className="text-xs text-muted-foreground">
                                          {provider}
                                        </span>
                                      ) : null}
                                    </div>
                                    {warnings.length ? (
                                      <div className="mt-2 space-y-1 text-xs text-amber-300">
                                        {warnings.map((warning, index) => (
                                          <p key={`${row.id}-warning-${index}`}>
                                            {warning}
                                          </p>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="mt-2 text-xs text-muted-foreground">
                                        No generation warnings
                                      </p>
                                    )}
                                  </td>
                                  <td className="py-3 pr-3">
                                    <Badge variant="warning">
                                      {formatLabel(row.status || "draft")}
                                    </Badge>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-lg border border-border/70 bg-card/40 px-4 py-3 text-sm text-muted-foreground">
                        {overview.approved.length
                          ? "No drafts are waiting for review. Approved SEO remains published."
                          : "No SEO drafts yet. Generate all pages, only static pages, or route pages above."}
                      </div>
                    )}

                    {failures.length ? (
                      <div className="mt-4 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-200">
                        <p className="font-semibold">Latest generation issues</p>
                        <div className="mt-2 space-y-1 text-xs">
                          {failures.map((failure, index) => (
                            <p key={`${failure.pageKey}-${failure.path}-${index}`}>
                              <span className="font-mono">
                                {failure.path || failure.pageKey}
                              </span>
                              {`: ${failure.message}`}
                            </p>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="mt-4 rounded-lg border border-border/70 bg-card/40 px-4 py-3 text-sm text-muted-foreground">
                    {workingAction === "load"
                      ? "Loading the latest draft and approval status…"
                      : "Load status to review existing drafts and approved SEO for this vendor site."}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4">
          <TableEmpty label="Provision a vendor site before generating SEO content." />
        </div>
      )}
    </WorkspacePanel>
  );
}

function SeoAuditorPanel({ analytics }: { analytics: SiteAnalytics }) {
  return (
    <WorkspacePanel
      title="SEO Auditor"
      description="Review theme/site readiness before public launch and Search Console submission."
      icon={FileSearch}
    >
      {analytics.siteRows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 pr-3">Site</th>
                <th className="py-2 pr-3">Theme</th>
                <th className="py-2 pr-3">SEO</th>
                <th className="py-2 pr-3">Crawler</th>
                <th className="py-2 pr-3">Errors</th>
              </tr>
            </thead>
            <tbody>
              {analytics.siteRows.map((site) => (
                <tr key={site.id} className="border-t border-border/70">
                  <td className="py-3 pr-3 font-semibold">{site.vendor}</td>
                  <td className="py-3 pr-3">{site.theme}</td>
                  <td className="py-3 pr-3">
                    <Badge
                      variant={
                        site.seoStatus === "completed" ? "success" : "warning"
                      }
                    >
                      {site.seoStatus}
                    </Badge>
                  </td>
                  <td className="py-3 pr-3">
                    {formatCount(site.crawlerHits)}
                  </td>
                  <td className="py-3 pr-3">
                    <Badge variant={site.errors ? "danger" : "success"}>
                      {site.errors}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <TableEmpty label="No vendor sites available for SEO audit." />
      )}
    </WorkspacePanel>
  );
}

function SeoExportCenterPanel({
  rows,
  overviews,
  onGenerate,
  onCopy,
}: {
  rows: SeoSiteRow[];
  overviews: Record<number, SeoOverview | undefined>;
  onGenerate: (site: SeoSiteRow) => void;
  onCopy: (label: string, value: string) => void;
}) {
  return (
    <WorkspacePanel
      title="SEO Export Center"
      description="Copy public sitemap, robots, JSON-LD, and validation links for active vendor sites."
      icon={FileText}
    >
      {rows.length ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {rows.map((site) => {
            const origin = originForSeoSite(site);
            const overview = overviews[site.id];
            const links = overview?.links ?? {
              siteUrl: origin,
              sitemapUrl: `${origin}/sitemap.xml`,
              robotsUrl: `${origin}/robots.txt`,
              jsonldUrl: `${origin}/schema.jsonld`,
              searchConsoleUrl: `https://search.google.com/search-console?resource_id=${encodeURIComponent(origin)}`,
              richResultsTestUrl: `https://search.google.com/test/rich-results?url=${encodeURIComponent(origin)}`,
              schemaValidatorUrl: `https://validator.schema.org/#url=${encodeURIComponent(origin)}`,
            };
            const copyLinks = [
              ["Public", links.siteUrl],
              ["Sitemap", links.sitemapUrl],
              ["Robots", links.robotsUrl],
              ["JSON-LD", links.jsonldUrl],
            ];

            return (
            <div
              key={site.id}
              className="rounded-lg border border-border/70 bg-background/30 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{site.label}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{origin}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => onGenerate(site)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate
                </Button>
              </div>
              <div className="mt-4 grid gap-2">
                {copyLinks.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-card/60 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
                      <p className="truncate font-mono text-xs">{value}</p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => onCopy(label, value)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-md border border-border/70 bg-card/60 p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Google preview</p>
                  <p className="mt-2 text-sm font-semibold text-primary">{site.label}</p>
                  <p className="mt-1 truncate text-xs text-emerald-300">{links.siteUrl}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    Book cab and taxi service with {site.label}. View routes, fares, vehicles, and contact details.
                  </p>
                </div>
                <div className="rounded-md border border-border/70 bg-card/60 p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Social preview</p>
                  <p className="mt-2 text-sm font-semibold">{site.label}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {site.theme} public taxi website ready for sharing on Open Graph and Twitter cards.
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <a className="inline-flex items-center gap-1 text-xs font-semibold text-primary" href={links.richResultsTestUrl} target="_blank">
                  Rich Results <ExternalLink className="h-3 w-3" />
                </a>
                <a className="inline-flex items-center gap-1 text-xs font-semibold text-primary" href={links.schemaValidatorUrl} target="_blank">
                  Schema Validator <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              {overview?.validation?.issues?.length ? (
                <div className="mt-3 rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">
                  {overview.validation.issues[0].message}
                </div>
              ) : null}
            </div>
            );
          })}
        </div>
      ) : (
        <TableEmpty label="No active sites to export SEO links yet." />
      )}
    </WorkspacePanel>
  );
}

function SearchConsolePanel({
  rows,
  overviews,
  tokenInputs,
  onTokenInput,
  onLoad,
  onAction,
  onCopy,
}: {
  rows: SeoSiteRow[];
  overviews: Record<number, SeoOverview | undefined>;
  tokenInputs: Record<number, string>;
  onTokenInput: (siteId: number, value: string) => void;
  onLoad: (site: SeoSiteRow) => void;
  onAction: (site: SeoSiteRow, action: string, body?: Record<string, unknown>) => void;
  onCopy: (label: string, value: string) => void;
}) {
  return (
    <WorkspacePanel
      title="Google Search Console Setup"
      description="Connect, verify, and queue sitemap submission without blocking publish actions."
      icon={Search}
    >
      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-sky-500/20 bg-sky-500/10 p-3 text-sm text-sky-100">
          Manual fallback: paste the Google meta token, publish it, then verify after the public homepage deploys.
        </div>
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-100">
          DNS fallback: add Google's TXT record at the domain host and retry verification after propagation.
        </div>
      </div>
      {rows.length ? (
        <div className="space-y-3">
          {rows.map((site) => {
            const overview = overviews[site.id];
            const stepper = overview?.searchConsole.stepper ?? {};
            const property = overview?.searchConsole.property;
            const token = overview?.searchConsole.verificationToken;
            const links = overview?.links;
            const queueStatus = property?.sitemapSubmitStatus ?? stepper.sitemap ?? "pending";
            const queueVariant: "success" | "danger" | "warning" | "outline" =
              queueStatus === "submitted"
                ? "success"
                : queueStatus === "failed"
                  ? "danger"
                  : queueStatus === "retrying" || queueStatus === "queued" || queueStatus === "submitting"
                    ? "warning"
                    : "outline";

            return (
              <div key={site.id} className="rounded-lg border border-border/70 bg-background/30 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{site.label}</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{originForSeoSite(site)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => onLoad(site)}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Load status
                    </Button>
                    {links?.searchConsoleUrl ? (
                      <a className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold" href={links.searchConsoleUrl} target="_blank">
                        <ExternalLink className="h-4 w-4" />
                        Console
                      </a>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-2 md:grid-cols-6">
                  {["connect", "property", "token", "publish", "verify", "sitemap"].map((step) => (
                    <div key={step} className="rounded-md border border-border/70 bg-card/60 p-2">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">{step}</p>
                      <Badge className="mt-2" variant={stepper[step] === "verified" || stepper[step] === "submitted" || stepper[step] === "published" || stepper[step] === "connected" ? "success" : "outline"}>
                        {stepper[step] ?? "pending"}
                      </Badge>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
                  <Input
                    placeholder="Paste google-site-verification content token"
                    value={tokenInputs[site.id] ?? ""}
                    onChange={(event) => onTokenInput(site.id, event.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => onAction(site, "property")}>
                      <Globe2 className="mr-2 h-4 w-4" />
                      Property
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onAction(site, "token", { googleVerificationCode: tokenInputs[site.id] })}
                    >
                      <ClipboardList className="mr-2 h-4 w-4" />
                      Token
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => onAction(site, "publish-token")}>
                      <Rocket className="mr-2 h-4 w-4" />
                      Publish
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => onAction(site, "verify")}>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Verify
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => onAction(site, "queue-sitemap")}>
                      <Send className="mr-2 h-4 w-4" />
                      Queue
                    </Button>
                    <Button size="sm" onClick={() => onAction(site, "submit-now")}>
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Submit now
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant={queueVariant}>{queueStatus}</Badge>
                  {property?.sitemapSubmitReason ? <span>{property.sitemapSubmitReason}</span> : null}
                  {property?.sitemapSubmitAttemptCount ? <span>{property.sitemapSubmitAttemptCount} attempts</span> : null}
                  {property?.sitemapSubmitLastError ? <span className="text-rose-300">{property.sitemapSubmitLastError}</span> : null}
                </div>

                {token?.googleVerificationCode ? (
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => onCopy("Meta token", token.googleVerificationCode ?? "")}
                      className="rounded-md border border-border/70 bg-card/60 px-3 py-2 text-left font-mono text-xs"
                    >
                      {token.googleVerificationCode}
                    </button>
                    {token.fileName ? (
                      <button
                        type="button"
                        onClick={() => onCopy("HTML verification file", `${originForSeoSite(site)}/${token.fileName}`)}
                        className="rounded-md border border-border/70 bg-card/60 px-3 py-2 text-left font-mono text-xs"
                      >
                        {originForSeoSite(site)}/{token.fileName}
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {overview?.validation.issues.length ? (
                  <div className="mt-3 rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-100">
                    {overview.validation.issues.map((issue) => issue.message).join(" ")}
                  </div>
                ) : null}
                {overview?.aiSearchReadiness.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {overview.aiSearchReadiness.map((item) => (
                      <Badge key={item.key} variant={item.ready ? "success" : "warning"}>
                        {item.label}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <TableEmpty label="No active vendor sites are ready for Search Console setup." />
      )}
    </WorkspacePanel>
  );
}

function routeLabel(value?: Record<string, unknown>) {
  if (!value) return "Route not captured";
  const pickup = String(value.pickupAddress ?? "");
  const drop = String(value.dropAddress ?? "");
  return [pickup, drop].filter(Boolean).join(" to ") || "Route not captured";
}

function BusinessRuntimePanel({
  rows,
  bookings,
  onLoad,
}: {
  rows: SeoSiteRow[];
  bookings: RuntimeBookingOverview | null;
  onLoad: (site?: SeoSiteRow) => void;
}) {
  const summary = bookings?.summary;
  return (
    <WorkspacePanel
      title="Bookings Runtime"
      description="Review public lead, COD booking, online/advance payment, notification, and event history."
      icon={ClipboardList}
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onLoad()}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Load all bookings
        </Button>
        {rows.slice(0, 4).map((site) => (
          <Button key={site.id} size="sm" variant="secondary" onClick={() => onLoad(site)}>
            {site.label}
          </Button>
        ))}
      </div>
      {summary ? (
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <MetricCard label="Total" value={summary.total} icon={ClipboardList} />
          <MetricCard label="Confirmed" value={summary.confirmed} icon={ShieldCheck} tone="success" />
          <MetricCard label="Pending payment" value={summary.pendingPayment} icon={CreditCard} tone="warning" />
          <MetricCard label="Failed" value={summary.failed} icon={ShieldAlert} tone={summary.failed ? "danger" : "default"} />
        </div>
      ) : null}
      {bookings?.rows.length ? (
        <div className="space-y-3">
          {bookings.rows.map((booking) => (
            <div key={booking.id} className="rounded-lg border border-border/70 bg-background/30 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{booking.customerName || "Website customer"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {booking.vendorName || booking.siteName || "Vendor site"} · {routeLabel(booking.routeIntentJson)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={booking.bookingStatus === "confirmed" ? "success" : booking.bookingStatus === "payment_failed" ? "danger" : "warning"}>
                    {formatLabel(booking.bookingStatus)}
                  </Badge>
                  <Badge variant={booking.paymentStatus?.includes("paid") ? "success" : booking.paymentStatus?.includes("failed") ? "danger" : "outline"}>
                    {formatLabel(booking.paymentStatus)}
                  </Badge>
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <div className="rounded-md border border-border/70 bg-card/60 p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Reference</p>
                  <p className="mt-1 font-mono text-xs">{booking.publicId}</p>
                </div>
                <div className="rounded-md border border-border/70 bg-card/60 p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Amount</p>
                  <p className="mt-1 font-semibold">{formatMoney(Number(booking.totalAmount ?? 0), booking.currency)}</p>
                </div>
                <div className="rounded-md border border-border/70 bg-card/60 p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Mode</p>
                  <p className="mt-1 capitalize">{formatLabel(booking.paymentMode)}</p>
                </div>
                <div className="rounded-md border border-border/70 bg-card/60 p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Customer</p>
                  <p className="mt-1 text-sm">{booking.customerPhone || "Phone not captured"}</p>
                </div>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                <div className="rounded-md border border-border/70 bg-card/60 p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Event history</p>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {(booking.events ?? []).slice(0, 5).map((event, index) => (
                      <p key={`${event.eventType}-${index}`}>{formatLabel(event.eventType)} · {event.status}</p>
                    ))}
                  </div>
                </div>
                <div className="rounded-md border border-border/70 bg-card/60 p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Payments</p>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {(booking.payments ?? []).slice(0, 4).map((payment, index) => (
                      <p key={`${payment.providerOrderId}-${index}`}>
                        {payment.provider || "provider"} · {payment.status} · {formatMoney(Number(payment.amount ?? 0), booking.currency)}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="rounded-md border border-border/70 bg-card/60 p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Notifications</p>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {(booking.notifications ?? []).slice(0, 4).map((item, index) => (
                      <p key={`${item.channel}-${index}`}>{item.channel} · {item.recipientType} · {item.status}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <TableEmpty label="Load bookings to review public runtime activity." />
      )}
    </WorkspacePanel>
  );
}

function RecoverySiteCard({
  site,
  overview,
  onLoad,
  onSave,
}: {
  site: SeoSiteRow;
  overview?: RuntimeRecoveryOverview;
  onLoad: (site: SeoSiteRow) => void;
  onSave: (site: SeoSiteRow, body: Record<string, unknown>) => void;
}) {
  const settings = overview?.settings;
  const [draft, setDraft] = useState({
    enabled: settings?.enabled ?? true,
    browserPromptEnabled: settings?.browserPromptEnabled ?? true,
    whatsappApiEnabled: settings?.whatsappApiEnabled ?? false,
    paidAddonEnabled: settings?.paidAddonEnabled ?? false,
    consentRequired: settings?.consentRequired ?? true,
    quietHoursStart: settings?.quietHoursStart ?? "21:00",
    quietHoursEnd: settings?.quietHoursEnd ?? "08:00",
    cooldownMinutes: String(settings?.cooldownMinutes ?? 180),
    abandonedWindowMinutes: String(settings?.abandonedWindowMinutes ?? 15),
    expiryMinutes: String(settings?.expiryMinutes ?? 1440),
    templateStatus: settings?.templateStatus ?? "not_configured",
    templateName: settings?.templateName ?? "abandoned_quote_recovery",
  });
  useEffect(() => {
    if (!settings) return;
    setDraft({
      enabled: settings.enabled,
      browserPromptEnabled: settings.browserPromptEnabled,
      whatsappApiEnabled: settings.whatsappApiEnabled,
      paidAddonEnabled: settings.paidAddonEnabled,
      consentRequired: settings.consentRequired,
      quietHoursStart: settings.quietHoursStart,
      quietHoursEnd: settings.quietHoursEnd,
      cooldownMinutes: String(settings.cooldownMinutes),
      abandonedWindowMinutes: String(settings.abandonedWindowMinutes),
      expiryMinutes: String(settings.expiryMinutes),
      templateStatus: settings.templateStatus,
      templateName: settings.templateName ?? "abandoned_quote_recovery",
    });
  }, [settings]);
  const funnelRows = overview?.funnel.rows ?? [];
  const previewMessage = [
    "Hi, your cab fare quote is still available.",
    "Route: Pickup to Drop",
    "Fare: INR 1,850",
    `Resume: ${originForSeoSite(site)}/?resume=secure-link`,
  ].join("\n");

  return (
    <div className="rounded-lg border border-border/70 bg-background/30 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{site.label}</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{originForSeoSite(site)}</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => onLoad(site)}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Load
        </Button>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="grid gap-2 md:grid-cols-2">
            {[
              ["enabled", "Recovery"],
              ["browserPromptEnabled", "Browser prompt"],
              ["whatsappApiEnabled", "WhatsApp API"],
              ["paidAddonEnabled", "Paid add-on"],
              ["consentRequired", "Consent required"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 rounded-md border border-border/70 bg-card/60 px-3 py-2 text-sm">
                <input
                  checked={Boolean(draft[key as keyof typeof draft])}
                  type="checkbox"
                  onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.checked }))}
                />
                {label}
              </label>
            ))}
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <Input value={draft.quietHoursStart} onChange={(event) => setDraft((current) => ({ ...current, quietHoursStart: event.target.value }))} />
            <Input value={draft.quietHoursEnd} onChange={(event) => setDraft((current) => ({ ...current, quietHoursEnd: event.target.value }))} />
            <Input value={draft.abandonedWindowMinutes} onChange={(event) => setDraft((current) => ({ ...current, abandonedWindowMinutes: event.target.value }))} />
            <Input value={draft.cooldownMinutes} onChange={(event) => setDraft((current) => ({ ...current, cooldownMinutes: event.target.value }))} />
            <Input value={draft.expiryMinutes} onChange={(event) => setDraft((current) => ({ ...current, expiryMinutes: event.target.value }))} />
            <Input value={draft.templateStatus} onChange={(event) => setDraft((current) => ({ ...current, templateStatus: event.target.value }))} />
          </div>
          <Button
            size="sm"
            onClick={() =>
              onSave(site, {
                ...draft,
                cooldownMinutes: Number(draft.cooldownMinutes),
                abandonedWindowMinutes: Number(draft.abandonedWindowMinutes),
                expiryMinutes: Number(draft.expiryMinutes),
              })
            }
          >
            <Save className="mr-2 h-4 w-4" />
            Save recovery
          </Button>
        </div>
        <div className="space-y-3">
          <div className="rounded-md border border-border/70 bg-card/60 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">WhatsApp preview</p>
            <pre className="mt-2 whitespace-pre-wrap rounded-md bg-background p-3 text-xs text-muted-foreground">{previewMessage}</pre>
          </div>
          <div className="rounded-md border border-border/70 bg-card/60 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Recovery funnel</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {["abandoned", "recovery_prompted", "recovery_sent", "recovered", "suppressed", "expired"].map((status) => (
                <Badge key={status} variant="outline">
                  {formatLabel(status)}: {funnelRows.find((row) => row.status === status)?.total ?? 0}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingRecoveryPanel({
  rows,
  overviews,
  onLoad,
  onSave,
}: {
  rows: SeoSiteRow[];
  overviews: Record<number, RuntimeRecoveryOverview | undefined>;
  onLoad: (site: SeoSiteRow) => void;
  onSave: (site: SeoSiteRow, body: Record<string, unknown>) => void;
}) {
  return (
    <WorkspacePanel
      title="Recovery Settings"
      description="Control abandoned quote recovery windows, browser prompts, WhatsApp API gating, and funnel health."
      icon={RotateCcw}
    >
      {rows.length ? (
        <div className="space-y-3">
          {rows.map((site) => (
            <RecoverySiteCard key={site.id} site={site} overview={overviews[site.id]} onLoad={onLoad} onSave={onSave} />
          ))}
        </div>
      ) : (
        <TableEmpty label="No active vendor sites are ready for recovery settings." />
      )}
    </WorkspacePanel>
  );
}

function RuntimeRulesPanel({
  rows,
  overviews,
  razorpayInputs,
  onLoad,
  onRazorpayInput,
  onSaveRazorpay,
}: {
  rows: SeoSiteRow[];
  overviews: Record<number, RuntimeRulesOverview | undefined>;
  razorpayInputs: Record<number, { keyId: string; keySecret: string; testMode: boolean }>;
  onLoad: (site: SeoSiteRow) => void;
  onRazorpayInput: (siteId: number, value: { keyId: string; keySecret: string; testMode: boolean }) => void;
  onSaveRazorpay: (site: SeoSiteRow) => void;
}) {
  return (
    <WorkspacePanel
      title="Runtime Rules"
      description="Review route calculator, fleet inventory, tariff calendar, quote PDF, Razorpay, and B2B foundations."
      icon={ListTree}
    >
      {rows.length ? (
        <div className="space-y-3">
          {rows.map((site) => {
            const overview = overviews[site.id];
            const input = razorpayInputs[site.id] ?? { keyId: "", keySecret: "", testMode: true };
            return (
              <div key={site.id} className="rounded-lg border border-border/70 bg-background/30 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{site.label}</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{originForSeoSite(site)}</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => onLoad(site)}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Load rules
                  </Button>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                  <div className="rounded-md border border-border/70 bg-card/60 p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Route calculator</p>
                    <div className="mt-3 grid gap-2">
                      <Input placeholder="Pickup city" />
                      <Input placeholder="Drop city" />
                      <Input placeholder="Trip type: one-way, airport, rental, outstation" />
                    </div>
                  </div>
                  <div className="rounded-md border border-border/70 bg-card/60 p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Fleet inventory</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(overview?.fleet.length ? overview.fleet : [
                        { id: 1, cabType: "sedan", inventoryState: "available" },
                        { id: 2, cabType: "suv", inventoryState: "limited" },
                        { id: 3, cabType: "tempo", inventoryState: "sold_out" },
                      ]).map((fleet) => (
                        <Badge key={fleet.id} variant={fleet.inventoryState === "sold_out" ? "danger" : fleet.inventoryState === "limited" ? "warning" : "success"}>
                          {fleet.cabType}: {formatLabel(String(fleet.inventoryState ?? "available"))}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-md border border-border/70 bg-card/60 p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Tariff calendar</p>
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {(overview?.tariffs.length ? overview.tariffs : [
                        { id: 1, ruleType: "peak_hour", multiplier: 1.15, status: "active" },
                        { id: 2, ruleType: "seasonal", multiplier: 1.25, status: "draft" },
                      ]).map((tariff) => (
                        <p key={tariff.id}>{formatLabel(String(tariff.ruleType))} · x{tariff.multiplier ?? 1} · {tariff.status}</p>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <div className="rounded-md border border-border/70 bg-card/60 p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Razorpay test config</p>
                    <div className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                      <Input
                        placeholder="Key ID"
                        value={input.keyId}
                        onChange={(event) => onRazorpayInput(site.id, { ...input, keyId: event.target.value })}
                      />
                      <Input
                        placeholder="Key secret"
                        type="password"
                        value={input.keySecret}
                        onChange={(event) => onRazorpayInput(site.id, { ...input, keySecret: event.target.value })}
                      />
                      <Button size="sm" onClick={() => onSaveRazorpay(site)}>
                        <Save className="mr-2 h-4 w-4" />
                        Save
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-md border border-border/70 bg-card/60 p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">B2B corporate mode</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="outline">Profiles: {overview?.corporates.length ?? 0}</Badge>
                      <Badge variant="outline">Invoice flag</Badge>
                      <Badge variant="outline">Allowed routes</Badge>
                      <Badge variant="outline">Quote PDF enabled</Badge>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <TableEmpty label="No active sites are ready for runtime rules." />
      )}
    </WorkspacePanel>
  );
}

type BadgeTone = "default" | "secondary" | "outline" | "success" | "warning" | "danger";

function opsBadgeVariant(value: string): BadgeTone {
  if (["success", "active", "completed", "configured", "resolved", "acknowledged"].includes(value)) {
    return "success";
  }
  if (["warning", "pending", "queued", "retrying", "manual", "monitoring"].includes(value)) {
    return "warning";
  }
  if (["danger", "failed", "error", "blocked", "disabled", "open"].includes(value)) {
    return "danger";
  }
  return "outline";
}

function ProductionOpsPanel({
  data,
  onRefresh,
  onRollout,
  onIncident,
  onIncidentAction,
  onRollback,
  onAnonymize,
  onRetention,
}: {
  data?: ProductionOpsData;
  onRefresh: () => Promise<ProductionOpsData>;
  onRollout: (site: ProductionOpsSite, body: Record<string, unknown>) => void;
  onIncident: (site: ProductionOpsSite) => void;
  onIncidentAction: (
    site: ProductionOpsSite,
    alert: ProductionOpsAlert,
    action: "acknowledge" | "assign" | "retry" | "resolve",
  ) => void;
  onRollback: (site: ProductionOpsSite) => void;
  onAnonymize: (site: ProductionOpsSite) => void;
  onRetention: (site: ProductionOpsSite) => void;
}) {
  const flags = Object.keys(data?.featureFlagDefaults ?? {});
  const runbookByKey = new Map((data?.runbooks ?? []).map((runbook) => [runbook.key, runbook]));

  return (
    <WorkspacePanel
      title="Production Ops"
      description="Launch controls, monitoring states, rollback, runbooks, feature gates, privacy, and retention for Vendero Sites."
      icon={ShieldCheck}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <div>
            <p className="font-semibold text-amber-200">Feature flags protect the new renderer rollout.</p>
            <p className="text-sm text-amber-100/80">
              Disabled or beta-blocked sites keep the old store-link fallback whenever a fallback token exists.
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => void onRefresh()}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {data ? (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Sites" value={data.totals.sites} detail="Tracked vendor sites" icon={Globe2} />
              <MetricCard label="Renderer Enabled" value={data.totals.rendererEnabled} detail="Feature flag on" icon={Rocket} tone="success" />
              <MetricCard label="Open Alerts" value={data.totals.openAlerts} detail="Need operations review" icon={AlertTriangle} tone={data.totals.openAlerts ? "warning" : "success"} />
              <MetricCard label="Rollback Ready" value={data.totals.rollbackReady} detail="Previous snapshots available" icon={RotateCcw} />
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-lg border border-border/70 bg-background/30 p-4">
                <p className="font-semibold">Runbooks</p>
                <div className="mt-3 grid gap-2">
                  {data.runbooks.map((runbook) => (
                    <a
                      key={runbook.key}
                      href={runbook.href}
                      className="rounded-md border border-border/70 bg-card/60 p-3 text-sm transition hover:border-primary/60"
                    >
                      <span className="flex items-center justify-between gap-3 font-medium">
                        {runbook.title}
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">{runbook.summary}</span>
                    </a>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/30 p-4">
                <p className="font-semibold">Backup, Restore, And Privacy Review</p>
                <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                  {Object.entries(data.backupRestoreNotes).map(([key, value]) => (
                    <p key={key}>
                      <span className="font-medium text-foreground">{formatLabel(key)}:</span> {value}
                    </p>
                  ))}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {data.privacyReview.map((item) => (
                      <Badge key={item} variant="outline">{item}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {data.sites.length ? (
              <div className="space-y-4">
                {data.sites.map((site) => {
                  const openAlerts = site.alerts.filter((alert) => alert.status !== "resolved");
                  const rendererEnabled = Boolean(site.featureFlags.venderoSitesRenderer);
                  return (
                    <div key={site.id} className="rounded-xl border border-border/70 bg-background/30 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">{site.label}</p>
                            <Badge variant={opsBadgeVariant(site.status)}>{formatLabel(site.status)}</Badge>
                            {site.beta.enabled ? <Badge variant="warning">{site.beta.label ?? "Selected vendor beta"}</Badge> : null}
                            {!rendererEnabled ? <Badge variant="danger">Renderer locked</Badge> : null}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{site.vendor} · {site.theme}</p>
                          <p className="mt-1 font-mono text-xs text-muted-foreground">{site.domain || "No public domain configured"}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {site.fallbackUrl ? (
                            <Button asChild size="sm" variant="outline">
                              <a href={site.fallbackUrl} target="_blank" rel="noreferrer">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Fallback
                              </a>
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant={rendererEnabled ? "outline" : "secondary"}
                            onClick={() =>
                              onRollout(site, {
                                action: rendererEnabled ? "disable_renderer" : "enable_renderer",
                              })
                            }
                          >
                            <Rocket className="mr-2 h-4 w-4" />
                            {rendererEnabled ? "Disable renderer" : "Enable renderer"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!site.rollbackAvailable}
                            onClick={() => onRollback(site)}
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Rollback
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 lg:grid-cols-3">
                        <div className="rounded-lg border border-border/70 bg-card/60 p-3">
                          <p className="text-xs font-semibold uppercase text-muted-foreground">Operational Status</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {site.operationalStatuses.map((status) => (
                              <Badge key={status.key} variant={opsBadgeVariant(status.tone)}>
                                {status.label}: {formatLabel(status.status)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-lg border border-border/70 bg-card/60 p-3">
                          <p className="text-xs font-semibold uppercase text-muted-foreground">Plan And Add-on Gates</p>
                          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                            <p>Plan: <span className="text-foreground">{formatLabel(site.planGates.requiredPlan ?? "not set")}</span> · {formatLabel(site.planGates.status ?? "not checked")}</p>
                            <p>Locked: {(site.planGates.lockedFeatures ?? []).length || 0} feature(s)</p>
                            <p>Add-ons: {(site.addonGates.enabledAddons ?? []).length}/{(site.addonGates.requiredAddons ?? []).length}</p>
                          </div>
                        </div>
                        <div className="rounded-lg border border-border/70 bg-card/60 p-3">
                          <p className="text-xs font-semibold uppercase text-muted-foreground">Beta And Feedback</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant={site.beta.enabled ? "outline" : "secondary"}
                              onClick={() =>
                                onRollout(site, {
                                  action: site.beta.enabled ? "disable_beta" : "enable_beta",
                                })
                              }
                            >
                              {site.beta.enabled ? "Disable beta" : "Enable beta"}
                            </Button>
                            {site.beta.vendorFeedbackUrl ? (
                              <Button asChild size="sm" variant="outline">
                                <a href={site.beta.vendorFeedbackUrl} target="_blank" rel="noreferrer">
                                  Feedback
                                </a>
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 rounded-lg border border-border/70 bg-card/60 p-3">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">Feature Flags</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {flags.map((flag) => {
                            const enabled = Boolean(site.featureFlags[flag]);
                            return (
                              <button
                                key={flag}
                                type="button"
                                className={`rounded-md border px-3 py-2 text-left text-xs transition ${
                                  enabled
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                                    : "border-border/70 bg-background/50 text-muted-foreground"
                                }`}
                                onClick={() => onRollout(site, { featureFlags: { [flag]: !enabled } })}
                              >
                                <span className="block font-semibold">{formatLabel(flag)}</span>
                                <span>{enabled ? "Enabled" : "Locked"}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        <div className="rounded-lg border border-border/70 bg-card/60 p-3">
                          <p className="text-xs font-semibold uppercase text-muted-foreground">Privacy And Retention</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant={site.privacy.analyticsConsentRequired ? "secondary" : "outline"}
                              onClick={() =>
                                onRollout(site, {
                                  privacy: {
                                    analyticsConsentRequired: !site.privacy.analyticsConsentRequired,
                                  },
                                })
                              }
                            >
                              Analytics consent: {site.privacy.analyticsConsentRequired ? "on" : "off"}
                            </Button>
                            <Button
                              size="sm"
                              variant={site.privacy.capturePartialRouteText ? "secondary" : "outline"}
                              onClick={() =>
                                onRollout(site, {
                                  privacy: {
                                    capturePartialRouteText: !site.privacy.capturePartialRouteText,
                                  },
                                })
                              }
                            >
                              Partial route text: {site.privacy.capturePartialRouteText ? "on" : "off"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => onRetention(site)}>
                              <Database className="mr-2 h-4 w-4" />
                              Apply retention
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => onAnonymize(site)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Anonymize
                            </Button>
                          </div>
                          <p className="mt-3 text-xs text-muted-foreground">
                            Analytics {site.dataRetention.analyticsDays}d · route text {site.dataRetention.routePartialTextDays}d · recovery {site.dataRetention.recoveryEventDays}d · quote PDFs {site.dataRetention.quotePdfDays}d
                          </p>
                        </div>
                        <div className="rounded-lg border border-border/70 bg-card/60 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-semibold uppercase text-muted-foreground">Alerts And Incidents</p>
                            <Button size="sm" variant="outline" onClick={() => onIncident(site)}>
                              <AlertTriangle className="mr-2 h-4 w-4" />
                              Record
                            </Button>
                          </div>
                          {openAlerts.length ? (
                            <div className="mt-3 space-y-2">
                              {openAlerts.map((alert) => {
                                const runbook = alert.runbookKey ? runbookByKey.get(alert.runbookKey) : null;
                                const isIncident = alert.id.startsWith("vs_incident_");
                                return (
                                  <div key={alert.id} className="rounded-md border border-border/70 bg-background/40 p-3">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                      <div>
                                        <Badge variant={opsBadgeVariant(alert.severity)}>{formatLabel(alert.severity)}</Badge>
                                        <p className="mt-2 text-sm">{alert.message}</p>
                                        {runbook ? <p className="mt-1 text-xs text-muted-foreground">{runbook.title}</p> : null}
                                      </div>
                                      {runbook ? (
                                        <a className="text-xs text-primary" href={runbook.href}>Runbook</a>
                                      ) : null}
                                    </div>
                                    {isIncident ? (
                                      <div className="mt-3 flex flex-wrap gap-2">
                                        <Button size="sm" variant="outline" onClick={() => onIncidentAction(site, alert, "acknowledge")}>Acknowledge</Button>
                                        <Button size="sm" variant="outline" onClick={() => onIncidentAction(site, alert, "assign")}>Assign</Button>
                                        <Button size="sm" variant="outline" onClick={() => onIncidentAction(site, alert, "retry")}>Retry</Button>
                                        <Button size="sm" variant="outline" onClick={() => onIncidentAction(site, alert, "resolve")}>Resolve</Button>
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <TableEmpty label="No open production alerts for this site." />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <TableEmpty label="No vendor sites are ready for production operations." />
            )}
          </>
        ) : (
          <TableEmpty label="Production operations data has not loaded yet." />
        )}
      </div>
    </WorkspacePanel>
  );
}

function ThirdPartyLibrariesPanel({ components }: { components: SiteThemeComponent[] }) {
  const rows = components.flatMap((component) => {
    const libraries = Array.isArray(component.metadata?.libraries)
      ? component.metadata?.libraries
      : [];
    return libraries.map((library, index) => ({
      id: `${component.id}-${index}`,
      component: component.name,
      library: String(library),
    }));
  });
  return (
    <WorkspacePanel
      title="Third-Party Libraries"
      description="Track approved slider, gallery, map, and script dependencies used by components."
      icon={Library}
    >
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 pr-3">Component</th>
                <th className="py-2 pr-3">Library</th>
                <th className="py-2 pr-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/70">
                  <td className="py-3 pr-3 font-semibold">{row.component}</td>
                  <td className="py-3 pr-3 font-mono text-xs">{row.library}</td>
                  <td className="py-3 pr-3">
                    <Badge variant="warning">Needs review</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <TableEmpty label="No third-party libraries registered yet." />
      )}
    </WorkspacePanel>
  );
}

function themeBannerImages(theme: SiteTheme) {
  const metadataImages = Array.isArray(theme.metadata?.bannerImages)
    ? theme.metadata.bannerImages
    : [];
  return [theme.previewImageUrl, ...metadataImages]
    .filter((item): item is string => typeof item === "string" && Boolean(item))
    .filter((item, index, list) => list.indexOf(item) === index);
}

function MediaAssetsPanel({ themes }: { themes: SiteTheme[] }) {
  const rows = themes.flatMap((theme) =>
    themeBannerImages(theme).map((image, index) => ({
      id: `${theme.id}-${index}`,
      theme: theme.name,
      image,
      usage: index === 0 ? "Preview/banner" : "Banner carousel",
    })),
  );
  return (
    <WorkspacePanel
      title="Media Assets"
      description="Review theme preview images, banner carousel assets, and future vendor uploads."
      icon={Image}
    >
      {rows.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className="overflow-hidden rounded-xl border border-border/70 bg-background/30"
            >
              <img src={row.image} alt="" className="h-32 w-full object-cover" />
              <div className="p-3">
                <p className="font-semibold">{row.theme}</p>
                <p className="text-xs text-muted-foreground">{row.usage}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <TableEmpty label="No media assets yet. Add banner URLs from Theme Create." />
      )}
    </WorkspacePanel>
  );
}

function ErrorLogsPanel({ analytics }: { analytics: SiteAnalytics }) {
  return (
    <WorkspacePanel
      title="Error Logs"
      description="Route, device, renderer, Search Console, and publish errors for Vendero Sites."
      icon={ShieldAlert}
    >
      {analytics.errorRows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 pr-3">Site</th>
                <th className="py-2 pr-3">Route</th>
                <th className="py-2 pr-3">Device</th>
                <th className="py-2 pr-3">Error</th>
                <th className="py-2 pr-3">Count</th>
              </tr>
            </thead>
            <tbody>
              {analytics.errorRows.map((row) => (
                <tr key={row.id} className="border-t border-border/70">
                  <td className="py-3 pr-3 font-mono text-xs">{row.site}</td>
                  <td className="py-3 pr-3 font-mono text-xs">{row.route}</td>
                  <td className="py-3 pr-3">{row.device}</td>
                  <td className="py-3 pr-3">{row.error}</td>
                  <td className="py-3 pr-3">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <TableEmpty label="No error logs." />
      )}
    </WorkspacePanel>
  );
}

export function SiteThemesPanel({
  initialData,
}: {
  initialData: SiteThemesData;
}) {
  const actionModal = useActionModal();
  const [data, setData] = useState<NonNullable<SiteThemesData>>(
    initialData ?? fallbackData(),
  );
  const [activeTab, setActiveTab] = useState<SiteDashboardTab>("analytics");
  const [message, setMessage] = useState("");
  const [seoOverviews, setSeoOverviews] = useState<Record<number, SeoOverview | undefined>>({});
  const [aiSeoOverviews, setAiSeoOverviews] = useState<
    Record<number, AiSeoOverview | undefined>
  >({});
  const [aiSeoWorking, setAiSeoWorking] = useState<
    Record<number, AiSeoWorkingAction | undefined>
  >({});
  const autoLoadedAiSeoSites = useRef(new Set<number>());
  const [searchConsoleTokens, setSearchConsoleTokens] = useState<Record<number, string>>({});
  const [runtimeBookings, setRuntimeBookings] = useState<RuntimeBookingOverview | null>(null);
  const [recoveryOverviews, setRecoveryOverviews] = useState<Record<number, RuntimeRecoveryOverview | undefined>>({});
  const [runtimeRuleOverviews, setRuntimeRuleOverviews] = useState<Record<number, RuntimeRulesOverview | undefined>>({});
  const [razorpayInputs, setRazorpayInputs] = useState<Record<number, { keyId: string; keySecret: string; testMode: boolean }>>({});

  const sortedThemes = useMemo(
    () =>
      [...data.themes].sort(
        (left, right) => left.sortOrder - right.sortOrder || left.id - right.id,
      ),
    [data.themes],
  );
  const sortedComponents = useMemo(
    () =>
      mergeFixedSiteComponents(data.components).sort(
        (left, right) => left.sortOrder - right.sortOrder || left.id - right.id,
      ),
    [data.components],
  );
  const analytics = useMemo(() => data.analytics ?? buildSiteAnalytics(data), [data]);
  const activeSeoRows = useMemo(() => seoSiteRows(data, analytics), [data, analytics]);
  const editableAiSeoRows = useMemo(
    () => aiSeoSiteRows(data, analytics),
    [data, analytics],
  );

  useEffect(() => {
    if (activeTab !== "ai-seo") return;

    editableAiSeoRows.forEach((site) => {
      if (autoLoadedAiSeoSites.current.has(site.id)) return;
      autoLoadedAiSeoSites.current.add(site.id);
      setAiSeoWorking((current) => ({ ...current, [site.id]: "load" }));
      void requestJson(
        `/api/v1/admin/vendero-sites/vendor-sites/${site.id}/ai-seo`,
      )
        .then((overview) => {
          setAiSeoOverviews((current) => ({
            ...current,
            [site.id]: overview as AiSeoOverview,
          }));
        })
        .catch((error) => {
          setMessage(
            error instanceof Error
              ? error.message
              : `Unable to load AI SEO status for ${site.label}`,
          );
        })
        .finally(() => {
          setAiSeoWorking((current) => {
            if (current[site.id] !== "load") return current;
            const next = { ...current };
            delete next[site.id];
            return next;
          });
        });
    });
  }, [activeTab, editableAiSeoRows]);

  const productionOps = data.productionOps;
  const counts: Record<SiteDashboardTab, number> = {
    analytics: data.summary.activeAssignmentCount,
    "active-sites": analytics.metrics.activeSites,
    "addon-requests": analytics.addonRequests.length,
    payments: analytics.paymentRows.length,
    themes: sortedThemes.length,
    components: sortedComponents.length,
    "vendor-site-editor": data.assignments.length,
    "business-runtime": runtimeBookings?.summary.total ?? activeSeoRows.length,
    "booking-recovery": activeSeoRows.length,
    "runtime-rules": activeSeoRows.length,
    "ai-seo": editableAiSeoRows.length,
    "seo-auditor": analytics.siteRows.length,
    "seo-export": activeSeoRows.length,
    "search-console": activeSeoRows.length,
    "production-ops": productionOps?.totals.openAlerts ?? 0,
    "third-party-libraries": sortedComponents.filter((component) =>
      Array.isArray(component.metadata?.libraries),
    ).length,
    "media-assets": sortedThemes.reduce(
      (total, theme) => total + themeBannerImages(theme).length,
      0,
    ),
    "error-logs": analytics.errorRows.length,
  };

  async function refreshData() {
    const nextData = (await requestJson(
      "/api/v1/admin/site-themes",
    )) as NonNullable<SiteThemesData>;
    setData(nextData);
  }

  async function refreshProductionOps() {
    const result = (await requestJson(
      "/api/v1/admin/vendero-sites/production-ops",
    )) as ProductionOpsData;
    setData((current) => ({ ...current, productionOps: result }));
    return result;
  }

  async function updateThemeLifecycle(
    theme: SiteTheme,
    lifecycleState: "draft" | "live" | "paused",
  ) {
    const actionLabel =
      lifecycleState === "live"
        ? "promote this theme to live"
        : lifecycleState === "draft"
          ? "rollback this theme to draft"
          : "pause this theme";
    const confirmed = await actionModal.confirm({
      title: formatLabel(actionLabel),
      description: `${theme.name} will be updated through the Vendero Sites lifecycle API.`,
      confirmLabel: lifecycleState === "draft" ? "Rollback" : "Update",
    });
    if (!confirmed) return;
    setMessage("");
    try {
      await requestJson(
        `/api/v1/admin/vendero-sites/themes/${theme.id}/lifecycle`,
        { lifecycleState },
        "POST",
      );
      await refreshData();
      setMessage(`${theme.name} lifecycle updated.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update theme");
    }
  }

  async function publishTheme(theme: SiteTheme) {
    const confirmed = await actionModal.confirm({
      title: "Publish theme version",
      description:
        "This creates a theme version snapshot after validation. Live promotion remains a separate action.",
      confirmLabel: "Publish",
    });
    if (!confirmed) return;
    setMessage("");
    try {
      await requestJson(
        `/api/v1/admin/vendero-sites/themes/${theme.id}/publish`,
        {
          lifecycleState: "review",
          versionLabel: `${theme.name} review version`,
        },
        "POST",
      );
      await refreshData();
      setMessage(`${theme.name} publish snapshot created.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to publish theme");
    }
  }

  async function loadAiSeoOverview(site: SeoSiteRow) {
    setMessage("");
    setAiSeoWorking((current) => ({ ...current, [site.id]: "load" }));
    try {
      const overview = (await requestJson(
        `/api/v1/admin/vendero-sites/vendor-sites/${site.id}/ai-seo`,
      )) as AiSeoOverview;
      setAiSeoOverviews((current) => ({
        ...current,
        [site.id]: overview,
      }));
      setMessage(`${site.label} AI SEO status loaded.`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load AI SEO status",
      );
    } finally {
      setAiSeoWorking((current) => {
        if (current[site.id] !== "load") return current;
        const next = { ...current };
        delete next[site.id];
        return next;
      });
    }
  }

  async function generateAiSeoDrafts(
    site: SeoSiteRow,
    scope: AiSeoGenerationScope,
  ) {
    setMessage("");
    setAiSeoWorking((current) => ({ ...current, [site.id]: "generate" }));
    try {
      const result = (await requestJson(
        `/api/v1/admin/vendero-sites/vendor-sites/${site.id}/ai-seo/generate`,
        {
          scope,
          includeRoutes: scope !== "pages",
        },
        "POST",
      )) as AiSeoGenerateResponse;
      setAiSeoOverviews((current) => ({
        ...current,
        [site.id]: result.overview,
      }));
      const fallbackCount = (result.results ?? []).filter(
        (row) => row.mode === "fallback",
      ).length;
      const failureCount = result.failures?.length ?? 0;
      const resultSummary = [
        `${formatCount(result.results?.length ?? 0)} review draft(s) created`,
        fallbackCount ? `${formatCount(fallbackCount)} fallback` : "",
        failureCount ? `${formatCount(failureCount)} failed` : "",
      ]
        .filter(Boolean)
        .join(", ");
      setMessage(
        `${site.label}: ${resultSummary}. Review the metadata, then approve it separately.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to generate AI SEO drafts",
      );
    } finally {
      setAiSeoWorking((current) => {
        if (current[site.id] !== "generate") return current;
        const next = { ...current };
        delete next[site.id];
        return next;
      });
    }
  }

  async function approveAiSeoDrafts(site: SeoSiteRow) {
    const overview = aiSeoOverviews[site.id];
    const job = overview ? latestAiSeoDraftJob(overview) : undefined;
    if (!overview || !job) {
      setMessage(
        `Load ${site.label} status and generate drafts before approval.`,
      );
      return;
    }

    const draftIds = new Set(overview.drafts.map((row) => row.id));
    const jobDraftCount = (job.resultJson?.pageDataIds ?? []).filter((id) =>
      draftIds.has(Number(id)),
    ).length;
    const confirmed = await actionModal.confirm({
      title: `Approve & publish SEO for ${site.label}`,
      description: `${formatCount(jobDraftCount)} draft row(s) from generation job #${job.id} will become public SEO. Any previously approved row for the same page and route will be archived.`,
      confirmLabel: "Approve & publish",
    });
    if (!confirmed) return;

    setMessage("");
    setAiSeoWorking((current) => ({ ...current, [site.id]: "approve" }));
    try {
      const result = (await requestJson(
        `/api/v1/admin/vendero-sites/vendor-sites/${site.id}/ai-seo/approve`,
        { jobId: job.id },
        "POST",
      )) as AiSeoApproveResponse;
      setAiSeoOverviews((current) => ({
        ...current,
        [site.id]: result.overview,
      }));
      setMessage(
        `${site.label}: ${formatCount(result.approved?.length ?? 0)} SEO row(s) approved and published${
          result.archivedCount
            ? `; ${formatCount(result.archivedCount)} older row(s) archived`
            : ""
        }.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to approve AI SEO drafts",
      );
    } finally {
      setAiSeoWorking((current) => {
        if (current[site.id] !== "approve") return current;
        const next = { ...current };
        delete next[site.id];
        return next;
      });
    }
  }

  async function loadSeoOverview(site: SeoSiteRow) {
    try {
      const overview = (await requestJson(
        `/api/v1/admin/vendero-sites/vendor-sites/${site.id}/seo-export`,
      )) as SeoOverview;
      setSeoOverviews((current) => ({ ...current, [site.id]: overview }));
      setMessage(`${site.label} SEO status loaded.`);
      return overview;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load SEO status");
      return null;
    }
  }

  async function generateSeoExport(site: SeoSiteRow) {
    setMessage("");
    try {
      await requestJson(
        `/api/v1/admin/vendero-sites/vendor-sites/${site.id}/seo-export/generate`,
        {},
        "POST",
      );
      await loadSeoOverview(site);
      setMessage(`${site.label} SEO export generated.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to generate SEO export");
    }
  }

  async function copySeoLink(label: string, value: string) {
    try {
      await copyText(value);
      setMessage(`${label} copied.`);
    } catch {
      setMessage("Copy failed. Select and copy the value manually.");
    }
  }

  async function handleSearchConsoleAction(
    site: SeoSiteRow,
    action: string,
    body: Record<string, unknown> = {},
  ) {
    const actionMap: Record<string, { path: string; label: string }> = {
      property: { path: "search-console/properties", label: "Property created" },
      token: { path: "search-console/verification/request-token", label: "Verification token saved" },
      "publish-token": { path: "search-console/verification/publish", label: "Verification token published" },
      verify: { path: "search-console/verification/check", label: "Ownership verification checked" },
      "queue-sitemap": { path: "search-console/sitemap/request-submit", label: "Sitemap submission queued" },
      "submit-now": { path: "search-console/sitemap/submit-now", label: "Sitemap submit-now requested" },
    };
    const selected = actionMap[action];
    if (!selected) return;

    if (action === "submit-now") {
      const confirmed = await actionModal.confirm({
        title: "Submit sitemap now",
        description:
          "This admin-only action bypasses the normal worker wait and should be used for urgent support.",
        confirmLabel: "Submit now",
      });
      if (!confirmed) return;
    }

    setMessage("");
    try {
      await requestJson(
        `/api/v1/admin/vendero-sites/vendor-sites/${site.id}/${selected.path}`,
        body,
        "POST",
      );
      await loadSeoOverview(site);
      setMessage(`${selected.label} for ${site.label}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Search Console action failed");
    }
  }

  async function loadRuntimeBookings(site?: SeoSiteRow) {
    setMessage("");
    try {
      const result = (await requestJson(
        site
          ? `/api/v1/admin/vendero-sites/vendor-sites/${site.id}/bookings`
          : "/api/v1/admin/vendero-sites/bookings",
      )) as RuntimeBookingOverview;
      setRuntimeBookings(result);
      setMessage(site ? `${site.label} bookings loaded.` : "Runtime bookings loaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load bookings");
    }
  }

  async function loadRecoveryOverview(site: SeoSiteRow) {
    setMessage("");
    try {
      const result = (await requestJson(
        `/api/v1/admin/vendero-sites/vendor-sites/${site.id}/recovery-settings`,
      )) as RuntimeRecoveryOverview;
      setRecoveryOverviews((current) => ({ ...current, [site.id]: result }));
      setMessage(`${site.label} recovery settings loaded.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load recovery settings");
    }
  }

  async function saveRecoveryOverview(site: SeoSiteRow, body: Record<string, unknown>) {
    setMessage("");
    try {
      await requestJson(
        `/api/v1/admin/vendero-sites/vendor-sites/${site.id}/recovery-settings`,
        body,
        "PUT",
      );
      await loadRecoveryOverview(site);
      setMessage(`${site.label} recovery settings saved.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save recovery settings");
    }
  }

  async function loadRuntimeRules(site: SeoSiteRow) {
    setMessage("");
    try {
      const result = (await requestJson(
        `/api/v1/admin/vendero-sites/vendor-sites/${site.id}/runtime-rules`,
      )) as RuntimeRulesOverview;
      setRuntimeRuleOverviews((current) => ({ ...current, [site.id]: result }));
      setMessage(`${site.label} runtime rules loaded.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load runtime rules");
    }
  }

  async function saveRazorpayConfig(site: SeoSiteRow) {
    setMessage("");
    const input = razorpayInputs[site.id] ?? { keyId: "", keySecret: "", testMode: true };
    try {
      await requestJson(
        `/api/v1/admin/vendero-sites/vendor-sites/${site.id}/razorpay-config`,
        input,
        "PUT",
      );
      setRazorpayInputs((current) => ({
        ...current,
        [site.id]: { ...input, keySecret: "" },
      }));
      setMessage(`${site.label} Razorpay config saved.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save Razorpay config");
    }
  }

  async function updateProductionRollout(site: ProductionOpsSite, body: Record<string, unknown>) {
    setMessage("");
    try {
      await requestJson(
        `/api/v1/admin/vendero-sites/vendor-sites/${site.id}/production-rollout`,
        body,
        "PUT",
      );
      await refreshProductionOps();
      setMessage(`${site.label} rollout settings updated.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update rollout settings");
    }
  }

  async function recordProductionIncident(site: ProductionOpsSite) {
    setMessage("");
    try {
      await requestJson(
        `/api/v1/admin/vendero-sites/vendor-sites/${site.id}/production-incidents`,
        {
          type: "operations",
          severity: "warning",
          message: "Admin follow-up requested from Production Ops.",
          runbookKey: "publish",
        },
        "POST",
      );
      await refreshProductionOps();
      setMessage(`${site.label} incident recorded.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to record incident");
    }
  }

  async function actionProductionIncident(
    site: ProductionOpsSite,
    alert: ProductionOpsAlert,
    action: "acknowledge" | "assign" | "retry" | "resolve",
  ) {
    setMessage("");
    try {
      await requestJson(
        `/api/v1/admin/vendero-sites/vendor-sites/${site.id}/production-incidents/${alert.id}/action`,
        { action },
        "POST",
      );
      await refreshProductionOps();
      setMessage(`${formatLabel(action)} requested for ${site.label}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update incident");
    }
  }

  async function rollbackProductionSite(site: ProductionOpsSite) {
    if (!site.rollbackSnapshotId) {
      setMessage("No previous published snapshot is available for rollback.");
      return;
    }
    const confirmed = await actionModal.confirm({
      title: `Rollback ${site.label}`,
      description:
        "Public traffic will use the selected previous published snapshot. Current theme edits are not deleted.",
      confirmLabel: "Rollback",
    });
    if (!confirmed) return;
    setMessage("");
    try {
      await requestJson(
        `/api/v1/admin/vendero-sites/vendor-sites/${site.id}/rollback`,
        { snapshotId: site.rollbackSnapshotId, reason: "phase11_admin_rollback" },
        "POST",
      );
      await refreshProductionOps();
      setMessage(`${site.label} rollback completed.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Rollback failed");
    }
  }

  async function anonymizeProductionData(site: ProductionOpsSite) {
    const confirmed = await actionModal.confirm({
      title: `Anonymize visitor data for ${site.label}`,
      description:
        "This masks visitor identities, partial route text, and stitched customer references for this public site.",
      confirmLabel: "Anonymize",
    });
    if (!confirmed) return;
    setMessage("");
    try {
      await requestJson(
        `/api/v1/admin/vendero-sites/vendor-sites/${site.id}/anonymize-visitor-data`,
        { reason: "admin_privacy_request" },
        "POST",
      );
      await refreshProductionOps();
      setMessage(`${site.label} visitor data anonymized.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Anonymize failed");
    }
  }

  async function applyProductionRetention(site: ProductionOpsSite) {
    const confirmed = await actionModal.confirm({
      title: `Apply retention for ${site.label}`,
      description:
        "Old analytics, route partial text, recovery funnel rows, and quote PDF analytics will be cleaned by the configured windows.",
      confirmLabel: "Apply retention",
    });
    if (!confirmed) return;
    setMessage("");
    try {
      await requestJson(
        `/api/v1/admin/vendero-sites/vendor-sites/${site.id}/apply-data-retention`,
        {},
        "POST",
      );
      await refreshProductionOps();
      setMessage(`${site.label} retention policy applied.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Retention failed");
    }
  }

  return (
    <section className="space-y-5">
      <DashboardTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        counts={counts}
      />

      {message ? (
        <div className="rounded-xl border border-border/70 bg-card/70 px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      ) : null}

      {activeTab === "analytics" ? (
        <AnalyticsDashboard data={data} analytics={analytics} />
      ) : activeTab === "active-sites" ? (
        <ActiveVendorSites analytics={analytics} />
      ) : activeTab === "addon-requests" ? (
        <AddonRequestsDashboard analytics={analytics} />
      ) : activeTab === "payments" ? (
        <PaymentsDashboard analytics={analytics} />
      ) : activeTab === "themes" ? (
        <ThemeCatalog
          themes={sortedThemes}
          onPublish={publishTheme}
          onLifecycle={updateThemeLifecycle}
        />
      ) : activeTab === "components" ? (
        <ComponentsLibrary components={sortedComponents} />
      ) : activeTab === "vendor-site-editor" ? (
        <VendorSiteEditorPanel assignments={data.assignments} />
      ) : activeTab === "business-runtime" ? (
        <BusinessRuntimePanel
          rows={activeSeoRows}
          bookings={runtimeBookings}
          onLoad={loadRuntimeBookings}
        />
      ) : activeTab === "booking-recovery" ? (
        <BookingRecoveryPanel
          rows={activeSeoRows}
          overviews={recoveryOverviews}
          onLoad={loadRecoveryOverview}
          onSave={saveRecoveryOverview}
        />
      ) : activeTab === "runtime-rules" ? (
        <RuntimeRulesPanel
          rows={activeSeoRows}
          overviews={runtimeRuleOverviews}
          razorpayInputs={razorpayInputs}
          onLoad={loadRuntimeRules}
          onRazorpayInput={(siteId, value) =>
            setRazorpayInputs((current) => ({ ...current, [siteId]: value }))
          }
          onSaveRazorpay={saveRazorpayConfig}
        />
      ) : activeTab === "ai-seo" ? (
        <AiSeoGeneratorPanel
          rows={editableAiSeoRows}
          overviews={aiSeoOverviews}
          working={aiSeoWorking}
          onLoad={loadAiSeoOverview}
          onGenerate={generateAiSeoDrafts}
          onApprove={approveAiSeoDrafts}
        />
      ) : activeTab === "seo-auditor" ? (
        <SeoAuditorPanel analytics={analytics} />
      ) : activeTab === "seo-export" ? (
        <SeoExportCenterPanel
          rows={activeSeoRows}
          overviews={seoOverviews}
          onGenerate={generateSeoExport}
          onCopy={copySeoLink}
        />
      ) : activeTab === "search-console" ? (
        <SearchConsolePanel
          rows={activeSeoRows}
          overviews={seoOverviews}
          tokenInputs={searchConsoleTokens}
          onTokenInput={(siteId, value) =>
            setSearchConsoleTokens((current) => ({ ...current, [siteId]: value }))
          }
          onLoad={loadSeoOverview}
          onAction={handleSearchConsoleAction}
          onCopy={copySeoLink}
        />
      ) : activeTab === "production-ops" ? (
        <ProductionOpsPanel
          data={productionOps}
          onRefresh={refreshProductionOps}
          onRollout={updateProductionRollout}
          onIncident={recordProductionIncident}
          onIncidentAction={actionProductionIncident}
          onRollback={rollbackProductionSite}
          onAnonymize={anonymizeProductionData}
          onRetention={applyProductionRetention}
        />
      ) : activeTab === "third-party-libraries" ? (
        <ThirdPartyLibrariesPanel components={sortedComponents} />
      ) : activeTab === "media-assets" ? (
        <MediaAssetsPanel themes={sortedThemes} />
      ) : (
        <ErrorLogsPanel analytics={analytics} />
      )}

      {actionModal.modal}
    </section>
  );
}
