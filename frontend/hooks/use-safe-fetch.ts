import { ApiError } from "@/lib/api";

/**
 * Safely executes an async function and returns null on error.
 * Useful for optional data fetching where failures shouldn't crash the page.
 *
 * @template T - The expected return type
 * @param fn - Async function to execute
 * @returns Promise resolving to the result or null on error
 *
 * @example
 * ```ts
 * const data = await safeFetch(() => fetchCanvasSnapshot());
 * if (data) {
 *   // Use data
 * }
 * ```
 */
export async function safeFetch<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(
        `API request to ${error.request.method} ${error.request.path} failed with ${error.status}`,
        error.body
      );
      return null;
    }
    console.error("Unexpected error while calling API", error);
    return null;
  }
}
