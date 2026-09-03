import { API_URL, ENV_HEADERS } from "@/lib/environment";
import { cookies } from "next/headers";
import {
  WhatsPilotWebhookSettingsPanel,
  type WhatsPilotWebhookSettings,
} from "./whatsapp-pilot-webhook-settings-panel";
import {
  WhatsPilotAccessPanel,
  type WhatsPilotAccessSettings,
} from "./whatsapp-pilot-access-panel";
import { WhatsPilotLifecyclePanel } from "./whatsapp-pilot-lifecycle-panel";

async function getSettings() {
  const cookieStore = await cookies();
  const token = cookieStore.get("vendero_admin_access_token")?.value;
  if (!token) return null;

  const response = await fetch(
    `${API_URL}/api/v1/admin/whatsapp-pilot/webhook-settings`,
    {
      cache: "no-store",
      headers: { ...ENV_HEADERS, authorization: `Bearer ${token}` },
    },
  );
  if (!response.ok) return null;
  const payload = await response.json();
  return (payload.data?.data ?? payload.data) as WhatsPilotWebhookSettings;
}

async function getAccessSettings() {
  const cookieStore = await cookies();
  const token = cookieStore.get("vendero_admin_access_token")?.value;
  if (!token) return null;

  const response = await fetch(
    `${API_URL}/api/v1/admin/whatsapp-pilot/access-settings`,
    {
      cache: "no-store",
      headers: { ...ENV_HEADERS, authorization: `Bearer ${token}` },
    },
  );
  if (!response.ok) return null;
  const payload = await response.json();
  return (payload.data?.data ?? payload.data) as WhatsPilotAccessSettings;
}

export default async function WhatsPilotSettingsPage() {
  const [accessSettings, webhookSettings] = await Promise.all([
    getAccessSettings(),
    getSettings(),
  ]);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6">
      <WhatsPilotAccessPanel initialSettings={accessSettings} />
      <WhatsPilotLifecyclePanel />
      <WhatsPilotWebhookSettingsPanel initialSettings={webhookSettings} />
    </main>
  );
}
