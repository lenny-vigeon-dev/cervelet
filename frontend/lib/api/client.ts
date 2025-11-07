import { apiRequest } from "./request";
import type { ApiRequestOptions } from "./types";

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
