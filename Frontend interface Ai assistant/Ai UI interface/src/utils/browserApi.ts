const DEFAULT_LOCAL_API_BASE = "http://127.0.0.1:7860";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getBrowserApiBase() {
  const envBase = (
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.CLOUD_BACKEND_URL ||
    ""
  ).trim();

  if (envBase) {
    return trimTrailingSlash(envBase);
  }

  if (typeof window !== "undefined") {
    const { hostname, origin, port } = window.location;
    const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";

    if (!isLocalHost || port === "7860") {
      return trimTrailingSlash(origin);
    }
  }

  return DEFAULT_LOCAL_API_BASE;
}

export async function fetchBrowserApiJson<T>(path: string): Promise<T> {
  const response = await fetch(`${getBrowserApiBase()}${path}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `HTTP API failed: ${response.status}${errorText ? ` ${errorText}` : ""}`,
    );
  }

  return response.json() as Promise<T>;
}
