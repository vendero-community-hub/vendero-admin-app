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

function firstConfiguredValue(...values: Array<string | undefined>) {
  return values.find((value) => typeof value === "string" && value.trim());
}

function appEnvironmentFromUrl(value?: string | null): AppEnvironment | null {
  if (!value) return null;

  try {
    const hostname = new URL(value).hostname.toLowerCase();
    if (["localhost", "127.0.0.1", "0.0.0.0"].includes(hostname)) return "dev";
    if (hostname === "test-api.vendero.in" || hostname.startsWith("test-")) {
      return "test";
    }
    if (hostname.endsWith(".vendero.in")) return "prod";
  } catch {
    return null;
  }

  return null;
}

const configuredAppEnvironment = firstConfiguredValue(
  process.env.NEXT_PUBLIC_APP_ENV,
  process.env.APP_ENV,
  process.env.VENDERO_ENV
);

export const APP_ENV = configuredAppEnvironment
  ? normalizeAppEnvironment(configuredAppEnvironment)
  : appEnvironmentFromUrl(process.env.NEXT_PUBLIC_API_URL) ??
    appEnvironmentFromUrl(process.env.API_URL) ??
    appEnvironmentFromUrl(process.env.NEXT_PUBLIC_SOCKET_URL) ??
    appEnvironmentFromUrl(process.env.NEXT_PUBLIC_REALTIME_URL) ??
    appEnvironmentFromUrl(process.env.REALTIME_URL) ??
    normalizeAppEnvironment(process.env.NODE_ENV);

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
  process.env.NEXT_PUBLIC_SOCKET_URL ??
  process.env.NEXT_PUBLIC_REALTIME_URL ??
  process.env.REALTIME_URL ??
  realtimeDefaults[APP_ENV];

export const ENV_HEADERS = {
  "x-vendero-env": APP_ENV,
};

function socketPathFrom(pathname: string) {
  const normalized = pathname.trim().replace(/\/+$/, "");
  if (!normalized) return "";
  return normalized.endsWith("/socket.io")
    ? normalized
    : `${normalized}/socket.io`;
}

export function socketIoEndpoint(rawUrl = REALTIME_URL) {
  try {
    const parsed = new URL(rawUrl);
    const configuredPath = process.env.NEXT_PUBLIC_SOCKET_IO_PATH;
    const socketPath =
      socketPathFrom(configuredPath ?? "") ||
      socketPathFrom(parsed.pathname) ||
      (parsed.hostname === "test-api.vendero.in"
        ? "/realtime/socket.io"
        : "");
    const url = `${parsed.protocol}//${parsed.host}`;

    return {
      url,
      path: socketPath || "/socket.io",
    };
  } catch {
    return {
      url: rawUrl,
      path:
        socketPathFrom(process.env.NEXT_PUBLIC_SOCKET_IO_PATH ?? "") ||
        "/socket.io",
    };
  }
}
