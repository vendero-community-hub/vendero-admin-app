import { cookies } from "next/headers";
import { API_URL, ENV_HEADERS } from "@/lib/environment";
import {
  ContactDataPanel,
  type ContactIntelligenceData,
} from "./contact-data-panel";

async function getContactData() {
  const cookieStore = await cookies();
  const token = cookieStore.get("vendero_admin_access_token")?.value;
  if (!token) return null;

  const response = await fetch(
    `${API_URL}/api/v1/admin/contact-intelligence?limit=50`,
    {
      cache: "no-store",
      headers: { ...ENV_HEADERS, authorization: `Bearer ${token}` },
    },
  );

  if (!response.ok) return null;
  const payload = await response.json();
  return (payload.data?.data ?? payload.data) as ContactIntelligenceData;
}

export default async function ContactDataPage() {
  const data = await getContactData();

  return (
    <main>
      <ContactDataPanel initialData={data} />
    </main>
  );
}
