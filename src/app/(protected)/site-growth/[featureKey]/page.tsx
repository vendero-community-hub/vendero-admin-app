import { API_URL, ENV_HEADERS } from "@/lib/environment";
import { cookies } from "next/headers";
import { SiteGrowthPanel, type SiteGrowthData } from "../site-growth-panel";

async function getGrowthData() {
  const cookieStore = await cookies();
  const token = cookieStore.get("vendero_admin_access_token")?.value;
  if (!token) return null;

  const response = await fetch(`${API_URL}/api/v1/admin/vendero-sites/growth-features`, {
    cache: "no-store",
    headers: { ...ENV_HEADERS, authorization: `Bearer ${token}` },
  });

  if (!response.ok) return null;
  const payload = await response.json();
  return (payload.data?.data ?? payload.data) as SiteGrowthData;
}

export default async function SiteGrowthDetailPage({
  params,
}: {
  params: Promise<{ featureKey: string }>;
}) {
  const [{ featureKey }, data] = await Promise.all([params, getGrowthData()]);

  return (
    <main>
      <SiteGrowthPanel focusFeatureKey={featureKey} initialData={data} />
    </main>
  );
}
