// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WhatsPilotTemplateVariablesPanel } from "./whatsapp-pilot-template-variables-panel";
import {
  newVariableStep,
  normalizeVariableSources,
  variableInput,
  variableValidation,
  type VariableDefinition,
  type VariableDefinitionInput,
  type VariableSources,
} from "./template-variable-types";

const { confirm } = vi.hoisted(() => ({ confirm: vi.fn(async () => true) }));
vi.mock("@/components/ui/action-modal", () => ({
  useActionModal: () => ({ confirm }),
}));

const base = "/api/v1/admin/whatsapp-pilot/template-variables";
const sources: VariableSources = {
  models: [
    {
      model: "contact",
      label: "Contact",
      fields: [
        { field: "name", label: "Name", valueType: "text", sample: "Asha" },
        {
          field: "phone",
          label: "Phone",
          valueType: "phone",
          sample: "+919876543210",
        },
      ],
    },
    {
      model: "booking",
      label: "Booking",
      fields: [
        {
          field: "amount",
          label: "Amount",
          valueType: "number",
          sample: "1500",
        },
        {
          field: "distance",
          label: "Distance",
          valueType: "number",
          sample: "120",
        },
      ],
    },
  ],
  stepTypes: [
    "trim",
    "uppercase",
    "lowercase",
    "prefix",
    "suffix",
    "add",
    "subtract",
    "multiply",
    "divide",
    "round",
    "format_currency",
    "format_date",
  ],
};
const expandedSources = {
  ...sources,
  models: [
    ...sources.models,
    { model: "trip", label: "Trip", fields: [{ field: "amount", label: "Amount", valueType: "number", sample: "1200" }] },
    { model: "quote", label: "Quote", fields: [{ field: "amount", label: "Amount", valueType: "number", sample: "1800" }] },
    { model: "crm_quote", label: "CRM quote", fields: [{ field: "total_amount", label: "Total amount", valueType: "currency", sample: "1800" }] },
    { model: "vendero_site_runtime_booking", label: "Website booking", fields: [{ field: "total_amount", label: "Total amount", valueType: "currency", sample: "1800" }] },
    {
      model: "crm_customer",
      label: "CRM customer",
      fields: [
        ...["id", "customerID", "public_id", "vendor_id_ref", "assigned_driver_ids", "createdAt", "updated_at"].map((field) => ({ field, label: field, valueType: "text", sample: "hidden" })),
        { field: "active", label: "Active", valueType: "boolean", sample: "true" },
        { field: "verified", label: "Verified", valueType: "text", dataType: "Boolean", sample: "true" },
        { field: "subscribed", label: "Subscribed", valueType: "number", dataType: "bool", sample: "1" },
        { field: "custom", label: "Custom type", valueType: "untrusted_type", sample: "value" },
        { field: "fullName", label: "Full name", valueType: "text", sample: "Asha Patel" },
        { field: "birthDate", label: "Birth date", valueType: "date", sample: "1990-08-15", dataType: "date" },
      ],
    },
    {
      model: "driver",
      label: "Driver",
      fields: [
        { field: "name", label: "Driver name", valueType: "text", sample: "Samir" },
        { field: "license_expiry", label: "License expiry", valueType: "date", sample: "2028-09-01" },
      ],
    },
    {
      model: "vendor_cab",
      label: "Vendor cab",
      fields: [
        { field: "registration_number", label: "Registration number", valueType: "text", sample: "GJ01AB1234" },
        { field: "seat_count", label: "Seat count", valueType: "number", sample: "4" },
      ],
    },
    {
      model: "crm_invoice",
      label: "CRM invoice",
      fields: [
        { field: "total", label: "Invoice total", valueType: "currency", sample: "4500" },
        { field: "due_date", label: "Due date", valueType: "date", sample: "2026-10-01" },
      ],
    },
  ],
};
const initialVariable: VariableDefinition = {
  keyword: "booking_total",
  label: "Booking total",
  useCase: "Payment reminders",
  valueType: "currency",
  sample: "₹1,500.00",
  requiredContext: ["booking"],
  source: { model: "booking", field: "amount" },
  steps: [{ op: "format_currency", currency: "INR" }],
  revision: 1,
  status: "published",
  hasDraft: false,
  draft: null,
  draftVersion: 0,
  builtin: true,
  usageCount: 1,
  usages: [
    {
      templateId: "template_1",
      name: "Airport reminder",
      language: "en",
      vendorProfileId: 16,
    },
  ],
};
let catalog: VariableDefinition[];
let sourceCatalog: unknown;
let fetchMock: ReturnType<typeof vi.fn>;

function response(data: unknown, ok = true) {
  return { ok, json: async () => (ok ? { data: { data } } : data) } as Response;
}

beforeEach(() => {
  catalog = structuredClone([initialVariable]);
  sourceCatalog = sources;
  confirm.mockReset();
  confirm.mockResolvedValue(true);
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === `${base}/sources`) return response(sourceCatalog);
    if (url === base && !init?.method) return response({ variables: catalog });
    if (url === `${base}/preview`)
      return response({
        value: "₹1,500.00",
        requiredContext: ["booking"],
        sourceValues: { "booking.amount": "1500" },
      });
    if (url === base && init?.method === "POST") {
      const input = JSON.parse(String(init.body)) as VariableDefinitionInput & {
        draftVersion?: number;
      };
      const existing = catalog.find(
        (variable) => variable.keyword === input.keyword,
      );
      const next = {
        ...initialVariable,
        ...existing,
        ...input,
        draft: variableInput(input),
        hasDraft: true,
        status: existing?.status ?? "draft",
        draftVersion: (existing?.draftVersion ?? 0) + 1,
      } satisfies VariableDefinition;
      catalog = [
        ...catalog.filter((variable) => variable.keyword !== input.keyword),
        next,
      ];
      return response(next);
    }
    if (url.endsWith("/publish")) {
      catalog = catalog.map((variable) => ({
        ...variable,
        status: "published",
        hasDraft: false,
        draft: null,
        revision: variable.revision + 1,
        draftVersion: variable.draftVersion + 1,
      }));
      return response(catalog[0]);
    }
    if (url.endsWith("/disable")) {
      catalog = catalog.map((variable) => ({
        ...variable,
        status: "disabled",
        draftVersion: variable.draftVersion + 1,
      }));
      return response(catalog[0]);
    }
    throw new Error(`Unexpected request: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function openVariable() {
  const user = userEvent.setup();
  render(<WhatsPilotTemplateVariablesPanel />);
  await user.click(
    await screen.findByRole("button", { name: /Booking total published/ }),
  );
  return user;
}

function posted(path: string) {
  return fetchMock.mock.calls
    .filter(
      ([url, init]) => url === `${base}${path}` && init?.method === "POST",
    )
    .map(([, init]) => JSON.parse(String(init.body)));
}

describe("WhatsPilotTemplateVariablesPanel", () => {
  it("offers every returned vendor model and infers eligible source fields, types, and samples", async () => {
    sourceCatalog = expandedSources;
    const user = userEvent.setup();
    render(<WhatsPilotTemplateVariablesPanel />);
    await screen.findByRole("button", { name: /Booking total published/ });
    await user.click(screen.getByRole("button", { name: "New variable" }));
    const modelSelect = screen.getByRole("combobox", { name: "Source model" });
    expect(within(modelSelect).getAllByRole("option").map((option) => (option as HTMLOptionElement).value)).toEqual(expandedSources.models.map((model) => model.model));

    await user.selectOptions(modelSelect, "crm_customer");
    const fieldSelect = screen.getByRole("combobox", { name: "Source field" }) as HTMLSelectElement;
    expect(Array.from(fieldSelect.options).map((option) => option.value)).toEqual(["fullName", "birthDate"]);
    expect(fieldSelect.value).toBe("fullName");
    expect((screen.getByRole("combobox", { name: "Output type" }) as HTMLSelectElement).value).toBe("text");
    expect((screen.getByRole("textbox", { name: "Sample output" }) as HTMLInputElement).value).toBe("Asha Patel");
    await user.selectOptions(fieldSelect, "birthDate");
    expect((screen.getByRole("combobox", { name: "Output type" }) as HTMLSelectElement).value).toBe("date");
    expect((screen.getByRole("textbox", { name: "Sample output" }) as HTMLInputElement).value).toBe("1990-08-15");

    for (const [model, field, sample] of [["driver", "name", "Samir"], ["vendor_cab", "registration_number", "GJ01AB1234"], ["crm_invoice", "total", "4500"]]) {
      await user.selectOptions(modelSelect, model);
      expect(fieldSelect.value).toBe(field);
      expect((screen.getByRole("textbox", { name: "Sample output" }) as HTMLInputElement).value).toBe(sample);
    }
    expect((screen.getByRole("combobox", { name: "Output type" }) as HTMLSelectElement).value).toBe("currency");
    await user.type(screen.getByRole("textbox", { name: "Keyword" }), "invoice_amount");
    await user.type(screen.getByRole("textbox", { name: "Variable label" }), "Invoice amount");
    await user.type(screen.getByRole("textbox", { name: "Use case" }), "Invoice reminders");
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    await screen.findByText(/Draft saved/);
    expect(posted("")[0]).toMatchObject({ source: { model: "crm_invoice", field: "total" }, requiredContext: ["crm_invoice"], valueType: "currency", sample: "4500" });
  });

  it("searches source models and fields without discarding the current selection", async () => {
    sourceCatalog = expandedSources;
    const user = await openVariable();
    const modelSelect = screen.getByRole("combobox", { name: "Source model" }) as HTMLSelectElement;
    const modelSearch = screen.getByRole("searchbox", { name: "Search source models" });
    await user.type(modelSearch, "driver");
    expect(Array.from(modelSelect.options).map((option) => option.value)).toEqual(["booking", "driver"]);
    expect(modelSelect.value).toBe("booking");
    await user.clear(modelSearch);
    await user.type(modelSearch, "missing_model");
    expect(screen.getByText("No matching models.")).toBeTruthy();
    expect(modelSelect.value).toBe("booking");
    await user.clear(modelSearch);
    await user.selectOptions(modelSelect, "driver");
    const fieldSelect = screen.getByRole("combobox", { name: "Source field" }) as HTMLSelectElement;
    const fieldSearch = screen.getByRole("searchbox", { name: "Search source fields" });
    await user.type(fieldSearch, "expiry");
    expect(Array.from(fieldSelect.options).map((option) => option.value)).toEqual(["name", "license_expiry"]);
    await user.selectOptions(fieldSelect, "license_expiry");
    await user.clear(fieldSearch);
    await user.type(fieldSearch, "missing_field");
    expect(screen.getByText("No matching fields.")).toBeTruthy();
    expect(fieldSelect.value).toBe("license_expiry");
    expect(posted("")).toHaveLength(0);
  });

  it("limits expanded formula sources to eligible numeric fields", async () => {
    sourceCatalog = expandedSources;
    const user = await openVariable();
    await user.selectOptions(screen.getByRole("combobox", { name: "Step 1 operation" }), "add");
    await user.selectOptions(screen.getByRole("combobox", { name: "Step 1 operand type" }), "field");
    const modelSelect = screen.getByRole("combobox", { name: "Step 1 model" }) as HTMLSelectElement;
    expect(Array.from(modelSelect.options).map((option) => option.value)).toEqual(["booking", "trip", "quote", "crm_quote", "vendero_site_runtime_booking", "vendor_cab", "crm_invoice"]);
    await user.selectOptions(modelSelect, "vendor_cab");
    const fieldSelect = screen.getByRole("combobox", { name: "Step 1 field" }) as HTMLSelectElement;
    expect(Array.from(fieldSelect.options).map((option) => option.value)).toEqual(["seat_count"]);
    await user.selectOptions(modelSelect, "crm_invoice");
    expect(Array.from(fieldSelect.options).map((option) => option.value)).toEqual(["total"]);
    expect(screen.getByRole("textbox", { name: "Sample crm_invoice.total" })).toBeTruthy();
  });

  it("loads the catalog, shows context and usage, and searches template usage without polling", async () => {
    const user = await openVariable();
    expect(screen.getByText("Context: booking")).toBeTruthy();
    await user.click(screen.getByText("Usage in 1 templates"));
    expect(screen.getByText("Airport reminder · en · Vendor #16")).toBeTruthy();
    await user.type(
      screen.getByRole("textbox", { name: "Search template variables" }),
      "Airport reminder",
    );
    expect(
      screen.getByRole("button", { name: /Booking total published/ }),
    ).toBeTruthy();
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Variable status" }),
      "disabled",
    );
    expect(screen.getByText("No variables match your search.")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("creates drafts using allowlisted model/field choices and never publishes on save", async () => {
    const user = userEvent.setup();
    render(<WhatsPilotTemplateVariablesPanel />);
    await screen.findByRole("button", { name: /Booking total published/ });
    await user.click(screen.getByRole("button", { name: "New variable" }));
    await user.type(
      screen.getByRole("textbox", { name: "Keyword" }),
      "contact_name_copy",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Variable label" }),
      "Greeting name",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Use case" }),
      "Personal greetings",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Sample output" }),
      "Asha",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Source model" }),
      "booking",
    );
    expect(
      (
        screen.getByRole("combobox", {
          name: "Source field",
        }) as HTMLSelectElement
      ).value,
    ).toBe("amount");
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Source model" }),
      "contact",
    );
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    await screen.findByText(/Draft saved/);
    expect(posted("")[0]).toMatchObject({
      keyword: "contact_name_copy",
      source: { model: "contact", field: "name" },
      requiredContext: ["contact"],
      steps: [],
      draftVersion: 0,
    });
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).endsWith("/publish")),
    ).toBe(false);
  });

  it("previews a safe formula, saves with an optimistic version, and explicitly publishes", async () => {
    const user = await openVariable();
    await user.clear(screen.getByRole("textbox", { name: "Variable label" }));
    await user.type(
      screen.getByRole("textbox", { name: "Variable label" }),
      "Fare total",
    );
    await user.click(screen.getByRole("button", { name: "Add step" }));
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Step 1 rounding digits" }),
      { target: { value: "3" } },
    );
    await user.click(screen.getByRole("button", { name: "Test sample" }));
    await screen.findByText("Sample validated");
    expect(posted("/preview")[0]).toMatchObject({
      steps: [
        { op: "round", digits: 3 },
        { op: "format_currency", currency: "INR" },
      ],
      sampleValues: { "booking.amount": "1500" },
    });
    expect(
      (
        screen.getByRole("button", {
          name: "Publish draft",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    await screen.findByText(/Draft saved/);
    expect(posted("")[0].draftVersion).toBe(0);
    await waitFor(() =>
      expect(
        (
          screen.getByRole("button", {
            name: "Publish draft",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );
    await user.click(screen.getByRole("button", { name: "Publish draft" }));
    await screen.findByText("Variable published.");
    expect(posted("/booking_total/publish")).toEqual([{ draftVersion: 1 }]);
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ confirmLabel: "Publish variable" }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Variable label" }),
      " again",
    );
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    await screen.findByText(/Draft saved/);
    expect(posted("")[1].draftVersion).toBe(2);
  });

  it("shows server sample validation failures and keeps publishing unavailable", async () => {
    const user = await openVariable();
    fetchMock.mockImplementationOnce(async () =>
      response(
        {
          error: {
            message: "Sample validation failed",
            details: {
              issues: [{ message: "booking.amount must be a number" }],
            },
          },
        },
        false,
      ),
    );
    await user.click(screen.getByRole("button", { name: "Test sample" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "booking.amount must be a number",
    );
    expect(screen.queryByText("Sample validated")).toBeNull();
    expect(
      (
        screen.getByRole("button", {
          name: "Publish draft",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("retains edits on version conflict and does not replace the editor version on refresh", async () => {
    const user = await openVariable();
    await user.type(
      screen.getByRole("textbox", { name: "Variable label" }),
      " custom",
    );
    catalog[0].draftVersion = 7;
    await user.click(screen.getByRole("button", { name: "Refresh registry" }));
    await waitFor(() =>
      expect(screen.queryByText("Loading variable registry…")).toBeNull(),
    );
    fetchMock.mockImplementationOnce(async () =>
      response(
        { error: { message: "Draft changed. Reload before saving." } },
        false,
      ),
    );
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    await screen.findByText("Draft changed. Reload before saving.");
    expect(posted("")[0].draftVersion).toBe(0);
    expect(
      (
        screen.getByRole("textbox", {
          name: "Variable label",
        }) as HTMLInputElement
      ).value,
    ).toBe("Booking total custom");
    expect(screen.getByText("Unsaved changes")).toBeTruthy();
  });

  it("invalidates sample results when the definition or sample inputs change", async () => {
    const user = await openVariable();
    await user.click(screen.getByRole("button", { name: "Test sample" }));
    await screen.findByText("Sample validated");
    await user.type(
      screen.getByRole("textbox", { name: "Sample booking.amount" }),
      "0",
    );
    expect(screen.queryByText("Sample validated")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Test sample" }));
    await screen.findByText("Sample validated");
    await user.type(
      screen.getByRole("textbox", { name: "Variable label" }),
      " edited",
    );
    expect(screen.queryByText("Sample validated")).toBeNull();
  });

  it("supports safe field operands and enforces the 12-step bound", async () => {
    const user = await openVariable();
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Step 1 operation" }),
      "multiply",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Step 1 operand type" }),
      "field",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Step 1 model" }),
      "booking",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Step 1 field" }),
      "distance",
    );
    expect(
      screen.getByRole("textbox", { name: "Sample booking.distance" }),
    ).toBeTruthy();
    for (let count = 1; count < 12; count += 1)
      fireEvent.click(screen.getByRole("button", { name: "Add step" }));
    expect(
      screen.getAllByRole("combobox", { name: /Step \d+ operation/ }),
    ).toHaveLength(12);
    expect(
      (screen.getByRole("button", { name: "Add step" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      screen.queryByRole("textbox", { name: /JavaScript|SQL|code/i }),
    ).toBeNull();
  });

  it("requires explicit confirmation before disabling", async () => {
    const user = await openVariable();
    confirm.mockResolvedValueOnce(false);
    await user.click(screen.getByRole("button", { name: "Disable variable" }));
    expect(posted("/booking_total/disable")).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "Disable variable" }));
    await screen.findByText("Variable disabled.");
    expect(posted("/booking_total/disable")).toEqual([{}]);
  });

  it("keeps unsaved changes when discard confirmation is cancelled", async () => {
    const user = await openVariable();
    await user.type(
      screen.getByRole("textbox", { name: "Variable label" }),
      " custom",
    );
    confirm.mockResolvedValueOnce(false);
    await user.click(screen.getByRole("button", { name: "New variable" }));
    expect(
      (
        screen.getByRole("textbox", {
          name: "Variable label",
        }) as HTMLInputElement
      ).value,
    ).toBe("Booking total custom");
  });

  it("recovers a failed initial catalog read only through explicit refresh", async () => {
    fetchMock.mockImplementationOnce(async () => {
      throw new Error("Registry unavailable");
    });
    const user = userEvent.setup();
    render(<WhatsPilotTemplateVariablesPanel />);
    await screen.findByText("Registry unavailable");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole("button", { name: "Refresh registry" }));
    expect(
      await screen.findByRole("button", { name: /Booking total published/ }),
    ).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});

describe("template variable draft validation", () => {
  it("filters identifiers, audit timestamps, booleans, and unsupported types while keeping business dates", () => {
    const normalized = normalizeVariableSources(expandedSources);
    expect(normalized.models.find((model) => model.model === "crm_customer")?.fields.map((field) => field.field)).toEqual(["fullName", "birthDate"]);
    expect(normalized.models.find((model) => model.model === "driver")?.fields.map((field) => field.field)).toContain("license_expiry");
    expect(normalized.models.find((model) => model.model === "crm_invoice")?.fields.map((field) => field.field)).toContain("due_date");
    expect(() => normalizeVariableSources({ models: null, stepTypes: [] })).toThrow("invalid response");
  });

  it("allows booking and trip operands together but rejects mixing either with a quote", () => {
    const options = normalizeVariableSources(expandedSources);
    const formula: VariableDefinitionInput = {
      ...initialVariable,
      steps: [{ op: "add", operand: { kind: "field", source: { model: "trip", field: "amount" } } }],
    };
    expect(variableValidation(formula, options)).toBeNull();
    expect(variableInput(formula).requiredContext).toEqual(["booking", "trip"]);
    expect(variableValidation({ ...formula, source: { model: "quote", field: "amount" } }, options)).toContain("quote fields separately");
    expect(variableValidation({ ...formula, steps: [{ op: "add", operand: { kind: "field", source: { model: "quote", field: "amount" } } }] }, options)).toContain("quote fields separately");
  });

  it("rejects unapproved fields and transformations", () => {
    expect(
      variableValidation(
        { ...initialVariable, source: { model: "contact", field: "password" } },
        sources,
      ),
    ).toContain("supported model and field");
    expect(
      variableValidation(
        { ...initialVariable, steps: [{ op: "eval" } as never] },
        sources,
      ),
    ).toContain("not available");
  });

  it("applies the same quote boundary to canonical model names and preserves compatible aliases", () => {
    const options = normalizeVariableSources(expandedSources);
    const sourceFor = (model: string) => ({ model, field: model === "crm_quote" || model === "vendero_site_runtime_booking" ? "total_amount" : "amount" });
    for (const quote of ["quote", "crm_quote"]) {
      for (const booking of ["booking", "trip", "vendero_site_runtime_booking"]) {
        for (const [source, operand] of [[quote, booking], [booking, quote]]) {
          expect(variableValidation({
            ...initialVariable,
            source: sourceFor(source),
            steps: [{ op: "add", operand: { kind: "field", source: sourceFor(operand) } }],
          }, options)).toContain("quote fields separately");
        }
      }
    }
    expect(variableValidation({
      ...initialVariable,
      source: sourceFor("quote"),
      steps: [{ op: "add", operand: { kind: "field", source: sourceFor("crm_quote") } }],
    }, options)).toBeNull();
    expect(variableValidation({
      ...initialVariable,
      steps: [{ op: "add", operand: { kind: "field", source: sourceFor("vendero_site_runtime_booking") } }],
    }, options)).toBeNull();
  });
  it("blocks invalid arithmetic and bounds formatting", () => {
    expect(
      variableValidation(
        {
          ...initialVariable,
          steps: [{ op: "divide", operand: { kind: "literal", value: "0" } }],
        },
        sources,
      ),
    ).toContain("zero");
    expect(
      variableValidation(
        { ...initialVariable, steps: [{ op: "round", digits: 10 }] },
        sources,
      ),
    ).toContain("between 0 and 8");
    expect(
      variableValidation(
        {
          ...initialVariable,
          steps: Array.from({ length: 13 }, () => newVariableStep("trim")),
        },
        sources,
      ),
    ).toContain("12");
  });
  it("derives required context and excludes catalog metadata from writes", () => {
    const input = variableInput({
      ...initialVariable,
      steps: [
        {
          op: "add",
          operand: {
            kind: "field",
            source: { model: "contact", field: "phone" },
          },
        },
      ],
    });
    expect(input.requiredContext).toEqual(["booking", "contact"]);
    expect(input).not.toHaveProperty("status");
    expect(input).not.toHaveProperty("usageCount");
    expect(input).not.toHaveProperty("revision");
  });
  it("rejects non-numeric operands, post-formatter steps, and mismatched output types", () => {
    expect(
      variableValidation(
        {
          ...initialVariable,
          steps: [
            {
              op: "add",
              operand: {
                kind: "field",
                source: { model: "contact", field: "phone" },
              },
            },
          ],
        },
        sources,
      ),
    ).toContain("numeric field");
    expect(
      variableValidation(
        {
          ...initialVariable,
          steps: [...initialVariable.steps, { op: "suffix", value: " due" }],
        },
        sources,
      ),
    ).toContain("last transformation");
    expect(
      variableValidation({ ...initialVariable, valueType: "date" }, sources),
    ).toContain("output type");
    expect(
      variableValidation(
        {
          ...initialVariable,
          steps: [{ op: "add", operand: { kind: "literal", value: "1e8" } }],
        },
        sources,
      ),
    ).toContain("decimal");
  });
});
