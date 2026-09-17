"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Braces,
  CheckCircle2,
  FlaskConical,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
} from "lucide-react";
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
import { useActionModal } from "@/components/ui/action-modal";
import {
  newVariableStep,
  normalizeVariableSources,
  STEP_LABELS,
  variableInput,
  variableReferences,
  variableValidation,
  type VariableDefinition,
  type VariableDefinitionInput,
  type VariableSource,
  type VariableSources,
  type VariableStep,
  type VariableValueType,
} from "./template-variable-types";

const API_PATH = "/api/v1/admin/whatsapp-pilot/template-variables";
const selectClass =
  "h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:opacity-50";
const valueTypes: VariableValueType[] = [
  "text",
  "number",
  "currency",
  "date",
  "phone",
  "url",
];

function apiError(payload: Record<string, unknown>) {
  const error =
    payload.error && typeof payload.error === "object"
      ? (payload.error as Record<string, unknown>)
      : payload;
  const details =
    error.details && typeof error.details === "object"
      ? (error.details as Record<string, unknown>)
      : error;
  const issues = details.issues ?? details.errors ?? payload.errors;
  const messages = Array.isArray(issues)
    ? issues
        .map((issue) => (typeof issue === "string" ? issue : issue?.message))
        .filter((message): message is string => typeof message === "string")
    : [];
  return [
    ...new Set([
      typeof error.message === "string"
        ? error.message
        : "Unable to update template variables.",
      ...messages,
    ]),
  ].join(" ");
}

async function request<T>(path = "", init?: RequestInit): Promise<T> {
  const token = document.cookie
    .split("; ")
    .find((part) => part.startsWith("vendero_admin_access_token="))
    ?.split("=")[1];
  const response = await fetch(`${API_PATH}${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(apiError(payload));
  return (payload.data?.data ?? payload.data ?? payload) as T;
}

function SourceFields({
  source,
  sources,
  onChange,
  label = "Source",
  disabled = false,
}: {
  source: VariableSource;
  sources: VariableSources;
  onChange: (source: VariableSource) => void;
  label?: string;
  disabled?: boolean;
}) {
  const [modelQuery, setModelQuery] = useState("");
  const [fieldQuery, setFieldQuery] = useState("");
  const fields =
    sources.models.find((model) => model.model === source.model)?.fields ?? [];
  const matchingModels = sources.models.filter((model) =>
    `${model.model} ${model.label}`.toLowerCase().includes(modelQuery.trim().toLowerCase()),
  );
  const matchingFields = fields.filter((field) =>
    `${field.field} ${field.label}`.toLowerCase().includes(fieldQuery.trim().toLowerCase()),
  );
  const visibleModels = sources.models.filter((model) => model.model === source.model || matchingModels.includes(model));
  const visibleFields = fields.filter((field) => field.field === source.field || matchingFields.includes(field));
  useEffect(() => setFieldQuery(""), [source.model]);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5 text-sm">
        <span>{label} model</span>
        <Input
          type="search"
          aria-label={`Search ${label.toLowerCase()} models`}
          placeholder="Search models"
          value={modelQuery}
          disabled={disabled}
          onChange={(event) => setModelQuery(event.target.value)}
        />
        <select
          aria-label={`${label} model`}
          className={selectClass}
          value={source.model}
          disabled={disabled}
          onChange={(event) => {
            const model = sources.models.find(
              (entry) => entry.model === event.target.value,
            );
            if (model)
              onChange({
                model: model.model,
                field: model.fields[0]?.field ?? "",
              });
          }}
        >
          {!sources.models.some((model) => model.model === source.model) && (
            <option value={source.model}>Choose model</option>
          )}
          {visibleModels.map((model) => (
            <option key={model.model} value={model.model} disabled={!model.fields.length}>
              {model.label}
            </option>
          ))}
        </select>
        {!matchingModels.length && <p className="text-xs text-muted-foreground">No matching models.</p>}
      </div>
      <div className="space-y-1.5 text-sm">
        <span>{label} field</span>
        <Input
          type="search"
          aria-label={`Search ${label.toLowerCase()} fields`}
          placeholder="Search fields"
          value={fieldQuery}
          disabled={disabled}
          onChange={(event) => setFieldQuery(event.target.value)}
        />
        <select
          aria-label={`${label} field`}
          className={selectClass}
          value={source.field}
          disabled={disabled}
          onChange={(event) =>
            onChange({ ...source, field: event.target.value })
          }
        >
          {!fields.some((field) => field.field === source.field) && (
            <option value="">Choose field</option>
          )}
          {visibleFields.map((field) => (
            <option key={field.field} value={field.field}>
              {field.label}
            </option>
          ))}
        </select>
        {!matchingFields.length && <p className="text-xs text-muted-foreground">No matching fields.</p>}
      </div>
    </div>
  );
}

function StepEditor({
  step,
  index,
  sources,
  onChange,
}: {
  step: VariableStep;
  index: number;
  sources: VariableSources;
  onChange: (step: VariableStep) => void;
}) {
  const numericSources = {
    ...sources,
    models: sources.models
      .map((model) => ({
        ...model,
        fields: model.fields.filter(
          (field) =>
            field.valueType === "number" || field.valueType === "currency",
        ),
      }))
      .filter((model) => model.fields.length > 0),
  };
  if ("value" in step)
    return (
      <Input
        aria-label={`Step ${index + 1} text`}
        maxLength={240}
        placeholder="Text to add"
        value={step.value}
        onChange={(event) => onChange({ ...step, value: event.target.value })}
      />
    );
  if ("operand" in step)
    return (
      <div className="space-y-3">
        <select
          aria-label={`Step ${index + 1} operand type`}
          className={selectClass}
          value={step.operand.kind}
          onChange={(event) =>
            onChange({
              ...step,
              operand:
                event.target.value === "field" && numericSources.models.length
                  ? {
                      kind: "field",
                      source: {
                        model: numericSources.models[0].model,
                        field: numericSources.models[0].fields[0].field,
                      },
                    }
                  : { kind: "literal", value: "1" },
            })
          }
        >
          <option value="literal">Fixed number</option>
          <option value="field" disabled={!numericSources.models.length}>
            Another allowed numeric field
          </option>
        </select>
        {step.operand.kind === "literal" ? (
          <Input
            aria-label={`Step ${index + 1} number`}
            inputMode="decimal"
            maxLength={30}
            value={step.operand.value}
            onChange={(event) =>
              onChange({
                ...step,
                operand: { kind: "literal", value: event.target.value },
              })
            }
          />
        ) : (
          <SourceFields
            label={`Step ${index + 1}`}
            source={step.operand.source}
            sources={numericSources}
            onChange={(source) =>
              onChange({ ...step, operand: { kind: "field", source } })
            }
          />
        )}
      </div>
    );
  if (step.op === "round")
    return (
      <Input
        aria-label={`Step ${index + 1} rounding digits`}
        type="number"
        min={0}
        max={8}
        step={1}
        value={step.digits}
        onChange={(event) =>
          onChange({ ...step, digits: Number(event.target.value) })
        }
      />
    );
  if (step.op === "format_currency")
    return (
      <Input
        aria-label={`Step ${index + 1} currency`}
        maxLength={3}
        placeholder="INR"
        value={step.currency}
        onChange={(event) =>
          onChange({ ...step, currency: event.target.value.toUpperCase() })
        }
      />
    );
  if (step.op === "format_date")
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <select
          aria-label={`Step ${index + 1} date format`}
          className={selectClass}
          value={step.format}
          onChange={(event) =>
            onChange({
              ...step,
              format: event.target.value as "date" | "datetime" | "time",
            })
          }
        >
          <option value="date">Date</option>
          <option value="datetime">Date and time</option>
          <option value="time">Time</option>
        </select>
        <Input
          aria-label={`Step ${index + 1} time zone`}
          maxLength={80}
          value={step.timezone}
          onChange={(event) =>
            onChange({ ...step, timezone: event.target.value })
          }
        />
      </div>
    );
  return null;
}

export function WhatsPilotTemplateVariablesPanel() {
  const [variables, setVariables] = useState<VariableDefinition[]>([]);
  const [sources, setSources] = useState<VariableSources | null>(null);
  const [draft, setDraft] = useState<VariableDefinitionInput | null>(null);
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [editorVersion, setEditorVersion] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    value: unknown;
    requiredContext?: string[];
  } | null>(null);
  const [sampleValues, setSampleValues] = useState<Record<string, string>>({});
  const loadVersion = useRef(0);
  const modal = useActionModal();

  async function loadRegistry() {
    const version = ++loadVersion.current;
    setLoading(true);
    setError(null);
    try {
      const [catalog, options] = await Promise.all([
        request<{ variables: VariableDefinition[] }>(),
        request<unknown>("/sources"),
      ]);
      if (version !== loadVersion.current) return;
      if (
        !Array.isArray(catalog.variables)
      )
        throw new Error(
          "The template variable registry returned an invalid response.",
        );
      const normalizedSources = normalizeVariableSources(options);
      setVariables(catalog.variables);
      setSources(normalizedSources);
    } catch (caught) {
      if (version === loadVersion.current)
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to load template variables.",
        );
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }

  useEffect(() => {
    void loadRegistry();
    return () => {
      loadVersion.current += 1;
    };
  }, []);

  const selected = variables.find(
    (variable) => variable.keyword === selectedKeyword,
  );
  const visible = useMemo(
    () =>
      variables.filter((variable) => {
        const text = [
          variable.keyword,
          variable.label,
          variable.useCase,
          variable.status,
          variable.source.model,
          variable.source.field,
          ...variable.requiredContext,
          variable.hasDraft ? "draft" : "",
          ...(variable.usages ?? []).flatMap((usage) => [
            usage.templateId,
            usage.name,
            usage.language,
            usage.vendorProfileId,
          ]),
        ]
          .join(" ")
          .toLowerCase();
        return (
          text.includes(query.trim().toLowerCase()) &&
          (statusFilter === "all" ||
            variable.status === statusFilter ||
            (statusFilter === "draft" && variable.hasDraft))
        );
      }),
    [variables, query, statusFilter],
  );
  const references = draft ? variableReferences(draft) : [];
  const allowedSteps = (sources?.stepTypes ?? [])
    .map((step) => (typeof step === "string" ? step : step.op))
    .filter((op): op is VariableStep["op"] => Object.hasOwn(STEP_LABELS, op));

  function change(next: VariableDefinitionInput) {
    setDraft(variableInput(next));
    setDirty(true);
    setPreview(null);
    setNotice(null);
    setError(null);
  }

  function addStep() {
    if (!draft || !sources || draft.steps.length >= 12) return;
    let type = sources.models
      .find((model) => model.model === draft.source.model)
      ?.fields.find((field) => field.field === draft.source.field)?.valueType;
    if (
      draft.steps.some((step) =>
        ["prefix", "suffix", "trim", "uppercase", "lowercase"].includes(
          step.op,
        ),
      )
    )
      type = "text";
    const preferred =
      type === "number" || type === "currency"
        ? "round"
        : type === "date"
          ? "format_date"
          : "trim";
    const op = allowedSteps.includes(preferred) ? preferred : allowedSteps[0];
    if (!op) return;
    const steps = [...draft.steps];
    const formatterIndex = steps.findIndex(
      (step) => step.op === "format_currency" || step.op === "format_date",
    );
    steps.splice(
      formatterIndex < 0 ? steps.length : formatterIndex,
      0,
      newVariableStep(op),
    );
    change({ ...draft, steps });
  }

  async function openDefinition(variable?: VariableDefinition) {
    if (!sources) return;
    if (
      dirty &&
      !(await modal.confirm({
        title: "Discard unsaved variable changes?",
        description:
          "Your unsaved edits will be discarded. Saved drafts are kept.",
        confirmLabel: "Discard edits",
        variant: "danger",
      }))
    )
      return;
    const model = sources.models.find((entry) => entry.fields.length > 0);
    if (!model) {
      setError("No supported source fields are available.");
      return;
    }
    const next = variable
      ? variableInput(variable.draft ?? variable)
      : ({
          keyword: "",
          label: "",
          useCase: "",
          valueType: model.fields[0].valueType,
          sample: "",
          requiredContext: [model.model],
          source: { model: model.model, field: model.fields[0].field },
          steps: [],
        } satisfies VariableDefinitionInput);
    setDraft(next);
    setSelectedKeyword(variable?.keyword ?? null);
    setEditorVersion(variable?.draftVersion ?? null);
    setDirty(!variable);
    setSampleValues({});
    setPreview(null);
    setError(null);
    setNotice(null);
  }

  function exampleValue(source: VariableSource) {
    return String(
      sources?.models
        .find((model) => model.model === source.model)
        ?.fields.find((field) => field.field === source.field)?.sample ?? "",
    );
  }

  async function testSample() {
    if (!draft || !sources) return;
    const invalid = variableValidation(draft, sources);
    if (invalid) {
      setError(invalid);
      return;
    }
    setWorking("preview");
    setError(null);
    setPreview(null);
    setNotice(null);
    try {
      const samples = Object.fromEntries(
        references.map((source) => {
          const key = `${source.model}.${source.field}`;
          return [key, sampleValues[key] ?? exampleValue(source)];
        }),
      );
      const result = await request<{
        value: unknown;
        requiredContext?: string[];
      }>("/preview", {
        method: "POST",
        body: JSON.stringify({
          ...variableInput(draft),
          sampleValues: samples,
        }),
      });
      setPreview(result);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Sample validation failed.",
      );
    } finally {
      setWorking(null);
    }
  }

  async function saveDraft() {
    if (!draft || !sources) return;
    const invalid = variableValidation(draft, sources);
    if (invalid) {
      setError(invalid);
      return;
    }
    setWorking("save");
    setError(null);
    setNotice(null);
    try {
      const saved = await request<VariableDefinition>("", {
        method: "POST",
        body: JSON.stringify({
          ...variableInput(draft),
          draftVersion: editorVersion ?? 0,
        }),
      });
      if (!Number.isSafeInteger(saved.draftVersion))
        throw new Error(
          "The saved draft response has no valid version. Refresh and reopen the variable before continuing.",
        );
      setEditorVersion(saved.draftVersion);
      setDraft(variableInput(saved.draft ?? saved));
      setSelectedKeyword(draft.keyword);
      setDirty(false);
      setNotice(
        "Draft saved. Publish it when you are ready to make it available to vendors.",
      );
      await loadRegistry();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to save draft.",
      );
    } finally {
      setWorking(null);
    }
  }

  async function transition(action: "publish" | "disable") {
    if (!selected || dirty) return;
    const publish = action === "publish";
    const confirmed = await modal.confirm({
      title: publish
        ? `Publish ${selected.label}?`
        : `Disable ${selected.label}?`,
      description: publish
        ? "This saved draft will become the active definition available to vendor templates."
        : "This variable will no longer be available for new template use. Existing uses may require attention.",
      confirmLabel: publish ? "Publish variable" : "Disable variable",
      variant: publish ? "default" : "danger",
    });
    if (!confirmed) return;
    setWorking(action);
    setError(null);
    setNotice(null);
    try {
      const updated = await request<VariableDefinition>(
        `/${encodeURIComponent(selected.keyword)}/${action}`,
        {
          method: "POST",
          body: JSON.stringify(publish ? { draftVersion: editorVersion } : {}),
        },
      );
      if (!Number.isSafeInteger(updated.draftVersion))
        throw new Error(
          "The updated variable response has no valid version. Refresh and reopen the variable before continuing.",
        );
      setEditorVersion(updated.draftVersion);
      setDraft(variableInput(updated.draft ?? updated));
      setPreview(null);
      setNotice(publish ? "Variable published." : "Variable disabled.");
      await loadRegistry();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : `Unable to ${action} variable.`,
      );
    } finally {
      setWorking(null);
    }
  }

  return (
    <Card id="template-variables">
      <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <CardTitle className="flex items-center gap-2">
            <Braces className="h-5 w-5 text-primary" />
            Template Variables
          </CardTitle>
          <CardDescription>
            Manage reusable Whatsapilot keywords, trusted data sources, and safe
            formatting rules.
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={loading || Boolean(working)}
            onClick={() => void loadRegistry()}
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh registry
          </Button>
          <Button
            size="sm"
            disabled={loading || !sources || Boolean(working)}
            onClick={() => void openDefinition()}
          >
            <Plus className="h-4 w-4" />
            New variable
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300"
          >
            {error}
          </div>
        )}
        {selected &&
          editorVersion !== null &&
          selected.draftVersion !== editorVersion &&
          !loading &&
          !working && (
            <p
              role="status"
              className="rounded-lg border border-amber-500/30 p-3 text-sm"
            >
              A newer saved version is available. Select this variable again to
              reload it. Your unsaved edits are kept until you confirm.
            </p>
          )}
        {notice && (
          <div
            role="status"
            className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm"
          >
            {notice}
          </div>
        )}
        {loading && (
          <p
            role="status"
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading variable registry…
          </p>
        )}
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
          <section aria-label="Variable catalog" className="min-w-0 space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                aria-label="Search template variables"
                className="pl-9"
                placeholder="Search keyword, label, use case, or template usage"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                {visible.length} of {variables.length} variables
              </span>
              <select
                aria-label="Variable status"
                className={`${selectClass} max-w-40`}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="published">Published</option>
                <option value="draft">Drafts</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
            <div className="max-h-[760px] space-y-2 overflow-y-auto pr-1">
              {visible.map((variable) => (
                <button
                  key={variable.keyword}
                  type="button"
                  aria-pressed={selectedKeyword === variable.keyword}
                  disabled={Boolean(working)}
                  className={`w-full rounded-lg border p-4 text-left transition-colors hover:bg-accent/50 disabled:opacity-50 ${selectedKeyword === variable.keyword ? "border-primary bg-primary/5" : "border-border"}`}
                  onClick={() => void openDefinition(variable)}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{variable.label}</span>
                    <Badge
                      variant={
                        variable.status === "published"
                          ? "success"
                          : variable.status === "disabled"
                            ? "secondary"
                            : "warning"
                      }
                    >
                      {variable.status}
                    </Badge>
                    {variable.hasDraft && variable.status !== "draft" && (
                      <Badge variant="warning">Draft changes</Badge>
                    )}
                  </div>
                  <code className="mt-1.5 block break-all text-xs text-primary">{`{{${variable.keyword}}}`}</code>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {variable.useCase}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span>
                      {variable.valueType} · revision {variable.revision}
                    </span>
                    <span>{variable.builtin ? "Built-in" : "Custom"}</span>
                    <span>{variable.usageCount ?? 0} template uses</span>
                    <span>
                      Context: {variable.requiredContext.join(", ") || "None"}
                    </span>
                  </div>
                </button>
              ))}
              {!loading && visible.length === 0 && (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  {variables.length
                    ? "No variables match your search."
                    : "No template variables are available yet."}
                </p>
              )}
            </div>
          </section>
          {!draft || !sources ? (
            <div className="rounded-xl border border-dashed p-10 text-center">
              <Braces className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <h3 className="font-medium">One keyword, a clear source</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                Select a variable to inspect its rules or create a draft. Only
                allowlisted fields and bounded transformations are supported—no
                code or SQL.
              </p>
            </div>
          ) : (
            <section
              aria-label="Variable editor"
              className="min-w-0 rounded-xl border p-4 sm:p-5"
            >
              <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">
                  {selectedKeyword ? "Edit variable draft" : "Create variable"}
                </h3>
                <Badge variant={dirty ? "warning" : "outline"}>
                  {dirty ? "Unsaved changes" : "Saved definition"}
                </Badge>
              </div>
              {selected && (
                <details className="mb-5 rounded-lg border px-3 py-2 text-xs">
                  <summary className="cursor-pointer font-medium">
                    Usage in {selected.usageCount ?? 0} templates
                  </summary>
                  <ul className="mt-2 space-y-2 text-muted-foreground">
                    {(selected.usages ?? []).map((usage) => (
                      <li key={`${usage.vendorProfileId}:${usage.templateId}`}>
                        {usage.name} · {usage.language} · Vendor #
                        {usage.vendorProfileId}
                      </li>
                    ))}
                  </ul>
                  {!selected.usages?.length && (
                    <p className="mt-2 text-muted-foreground">
                      No recorded template uses.
                    </p>
                  )}
                </details>
              )}
              <fieldset
                disabled={Boolean(working) || loading}
                className="min-w-0 space-y-5 disabled:opacity-70"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5 text-sm">
                    <span>Keyword</span>
                    <Input
                      aria-label="Keyword"
                      maxLength={64}
                      placeholder="booking_total"
                      readOnly={Boolean(selectedKeyword)}
                      value={draft.keyword}
                      onChange={(event) =>
                        change({ ...draft, keyword: event.target.value })
                      }
                    />
                    <span className="block text-xs text-muted-foreground">
                      Stable lowercase identifier; do not include braces.
                    </span>
                  </label>
                  <label className="space-y-1.5 text-sm">
                    <span>Label</span>
                    <Input
                      aria-label="Variable label"
                      maxLength={120}
                      value={draft.label}
                      onChange={(event) =>
                        change({ ...draft, label: event.target.value })
                      }
                    />
                  </label>
                </div>
                <label className="block space-y-1.5 text-sm">
                  <span>Use case</span>
                  <Input
                    aria-label="Use case"
                    maxLength={500}
                    placeholder="Where and when should vendors use this?"
                    value={draft.useCase}
                    onChange={(event) =>
                      change({ ...draft, useCase: event.target.value })
                    }
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5 text-sm">
                    <span>Output type</span>
                    <select
                      aria-label="Output type"
                      className={selectClass}
                      value={draft.valueType}
                      onChange={(event) =>
                        change({
                          ...draft,
                          valueType: event.target.value as VariableValueType,
                        })
                      }
                    >
                      {valueTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1.5 text-sm">
                    <span>Sample output</span>
                    <Input
                      aria-label="Sample output"
                      maxLength={1024}
                      value={draft.sample}
                      onChange={(event) =>
                        change({ ...draft, sample: event.target.value })
                      }
                    />
                  </label>
                </div>
                <div className="space-y-3 border-t pt-4">
                  <h4 className="text-sm font-semibold">Trusted data source</h4>
                  <SourceFields
                    source={draft.source}
                    sources={sources}
                    onChange={(source) => {
                      const field = sources.models.find((model) => model.model === source.model)
                        ?.fields.find((entry) => entry.field === source.field);
                      const previousSample = exampleValue(draft.source);
                      change({
                        ...draft,
                        source,
                        ...(!draft.steps.length && field ? {
                          valueType: field.valueType,
                          sample: !draft.sample.trim() || draft.sample === previousSample ? field.sample : draft.sample,
                        } : {}),
                      });
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Required context: {draft.requiredContext.join(", ")}.
                    Resolved for the recipient and current business; no
                    arbitrary database access.
                  </p>
                </div>
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">
                      Transformation steps
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      {draft.steps.length}/12
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Applied from top to bottom. Formatting must be the final
                    step. Leave empty to use the source value unchanged.
                  </p>
                  {draft.steps.map((step, index) => (
                    <div
                      key={index}
                      className="space-y-3 rounded-lg border bg-secondary/20 p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {index + 1}
                        </span>
                        <select
                          aria-label={`Step ${index + 1} operation`}
                          className={selectClass}
                          value={step.op}
                          onChange={(event) =>
                            change({
                              ...draft,
                              steps: draft.steps.map((current, at) =>
                                at === index
                                  ? newVariableStep(
                                      event.target.value as VariableStep["op"],
                                    )
                                  : current,
                              ),
                            })
                          }
                        >
                          {!allowedSteps.includes(step.op) && (
                            <option value={step.op}>
                              Unavailable: {step.op}
                            </option>
                          )}
                          {allowedSteps.map((op) => (
                            <option key={op} value={op}>
                              {STEP_LABELS[op]}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Move step ${index + 1} up`}
                          disabled={index === 0}
                          onClick={() => {
                            const steps = [...draft.steps];
                            [steps[index - 1], steps[index]] = [
                              steps[index],
                              steps[index - 1],
                            ];
                            change({ ...draft, steps });
                          }}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Move step ${index + 1} down`}
                          disabled={index === draft.steps.length - 1}
                          onClick={() => {
                            const steps = [...draft.steps];
                            [steps[index], steps[index + 1]] = [
                              steps[index + 1],
                              steps[index],
                            ];
                            change({ ...draft, steps });
                          }}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove step ${index + 1}`}
                          onClick={() =>
                            change({
                              ...draft,
                              steps: draft.steps.filter(
                                (_, at) => at !== index,
                              ),
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <StepEditor
                        step={step}
                        index={index}
                        sources={sources}
                        onChange={(next) =>
                          change({
                            ...draft,
                            steps: draft.steps.map((current, at) =>
                              at === index ? next : current,
                            ),
                          })
                        }
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      draft.steps.length >= 12 ||
                      !allowedSteps.length ||
                      draft.steps.some((step) => step.op === "format_date")
                    }
                    onClick={addStep}
                  >
                    <Plus className="h-4 w-4" />
                    Add step
                  </Button>
                </div>
                <div className="space-y-3 rounded-lg border bg-secondary/20 p-4">
                  <h4 className="flex items-center gap-2 text-sm font-semibold">
                    <FlaskConical className="h-4 w-4" />
                    Test with sample values
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Samples are not sent to customers and do not read live
                    customer records. Missing or invalid values are shown as
                    validation failures.
                  </p>
                  {references.map((source) => {
                    const key = `${source.model}.${source.field}`;
                    return (
                      <label key={key} className="block space-y-1.5 text-xs">
                        <span>{key}</span>
                        <Input
                          aria-label={`Sample ${key}`}
                          maxLength={1000}
                          value={sampleValues[key] ?? exampleValue(source)}
                          onChange={(event) => {
                            setSampleValues((current) => ({
                              ...current,
                              [key]: event.target.value,
                            }));
                            setPreview(null);
                            setError(null);
                          }}
                        />
                      </label>
                    );
                  })}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void testSample()}
                  >
                    {working === "preview" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FlaskConical className="h-4 w-4" />
                    )}
                    Test sample
                  </Button>
                  {preview && (
                    <div
                      role="status"
                      className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3"
                    >
                      <p className="flex items-center gap-2 text-xs font-medium">
                        <CheckCircle2 className="h-4 w-4" />
                        Sample validated
                      </p>
                      <output
                        aria-label="Sample result"
                        className="mt-2 block whitespace-pre-wrap break-words text-sm"
                      >
                        {typeof preview.value === "object"
                          ? JSON.stringify(preview.value)
                          : String(preview.value ?? "")}
                      </output>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 border-t pt-4">
                  <Button
                    type="button"
                    onClick={() => void saveDraft()}
                    disabled={!dirty}
                  >
                    {working === "save" && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Save draft
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={
                      dirty ||
                      !selected ||
                      !(selected.hasDraft || selected.status === "draft") ||
                      !preview
                    }
                    onClick={() => void transition("publish")}
                  >
                    Publish draft
                  </Button>
                  {selected && selected.status !== "disabled" && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-rose-300"
                      disabled={dirty}
                      onClick={() => void transition("disable")}
                    >
                      Disable variable
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Save and successfully test the draft before publishing.
                  Editing a published variable does not change its live revision
                  until publication.
                </p>
              </fieldset>
            </section>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
