"use client";

import { useState } from "react";
import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { AdminMobileMenu } from "@/components/admin-mobile-menu";
import { AdminNavLinks, VENDERO_LOGO_URL } from "@/components/admin-nav";
import { AdminLogoutButton } from "@/components/admin-session-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AdminShellFrame({
  children,
  grantedPermissions,
  hasAdminToken,
}: {
  children: React.ReactNode;
  grantedPermissions: string[];
  hasAdminToken: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className={cn(
          "grid min-h-screen transition-[grid-template-columns]",
          collapsed
            ? "lg:grid-cols-[88px_minmax(0,1fr)]"
            : "lg:grid-cols-[280px_minmax(0,1fr)]",
        )}
      >
        <aside
          className={cn(
            "hidden border-r border-border/80 bg-sidebar/90 py-5 backdrop-blur lg:flex lg:flex-col",
            collapsed ? "px-3" : "px-4",
          )}
        >
          <div
            className={cn(
              "mb-6 flex items-center rounded-xl border border-border/60 bg-card/80 px-3 py-3",
              collapsed ? "justify-center" : "justify-between gap-3",
            )}
          >
            <img
              src={VENDERO_LOGO_URL}
              alt="Vendero"
              className="h-8 w-auto shrink-0"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8 shrink-0", collapsed && "hidden")}
              aria-label="Collapse sidebar"
              onClick={() => setCollapsed(true)}
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>

          {collapsed ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="mb-4 h-10 w-full"
              aria-label="Expand sidebar"
              onClick={() => setCollapsed(false)}
            >
              <ToggleIcon className="h-4 w-4" />
            </Button>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <AdminNavLinks
              grantedPermissions={grantedPermissions}
              collapsed={collapsed}
            />
          </div>

          {collapsed ? null : (
            <div className="mt-5 rounded-xl border border-border/70 bg-card/70 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Admin Scope
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Platform ops, moderation, telemetry, and trust controls.
              </p>
            </div>
          )}
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-border/80 bg-background/85 px-4 py-3 backdrop-blur sm:px-5 sm:py-4">
            <div className="flex min-w-0 items-center gap-3">
              <AdminMobileMenu
                grantedPermissions={grantedPermissions}
                hasAdminToken={hasAdminToken}
              />
            </div>

            <div className="hidden items-center gap-2 lg:flex">
              <Badge
                variant={hasAdminToken ? "success" : "warning"}
                className="gap-2 rounded-full px-3 py-1"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                {hasAdminToken ? "Admin authenticated" : "Sign in required"}
              </Badge>
              <Link href="/login">
                <Badge
                  variant="outline"
                  className="rounded-full px-3 py-1 text-muted-foreground"
                >
                  {hasAdminToken ? "Manage session" : "Open login"}
                </Badge>
              </Link>
              {hasAdminToken ? <AdminLogoutButton /> : null}
            </div>
          </header>

          <div className="p-5 lg:p-7">{children}</div>
        </div>
      </div>
    </div>
  );
}
