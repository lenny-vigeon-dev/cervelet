/**
 * @deprecated This file is kept for backward compatibility.
 * Import from "@/lib/api" instead of "@/lib/api.ts"
 *
 * All API utilities have been refactored into modular files:
 * - @/lib/api/config - API_URL and BASE_URL
 * - @/lib/api/error - ApiError class
 * - @/lib/api/request - apiRequest function
 * - @/lib/api/client - apiClient object
 * - @/lib/api/stream - createEventStream function
 * - @/lib/api/types - TypeScript types
 */

export {
  API_URL,
  BASE_URL,
  ApiError,
  apiRequest,
  apiClient,
  createEventStream,
  type ApiMethod,
  type ApiQueryValue,
  type ApiRequestOptions,
  type EventStreamOptions,
} from "./api/index";
