import type { ApiMethod } from "./types";

/**
 * Custom error class for API request failures.
 * Provides detailed information about the failed request.
 */

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
