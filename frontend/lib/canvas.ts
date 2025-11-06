import { createEventStream } from "@/lib/api";
import { serverApiRequest } from "@/lib/server-api";
import {
  CanvasSnapshotSchema,
  CanvasSummarySchema,
  CanvasStreamEventSchema,
} from "@/lib/schemas";
import { hasApiData, type ApiResponse } from "@/types/api";
import type {
  CanvasSnapshot,
  CanvasSummary,
  CanvasStreamEvent,
} from "@/types/canvas";

const CANVAS_RESOURCE = "/canvas";

function extractData<T>(payload: T | ApiResponse<T>): T {
  if (hasApiData<T>(payload)) {
    return payload.data;
  }
  return payload as T;
}

/**
 * Fetches the current canvas snapshot from the API.
 * Validates the response using Zod schema for runtime type safety.
 *
 * @returns Promise resolving to the validated canvas snapshot
 * @throws {ZodError} If the API response doesn't match the expected schema
 */
export async function fetchCanvasSnapshot(): Promise<CanvasSnapshot> {
  const payload = await serverApiRequest<
    CanvasSnapshot | ApiResponse<CanvasSnapshot>
  >(CANVAS_RESOURCE);
  const data = extractData(payload);

  // Validate response with Zod and return as CanvasSnapshot
  return CanvasSnapshotSchema.parse(data) as CanvasSnapshot;
}

/**
 * Fetches the canvas summary (active users, total pixels, cooldown).
 * Validates the response using Zod schema for runtime type safety.
 *
 * @returns Promise resolving to the validated canvas summary
 * @throws {ZodError} If the API response doesn't match the expected schema
 */
export async function fetchCanvasSummary(): Promise<CanvasSummary> {
  const payload = await serverApiRequest<
    CanvasSummary | ApiResponse<CanvasSummary>
  >(`${CANVAS_RESOURCE}/summary`);
  const data = extractData(payload);

  // Validate response with Zod and return as CanvasSummary
  return CanvasSummarySchema.parse(data) as CanvasSummary;
}

/**
 * Subscribes to real-time canvas updates via Server-Sent Events.
 * Validates each event using Zod schema for runtime type safety.
 *
 * @param onEvent - Callback invoked for each validated canvas event
 * @returns Cleanup function to close the EventSource connection
 *
 * @example
 * ```ts
 * const unsubscribe = subscribeToCanvasStream((event) => {
 *   console.log('New pixel:', event);
 * });
 * // Later: unsubscribe();
 * ```
 */
export function subscribeToCanvasStream(
  onEvent: (event: CanvasStreamEvent) => void
) {
  const source = createEventStream(`${CANVAS_RESOURCE}/stream`);

  source.onmessage = (message) => {
    try {
      const parsed = JSON.parse(message.data);
      // Validate with Zod and return as CanvasStreamEvent
      const validated = CanvasStreamEventSchema.parse(parsed) as CanvasStreamEvent;
      onEvent(validated);
    } catch (error) {
      console.error("Failed to parse or validate canvas stream event", error);
    }
  };

  source.onerror = (error) => {
    console.error("Canvas stream error", error);
  };

  return () => source.close();
}
