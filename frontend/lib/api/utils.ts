import { BASE_URL } from "./config";
import type { ApiRequestOptions } from "./types";

/**
 * Utility functions for API requests.
 */

export function buildUrl(path: string, query?: ApiRequestOptions["query"]) {
  // Build the base URL string. When BASE_URL is empty (NEXT_PUBLIC_API_URL
  // not set), relative paths like "/write" are kept as-is so fetch() resolves
  // them against the current origin. Using new URL() here would throw for
  // relative paths, so we build the query string with URLSearchParams instead.
  const base = path.startsWith("/") ? `${BASE_URL}${path}` : path;

  if (!query) return base;

  const params = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(query)) {
    if (rawValue === undefined) continue;
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const value of values) {
      params.append(key, String(value));
    }
  }

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export async function parseResponse<T>(
  response: Response,
  parseAs: ApiRequestOptions["parseAs"]
): Promise<T> {
  if (parseAs === "void") {
    return undefined as T;
  }

  if (parseAs === "text") {
    return (await response.text()) as T;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}
