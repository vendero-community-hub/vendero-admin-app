import { API_URL, ENV_HEADERS } from "@/lib/environment";
import { cookies } from "next/headers";
import {
  VendorManagementPanel,
  type VendorManagementOverview,
} from "./vendor-management-panel";

async function getOverview() {
  const cookieStore = await cookies();
  const token = cookieStore.get("vendero_admin_access_token")?.value;

  if (!token) {
    return null;
  }

  const response = await fetch(`${API_URL}/api/v1/admin/vendors/overview`, {
    cache: "no-store",
    headers: {
      ...ENV_HEADERS,
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  const overview = payload.data?.data ?? payload.data;

  return {
    generatedAt: overview?.generatedAt ?? new Date().toISOString(),
    summary: overview?.summary ?? {
      total: 0,
      active: 0,
      inactive: 0,
      pendingKyc: 0,
      approvedKyc: 0,
      rejectedKyc: 0,
      activeSubscriptions: 0,
      pendingSubscriptionPayments: 0,
      expiredSubscriptions: 0,
      marketplaceLive: 0,
      marketplaceHidden: 0,
      marketplaceDraft: 0,
    },
    vendors: Array.isArray(overview?.vendors) ? overview.vendors : [],
  } as VendorManagementOverview;
}

export default async function VendorsPage() {
  const overview = await getOverview();

  return <VendorManagementPanel overview={overview} />;
}
