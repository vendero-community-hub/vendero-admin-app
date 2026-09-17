export type VariableContext = string;
export type VariableValueType =
  | "text"
  | "number"
  | "currency"
  | "date"
  | "phone"
  | "url";
export type VariableSource = { model: VariableContext; field: string };
export type VariableStep =
  | { op: "trim" | "uppercase" | "lowercase" }
  | { op: "prefix" | "suffix"; value: string }
  | {
      op: "add" | "subtract" | "multiply" | "divide";
      operand:
        | { kind: "literal"; value: string }
        | { kind: "field"; source: VariableSource };
    }
  | { op: "round"; digits: number }
  | { op: "format_currency"; currency: string }
  | {
      op: "format_date";
      format: "date" | "datetime" | "time";
      timezone: string;
    };

export type VariableDefinitionInput = {
  keyword: string;
  label: string;
  useCase: string;
  valueType: VariableValueType;
  sample: string;
  requiredContext: VariableContext[];
  source: VariableSource;
  steps: VariableStep[];
};

export type VariableDefinition = VariableDefinitionInput & {
  revision: number;
  status: "draft" | "published" | "disabled";
  hasDraft: boolean;
  builtin: boolean;
  draft?: VariableDefinitionInput | null;
  draftVersion: number;
  usageCount: number;
  usages: {
    templateId: string;
    name: string;
    language: string;
    vendorProfileId: number;
  }[];
};

export type VariableSources = {
  models: {
    model: VariableContext;
    label: string;
    fields: {
      field: string;
      label: string;
      valueType: VariableValueType;
      sample: string;
      dataType?: string;
    }[];
  }[];
  stepTypes: (string | { op: string; label?: string })[];
};

export const STEP_LABELS: Record<VariableStep["op"], string> = {
  trim: "Trim spaces",
  uppercase: "Uppercase",
  lowercase: "Lowercase",
  prefix: "Add text before",
  suffix: "Add text after",
  add: "Add",
  subtract: "Subtract",
  multiply: "Multiply",
  divide: "Divide",
  round: "Round number",
  format_currency: "Format currency",
  format_date: "Format date / time",
};

function sourceRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function normalizeVariableSources(value: unknown): VariableSources {
  const source = sourceRecord(value);
  if (!Array.isArray(source.models) || !Array.isArray(source.stepTypes))
    throw new Error("The template variable registry returned an invalid response.");
  const valueTypes = new Set(["text", "number", "currency", "date", "phone", "url"]);
  const seenModels = new Set<string>();
  const models = source.models.flatMap((entry) => {
    const model = sourceRecord(entry);
    if (typeof model.model !== "string" || !model.model.trim() || !Array.isArray(model.fields)) return [];
    const key = model.model.trim();
    if (seenModels.has(key)) return [];
    seenModels.add(key);
    const seenFields = new Set<string>();
    const fields = model.fields.flatMap((candidate) => {
      const field = sourceRecord(candidate);
      if (typeof field.field !== "string" || !field.field.trim()) return [];
      const fieldKey = field.field.trim();
      const normalized = fieldKey
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
        .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
        .toLowerCase();
      const dataType = typeof field.dataType === "string" ? field.dataType.trim() : undefined;
      if (
        /(?:^|[_.])(?:ids?|uuid|guid)(?:_refs?)?$/.test(normalized) ||
        /^(?:created|updated)(?:_|$)/.test(normalized) ||
        /^(?:date|time|timestamp)_(?:created|updated)$/.test(normalized) ||
        /^(?:bool|boolean)(?:\[\])?$/i.test(dataType ?? "") ||
        typeof field.valueType !== "string" ||
        !valueTypes.has(field.valueType) ||
        seenFields.has(fieldKey)
      ) return [];
      seenFields.add(fieldKey);
      return [{
        field: fieldKey,
        label: typeof field.label === "string" && field.label.trim() ? field.label.trim() : fieldKey,
        valueType: field.valueType as VariableValueType,
        sample: typeof field.sample === "string" || typeof field.sample === "number" ? String(field.sample) : "",
        ...(dataType ? { dataType } : {}),
      }];
    });
    return [{
      model: key,
      label: typeof model.label === "string" && model.label.trim() ? model.label.trim() : key,
      fields,
    }];
  });
  const stepTypes = source.stepTypes.flatMap((entry) => {
    const step = sourceRecord(entry);
    const op = typeof entry === "string" ? entry : step.op;
    if (typeof op !== "string" || !Object.hasOwn(STEP_LABELS, op)) return [];
    return [typeof entry === "string" ? op : { op, ...(typeof step.label === "string" ? { label: step.label } : {}) }];
  });
  return { models, stepTypes };
}

export function newVariableStep(op: VariableStep["op"]): VariableStep {
  if (op === "prefix" || op === "suffix") return { op, value: "" };
  if (op === "add" || op === "subtract" || op === "multiply" || op === "divide")
    return { op, operand: { kind: "literal", value: "1" } };
  if (op === "round") return { op, digits: 2 };
  if (op === "format_currency") return { op, currency: "INR" };
  if (op === "format_date")
    return { op, format: "date", timezone: "Asia/Kolkata" };
  return { op };
}

export function variableReferences(
  definition: VariableDefinitionInput,
): VariableSource[] {
  const references = [definition.source];
  for (const step of definition.steps) {
    if ("operand" in step && step.operand.kind === "field")
      references.push(step.operand.source);
  }
  return references.filter(
    (source, index, all) =>
      all.findIndex(
        (item) => item.model === source.model && item.field === source.field,
      ) === index,
  );
}

export function variableInput(
  definition: VariableDefinitionInput,
): VariableDefinitionInput {
  return {
    keyword: definition.keyword,
    label: definition.label,
    useCase: definition.useCase,
    valueType: definition.valueType,
    sample: String(definition.sample ?? ""),
    requiredContext: [
      ...new Set(variableReferences(definition).map((source) => source.model)),
    ],
    source: { ...definition.source },
    steps: structuredClone(definition.steps ?? []),
  };
}

export function variableValidation(
  definition: VariableDefinitionInput,
  sources: VariableSources,
): string | null {
  if (!definition.keyword.trim() || !definition.label.trim())
    return "Enter a keyword and a label.";
  if (
    !/^[a-z][a-z0-9_]{0,63}$/.test(definition.keyword) ||
    ["__proto__", "prototype", "constructor"].includes(definition.keyword)
  )
    return "Use a lowercase keyword of up to 64 characters, such as customer_name.";
  if (!definition.useCase.trim())
    return "Describe when this variable should be used.";
  if (!definition.sample.trim())
    return "Add a sample output for template previews.";
  if (definition.steps.length > 12)
    return "Use no more than 12 transformation steps.";
  const allowedSteps = sources.stepTypes.map((step) =>
    typeof step === "string" ? step : step.op,
  );
  if (definition.steps.some((step) => !allowedSteps.includes(step.op)))
    return "This transformation is not available. Remove it before saving.";
  for (const source of variableReferences(definition)) {
    if (
      !sources.models.some(
        (model) =>
          model.model === source.model &&
          model.fields.some((field) => field.field === source.field),
      )
    )
      return "Choose a supported model and field for every source.";
  }
  const fieldType = (source: VariableSource) =>
    sources.models
      .find((model) => model.model === source.model)
      ?.fields.find((field) => field.field === source.field)?.valueType;
  const numeric = (type: string | undefined) =>
    type === "number" || type === "currency";
  let outputType = fieldType(definition.source);
  const resourceModels = variableReferences(definition).map((source) =>
    source.model === "crm_quote" ? "quote" : source.model === "vendero_site_runtime_booking" ? "booking" : source.model,
  );
  if (resourceModels.includes("quote") && resourceModels.some((model) => model === "booking" || model === "trip"))
    return "Use quote fields separately from booking and trip fields in a formula.";
  for (const [index, step] of definition.steps.entries()) {
    if ("operand" in step && !numeric(outputType))
      return "Arithmetic requires a number or currency source.";
    if (
      "operand" in step &&
      step.operand.kind === "field" &&
      !numeric(fieldType(step.operand.source))
    )
      return "Choose a numeric field for the arithmetic operand.";
    if (
      "operand" in step &&
      step.operand.kind === "literal" &&
      !/^-?\d{1,18}(?:\.\d{1,8})?$/.test(step.operand.value.trim())
    )
      return "Enter a decimal with up to 18 integer digits and 8 decimal places.";
    if (
      step.op === "divide" &&
      step.operand.kind === "literal" &&
      Number(step.operand.value) === 0
    )
      return "A divide step cannot use zero.";
    if (
      step.op === "round" &&
      (!numeric(outputType) ||
        !Number.isInteger(step.digits) ||
        step.digits < 0 ||
        step.digits > 8)
    )
      return "Rounding needs a number and a whole digit count between 0 and 8.";
    if (
      (step.op === "format_currency" || step.op === "format_date") &&
      index !== definition.steps.length - 1
    )
      return "Formatting must be the last transformation step.";
    if (step.op === "format_currency" && !numeric(outputType))
      return "Currency formatting requires a number or currency source.";
    if (step.op === "format_currency" && !/^[A-Z]{3}$/.test(step.currency))
      return "Use a three-letter currency code, such as INR.";
    if (step.op === "format_currency") outputType = "currency";
    if (step.op === "format_date" && outputType !== "date")
      return "Date formatting requires a date source.";
    if (step.op === "format_date" && !step.timezone.trim())
      return "Choose a time zone for date formatting.";
    if (
      step.op === "trim" ||
      step.op === "uppercase" ||
      step.op === "lowercase"
    ) {
      if (numeric(outputType) || outputType === "date")
        return "Text transformations require a text source.";
      outputType = "text";
    }
    if (step.op === "prefix" || step.op === "suffix") outputType = "text";
  }
  if (
    outputType !== definition.valueType &&
    !(numeric(outputType) && numeric(definition.valueType))
  )
    return "The output type must match the selected source and transformations.";
  return null;
}
