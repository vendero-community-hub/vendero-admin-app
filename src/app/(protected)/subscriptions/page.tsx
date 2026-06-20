import { API_URL, ENV_HEADERS } from "@/lib/environment";
import { cookies } from "next/headers";
import Link from "next/link";
import {
  BadgeIndianRupee,
  Layers3,
  Timer,
  UserRoundCheck,
  UserRoundX,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CreatePlanButton,
  SubscriptionQuickActions,
  UpdatePlanButton,
} from "./subscription-actions";

type SubscriptionTab =
  | "plans"
  | "subscribed"
  | "free-trial"
  | "unsubscribed"
  | "revenue";

type Plan = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  billingInterval: string;
  durationDays: number | null;
  priceAmount: string;
  currency: string;
  isActive: boolean;
  isPublic: boolean;
  isDefault: boolean;
  requiresPaymentVerification: boolean;
  featureConfig?: Record<string, unknown>;
  pricingOptions?: Array<{
    id: string;
    label: string;
    periodType: "month" | "day";
    periodValue: number;
    priceAmount: number;
    currency: string;
    isDefault?: boolean;
    displayOrder?: number;
  }>;
  features: Array<{
    id: number;
    featureKey: string;
    isEnabled: boolean;
    limitValue: number | null;
  }>;
};

type Membership = {
  id: number;
  vendorProfileId: number;
  status: string;
  planName: string;
  planCode: string | null;
  paymentStatus: string;
  paymentReference?: string | null;
  expiresAt: string | null;
  featureOverrides?: Record<string, unknown>;
  plan?: {
    name: string;
    code?: string | null;
  } | null;
  vendorProfile: {
    id?: number;
    businessName: string;
    contactPhone?: string | null;
    contactEmail?: string | null;
    createdAt?: string | null;
    user: {
      fullName: string | null;
      phone: string;
      email: string;
    };
  };
};

type UnsubscribedUser = {
  id: number;
  businessName: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  createdAt?: string | null;
  user: {
    fullName: string | null;
    phone: string;
    email: string;
  };
  premiumMembership?: Membership | null;
};

type Payment = {
  id: number;
  publicId?: string | null;
  amount: string | number;
  currency: string;
  status: string;
  providerReference: string | null;
  providerName: string | null;
  paidAt: string | null;
  createdAt?: string | null;
  vendorProfile: {
    businessName: string;
    user: {
      phone: string;
    };
  };
  plan: {
    name: string;
  } | null;
};

type Overview = {
  analytics: {
    totalPlans: number;
    activePlans: number;
    totalVendors?: number;
    activeSubscribers: number;
    totalSubscriptionPlans?: number;
    totalSubscribedUsers?: number;
    totalFreeTrialSubscribers?: number;
    unsubscribedUsers?: number;
    expiredSubscribers: number;
    paymentPendingVerification: number;
    verifiedPayments: number;
    monthlyRevenueBooked: number;
    totalSubscriptionRevenue?: number;
  };
  plans: Plan[];
  memberships: Membership[];
  subscribedUsers?: Membership[];
  freeTrialUsers?: Membership[];
  unsubscribedUsers?: UnsubscribedUser[];
  payments: Payment[];
};

const TAB_LABELS: Record<SubscriptionTab, string> = {
  plans: "Subscription plans",
  subscribed: "Subscribed users",
  "free-trial": "Free trial users",
  unsubscribed: "Unsubscribed users",
  revenue: "Subscription revenue",
};

async function getOverview() {
  const cookieStore = await cookies();
  const token = cookieStore.get("vendero_admin_access_token")?.value;
  if (!token) return null;

  const response = await fetch(
    `${API_URL}/api/v1/admin/subscriptions/overview`,
    {
      cache: "no-store",
      headers: {
        ...ENV_HEADERS,
        authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) return null;
  const payload = await response.json();
  return (payload.data?.data ?? payload.data) as Overview;
}

async function resolveSearchParams(
  searchParams?: Promise<Record<string, string | string[] | undefined>>,
) {
  return searchParams ? await searchParams : {};
}

function requestedTabFrom(value: unknown): SubscriptionTab {
  const tab = Array.isArray(value) ? value[0] : value;
  return [
    "plans",
    "subscribed",
    "free-trial",
    "unsubscribed",
    "revenue",
  ].includes(String(tab))
    ? (String(tab) as SubscriptionTab)
    : "plans";
}

function variantForStatus(
  status: string,
): "success" | "warning" | "danger" | "secondary" {
  if (["active", "verified"].includes(status)) return "success";
  if (["expired", "rejected", "failed", "refunded"].includes(status))
    return "danger";
  if (
    ["pending_verification", "inactive", "initiated", "none"].includes(status)
  )
    return "warning";
  return "secondary";
}

function configNumber(
  config: Record<string, unknown> | undefined,
  key: string,
  fallback = 0,
) {
  const value = Number(config?.[key] ?? fallback);
  return Number.isFinite(value) ? value : fallback;
}

function configString(
  config: Record<string, unknown> | undefined,
  key: string,
  fallback = "",
) {
  const value = config?.[key];
  return typeof value === "string" ? value : fallback;
}

function formatCurrency(
  amount: string | number | null | undefined,
  currency = "INR",
) {
  const value = Number(amount ?? 0);
  return new Intl.NumberFormat("en-IN", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(Number.isFinite(value) ? value : 0);
}

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function planBillingTerms(plan: Plan) {
  const firstPaymentAmount = configNumber(
    plan.featureConfig,
    "firstPaymentAmount",
    0,
  );
  const firstPaymentCycles = configNumber(
    plan.featureConfig,
    "firstPaymentCycles",
    configNumber(plan.featureConfig, "firstPaymentMonths", 0),
  );
  const trialEnabled = plan.featureConfig?.trialEnabled !== false;
  const trialDays = trialEnabled
    ? configNumber(plan.featureConfig, "freeTrialDays", 0)
    : 0;
  const trialPaymentTiming = configString(
    plan.featureConfig,
    "trialPaymentTiming",
    configString(plan.featureConfig, "trialCheckoutMode", "before_trial"),
  );
  const pricingOptions = Array.isArray(plan.pricingOptions)
    ? plan.pricingOptions
    : Array.isArray(plan.featureConfig?.pricingOptions)
      ? (plan.featureConfig?.pricingOptions as Plan["pricingOptions"])
      : [];
  const firstPaymentText =
    firstPaymentAmount > 0 && firstPaymentCycles > 0
      ? `Upfront ${formatCurrency(firstPaymentAmount * firstPaymentCycles, plan.currency)} covers ${firstPaymentCycles} ${
          firstPaymentCycles === 1 ? "cycle" : "cycles"
        }`
      : "No upfront pricing configured";
  const regularText = pricingOptions?.length
    ? pricingOptions
        .slice(0, 3)
        .map(
          (option) =>
            `${option.label}: ${formatCurrency(option.priceAmount, option.currency)}`,
        )
        .join(" • ")
    : `${formatCurrency(plan.priceAmount, plan.currency)} every ${plan.billingInterval}`;
  const trialText =
    trialDays > 0
      ? `${trialDays} day free trial • first payment ${trialPaymentTiming === "after_trial" ? "after trial" : "before trial"}`
      : "Free trial disabled";

  return [firstPaymentText, regularText, trialText];
}

function featureLabel(featureKey: string) {
  return featureKey.replace(/[_-]+/g, " ");
}

function membershipPhone(membership: Membership) {
  return (
    membership.vendorProfile.user?.phone ??
    membership.vendorProfile.contactPhone ??
    "No phone"
  );
}

function unsubscribeReason(user: UnsubscribedUser) {
  const membership = user.premiumMembership;
  if (!membership) return "No plan selected";
  if (membership.status === "expired") return "Subscription expired";
  if (membership.featureOverrides?.registrationCheckoutRequired)
    return "Skipped payment checkout";
  if (membership.paymentStatus && membership.paymentStatus !== "verified") {
    return `Payment ${membership.paymentStatus}`;
  }
  return "No active access";
}

function MetricCard({
  active,
  description,
  href,
  icon: Icon,
  label,
  value,
}: {
  active: boolean;
  description: string;
  href: string;
  icon: LucideIcon;
  label: string;
  value: string | number;
}) {
  return (
    <Link href={href}>
      <Card
        className={`min-h-34 border-border/70 bg-card/80 transition-colors hover:bg-accent/40 ${
          active ? "border-primary/70 ring-2 ring-primary/45" : ""
        }`}
      >
        <CardContent className="flex items-start justify-between gap-3 p-5">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-3 text-3xl font-semibold">{value}</p>
            <p className="mt-3 text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-secondary/60 p-3">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyTab({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/30 p-6 text-sm text-muted-foreground">
      No {label.toLowerCase()} found.
    </div>
  );
}

function AnalyticsMiniStat({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/30 px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function VendorAccessPieChart({
  freeTrial,
  subscribed,
  total,
  unsubscribed,
}: {
  freeTrial: number;
  subscribed: number;
  total: number;
  unsubscribed: number;
}) {
  const segmentTotal = Math.max(subscribed + freeTrial + unsubscribed, 0);
  const safeTotal = Math.max(total, segmentTotal);
  const subscribedPercent = segmentTotal
    ? (subscribed / segmentTotal) * 100
    : 0;
  const freeTrialPercent = segmentTotal ? (freeTrial / segmentTotal) * 100 : 0;
  const chartBackground = segmentTotal
    ? `conic-gradient(#10b981 0 ${subscribedPercent}%, #38bdf8 ${subscribedPercent}% ${
        subscribedPercent + freeTrialPercent
      }%, #f97316 ${subscribedPercent + freeTrialPercent}% 100%)`
    : "conic-gradient(#1f2937 0 100%)";

  return (
    <div className="grid gap-4 md:grid-cols-[140px_1fr]">
      <div className="flex items-center justify-center">
        <div
          className="relative flex h-32 w-32 items-center justify-center rounded-full border border-border/70"
          style={{ background: chartBackground }}
        >
          <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full border border-border/70 bg-card text-center">
            <p className="text-2xl font-semibold">{safeTotal}</p>
            <p className="text-[10px] uppercase text-muted-foreground">
              Vendors
            </p>
          </div>
        </div>
      </div>
      <div className="grid content-center gap-2">
        <AnalyticsMiniStat
          color="#94a3b8"
          label="Total vendors"
          value={safeTotal}
        />
        <AnalyticsMiniStat
          color="#10b981"
          label="Subscribe vendors"
          value={subscribed}
        />
        <AnalyticsMiniStat
          color="#38bdf8"
          label="Free trial access"
          value={freeTrial}
        />
        <AnalyticsMiniStat
          color="#f97316"
          label="Unsubscribe vendors"
          value={unsubscribed}
        />
      </div>
    </div>
  );
}

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [overview, resolvedSearchParams] = await Promise.all([
    getOverview(),
    resolveSearchParams(searchParams),
  ]);
  const activeTab = requestedTabFrom(resolvedSearchParams.tab);
  const analytics = overview?.analytics ?? {
    activeSubscribers: 0,
    activePlans: 0,
    expiredSubscribers: 0,
    monthlyRevenueBooked: 0,
    paymentPendingVerification: 0,
    totalPlans: 0,
    verifiedPayments: 0,
  };
  const plans = overview?.plans ?? [];
  const memberships = overview?.memberships ?? [];
  const subscribedUsers =
    overview?.subscribedUsers ??
    memberships.filter(
      (membership) =>
        membership.status === "active" &&
        membership.paymentStatus === "verified",
    );
  const freeTrialUsers =
    overview?.freeTrialUsers ??
    memberships.filter(
      (membership) =>
        membership.status === "active" &&
        membership.paymentStatus === "none" &&
        (String(membership.paymentReference ?? "").startsWith("trial:") ||
          membership.featureOverrides?.trialActive === true),
    );
  const unsubscribedUsers = overview?.unsubscribedUsers ?? [];
  const revenuePayments = (overview?.payments ?? []).filter(
    (payment) => payment.status === "verified",
  );
  const totalRevenue =
    analytics.totalSubscriptionRevenue ?? analytics.monthlyRevenueBooked;
  const totalSubscribedUsers =
    analytics.totalSubscribedUsers ?? subscribedUsers.length;
  const totalFreeTrialSubscribers =
    analytics.totalFreeTrialSubscribers ?? freeTrialUsers.length;
  const totalUnsubscribedUsers =
    analytics.unsubscribedUsers ?? unsubscribedUsers.length;
  const totalVendors =
    analytics.totalVendors ??
    Math.max(
      totalSubscribedUsers + totalFreeTrialSubscribers + totalUnsubscribedUsers,
      0,
    );

  const metrics = [
    {
      key: "plans" as const,
      label: "Total Subscription Plan",
      value: analytics.totalSubscriptionPlans ?? analytics.totalPlans,
      description: `${analytics.activePlans} active plan${analytics.activePlans === 1 ? "" : "s"}`,
      icon: Layers3,
    },
    {
      key: "subscribed" as const,
      label: "Total Subscribe users",
      value: totalSubscribedUsers,
      description: "Paid active access",
      icon: UserRoundCheck,
    },
    {
      key: "free-trial" as const,
      label: "Total Free Trial subscribe users",
      value: totalFreeTrialSubscribers,
      description: "Trial active access",
      icon: Timer,
    },
    {
      key: "unsubscribed" as const,
      label: "Unsubscribe users",
      value: totalUnsubscribedUsers,
      description: "No active plan or trial",
      icon: UserRoundX,
    },
    {
      key: "revenue" as const,
      label: "Total Subscription revenue",
      value: formatCurrency(totalRevenue),
      description: `${analytics.verifiedPayments} verified payment${analytics.verifiedPayments === 1 ? "" : "s"}`,
      icon: BadgeIndianRupee,
    },
  ];

  return (
    <main className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Subscription Module
            </Badge>
            <CardTitle className="text-3xl">
              Subscription control desk
            </CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7">
              Manage plans, subscribed vendors, free trials, skipped users, and
              verified subscription revenue from one focused workspace.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>All Analytics</CardTitle>
            <CardDescription>Vendor subscription access split.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <VendorAccessPieChart
              freeTrial={totalFreeTrialSubscribers}
              subscribed={totalSubscribedUsers}
              total={totalVendors}
              unsubscribed={totalUnsubscribedUsers}
            />
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
              <Badge variant="default" className="rounded-full px-3 py-1">
                All Analytics
              </Badge>
              <p className="text-xs text-muted-foreground">
                Metric cards switch the table data below.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.key}
            active={activeTab === metric.key}
            description={metric.description}
            href={`/subscriptions?tab=${metric.key}`}
            icon={metric.icon}
            label={metric.label}
            value={metric.value}
          />
        ))}
      </section>

      <section>
        <Card className="border-border/70 bg-card/80">
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardDescription className="uppercase tracking-[0.2em] text-muted-foreground">
                  {activeTab.replace("-", " ")} Tab
                </CardDescription>
                <CardTitle className="mt-2 text-2xl">
                  {TAB_LABELS[activeTab]}
                </CardTitle>
                <CardDescription className="mt-2">
                  {activeTab === "plans"
                    ? "Plan catalog and feature configuration."
                    : activeTab === "subscribed"
                      ? "Vendors with paid active subscription access."
                      : activeTab === "free-trial"
                        ? "Vendors currently using free trial access."
                        : activeTab === "unsubscribed"
                          ? "Vendors without active paid or trial access."
                          : "Verified subscription revenue records."}
                </CardDescription>
              </div>
              <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
                {activeTab === "plans"
                  ? `${plans.length} shown`
                  : activeTab === "subscribed"
                    ? `${subscribedUsers.length} shown`
                    : activeTab === "free-trial"
                      ? `${freeTrialUsers.length} shown`
                      : activeTab === "unsubscribed"
                        ? `${unsubscribedUsers.length} shown`
                        : `${revenuePayments.length} shown`}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {activeTab === "plans" ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-background/30 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold">
                      Subscription plan actions
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Create plans, assign subscription access, or run
                      subscription maintenance.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <CreatePlanButton />
                    <SubscriptionQuickActions plans={plans} />
                  </div>
                </div>
                {plans.length ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {plans.map((plan) => (
                      <div
                        key={plan.id}
                        className="rounded-xl border border-border/70 bg-background/30 p-5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold">{plan.name}</p>
                              <Badge
                                variant={
                                  plan.isActive ? "success" : "secondary"
                                }
                              >
                                {plan.code}
                              </Badge>
                              {plan.isDefault ? (
                                <Badge variant="warning">Default</Badge>
                              ) : null}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {formatCurrency(plan.priceAmount, plan.currency)}{" "}
                              • {plan.billingInterval}
                            </p>
                          </div>
                          <UpdatePlanButton plan={plan} />
                        </div>
                        {plan.description ? (
                          <p className="mt-3 text-sm leading-6 text-muted-foreground">
                            {plan.description}
                          </p>
                        ) : null}
                        <div className="mt-3 grid gap-2 text-xs">
                          {planBillingTerms(plan).map((term) => (
                            <p
                              key={term}
                              className="rounded-lg border border-border/60 bg-background/45 px-3 py-2 text-muted-foreground"
                            >
                              {term}
                            </p>
                          ))}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {plan.features.map((feature) => (
                            <Badge
                              key={feature.id}
                              variant={
                                feature.isEnabled ? "success" : "secondary"
                              }
                              className="rounded-full px-3 py-1"
                            >
                              {featureLabel(feature.featureKey)}
                              {feature.limitValue !== null
                                ? ` • ${feature.limitValue}`
                                : ""}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyTab label="plans" />
                )}
              </div>
            ) : activeTab === "subscribed" ? (
              subscribedUsers.length ? (
                <div className="overflow-hidden rounded-lg border border-border/70">
                  <table className="w-full min-w-[780px] text-left text-sm">
                    <thead className="bg-background/60 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Vendor</th>
                        <th className="px-4 py-3">Plan</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Expires</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscribedUsers.map((membership) => (
                        <tr
                          key={membership.id}
                          className="border-t border-border/60"
                        >
                          <td className="px-4 py-4">
                            <p className="font-medium">
                              {membership.vendorProfile.businessName}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {membershipPhone(membership)}
                            </p>
                          </td>
                          <td className="px-4 py-4">{membership.planName}</td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-2">
                              <Badge
                                variant={variantForStatus(membership.status)}
                              >
                                {membership.status}
                              </Badge>
                              <Badge
                                variant={variantForStatus(
                                  membership.paymentStatus,
                                )}
                              >
                                {membership.paymentStatus}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-muted-foreground">
                            {formatDate(membership.expiresAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyTab label="subscribed users" />
              )
            ) : activeTab === "free-trial" ? (
              freeTrialUsers.length ? (
                <div className="overflow-hidden rounded-lg border border-border/70">
                  <table className="w-full min-w-[780px] text-left text-sm">
                    <thead className="bg-background/60 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Vendor</th>
                        <th className="px-4 py-3">Trial plan</th>
                        <th className="px-4 py-3">Payment status</th>
                        <th className="px-4 py-3">Trial ends</th>
                      </tr>
                    </thead>
                    <tbody>
                      {freeTrialUsers.map((membership) => (
                        <tr
                          key={membership.id}
                          className="border-t border-border/60"
                        >
                          <td className="px-4 py-4">
                            <p className="font-medium">
                              {membership.vendorProfile.businessName}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {membershipPhone(membership)}
                            </p>
                          </td>
                          <td className="px-4 py-4">{membership.planName}</td>
                          <td className="px-4 py-4">
                            <Badge variant="warning">
                              {membership.paymentStatus}
                            </Badge>
                          </td>
                          <td className="px-4 py-4 text-muted-foreground">
                            {formatDate(membership.expiresAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyTab label="free trial users" />
              )
            ) : activeTab === "unsubscribed" ? (
              unsubscribedUsers.length ? (
                <div className="overflow-hidden rounded-lg border border-border/70">
                  <table className="w-full min-w-[820px] text-left text-sm">
                    <thead className="bg-background/60 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Vendor</th>
                        <th className="px-4 py-3">Last plan state</th>
                        <th className="px-4 py-3">Reason</th>
                        <th className="px-4 py-3">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unsubscribedUsers.map((user) => (
                        <tr key={user.id} className="border-t border-border/60">
                          <td className="px-4 py-4">
                            <p className="font-medium">{user.businessName}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {user.user?.phone ??
                                user.contactPhone ??
                                "No phone"}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            {user.premiumMembership ? (
                              <div className="flex flex-wrap gap-2">
                                <Badge
                                  variant={variantForStatus(
                                    user.premiumMembership.status,
                                  )}
                                >
                                  {user.premiumMembership.status}
                                </Badge>
                                <Badge
                                  variant={variantForStatus(
                                    user.premiumMembership.paymentStatus,
                                  )}
                                >
                                  {user.premiumMembership.paymentStatus}
                                </Badge>
                              </div>
                            ) : (
                              <Badge variant="secondary">No membership</Badge>
                            )}
                          </td>
                          <td className="px-4 py-4 text-muted-foreground">
                            {unsubscribeReason(user)}
                          </td>
                          <td className="px-4 py-4 text-muted-foreground">
                            {formatDate(user.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyTab label="unsubscribed users" />
              )
            ) : revenuePayments.length ? (
              <div className="overflow-hidden rounded-lg border border-border/70">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="bg-background/60 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Vendor</th>
                      <th className="px-4 py-3">Plan</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Provider</th>
                      <th className="px-4 py-3">Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenuePayments.map((payment) => (
                      <tr
                        key={payment.id}
                        className="border-t border-border/60"
                      >
                        <td className="px-4 py-4">
                          <p className="font-medium">
                            {payment.vendorProfile.businessName}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {payment.vendorProfile.user.phone}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          {payment.plan?.name ?? "Unmapped plan"}
                        </td>
                        <td className="px-4 py-4 font-semibold">
                          {formatCurrency(payment.amount, payment.currency)}
                        </td>
                        <td className="px-4 py-4 text-muted-foreground">
                          {payment.providerName ?? "manual"} •{" "}
                          {payment.providerReference ?? "No reference"}
                        </td>
                        <td className="px-4 py-4 text-muted-foreground">
                          {formatDate(payment.paidAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyTab label="revenue records" />
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
