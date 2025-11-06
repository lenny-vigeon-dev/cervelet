import { cookies, headers as nextHeaders } from "next/headers";
import { apiRequest, type ApiRequestOptions, type ApiMethod } from "@/lib/api";

/**
 * Server-side API utilities for making authenticated requests from Server Components.
 * Automatically forwards cookies and headers from the incoming request to the API.
 */

async function getCookieHeader() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  if (allCookies.length === 0) {
    return undefined;
  }

  return allCookies.map(({ name, value }) => `${name}=${value}`).join("; ");
}

async function getRequestHeaders() {
  return await nextHeaders();
}

/**
 * Enriches request headers with cookies and client information.
 * Forwards authentication cookies and relevant headers to the API Gateway.
 */
async function enrichHeaders(
  method: ApiMethod,
  initHeaders?: ApiRequestOptions["headers"]
) {
  const headers = new Headers(initHeaders);
  const [cookieHeader, incomingHeaders] = await Promise.all([
    getCookieHeader(),
    getRequestHeaders(),
  ]);

  // Forward authentication cookies
  if (cookieHeader && !headers.has("Cookie")) {
    headers.set("Cookie", cookieHeader);
  }

  // Forward client information for logging and security
  const userAgent = incomingHeaders.get("user-agent");
  if (userAgent && !headers.has("User-Agent")) {
    headers.set("User-Agent", userAgent);
  }

  const forwardedFor = incomingHeaders.get("x-forwarded-for");
  if (forwardedFor && !headers.has("X-Forwarded-For")) {
    headers.set("X-Forwarded-For", forwardedFor);
  }

  const referer = incomingHeaders.get("referer");
  if (referer && !headers.has("Referer")) {
    headers.set("Referer", referer);
  }

  // Standard headers for API Gateway
  headers.set("X-Requested-With", "Next.js App Router");
  headers.set("Accept", "application/json");

  if (method !== "GET" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

/**
 * Makes an authenticated API request from a Server Component.
 * Automatically includes cookies and headers from the incoming request.
 * Use this for all server-side API calls that require authentication.
 *
 * @template T - The expected response type
 * @param path - API endpoint path (e.g., "/canvas")
 * @param options - Fetch options (method, body, etc.)
 * @returns Promise resolving to the typed response
 *
 * @example
 * ```ts
 * // In a Server Component
 * const session = await serverApiRequest<SessionState>('/auth/session');
 * ```
 */
export async function serverApiRequest<T>(
  path: string,
  { method = "GET", ...options }: ApiRequestOptions = {}
): Promise<T> {
  const headers = await enrichHeaders(method, options.headers);
  return apiRequest<T>(path, {
    ...options,
    method,
    headers,
    cache: options.cache ?? "no-store",
  });
}
