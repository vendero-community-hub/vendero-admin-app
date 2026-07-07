import { API_URL, ENV_HEADERS } from "@/lib/environment";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  VendorAccountPanel,
  type VendorAccountDetail,
} from "./vendor-account-panel";

async function getVendorDetail(id: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("vendero_admin_access_token")?.value;
  if (!token) return null;

  const response = await fetch(`${API_URL}/api/v1/admin/vendors/${id}`, {
    cache: "no-store",
    headers: {
      ...ENV_HEADERS,
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) return null;
  const payload = await response.json();
  return (payload.data?.data ?? payload.data) as VendorAccountDetail;
}

async function resolveParams(params: Promise<{ id: string }>) {
  return params;
}

export default async function VendorAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await resolveParams(params);
  const detail = await getVendorDetail(resolvedParams.id);

  if (!detail) {
    return (
      <main className="space-y-4">
        <Button asChild variant="outline">
          <Link href="/vendors">
            <ArrowLeft className="h-4 w-4" />
            Back to vendors
          </Link>
        </Button>
        <Card className="border-border/70 bg-card/80">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Vendor account data is unavailable or this vendor does not exist.
          </CardContent>
        </Card>
      </main>
    );
  }

  return <VendorAccountPanel initialDetail={detail} />;
}
