import { API_URL, ENV_HEADERS } from "@/lib/environment";
import { cookies } from "next/headers";
import { allAdminPermissions } from "@/components/admin-nav";
import { AdminShellFrame } from "@/components/admin-shell-frame";

export async function AdminShell({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("vendero_admin_access_token")?.value;
  const hasAdminToken = Boolean(token);

  let user: {
    role?: string;
    isSuperStaff?: boolean;
    adminPagePermissions?: string[];
  } | null = null;
  if (token) {
    try {
      const response = await fetch(`${API_URL}/api/v1/admin/me`, {
        cache: "no-store",
        headers: {
          ...ENV_HEADERS,
          authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const payload = await response.json();
        user = (payload.data?.data ?? payload.data) as {
          role?: string;
          isSuperStaff?: boolean;
          adminPagePermissions?: string[];
        };
      }
    } catch {}
  }

  const grantedPermissions =
    user?.role === "admin" || user?.isSuperStaff
      ? allAdminPermissions
      : Array.isArray(user?.adminPagePermissions)
        ? user.adminPagePermissions
        : [];

  return (
    <AdminShellFrame
      grantedPermissions={grantedPermissions}
      hasAdminToken={hasAdminToken}
    >
      {children}
    </AdminShellFrame>
  );
}
