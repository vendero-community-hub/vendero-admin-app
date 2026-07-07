import { API_URL, ENV_HEADERS } from "@/lib/environment";
import { cookies } from "next/headers";
import { SiteThemesPanel, type SiteThemesData } from "./site-themes-panel";

async function getSiteThemesData() {
  const cookieStore = await cookies();
  const token = cookieStore.get("vendero_admin_access_token")?.value;
  if (!token) return null;

  const response = await fetch(`${API_URL}/api/v1/admin/site-themes`, {
    cache: "no-store",
    headers: { ...ENV_HEADERS, authorization: `Bearer ${token}` },
  });

  if (!response.ok) return null;
  const payload = await response.json();
  return (payload.data?.data ?? payload.data) as SiteThemesData;
}

export default async function SiteThemesPage() {
  const data = await getSiteThemesData();

  return (
    <main>
      <SiteThemesPanel initialData={data} />
    </main>
  );
}
