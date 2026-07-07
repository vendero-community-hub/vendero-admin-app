"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { AdminLogoutButton } from "@/components/admin-session-actions";
import { AdminNavLinks, VENDERO_LOGO_URL } from "@/components/admin-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function AdminMobileMenu({
  grantedPermissions,
  hasAdminToken,
}: {
  grantedPermissions: string[];
  hasAdminToken: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0 lg:hidden"
        aria-label="Open admin menu"
        aria-controls="admin-mobile-menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-mobile-menu-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-background/75 backdrop-blur-sm"
            aria-label="Close admin menu"
            onClick={() => setIsOpen(false)}
          />

          <aside
            id="admin-mobile-menu"
            className="relative flex h-full w-[min(88vw,22rem)] flex-col border-r border-border/80 bg-sidebar px-4 py-5 shadow-2xl"
          >
            <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/80 px-3 py-3">
              <img
                src={VENDERO_LOGO_URL}
                alt="Vendero"
                className="h-8 w-auto shrink-0"
              />
              <span id="admin-mobile-menu-title" className="sr-only">
                Admin menu
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                aria-label="Close admin menu"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <AdminNavLinks
                grantedPermissions={grantedPermissions}
                onNavigate={() => setIsOpen(false)}
              />
            </div>

            <div className="mt-5 space-y-3 rounded-xl border border-border/70 bg-card/70 p-4">
              <Badge
                variant={hasAdminToken ? "success" : "warning"}
                className="w-full justify-center gap-2 rounded-full px-3 py-1"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                {hasAdminToken ? "Admin authenticated" : "Sign in required"}
              </Badge>
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="block"
              >
                <Badge
                  variant="outline"
                  className="w-full justify-center rounded-full px-3 py-1 text-muted-foreground"
                >
                  {hasAdminToken ? "Manage session" : "Open login"}
                </Badge>
              </Link>
              {hasAdminToken ? (
                <AdminLogoutButton className="w-full justify-center" />
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
