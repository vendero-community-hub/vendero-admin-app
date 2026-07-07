"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Database,
  FileJson,
  Layers3,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useActionModal } from "@/components/ui/action-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  THEME_DATA_SCHEMA_VERSION,
  defaultDataFieldsForThemeDataset,
  normalizeThemeDataKey,
  previewItemsForThemeDataset,
  themeDataDefinitions,
  themeDataDefinitionForKey,
  type ThemeDataField,
  type ThemeDataFieldType,
} from "@/lib/theme-data-registry";

type DemoPack = {
  id: number;
  publicId?: string;
  packKey: string;
  name: string;
  businessType?: string | null;
  primaryCity?: string | null;
  status: string;
  version?: number;
  description?: string | null;
  previewJson?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

type DemoDataset = {
  id: number;
  publicId?: string;
  demoDataPackId: number;
  datasetKey: string;
  label: string;
  datasetType: string;
  schemaJson?: {
    schemaVersion?: string;
    fields?: ThemeDataField[];
  };
  status: string;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
};

type DemoDatasetItem = {
  id: number;
  publicId?: string;
  demoDatasetId: number;
  itemKey: string;
  label?: string | null;
  itemJson?: Record<string, unknown>;
  status: string;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
};

type ResourceResponse<T> = {
  records: T[];
};

const dataFieldTypes: ThemeDataFieldType[] = [
  "text",
  "number",
  "image",
  "url",
  "boolean",
  "json",
];

function getAdminToken() {
  const tokenEntry = document.cookie
    .split("; ")
    .find((part) => part.startsWith("vendero_admin_access_token="));
  return tokenEntry?.split("=")[1] ?? null;
}

function unwrapPayload(payload: any) {
  return payload?.data?.data ?? payload?.data ?? payload;
}

function requestErrorMessage(payload: any, fallback: string) {
  return (
    [
      payload?.message,
      payload?.error?.message,
      payload?.data?.message,
      payload?.data?.error?.message,
      payload?.errors?.[0]?.message,
      payload?.data?.errors?.[0]?.message,
      payload?.error,
      payload?.errorCode,
    ].find((candidate) => typeof candidate === "string" && candidate.trim()) ??
    fallback
  );
}

async function requestJson<T>(
  path: string,
  body?: Record<string, unknown>,
  method = "GET",
) {
  const token = getAdminToken();
  const response = await fetch(path, {
    method,
    headers: {
      "content-type": "application/json",
      authorization: token ? `Bearer ${token}` : "",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(requestErrorMessage(payload, response.statusText || "Request failed"));
  }
  return unwrapPayload(payload) as T;
}

function slugFrom(value: string, fallback: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || fallback
  );
}

function jsonText(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

function parseJson(value: string, fallback: unknown) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeFields(value: unknown): ThemeDataField[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((field) => {
      if (!field || typeof field !== "object" || Array.isArray(field)) return null;
      const record = field as Record<string, unknown>;
      const key = String(record.key ?? record.fieldKey ?? "")
        .trim()
        .replace(/[^a-zA-Z0-9_.-]+/g, "_");
      if (!key) return null;
      const type = dataFieldTypes.includes(record.type as ThemeDataFieldType)
        ? (record.type as ThemeDataFieldType)
        : "text";
      return {
        key,
        label: String(record.label ?? key),
        type,
        required: record.required === true,
        example: String(record.example ?? ""),
      };
    })
    .filter((field): field is ThemeDataField => Boolean(field));
}

function datasetFields(dataset?: DemoDataset | null) {
  return normalizeFields(dataset?.schemaJson?.fields ?? []);
}

function fieldFormValue(field: ThemeDataField, item?: Record<string, unknown>) {
  const value = item?.[field.key];
  if (field.type === "boolean") return value === true;
  if (field.type === "json") return jsonText(value ?? {});
  return value === undefined || value === null ? field.example : String(value);
}

function itemFromValues(fields: ThemeDataField[], values: Record<string, string>) {
  return fields.reduce<Record<string, unknown>>((item, field) => {
    const value = values[field.key];
    if (field.type === "number") item[field.key] = Number(value || 0);
    else if (field.type === "boolean") item[field.key] = value === "true";
    else if (field.type === "json") item[field.key] = parseJson(value, {});
    else item[field.key] = value ?? "";
    return item;
  }, {});
}

function recordLabel(item: DemoDatasetItem) {
  const value = item.itemJson ?? {};
  return (
    item.label ||
    String(value.title ?? value.name ?? value.routeTitle ?? value.cabTitle ?? value.question ?? item.itemKey)
  );
}

export function ThemeDummyDataPanel() {
  const actionModal = useActionModal();
  const [packs, setPacks] = useState<DemoPack[]>([]);
  const [datasets, setDatasets] = useState<DemoDataset[]>([]);
  const [items, setItems] = useState<DemoDatasetItem[]>([]);
  const [selectedPackId, setSelectedPackId] = useState<number | null>(null);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selectedPack = useMemo(
    () => packs.find((pack) => pack.id === selectedPackId) ?? null,
    [packs, selectedPackId],
  );
  const packDatasets = useMemo(
    () =>
      datasets
        .filter((dataset) => dataset.demoDataPackId === selectedPackId)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id),
    [datasets, selectedPackId],
  );
  const selectedDataset = useMemo(
    () => datasets.find((dataset) => dataset.id === selectedDatasetId) ?? null,
    [datasets, selectedDatasetId],
  );
  const selectedFields = useMemo(() => datasetFields(selectedDataset), [selectedDataset]);
  const datasetItems = useMemo(
    () =>
      items
        .filter((item) => item.demoDatasetId === selectedDatasetId)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id),
    [items, selectedDatasetId],
  );

  async function refresh() {
    setLoading(true);
    setMessage(null);
    try {
      const [packsData, datasetsData, itemsData] = await Promise.all([
        requestJson<ResourceResponse<DemoPack>>("/api/v1/admin/vendero-sites/demo-data-packs?limit=200"),
        requestJson<ResourceResponse<DemoDataset>>("/api/v1/admin/vendero-sites/demo-datasets?limit=200"),
        requestJson<ResourceResponse<DemoDatasetItem>>("/api/v1/admin/vendero-sites/demo-dataset-items?limit=200"),
      ]);
      setPacks(packsData.records ?? []);
      setDatasets(datasetsData.records ?? []);
      setItems(itemsData.records ?? []);
      const nextPackId = selectedPackId ?? packsData.records?.[0]?.id ?? null;
      const nextDatasetId =
        selectedDatasetId ??
        datasetsData.records?.find((dataset) => dataset.demoDataPackId === nextPackId)?.id ??
        null;
      setSelectedPackId(nextPackId);
      setSelectedDatasetId(nextDatasetId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load dummy datasets.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedPackId) return;
    if (selectedDataset && selectedDataset.demoDataPackId === selectedPackId) return;
    setSelectedDatasetId(packDatasets[0]?.id ?? null);
  }, [packDatasets, selectedDataset, selectedPackId]);

  async function createOrEditPack(pack?: DemoPack) {
    const result = await actionModal.form({
      title: pack ? "Edit demo data pack" : "Create demo data pack",
      description: "A pack groups all dummy datasets for one theme/business preview.",
      confirmLabel: pack ? "Save pack" : "Create pack",
      fields: [
        { name: "name", label: "Pack name", defaultValue: pack?.name ?? "", placeholder: "Taxi website demo", required: true },
        { name: "packKey", label: "Pack key", defaultValue: pack?.packKey ?? "", placeholder: "taxi-demo", required: true },
        { name: "businessType", label: "Business type", defaultValue: pack?.businessType ?? "taxi_service" },
        { name: "primaryCity", label: "Primary city", defaultValue: pack?.primaryCity ?? "Vadodara" },
        { name: "description", label: "Description", defaultValue: pack?.description ?? "", type: "textarea" },
      ],
    });
    if (!result.confirmed) return;
    setWorking("pack");
    try {
      const body = {
        name: result.values.name.trim(),
        packKey: slugFrom(result.values.packKey || result.values.name, "demo-pack"),
        businessType: result.values.businessType.trim() || null,
        primaryCity: result.values.primaryCity.trim() || null,
        description: result.values.description.trim() || null,
        status: pack?.status ?? "active",
        version: pack?.version ?? 1,
        previewJson: pack?.previewJson ?? {},
        metadata: pack?.metadata ?? {},
      };
      const saved = pack
        ? await requestJson<DemoPack>(`/api/v1/admin/vendero-sites/demo-data-packs/${pack.id}`, body, "PUT")
        : await requestJson<DemoPack>("/api/v1/admin/vendero-sites/demo-data-packs", body, "POST");
      setSelectedPackId(saved.id);
      setMessage(pack ? "Demo data pack updated." : "Demo data pack created.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save demo data pack.");
    } finally {
      setWorking(null);
    }
  }

  async function deletePack(pack: DemoPack) {
    const confirmed = await actionModal.confirm({
      title: "Delete demo data pack?",
      description: `This removes "${pack.name}" and its datasets/items.`,
      confirmLabel: "Delete pack",
      variant: "danger",
    });
    if (!confirmed) return;
    setWorking("pack");
    try {
      await requestJson(`/api/v1/admin/vendero-sites/demo-data-packs/${pack.id}`, undefined, "DELETE");
      setSelectedPackId(null);
      setSelectedDatasetId(null);
      setMessage("Demo data pack deleted.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete demo data pack.");
    } finally {
      setWorking(null);
    }
  }

  async function createOrEditDataset(dataset?: DemoDataset) {
    if (!selectedPackId && !dataset) {
      await createOrEditPack();
      return;
    }
    const result = await actionModal.form({
      title: dataset ? "Edit dataset" : "Create dataset",
      description: "Dataset key is what components use, for example cabs, routes, reviews, faqs.",
      confirmLabel: dataset ? "Save dataset" : "Create dataset",
      fields: [
        { name: "label", label: "Dataset label", defaultValue: dataset?.label ?? "", placeholder: "Cabs", required: true },
        { name: "datasetKey", label: "Dataset key", defaultValue: dataset?.datasetKey ?? "", placeholder: "cabs", required: true },
        { name: "datasetType", label: "Dataset type", defaultValue: dataset?.datasetType ?? "json", required: true },
        {
          name: "description",
          label: "Description",
          defaultValue: String(dataset?.metadata?.description ?? ""),
          type: "textarea",
        },
      ],
    });
    if (!result.confirmed) return;
    setWorking("dataset");
    try {
      const normalizedKey = normalizeThemeDataKey(result.values.datasetKey);
      const fields = datasetFields(dataset);
      const schemaFields = fields.length ? fields : defaultDataFieldsForThemeDataset(normalizedKey);
      const body = {
        demoDataPackId: dataset?.demoDataPackId ?? selectedPackId,
        datasetKey: normalizedKey,
        label: result.values.label.trim(),
        datasetType: result.values.datasetType.trim() || "json",
        schemaJson: {
          schemaVersion: THEME_DATA_SCHEMA_VERSION,
          fields: schemaFields,
        },
        status: dataset?.status ?? "active",
        sortOrder: dataset?.sortOrder ?? packDatasets.length,
        metadata: {
          ...(dataset?.metadata ?? {}),
          description: result.values.description.trim(),
        },
      };
      const saved = dataset
        ? await requestJson<DemoDataset>(`/api/v1/admin/vendero-sites/demo-datasets/${dataset.id}`, body, "PUT")
        : await requestJson<DemoDataset>("/api/v1/admin/vendero-sites/demo-datasets", body, "POST");
      setSelectedDatasetId(saved.id);
      setMessage(dataset ? "Dataset updated." : "Dataset created.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save dataset.");
    } finally {
      setWorking(null);
    }
  }

  async function deleteDataset(dataset: DemoDataset) {
    const confirmed = await actionModal.confirm({
      title: "Delete dataset?",
      description: `This removes "${dataset.label}" and all rows inside it.`,
      confirmLabel: "Delete dataset",
      variant: "danger",
    });
    if (!confirmed) return;
    setWorking("dataset");
    try {
      await requestJson(`/api/v1/admin/vendero-sites/demo-datasets/${dataset.id}`, undefined, "DELETE");
      setSelectedDatasetId(null);
      setMessage("Dataset deleted.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete dataset.");
    } finally {
      setWorking(null);
    }
  }

  async function saveDatasetFields(dataset: DemoDataset, fields: ThemeDataField[]) {
    const saved = await requestJson<DemoDataset>(
      `/api/v1/admin/vendero-sites/demo-datasets/${dataset.id}`,
      {
        ...dataset,
        schemaJson: {
          ...(dataset.schemaJson ?? {}),
          schemaVersion: THEME_DATA_SCHEMA_VERSION,
          fields,
        },
      },
      "PUT",
    );
    setDatasets((current) => current.map((item) => (item.id === saved.id ? saved : item)));
    setMessage("Dataset fields saved.");
  }

  async function addOrEditField(fieldKey?: string) {
    if (!selectedDataset) return;
    const fields = selectedFields;
    const existing = fields.find((field) => field.key === fieldKey);
    const result = await actionModal.form({
      title: existing ? "Edit field" : "Add field",
      description: "Fields decide which inputs appear when adding dummy rows.",
      confirmLabel: existing ? "Save field" : "Add field",
      fields: [
        { name: "key", label: "Field key", defaultValue: existing?.key ?? "", placeholder: "title", required: true },
        { name: "label", label: "Label", defaultValue: existing?.label ?? "", placeholder: "Title", required: true },
        { name: "type", label: "Type", defaultValue: existing?.type ?? "text", placeholder: "text, number, image, url, boolean, json", required: true },
        { name: "required", label: "Required field", type: "checkbox", defaultValue: existing?.required ?? false },
        { name: "example", label: "Example", defaultValue: existing?.example ?? "" },
      ],
    });
    if (!result.confirmed) return;
    const nextField: ThemeDataField = {
      key: result.values.key.trim().replace(/[^a-zA-Z0-9_.-]+/g, "_"),
      label: result.values.label.trim(),
      type: dataFieldTypes.includes(result.values.type as ThemeDataFieldType)
        ? (result.values.type as ThemeDataFieldType)
        : "text",
      required: result.values.required === "true",
      example: result.values.example ?? "",
    };
    const nextFields = existing
      ? fields.map((field) => (field.key === existing.key ? nextField : field))
      : [...fields.filter((field) => field.key !== nextField.key), nextField];
    setWorking("fields");
    try {
      await saveDatasetFields(selectedDataset, nextFields);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save field.");
    } finally {
      setWorking(null);
    }
  }

  async function deleteField(fieldKey: string) {
    if (!selectedDataset) return;
    setWorking("fields");
    try {
      await saveDatasetFields(
        selectedDataset,
        selectedFields.filter((field) => field.key !== fieldKey),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete field.");
    } finally {
      setWorking(null);
    }
  }

  async function addOrEditItem(item?: DemoDatasetItem) {
    if (!selectedDataset) return;
    if (!selectedFields.length) {
      await addOrEditField();
      return;
    }
    const result = await actionModal.form({
      title: item ? "Edit dummy row" : "Add dummy row",
      description: "This row will be used by theme preview/dev rendering.",
      confirmLabel: item ? "Save row" : "Add row",
      fields: [
        {
          name: "label",
          label: "Row label",
          defaultValue: item?.label ?? recordLabel(item ?? ({ itemKey: "" } as DemoDatasetItem)),
          required: true,
        },
        {
          name: "itemKey",
          label: "Row key",
          defaultValue: item?.itemKey ?? "",
          placeholder: "auto-generated when empty",
        },
        ...selectedFields.map((field) => ({
          name: field.key,
          label: field.label,
          defaultValue: fieldFormValue(field, item?.itemJson),
          placeholder: field.example,
          required: field.required,
          type:
            field.type === "boolean"
              ? ("checkbox" as const)
              : field.type === "json"
                ? ("textarea" as const)
                : field.type === "image"
                  ? ("image" as const)
                : ("text" as const),
          imageScope: selectedDataset.datasetKey === "cabs" ? "cab" : "general",
          storagePrefix: "uploads/",
        })),
      ],
    });
    if (!result.confirmed) return;
    setWorking("items");
    try {
      const label = result.values.label.trim();
      const body = {
        demoDatasetId: item?.demoDatasetId ?? selectedDataset.id,
        itemKey: slugFrom(result.values.itemKey || label || `item-${Date.now()}`, "item"),
        label,
        itemJson: itemFromValues(selectedFields, result.values),
        mediaAssetIds: [],
        status: item?.status ?? "active",
        sortOrder: item?.sortOrder ?? datasetItems.length,
        metadata: item?.metadata ?? {},
      };
      const saved = item
        ? await requestJson<DemoDatasetItem>(`/api/v1/admin/vendero-sites/demo-dataset-items/${item.id}`, body, "PUT")
        : await requestJson<DemoDatasetItem>("/api/v1/admin/vendero-sites/demo-dataset-items", body, "POST");
      setItems((current) =>
        item
          ? current.map((row) => (row.id === saved.id ? saved : row))
          : [saved, ...current],
      );
      setMessage(item ? "Dummy row updated." : "Dummy row added.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save dummy row.");
    } finally {
      setWorking(null);
    }
  }

  async function deleteItem(item: DemoDatasetItem) {
    const confirmed = await actionModal.confirm({
      title: "Delete dummy row?",
      description: `Delete "${recordLabel(item)}"?`,
      confirmLabel: "Delete row",
      variant: "danger",
    });
    if (!confirmed) return;
    setWorking("items");
    try {
      await requestJson(`/api/v1/admin/vendero-sites/demo-dataset-items/${item.id}`, undefined, "DELETE");
      setItems((current) => current.filter((row) => row.id !== item.id));
      setMessage("Dummy row deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete dummy row.");
    } finally {
      setWorking(null);
    }
  }

  async function seedPresetDataset(datasetKey: string) {
    if (!selectedPackId) {
      await createOrEditPack();
      return;
    }
    const normalizedKey = normalizeThemeDataKey(datasetKey);
    const definition = themeDataDefinitionForKey(normalizedKey);
    setWorking(`preset:${normalizedKey}`);
    try {
      const existingDataset = packDatasets.find((dataset) => dataset.datasetKey === normalizedKey);
      const datasetBody = {
        demoDataPackId: selectedPackId,
        datasetKey: normalizedKey,
        label: definition?.label ?? normalizedKey,
        datasetType: "json",
        schemaJson: {
          schemaVersion: THEME_DATA_SCHEMA_VERSION,
          fields: defaultDataFieldsForThemeDataset(normalizedKey),
        },
        status: "active",
        sortOrder: existingDataset?.sortOrder ?? packDatasets.length,
        metadata: {
          description: definition?.description ?? "",
          seededFromPreset: true,
        },
      };
      const savedDataset = existingDataset
        ? await requestJson<DemoDataset>(`/api/v1/admin/vendero-sites/demo-datasets/${existingDataset.id}`, datasetBody, "PUT")
        : await requestJson<DemoDataset>("/api/v1/admin/vendero-sites/demo-datasets", datasetBody, "POST");

      const existingItems = items.filter((item) => item.demoDatasetId === savedDataset.id);
      const existingItemKeys = new Set(existingItems.map((item) => item.itemKey));
      await Promise.all(
        previewItemsForThemeDataset(normalizedKey).map((item, index) => {
          const rowKey = slugFrom(String(item.publicId ?? `${normalizedKey}-${index + 1}`), `${normalizedKey}-${index + 1}`);
          if (existingItemKeys.has(rowKey)) return null;
          return requestJson<DemoDatasetItem>("/api/v1/admin/vendero-sites/demo-dataset-items", {
            demoDatasetId: savedDataset.id,
            itemKey: rowKey,
            label: String(item.title ?? item.name ?? item.routeTitle ?? item.cabTitle ?? item.question ?? `${definition?.label ?? normalizedKey} ${index + 1}`),
            itemJson: item,
            mediaAssetIds: [],
            status: "active",
            sortOrder: index,
            metadata: { seededFromPreset: true },
          }, "POST");
        }),
      );
      setSelectedDatasetId(savedDataset.id);
      setMessage(`${definition?.label ?? normalizedKey} dataset seeded.`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to seed preset dataset.");
    } finally {
      setWorking(null);
    }
  }

  async function copyText(value: string, label: string) {
    await navigator.clipboard?.writeText(value).catch(() => null);
    setMessage(`${label} copied.`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button asChild variant="outline" size="sm">
            <Link href="/site-themes">
              <ArrowLeft className="h-4 w-4" />
              Theme cards
            </Link>
          </Button>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Theme dummy data creator</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Create reusable demo packs, datasets, fields, and preview rows for theme development.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button type="button" onClick={() => void createOrEditPack()}>
            <Plus className="h-4 w-4" />
            Create pack
          </Button>
        </div>
      </div>

      {message ? (
        <div className="rounded-lg border border-border bg-card/70 px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-5">
        {[
          ["1", "Create/select pack", "One pack per preview business."],
          ["2", "Add dataset", "Example: cabs, routes, reviews."],
          ["3", "Define fields", "Fields become item form inputs."],
          ["4", "Add rows", "Rows become preview data."],
          ["5", "Use key", "Use dataset key in component settings."],
        ].map(([step, title, body]) => (
          <div key={step} className="rounded-lg border border-border/70 bg-card/60 p-3">
            <Badge variant="outline">{step}</Badge>
            <p className="mt-2 text-sm font-semibold">{title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers3 className="h-5 w-5" />
              Demo packs
            </CardTitle>
            <CardDescription>Select or create a global dummy data pack.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <p className="text-sm text-muted-foreground">Loading packs...</p> : null}
            {packs.map((pack) => (
              <button
                key={pack.id}
                type="button"
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                  selectedPackId === pack.id
                    ? "border-primary bg-primary/10"
                    : "border-border/70 bg-background/40 hover:bg-background/70"
                }`}
                onClick={() => {
                  setSelectedPackId(pack.id);
                  setSelectedDatasetId(datasets.find((dataset) => dataset.demoDataPackId === pack.id)?.id ?? null);
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{pack.name}</span>
                  <Badge variant={pack.status === "active" ? "success" : "secondary"}>
                    {pack.status}
                  </Badge>
                </div>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{pack.packKey}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {datasets.filter((dataset) => dataset.demoDataPackId === pack.id).length} datasets
                </p>
              </button>
            ))}
            {!packs.length && !loading ? (
              <p className="rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                No demo packs yet. Create one to start the flow.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="border-border/70 bg-card/80">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Selected pack</CardTitle>
                <CardDescription>
                  {selectedPack ? selectedPack.description || selectedPack.packKey : "No pack selected."}
                </CardDescription>
              </div>
              {selectedPack ? (
                <div className="flex flex-wrap justify-end gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => void createOrEditPack(selectedPack)}>
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => void deletePack(selectedPack)}>
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              ) : null}
            </CardHeader>
            {selectedPack ? (
              <CardContent className="grid gap-3 md:grid-cols-3">
                <InfoTile label="Pack key" value={selectedPack.packKey} onCopy={() => void copyText(selectedPack.packKey, "Pack key")} />
                <InfoTile label="Business" value={selectedPack.businessType || "Not set"} />
                <InfoTile label="City" value={selectedPack.primaryCity || "Not set"} />
              </CardContent>
            ) : null}
          </Card>

          <Card className="border-border/70 bg-card/80">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Datasets
                </CardTitle>
                <CardDescription>Create datasets manually or seed from built-in presets.</CardDescription>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => void createOrEditDataset()}
                disabled={!selectedPack || working === "dataset"}
              >
                <Plus className="h-4 w-4" />
                Add dataset
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {themeDataDefinitions.map((definition) => {
                  const exists = packDatasets.some((dataset) => dataset.datasetKey === definition.key);
                  return (
                    <Button
                      key={definition.key}
                      type="button"
                      size="sm"
                      variant={exists ? "secondary" : "outline"}
                      disabled={!selectedPack || working === `preset:${definition.key}`}
                      onClick={() => void seedPresetDataset(definition.key)}
                    >
                      {exists ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      {definition.label}
                    </Button>
                  );
                })}
              </div>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {packDatasets.map((dataset) => (
                  <button
                    key={dataset.id}
                    type="button"
                    className={`rounded-lg border p-3 text-left transition ${
                      selectedDatasetId === dataset.id
                        ? "border-primary bg-primary/10"
                        : "border-border/70 bg-background/40 hover:bg-background/70"
                    }`}
                    onClick={() => setSelectedDatasetId(dataset.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{dataset.label}</span>
                      <Badge variant="outline">
                        {items.filter((item) => item.demoDatasetId === dataset.id).length}
                      </Badge>
                    </div>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{dataset.datasetKey}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {datasetFields(dataset).length} fields / {items.filter((item) => item.demoDatasetId === dataset.id).length} rows
                    </p>
                  </button>
                ))}
              </div>
              {!packDatasets.length ? (
                <p className="rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                  Add a dataset manually or seed one of the presets above.
                </p>
              ) : null}
            </CardContent>
          </Card>

          {selectedDataset ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <Card className="border-border/70 bg-card/80">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle>Dataset fields</CardTitle>
                    <CardDescription>
                      Fields generate the Add row form. Dataset key:{" "}
                      <button
                        type="button"
                        className="font-mono text-primary"
                        onClick={() => void copyText(selectedDataset.datasetKey, "Dataset key")}
                      >
                        {selectedDataset.datasetKey}
                      </button>
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => void createOrEditDataset(selectedDataset)}>
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => void deleteDataset(selectedDataset)}>
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                    <Button type="button" size="sm" onClick={() => void addOrEditField()}>
                      <Plus className="h-3.5 w-3.5" />
                      Add field
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {selectedFields.map((field) => (
                    <div key={field.key} className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/40 px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{field.label}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {field.key} / {field.type}
                          {field.required ? " / required" : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button type="button" size="icon" variant="ghost" onClick={() => void addOrEditField(field.key)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" onClick={() => void deleteField(field.key)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {!selectedFields.length ? (
                    <p className="rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                      Add fields first, then create rows.
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-card/80">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle>Dummy rows</CardTitle>
                    <CardDescription>Rows saved in this dataset for theme preview/dev.</CardDescription>
                  </div>
                  <Button type="button" size="sm" onClick={() => void addOrEditItem()} disabled={!selectedFields.length}>
                    <Plus className="h-3.5 w-3.5" />
                    Add row
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {datasetItems.map((item) => (
                    <div key={item.id} className="rounded-lg border border-border/70 bg-background/40 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{recordLabel(item)}</p>
                          <p className="font-mono text-xs text-muted-foreground">{item.itemKey}</p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button type="button" size="icon" variant="ghost" onClick={() => void addOrEditItem(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button type="button" size="icon" variant="ghost" onClick={() => void deleteItem(item)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <pre className="mt-3 max-h-32 overflow-auto rounded-md bg-muted/40 p-2 text-xs">
                        {jsonText(item.itemJson)}
                      </pre>
                    </div>
                  ))}
                  {!datasetItems.length ? (
                    <p className="rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                      No rows yet. Add a row or seed a preset dataset.
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          ) : null}

          <Card className="border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileJson className="h-5 w-5" />
                How to use in theme builder
              </CardTitle>
              <CardDescription>The global page creates reusable data. Component settings still choose the dataset key.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <InfoTile label="Pack" value={selectedPack?.packKey ?? "Create/select pack"} />
              <InfoTile label="Dataset key" value={selectedDataset?.datasetKey ?? "Select dataset"} onCopy={selectedDataset ? () => void copyText(selectedDataset.datasetKey, "Dataset key") : undefined} />
              <InfoTile label="Builder step" value="Select component -> Data and dummy dataset -> use same key" />
            </CardContent>
          </Card>
        </div>
      </div>

      {actionModal.modal}
    </div>
  );
}

function InfoTile({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/40 p-3">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-semibold">{value}</p>
        {onCopy ? (
          <Button type="button" size="icon" variant="ghost" onClick={onCopy}>
            <Copy className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
