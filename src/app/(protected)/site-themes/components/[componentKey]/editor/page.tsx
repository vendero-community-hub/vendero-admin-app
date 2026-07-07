import { Button } from "@/components/ui/button";
import { API_URL, ENV_HEADERS } from "@/lib/environment";
import { ArrowLeft } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ComponentEditorPanel } from "../../../component-editor-panel";
import type { SiteThemesData } from "../../../site-themes-panel";

type PageProps = {
  params: Promise<{ componentKey: string }>;
};

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

async function resolveParams(params: Promise<{ componentKey: string }>) {
  return params;
}

export default async function SiteThemeComponentEditorPage({
  params,
}: PageProps) {
  const { componentKey } = await resolveParams(params);
  const decodedComponentKey = decodeURIComponent(componentKey);
  const data = await getSiteThemesData();
  const component = data?.components.find(
    (item) => item.componentKey === decodedComponentKey,
  );

  if (!data) {
    return (
      <main className="space-y-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/site-themes">
            <ArrowLeft className="h-4 w-4" />
            Components
          </Link>
        </Button>
        <p className="rounded-xl border border-dashed border-border/80 p-8 text-sm text-muted-foreground">
          Component editor data is unavailable.
        </p>
      </main>
    );
  }

  if (!component) notFound();

  return (
    <main className="space-y-4">
      <Button asChild variant="outline" size="sm">
        <Link href="/site-themes">
          <ArrowLeft className="h-4 w-4" />
          Components
        </Link>
      </Button>
      <ComponentEditorPanel initialData={data} component={component} />
    </main>
  );
}
