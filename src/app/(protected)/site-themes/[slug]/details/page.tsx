import { Button } from "@/components/ui/button";
import { API_URL, ENV_HEADERS } from "@/lib/environment";
import { ArrowLeft } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ThemeDetailsPanel } from "../../theme-details-panel";
import type { SiteThemesData } from "../../site-themes-panel";

type PageProps = {
  params: Promise<{ slug: string }>;
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

async function resolveParams(params: Promise<{ slug: string }>) {
  return params;
}

export default async function SiteThemeDetailsPage({ params }: PageProps) {
  const { slug } = await resolveParams(params);
  const themeSlug = decodeURIComponent(slug);
  const data = await getSiteThemesData();
  const theme = data?.themes.find((item) => item.slug === themeSlug);

  if (!data) {
    return (
      <main className="space-y-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/site-themes">
            <ArrowLeft className="h-4 w-4" />
            Theme cards
          </Link>
        </Button>
        <p className="rounded-xl border border-dashed border-border/80 p-8 text-sm text-muted-foreground">
          Theme details are unavailable.
        </p>
      </main>
    );
  }

  if (!theme) notFound();

  return (
    <main className="space-y-4">
      <Button asChild variant="outline" size="sm">
        <Link href="/site-themes">
          <ArrowLeft className="h-4 w-4" />
          Theme cards
        </Link>
      </Button>
      <ThemeDetailsPanel initialData={data} theme={theme} />
    </main>
  );
}
