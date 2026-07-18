import Link from "next/link";
import {
  Activity,
  BarChart3,
  BellRing,
  Building2,
  CreditCard,
  Car,
  ClipboardList,
  Database,
  LayoutDashboard,
  Link2,
  Megaphone,
  MessageSquareWarning,
  MessagesSquare,
  Settings2,
  Palette,
  FileText,
  Fingerprint,
  Gift,
  HardDrive,
  LifeBuoy,
  PlayCircle,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  SquareTerminal,
  Users,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const VENDERO_LOGO_URL =
  "https://pub-62b8d9a00e0749d5a58a987a7c20cebc.r2.dev/app/assets/logo-white.svg";

type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  muted?: boolean;
};

type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

export const adminNavGroups: AdminNavGroup[] = [
  {
    label: "Operations",
    items: [
      { href: "/", label: "Overview", icon: LayoutDashboard },
      { href: "/vendors", label: "Vendors", icon: Building2 },
      { href: "/staff", label: "Staff", icon: Users },
      { href: "/verifications", label: "Verifications", icon: ShieldCheck },
      { href: "/secure-id", label: "Vendero Secure ID", icon: Fingerprint },
      { href: "/subscriptions", label: "Subscriptions", icon: CreditCard },
      { href: "/referral-program", label: "Reward Program", icon: Gift },
      { href: "/payment-gateway", label: "Payment Gateway", icon: CreditCard },
      { href: "/trips", label: "Trips", icon: Waypoints },
      { href: "/fleet", label: "Cabs & Fare", icon: Car },
      {
        href: "/chat-moderation",
        label: "Chat Moderation",
        icon: MessageSquareWarning,
      },
      {
        href: "/fraud-alerts",
        label: "Fraud Alerts",
        icon: ShieldAlert,
      },
      {
        href: "/support",
        label: "Support",
        icon: LifeBuoy,
      },
      {
        href: "/marketplace-moderation",
        label: "Marketplace",
        icon: ShoppingBag,
      },
      {
        href: "/store-services",
        label: "Store Services",
        icon: ShoppingBag,
      },
      {
        href: "/site-themes",
        label: "Vendero Sites",
        icon: Palette,
      },
      {
        href: "/site-growth",
        label: "Growth Features",
        icon: Sparkles,
      },
      { href: "/contact-data", label: "Contact Data", icon: Database },
      { href: "/whatsapp", label: "WhatsApp", icon: MessagesSquare },
      {
        href: "/whatsapp-pilot-settings",
        label: "WhatsPilot Settings",
        icon: Settings2,
      },
      { href: "/server", label: "Server Resource", icon: Activity },
      { href: "/storage", label: "Storage", icon: HardDrive },
      { href: "/links", label: "White Label", icon: Link2 },
      { href: "/landing", label: "Landing Requests", icon: ClipboardList },
      { href: "/features", label: "New Features", icon: Sparkles },
      {
        href: "/feature-analytics",
        label: "Feature Analytics",
        icon: BarChart3,
      },
      { href: "/tutorials", label: "Tutorials", icon: PlayCircle },
      { href: "/banners", label: "Banner Ads", icon: Megaphone },
      { href: "/legal", label: "Legal Content", icon: FileText },
    ],
  },
  {
    label: "Control",
    items: [
      { href: "/audit-logs", label: "Audit Trail", icon: ShieldCheck },
      { href: "/worker-queues", label: "Queue Watch", icon: SquareTerminal },
      { href: "#", label: "Alerts", icon: BellRing, muted: true },
    ],
  },
];

export const adminPermissionByHref: Record<string, string> = {
  "/": "overview",
  "/vendors": "vendors",
  "/staff": "staff",
  "/verifications": "verifications",
  "/secure-id": "verifications",
  "/subscriptions": "subscriptions",
  "/referral-program": "referral_program",
  "/payment-gateway": "subscriptions",
  "/trips": "trips",
  "/fleet": "fleet",
  "/chat-moderation": "chat_moderation",
  "/fraud-alerts": "fraud_alerts",
  "/marketplace-moderation": "marketplace_moderation",
  "/store-services": "store_services",
  "/site-themes": "site_themes",
  "/site-growth": "site_themes",
  "/contact-data": "contact_intelligence",
  "/whatsapp": "whatsapp_admin",
  "/whatsapp-pilot-settings": "whatsapp_admin",
  "/server": "server",
  "/storage": "storage",
  "/links": "links",
  "/landing": "landing",
  "/features": "features",
  "/feature-analytics": "features",
  "/tutorials": "tutorials",
  "/banners": "banners",
  "/legal": "legal_policies",
  "/worker-queues": "worker_queues",
  "/audit-logs": "audit_logs",
};

export const allAdminPermissions = Object.values(adminPermissionByHref);

function canShowNavItem(item: AdminNavItem, grantedPermissions: string[]) {
  if (item.muted) return true;

  const permission = adminPermissionByHref[item.href];
  return !permission || grantedPermissions.includes(permission);
}

export function AdminNavLinks({
  grantedPermissions,
  onNavigate,
  collapsed = false,
}: {
  grantedPermissions: string[];
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  return (
    <div className={cn("space-y-6", collapsed && "space-y-3")}>
      {adminNavGroups.map((group) => (
        <div key={group.label}>
          {collapsed ? (
            <div className="mx-auto mb-2 h-px w-8 bg-border/80" />
          ) : (
            <p className="mb-2 px-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {group.label}
            </p>
          )}
          <div className="space-y-1.5">
            {group.items
              .filter((item) => canShowNavItem(item, grantedPermissions))
              .map((item) => {
                const Icon = item.icon;
                const content = (
                  <span
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex min-h-10 items-center gap-3 rounded-lg border border-transparent px-3 text-sm transition-colors",
                      collapsed && "justify-center px-2",
                      item.muted
                        ? "cursor-default text-muted-foreground/55"
                        : "text-foreground hover:border-border hover:bg-accent/50",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {collapsed ? null : item.label}
                  </span>
                );

                return item.muted ? (
                  <div key={item.label}>{content}</div>
                ) : (
                  <Link key={item.label} href={item.href} onClick={onNavigate}>
                    {content}
                  </Link>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
