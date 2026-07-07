"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { SiteComponentPreview } from "./site-component-preview";
import {
  formatLabel,
  requestJson,
  type SiteThemeComponent,
  type SiteThemesData,
} from "./site-themes-panel";

type ComponentEditorForm = {
  componentKey: string;
  name: string;
  componentType: string;
  rendererKey: string;
  title: string;
  subtitle: string;
  actionLabel: string;
  imageUrl: string;
  figmaFileKey: string;
  figmaNodeId: string;
  htmlCode: string;
  cssCode: string;
  jsCode: string;
  status: "draft" | "live" | "hidden";
  isActive: boolean;
  sortOrder: string;
  schemaFields: string;
  prebuiltVariable: string;
  datasetKey: string;
  datasetFieldMapping: string;
  repeatKey: string;
  itemAlias: string;
  thirdPartyLibraries: string;
  previewMode: "standard" | "slider" | "gallery" | "map";
  demoDataPack: string;
  demoOverrideJson: string;
};

const componentTypes = [
  "header",
  "booking-search",
  "fleet",
  "routes",
  "reviews",
  "seo",
  "footer",
  "content",
];

const prebuiltVariables = [
  "data.title",
  "data.subtitle",
  "data.items",
  "data.cabs",
  "data.routes",
  "data.reviews",
  "data.contact",
  "data.fareQuote",
];

const datasetOptions = [
  "manual",
  "cabs",
  "routes",
  "reviews",
  "inquiry_form",
  "contact_form",
  "business_profile",
];

function jsonText(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

function parseJsonText(value: string, fallback: unknown) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function parseLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function schemaFieldsTextFrom(settingsSchema: Record<string, unknown>) {
  const fields = Array.isArray(settingsSchema.schemaFields)
    ? settingsSchema.schemaFields
    : [];
  if (fields.length) {
    return fields
      .map((field) => {
        if (!field || typeof field !== "object") return "";
        const record = field as Record<string, unknown>;
        return [
          record.fieldKey ?? record.key ?? "field",
          record.dataType ?? record.type ?? "text",
          record.required ? "required" : "optional",
        ].join(":");
      })
      .filter(Boolean)
      .join("\n");
  }
  const editableProps = Array.isArray(settingsSchema.editableProps)
    ? settingsSchema.editableProps
    : [];
  return editableProps.map((field) => `${String(field)}:text:optional`).join("\n");
}

function parseSchemaFields(value: string) {
  return parseLines(value).map((line) => {
    const [fieldKey = "field", dataType = "text", required = "optional"] =
      line.split(":").map((item) => item.trim());
    return {
      fieldKey: slugFromName(fieldKey).replace(/-/g, "_") || "field",
      label: formatLabel(fieldKey || "field"),
      dataType: dataType || "text",
      required: required === "required",
      sourceType: "manual",
    };
  });
}

function componentMetadata(component?: SiteThemeComponent | null) {
  return component?.metadata ?? {};
}

function slugFromName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function textFrom(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function formFromComponent(
  component?: SiteThemeComponent | null,
): ComponentEditorForm {
  const props = component?.defaultProps ?? {};
  const settingsSchema = component?.settingsSchema ?? {};
  const metadata = componentMetadata(component);
  const datasetBinding =
    settingsSchema.datasetBinding && typeof settingsSchema.datasetBinding === "object"
      ? (settingsSchema.datasetBinding as Record<string, unknown>)
      : {};
  const repeatConfig =
    settingsSchema.repeatConfig && typeof settingsSchema.repeatConfig === "object"
      ? (settingsSchema.repeatConfig as Record<string, unknown>)
      : {};
  return {
    componentKey: component?.componentKey ?? "",
    name: component?.name ?? "",
    componentType: component?.componentType ?? "content",
    rendererKey: component?.rendererKey ?? "",
    title: textFrom(props.title, component?.name ?? ""),
    subtitle: textFrom(props.subtitle, textFrom(props.description)),
    actionLabel: textFrom(
      props.actionLabel,
      textFrom(props.buttonLabel, "Book now"),
    ),
    imageUrl: textFrom(props.imageUrl, textFrom(props.bannerImageUrl)),
    figmaFileKey: component?.figmaFileKey ?? "",
    figmaNodeId: component?.figmaNodeId ?? "",
    htmlCode: component?.htmlCode ?? "",
    cssCode: component?.cssCode ?? "",
    jsCode: component?.jsCode ?? "",
    status: component?.status ?? "live",
    isActive: component?.isActive ?? true,
    sortOrder: String(component?.sortOrder ?? 0),
    schemaFields:
      schemaFieldsTextFrom(settingsSchema) ||
      "title:text:required\nsubtitle:text:optional\nimageUrl:image:optional",
    prebuiltVariable: textFrom(metadata.prebuiltVariable, "data.title"),
    datasetKey: textFrom(datasetBinding.datasetKey, "manual"),
    datasetFieldMapping: jsonText(datasetBinding.fieldMapping ?? {}),
    repeatKey: textFrom(repeatConfig.repeatKey, ""),
    itemAlias: textFrom(repeatConfig.itemAlias, "item"),
    thirdPartyLibraries: Array.isArray(metadata.libraries)
      ? metadata.libraries.map(String).join("\n")
      : "",
    previewMode:
      metadata.previewMode === "slider" ||
      metadata.previewMode === "gallery" ||
      metadata.previewMode === "map"
        ? metadata.previewMode
        : "standard",
    demoDataPack: textFrom(metadata.demoDataPack, ""),
    demoOverrideJson: jsonText(metadata.demoOverrides ?? {}),
  };
}

function previewComponentFromForm(
  form: ComponentEditorForm,
  existing?: SiteThemeComponent | null,
): SiteThemeComponent {
  return {
    id: existing?.id ?? 0,
    publicId: existing?.publicId ?? "preview",
    componentKey: form.componentKey || slugFromName(form.name) || "component",
    name: form.name || form.title || "Component",
    componentType: form.componentType,
    rendererKey: form.rendererKey || form.componentType,
    figmaFileKey: form.figmaFileKey || null,
    figmaNodeId: form.figmaNodeId || null,
    htmlCode: form.htmlCode,
    cssCode: form.cssCode,
    jsCode: form.jsCode,
    settingsSchema: existing?.settingsSchema ?? {},
    defaultProps: {
      title: form.title || form.name,
      subtitle: form.subtitle,
      actionLabel: form.actionLabel,
      imageUrl: form.imageUrl,
    },
    assetSchema: existing?.assetSchema ?? {},
    status: form.status,
    isActive: form.isActive,
    sortOrder: Number(form.sortOrder || 0),
    metadata: existing?.metadata ?? {},
  };
}

function buildPayload(form: ComponentEditorForm) {
  const componentKey = form.componentKey.trim() || slugFromName(form.name);
  const schemaFields = parseSchemaFields(form.schemaFields);
  const datasetFieldMapping = parseJsonText(form.datasetFieldMapping, {});
  const demoOverrides = parseJsonText(form.demoOverrideJson, {});
  const libraries = parseLines(form.thirdPartyLibraries);
  return {
    componentKey,
    name: form.name.trim(),
    componentType: form.componentType,
    rendererKey: form.rendererKey.trim() || componentKey,
    figmaFileKey: form.figmaFileKey.trim() || null,
    figmaNodeId: form.figmaNodeId.trim() || null,
    htmlCode: form.htmlCode,
    cssCode: form.cssCode,
    jsCode: form.jsCode,
    settingsSchema: {
      editableProps: schemaFields.map((field) => field.fieldKey),
      schemaFields,
      prebuiltVariableBindings: form.prebuiltVariable
        ? [
            {
              variableKey: form.prebuiltVariable,
              sourcePath: form.prebuiltVariable,
            },
          ]
        : [],
      datasetBinding: {
        datasetKey: form.datasetKey,
        datasetType: form.datasetKey === "manual" ? "manual" : "prebuilt",
        fieldMapping: datasetFieldMapping,
      },
      repeatConfig: {
        repeatKey: form.repeatKey.trim(),
        itemAlias: form.itemAlias.trim() || "item",
        autoDetectArray: true,
      },
      generatedBy: "component-editor",
    },
    defaultProps: {
      title: form.title.trim() || form.name.trim(),
      subtitle: form.subtitle.trim(),
      actionLabel: form.actionLabel.trim(),
      imageUrl: form.imageUrl.trim(),
    },
    assetSchema: {
      imageUrl: { type: "image", label: "Section image" },
      ...Object.fromEntries(
        schemaFields
          .filter((field) => field.dataType === "image")
          .map((field) => [
            field.fieldKey,
            { type: "image", label: field.label },
          ]),
      ),
    },
    status: form.status,
    isActive: form.isActive,
    sortOrder: Number(form.sortOrder || 0),
    metadata: {
      generatedBy: "component-editor",
      prebuiltVariable: form.prebuiltVariable,
      libraries,
      previewMode: form.previewMode,
      demoDataPack: form.demoDataPack.trim(),
      demoOverrides,
    },
  };
}

function CodeEditorTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </span>
      <textarea
        className="min-h-56 w-full rounded-md border border-border bg-slate-950 px-3 py-2 font-mono text-xs leading-relaxed text-slate-100 outline-none focus:ring-2 focus:ring-primary/30"
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function ComponentEditorPanel({
  initialData,
  component = null,
}: {
  initialData: SiteThemesData;
  component?: SiteThemeComponent | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState(() => formFromComponent(component));
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const previewComponent = previewComponentFromForm(form, component);
  const isEditing = Boolean(component);
  const schemaFields = useMemo(
    () => parseSchemaFields(form.schemaFields),
    [form.schemaFields],
  );
  const codeWarnings = useMemo(() => {
    const warnings: string[] = [];
    const code = `${form.htmlCode}\n${form.cssCode}\n${form.jsCode}`.toLowerCase();
    if (code.includes("<script")) warnings.push("Inline <script> tags should move into JS code.");
    if (code.includes("document.cookie")) warnings.push("document.cookie access needs review.");
    if (code.includes("eval(")) warnings.push("eval() is blocked for public renderer safety.");
    if (code.includes("http://")) warnings.push("Use HTTPS URLs for scripts, images, and styles.");
    return warnings;
  }, [form.cssCode, form.htmlCode, form.jsCode]);

  function setField<K extends keyof ComponentEditorForm>(
    key: K,
    value: ComponentEditorForm[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveComponent() {
    setWorking(true);
    setMessage("");
    try {
      const payload = buildPayload(form);
      const saved = (await requestJson(
        component
          ? `/api/v1/admin/site-theme-components/${component.id}`
          : "/api/v1/admin/site-theme-components",
        payload,
        component ? "PUT" : "POST",
      )) as SiteThemeComponent;
      setMessage(component ? "Component updated." : "Component created.");
      router.push(`/site-themes/components/${saved.componentKey}/editor`);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save component",
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {isEditing ? "Edit component" : "Create component"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Edit renderer props, HTML, CSS, and JS for this site component.
          </p>
        </div>
        <Badge variant="outline" className="rounded-full">
          {(initialData?.components.length ?? 0) + (component ? 0 : 1)}{" "}
          components
        </Badge>
      </div>

      {message ? (
        <div className="rounded-lg border border-border/70 bg-card/60 px-3 py-2 text-sm text-muted-foreground">
          {message}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Component Details</CardTitle>
            <CardDescription>
              These fields generate the structured renderer props used by the
              visual builder.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Component name"
                value={form.name}
                onChange={(event) => {
                  const name = event.target.value;
                  setForm((current) => ({
                    ...current,
                    name,
                    title: current.title || name,
                    componentKey: current.componentKey || slugFromName(name),
                  }));
                }}
              />
              <Input
                placeholder="Component key"
                value={form.componentKey}
                onChange={(event) =>
                  setField("componentKey", slugFromName(event.target.value))
                }
              />
              <select
                className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                value={form.componentType}
                onChange={(event) =>
                  setField("componentType", event.target.value)
                }
              >
                {componentTypes.map((type) => (
                  <option key={type} value={type}>
                    {formatLabel(type)}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Renderer key"
                value={form.rendererKey}
                onChange={(event) =>
                  setField("rendererKey", event.target.value)
                }
              />
            </div>
            <Input
              placeholder="Preview title"
              value={form.title}
              onChange={(event) => setField("title", event.target.value)}
            />
            <textarea
              className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Preview subtitle / description"
              value={form.subtitle}
              onChange={(event) => setField("subtitle", event.target.value)}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Action label"
                value={form.actionLabel}
                onChange={(event) =>
                  setField("actionLabel", event.target.value)
                }
              />
              <Input
                placeholder="Image URL"
                value={form.imageUrl}
                onChange={(event) => setField("imageUrl", event.target.value)}
              />
              <Input
                placeholder="Figma file key"
                value={form.figmaFileKey}
                onChange={(event) =>
                  setField("figmaFileKey", event.target.value)
                }
              />
              <Input
                placeholder="Figma node ID"
                value={form.figmaNodeId}
                onChange={(event) =>
                  setField("figmaNodeId", event.target.value)
                }
              />
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <select
                className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                value={form.status}
                onChange={(event) =>
                  setField(
                    "status",
                    event.target.value as ComponentEditorForm["status"],
                  )
                }
              >
                {["draft", "live", "hidden"].map((status) => (
                  <option key={status} value={status}>
                    {formatLabel(status)}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Sort order"
                value={form.sortOrder}
                onChange={(event) => setField("sortOrder", event.target.value)}
              />
              <label className="flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setField("isActive", event.target.checked)
                  }
                />
                Active
              </label>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={saveComponent}
                disabled={
                  working ||
                  !form.name.trim() ||
                  !(form.componentKey || form.name).trim()
                }
              >
                {working
                  ? "Saving..."
                  : isEditing
                    ? "Update component"
                    : "Create component"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Live Component Preview</CardTitle>
            <CardDescription>
              This is the same renderer used inside the theme editor preview.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border border-border bg-background">
              <SiteComponentPreview
                componentKey={previewComponent.componentKey}
                component={previewComponent}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80 xl:col-span-2">
          <CardHeader>
            <CardTitle>Component HTML, CSS & JS</CardTitle>
            <CardDescription>
              Code saved here renders in the component preview and theme page
              builder.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {codeWarnings.length ? (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                {codeWarnings.join(" ")}
              </div>
            ) : null}
            <div className="grid gap-3 xl:grid-cols-3">
              <CodeEditorTextarea
                label="HTML"
                value={form.htmlCode}
                onChange={(value) => setField("htmlCode", value)}
              />
              <CodeEditorTextarea
                label="CSS"
                value={form.cssCode}
                onChange={(value) => setField("cssCode", value)}
              />
              <CodeEditorTextarea
                label="JS"
                value={form.jsCode}
                onChange={(value) => setField("jsCode", value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80 xl:col-span-2">
          <CardHeader>
            <CardTitle>Schema, Data, Loops & Libraries</CardTitle>
            <CardDescription>
              Configure required data, prebuilt datasets, repeaters, preview
              mode, and third-party dependencies.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  Component schema fields
                </span>
                <textarea
                  className="min-h-40 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs"
                  placeholder="title:text:required"
                  value={form.schemaFields}
                  onChange={(event) =>
                    setField("schemaFields", event.target.value)
                  }
                />
              </label>
              <div className="rounded-xl border border-border/70 bg-background/35 p-3">
                <p className="text-sm font-semibold">Generated Data Form</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {schemaFields.map((field) => (
                    <label key={field.fieldKey} className="space-y-1 text-sm">
                      <span className="text-xs text-muted-foreground">
                        {field.label}
                        {field.required ? " *" : ""}
                      </span>
                      <Input
                        type={field.dataType === "image" ? "url" : "text"}
                        placeholder={`data.${field.fieldKey}`}
                        disabled
                      />
                    </label>
                  ))}
                  {!schemaFields.length ? (
                    <p className="rounded-lg border border-dashed border-border/80 p-4 text-center text-sm text-muted-foreground md:col-span-2">
                      Add schema fields to preview the generated form.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Prebuilt variable</span>
                <select
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  value={form.prebuiltVariable}
                  onChange={(event) =>
                    setField("prebuiltVariable", event.target.value)
                  }
                >
                  {prebuiltVariables.map((variable) => (
                    <option key={variable} value={variable}>
                      {variable}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Dataset</span>
                <select
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  value={form.datasetKey}
                  onChange={(event) =>
                    setField("datasetKey", event.target.value)
                  }
                >
                  {datasetOptions.map((dataset) => (
                    <option key={dataset} value={dataset}>
                      {formatLabel(dataset)}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                placeholder="Repeat key, e.g. items"
                value={form.repeatKey}
                onChange={(event) => setField("repeatKey", event.target.value)}
              />
              <Input
                placeholder="Item alias"
                value={form.itemAlias}
                onChange={(event) => setField("itemAlias", event.target.value)}
              />
            </div>

            <div className="grid gap-3 xl:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  Dataset field mapping
                </span>
                <textarea
                  className="min-h-32 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs"
                  value={form.datasetFieldMapping}
                  onChange={(event) =>
                    setField("datasetFieldMapping", event.target.value)
                  }
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  Component demo data override
                </span>
                <textarea
                  className="min-h-32 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs"
                  value={form.demoOverrideJson}
                  onChange={(event) =>
                    setField("demoOverrideJson", event.target.value)
                  }
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Preview mode</span>
                <select
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  value={form.previewMode}
                  onChange={(event) =>
                    setField(
                      "previewMode",
                      event.target.value as ComponentEditorForm["previewMode"],
                    )
                  }
                >
                  {["standard", "slider", "gallery", "map"].map((mode) => (
                    <option key={mode} value={mode}>
                      {formatLabel(mode)}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                placeholder="Demo data pack key"
                value={form.demoDataPack}
                onChange={(event) =>
                  setField("demoDataPack", event.target.value)
                }
              />
              <label className="space-y-2 text-sm">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  Third-party libraries
                </span>
                <textarea
                  className="min-h-10 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs"
                  placeholder="swiper@latest"
                  value={form.thirdPartyLibraries}
                  onChange={(event) =>
                    setField("thirdPartyLibraries", event.target.value)
                  }
                />
              </label>
            </div>

            {form.previewMode !== "standard" ? (
              <div className="rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-sm text-sky-200">
                {formatLabel(form.previewMode)} preview mode is enabled. Add
                the matching approved library dependency before publishing.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
