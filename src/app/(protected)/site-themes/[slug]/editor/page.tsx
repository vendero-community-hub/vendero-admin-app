import { API_URL, ENV_HEADERS } from "@/lib/environment";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ThemeEditorPanel, type SiteThemesData } from "../../site-themes-panel";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<EditorSearchParams>;
};

type EditorSearchParams = {
  page?: string | string[];
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

async function resolveSearchParams(
  searchParams?: Promise<EditorSearchParams>,
): Promise<EditorSearchParams> {
  return searchParams ?? {};
}

function parsePageId(page: string | string[] | undefined) {
  const value = Array.isArray(page) ? page[0] : page;
  if (!value) return null;
  const pageId = Number(value);
  return Number.isFinite(pageId) ? pageId : null;
}

export default async function SiteThemeEditorPage({
  params,
  searchParams,
}: PageProps) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([
    resolveParams(params),
    resolveSearchParams(searchParams),
  ]);
  const themeSlug = decodeURIComponent(slug);
  const data = await getSiteThemesData();
  const theme = data?.themes.find((item) => item.slug === themeSlug);

  if (!data) {
    return (
      <main>
        <p className="rounded-xl border border-dashed border-border/80 p-8 text-sm text-muted-foreground">
          Theme editor data is unavailable.
        </p>
      </main>
    );
  }

  if (!theme) notFound();

  return (
    <ThemeEditorPanel
      initialData={data}
      themeSlug={themeSlug}
      initialPageId={parsePageId(resolvedSearchParams.page)}
    />
  );
}
