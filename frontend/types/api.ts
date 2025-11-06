export interface ApiSuccessResponse<T> {
  data: T;
  meta?: {
    requestId?: string;
    [key: string]: unknown;
  };
}

export interface ApiErrorResponse {
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (typeof value !== "object" || value === null) return false;
  return "error" in value;
}

export function hasApiData<T>(value: unknown): value is ApiSuccessResponse<T> {
  if (typeof value !== "object" || value === null) return false;
  return "data" in value;
}
