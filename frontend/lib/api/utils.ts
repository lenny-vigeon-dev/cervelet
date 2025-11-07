import { BASE_URL } from "./config";
import type { ApiRequestOptions } from "./types";

/**
 * Utility functions for API requests.
 */

export function buildUrl(path: string, query?: ApiRequestOptions["query"]) {
  const url = new URL(path.startsWith("/") ? `${BASE_URL}${path}` : path);
  if (!query) {
    return url.toString();
  }

  for (const [key, rawValue] of Object.entries(query)) {
    if (rawValue === undefined) continue;
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const value of values) {
      url.searchParams.append(key, String(value));
    }
  }

  return url.toString();
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
