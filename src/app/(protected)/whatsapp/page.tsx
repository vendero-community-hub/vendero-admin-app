import { API_URL, ENV_HEADERS } from "@/lib/environment";
import { cookies } from "next/headers";
import {
  WhatsappAdminPanel,
  type WhatsappAdminData,
} from "./whatsapp-admin-panel";

async function getWhatsappData() {
  const cookieStore = await cookies();
  const token = cookieStore.get("vendero_admin_access_token")?.value;
  if (!token) return null;

  const response = await fetch(`${API_URL}/api/v1/admin/whatsapp?limit=50`, {
    cache: "no-store",
    headers: { ...ENV_HEADERS, authorization: `Bearer ${token}` },
  });

  if (!response.ok) return null;
  const payload = await response.json();
  return (payload.data?.data ?? payload.data) as WhatsappAdminData;
}

export default async function WhatsappPage() {
  const data = await getWhatsappData();

  return (
    <main className="-m-5 h-[calc(100dvh-64px)] min-h-0 overflow-hidden sm:h-[calc(100dvh-72px)] lg:-m-7 lg:h-[calc(100dvh-64px)]">
      <WhatsappAdminPanel initialData={data} />
    </main>
  );
}
