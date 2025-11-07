import { buildUrl } from "./utils";
import type { EventStreamOptions } from "./types";

/**
 * Server-Sent Events (SSE) utilities for real-time updates.
 */

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
