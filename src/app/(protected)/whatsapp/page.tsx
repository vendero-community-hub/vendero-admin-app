import { API_URL, ENV_HEADERS } from "@/lib/environment";
import { cookies } from "next/headers";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  const analytics = data?.analytics ?? {
    sent24h: 0,
    failed24h: 0,
    vendors24h: 0,
    spendMonth: 0,
    currency: "INR",
    activeOptIns: 0,
    optedOut: 0,
    optIns24h: 0,
    approvedTemplates: 0,
    pendingTemplates: 0,
    rejectedTemplates: 0,
    dailyUsage: [],
    byStatus: {},
  };

  return (
    <main className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              WhatsApp Business
            </Badge>
            <CardTitle className="text-3xl">
              Inbox, templates, opt-ins, sends, and spend
            </CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7">
              Manage customer conversations, 24 hour reply sessions, approved
              templates, outbound delivery logs, failed sends, and usage cost
              from one admin console.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Usage Snapshot</CardTitle>
            <CardDescription>
              Current WhatsApp Business posture.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Sent 24h</p>
              <p className="mt-1 text-2xl font-semibold">{analytics.sent24h}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Failed 24h</p>
              <p className="mt-1 text-2xl font-semibold">
                {analytics.failed24h}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Opt-ins</p>
              <p className="mt-1 text-2xl font-semibold">
                {analytics.activeOptIns}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Month spend</p>
              <p className="mt-1 text-2xl font-semibold">
                {analytics.currency} {analytics.spendMonth.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <WhatsappAdminPanel initialData={data} />
    </main>
  );
}
