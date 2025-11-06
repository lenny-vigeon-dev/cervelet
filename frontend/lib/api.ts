/**
 * API_URL is exposed to the client via NEXT_PUBLIC_API_URL.
 * This is intentional to enable client-side API calls (SSE, polling).
 * Sensitive endpoints should use serverApiRequest() which includes httpOnly cookies.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error(
    "NEXT_PUBLIC_API_URL is not defined. Please set it in your environment."
  );
}

const BASE_URL = API_URL.replace(/\/+$/, "");

export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type Primitive = string | number | boolean;

export type ApiQueryValue = Primitive | Primitive[] | undefined;

export interface ApiRequestOptions extends RequestInit {
  method?: ApiMethod;
  query?: Record<string, ApiQueryValue>;
  parseAs?: "json" | "text" | "void";
}

interface ApiErrorOptions {
  message: string;
  status: number;
  request: {
    path: string;
    method: ApiMethod;
  };
  body?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly body?: unknown;
  readonly request: ApiErrorOptions["request"];

  constructor({ message, status, body, request }: ApiErrorOptions) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    this.request = request;
  }
}

function buildUrl(path: string, query?: ApiRequestOptions["query"]) {
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

async function parseResponse<T>(
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

/**
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

/**
 * Convenient API client with typed methods for common HTTP verbs.
 * Wraps apiRequest() with sensible defaults for each method.
 *
 * @example
 * ```ts
 * const users = await apiClient.get<User[]>('/users');
 * const created = await apiClient.post<User>('/users', { name: 'John' });
 * ```
 */
export const apiClient = {
  get<T>(path: string, options?: Omit<ApiRequestOptions, "method">) {
    return apiRequest<T>(path, { ...options, method: "GET" });
  },
  post<T>(
    path: string,
    body?: unknown,
    options?: Omit<ApiRequestOptions, "method" | "body">
  ) {
    return apiRequest<T>(path, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  put<T>(
    path: string,
    body?: unknown,
    options?: Omit<ApiRequestOptions, "method" | "body">
  ) {
    return apiRequest<T>(path, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  patch<T>(
    path: string,
    body?: unknown,
    options?: Omit<ApiRequestOptions, "method" | "body">
  ) {
    return apiRequest<T>(path, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  delete<T>(path: string, options?: Omit<ApiRequestOptions, "method">) {
    return apiRequest<T>(path, { ...options, method: "DELETE" });
  },
};

export interface EventStreamOptions {
  query?: Record<string, ApiQueryValue>;
  withCredentials?: boolean;
}

/**
 * Creates a Server-Sent Events (SSE) connection to the API.
 * Useful for real-time updates from the server.
 *
 * @param path - SSE endpoint path (e.g., "/canvas/stream")
 * @param options - Query parameters and credentials configuration
 * @returns EventSource instance for listening to server events
 *
 * @example
 * ```ts
 * const source = createEventStream('/canvas/stream');
 * source.onmessage = (event) => console.log(event.data);
 * source.onerror = (error) => console.error(error);
 * // Later: source.close();
 * ```
 */
export function createEventStream(path: string, options?: EventStreamOptions) {
  const url = buildUrl(path, options?.query);
  return new EventSource(url, {
    withCredentials: options?.withCredentials ?? true,
  });
}
