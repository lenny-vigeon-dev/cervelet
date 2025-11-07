import { ApiError } from "./error";
import { buildUrl, parseResponse } from "./utils";
import type { ApiRequestOptions } from "./types";

/**
 * Core API request function.
 * Makes an API request to the backend gateway.
 * Automatically includes credentials (cookies) and handles response parsing.
 *
 * @template T - The expected response type
 * @param path - API endpoint path (e.g., "/canvas")
 * @param options - Fetch options including method, query params, etc.
 * @returns Promise resolving to the typed response
 * @throws {ApiError} When the request fails or returns an error status
 *
 * @example
 * ```ts
 * const snapshot = await apiRequest<CanvasSnapshot>('/canvas');
 * ```
 */
export async function apiRequest<T>(
  path: string,
  { method = "GET", query, parseAs = "json", ...init }: ApiRequestOptions = {}
): Promise<T> {
  const url = buildUrl(path, query);
  const headers = new Headers(init.headers);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    credentials: "include",
    ...init,
    method,
    headers,
  });

  const parsedBody = await parseResponse<unknown>(response, parseAs);

  if (!response.ok) {
    throw new ApiError({
      message: response.statusText || "API request failed",
      status: response.status,
      body: parsedBody,
      request: { path, method },
    });
  }

  return parsedBody as T;
}
