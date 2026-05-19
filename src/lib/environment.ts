export type AppEnvironment = "dev" | "test" | "prod";

export function normalizeAppEnvironment(value?: string | null): AppEnvironment {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (["prod", "pro", "production"].includes(normalized)) return "prod";
  if (["test", "testing", "stage", "staging", "stahing"].includes(normalized))
    return "test";
  return "dev";
}

export const APP_ENV = normalizeAppEnvironment(
  process.env.NEXT_PUBLIC_APP_ENV ??
    process.env.APP_ENV ??
    process.env.VENDERO_ENV ??
    process.env.NODE_ENV
);

const apiDefaults: Record<AppEnvironment, string> = {
  dev: "http://localhost:3333",
  test: "https://test-api.vendero.in",
  prod: "https://api.vendero.in",
};

const realtimeDefaults: Record<AppEnvironment, string> = {
  dev: "http://localhost:3334",
  test: "https://test-api.vendero.in/realtime",
  prod: "https://realtime.vendero.in",
};

export const API_URL =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  apiDefaults[APP_ENV];
export const REALTIME_URL =
  process.env.NEXT_PUBLIC_REALTIME_URL ??
  process.env.REALTIME_URL ??
  realtimeDefaults[APP_ENV];

export const ENV_HEADERS = {
  "x-vendero-env": APP_ENV,
};
